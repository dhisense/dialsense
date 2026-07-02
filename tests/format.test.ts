import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, format } from '../src/core.js';
import { setup } from '../src/metadata.js';
import us from '../data/us.json' with { type: 'json' };
import gb from '../data/gb.json' with { type: 'json' };

// Expected values below were obtained by actually running format() against
// real extracted metadata and reading the output, not hand-computed -
// getting the $NP/$FG substitution algorithm right by eye is exactly the
// kind of thing worth verifying against the real implementation rather
// than assuming.
describe('format()', () => {
  before(() => {
    setup({ metadata: { ...us, ...gb } });
  });

  test('US: NATIONAL uses parens, INTERNATIONAL drops them (real upstream intlFormat override)', () => {
    const result = parse('+12025550123');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(format(result.data, 'NATIONAL'), '(202) 555-0123');
      assert.equal(format(result.data, 'INTERNATIONAL'), '+1 202-555-0123');
    }
  });

  test('E164 always returns the plain e164 string regardless of metadata', () => {
    const result = parse('+12025550123');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(format(result.data, 'E164'), '+12025550123');
    }
  });

  test('GB: NATIONAL applies the national prefix via nationalPrefixFormattingRule ($NP$FG)', () => {
    const result = parse('+441212345678');
    assert.equal(result.success, true);
    if (result.success) {
      // GB's nationalPrefix is "0"; the matching rule's
      // nationalPrefixFormattingRule is "$NP$FG", so the first group gets
      // "0" prepended in NATIONAL format but not in INTERNATIONAL.
      assert.equal(format(result.data, 'NATIONAL'), '012123 45678');
      assert.equal(format(result.data, 'INTERNATIONAL'), '+44 12123 45678');
    }
  });

  test('GB: a mobile number formats distinctly from the fixed-line number above', () => {
    const result = parse('+447400123456');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(format(result.data, 'NATIONAL'), '074001 23456');
      assert.equal(format(result.data, 'INTERNATIONAL'), '+44 74001 23456');
    }
  });

  test('falls back to the unformatted national number when no format rule matches', () => {
    // Metadata with no `formats` at all - matches the shape of a region
    // without richer data (e.g. hand-written metadata per the README).
    setup({
      metadata: {
        XX: {
          region: 'XX',
          callingCode: '9',
          nationalNumberPattern: '^\\d{7}$',
          possibleLengths: [7],
        },
      },
    });
    const result = parse('+91234567');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(format(result.data, 'NATIONAL'), '1234567');
      assert.equal(format(result.data, 'INTERNATIONAL'), '+9 1234567');
    }
    setup({ metadata: { ...us, ...gb } });
  });

  test('falls back to e164 for every style when no metadata is configured at all', () => {
    setup({ metadata: {} });
    const result = parse('+12025550123');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(format(result.data, 'NATIONAL'), '+12025550123');
      assert.equal(format(result.data, 'INTERNATIONAL'), '+12025550123');
    }
    setup({ metadata: { ...us, ...gb } });
  });
});
