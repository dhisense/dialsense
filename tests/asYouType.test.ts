import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { asYouType } from '../src/core.js';
import { setup } from '../src/metadata.js';
import us from '../data/us.json' with { type: 'json' };
import gb from '../data/gb.json' with { type: 'json' };

// Expected values below were obtained by actually running asYouType()
// and reading the output (same discipline as format()'s tests), then
// cross-checked against a documented real-world reference example
// (formatting "2133734" produces "(213) 373-4") before finalizing.
describe('asYouType()', () => {
  before(() => {
    setup({ metadata: { ...us, ...gb } });
  });

  test('matches the documented reference example exactly', () => {
    // US has both a 7-digit local-only format and the standard 10-digit
    // one; both are nominally compatible with digits starting "2" at 7
    // digits typed. The correct behavior prefers the 10-digit rule's
    // partial grouping here, not the 7-digit dash format - this is the
    // concrete proof the capacity-based tie-break is right, not just
    // plausible-looking.
    assert.equal(asYouType('2133734', 'US'), '(213) 373-4');
  });

  test('US: progressively formats a full number as digits arrive', () => {
    const digits = '2025550123';
    const expected = [
      '(2',
      '(20',
      '(202',
      '(202) 5',
      '(202) 55',
      '(202) 555',
      '(202) 555-0',
      '(202) 555-01',
      '(202) 555-012',
      '(202) 555-0123',
    ];
    for (let i = 1; i <= digits.length; i++) {
      assert.equal(asYouType(digits.slice(0, i), 'US'), expected[i - 1]);
    }
  });

  test('GB: national prefix appears from the very first digit (nationalPrefixFormattingRule)', () => {
    // GB's national prefix "0" combines with the first group via
    // nationalPrefixFormattingRule - applied even to a single partial
    // digit, not just once the group is complete.
    assert.equal(asYouType('1', 'GB'), '01');
    assert.equal(asYouType('12123', 'GB'), '0121 23');
    assert.equal(asYouType('1212345678', 'GB'), '0121 234 5678');
  });

  test('GB: a mobile number is recognized via its own leadingDigits, distinctly from the fixed-line number above', () => {
    assert.equal(asYouType('7400123456', 'GB'), '07400 123456');
  });

  test('deletion needs no special handling - recomputes correctly from a shorter string', () => {
    const full = asYouType('2025550123', 'US');
    assert.equal(full, '(202) 555-0123');
    const afterBackspace = asYouType('2025550123'.slice(0, -3), 'US');
    assert.equal(afterBackspace, asYouType('2025550', 'US'));
    assert.notEqual(afterBackspace, full);
  });

  test('falls back to plain typed digits when no metadata/formats exist for the region', () => {
    assert.equal(asYouType('5551234', 'ZZ'), '5551234');
  });

  test('strips non-digit characters from the input (e.g. if the caller passes an already-punctuated value)', () => {
    assert.equal(asYouType('(202) 555-0123', 'US'), asYouType('2025550123', 'US'));
  });
});
