# dialsense

TypeScript library for phone number parsing/validation. Zero runtime
dependencies, metadata-as-a-plugin architecture, tree-shakable per-country
data (209 countries in `data/`).

## Stack
- TypeScript, `nodenext` module resolution - source imports use `.js`
  extensions that resolve to sibling `.ts` files.
- Node >=20, `tsx` (dev/test runner), `tsup` (dual ESM+CJS build),
  `node:test` (no separate test framework).
- No linter/formatter configured - don't invent formatting rules here.

## Structure
- `src/` - `core.ts` (parse/isValid/asyncParse), `metadata.ts`, `types.ts`,
  `reachability.ts`, `format.ts`, `asYouType.ts`, `regions.ts`.
- `data/*.json` - per-country metadata, keyed by ISO region (not calling
  code - one calling code can cover several regions, e.g. NANP's `1`).
- `scripts/` - `extract-metadata.ts` (real upstream libphonenumber
  extraction), `monitor-upstream.ts` (drift check).
- `tests/` - `node:test` files, generally one per feature or country batch.
- `.local/` - private roadmap/background docs, gitignored.

## Commands
- `npm test` - typecheck then unit tests; run after every change.
- `npm run build` - tsup build into `dist/`.
- `npm run metadata:extract -- <ISO_REGION...>` - (re)extract country data.
- `npm run metadata:check` - check for upstream libphonenumber drift.

## Verification
After any `src/` or `data/` change, in order: `npm test` ->
`npm run build` -> `npm pack --dry-run` (package size sanity check).
CI (`.github/workflows/ci.yml`) enforces typecheck/test/build and a
`npm audit --audit-level=high` security gate on every PR - don't
re-litigate those checks here, just don't break them.

## Conventions
- Pure functions only, no classes - a stated design value (see README),
  applies to new features too.
- Metadata is injected via `setup()`; never hardcode country data in
  `src/` - it only ever lives in `data/*.json`.
- Never hand-invent phone number regex/patterns. Extract via
  `scripts/extract-metadata.ts` from real upstream libphonenumber XML,
  self-checked against upstream's own example numbers.
- Before writing a test assertion, run the real code and read its actual
  output - don't hand-guess expected values.
- `exactOptionalPropertyTypes: true` in tsconfig - omit optional fields
  via spread (`...(cond ? { field } : {})`), never assign `undefined`.

## Repo etiquette
- `main` is protected - branch off `main` and open a PR; never commit to
  `main` directly.
- After a correction to how you should work in this repo, propose an
  update to this file rather than only remembering it for one session.

## Don't
- Don't add per-country logic to `src/` - algorithms must stay generic
  over the `CountryMetadata` shape; add data, not code, for a new country.
- Don't build vendor/orchestration logic into `reachability.ts` - it
  ships the `IReachabilityProvider` interface only, no implementation
  (see `.local/project-background.MD` for the scope decision).
