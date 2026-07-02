import { before, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { asyncParse } from '../src/core.js';
import { setup } from '../src/metadata.js';
import { configure, type ReachabilityResult } from '../src/reachability.js';
import us from '../data/us.json' with { type: 'json' };

const VALID_NUMBER = '+12025550123';
const INVALID_NUMBER = '+123';

before(() => {
  setup({ metadata: us });
});

const SAMPLE_RESULT: ReachabilityResult = {
  reachable: true,
  lineType: 'MOBILE',
  carrierName: 'Acme Wireless',
  ported: false,
  roaming: false,
  callerName: 'Jane Doe',
  riskScore: 3,
};

// configure() is global module state (mirrors metadata.ts's setup()) -
// reset it after every test so these don't leak into other test files.
afterEach(() => {
  configure({ provider: null });
});

test('asyncParse falls back to reachability: null when no provider is configured', async () => {
  const result = await asyncParse(VALID_NUMBER);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.reachability, null);
  }
});

test('asyncParse returns the provider result for a valid number', async () => {
  configure({
    provider: {
      lookup: async () => SAMPLE_RESULT,
    },
  });

  const result = await asyncParse(VALID_NUMBER);
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.reachability, SAMPLE_RESULT);
    // Static classification is honest about the US ambiguity (fixed-line
    // and mobile share the same pattern upstream) rather than guessing -
    // but a live lookup can resolve it definitively. That contrast is the
    // actual point of this phase: parse() alone gets you to "one of
    // these two," a real provider gets you the specific answer.
    assert.equal(result.data.type, 'FIXED_LINE_OR_MOBILE');
    assert.equal(result.reachability.lineType, 'MOBILE');
  }
});

test('asyncParse never calls the provider for an invalid number', async () => {
  let callCount = 0;
  configure({
    provider: {
      lookup: async () => {
        callCount++;
        return SAMPLE_RESULT;
      },
    },
  });

  const result = await asyncParse(INVALID_NUMBER);
  assert.equal(result.success, false);
  assert.equal(callCount, 0);
});

test('asyncParse swallows a provider error into reachability: null instead of throwing', async () => {
  configure({
    provider: {
      lookup: async () => {
        throw new Error('upstream lookup service unavailable');
      },
    },
  });

  const result = await asyncParse(VALID_NUMBER);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.reachability, null);
  }
});
