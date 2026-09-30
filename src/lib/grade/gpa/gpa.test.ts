import assert from 'node:assert/strict';
import test from 'node:test';

import {
  gpa,
  qualityPoints,
  DEFAULT_QUALITY_TABLES,
  DEFAULT_COURSE_LEVELS,
  transferLetterToPct,
  courseLevelPickerOptions,
  computeRowIncludeFlags,
  classRankGpa,
  showClassRankGpaArea,
  defaultGpaProfileSet,
  defaultInclude,
  makeNumericBandTable,
  type GpaProfile,
  type TranscriptRow,
} from './gpa.ts';

const tables = DEFAULT_QUALITY_TABLES;
const std = tables['standard-4']!;
const tx6 = tables['tx-6-numeric']!;

function row(partial: Partial<TranscriptRow> & { id: string }): TranscriptRow {
  return {
    student_id: 's1',
    course_name: partial.course_name ?? partial.id,
    term_code: 'Y1',
    pct: null,
    letter: 'A',
    credits_attempted: 1,
    credits_earned: 1,
    level: 'regular',
    pass_fail: false,
    flags: [],
    ...partial,
  };
}

const uwProfile: GpaProfile = {
  key: 'unweighted',
  table_id: 'standard-4',
  use_level_bonus: false,
  include: {
    pe: true,
    pass_fail: true,
    local_credit: true,
    recovery: true,
    below_passing: 'zero',
  },
  repeat: 'include_both',
};

const wProfile: GpaProfile = {
  ...uwProfile,
  key: 'weighted',
  use_level_bonus: true,
  include: { ...uwProfile.include, pe: false },
};

// tests continue via patch

test('7.8 Unweighted GPA fixture', () => {
  const rows: TranscriptRow[] = [
    row({ id: 'eng', course_name: 'English', letter: 'A', credits_attempted: 1, credits_earned: 1 }),
    row({ id: 'alg', course_name: 'Algebra', letter: 'B', credits_attempted: 1, credits_earned: 1 }),
    row({
      id: 'pe',
      course_name: 'PE',
      letter: 'P',
      credits_attempted: 0.5,
      credits_earned: 0.5,
      pass_fail: true,
    }),
    row({ id: 'art', course_name: 'Art', letter: 'A', credits_attempted: 0.5, credits_earned: 0.5 }),
  ];
  assert.equal(gpa(rows, uwProfile, tables), 3.6);
});

test('7.8b weighted vs unweighted', () => {
  const rows: TranscriptRow[] = [
    row({ id: 'apc', course_name: 'AP Calculus', letter: 'A', level: 'ap', credits_attempted: 1 }),
    row({ id: 'he', course_name: 'Honors English', letter: 'B+', level: 'honors', credits_attempted: 1 }),
    row({ id: 'bio', course_name: 'Biology', letter: 'A-', level: 'regular', credits_attempted: 1 }),
    row({
      id: 'pe',
      course_name: 'PE',
      letter: 'A',
      level: 'regular',
      credits_attempted: 0.5,
      credits_earned: 0.5,
      flags: ['pe'],
    }),
  ];
  const uw = gpa(rows, uwProfile, tables);
  assert.ok(Math.abs(uw - 13 / 3.5) < 1e-9, `uw=${uw}`);
  const w = gpa(rows, wProfile, tables);
  assert.ok(Math.abs(w - 12.5 / 3) < 1e-9, `w=${w}`);
  assert.ok(Math.abs(w - 4.17) < 0.01);
});

test('7.8c AP F is 0 weighted and unweighted; P omits', () => {
  assert.equal(qualityPoints(std, 'ap', { letter: 'F' }, { use_level_bonus: true }), 0);
  assert.equal(qualityPoints(std, 'ap', { letter: 'F' }, { use_level_bonus: false }), 0);
  assert.equal(qualityPoints(std, 'ap', { letter: 'A' }, { use_level_bonus: false }), 4);
  assert.equal(qualityPoints(std, 'ap', { letter: 'A' }, { use_level_bonus: true }), 5);

  const rows = [
    row({ id: 'a', letter: 'A', credits_attempted: 1 }),
    row({
      id: 'pf',
      letter: 'P',
      pass_fail: true,
      credits_attempted: 0.5,
      credits_earned: 0.5,
    }),
  ];
  assert.equal(gpa(rows, uwProfile, tables), 4);
  assert.equal(gpa(rows, wProfile, tables), 4);
});

test('acceptance 8b AP A 4.0/5.0; acceptance 8c credit weight', () => {
  assert.equal(qualityPoints(std, 'ap', { letter: 'A' }, { use_level_bonus: false }), 4.0);
  assert.equal(qualityPoints(std, 'ap', { letter: 'A' }, { use_level_bonus: true }), 5.0);
  const rows = [
    row({ id: 'a', letter: 'A', credits_attempted: 0.5, credits_earned: 0.5 }),
    row({ id: 'b', letter: 'B', credits_attempted: 1, credits_earned: 1 }),
  ];
  assert.ok(Math.abs(gpa(rows, uwProfile, tables) - 5 / 1.5) < 1e-9);
});

