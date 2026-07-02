export interface CountryMetadata {
  // ISO 3166-1 alpha-2, e.g. "US". Kept on the value itself (not just as
  // the object key) because callers group entries by calling code - once
  // grouped, the original object key is gone.
  region: string;
  callingCode: string;
  nationalNumberPattern: string;
  possibleLengths: number[];
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