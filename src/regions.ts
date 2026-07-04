// Curated groupings of the ISO 3166-1 alpha-2 region codes shipped in
// `data/` - purely lists of strings, not metadata, so referencing a whole
// group costs nothing on its own. Still, resolving a group into real
// validation data means importing every constituent country file yourself
// and merging (see README) - these lists exist to make that enumeration
// itself not a hand-typed, easy-to-typo, easy-to-forget-one step.
//
// Grouped by common enterprise usage (region of operation), not strictly
// by continent - e.g. Russia sits in EUROPE_OTHER (paired historically
// with Kazakhstan via shared calling code 7, though KZ itself now lives
// in CENTRAL_ASIA below - see metadata-major-markets.test.ts for the
// calling-code-sharing behavior, which is independent of group naming).
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
  APAC: [
    'AU', 'BD', 'CN', 'HK', 'ID', 'IN', 'JP', 'KH', 'KR', 'LK', 'MM', 'MN',
    'MO', 'MY', 'NZ', 'PH', 'PK', 'SG', 'TH', 'TW', 'VN',
  ],
  MIDDLE_EAST: ['AE', 'BH', 'IL', 'IQ', 'JO', 'KW', 'LB', 'OM', 'QA', 'SA', 'TR'],
  AFRICA: ['DZ', 'EG', 'ET', 'GH', 'KE', 'MA', 'NG', 'TN', 'TZ', 'UG', 'ZA'],
  LATAM: ['AR', 'BR', 'CL', 'CO', 'EC', 'MX', 'PE', 'VE'],
  // Europe, but not an EU member.
  EUROPE_OTHER: ['AL', 'BA', 'BY', 'CH', 'GB', 'IS', 'MD', 'MK', 'NO', 'RS', 'RU', 'UA'],
  // Caucasus + Central Asia - includes Kazakhstan, the other half of the
  // RU/KZ shared-calling-code (7) pair.
  CENTRAL_ASIA: ['AM', 'AZ', 'GE', 'KZ', 'UZ'],
} as const;

export type RegionGroupName = keyof typeof REGION_GROUPS;

// Every region code across all groups, deduplicated - a "just give me
// everything DialSense ships" convenience for the cases where an
// enterprise consumer genuinely operates everywhere and would rather
// import all shipped country files than maintain their own list.
export const ALL_REGIONS: readonly string[] = Array.from(
  new Set(Object.values(REGION_GROUPS).flat()),
).sort();