test('P/F fail counts 0 in denominator', () => {
  const rows = [
    row({ id: 'a', letter: 'A', credits_attempted: 1 }),
    row({ id: 'pf', letter: 'F', pass_fail: true, credits_attempted: 1, credits_earned: 0 }),
  ];
  assert.equal(gpa(rows, uwProfile, tables), 2);
});

test('transfer letter→pct FR-GPA-08', () => {
  assert.equal(transferLetterToPct('A+'), 98);
  assert.equal(transferLetterToPct('A'), 95);
  assert.equal(transferLetterToPct('F'), 55);
  assert.equal(transferLetterToPct('D-'), 62);
});

test('acceptance 8: cumulative is not mean of term GPAs', () => {
  const rows = [
    row({ id: 't1a', letter: 'A', term_code: 'S1', credits_attempted: 1 }),
    row({ id: 't1b', letter: 'A', term_code: 'S1', credits_attempted: 1 }),
    row({ id: 't2', letter: 'F', term_code: 'S2', credits_attempted: 1, credits_earned: 0 }),
  ];
  const cum = gpa(rows, uwProfile, tables);
  assert.ok(Math.abs(cum - 8 / 3) < 1e-9);
  assert.notEqual(cum, 2);
});

test('DEFAULT_COURSE_LEVELS covers FR-LVL-01 keys including preap + dual_credit', () => {
  const keys = new Set(DEFAULT_COURSE_LEVELS.map((l) => l.key));
  for (const k of [
    'regular', 'honors', 'preap', 'ap', 'ib_hl', 'ib_sl',
    'dual_credit', 'dual', 'onramps', 'modified', 'local',
  ]) {
    assert.ok(keys.has(k), k);
  }
  const picker = courseLevelPickerOptions();
  assert.ok(picker.some((l) => l.key === 'preap'));
  assert.ok(picker.some((l) => l.key === 'dual_credit'));
  assert.ok(!picker.some((l) => l.key === 'dual'));
});

test('numeric_band tx-6 lookups per level', () => {
  assert.equal(qualityPoints(tx6, 'regular', { pct: 98 }, { use_level_bonus: false }), 4.0);
  assert.equal(qualityPoints(tx6, 'regular', { pct: 98 }, { use_level_bonus: true }), 4.0);
  assert.equal(qualityPoints(tx6, 'honors', { pct: 98 }, { use_level_bonus: true }), 5.0);
  assert.equal(qualityPoints(tx6, 'ap', { pct: 98 }, { use_level_bonus: true }), 6.0);
  assert.equal(qualityPoints(tx6, 'ib_hl', { pct: 98 }, { use_level_bonus: true }), 6.0);
  assert.equal(qualityPoints(tx6, 'ib_sl', { pct: 98 }, { use_level_bonus: true }), 5.0);
  assert.equal(qualityPoints(tx6, 'dual_credit', { pct: 98 }, { use_level_bonus: true }), 6.0);
  assert.equal(qualityPoints(tx6, 'onramps', { pct: 98 }, { use_level_bonus: true }), 6.0);
  assert.equal(qualityPoints(tx6, 'regular', { pct: 95 }, { use_level_bonus: true }), 3.8);
  assert.equal(qualityPoints(tx6, 'ap', { pct: 95 }, { use_level_bonus: true }), 5.8);
  assert.equal(qualityPoints(tx6, 'ap', { pct: 55, letter: 'F' }, { use_level_bonus: true }), 0);
});

test('level bonuses via letter_map fallback (preap + dual_credit)', () => {
  assert.equal(qualityPoints(std, 'preap', { letter: 'A' }, { use_level_bonus: true }), 4.5);
  assert.equal(qualityPoints(std, 'dual_credit', { letter: 'A' }, { use_level_bonus: true }), 5.0);
  assert.equal(qualityPoints(std, 'dual', { letter: 'A' }, { use_level_bonus: true }), 5.0);
  assert.equal(qualityPoints(std, 'onramps', { letter: 'B' }, { use_level_bonus: true }), 4.0);
  assert.equal(qualityPoints(std, 'modified', { letter: 'A' }, { use_level_bonus: true }), 3.5);
});

test('include/exclude flags: pe athletics aide local cbe recovery pre9', () => {
  const base = row({ id: 'core', letter: 'A', credits_attempted: 1 });
  const pe = row({ id: 'pe', letter: 'A', flags: ['pe'], credits_attempted: 1 });
  const ath = row({ id: 'ath', letter: 'A', flags: ['athletics'], credits_attempted: 1 });
  const aide = row({ id: 'aide', letter: 'A', flags: ['aide'], credits_attempted: 1 });
  const local = row({ id: 'loc', letter: 'A', level: 'local', flags: ['local'], credits_attempted: 1 });
  const cbe = row({ id: 'cbe', letter: 'A', flags: ['cbe'], credits_attempted: 1 });
  const rec = row({ id: 'rec', letter: 'A', flags: ['recovery'], credits_attempted: 1 });
  const pre9 = row({ id: 'p9', letter: 'A', flags: ['pre9'], credits_attempted: 1 });
  const narrow: GpaProfile = {
    key: 'weighted_5',
    table_id: 'standard-4',
    use_level_bonus: true,
    include: defaultInclude({
      pe: false, athletics: false, aide: false, local_credit: false,
      cbe: false, recovery: false, pre9: false,
    }),
    repeat: 'include_both',
  };
  assert.equal(gpa([base, pe, ath, aide, local, cbe, rec, pre9], narrow, tables), 4);
});

