import { ParseErrorCode, type ParseResult } from './types.js';

const MIN_DIGIT_LENGTH = 4;
const MAX_DIGIT_LENGTH = 15; // E.164 maximum

const SANITIZE_PATTERN = /[\s\-().]/g;

// This function will eventually hook into your modular metadata
export const parse = (input: string, defaultCountry?: string): ParseResult => {
  const sanitized = input.replace(SANITIZE_PATTERN, '');

  // TODO(Phase 2): use `defaultCountry` and injected metadata to resolve
  // national-format numbers (no leading '+') into a calling code.
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

  // TODO(Phase 2): split `digits` into countryCode/nationalNumber and infer
  // `type` once metadata is wired in via `setup()`.
  return {
    success: true,
    data: {
      e164: sanitized,
      countryCode: 0,
      nationalNumber: digits,
      type: 'UNKNOWN',
    },
  };
};

export const isValid = (input: string, country?: string): boolean => {
  return parse(input, country).success;
};