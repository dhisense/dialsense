import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parse } from '../src/core.js';
import { setup, type Metadata } from '../src/metadata.js';
import cd from '../data/cd.json' with { type: 'json' };
import ao from '../data/ao.json' with { type: 'json' };
import mz from '../data/mz.json' with { type: 'json' };
import zm from '../data/zm.json' with { type: 'json' };
import zw from '../data/zw.json' with { type: 'json' };
import rw from '../data/rw.json' with { type: 'json' };
import sn from '../data/sn.json' with { type: 'json' };
import ci from '../data/ci.json' with { type: 'json' };
import cm from '../data/cm.json' with { type: 'json' };
import ml from '../data/ml.json' with { type: 'json' };
import sd from '../data/sd.json' with { type: 'json' };
import ly from '../data/ly.json' with { type: 'json' };
import na from '../data/na.json' with { type: 'json' };
import bw from '../data/bw.json' with { type: 'json' };
import pa from '../data/pa.json' with { type: 'json' };
import cr from '../data/cr.json' with { type: 'json' };
import gt from '../data/gt.json' with { type: 'json' };
import hn from '../data/hn.json' with { type: 'json' };
import sv from '../data/sv.json' with { type: 'json' };
import ni from '../data/ni.json' with { type: 'json' };
import cu from '../data/cu.json' with { type: 'json' };
import bz from '../data/bz.json' with { type: 'json' };
import bo from '../data/bo.json' with { type: 'json' };
import py from '../data/py.json' with { type: 'json' };
import uy from '../data/uy.json' with { type: 'json' };
import gy from '../data/gy.json' with { type: 'json' };
import sr from '../data/sr.json' with { type: 'json' };
import ir from '../data/ir.json' with { type: 'json' };
import ye from '../data/ye.json' with { type: 'json' };
import ps from '../data/ps.json' with { type: 'json' };
import np from '../data/np.json' with { type: 'json' };
import bn from '../data/bn.json' with { type: 'json' };
import bt from '../data/bt.json' with { type: 'json' };
import mv from '../data/mv.json' with { type: 'json' };
import af from '../data/af.json' with { type: 'json' };
import tl from '../data/tl.json' with { type: 'json' };
import ad from '../data/ad.json' with { type: 'json' };
import mc from '../data/mc.json' with { type: 'json' };
import sm from '../data/sm.json' with { type: 'json' };
import li from '../data/li.json' with { type: 'json' };
import gi from '../data/gi.json' with { type: 'json' };

// Batch 2 of the "complete remaining coverage" push (see
// .local/project-background.MD): 41 countries across remaining
// Sub-Saharan Africa, Central America, remaining South America, three
// Middle East countries initially flagged as possibly-thin upstream data
// (Iran, Yemen, Palestine - all turned out to extract and self-check
// cleanly), remaining Asia, and European microstates. Same discipline as
// every prior batch: numbers below were constructed from each country's
// real upstream example number and confirmed by actually running parse()
// before being written here - not hand-guessed.
describe('parse() with batch 2 (Sub-Saharan Africa / Central America / South America / Middle East / Asia / European microstates) injected together', () => {
  const cases: Array<{ region: string; callingCode: number; number: string; metadata: Metadata }> = [
    { region: 'CD', callingCode: 243, number: '+2431234567', metadata: cd },
    { region: 'AO', callingCode: 244, number: '+244222123456', metadata: ao },
    { region: 'MZ', callingCode: 258, number: '+25821123456', metadata: mz },
    { region: 'ZM', callingCode: 260, number: '+260211234567', metadata: zm },
    { region: 'ZW', callingCode: 263, number: '+2631312345', metadata: zw },
    { region: 'RW', callingCode: 250, number: '+250250123456', metadata: rw },
    { region: 'SN', callingCode: 221, number: '+221301012345', metadata: sn },
    { region: 'CI', callingCode: 225, number: '+2252123456789', metadata: ci },
    { region: 'CM', callingCode: 237, number: '+237222123456', metadata: cm },
    { region: 'ML', callingCode: 223, number: '+22320212345', metadata: ml },
    { region: 'SD', callingCode: 249, number: '+249153123456', metadata: sd },
    { region: 'LY', callingCode: 218, number: '+218212345678', metadata: ly },
    { region: 'NA', callingCode: 264, number: '+26461221234', metadata: na },
    { region: 'BW', callingCode: 267, number: '+2672401234', metadata: bw },
    { region: 'PA', callingCode: 507, number: '+5072001234', metadata: pa },
    { region: 'CR', callingCode: 506, number: '+50622123456', metadata: cr },
    { region: 'GT', callingCode: 502, number: '+50222456789', metadata: gt },
    { region: 'HN', callingCode: 504, number: '+50422123456', metadata: hn },
    { region: 'SV', callingCode: 503, number: '+50321234567', metadata: sv },
    { region: 'NI', callingCode: 505, number: '+50521234567', metadata: ni },
    { region: 'CU', callingCode: 53, number: '+5371234567', metadata: cu },
    { region: 'BZ', callingCode: 501, number: '+5012221234', metadata: bz },
    { region: 'BO', callingCode: 591, number: '+59122123456', metadata: bo },
    { region: 'PY', callingCode: 595, number: '+595212345678', metadata: py },
    { region: 'UY', callingCode: 598, number: '+59821231234', metadata: uy },
    { region: 'GY', callingCode: 592, number: '+5922201234', metadata: gy },
    { region: 'SR', callingCode: 597, number: '+597211234', metadata: sr },
    { region: 'IR', callingCode: 98, number: '+982123456789', metadata: ir },
    { region: 'YE', callingCode: 967, number: '+9671234567', metadata: ye },
    { region: 'PS', callingCode: 970, number: '+97022234567', metadata: ps },
    { region: 'NP', callingCode: 977, number: '+97714567890', metadata: np },
    { region: 'BN', callingCode: 673, number: '+6732345678', metadata: bn },
    { region: 'BT', callingCode: 975, number: '+9752345678', metadata: bt },
    { region: 'MV', callingCode: 960, number: '+9606701234', metadata: mv },
    { region: 'AF', callingCode: 93, number: '+93234567890', metadata: af },
    { region: 'TL', callingCode: 670, number: '+6702112345', metadata: tl },
    { region: 'AD', callingCode: 376, number: '+376712345', metadata: ad },
    { region: 'MC', callingCode: 377, number: '+37799123456', metadata: mc },
    { region: 'SM', callingCode: 378, number: '+3780549886377', metadata: sm },
    { region: 'LI', callingCode: 423, number: '+4232345678', metadata: li },
    { region: 'GI', callingCode: 350, number: '+35020012345', metadata: gi },
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
