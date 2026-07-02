import type { ReachabilityResult } from './reachability.js';

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

// `reachability` is `null` when no provider is configured (see
// reachability.ts) or when the provider's lookup failed - asyncParse()
// never throws on a provider error, so this is the only signal.
export type AsyncParseResult =
  | { success: true; data: PhoneNumber; reachability: ReachabilityResult | null }
  | { success: false; error: ParseErrorCode; message: string };