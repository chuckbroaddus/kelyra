import assert from 'node:assert/strict';
import test from 'node:test';

import { GRADE_TERM_ROLLUP, type GradeTerm } from '../marks.ts';
import {
  ROLLUP_PRESET_KEYS,
  buildTemplate,
  buildTermRollup,
  childrenOf,
  collegeTerm,
  creditTerms,
  custom,
  elementaryYear4,
  elementaryYear6,
  legacyCalendar,
  legacyFilterCodes,
  legacyGradeTermRollup,
  legacyToNineWeeksCode,
  legacyToNineWeeksRoundTrip,
  nineWeeks,
  nineWeeksCodeToLegacy,
  periodForDate,
  progressCheckpoints,
  rollupWeightsValid,
  trimester,
  txSixWeeks,
  weightsForPreset,
} from './index.ts';
import type { TemplateKey } from './types.ts';

const YEAR = { start: '2025-08-15', end: '2026-05-28' };

test('all CONTRACT rollup presets validate to sum 1', () => {
  const cases: Array<{ key: (typeof ROLLUP_PRESET_KEYS)[number]; n: number }> = [
    { key: '2/7+1/7', n: 3 },
    { key: '40/40/20', n: 2 },
    { key: '45/45/10', n: 2 },
    { key: '3/7+3/7+1/7', n: 2 },
    { key: '85/15', n: 3 },
    { key: '25x4', n: 4 },
    { key: '50/50', n: 2 },
    { key: 'year_mean', n: 5 },
  ];
  assert.deepEqual(
    [...ROLLUP_PRESET_KEYS].sort(),
    cases.map((c) => c.key).sort(),
  );
  for (const c of cases) {
    const w = weightsForPreset(c.key, c.n);
    const comps = w.child_weights.map((weight, i) => ({ period_id: `c${i}`, weight }));
    if (w.exam_enabled) comps.push({ period_id: 'E', weight: w.exam_weight });
    assert.equal(rollupWeightsValid(comps), true, c.key);
  }
});

test('tx_six_weeks nests 6W under S1/S2 with 2/7+1/7 rollup', () => {
  const cal = txSixWeeks({ year: YEAR });
  assert.equal(cal.period_model, 'six_weeks');
  assert.deepEqual(
    childrenOf(cal, 'S1').filter((p) => p.kind === 'marking_period').map((p) => p.code),
    ['6W1', '6W2', '6W3'],
  );
  assert.deepEqual(
    childrenOf(cal, 'S2').filter((p) => p.kind === 'marking_period').map((p) => p.code),
    ['6W4', '6W5', '6W6'],
  );
  assert.ok(cal.periods.some((p) => p.code === 'E1' && p.kind === 'exam'));
  assert.ok(cal.periods.some((p) => p.code === 'E2' && p.kind === 'exam'));
  const s1 = cal.rollups.find((r) => r.term_id === 'S1')!;
  assert.equal(s1.exam.enabled, true);
  assert.equal(s1.exam.code, 'E1');
  assert.equal(rollupWeightsValid(s1.components), true);
  const six = s1.components.find((c) => c.period_id === '6W1')!;
  assert.ok(Math.abs(six.weight - 2 / 7) < 1e-9);
  assert.equal(cal.periods.find((p) => p.code === 'Y1')!.start_date, YEAR.start);
  assert.ok(cal.periods.find((p) => p.code === '6W1')!.start_date);
});

test('nine_weeks default 40/40/20 and Q tree', () => {
  const cal = nineWeeks({ year: YEAR });
  assert.equal(cal.period_model, 'nine_weeks');
  assert.deepEqual(creditTerms(cal).map((p) => p.code), ['S1', 'S2']);
  const s1 = cal.rollups.find((r) => r.term_id === 'S1')!;
  assert.deepEqual(
    s1.components.map((c) => [c.period_id, c.weight]),
    [
      ['Q1', 0.4],
      ['Q2', 0.4],
      ['E1', 0.2],
    ],
  );
});

test('trimester, college, elementary templates', () => {
  const tri = trimester({ year: YEAR });
  assert.equal(tri.period_model, 'trimester');
  assert.deepEqual(creditTerms(tri).map((p) => p.code), ['T1', 'T2', 'T3']);

  const col = collegeTerm({ year: YEAR });
  assert.equal(col.period_model, 'college');
  assert.equal(creditTerms(col).length, 1);

  const e4 = elementaryYear4({ year: YEAR });
  assert.equal(e4.level, 'elementary');
  assert.equal(creditTerms(e4).length, 0);
  assert.equal(e4.periods.filter((p) => p.kind === 'marking_period').length, 4);
  assert.equal(rollupWeightsValid(e4.rollups[0]!.components), true);

  const e6 = elementaryYear6({ year: YEAR });
  assert.equal(e6.periods.filter((p) => p.kind === 'marking_period').length, 6);
  assert.equal(creditTerms(e6).length, 0);
});

