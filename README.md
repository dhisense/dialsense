# dialsense

A modular, type-safe, and tree-shakable TypeScript library for phone number validation. Designed for modern web applications, DialSense offers a clean, functional API and metadata-as-a-plugin architecture to minimize bundle size while ensuring reliable telephony data parsing.

## Install

```bash
npm install
```

## Scripts

- `npm run typecheck`: run TypeScript type checks.
- `npm run build`: build ESM + CJS bundles and declaration files into `dist/`.
- `npm test`: runs the project validation test command (`typecheck`).

## Usage

```ts
import { parse, isValid } from 'dialsense';

const result = parse('+12025550123');

if (result.success) {
	console.log(result.data.e164);
}

console.log(isValid('+12025550123'));
```

## Package Exports

- `dialsense`
- `dialsense/metadata`
- `dialsense/types`

## Development Notes

- Source code is in `src/`.
- Build artifacts are generated in `dist/`.