test('repeat rules: include_both replace average forgive_d_f', () => {
  const fail = row({ id: 'alg1', course_name: 'Algebra', course_code: 'ALG1', letter: 'F', pct: 50, credits_attempted: 1, credits_earned: 0 });
  const pass = row({ id: 'alg2', course_name: 'Algebra', course_code: 'ALG1', letter: 'B', pct: 85, credits_attempted: 1, credits_earned: 1 });
  const other = row({ id: 'eng', course_name: 'English', letter: 'A', credits_attempted: 1 });
  assert.ok(Math.abs(gpa([fail, pass, other], { ...uwProfile, repeat: 'include_both' }, tables) - 7 / 3) < 1e-9);
  assert.equal(gpa([fail, pass, other], { ...uwProfile, repeat: 'replace' }, tables), 3.5);
  assert.equal(gpa([fail, pass, other], { ...uwProfile, repeat: 'average' }, tables), 2.75);
  assert.equal(gpa([fail, pass, other], { ...uwProfile, repeat: 'forgive_d_f' }, tables), 3.5);
  const dThenC = [
    row({ id: 'd1', course_name: 'Chem', course_code: 'CHEM', letter: 'D', pct: 72, credits_attempted: 1 }),
    row({ id: 'd2', course_name: 'Chem', course_code: 'CHEM', letter: 'C', pct: 78, credits_attempted: 1 }),
  ];
  assert.equal(gpa(dThenC, { ...uwProfile, repeat: 'forgive_d_f' }, tables), 2);
});

test('rank_6 vs weighted differences', () => {
  const profiles = defaultGpaProfileSet({ mode: 'with_rank', letterTableId: 'standard-4' });
  const rank = profiles.find((p) => p.key === 'rank_6')!;
  const weighted = profiles.find((p) => p.key === 'weighted_5')!;
  assert.equal(rank.table_id, 'tx-6-numeric');
  const rows = [
    row({ id: 'ap', course_name: 'AP Calc', letter: 'A', pct: 98, level: 'ap', credits_attempted: 1 }),
    row({ id: 'pe', course_name: 'PE', letter: 'A', pct: 95, flags: ['pe'], credits_attempted: 0.5 }),
    row({ id: 'cbe', course_name: 'Spanish CBE', letter: 'A', pct: 99, flags: ['cbe'], credits_attempted: 1 }),
  ];
  assert.equal(gpa(rows, weighted, tables), 4.5);
  assert.equal(gpa(rows, rank, tables), 6.0);
  assert.equal(classRankGpa(rows, profiles, tables), 6.0);
});

test('computeRowIncludeFlags from profiles', () => {
  const profiles = defaultGpaProfileSet({ mode: 'with_rank' });
  const uw = profiles.find((p) => p.key === 'unweighted_4')!;
  const w = profiles.find((p) => p.key === 'weighted_5')!;
  const rank = profiles.find((p) => p.key === 'rank_6')!;
  const pe = computeRowIncludeFlags(
    { level: 'regular', pass_fail: false, flags: ['pe'], letter: 'A', credits_earned: 1, pct: 90 },
    { unweighted: uw, weighted: w, rank },
  );
  assert.equal(pe.include_unweighted, true);
  assert.equal(pe.include_weighted, false);
  assert.equal(pe.include_rank, false);
});

test('showClassRankGpaArea gates FR-GPA-07 surfaces', () => {
  assert.equal(showClassRankGpaArea({ school_level: 'elementary' }), false);
  assert.equal(showClassRankGpaArea({ surface: 'parent_phone' }), false);
  assert.equal(showClassRankGpaArea({ school_level: 'high', surface: 'school_view', audience: 'admin' }), true);
  assert.equal(showClassRankGpaArea({ has_rank_profile: false }), false);
});

test('numeric chart → table rows (not +1.0 guess)', () => {
  const t = makeNumericBandTable('custom', [
    { min_pct: 90, max_pct: 100, points_by_level: { regular: 4, ap: 6 } },
    { min_pct: 0, max_pct: 89.9999, points_by_level: { regular: 3, ap: 5 } },
  ]);
  assert.equal(t.method, 'numeric_band');
  assert.equal(t.rows.length, 2);
  assert.equal(qualityPoints(t, 'ap', { pct: 95 }, { use_level_bonus: true }), 6);
});
