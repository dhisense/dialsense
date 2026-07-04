export interface TypePattern {
  nationalNumberPattern: string;
  possibleLengths: number[];
}

export interface FormatRule {
  // Full-match regex with capture groups, e.g. "(\d{3})(\d{4})".
  pattern: string;
  // Template using $1/$2/... for the capture groups, e.g. "$1 $2".
  format: string;
  // How the national prefix combines with the first group in NATIONAL
  // format specifically, e.g. "$NP$FG" ($NP = nationalPrefix, $FG = the
  // raw first group) - omitted means NATIONAL format has no prefix at all.
  // Never applies to INTERNATIONAL format.
  nationalPrefixFormattingRule?: string;
  // Overrides `format` for INTERNATIONAL style specifically. The literal
  // value "NA" means this rule should be skipped entirely for
  // INTERNATIONAL (try the next matching rule) - e.g. local-only formats
  // that omit the area code aren't valid once you need to dial
  // internationally. Omitted (not "NA") means reuse `format` as-is.
  intlFormat?: string;
  // Upstream declaration order, least to most specific - each is a
  // stricter refinement of the one before it, not an independent
  // alternative. Only used by asYouType() to pick a candidate rule before
  // enough digits exist for `pattern` to fully match; `format()` doesn't
  // need this since it only ever formats complete numbers.
  leadingDigits?: string[];
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
  // e.g. "0" for GB, "1" for NANP. Absent for regions with no national
  // dialing prefix.
  nationalPrefix?: string;
  // In upstream declaration order - first full match against the national
  // number wins, same resolution order as Google's own algorithm.
  formats?: FormatRule[];
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

// These three all read whatever's currently injected via setup() - not
// the full set of countries DialSense ships in data/, which this module
// has no knowledge of at runtime. A country is only "supported" once its
// metadata has actually been passed to setup().
export const getCountries = (): string[] => Object.keys(_metadata);

export const getCountryCallingCode = (country: string): number | undefined => {
  const region = _metadata[country];
  return region ? Number(region.callingCode) : undefined;
};

export const isSupportedCountry = (country: string): boolean => country in _metadata;