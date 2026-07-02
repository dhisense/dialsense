import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// Reusable extraction: pulls a territory's validation pattern out of
// Google's upstream libphonenumber metadata and writes it into our
// CountryMetadata JSON shape. Built for scaling past hand-extracting
// US/CA one at a time, and doubles as groundwork for Phase 3's planned
// upstream-drift monitoring (same fetch-and-diff logic, different trigger).

const METADATA_XML_URL =
  'https://raw.githubusercontent.com/google/libphonenumber/master/resources/PhoneNumberMetadata.xml';
const COMMITS_API_URL =
  'https://api.github.com/repos/google/libphonenumber/commits?path=resources/PhoneNumberMetadata.xml&sha=master&per_page=1';
const TAGS_API_URL = 'https://api.github.com/repos/google/libphonenumber/tags?per_page=1';

const DATA_DIR = new URL('../data/', import.meta.url);
const SOURCES_PATH = new URL('../data/sources.json', import.meta.url);

interface CountryMetadata {
  region: string;
  callingCode: string;
  nationalNumberPattern: string;
  possibleLengths: number[];
}

const extractAttr = (tagContent: string, name: string): string | undefined =>
  tagContent.match(new RegExp(`${name}="([^"]*)"`))?.[1];

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

const main = async () => {
  const ids = process.argv.slice(2).map((id) => id.toUpperCase());
  if (ids.length === 0) {
    console.error('Usage: tsx scripts/extract-metadata.ts <ISO_REGION...>');
    process.exitCode = 1;
    return;
  }

  console.log('Fetching upstream metadata...');
  const [xml, commits, tags] = await Promise.all([
    fetch(METADATA_XML_URL).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch metadata XML: HTTP ${r.status}`);
      return r.text();
    }),
    fetch(COMMITS_API_URL).then((r) => r.json()) as Promise<Array<{ sha: string; commit: { committer: { date: string } } }>>,
    fetch(TAGS_API_URL).then((r) => r.json()) as Promise<Array<{ name: string }>>,
  ]);

  const fetchedCommit = commits[0]?.sha;
  const fetchedCommitDate = commits[0]?.commit.committer.date;
  const nearestReleaseTag = tags[0]?.name;
  const fetchedAt = new Date().toISOString().slice(0, 10);

  if (!fetchedCommit) {
    throw new Error('Could not determine upstream commit SHA for provenance');
  }

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

    const metadata: CountryMetadata = { region: id, callingCode, nationalNumberPattern: pattern, possibleLengths };
    const fileName = `${id.toLowerCase()}.json`;
    writeFileSync(new URL(fileName, DATA_DIR), JSON.stringify({ [id]: metadata }, null, 2) + '\n');

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

main().catch((err: unknown) => {
  console.error('Extraction failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
