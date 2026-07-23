import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { format } from '../src/format.js';
import { setup, type CountryMetadata, type FormatRule, type TypePattern } from '../src/metadata.js';
import type { PhoneNumber } from '../src/types.js';

// Reusable extraction: pulls a territory's validation pattern out of
// Google's upstream libphonenumber metadata and writes it into our
// CountryMetadata JSON shape. Built for scaling past hand-extracting
// US/CA one at a time, and doubles as groundwork for Phase 3's planned
// upstream-drift monitoring (same fetch-and-diff logic, different trigger).

export const METADATA_XML_URL =
  'https://raw.githubusercontent.com/google/libphonenumber/master/resources/PhoneNumberMetadata.xml';
export const COMMITS_API_URL =
  'https://api.github.com/repos/google/libphonenumber/commits?path=resources/PhoneNumberMetadata.xml&sha=master&per_page=1';
const TAGS_API_URL = 'https://api.github.com/repos/google/libphonenumber/tags?per_page=1';

const DATA_DIR = new URL('../data/', import.meta.url);
const SOURCES_PATH = new URL('../data/sources.json', import.meta.url);

// Maps our type keys to upstream's XML tag names. FIXED reuses the same
// <fixedLine> block already captured as the general/fallback pattern -
// it's extracted twice (general fallback + type classification), which
// is fine, they're the same data used for two purposes.
const TYPE_TAGS: Record<keyof NonNullable<CountryMetadata['types']>, string> = {
  MOBILE: 'mobile',
  FIXED: 'fixedLine',
  TOLL_FREE: 'tollFree',
  PREMIUM_RATE: 'premiumRate',
  SHARED_COST: 'sharedCost',
  PERSONAL_NUMBER: 'personalNumber',
  VOIP: 'voip',
  PAGER: 'pager',
  UAN: 'uan',
  VOICEMAIL: 'voicemail',
};

interface CommitInfo {
  sha: string;
  date: string;
}

// Returns Authorization headers if GITHUB_TOKEN is set in the environment,
// allowing authenticated GitHub API requests (5000 req/hr vs 60 req/hr
// unauthenticated). Required in CI where runners share IPs and easily
// exhaust the unauthenticated rate limit.
const githubAuthHeaders = (): HeadersInit => {
  const token = process.env['GITHUB_TOKEN'];
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Shared with scripts/monitor-upstream.ts, which only needs this cheap
// call (no XML fetch) to check whether upstream has moved.
export const fetchLatestCommit = async (): Promise<CommitInfo> => {
  const response = await fetch(COMMITS_API_URL, { headers: githubAuthHeaders() });
  if (!response.ok) {
    throw new Error(`GitHub API request failed: HTTP ${response.status} ${response.statusText}`);
  }
  const commits = (await response.json()) as Array<{
    sha: string;
    commit: { committer: { date: string } };
  }>;
  const sha = commits[0]?.sha;
  const date = commits[0]?.commit.committer.date;
  if (!sha || !date) {
    throw new Error('Could not determine upstream commit SHA');
  }
  return { sha, date };
};

const deepEqual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// Requires a preceding boundary (start-of-string or whitespace) before the
// attribute name - without it, e.g. searching for "nationalPrefix" would
// incorrectly match inside "internationalPrefix" (a real bug this caught:
// GB's nationalPrefix was extracted as "00" from internationalPrefix
// instead of "0" from the actual nationalPrefix attribute).
const extractAttr = (tagContent: string, name: string): string | undefined =>
  tagContent.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];

const extractTerritoryBlock = (xml: string, id: string): string => {
  const match = xml.match(new RegExp(`<territory id="${id}"[\\s\\S]*?</territory>`));
  if (!match) {
    throw new Error(`Territory "${id}" not found in upstream metadata`);
  }
  return match[0];
};

