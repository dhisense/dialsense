import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parse } from '../src/core.js';
import { setup, type Metadata } from '../src/metadata.js';
import cn from '../data/cn.json' with { type: 'json' };
import kr from '../data/kr.json' with { type: 'json' };
import id from '../data/id.json' with { type: 'json' };
import ph from '../data/ph.json' with { type: 'json' };
import vn from '../data/vn.json' with { type: 'json' };
import sg from '../data/sg.json' with { type: 'json' };
import hk from '../data/hk.json' with { type: 'json' };
import pk from '../data/pk.json' with { type: 'json' };
import tr from '../data/tr.json' with { type: 'json' };
import sa from '../data/sa.json' with { type: 'json' };
import ae from '../data/ae.json' with { type: 'json' };
import il from '../data/il.json' with { type: 'json' };
import ng from '../data/ng.json' with { type: 'json' };
import za from '../data/za.json' with { type: 'json' };
import eg from '../data/eg.json' with { type: 'json' };
import br from '../data/br.json' with { type: 'json' };
import mx from '../data/mx.json' with { type: 'json' };
import ar from '../data/ar.json' with { type: 'json' };
import co from '../data/co.json' with { type: 'json' };
import ch from '../data/ch.json' with { type: 'json' };
import no from '../data/no.json' with { type: 'json' };
import nz from '../data/nz.json' with { type: 'json' };
import ru from '../data/ru.json' with { type: 'json' };
import kz from '../data/kz.json' with { type: 'json' };

// 22 major-market countries with distinct calling codes - mainly a
// scale/collision sanity check (confirms 22 more real calling codes
// don't collide with anything already in data/), plus the usual
// real-example-number proof per country.
describe('parse() with major-market countries injected together', () => {
  const cases: Array<{ region: string; callingCode: number; number: string; metadata: Metadata }> = [
    { region: 'CN', callingCode: 86, number: '+861012345678', metadata: cn },
    { region: 'KR', callingCode: 82, number: '+8222123456', metadata: kr },
    { region: 'ID', callingCode: 62, number: '+62218350123', metadata: id },
    { region: 'PH', callingCode: 63, number: '+63232345678', metadata: ph },
    { region: 'VN', callingCode: 84, number: '+842101234567', metadata: vn },
    { region: 'SG', callingCode: 65, number: '+6561234567', metadata: sg },
    { region: 'HK', callingCode: 852, number: '+85221234567', metadata: hk },
    { region: 'PK', callingCode: 92, number: '+922123456789', metadata: pk },
    { region: 'TR', callingCode: 90, number: '+902123456789', metadata: tr },
    { region: 'SA', callingCode: 966, number: '+966112345678', metadata: sa },
    { region: 'AE', callingCode: 971, number: '+97122345678', metadata: ae },
    { region: 'IL', callingCode: 972, number: '+97221234567', metadata: il },
    { region: 'NG', callingCode: 234, number: '+2342033123456', metadata: ng },
    { region: 'ZA', callingCode: 27, number: '+27101234567', metadata: za },
    { region: 'EG', callingCode: 20, number: '+20234567890', metadata: eg },
    { region: 'BR', callingCode: 55, number: '+551123456789', metadata: br },
    { region: 'MX', callingCode: 52, number: '+522001234567', metadata: mx },
    { region: 'AR', callingCode: 54, number: '+541123456789', metadata: ar },
    { region: 'CO', callingCode: 57, number: '+576012345678', metadata: co },
    { region: 'CH', callingCode: 41, number: '+41212345678', metadata: ch },
    { region: 'NO', callingCode: 47, number: '+4721234567', metadata: no },
    { region: 'NZ', callingCode: 64, number: '+6432345678', metadata: nz },
  ];

  before(() => {
    const metadata: Metadata = Object.assign({}, ...cases.map((c) => c.metadata));
    setup({ metadata });
  });

  for (const { region, callingCode, number } of cases) {
    test(`resolves ${region}'s real example number to region ${region}`, () => {
      const result = parse(number);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.region, region);
        assert.equal(result.data.countryCode, callingCode);
      }
    });
  }
});

// Russia and Kazakhstan share calling code 7, the same way NANP shares
// calling code 1 - a second real-world proof (not just NANP) that
// findCallingCodeGroup()/matchRegion() in src/core.ts correctly
// disambiguates between multiple regions sharing one calling code.
describe('parse() with RU + KZ (shared calling code 7) injected together', () => {
  before(() => {
    setup({ metadata: { ...ru, ...kz } });
  });

  test("resolves RU's real example number to region RU, not KZ", () => {
    const result = parse('+73011234567');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.region, 'RU');
      assert.equal(result.data.countryCode, 7);
    }
  });

  test("resolves KZ's real example number to region KZ, not RU", () => {
    const result = parse('+77123456789');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.region, 'KZ');
      assert.equal(result.data.countryCode, 7);
    }
  });
});
