import { appendFileSync, readFileSync } from 'node:fs';

import { fetchLatestCommit } from './extract-metadata.js';

// Cheap drift check for scripts/extract-metadata.ts's upstream source:
// only fetches the latest commit SHA (no XML, no extraction), so this is
// safe to run frequently (e.g. daily in CI) without meaningfully costing
// anything on the ~364 days a year upstream hasn't moved.

const LAST_CHECKED_PATH = new URL('../data/last-checked-commit.txt', import.meta.url);

const main = async () => {
  const lastChecked = readFileSync(LAST_CHECKED_PATH, 'utf8').trim();
  const { sha: latest } = await fetchLatestCommit();

  const changed = latest !== lastChecked;
  console.log(changed ? `Upstream changed: ${lastChecked} -> ${latest}` : `No change (still ${latest})`);

  // GITHUB_OUTPUT is only set when running inside a GitHub Actions step;
  // downstream steps gate on this boolean, not on this script's exit code -
  // "no change" is a normal daily outcome, not a failure, so this always
  // exits 0 on success regardless of which way the check came out.
  const githubOutput = process.env['GITHUB_OUTPUT'];
  if (githubOutput) {
    appendFileSync(githubOutput, `changed=${changed}\nlatest_commit=${latest}\n`);
  }
};

main().catch((err: unknown) => {
  console.error('Monitor failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
