import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parse } from '../src/core.js';
import { setup, type Metadata } from '../src/metadata.js';
import bj from '../data/bj.json' with { type: 'json' };
import bf from '../data/bf.json' with { type: 'json' };
import bi from '../data/bi.json' with { type: 'json' };
import cv from '../data/cv.json' with { type: 'json' };
import cf from '../data/cf.json' with { type: 'json' };
import td from '../data/td.json' with { type: 'json' };
import km from '../data/km.json' with { type: 'json' };
import cg from '../data/cg.json' with { type: 'json' };
import dj from '../data/dj.json' with { type: 'json' };
import gq from '../data/gq.json' with { type: 'json' };
import er from '../data/er.json' with { type: 'json' };
import sz from '../data/sz.json' with { type: 'json' };
import ga from '../data/ga.json' with { type: 'json' };
import gm from '../data/gm.json' with { type: 'json' };
import gn from '../data/gn.json' with { type: 'json' };
import gw from '../data/gw.json' with { type: 'json' };
import ls from '../data/ls.json' with { type: 'json' };
import lr from '../data/lr.json' with { type: 'json' };
import mg from '../data/mg.json' with { type: 'json' };
import mw from '../data/mw.json' with { type: 'json' };
import mr from '../data/mr.json' with { type: 'json' };
import mu from '../data/mu.json' with { type: 'json' };
import ne from '../data/ne.json' with { type: 'json' };
import st from '../data/st.json' with { type: 'json' };
import sc from '../data/sc.json' with { type: 'json' };
import sl from '../data/sl.json' with { type: 'json' };
import so from '../data/so.json' with { type: 'json' };
import ss from '../data/ss.json' with { type: 'json' };
import tg from '../data/tg.json' with { type: 'json' };
import ht from '../data/ht.json' with { type: 'json' };
import tm from '../data/tm.json' with { type: 'json' };
import tj from '../data/tj.json' with { type: 'json' };
import kg from '../data/kg.json' with { type: 'json' };
import la from '../data/la.json' with { type: 'json' };
import kp from '../data/kp.json' with { type: 'json' };
import sy from '../data/sy.json' with { type: 'json' };
import va from '../data/va.json' with { type: 'json' };
import xk from '../data/xk.json' with { type: 'json' };
import it from '../data/it.json' with { type: 'json' };
import fj from '../data/fj.json' with { type: 'json' };
import pg from '../data/pg.json' with { type: 'json' };
import ws from '../data/ws.json' with { type: 'json' };
import to from '../data/to.json' with { type: 'json' };
import ki from '../data/ki.json' with { type: 'json' };
import pw from '../data/pw.json' with { type: 'json' };
import fm from '../data/fm.json' with { type: 'json' };
import mh from '../data/mh.json' with { type: 'json' };
import nr from '../data/nr.json' with { type: 'json' };
import tv from '../data/tv.json' with { type: 'json' };

