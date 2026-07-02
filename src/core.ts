import { getMetadata, type CountryMetadata } from './metadata.js';
import { ParseErrorCode, type ParseResult } from './types.js';

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

// Of the regions sharing a calling code, find the one whose length and
// pattern actually validate this national number. Real area codes don't
// collide across regions sharing a calling code, so at most one matches.
const matchRegion = (nationalNumber: string, regions: CountryMetadata[]): CountryMetadata | undefined => {
  return regions.find(
    (region) =>
      region.possibleLengths.includes(nationalNumber.length) &&
      new RegExp(region.nationalNumberPattern).test(nationalNumber),
  );
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

  // Aggregate across every region sharing this calling code, so a length
  // that's out of range for *all* of them is still reported as
  // TOO_SHORT/TOO_LONG rather than a generic "not a number".
  const allLengths = group.regions.flatMap((region) => region.possibleLengths);
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

  const region = matchRegion(nationalNumber, group.regions);

  if (!region) {
    return {
      success: false,
      error: ParseErrorCode.NOT_A_NUMBER,
      message: `National number is not valid for calling code +${group.callingCode}`,
    };
  }

  // TODO: infer `type` (MOBILE/FIXED/VOIP) once metadata carries per-type
  // patterns; not attempted here since a "tiny subset" of US patterns can't
  // reliably distinguish them (a known libphonenumber limitation for US).
  return {
    success: true,
    data: {
      e164: sanitized,
      countryCode: Number(group.callingCode),
      region: region.region,
      nationalNumber,
      type: 'UNKNOWN',
    },
  };
};

export const isValid = (input: string, country?: string): boolean => {
  return parse(input, country).success;
};