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

Country data lives in [`data/`](data) (`us.json`, `ca.json`, `gb.json`,
`de.json`, `fr.json`, `au.json`, `in.json`, `jp.json` so far - extracted from
Google's `libphonenumber` via [`scripts/extract-metadata.ts`](scripts/extract-metadata.ts),
with source commit/version tracked in [`data/sources.json`](data/sources.json))
and is published with the package, so you only need to import the countries
you actually use - each is its own file, so bundlers only include what you
import:

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

## Package Exports

- `dialsense`
- `dialsense/metadata`
- `dialsense/metadata/{region}.json` (e.g. `dialsense/metadata/us.json`) - per-country validation data
- `dialsense/types`

## Development Notes

- Source code is in `src/`.
- Build artifacts are generated in `dist/`.
