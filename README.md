# dialsense

A modular, type-safe, and tree-shakable TypeScript library for phone number validation. Designed for modern web applications, DialSense offers a clean, functional API and metadata-as-a-plugin architecture to minimize bundle size while ensuring reliable telephony data parsing.

## Why Dialsense?
- Modern API: Pure functions, no class-based "God-objects."
- Tree-Shakable: Import only the metadata you need.
- Type-Safe: No more try/catch—handle ParseResult objects explicitly.
- Telemetry-Ready: Designed to easily integrate with real-time operational lookup services (HLR/CNAM).

## Install

```bash
npm install
```

## Scripts

- `npm run typecheck`: run TypeScript type checks.
- `npm run build`: build ESM + CJS bundles and declaration files into `dist/`.
- `npm test`: runs typecheck, then the unit tests in `tests/`.
- `npm run metadata:extract -- <ISO_REGION...>`: (re)extract one or more countries' validation data from upstream `libphonenumber` into `data/`, e.g. `npm run metadata:extract -- US CA`.
- `npm run metadata:check`: check whether upstream `libphonenumber` metadata has changed since `data/last-checked-commit.txt`.

## Usage

```ts
import { parse, isValid } from 'dialsense';

const result = parse('+12025550123');

if (result.success) {
	console.log(result.data.e164);
}

console.log(isValid('+12025550123'));
```

### Adding country validation

Without metadata, `parse` only checks that input is E.164-shaped. Inject
metadata to get real per-country validation (calling code + national number
format). Metadata is keyed by ISO region (not calling code - a calling code
like NANP's `1` can map to several regions, e.g. US and Canada) and matches
the `Metadata` shape exported from `dialsense/metadata`.

Country data lives in [`data/`](data) - all 25 NANP territories (US, Canada,
and the Caribbean/Pacific territories sharing calling code `1`) plus all 27
EU member states and a handful of other major markets, 56 countries so far.
Each is extracted from Google's `libphonenumber` via
[`scripts/extract-metadata.ts`](scripts/extract-metadata.ts), with source
commit/version tracked per-file in [`data/sources.json`](data/sources.json).
A daily GitHub Actions workflow ([`metadata-check.yml`](.github/workflows/metadata-check.yml))
checks for upstream changes and opens a PR with refreshed data when it finds
one - see [`data/last-checked-commit.txt`](data/last-checked-commit.txt) for
the watermark it compares against.

Data is published with the package, so you only need to import the
countries you actually use - each is its own file, so bundlers only include
what you import:

```ts
import { parse } from 'dialsense';
import { setup } from 'dialsense/metadata';
import us from 'dialsense/metadata/us.json' with { type: 'json' };

setup({ metadata: us });

parse('+12025550123'); // now validated against the US calling code + pattern
```

You can also hand-write metadata matching the same shape instead of using
the shipped data:

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

## Development Notes

- Source code is in `src/`.
- Build artifacts are generated in `dist/`.
