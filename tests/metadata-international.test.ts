import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parse } from '../src/core.js';
import { setup, type Metadata } from '../src/metadata.js';
import gbMetadata from '../data/gb.json' with { type: 'json' };
import deMetadata from '../data/de.json' with { type: 'json' };
import frMetadata from '../data/fr.json' with { type: 'json' };
import auMetadata from '../data/au.json' with { type: 'json' };
import inMetadata from '../data/in.json' with { type: 'json' };
import jpMetadata from '../data/jp.json' with { type: 'json' };

// One sanity check per country: parse() the real `exampleNumber` that
// scripts/extract-metadata.ts pulled (and self-checked) straight from
// Google's upstream metadata. This isn't re-litigating pattern
// correctness (that's the extraction script's job, run once per
// country) - it's proving each country's data actually plugs into
// parse() end to end, for regions outside NANP (no calling-code sharing
// to worry about here, unlike the US/CA case in core.test.ts).
describe('parse() with each extracted country injected individually', () => {
  const cases: Array<{ region: string; callingCode: number; number: string; metadata: Metadata }> = [
    { region: 'GB', callingCode: 44, number: '+441212345678', metadata: gbMetadata },
    { region: 'DE', callingCode: 49, number: '+4930123456', metadata: deMetadata },
    { region: 'FR', callingCode: 33, number: '+33123456789', metadata: frMetadata },
    { region: 'AU', callingCode: 61, number: '+61212345678', metadata: auMetadata },
    { region: 'IN', callingCode: 91, number: '+917410410123', metadata: inMetadata },
    { region: 'JP', callingCode: 81, number: '+81312345678', metadata: jpMetadata },
  ];

  for (const { region, callingCode, number, metadata } of cases) {
    describe(region, () => {
      before(() => {
        setup({ metadata });
      });

      test(`validates ${region}'s real example number`, () => {
        const result = parse(number);
        assert.equal(result.success, true);
        if (result.success) {
          assert.equal(result.data.region, region);
          assert.equal(result.data.countryCode, callingCode);
        }
      });
    });
  }
});
