import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

import { REGION_GROUPS, ALL_REGIONS } from '../src/regions.js';

// The real source of truth for "which countries does DialSense ship" is
// the data/ directory, not this file - these groups are a hand-curated
// convenience layer on top of it, so they can silently drift out of sync
// as more countries get added. This test catches that drift rather than
// hoping someone remembers to update regions.ts alongside data/.
const shippedRegions = readdirSync('data')
  .filter((f) => f.endsWith('.json') && f !== 'sources.json')
  .map((f) => f.replace(/\.json$/, '').toUpperCase())
  .sort();

describe('REGION_GROUPS', () => {
  test('every shipped country appears in exactly one group', () => {
    const flat = Object.values(REGION_GROUPS).flat();
    const seen = new Set<string>();
    for (const code of flat) {
      assert.equal(seen.has(code), false, `${code} appears in more than one group`);
      seen.add(code);
    }
    assert.deepEqual([...seen].sort(), shippedRegions);
  });

  test('every group member has real metadata shipped in data/', () => {
    for (const [name, codes] of Object.entries(REGION_GROUPS)) {
      for (const code of codes) {
        assert.ok(shippedRegions.includes(code), `${name} lists ${code}, but data/${code.toLowerCase()}.json doesn't exist`);
      }
    }
  });

  test('ALL_REGIONS is the deduplicated union of every group, matching data/ exactly', () => {
    assert.deepEqual([...ALL_REGIONS].sort(), shippedRegions);
  });
});
