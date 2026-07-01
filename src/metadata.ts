export interface Metadata {
  // Structure for your minimal metadata subsets
  [key: string]: any; 
}

// Global state for injected metadata, initialized empty
let _metadata: Metadata = {};

export const setup = (config: { metadata: Metadata }) => {
  _metadata = config.metadata;
};