// `national` can be a plain number ("10"), a comma-separated list of
// numbers/ranges ("6,8,10"), or a bracketed range ("[5-15]") - e.g.
// Germany's fixed-line numbers vary from 5 to 15 digits. Expand everything
// into a flat array of exact lengths, since that's what CountryMetadata
// expects.
const parseLengths = (raw: string): number[] => {
  const lengths: number[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^\[(\d+)-(\d+)\]$/);
    if (rangeMatch) {
      const [, minStr, maxStr] = rangeMatch;
      for (let n = Number(minStr); n <= Number(maxStr); n++) {
        lengths.push(n);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (Number.isNaN(n)) {
        throw new Error(`Could not parse possibleLengths value "${trimmed}" (from "${raw}")`);
      }
      lengths.push(n);
    }
  }
  return lengths;
};

interface ExtractedPattern {
  pattern: string;
  possibleLengths: number[];
  exampleNumber: string;
  source: 'fixedLine' | 'generalDesc';
}

const extractPattern = (territoryBlock: string): ExtractedPattern => {
  let source: ExtractedPattern['source'] = 'fixedLine';
  let block = territoryBlock.match(/<fixedLine>([\s\S]*?)<\/fixedLine>/)?.[1];
  if (!block) {
    source = 'generalDesc';
    block = territoryBlock.match(/<generalDesc>([\s\S]*?)<\/generalDesc>/)?.[1];
  }
  if (!block) {
    throw new Error('No <fixedLine> or <generalDesc> block found');
  }

  const rawPattern = block.match(/<nationalNumberPattern>([\s\S]*?)<\/nationalNumberPattern>/)?.[1];
  if (!rawPattern) {
    throw new Error(`No <nationalNumberPattern> found in <${source}>`);
  }
  const pattern = `^(?:${rawPattern.replace(/\s+/g, '')})$`;

  const lengthsAttrs = block.match(/<possibleLengths\s+([^/]*)\/>/)?.[1];
  const national = lengthsAttrs && extractAttr(lengthsAttrs, 'national');
  if (!national) {
    throw new Error(`No <possibleLengths national="..."> found in <${source}>`);
  }
  const possibleLengths = parseLengths(national);

  const exampleNumber = block.match(/<exampleNumber>([\s\S]*?)<\/exampleNumber>/)?.[1]?.trim();
  if (!exampleNumber) {
    throw new Error(`No <exampleNumber> found in <${source}> - needed to self-check the extracted pattern`);
  }

  return { pattern, possibleLengths, exampleNumber, source };
};

interface TypeBlockExtraction {
  pattern: string;
  possibleLengths: number[];
  exampleNumber?: string;
}

// Like extractPattern, but for one of the optional per-type blocks
// (mobile, tollFree, etc.) - returns undefined rather than throwing when
// a territory simply doesn't have that block, since most territories
// don't have all ten.
const extractTypeBlock = (territoryBlock: string, tag: string): TypeBlockExtraction | undefined => {
  const block = territoryBlock.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1];
  if (!block) {
    return undefined;
  }

  const rawPattern = block.match(/<nationalNumberPattern>([\s\S]*?)<\/nationalNumberPattern>/)?.[1];
  const lengthsAttrs = block.match(/<possibleLengths\s+([^/]*)\/>/)?.[1];
  const national = lengthsAttrs && extractAttr(lengthsAttrs, 'national');
  if (!rawPattern || !national) {
    return undefined;
  }

  const exampleNumber = block.match(/<exampleNumber>([\s\S]*?)<\/exampleNumber>/)?.[1]?.trim();

  return {
    pattern: `^(?:${rawPattern.replace(/\s+/g, '')})$`,
    possibleLengths: parseLengths(national),
    ...(exampleNumber ? { exampleNumber } : {}),
  };
};

