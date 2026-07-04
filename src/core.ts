import { getMetadata, type CountryMetadata, type TypePattern } from './metadata.js';
import { getProvider } from './reachability.js';
import { ParseErrorCode, type AsyncParseResult, type ParseResult, type PhoneNumber } from './types.js';

export { format, type FormatStyle } from './format.js';
export { asYouType } from './asYouType.js';
export { getCountries, getCountryCallingCode, isSupportedCountry } from './metadata.js';

const MIN_DIGIT_LENGTH = 4;
const MAX_DIGIT_LENGTH = 15; // E.164 maximum
const MAX_CALLING_CODE_LENGTH = 3;

const SANITIZE_PATTERN = /[\s\-().]/g;

interface CallingCodeGroup {
  callingCode: string;
  regions: CountryMetadata[];
}

// E.164 calling codes are a prefix-free code by design, so trying
// shortest-to-longest and taking the first match is correct, not just
// convenient - no valid calling code is a prefix of another. A calling
// code can be shared by several regions (e.g. NANP's "1"), so this
// returns every region sharing the matched code, not just one.
const findCallingCodeGroup = (digits: string): CallingCodeGroup | undefined => {
  const regions = Object.values(getMetadata());
  for (let length = 1; length <= MAX_CALLING_CODE_LENGTH; length++) {
    const candidate = digits.slice(0, length);
    const matches = regions.filter((region) => region.callingCode === candidate);
    if (matches.length > 0) {
      return { callingCode: candidate, regions: matches };
    }
  }
  return undefined;
};

// Checked in this order, first match wins - these types are specific
// enough that a real number shouldn't match more than one.
const TYPE_PRIORITY = [
  'PREMIUM_RATE',
  'TOLL_FREE',
  'SHARED_COST',
  'VOIP',
  'PERSONAL_NUMBER',
  'PAGER',
  'UAN',
  'VOICEMAIL',
] as const satisfies ReadonlyArray<keyof NonNullable<CountryMetadata['types']>>;

const patternMatches = (nationalNumber: string, pattern: TypePattern): boolean =>
  pattern.possibleLengths.includes(nationalNumber.length) && new RegExp(pattern.nationalNumberPattern).test(nationalNumber);

// MOBILE/FIXED are checked last, and separately from TYPE_PRIORITY, because
// upstream data sometimes makes them identical (e.g. the US) - in that case
// this reports 'FIXED_LINE_OR_MOBILE' rather than arbitrarily picking one.
const classifyType = (nationalNumber: string, region: CountryMetadata): PhoneNumber['type'] | undefined => {
  const types = region.types;
  if (!types) {
    return undefined;
  }

  for (const key of TYPE_PRIORITY) {
    const pattern = types[key];
    if (pattern && patternMatches(nationalNumber, pattern)) {
      return key;
    }
  }

  const isMobile = types.MOBILE && patternMatches(nationalNumber, types.MOBILE);
  const isFixed = types.FIXED && patternMatches(nationalNumber, types.FIXED);
  if (isMobile && isFixed) {
    return 'FIXED_LINE_OR_MOBILE';
  }
  if (isMobile) {
    return 'MOBILE';
  }
  if (isFixed) {
    return 'FIXED';
  }

  return undefined;
};

interface ResolvedRegion {
  region: CountryMetadata;
  type: PhoneNumber['type'];
}

// Of the regions sharing a calling code, find the one whose length and
// pattern actually validate this national number. Real area codes don't
// collide across regions sharing a calling code, so at most one matches.
// A region counts as a match if ANY of its type-specific patterns match
// (not just the general one) - this is what correctly accepts numbers
// like US toll-free, which don't share fixed-line's area-code structure.
const matchRegion = (nationalNumber: string, regions: CountryMetadata[]): ResolvedRegion | undefined => {
  for (const region of regions) {
    const type = classifyType(nationalNumber, region);
    if (type) {
      return { region, type };
    }
    // No type-specific data (or none matched): fall back to the general
    // pattern, same as before per-type data existed.
    if (
      region.possibleLengths.includes(nationalNumber.length) &&
      new RegExp(region.nationalNumberPattern).test(nationalNumber)
    ) {
      return { region, type: 'UNKNOWN' };
    }
  }
  return undefined;
};

