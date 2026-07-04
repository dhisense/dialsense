// Curated groupings of the ISO 3166-1 alpha-2 region codes shipped in
// `data/` - purely lists of strings, not metadata, so referencing a whole
// group costs nothing on its own. Still, resolving a group into real
// validation data means importing every constituent country file yourself
// and merging (see README) - these lists exist to make that enumeration
// itself not a hand-typed, easy-to-typo, easy-to-forget-one step.
//
// Grouped by common enterprise usage (region of operation), not strictly
// by continent - e.g. Russia and Kazakhstan sit in EUROPE_OTHER as the
// pair that shares calling code 7, rather than splitting across
// Europe/Central Asia.
export const REGION_GROUPS = {
  // All NANP territories: the 25 regions sharing calling code "1"
  // (US, Canada, and the Caribbean/Pacific territories).
  NANP: [
    'AG', 'AI', 'AS', 'BB', 'BM', 'BS', 'CA', 'DM', 'DO', 'GD', 'GU', 'JM',
    'KN', 'KY', 'LC', 'MP', 'MS', 'PR', 'SX', 'TC', 'TT', 'US', 'VC', 'VG',
    'VI',
  ],
  // All 27 EU member states.
  EU: [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
    'SI', 'ES', 'SE',
  ],
  APAC: ['AU', 'CN', 'HK', 'ID', 'IN', 'JP', 'KR', 'NZ', 'PH', 'PK', 'SG', 'VN'],
  MIDDLE_EAST: ['AE', 'IL', 'SA', 'TR'],
  AFRICA: ['EG', 'NG', 'ZA'],
  LATAM: ['AR', 'BR', 'CO', 'MX'],
  // Europe, but not an EU member - includes the RU/KZ pair (calling code 7).
  EUROPE_OTHER: ['CH', 'GB', 'KZ', 'NO', 'RU'],
} as const;

export type RegionGroupName = keyof typeof REGION_GROUPS;

// Every region code across all groups, deduplicated - a "just give me
// everything DialSense ships" convenience for the cases where an
// enterprise consumer genuinely operates everywhere and would rather
// import all 80 country files than maintain their own list.
export const ALL_REGIONS: readonly string[] = Array.from(
  new Set(Object.values(REGION_GROUPS).flat()),
).sort();
