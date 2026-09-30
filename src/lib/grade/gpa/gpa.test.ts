import assert from 'node:assert/strict';
import test from 'node:test';

import {
  gpa,
  qualityPoints,
  DEFAULT_QUALITY_TABLES,
  DEFAULT_COURSE_LEVELS,
  transferLetterToPct,
  type GpaProfile,
  type TranscriptRow,
} from './gpa.ts';

const tables = DEFAULT_QUALITY_TABLES;
const std = tables['standard-4']!;

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
  // (4*1 + 3*1 + 4*0.5) / (1+1+0.5) = 3.60
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
  // UW: (4 + 3.3 + 3.7 + 4*0.5) / 3.5 = 13/3.5
  const uw = gpa(rows, uwProfile, tables);
  assert.ok(Math.abs(uw - 13 / 3.5) < 1e-9, `uw=${uw}`);
  // W: PE excluded → (5 + 3.8 + 3.7) / 3 = 4.166...
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

  // 0.5-credit A + 1.0-credit B
  const rows = [
    row({ id: 'a', letter: 'A', credits_attempted: 0.5, credits_earned: 0.5 }),
    row({ id: 'b', letter: 'B', credits_attempted: 1, credits_earned: 1 }),
  ];
  // (4*0.5 + 3*1) / 1.5 = 5/1.5 = 3.333...
  assert.ok(Math.abs(gpa(rows, uwProfile, tables) - 5 / 1.5) < 1e-9);
});

test('P/F fail counts 0 in denominator', () => {
  const rows = [
    row({ id: 'a', letter: 'A', credits_attempted: 1 }),
    row({
      id: 'pf',
      letter: 'F',
      pass_fail: true,
      credits_attempted: 1,
      credits_earned: 0,
    }),
  ];
  // (4*1 + 0*1) / 2 = 2
  assert.equal(gpa(rows, uwProfile, tables), 2);
});

test('transfer letter→pct FR-GPA-08', () => {
  assert.equal(transferLetterToPct('A+'), 98);
  assert.equal(transferLetterToPct('A'), 95);
  assert.equal(transferLetterToPct('F'), 55);
  assert.equal(transferLetterToPct('D-'), 62);
});

test('acceptance 8: cumulative is not mean of term GPAs', () => {
  // term1: A 1cr → 4.0; term2: C 1cr → 2.0; cumulative 3.0 not mean of (4+2)/2 wait that's same
  // use unequal credits: term1 two A's (2cr), term2 one F (1cr)
  // mean of term GPAs = (4 + 0)/2 = 2; cumulative = (8+0)/3 ≈ 2.667
  const rows = [
    row({ id: 't1a', letter: 'A', term_code: 'S1', credits_attempted: 1 }),
    row({ id: 't1b', letter: 'A', term_code: 'S1', credits_attempted: 1 }),
    row({ id: 't2', letter: 'F', term_code: 'S2', credits_attempted: 1, credits_earned: 0 }),
  ];
  const cum = gpa(rows, uwProfile, tables);
  assert.ok(Math.abs(cum - 8 / 3) < 1e-9);
  assert.notEqual(cum, 2);
});

test('DEFAULT_COURSE_LEVELS covers FR-LVL-01 keys', () => {
  const keys = new Set(DEFAULT_COURSE_LEVELS.map((l) => l.key));
  for (const k of ['regular', 'honors', 'ap', 'ib_hl', 'ib_sl', 'dual', 'onramps', 'modified', 'local']) {
    assert.ok(keys.has(k), k);
  }
});