// <leadingDigits> entries (0 or more per rule, least to most specific) are
// captured for asYouType(), which needs them to pick a candidate rule
// before enough digits exist for `pattern` to fully match. format() itself
// doesn't need them - it only ever formats complete numbers, where
// `pattern` is already authoritative.
const extractFormats = (territoryBlock: string): FormatRule[] => {
  const availableFormatsBlock = territoryBlock.match(/<availableFormats>([\s\S]*?)<\/availableFormats>/)?.[1];
  if (!availableFormatsBlock) {
    return [];
  }

  const rules: FormatRule[] = [];
  const numberFormatPattern = /<numberFormat\s+([^>]*)>([\s\S]*?)<\/numberFormat>/g;
  let match: RegExpExecArray | null;
  while ((match = numberFormatPattern.exec(availableFormatsBlock))) {
    const [, attrs, body] = match;
    const pattern = extractAttr(attrs ?? '', 'pattern');
    const format = body?.match(/<format>([\s\S]*?)<\/format>/)?.[1]?.trim();
    if (!pattern || !format) {
      continue;
    }

    const nationalPrefixFormattingRule = extractAttr(attrs ?? '', 'nationalPrefixFormattingRule');
    const intlFormat = body?.match(/<intlFormat>([\s\S]*?)<\/intlFormat>/)?.[1]?.trim();
    const leadingDigits = [...(body?.matchAll(/<leadingDigits>([\s\S]*?)<\/leadingDigits>/g) ?? [])].map((m) =>
      (m[1] ?? '').replace(/\s+/g, ''),
    );

    rules.push({
      pattern,
      format,
      ...(nationalPrefixFormattingRule ? { nationalPrefixFormattingRule } : {}),
      ...(leadingDigits.length > 0 ? { leadingDigits } : {}),
      ...(intlFormat ? { intlFormat } : {}),
    });
  }

  return rules;
};

