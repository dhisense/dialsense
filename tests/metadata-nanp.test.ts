import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parse } from '../src/core.js';
import { setup, type Metadata } from '../src/metadata.js';
import us from '../data/us.json' with { type: 'json' };
import ca from '../data/ca.json' with { type: 'json' };
import ag from '../data/ag.json' with { type: 'json' };
import ai from '../data/ai.json' with { type: 'json' };
import asData from '../data/as.json' with { type: 'json' };
import bb from '../data/bb.json' with { type: 'json' };
import bm from '../data/bm.json' with { type: 'json' };
import bs from '../data/bs.json' with { type: 'json' };
import dm from '../data/dm.json' with { type: 'json' };
import doData from '../data/do.json' with { type: 'json' };
import gd from '../data/gd.json' with { type: 'json' };
import gu from '../data/gu.json' with { type: 'json' };
import jm from '../data/jm.json' with { type: 'json' };
import kn from '../data/kn.json' with { type: 'json' };
import ky from '../data/ky.json' with { type: 'json' };
import lc from '../data/lc.json' with { type: 'json' };
import mp from '../data/mp.json' with { type: 'json' };
import ms from '../data/ms.json' with { type: 'json' };
import pr from '../data/pr.json' with { type: 'json' };
import sx from '../data/sx.json' with { type: 'json' };
import tc from '../data/tc.json' with { type: 'json' };
import tt from '../data/tt.json' with { type: 'json' };
import vc from '../data/vc.json' with { type: 'json' };
import vg from '../data/vg.json' with { type: 'json' };
import vi from '../data/vi.json' with { type: 'json' };

// All 25 NANP territories injected TOGETHER (not one at a time, unlike
// metadata-international.test.ts) - this is the actual stress test of
// findCallingCodeGroup()/matchRegion() in src/core.ts disambiguating
// among many regions sharing one calling code, not just US+CA's n=2.
// Each assertion doubles as a cross-territory ambiguity check: if any
// two territories' patterns both matched a given number, the wrong
// `region` would come back and the assertion would catch it.
describe('parse() with all NANP territories injected together', () => {
  const cases: Array<{ region: string; number: string; metadata: Metadata }> = [
    { region: 'US', number: '+12015550123', metadata: us },
    { region: 'CA', number: '+15062345678', metadata: ca },
    { region: 'AG', number: '+12684601234', metadata: ag },
    { region: 'AI', number: '+12644612345', metadata: ai },
    { region: 'AS', number: '+16846221234', metadata: asData },
    { region: 'BB', number: '+12464123456', metadata: bb },
    { region: 'BM', number: '+14414123456', metadata: bm },
    { region: 'BS', number: '+12423456789', metadata: bs },
    { region: 'DM', number: '+17674201234', metadata: dm },
    { region: 'DO', number: '+18092345678', metadata: doData },
    { region: 'GD', number: '+14732691234', metadata: gd },
    { region: 'GU', number: '+16713001234', metadata: gu },
    { region: 'JM', number: '+18765230123', metadata: jm },
    { region: 'KN', number: '+18692361234', metadata: kn },
    { region: 'KY', number: '+13452221234', metadata: ky },
    { region: 'LC', number: '+17584305678', metadata: lc },
    { region: 'MP', number: '+16702345678', metadata: mp },
    { region: 'MS', number: '+16644912345', metadata: ms },
    { region: 'PR', number: '+17872345678', metadata: pr },
    { region: 'SX', number: '+17215425678', metadata: sx },
    { region: 'TC', number: '+16497121234', metadata: tc },
    { region: 'TT', number: '+18682211234', metadata: tt },
    { region: 'VC', number: '+17842661234', metadata: vc },
    { region: 'VG', number: '+12842291234', metadata: vg },
    { region: 'VI', number: '+13406421234', metadata: vi },
  ];

  before(() => {
    const metadata: Metadata = Object.assign({}, ...cases.map((c) => c.metadata));
    setup({ metadata });
  });

  for (const { region, number } of cases) {
    test(`resolves ${region}'s real example number to region ${region}`, () => {
      const result = parse(number);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.region, region);
        assert.equal(result.data.countryCode, 1);
      }
    });
  }
});