test('custom(N, perTerm) proposes P1..Pn and S1/S2', () => {
  const cal = custom(6, 3, { year: YEAR });
  assert.equal(cal.period_model, 'custom');
  assert.deepEqual(creditTerms(cal).map((p) => p.code), ['S1', 'S2']);
  assert.deepEqual(
    cal.periods.filter((p) => p.kind === 'marking_period').map((p) => p.code),
    ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  );
  assert.deepEqual(
    childrenOf(cal, 'S1').map((p) => p.code),
    ['P1', 'P2', 'P3'],
  );
  assert.throws(() => custom(5, 2));
});

test('buildTemplate covers every FR-CAL-06 key', () => {
  const keys: TemplateKey[] = [
    'tx_six_weeks',
    'nine_weeks',
    'trimester',
    'college_term',
    'elementary_year_4',
    'elementary_year_6',
  ];
  for (const key of keys) {
    const cal = buildTemplate(key, { year: YEAR });
    assert.ok(cal.periods.length > 0, key);
    for (const r of cal.rollups) {
      assert.equal(rollupWeightsValid(r.components), true, `${key}:${r.term_id}`);
    }
  }
});

test('legacy nine_weeks code round-trip matches GradeTerm', () => {
  const terms: GradeTerm[] = ['q1', 'q2', 'q3', 'q4', 's1', 's2', 'year'];
  for (const t of terms) {
    assert.equal(legacyToNineWeeksRoundTrip(t), t);
  }
  assert.equal(legacyToNineWeeksCode('q1'), 'Q1');
  assert.equal(nineWeeksCodeToLegacy('Y1'), 'year');
  assert.equal(nineWeeksCodeToLegacy('E1'), null);
});

test('legacyCalendar + legacyGradeTermRollup reproduce GRADE_TERM_ROLLUP exactly', () => {
  const cal = legacyCalendar();
  assert.equal(cal.period_model, 'nine_weeks');
  for (const code of ['Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'Y1']) {
    assert.ok(cal.periods.some((p) => p.code === code), code);
  }
  const copied = legacyGradeTermRollup();
  assert.deepEqual(copied, GRADE_TERM_ROLLUP);
  assert.deepEqual(
    legacyFilterCodes('s1'),
    GRADE_TERM_ROLLUP.s1.map((t) => legacyToNineWeeksCode(t)),
  );
  assert.deepEqual(
    legacyFilterCodes('year'),
    GRADE_TERM_ROLLUP.year.map((t) => legacyToNineWeeksCode(t)),
  );
});

test('periodForDate picks finest marking period; progress is not transcript', () => {
  const cal = nineWeeks({ year: YEAR, progress_checkpoints: true });
  const q1 = cal.periods.find((p) => p.code === 'Q1')!;
  assert.ok(q1.start_date && q1.end_date);
  const hit = periodForDate(cal, q1.start_date!);
  assert.equal(hit?.code, 'Q1');
  assert.equal(hit?.kind, 'marking_period');

  const pr = progressCheckpoints(cal);
  assert.ok(pr.length >= 4);
  assert.ok(pr.every((p) => p.kind === 'progress'));
  const midHit = periodForDate(cal, pr[0]!.start_date!);
  assert.equal(midHit?.kind, 'marking_period');
  assert.equal(periodForDate(cal, '1999-01-01'), null);
});

test('weightsForPreset rejects bad child counts; buildTermRollup falls back to equal mean', () => {
  assert.throws(() => weightsForPreset('2/7+1/7', 2));
  const r = buildTermRollup({ term_id: 'S1', child_period_ids: ['Q1'], preset: '40/40/20' });
  assert.deepEqual(r.components, [{ period_id: 'Q1', weight: 1 }]);
  assert.equal(r.exam.enabled, false);
});

test('unfit rollup preset falls back instead of throwing (25x4 on nine-weeks)', async () => {
  const { nineWeeks } = await import('./templates.ts');
  const { presetsForChildCount, presetFitsChildCount } = await import('./rollups.ts');
  const cal = nineWeeks({ rollup_preset: '25x4' });
  const s1 = cal.rollups.find((r) => r.term_id === 'S1')!;
  const sum = s1.components.reduce((a, c) => a + c.weight, 0);
  assert.ok(Math.abs(sum - 1) < 0.0001);
  assert.equal(presetFitsChildCount('25x4', 2), false);
  assert.ok(!presetsForChildCount(2).includes('25x4'));
  assert.ok(presetsForChildCount(4).includes('25x4'));
  assert.ok(presetsForChildCount(3).includes('2/7+1/7'));
});

test('semester template is two credit terms with 50/50 year rollup', async () => {
  const { semesterOnly, buildTemplate } = await import('./templates.ts');
  const cal = semesterOnly({ year: YEAR });
  assert.equal(cal.period_model, 'semester');
  assert.deepEqual(
    cal.periods.filter((p) => p.kind === 'credit_term').map((p) => p.code),
    ['S1', 'S2'],
  );
  assert.equal(cal.periods.filter((p) => p.kind === 'marking_period').length, 0);
  const y = cal.rollups.find((r) => r.term_id === 'Y1')!;
  assert.equal(rollupWeightsValid(y.components), true);
  assert.equal(buildTemplate('semester').period_model, 'semester');
});
