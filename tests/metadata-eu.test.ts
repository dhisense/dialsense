import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parse } from '../src/core.js';
import { setup, type Metadata } from '../src/metadata.js';
import at from '../data/at.json' with { type: 'json' };
import be from '../data/be.json' with { type: 'json' };
import bg from '../data/bg.json' with { type: 'json' };
import hr from '../data/hr.json' with { type: 'json' };
import cy from '../data/cy.json' with { type: 'json' };
import cz from '../data/cz.json' with { type: 'json' };
import dk from '../data/dk.json' with { type: 'json' };
import ee from '../data/ee.json' with { type: 'json' };
import fi from '../data/fi.json' with { type: 'json' };
import gr from '../data/gr.json' with { type: 'json' };
import hu from '../data/hu.json' with { type: 'json' };
import ie from '../data/ie.json' with { type: 'json' };
import it from '../data/it.json' with { type: 'json' };
import lv from '../data/lv.json' with { type: 'json' };
import lt from '../data/lt.json' with { type: 'json' };
import lu from '../data/lu.json' with { type: 'json' };
import mt from '../data/mt.json' with { type: 'json' };
import nl from '../data/nl.json' with { type: 'json' };
import pl from '../data/pl.json' with { type: 'json' };
import pt from '../data/pt.json' with { type: 'json' };
import ro from '../data/ro.json' with { type: 'json' };
import sk from '../data/sk.json' with { type: 'json' };
import si from '../data/si.json' with { type: 'json' };
import es from '../data/es.json' with { type: 'json' };
import se from '../data/se.json' with { type: 'json' };

// All 25 EU countries injected together, one test each - unlike NANP,
// each of these has its own distinct calling code (no sharing), so this
// is mainly a scale/collision sanity check (25 unrelated calling codes,
// no accidental cross-country pattern overlap) plus the same real-data
// proof used for every other batch: each region's own upstream example
// number, self-checked at extraction time, parses correctly here too.
describe('parse() with all EU countries injected together', () => {
  const cases: Array<{ region: string; callingCode: number; number: string; metadata: Metadata }> = [
    { region: 'AT', callingCode: 43, number: '+431234567890', metadata: at },
    { region: 'BE', callingCode: 32, number: '+3212345678', metadata: be },
    { region: 'BG', callingCode: 359, number: '+3592123456', metadata: bg },
    { region: 'HR', callingCode: 385, number: '+38512345678', metadata: hr },
    { region: 'CY', callingCode: 357, number: '+35722345678', metadata: cy },
    { region: 'CZ', callingCode: 420, number: '+420212345678', metadata: cz },
    { region: 'DK', callingCode: 45, number: '+4532123456', metadata: dk },
    { region: 'EE', callingCode: 372, number: '+3723212345', metadata: ee },
    { region: 'FI', callingCode: 358, number: '+358131234567', metadata: fi },
    { region: 'GR', callingCode: 30, number: '+302123456789', metadata: gr },
    { region: 'HU', callingCode: 36, number: '+3612345678', metadata: hu },
    { region: 'IE', callingCode: 353, number: '+3532212345', metadata: ie },
    { region: 'IT', callingCode: 39, number: '+390212345678', metadata: it },
    { region: 'LV', callingCode: 371, number: '+37163123456', metadata: lv },
    { region: 'LT', callingCode: 370, number: '+37031234567', metadata: lt },
    { region: 'LU', callingCode: 352, number: '+35227123456', metadata: lu },
    { region: 'MT', callingCode: 356, number: '+35621001234', metadata: mt },
    { region: 'NL', callingCode: 31, number: '+31101234567', metadata: nl },
    { region: 'PL', callingCode: 48, number: '+48123456789', metadata: pl },
    { region: 'PT', callingCode: 351, number: '+351212345678', metadata: pt },
    { region: 'RO', callingCode: 40, number: '+40211234567', metadata: ro },
    { region: 'SK', callingCode: 421, number: '+421221234567', metadata: sk },
    { region: 'SI', callingCode: 386, number: '+38612345678', metadata: si },
    { region: 'ES', callingCode: 34, number: '+34810123456', metadata: es },
    { region: 'SE', callingCode: 46, number: '+468123456', metadata: se },
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
