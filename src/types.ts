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
  // 'FIXED_LINE_OR_MOBILE' is a distinct, honest value - not a fallback -
  // for when a region's fixed-line and mobile patterns are identical
  // upstream (e.g. the US) and there's no way to statically tell them
  // apart. 'UNKNOWN' means no type-specific data was available at all.
  type:
    | 'MOBILE'
    | 'FIXED'
    | 'FIXED_LINE_OR_MOBILE'
    | 'TOLL_FREE'
    | 'PREMIUM_RATE'
    | 'SHARED_COST'
    | 'PERSONAL_NUMBER'
    | 'VOIP'
    | 'PAGER'
    | 'UAN'
    | 'VOICEMAIL'
    | 'UNKNOWN';
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