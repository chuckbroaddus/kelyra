import assert from 'node:assert/strict';
import test from 'node:test';

import {
  roundPct,
  letterFor,
  isPassing,
  getScaleTemplate,
  SCALE_TEMPLATES,
  makeScaleFromTemplate,
  listScaleTemplates,
} from './scale.ts';

test('roundPct nearest_whole, half_up, truncate', () => {
  assert.equal(roundPct(89.4, 'nearest_whole'), 89);
  assert.equal(roundPct(89.5, 'half_up'), 90);
  assert.equal(roundPct(89.5, 'nearest_whole'), 90);
  assert.equal(roundPct(89.5, 'truncate'), 89);
  assert.equal(roundPct(91.234, 'nearest_whole', 2), 91.23);
});

test('7.8c + acceptance 8a scale lookup', () => {
  const tx = getScaleTemplate('texas_no_d')!;
  const college = getScaleTemplate('college_plus_minus')!;
  assert.equal(letterFor(tx, 91), 'A');
  assert.equal(letterFor(college, 91), 'A-');

  const halfUpA = makeScaleFromTemplate('us_10', {
    rounding: 'half_up',
    decimals: 0,
  });
  assert.equal(letterFor(halfUpA, 89.5), 'A');

  const noRound = makeScaleFromTemplate('us_10', {
    rounding: 'truncate',
    decimals: 4,
  });
  // 89.5 kept; A-at-90 → B (fixture 7.8c "no rounding")
  assert.equal(letterFor(noRound, 89.5), 'B');
});

test('letterFor US 10 and Texas bands', () => {
  const us = getScaleTemplate('us_10')!;
  assert.equal(letterFor(us, 91), 'A');
  assert.equal(letterFor(us, 89), 'B');
  const tx = getScaleTemplate('tx-no-d')!;
  assert.equal(letterFor(tx, 75), 'C');
  assert.equal(letterFor(tx, 69), 'F');
});

test('passing independent of D band (FR-SCL-03)', () => {
  const txNoD = getScaleTemplate('texas_no_d')!;
  assert.equal(isPassing(txNoD, 71), true);
  assert.equal(isPassing(txNoD, 'C'), true);
  assert.equal(isPassing(txNoD, 69), false);
  const us = getScaleTemplate('us_10')!;
  assert.equal(isPassing(us, 59), false);
  assert.equal(isPassing(us, 60), true);
});

test('templates include FR-SCL-02 set', () => {
  const keys = Object.keys(SCALE_TEMPLATES);
  for (const k of [
    'us_10',
    'texas_with_d',
    'texas_no_d',
    'college_plus_minus',
    'seven_point',
    'esnu',
    'pf',
    'su',
    'crnc',
  ]) {
    assert.ok(keys.includes(k), k);
  }
  assert.ok(listScaleTemplates().length >= 9);
  assert.equal(getScaleTemplate('7-point')!.id, 'seven_point');
});
