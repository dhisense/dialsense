import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parse } from '../src/core.js';
import { setup } from '../src/metadata.js';
import us from '../data/us.json' with { type: 'json' };
import gb from '../data/gb.json' with { type: 'json' };

describe('type detection: US (fixed-line and mobile are ambiguous upstream)', () => {
  before(() => {
    setup({ metadata: us });
  });

  // Previously incorrectly rejected as NOT_A_NUMBER: parse() only checked
  // the fixed-line pattern, and toll-free numbers don't share fixed-line's
  // area-code structure. This is the concrete bug-fix proof.
  test('a real US toll-free number now validates, with type TOLL_FREE', () => {
    const result = parse('+18002345678');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.type, 'TOLL_FREE');
    }
  });

  test('a real US premium-rate number validates with type PREMIUM_RATE', () => {
    const result = parse('+19002345678');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.type, 'PREMIUM_RATE');
    }
  });

  // US fixed-line and mobile patterns are byte-identical upstream (a known
  // libphonenumber limitation for the US, confirmed while building the
  // NANP data) - reporting FIXED_LINE_OR_MOBILE is the honest answer, not
  // a bug. Silently defaulting to one would be less correct, not more.
  test('a real US number that matches both fixed-line and mobile reports FIXED_LINE_OR_MOBILE, not one or the other', () => {
    const result = parse('+12025550123');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.type, 'FIXED_LINE_OR_MOBILE');
    }
  });

  // Regression check: broader (per-type) validity shouldn't loosen
  // rejection of genuinely invalid numbers.
  test('a fake area code is still rejected, not misclassified as some other type', () => {
    const result = parse('+15555550123');
    assert.equal(result.success, false);
  });
});

describe('type detection: GB (fixed-line and mobile are genuinely distinct upstream)', () => {
  before(() => {
    setup({ metadata: gb });
  });

  test('a real GB mobile number resolves to MOBILE, not FIXED_LINE_OR_MOBILE', () => {
    const result = parse('+447400123456');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.type, 'MOBILE');
    }
  });

  test('a real GB fixed-line number resolves to FIXED, distinctly from the mobile number above', () => {
    const result = parse('+441212345678');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.type, 'FIXED');
    }
  });
});
