import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, isValid } from '../src/core.js';
import { setup } from '../src/metadata.js';
import { ParseErrorCode } from '../src/types.js';
import usMetadata from '../data/us.json' with { type: 'json' };
import caMetadata from '../data/ca.json' with { type: 'json' };

test('parse returns success:true for a valid E.164 string', () => {
  const result = parse('+12025550123');
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.e164, '+12025550123');
    assert.equal(result.data.nationalNumber, '12025550123');
  }
});

test('parse sanitizes spaces, dashes, and parentheses', () => {
  const result = parse('+1 (202) 555-0123');
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.e164, '+12025550123');
  }
});

test('parse rejects input without a leading "+"', () => {
  const result = parse('2025550123');
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error, ParseErrorCode.NOT_A_NUMBER);
  }
});

test('parse rejects numbers that are too short', () => {
  const result = parse('+123');
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error, ParseErrorCode.TOO_SHORT);
  }
});

test('parse rejects numbers that are too long', () => {
  const result = parse('+1234567890123456');
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error, ParseErrorCode.TOO_LONG);
  }
});

test('isValid mirrors parse success', () => {
  assert.equal(isValid('+12025550123'), true);
  assert.equal(isValid('+1'), false);
});

// Scoped in its own suite so `setup()` (global module state) only takes
// effect for these tests - the tests above must keep exercising the
// no-metadata fallback path unaffected.
describe('parse() with US + Canada metadata injected', () => {
  before(() => {
    setup({ metadata: { ...usMetadata, ...caMetadata } });
  });

  test('validates a real US number, splits out the calling code and region', () => {
    const result = parse('+12025550123'); // Washington, DC
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.countryCode, 1);
      assert.equal(result.data.region, 'US');
      assert.equal(result.data.nationalNumber, '2025550123');
      assert.equal(result.data.e164, '+12025550123');
    }
  });

  // US and Canada share calling code "1" but have disjoint area-code
  // allocations - this is the actual proof that parse() disambiguates
  // between multiple regions sharing one calling code, not just US alone.
  test('validates a real Canadian number and resolves it to CA, not US', () => {
    const result = parse('+14165550123'); // Toronto
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.countryCode, 1);
      assert.equal(result.data.region, 'CA');
      assert.equal(result.data.nationalNumber, '4165550123');
    }
  });

  test('rejects a structurally invalid US number (area code starting with 1)', () => {
    const result = parse('+11025550123');
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error, ParseErrorCode.NOT_A_NUMBER);
    }
  });

  // These two only fail against the real upstream NANP pattern, not the
  // old handwritten `[2-9]\d{9}` mock - they're the proof this is actually
  // validating against real allocation rules, not just checking digit count.
  test('rejects a fake area code that is not in the real NANP allocation table (in either US or CA)', () => {
    const result = parse('+15555550123'); // "555" area code - fictional-number trope
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error, ParseErrorCode.NOT_A_NUMBER);
    }
  });

  test('rejects a real area code with an invalid exchange (leading 0)', () => {
    const result = parse('+12020001234'); // "202" is real DC, "000" is not a valid exchange
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error, ParseErrorCode.NOT_A_NUMBER);
    }
  });
});
