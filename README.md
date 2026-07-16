# dialsense

A modular, type-safe, and tree-shakable TypeScript library for phone number validation. Designed for modern web applications, DialSense offers a clean, functional API and metadata-as-a-plugin architecture to minimize bundle size while ensuring reliable telephony data parsing.

## Why DialSense?
- Modern API: Pure functions, no class-based "God-objects."
- Tree-Shakable: Import only the metadata you need.
- Type-Safe: No more try/catch—handle ParseResult objects explicitly.
- Reachability-Ready: Designed to plug into real-time operational lookup services (HLR/CNAM) via your own provider.

## Contents

- [Bundle size](#bundle-size)
- [Install](#install)
- [Usage](#usage)
- [Adding country validation](#adding-country-validation)
  - [A single country](#a-single-country)
  - [Multiple countries](#multiple-countries)
  - [A whole region](#a-whole-region)
  - [Hand-written metadata](#hand-written-metadata)
  - [Where the data comes from](#where-the-data-comes-from)
- [Inspecting what's currently injected](#inspecting-whats-currently-injected)
- [Number type detection](#number-type-detection)
- [Display formatting](#display-formatting)
- [Live formatting as digits are typed](#live-formatting-as-digits-are-typed)
- [Real-time reachability, carrier, and fraud/risk lookups](#real-time-reachability-carrier-and-fraudrisk-lookups)
- [Package Exports](#package-exports)
- [Development](#development)

## Bundle size

Real measurements, not estimates - minified via `esbuild` and gzipped
(`gzip -9`). The core-library figures reflect actual tree-shaking
behavior: bundling an entry point that only imports `parse`/`isValid`
measurably drops the unused `format`/`asYouType`/reachability code,
rather than assuming a bundler will.

**Core library:**

| Import | Minified | Minified + gzip |
|---|---|---|
| `import { parse, isValid } from 'dialsense'` | 2.1 KB | 0.9 KB |
| Full surface (`parse`, `isValid`, `asyncParse`, `format`, `asYouType`, `getCountries`, `getCountryCallingCode`, `isSupportedCountry`) | 4.1 KB | 1.7 KB |

**Per-country metadata** (each is its own file - add only what you use):

| Country | Minified | Minified + gzip |
|---|---|---|
| Smallest shipped (São Tomé and Príncipe) | 0.4 KB | 0.2 KB |
| France | 1.4 KB | 0.5 KB |
| United States | 3.0 KB | 0.7 KB |
| Germany | 5.1 KB | 1.2 KB |
| United Kingdom | 5.1 KB | 1.2 KB |
| India | 7.5 KB | 1.8 KB |
| China (largest shipped) | 11.2 KB | 1.6 KB |

So a single-country app - e.g. `parse`/`isValid` + US metadata - ships
roughly **2.1 KB + 3.0 KB ≈ 5.1 KB minified**, not the cost of every
country DialSense supports.

**Whole regions** (via `dialsense/regions`, see
[A whole region](#a-whole-region)):

| Group | Countries | Minified | Minified + gzip |
|---|---|---|---|
| `PACIFIC` | 10 | 6.1 KB | 1.1 KB |
| `CENTRAL_ASIA` | 8 | 10.6 KB | 2.2 KB |
| `MIDDLE_EAST` | 15 | 16.4 KB | 2.7 KB |
| `EUROPE_OTHER` | 19 | 26.6 KB | 4.2 KB |
| `NANP` | 25 | 28.7 KB | 3.0 KB |
| `LATAM` | 22 | 32.0 KB | 4.7 KB |
| `AFRICA` | 54 | 43.9 KB | 5.8 KB |
| `EU` | 27 | 48.6 KB | 6.8 KB |
| `APAC` | 29 | 66.4 KB | 10.2 KB |
| `ALL_REGIONS` (everything, 209 countries) | 209 | 279.3 KB | 36.8 KB |

## Install

Not yet published to the npm registry. Install directly from GitHub for now:

```bash
npm install github:dhisense/dialsense
```

Once published, this will be `npm install dialsense`. Requires Node.js >= 20 (the shipped metadata uses `import ... with { type: 'json' }` import attributes, which need it).

## Usage

Without any metadata injected (see [Adding country validation](#adding-country-validation)
below), `parse()` only checks that input is E.164-shaped - not real
per-country validation yet. `ParseResult` is a discriminated union, so
`result.success` narrows which fields are available - no `try`/`catch`,
no thrown exceptions:

```ts
import { parse, isValid } from 'dialsense';

const result = parse('+12025550123');

if (result.success) {
  console.log(result.data.e164); // '+12025550123'
} else {
  console.log(result.error);   // ParseErrorCode.TOO_SHORT / TOO_LONG / NOT_A_NUMBER
                                // (INVALID_COUNTRY_CODE also exists on ParseErrorCode but isn't produced yet)
  console.log(result.message); // human-readable detail
}

console.log(isValid('+12025550123')); // true
console.log(isValid('+123'));         // false - too short
```

### Adding country validation

Inject metadata to get real per-country validation (calling code + national
number format) instead of the E.164-shape-only check `parse()` does without
it. Metadata is keyed by ISO region (not calling code - a calling code like
NANP's `1` can map to several regions, e.g. US and Canada) and matches the
`Metadata` shape exported from `dialsense/metadata`.

Data is published with the package, so you only need to import the
countries you actually use - each is its own file, so bundlers only include
what you import.

#### A single country

```ts
import { parse } from 'dialsense';
import { setup } from 'dialsense/metadata';
import us from 'dialsense/metadata/us.json' with { type: 'json' };

setup({ metadata: us });

parse('+12025550123'); // now validated against the US calling code + pattern
```

#### Multiple countries

Merge their metadata objects before calling `setup()` - each file is keyed
by region, so spreading multiple together just unions the keys:

```ts
import { setup } from 'dialsense/metadata';
import us from 'dialsense/metadata/us.json' with { type: 'json' };
import gb from 'dialsense/metadata/gb.json' with { type: 'json' };

setup({ metadata: { ...us, ...gb } });
```

#### A whole region

For a whole region - e.g. "all of the EU" - `dialsense/regions` exports
curated ISO-code lists (`REGION_GROUPS.EU`, `.NANP`, `.APAC`,
`.MIDDLE_EAST`, `.AFRICA`, `.LATAM`, `.EUROPE_OTHER`, `.CENTRAL_ASIA`,
`.PACIFIC`, plus `ALL_REGIONS`
for every shipped country) so you don't have to hand-type and maintain
that list yourself - the lists themselves are just strings, so importing
`dialsense/regions` on its own costs nothing. You still import each
country's actual data yourself, e.g. via a loop of dynamic imports as
below - note that some bundlers turn a template-literal dynamic import
into a "context module" covering every file it could match, which can
pull in more than the group you actually asked for; check your bundler's
behavior here if per-country tree-shaking matters to you at this scale:

```ts
import { setup } from 'dialsense/metadata';
import { REGION_GROUPS } from 'dialsense/regions';

const modules = await Promise.all(
  REGION_GROUPS.EU.map((code) =>
    import(`dialsense/metadata/${code.toLowerCase()}.json`, { with: { type: 'json' } }),
  ),
);
setup({ metadata: Object.assign({}, ...modules.map((m) => m.default)) });
```

#### Hand-written metadata

You can also hand-write metadata matching the same shape instead of using
the shipped data. The minimal shape only needs four fields:

```ts
setup({
  metadata: {
    US: {
      region: 'US',
      callingCode: '1',
      nationalNumberPattern: '^[2-9]\\d{9}$',
      possibleLengths: [10],
    },
  },
});
```

`CountryMetadata` (exported from `dialsense/metadata`) supports more than
that minimal shape, though - the extra fields are what power
[number type detection](#number-type-detection),
[display formatting](#display-formatting), and
[live formatting](#live-formatting-as-digits-are-typed) below. Without
them, those features simply degrade gracefully (`type: 'UNKNOWN'`,
unformatted digits) rather than erroring, but you'll want them if you're
hand-writing metadata for a country that isn't in `data/`:

| Field | Required? | Purpose |
|---|---|---|
| `region` | required | ISO 3166-1 alpha-2 code, e.g. `'US'` |
| `callingCode` | required | E.164 calling code as a string, e.g. `'1'` |
| `nationalNumberPattern` | required | Fallback full-match regex used when no `types` entry matches |
| `possibleLengths` | required | Valid national-number lengths, e.g. `[10]` |
| `types` | optional | Per-type patterns (see [Number type detection](#number-type-detection)) - each of `MOBILE`/`FIXED`/`TOLL_FREE`/`PREMIUM_RATE`/`SHARED_COST`/`PERSONAL_NUMBER`/`VOIP`/`PAGER`/`UAN`/`VOICEMAIL` is itself `{ nationalNumberPattern, possibleLengths }` |
| `nationalPrefix` | optional | National dialing prefix, e.g. `'0'` for GB - only ever shown in `NATIONAL` format, never `INTERNATIONAL` |
| `formats` | optional | Ordered list of format rules (see [Display formatting](#display-formatting)) - each is `{ pattern, format, nationalPrefixFormattingRule?, intlFormat?, leadingDigits? }` |

For a fully worked real example of every field, see any file in
[`data/`](data) - e.g. [`data/gb.json`](data/gb.json) exercises all of them,
including multiple `types` and `leadingDigits`-disambiguated `formats`.

#### Where the data comes from

Country data lives in [`data/`](data) - all 25 NANP territories (US, Canada,
and the Caribbean/Pacific territories sharing calling code `1`), all 27 EU
member states, Russia + Kazakhstan and Italy + Vatican City (two further
real cases of one calling code covering multiple regions, alongside
NANP's), and essentially the full rest of the world's countries and
territories, 209 in total (Vanuatu and Solomon Islands are the two
exceptions for now - their upstream metadata only defines a format rule
for their newer 7-digit mobile ranges, not their 5-digit fixed-line
ranges, so the extraction self-check correctly refuses to ship them
rather than mis-format them).

Each is extracted from Google's `libphonenumber` via
[`scripts/extract-metadata.ts`](scripts/extract-metadata.ts), with source
commit/version tracked per-file in [`data/sources.json`](data/sources.json).
A daily GitHub Actions workflow ([`metadata-check.yml`](.github/workflows/metadata-check.yml))
checks for upstream changes and opens a PR with refreshed data when it finds
one - see [`data/last-checked-commit.txt`](data/last-checked-commit.txt) for
the watermark it compares against.

First metadata update on 07/16/266.

### Inspecting what's currently injected

`getCountries()`, `getCountryCallingCode()`, and `isSupportedCountry()` all
read whatever was last passed to `setup()` - not the full list of
countries DialSense ships in `data/`, which the library has no knowledge
of at runtime until you inject it:

```ts
import { getCountries, getCountryCallingCode, isSupportedCountry } from 'dialsense/metadata';

getCountries();               // ['US', 'GB'] - only what setup() was called with
getCountryCallingCode('US');  // 1
getCountryCallingCode('FR');  // undefined - FR was never injected
isSupportedCountry('GB');     // true
isSupportedCountry('FR');     // false
```

### Number type detection

Where a country's metadata includes per-type patterns (`types` on
`CountryMetadata` - `MOBILE`, `FIXED`, `TOLL_FREE`, `PREMIUM_RATE`,
`SHARED_COST`, `PERSONAL_NUMBER`, `VOIP`, `PAGER`, `UAN`, `VOICEMAIL`),
`parse()` resolves `PhoneNumber.type` against them instead of always
returning `'UNKNOWN'`. Some countries genuinely can't distinguish fixed-line
from mobile in their public numbering data (the US is the clearest example -
upstream ships byte-identical patterns for both) - `parse()` reports
`'FIXED_LINE_OR_MOBILE'` in that case rather than guessing one or the other.
`'UNKNOWN'` now specifically means no type-specific data was available at
all, not "we didn't bother."

### Display formatting

Where a country's metadata includes format rules (`formats`/`nationalPrefix`
on `CountryMetadata`), `format()` renders a parsed number for display:

```ts
import { parse, format } from 'dialsense';

const result = parse('+12025550123');
if (result.success) {
  format(result.data, 'NATIONAL');      // '(202) 555-0123'
  format(result.data, 'INTERNATIONAL'); // '+1 202-555-0123'
  format(result.data, 'E164');          // '+12025550123'
}
```

`NATIONAL` and `INTERNATIONAL` can genuinely differ beyond just the `+`
prefix - e.g. some countries' international format drops parentheses around
the area code, or a country's national dialing prefix (e.g. GB's `0`) only
appears in `NATIONAL` output, never `INTERNATIONAL`. Falls back to the
unformatted national number (`NATIONAL`) or plain `e164` (`INTERNATIONAL`,
or no metadata at all) rather than throwing when no format rule matches.

### Live formatting as digits are typed

`asYouType()` is a pure function, not a stateful class - unlike other
libraries' `new AsYouType('US').input(digit)` pattern, you call it fresh
with the input's *current full value* each time (like a controlled input
in React), not incrementally with hidden state to manage:

```ts
import { asYouType } from 'dialsense';

asYouType('202', 'US');        // '(202'
asYouType('2025550', 'US');    // '(202) 555-0'
asYouType('2025550123', 'US'); // '(202) 555-0123'
```

Because it recomputes from scratch on every call, deletion needs no special
handling - calling it with a shorter string (the user hit backspace) just
works, there's no `reset()`. Falls back to the plain typed digits if no
format rule matches yet or the region has no format data at all.

### Real-time reachability, carrier, and fraud/risk lookups

`parse()` is static and offline - it can validate a number's shape, but it
can't tell you if a number is *currently* reachable, which carrier it's on,
whether it's been ported, or a fraud/risk score. That's what `asyncParse()`
is for: it validates first (never spends a network call on a number that's
already invalid), then optionally enriches the result via an
`IReachabilityProvider` you plug in yourself - DialSense ships the
interface, not a lookup implementation:

```ts
import { asyncParse } from 'dialsense';
import { configure } from 'dialsense/reachability';
import type { IReachabilityProvider } from 'dialsense/reachability';

const myProvider: IReachabilityProvider = {
  async lookup(phoneNumber) {
    const res = await fetch(`https://your-hlr-vendor.example/v1/lookup/${phoneNumber.e164}`);
    const data = await res.json();
    return {
      reachable: data.reachable,
      lineType: data.lineType, // a live lookup CAN say 'MOBILE' vs 'FIXED' where parse() can't
      carrierName: data.carrier,
      ported: data.ported,
      roaming: data.roaming,
      callerName: data.cnam,
      riskScore: data.riskScore,
    };
  },
};

configure({ provider: myProvider });

const result = await asyncParse('+12025550123');
if (result.success) {
  console.log(result.data.type);       // 'FIXED_LINE_OR_MOBILE' - honest ambiguity, US data can't resolve this statically
  console.log(result.reachability?.lineType); // 'MOBILE' - a live lookup can resolve it
}
```

If no provider is configured (or the provider throws), `result.reachability`
is simply `null` - `asyncParse()` itself never throws.

## Package Exports

- `dialsense`
- `dialsense/metadata`
- `dialsense/metadata/{region}.json` (e.g. `dialsense/metadata/us.json`) - per-country validation data
- `dialsense/types`
- `dialsense/reachability` - `IReachabilityProvider` plugin interface for real-time lookups
- `dialsense/format` - `format()` for NATIONAL/INTERNATIONAL/E.164 display
- `dialsense/asYouType` - `asYouType()` for live formatting as digits are typed
- `dialsense/regions` - `REGION_GROUPS`/`ALL_REGIONS` curated ISO-code lists for bulk-loading a whole region

## Development

Source code is in `src/`; build artifacts are generated into `dist/` (not
committed).

- `npm run typecheck`: run TypeScript type checks.
- `npm run build`: build ESM + CJS bundles and declaration files into `dist/`.
- `npm test`: runs typecheck, then the unit tests in `tests/`.
- `npm run metadata:extract -- <ISO_REGION...>`: (re)extract one or more countries' validation data from upstream `libphonenumber` into `data/`, e.g. `npm run metadata:extract -- US CA`.
- `npm run metadata:check`: check whether upstream `libphonenumber` metadata has changed since `data/last-checked-commit.txt`.
