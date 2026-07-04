import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { getCountries, getCountryCallingCode, isSupportedCountry, setup } from '../src/metadata.js';
import us from '../data/us.json' with { type: 'json' };
import ca from '../data/ca.json' with { type: 'json' };
import gb from '../data/gb.json' with { type: 'json' };

describe('getCountries() / getCountryCallingCode() / isSupportedCountry()', () => {
  describe('with no metadata injected', () => {
    before(() => {
      setup({ metadata: {} });
    });

    test('getCountries() returns an empty array', () => {
      assert.deepEqual(getCountries(), []);
    });

    test('getCountryCallingCode() returns undefined for any country', () => {
      assert.equal(getCountryCallingCode('US'), undefined);
    });

    test('isSupportedCountry() returns false for any country', () => {
      assert.equal(isSupportedCountry('US'), false);
    });
  });

  describe('with US, CA, and GB metadata injected', () => {
    before(() => {
      setup({ metadata: { ...us, ...ca, ...gb } });
    });

    test('getCountries() returns exactly the injected regions', () => {
      assert.deepEqual(getCountries().sort(), ['CA', 'GB', 'US']);
    });

    test('getCountryCallingCode() returns the real calling code for an injected region', () => {
      assert.equal(getCountryCallingCode('US'), 1);
      assert.equal(getCountryCallingCode('CA'), 1);
      assert.equal(getCountryCallingCode('GB'), 44);
    });

    test('getCountryCallingCode() returns undefined for a region that was never injected', () => {
      assert.equal(getCountryCallingCode('FR'), undefined);
    });

    test('isSupportedCountry() returns true only for injected regions', () => {
      assert.equal(isSupportedCountry('US'), true);
      assert.equal(isSupportedCountry('GB'), true);
      assert.equal(isSupportedCountry('FR'), false);
    });
  });
});
