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
the `Metadata` shape exported from `dialsense/metadata` - see
[`data/us.json`](data/us.json) and [`data/ca.json`](data/ca.json) in this
repo for examples (dev fixtures, not currently shipped in the package):

```ts
import { parse } from 'dialsense';
import { setup } from 'dialsense/metadata';

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

parse('+12025550123'); // now validated against the US calling code + pattern
```

## Package Exports

- `dialsense`
- `dialsense/metadata`
- `dialsense/types`

## Development Notes

- Source code is in `src/`.
- Build artifacts are generated in `dist/`.
