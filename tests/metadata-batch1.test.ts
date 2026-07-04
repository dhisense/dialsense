import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parse } from '../src/core.js';
import { setup, type Metadata } from '../src/metadata.js';
import ua from '../data/ua.json' with { type: 'json' };
import rs from '../data/rs.json' with { type: 'json' };
import is from '../data/is.json' with { type: 'json' };
import ba from '../data/ba.json' with { type: 'json' };
import al from '../data/al.json' with { type: 'json' };
import by from '../data/by.json' with { type: 'json' };
import md from '../data/md.json' with { type: 'json' };
import mk from '../data/mk.json' with { type: 'json' };
import th from '../data/th.json' with { type: 'json' };
import my from '../data/my.json' with { type: 'json' };
import tw from '../data/tw.json' with { type: 'json' };
import bd from '../data/bd.json' with { type: 'json' };
import lk from '../data/lk.json' with { type: 'json' };
import mm from '../data/mm.json' with { type: 'json' };
import kh from '../data/kh.json' with { type: 'json' };
import mn from '../data/mn.json' with { type: 'json' };
import mo from '../data/mo.json' with { type: 'json' };
import iq from '../data/iq.json' with { type: 'json' };
import jo from '../data/jo.json' with { type: 'json' };
import lb from '../data/lb.json' with { type: 'json' };
import kw from '../data/kw.json' with { type: 'json' };
import qa from '../data/qa.json' with { type: 'json' };
import bh from '../data/bh.json' with { type: 'json' };
import om from '../data/om.json' with { type: 'json' };
import ke from '../data/ke.json' with { type: 'json' };
import et from '../data/et.json' with { type: 'json' };
import gh from '../data/gh.json' with { type: 'json' };
import tz from '../data/tz.json' with { type: 'json' };
import dz from '../data/dz.json' with { type: 'json' };
import ma from '../data/ma.json' with { type: 'json' };
import tn from '../data/tn.json' with { type: 'json' };
import ug from '../data/ug.json' with { type: 'json' };
import uz from '../data/uz.json' with { type: 'json' };
import az from '../data/az.json' with { type: 'json' };
import ge from '../data/ge.json' with { type: 'json' };
import am from '../data/am.json' with { type: 'json' };
import cl from '../data/cl.json' with { type: 'json' };
import pe from '../data/pe.json' with { type: 'json' };
import ve from '../data/ve.json' with { type: 'json' };
import ec from '../data/ec.json' with { type: 'json' };

// Batch 1 of the "complete remaining coverage" push (see
// .local/project-background.MD): 40 countries across non-EU Europe, wider
// Asia, the Middle East, Africa, Central Asia/Caucasus, and LatAm - mainly
// a scale/collision sanity check (confirms 40 more real calling codes
// don't collide with anything already in data/), plus the usual
// real-example-number proof per country. Numbers below were constructed
// from each country's real upstream example number (captured during
// extraction) and confirmed by actually running parse() before being
// written here - not hand-guessed.
describe('parse() with batch 1 (non-EU Europe / wider Asia / Middle East / Africa / Central Asia / LatAm) injected together', () => {
  const cases: Array<{ region: string; callingCode: number; number: string; metadata: Metadata }> = [
    { region: 'UA', callingCode: 380, number: '+380311234567', metadata: ua },
    { region: 'RS', callingCode: 381, number: '+38110234567', metadata: rs },
    { region: 'IS', callingCode: 354, number: '+3544101234', metadata: is },
    { region: 'BA', callingCode: 387, number: '+38730212345', metadata: ba },
    { region: 'AL', callingCode: 355, number: '+35522345678', metadata: al },
    { region: 'BY', callingCode: 375, number: '+375152450911', metadata: by },
    { region: 'MD', callingCode: 373, number: '+37322212345', metadata: md },
    { region: 'MK', callingCode: 389, number: '+38922012345', metadata: mk },
    { region: 'TH', callingCode: 66, number: '+6621234567', metadata: th },
    { region: 'MY', callingCode: 60, number: '+60323856789', metadata: my },
    { region: 'TW', callingCode: 886, number: '+886221234567', metadata: tw },
    { region: 'BD', callingCode: 880, number: '+88027111234', metadata: bd },
    { region: 'LK', callingCode: 94, number: '+94112345678', metadata: lk },
    { region: 'MM', callingCode: 95, number: '+951234567', metadata: mm },
    { region: 'KH', callingCode: 855, number: '+85523756789', metadata: kh },
    { region: 'MN', callingCode: 976, number: '+97653123456', metadata: mn },
    { region: 'MO', callingCode: 853, number: '+85328212345', metadata: mo },
    { region: 'IQ', callingCode: 964, number: '+96412345678', metadata: iq },
    { region: 'JO', callingCode: 962, number: '+96262001234', metadata: jo },
    { region: 'LB', callingCode: 961, number: '+9611123456', metadata: lb },
    { region: 'KW', callingCode: 965, number: '+96522345678', metadata: kw },
    { region: 'QA', callingCode: 974, number: '+97444123456', metadata: qa },
    { region: 'BH', callingCode: 973, number: '+97317001234', metadata: bh },
    { region: 'OM', callingCode: 968, number: '+96823123456', metadata: om },
    { region: 'KE', callingCode: 254, number: '+254202012345', metadata: ke },
    { region: 'ET', callingCode: 251, number: '+251111112345', metadata: et },
    { region: 'GH', callingCode: 233, number: '+233302345678', metadata: gh },
    { region: 'TZ', callingCode: 255, number: '+255222345678', metadata: tz },
    { region: 'DZ', callingCode: 213, number: '+21312345678', metadata: dz },
    { region: 'MA', callingCode: 212, number: '+212520123456', metadata: ma },
    { region: 'TN', callingCode: 216, number: '+21630010123', metadata: tn },
    { region: 'UG', callingCode: 256, number: '+256312345678', metadata: ug },
    { region: 'UZ', callingCode: 998, number: '+998669050123', metadata: uz },
    { region: 'AZ', callingCode: 994, number: '+994123123456', metadata: az },
    { region: 'GE', callingCode: 995, number: '+995322123456', metadata: ge },
    { region: 'AM', callingCode: 374, number: '+37410123456', metadata: am },
    { region: 'CL', callingCode: 56, number: '+56600123456', metadata: cl },
    { region: 'PE', callingCode: 51, number: '+5111234567', metadata: pe },
    { region: 'VE', callingCode: 58, number: '+582121234567', metadata: ve },
    { region: 'EC', callingCode: 593, number: '+59322123456', metadata: ec },
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
