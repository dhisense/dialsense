export enum ParseErrorCode {
  INVALID_COUNTRY_CODE = 'INVALID_COUNTRY_CODE',
  TOO_SHORT = 'TOO_SHORT',
  TOO_LONG = 'TOO_LONG',
  NOT_A_NUMBER = 'NOT_A_NUMBER',
}

export interface PhoneNumber {
  e164: string;
  countryCode: number;
  // ISO 3166-1 alpha-2, e.g. "US". `null` when no injected metadata
  // resolved a specific region for this number (format-only validation).
  region: string | null;
  nationalNumber: string;
  type: 'MOBILE' | 'FIXED' | 'VOIP' | 'UNKNOWN';
}

export type ParseResult = 
  | { success: true; data: PhoneNumber }
  | { success: false; error: ParseErrorCode; message: string };