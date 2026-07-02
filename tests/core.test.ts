import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, isValid } from '../src/core.js';
import { ParseErrorCode } from '../src/types.js';

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