export const parse = (input: string, defaultCountry?: string): ParseResult => {
  const sanitized = input.replace(SANITIZE_PATTERN, '');

  // TODO: use `defaultCountry` to resolve national-format numbers (no
  // leading '+') into a calling code via metadata.
  if (!sanitized.startsWith('+')) {
    return {
      success: false,
      error: ParseErrorCode.NOT_A_NUMBER,
      message: 'Number must be in E.164 format (leading "+") until metadata support lands',
    };
  }

  const digits = sanitized.slice(1);

  if (!/^\d+$/.test(digits)) {
    return {
      success: false,
      error: ParseErrorCode.NOT_A_NUMBER,
      message: 'Number must contain only digits after the leading "+"',
    };
  }

  if (digits.length < MIN_DIGIT_LENGTH) {
    return {
      success: false,
      error: ParseErrorCode.TOO_SHORT,
      message: `Number must have at least ${MIN_DIGIT_LENGTH} digits`,
    };
  }

  if (digits.length > MAX_DIGIT_LENGTH) {
    return {
      success: false,
      error: ParseErrorCode.TOO_LONG,
      message: `Number must have at most ${MAX_DIGIT_LENGTH} digits`,
    };
  }

  const group = findCallingCodeGroup(digits);

  // No metadata injected, or this calling code isn't covered by whatever
  // was injected: fall back to format-only validation. Metadata is a
  // plugin - not having it for a given number isn't an error.
  if (!group) {
    return {
      success: true,
      data: {
        e164: sanitized,
        countryCode: 0,
        region: null,
        nationalNumber: digits,
        type: 'UNKNOWN',
      },
    };
  }

  const nationalNumber = digits.slice(group.callingCode.length);

  // Aggregate across every region sharing this calling code, and every
  // type-specific pattern within each region, so a length that's out of
  // range for *all* of them is still reported as TOO_SHORT/TOO_LONG
  // rather than a generic "not a number".
  const allLengths = group.regions.flatMap((region) => [
    ...region.possibleLengths,
    ...Object.values(region.types ?? {}).flatMap((pattern) => pattern.possibleLengths),
  ]);
  const minLength = Math.min(...allLengths);
  const maxLength = Math.max(...allLengths);

  if (nationalNumber.length < minLength) {
    return {
      success: false,
      error: ParseErrorCode.TOO_SHORT,
      message: `National number must have at least ${minLength} digits for calling code +${group.callingCode}`,
    };
  }

  if (nationalNumber.length > maxLength) {
    return {
      success: false,
      error: ParseErrorCode.TOO_LONG,
      message: `National number must have at most ${maxLength} digits for calling code +${group.callingCode}`,
    };
  }

  const resolved = matchRegion(nationalNumber, group.regions);

  if (!resolved) {
    return {
      success: false,
      error: ParseErrorCode.NOT_A_NUMBER,
      message: `National number is not valid for calling code +${group.callingCode}`,
    };
  }

  return {
    success: true,
    data: {
      e164: sanitized,
      countryCode: Number(group.callingCode),
      region: resolved.region.region,
      nationalNumber,
      type: resolved.type,
    },
  };
};

export const isValid = (input: string, country?: string): boolean => {
  return parse(input, country).success;
};

// Validates first, then optionally enriches with a live lookup - never
// spends a network call on a number that's already known to be invalid.
// Never throws: a provider error is indistinguishable from no provider
// being configured at all (both surface as `reachability: null`), which
// keeps this consistent with the rest of the library's no-try/catch
// contract.
export const asyncParse = async (input: string, defaultCountry?: string): Promise<AsyncParseResult> => {
  const result = parse(input, defaultCountry);
  if (!result.success) {
    return result;
  }

  const provider = getProvider();
  if (!provider) {
    return { ...result, reachability: null };
  }

  try {
    const reachability = await provider.lookup(result.data);
    return { ...result, reachability };
  } catch {
    return { ...result, reachability: null };
  }
};