// Batch 3 of the "complete remaining coverage" push (see
// .local/project-background.MD): the true remainder of world coverage -
// all remaining Sub-Saharan Africa, Haiti, the remaining Central
// Asia/Caucasus states, Laos, North Korea, Syria, Vatican City, Kosovo,
// and the independent Pacific island nations. North Korea, Syria, and
// Kosovo (`XK`, not a standard ISO 3166-1 code) were flagged beforehand as
// likely candidates for thin/absent upstream data - all three extracted
// and self-checked cleanly regardless. Vanuatu and Solomon Islands were
// genuinely skipped: their upstream metadata only defines a format rule
// for their newer 7-digit mobile ranges, with no rule at all covering
// their 5-digit fixed-line ranges, so the extraction self-check correctly
// refused to ship them rather than silently mis-formatting. Same
// discipline as every prior batch: numbers below were constructed from
// each country's real upstream example number and confirmed by actually
// running parse() before being written here - not hand-guessed.
describe('parse() with batch 3 (remaining Africa, Haiti, Central Asia, Laos/North Korea/Syria, Vatican City, Kosovo, Pacific) injected together', () => {
  const cases: Array<{ region: string; callingCode: number; number: string; metadata: Metadata }> = [
    { region: 'BJ', callingCode: 229, number: '+2290120211234', metadata: bj },
    { region: 'BF', callingCode: 226, number: '+22620491234', metadata: bf },
    { region: 'BI', callingCode: 257, number: '+25722201234', metadata: bi },
    { region: 'CV', callingCode: 238, number: '+2382211234', metadata: cv },
    { region: 'CF', callingCode: 236, number: '+23621612345', metadata: cf },
    { region: 'TD', callingCode: 235, number: '+23522501234', metadata: td },
    { region: 'KM', callingCode: 269, number: '+2697712345', metadata: km },
    { region: 'CG', callingCode: 242, number: '+242222123456', metadata: cg },
    { region: 'DJ', callingCode: 253, number: '+25321360003', metadata: dj },
    { region: 'GQ', callingCode: 240, number: '+240333091234', metadata: gq },
    { region: 'ER', callingCode: 291, number: '+2918370362', metadata: er },
    { region: 'SZ', callingCode: 268, number: '+26822171234', metadata: sz },
    { region: 'GA', callingCode: 241, number: '+24101441234', metadata: ga },
    { region: 'GM', callingCode: 220, number: '+2205661234', metadata: gm },
    { region: 'GN', callingCode: 224, number: '+22430241234', metadata: gn },
    { region: 'GW', callingCode: 245, number: '+245443201234', metadata: gw },
    { region: 'LS', callingCode: 266, number: '+26622123456', metadata: ls },
    { region: 'LR', callingCode: 231, number: '+23121234567', metadata: lr },
    { region: 'MG', callingCode: 261, number: '+261202123456', metadata: mg },
    { region: 'MW', callingCode: 265, number: '+2651234567', metadata: mw },
    { region: 'MR', callingCode: 222, number: '+22235123456', metadata: mr },
    { region: 'MU', callingCode: 230, number: '+23054480123', metadata: mu },
    { region: 'NE', callingCode: 227, number: '+22720201234', metadata: ne },
    { region: 'ST', callingCode: 239, number: '+2392221234', metadata: st },
    { region: 'SC', callingCode: 248, number: '+2484217123', metadata: sc },
    { region: 'SL', callingCode: 232, number: '+23222221234', metadata: sl },
    { region: 'SO', callingCode: 252, number: '+2524012345', metadata: so },
    { region: 'SS', callingCode: 211, number: '+211181234567', metadata: ss },
    { region: 'TG', callingCode: 228, number: '+22822212345', metadata: tg },
    { region: 'HT', callingCode: 509, number: '+50922453300', metadata: ht },
    { region: 'TM', callingCode: 993, number: '+99312345678', metadata: tm },
    { region: 'TJ', callingCode: 992, number: '+992372123456', metadata: tj },
    { region: 'KG', callingCode: 996, number: '+996312123456', metadata: kg },
    { region: 'LA', callingCode: 856, number: '+85621212862', metadata: la },
    { region: 'KP', callingCode: 850, number: '+85021234567', metadata: kp },
    { region: 'SY', callingCode: 963, number: '+963112345678', metadata: sy },
    { region: 'XK', callingCode: 383, number: '+38328012345', metadata: xk },
    { region: 'FJ', callingCode: 679, number: '+6793212345', metadata: fj },
    { region: 'PG', callingCode: 675, number: '+6753123456', metadata: pg },
    { region: 'WS', callingCode: 685, number: '+68522123', metadata: ws },
    { region: 'TO', callingCode: 676, number: '+67620123', metadata: to },
    { region: 'KI', callingCode: 686, number: '+68631234', metadata: ki },
    { region: 'PW', callingCode: 680, number: '+6802771234', metadata: pw },
    { region: 'FM', callingCode: 691, number: '+6913201234', metadata: fm },
    { region: 'MH', callingCode: 692, number: '+6922471234', metadata: mh },
    { region: 'NR', callingCode: 674, number: '+6744441234', metadata: nr },
    { region: 'TV', callingCode: 688, number: '+68820123', metadata: tv },
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

// Vatican City shares calling code 39 with Italy - a third real-world
// case of one calling code covering multiple regions (alongside NANP's 1
// and RU/KZ's 7), and structurally different from those two: instead of
// aggregating several genuinely distinct national numbering plans, Italy
// carves a specific sub-range (numbers starting "06698") out of its own
// pattern for Vatican City. Confirms findCallingCodeGroup()/matchRegion()
// in src/core.ts correctly disambiguates this case too, unmodified.
describe('parse() with IT + VA (shared calling code 39) injected together', () => {
  before(() => {
    setup({ metadata: { ...it, ...va } });
  });

  test("resolves VA's real example number to region VA, not IT", () => {
    const result = parse('+390669812345');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.region, 'VA');
      assert.equal(result.data.countryCode, 39);
    }
  });

  test("resolves IT's real example number to region IT, not VA", () => {
    const result = parse('+390212345678');
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.region, 'IT');
      assert.equal(result.data.countryCode, 39);
    }
  });
});