const main = async () => {
  const ids = process.argv.slice(2).map((id) => id.toUpperCase());
  if (ids.length === 0) {
    console.error('Usage: tsx scripts/extract-metadata.ts <ISO_REGION...>');
    process.exitCode = 1;
    return;
  }

  console.log('Fetching upstream metadata...');
  const [xml, { sha: fetchedCommit, date: fetchedCommitDate }, tags] = await Promise.all([
    fetch(METADATA_XML_URL).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch metadata XML: HTTP ${r.status}`);
      return r.text();
    }),
    fetchLatestCommit(),
    fetch(TAGS_API_URL, { headers: githubAuthHeaders() }).then((r) => {
      if (!r.ok) throw new Error(`GitHub tags API request failed: HTTP ${r.status} ${r.statusText}`);
      return r.json();
    }) as Promise<Array<{ name: string }>>,
  ]);

  const nearestReleaseTag = tags[0]?.name;
  const fetchedAt = new Date().toISOString().slice(0, 10);

  const sources: Record<string, unknown> = existsSync(SOURCES_PATH)
    ? JSON.parse(readFileSync(SOURCES_PATH, 'utf8'))
    : {};

  for (const id of ids) {
    console.log(`Extracting ${id}...`);
    const territory = extractTerritoryBlock(xml, id);
    const callingCode = extractAttr(territory, 'countryCode');
    if (!callingCode) {
      throw new Error(`Territory "${id}" has no countryCode attribute`);
    }

    const { pattern, possibleLengths, exampleNumber, source } = extractPattern(territory);

    // Self-check against Google's own example number before writing
    // anything - this is what makes scaling past hand-verified US/CA safe.
    const regex = new RegExp(pattern);
    if (!regex.test(exampleNumber)) {
      throw new Error(
        `Extraction self-check failed for ${id}: pattern does not match upstream exampleNumber "${exampleNumber}"`,
      );
    }
    if (!possibleLengths.includes(exampleNumber.length)) {
      throw new Error(
        `Extraction self-check failed for ${id}: exampleNumber "${exampleNumber}" length not in possibleLengths [${possibleLengths.join(', ')}]`,
      );
    }

    // Per-type patterns for type classification (mobile, tollFree, etc.) -
    // each optional, since most territories don't have all ten. Reuses the
    // same self-check discipline as the primary pattern above, when the
    // upstream block has its own exampleNumber (most, not all, do).
    const types: NonNullable<CountryMetadata['types']> = {};
    for (const [typeKey, tag] of Object.entries(TYPE_TAGS) as Array<
      [keyof NonNullable<CountryMetadata['types']>, string]
    >) {
      const extracted = extractTypeBlock(territory, tag);
      if (!extracted) {
        continue;
      }

      if (extracted.exampleNumber) {
        const typeRegex = new RegExp(extracted.pattern);
        if (!typeRegex.test(extracted.exampleNumber)) {
          throw new Error(
            `Extraction self-check failed for ${id} ${typeKey}: pattern does not match upstream exampleNumber "${extracted.exampleNumber}"`,
          );
        }
        if (!extracted.possibleLengths.includes(extracted.exampleNumber.length)) {
          throw new Error(
            `Extraction self-check failed for ${id} ${typeKey}: exampleNumber "${extracted.exampleNumber}" length not in possibleLengths [${extracted.possibleLengths.join(', ')}]`,
          );
        }
      } else {
        console.log(`  ${id} ${typeKey}: no exampleNumber upstream, skipping self-check`);
      }

      types[typeKey] = { nationalNumberPattern: extracted.pattern, possibleLengths: extracted.possibleLengths };
    }

    const nationalPrefix = extractAttr(territory, 'nationalPrefix');
    const formats = extractFormats(territory);

    const metadata: CountryMetadata = {
      region: id,
      callingCode,
      nationalNumberPattern: pattern,
      possibleLengths,
      ...(Object.keys(types).length > 0 ? { types } : {}),
      ...(nationalPrefix ? { nationalPrefix } : {}),
      ...(formats.length > 0 ? { formats } : {}),
    };

    // Self-check: the primary exampleNumber should match at least one
    // format rule, when there are any - not a full proof of the format
    // algorithm's correctness (that's what the unit tests are for), just
    // a guard against a badly broken extraction. Also logs the computed
    // NATIONAL/INTERNATIONAL string via the real `format()` function (not
    // a duplicated copy of its logic) for a human to sanity-eyeball.
    if (formats.length > 0) {
      const matchesExample = formats.some((rule) => new RegExp(`^(?:${rule.pattern})$`).test(exampleNumber));
      if (!matchesExample) {
        throw new Error(`Extraction self-check failed for ${id}: no format rule matches upstream exampleNumber "${exampleNumber}"`);
      }
      setup({ metadata: { [id]: metadata } });
      const exampleAsPhoneNumber: PhoneNumber = {
        e164: `+${callingCode}${exampleNumber}`,
        countryCode: Number(callingCode),
        region: id,
        nationalNumber: exampleNumber,
        type: 'UNKNOWN',
      };
      console.log(
        `  ${id} NATIONAL: "${format(exampleAsPhoneNumber, 'NATIONAL')}", INTERNATIONAL: "${format(exampleAsPhoneNumber, 'INTERNATIONAL')}"`,
      );
    }

    const fileName = `${id.toLowerCase()}.json`;
    const filePath = new URL(fileName, DATA_DIR);

    // Skip the write entirely if nothing actually changed - this is what
    // keeps a full re-extraction (e.g. from the daily upstream monitor)
    // a minimal, high-signal diff instead of bumping timestamps on every
    // tracked country whenever any one of them changes upstream.
    if (existsSync(filePath)) {
      const existing = JSON.parse(readFileSync(filePath, 'utf8'));
      if (deepEqual(existing[id], metadata)) {
        console.log(`  ${id} unchanged, skipping`);
        continue;
      }
    }

    writeFileSync(filePath, JSON.stringify({ [id]: metadata }, null, 2) + '\n');

    sources[fileName] = {
      sourceRepo: 'https://github.com/google/libphonenumber',
      sourceFile: 'resources/PhoneNumberMetadata.xml',
      sourceUrl: METADATA_XML_URL,
      fetchedCommit,
      fetchedCommitDate,
      nearestReleaseTag,
      fetchedAt,
      extractedFrom: `territory[id=${id}].${source}.nationalNumberPattern`,
      notes: `Extracted via scripts/extract-metadata.ts; self-checked against upstream exampleNumber "${exampleNumber}".`,
    };
    // Written after each territory, not batched at the end: if a later
    // territory in this run fails, earlier successful writes still get a
    // matching sources.json entry instead of being left unprovenanced.
    writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2) + '\n');

    console.log(`  wrote data/${fileName} (calling code +${callingCode}, verified against example ${exampleNumber})`);
  }
};

// Only run the CLI entrypoint when this file is executed directly - not
// when it's imported elsewhere (e.g. scripts/monitor-upstream.ts imports
// `fetchLatestCommit` from here and must not also trigger this file's
// own `main()`).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error('Extraction failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
