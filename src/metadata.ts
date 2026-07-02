export interface TypePattern {
  nationalNumberPattern: string;
  possibleLengths: number[];
}

export interface CountryMetadata {
  // ISO 3166-1 alpha-2, e.g. "US". Kept on the value itself (not just as
  // the object key) because callers group entries by calling code - once
  // grouped, the original object key is gone.
  region: string;
  callingCode: string;
  // General/fallback pattern - used directly when a type-specific match
  // isn't available (e.g. a region without per-type data yet).
  nationalNumberPattern: string;
  possibleLengths: number[];
  // Per-type patterns, each optional since not every region's upstream
  // data distinguishes all of these (e.g. many small territories have no
  // separate pager/uan/voicemail block at all).
  types?: {
    MOBILE?: TypePattern;
    FIXED?: TypePattern;
    TOLL_FREE?: TypePattern;
    PREMIUM_RATE?: TypePattern;
    SHARED_COST?: TypePattern;
    PERSONAL_NUMBER?: TypePattern;
    VOIP?: TypePattern;
    PAGER?: TypePattern;
    UAN?: TypePattern;
    VOICEMAIL?: TypePattern;
  };
}

export interface Metadata {
  // Keyed by region, not calling code: a calling code can map to several
  // regions (e.g. NANP's "1" covers US, Canada, and ~19 Caribbean
  // territories), so calling code can't be a unique key.
  [region: string]: CountryMetadata;
}

// Global state for injected metadata, initialized empty
let _metadata: Metadata = {};

export const setup = (config: { metadata: Metadata }) => {
  _metadata = config.metadata;
};

export const getMetadata = (): Metadata => _metadata;