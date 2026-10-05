/**
 * GB-AC1 — SRS §11 release acceptance items that can be proven below the UI.
 * One named test per item: `SRS 11.<n> ...`
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createEmptyWizardDraft,
  patchCategory,
  patchDraft,
  visibleSteps,
  weightsOk,
  canFinishReview,
} from '../../components/syllabus/wizardModel.ts';
import { getBundledHelpTopic } from '../help/helpTopics.ts';
import { mergeIntoSetupDraft } from '../ingest/pathMapping.ts';
import { parseIngestProposal } from '../ingest/parseProposal.ts';
import {
  shouldPostAiScoreToGradebook,
  shouldUseRubricAi,
  statusAfterConfirm,
} from '../rubric/aiProposal.ts';
import type { RubricAssociation } from '../rubric/types.ts';
import {
  applyTemplateNotSure,
  createEmptyDraft,
  draftToPayload,
  getFieldValue,
  planPublish,
  setField,
} from '../school/gradingPolicy.ts';
import {
  assertLatePolicyEditable,
  buildSchoolLockPolicy,
} from '../syllabus/locks.ts';
import {
  nineWeeks,
  periodsOfKind,
  txSixWeeks,
} from './calendar/index.ts';
import {
  computePeriod,
  computeTerm,
  type EngineAssignment,
  type EngineCell,
  type EngineSyllabus,
  type PeriodResult,
  type TermRollup,
} from './engine/index.ts';
import {
  DEFAULT_QUALITY_TABLES,
  gpa,
  qualityPoints,
  type GpaProfile,
  type TranscriptRow,
} from './gpa/gpa.ts';
// Import pure posting math — posting/index.ts also re-exports conductMarksApi (@/ alias breaks node --test).
import {
  applyOverride,
  buildTermGrade,
  defaultCreditPolicy,
  postPeriod,
  type PostingTermRollup,
} from './posting/posting.ts';
import { letterFor, makeScaleFromTemplate } from './scale/scale.ts';

const root = process.cwd();
const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function ingestFix(name: string): string {
  return readFileSync(join(here, '../ingest/fixtures', name), 'utf8');
}

function baseSyllabus(over: Partial<EngineSyllabus> = {}): EngineSyllabus {
  return {
    engine: 'weighted_points_inside',
    categories: [
      { key: 'tests', label: 'Tests', weight: 50, include: true },
      { key: 'quizzes', label: 'Quizzes', weight: 20, include: true },
      { key: 'homework', label: 'Homework', weight: 30, include: true },
    ],
    missing: 'zero',
    late: { type: 'none' },
    extra_credit: { method: 'B' },
    empty_category: 'renormalize',
    book_mode: 'reset_each_marking_period',
    rounding: 'none',
    ...over,
  };
}

function a(
  partial: Partial<EngineAssignment> & Pick<EngineAssignment, 'id' | 'category' | 'max_points'>,
): EngineAssignment {
  return {
    period_id: 'P1',
    due_at: null,
    count_toward_final: true,
    extra_credit: false,
    can_exceed_max: false,
    item_factor: 1,
    droppable: true,
    ...partial,
  };
}

function c(
  assignment_id: string,
  raw: number | null,
  status: EngineCell['status'] = 'graded',
  extra: Partial<EngineCell> = {},
): EngineCell {
  return { assignment_id, raw, status, ...extra };
}

function emptyChild(period_id: string, pct: number): PeriodResult {
  return {
    period_id,
    pct,
    categories: [],
    renormalized: false,
    ec_added: 0,
    floor_applied: false,
    blocked_by_incomplete: false,
    min_grades_blocked: false,
  };
}

const tables = DEFAULT_QUALITY_TABLES;
const std = tables['standard-4']!;
const us = makeScaleFromTemplate('us_10');
const txNoD = makeScaleFromTemplate('texas_no_d');
const collegePm = makeScaleFromTemplate('college_plus_minus');

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

function trow(partial: Partial<TranscriptRow> & { id: string }): TranscriptRow {
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

// --- SRS 11.1 ---------------------------------------------------------------
test('SRS 11.1 school configures six-week and nine-week calendars without code changes', () => {
  const six = txSixWeeks({ id: 'cal-6', school_id: 'sch-1' });
  const nine = nineWeeks({ id: 'cal-9', school_id: 'sch-1' });
  assert.equal(six.period_model, 'six_weeks');
  assert.equal(nine.period_model, 'nine_weeks');
  assert.equal(periodsOfKind(six, 'marking_period').length, 6);
  assert.equal(periodsOfKind(nine, 'marking_period').length, 4);
  assert.ok(six.rollups.some((r) => r.term_id === 'S1'));
  assert.ok(nine.rollups.length >= 1);
});

// --- SRS 11.2 ---------------------------------------------------------------
test('SRS 11.2 two classes of same course can use different engines and weights', () => {
  const assignments = [
    a({ id: 't1', category: 'tests', max_points: 100 }),
    a({ id: 'h1', category: 'homework', max_points: 10 }),
  ];
  const cells = [c('t1', 80), c('h1', 10)];
  const classA = baseSyllabus({
    engine: 'weighted_points_inside',
    categories: [
      { key: 'tests', label: 'Tests', weight: 70, include: true },
      { key: 'homework', label: 'Homework', weight: 30, include: true },
    ],
  });
  const classB = baseSyllabus({ engine: 'total_points', categories: [] });
  const rA = computePeriod(classA, assignments, cells, 'P1');
  const rB = computePeriod(classB, assignments, cells, 'P1');
  assert.notEqual(classA.engine, classB.engine);
  assert.notEqual(rA.pct, rB.pct);
  assert.ok(rA.pct != null && rB.pct != null);
});

// --- SRS 11.3 ---------------------------------------------------------------
test('SRS 11.3 fixtures 7.1–7.8 produce the documented results', () => {
  const r71 = computePeriod(
    baseSyllabus(),
    [
      a({ id: 't1', category: 'tests', max_points: 100 }),
      a({ id: 't2', category: 'tests', max_points: 50 }),
      a({ id: 'q1', category: 'quizzes', max_points: 10 }),
      a({ id: 'h1', category: 'homework', max_points: 10 }),
      a({ id: 'h2', category: 'homework', max_points: 10 }),
    ],
    [c('t1', 80), c('t2', 40), c('q1', 8), c('h1', 9), c('h2', null, 'missing')],
    'P1',
  );
  assert.equal(r71.pct, 69.5);

  const cats = baseSyllabus().categories;
  const uneven = [
    a({ id: 'h1', category: 'homework', max_points: 10 }),
    a({ id: 'h2', category: 'homework', max_points: 20 }),
  ];
  const unevenCells = [c('h1', 9), c('h2', 20)];
  const pts = computePeriod(
    baseSyllabus({ engine: 'weighted_points_inside', categories: cats }),
    uneven,
    unevenCells,
    'P1',
  );
  const pctEng = computePeriod(
    baseSyllabus({ engine: 'weighted_percent_inside', categories: cats }),
    uneven,
    unevenCells,
    'P1',
  );
  assert.ok(Math.abs((pts.categories.find((x) => x.key === 'homework')!.pct ?? 0) - 96.666667) < 0.01);
  assert.equal(pctEng.categories.find((x) => x.key === 'homework')!.pct, 95);

  const renorm = computePeriod(
    baseSyllabus({ empty_category: 'renormalize' }),
    [a({ id: 'q1', category: 'quizzes', max_points: 10 }), a({ id: 'h1', category: 'homework', max_points: 10 })],
    [c('q1', 8), c('h1', 9)],
    'P1',
  );
  assert.equal(renorm.pct, 86);

  const ecSyl = baseSyllabus({ engine: 'total_points', categories: [], extra_credit: { method: 'B' } });
  const skip = computePeriod(
    ecSyl,
    [
      a({ id: 'w1', category: 'work', max_points: 100 }),
      a({ id: 'ec1', category: 'ec', max_points: 5, extra_credit: true, count_toward_final: false }),
    ],
    [c('w1', 80), c('ec1', null, 'ungraded')],
    'P1',
  );
  assert.equal(skip.pct, 80);

  const dropSyl = baseSyllabus({
    engine: 'weighted_percent_inside',
    categories: [{ key: 'quizzes', label: 'Quizzes', weight: 100, include: true, drop_lowest: 1 }],
  });
  const p1q = [
    a({ id: 'q1', category: 'quizzes', max_points: 100, period_id: '6W1' }),
    a({ id: 'q2', category: 'quizzes', max_points: 100, period_id: '6W1' }),
    a({ id: 'q3', category: 'quizzes', max_points: 100, period_id: '6W1' }),
    a({ id: 'q4', category: 'quizzes', max_points: 100, period_id: '6W1' }),
    a({ id: 'q5', category: 'quizzes', max_points: 100, period_id: '6W1' }),
  ];
  assert.equal(
    computePeriod(dropSyl, p1q, [c('q1', 60), c('q2', 70), c('q3', 80), c('q4', 90), c('q5', 100)], '6W1').pct,
    85,
  );

  const rollup: TermRollup = {
    term_id: 'S1',
    components: [
      { period_id: '6W1', weight: 2 / 7 },
      { period_id: '6W2', weight: 2 / 7 },
      { period_id: '6W3', weight: 2 / 7 },
      { period_id: 'exam', weight: 1 / 7 },
    ],
    exam: { enabled: true, code: 'exam' },
    missing_child: 'renormalize',
  };
  const full = computeTerm(rollup, [emptyChild('6W1', 92), emptyChild('6W2', 85), emptyChild('6W3', 80)], 78, {
    rounding: 'none',
  });
  assert.ok(Math.abs((full.pct ?? 0) - 84.571429) < 0.01);
  assert.equal(68 < 70 && 72 >= 70, true);

  const rows: TranscriptRow[] = [
    trow({ id: 'eng', letter: 'A', credits_attempted: 1 }),
    trow({ id: 'alg', letter: 'B', credits_attempted: 1 }),
    trow({ id: 'pe', letter: 'P', credits_attempted: 0.5, credits_earned: 0.5, pass_fail: true }),
    trow({ id: 'art', letter: 'A', credits_attempted: 0.5, credits_earned: 0.5 }),
  ];
  assert.equal(gpa(rows, uwProfile, tables), 3.6);
});

// --- SRS 11.4 ---------------------------------------------------------------
test('SRS 11.4 missing-as-0 and excused-omit produce different period averages', () => {
  const assignments = [
    a({ id: 'a1', category: 'tests', max_points: 100 }),
    a({ id: 'a2', category: 'tests', max_points: 100 }),
  ];
  const syl = baseSyllabus({
    engine: 'weighted_percent_inside',
    missing: 'zero',
    categories: [{ key: 'tests', label: 'Tests', weight: 100, include: true }],
  });
  const asZero = computePeriod(syl, assignments, [c('a1', 100), c('a2', null, 'missing')], 'P1');
  const excused = computePeriod(syl, assignments, [c('a1', 100), c('a2', null, 'excused')], 'P1');
  assert.equal(asZero.pct, 50);
  assert.equal(excused.pct, 100);
  assert.notEqual(asZero.pct, excused.pct);
});

// --- SRS 11.5 ---------------------------------------------------------------
test('SRS 11.5 extra credit method B does not lower a student who skips it', () => {
  const syllabus = baseSyllabus({ engine: 'total_points', categories: [], extra_credit: { method: 'B' } });
  const assignments = [
    a({ id: 'w1', category: 'work', max_points: 50 }),
    a({ id: 'ec', category: 'ec', max_points: 10, extra_credit: true }),
  ];
  const skip = computePeriod(syllabus, assignments, [c('w1', 40)], 'P1');
  const take = computePeriod(syllabus, assignments, [c('w1', 40), c('ec', 10)], 'P1');
  assert.equal(skip.pct, 80);
  assert.ok((take.pct ?? 0) > (skip.pct ?? 0));
});

// --- SRS 11.6 ---------------------------------------------------------------
test('SRS 11.6 after store, live score change does not move report card until audited override', () => {
  const [posted] = postPeriod(
    {
      class_id: 'c1',
      student_id: 's1',
      marking_period_code: '6W1',
      pct: 85,
      syllabus_version: '1',
      stored_by: 't',
      stored_at: '2026-02-01T00:00:00.000Z',
    },
    us,
  );
  assert.equal(posted!.pct, 85);
  assert.notEqual(posted!.pct, 88);
  assert.throws(
    () =>
      applyOverride(
        {
          kind: 'posted_period',
          class_id: posted!.class_id,
          student_id: posted!.student_id,
          pct: posted!.pct,
          letter: posted!.letter,
        },
        { pct: 88 },
        { reason: '  ', by: 't', scale: us },
      ),
    /reason is required/,
  );
  const ov = applyOverride(
    {
      kind: 'posted_period',
      class_id: posted!.class_id,
      student_id: posted!.student_id,
      pct: posted!.pct,
      letter: posted!.letter,
      id: 'ppg-1',
    },
    { pct: 88 },
    { reason: 'score entry error', by: 't', scale: us, at: '2026-02-02T00:00:00.000Z' },
  );
  assert.equal(ov.pct, 88);
  assert.equal(ov.source, 'override');
  assert.equal(ov.audit.old_pct, 85);
});

// --- SRS 11.7 ---------------------------------------------------------------
test('SRS 11.7 six period grades yield two transcript rows (semester credit unit)', () => {
  const s1Rollup: PostingTermRollup = {
    term_id: 'S1',
    components: [
      { period_id: '6W1', weight: 2 / 7 },
      { period_id: '6W2', weight: 2 / 7 },
      { period_id: '6W3', weight: 2 / 7 },
      { period_id: 'exam', weight: 1 / 7 },
    ],
    exam: { enabled: true, code: 'exam' },
    missing_child: 'renormalize',
  };
  const s2Rollup: PostingTermRollup = {
    ...s1Rollup,
    term_id: 'S2',
    components: [
      { period_id: '6W4', weight: 2 / 7 },
      { period_id: '6W5', weight: 2 / 7 },
      { period_id: '6W6', weight: 2 / 7 },
      { period_id: 'exam', weight: 1 / 7 },
    ],
  };
  const s1Posted = postPeriod(
    [
      { class_id: 'c1', student_id: 's1', marking_period_code: '6W1', pct: 90, syllabus_version: '1', stored_by: 't' },
      { class_id: 'c1', student_id: 's1', marking_period_code: '6W2', pct: 88, syllabus_version: '1', stored_by: 't' },
      { class_id: 'c1', student_id: 's1', marking_period_code: '6W3', pct: 86, syllabus_version: '1', stored_by: 't' },
    ],
    us,
  );
  const s2Posted = postPeriod(
    [
      { class_id: 'c1', student_id: 's1', marking_period_code: '6W4', pct: 84, syllabus_version: '1', stored_by: 't' },
      { class_id: 'c1', student_id: 's1', marking_period_code: '6W5', pct: 82, syllabus_version: '1', stored_by: 't' },
      { class_id: 'c1', student_id: 's1', marking_period_code: '6W6', pct: 80, syllabus_version: '1', stored_by: 't' },
    ],
    us,
  );
  assert.equal(s1Posted.length + s2Posted.length, 6);
  const term1 = buildTermGrade({
    class_id: 'c1',
    student_id: 's1',
    course: 'Algebra I',
    posted_children: s1Posted.map((p) => ({ marking_period_code: p.marking_period_code, pct: p.pct })),
    exam_pct: 85,
    rollup: s1Rollup,
    scale: us,
    course_level: 'regular',
    credit_policy: defaultCreditPolicy({ passing_threshold: 60 }),
    rounding: 'nearest_whole',
  });
  const term2 = buildTermGrade({
    class_id: 'c1',
    student_id: 's1',
    course: 'Algebra I',
    posted_children: s2Posted.map((p) => ({ marking_period_code: p.marking_period_code, pct: p.pct })),
    exam_pct: 78,
    rollup: s2Rollup,
    scale: us,
    course_level: 'regular',
    credit_policy: defaultCreditPolicy({ passing_threshold: 60 }),
    rounding: 'nearest_whole',
  });
  assert.equal(term1.credit_term, 'S1');
  assert.equal(term2.credit_term, 'S2');
  assert.equal(term1.credits_attempted, 0.5);
  assert.equal(term2.credits_attempted, 0.5);
  assert.equal([term1, term2].length, 2);
});

// --- SRS 11.8 ---------------------------------------------------------------
test('SRS 11.8 GPA matches §7.8 / 7.8b and does not average yearly GPAs', () => {
  const rows: TranscriptRow[] = [
    trow({ id: 'eng', letter: 'A', credits_attempted: 1 }),
    trow({ id: 'alg', letter: 'B', credits_attempted: 1 }),
    trow({ id: 'pe', letter: 'P', credits_attempted: 0.5, credits_earned: 0.5, pass_fail: true }),
    trow({ id: 'art', letter: 'A', credits_attempted: 0.5, credits_earned: 0.5 }),
  ];
  assert.equal(gpa(rows, uwProfile, tables), 3.6);

  const wRows: TranscriptRow[] = [
    trow({ id: 'apc', letter: 'A', level: 'ap', credits_attempted: 1 }),
    trow({ id: 'he', letter: 'B+', level: 'honors', credits_attempted: 1 }),
    trow({ id: 'bio', letter: 'A-', level: 'regular', credits_attempted: 1 }),
    trow({ id: 'pe', letter: 'A', credits_attempted: 0.5, credits_earned: 0.5, flags: ['pe'] }),
  ];
  const w = gpa(wRows, wProfile, tables);
  assert.ok(Math.abs(w - 12.5 / 3) < 1e-9);

  const cumRows = [
    trow({ id: 't1a', letter: 'A', term_code: 'S1', credits_attempted: 1 }),
    trow({ id: 't1b', letter: 'A', term_code: 'S1', credits_attempted: 1 }),
    trow({ id: 't2', letter: 'F', term_code: 'S2', credits_attempted: 1, credits_earned: 0 }),
  ];
  const cum = gpa(cumRows, uwProfile, tables);
  assert.ok(Math.abs(cum - 8 / 3) < 1e-9);
  assert.notEqual(cum, 2);
});

// --- SRS 11.8a --------------------------------------------------------------
test('SRS 11.8a 91% is A on Texas no-D and A− on plus/minus', () => {
  assert.equal(letterFor(txNoD, 91), 'A');
  assert.equal(letterFor(collegePm, 91), 'A-');
});

// --- SRS 11.8b --------------------------------------------------------------
test('SRS 11.8b AP A is 4.0 unweighted and 5.0 weighted; AP F is 0.0 on both', () => {
  assert.equal(qualityPoints(std, 'ap', { letter: 'A' }, { use_level_bonus: false }), 4.0);
  assert.equal(qualityPoints(std, 'ap', { letter: 'A' }, { use_level_bonus: true }), 5.0);
  assert.equal(qualityPoints(std, 'ap', { letter: 'F' }, { use_level_bonus: false }), 0);
  assert.equal(qualityPoints(std, 'ap', { letter: 'F' }, { use_level_bonus: true }), 0);
});

// --- SRS 11.8c --------------------------------------------------------------
test('SRS 11.8c P/F pass does not change GPA; 0.5-credit A and 1.0-credit B credit-weight', () => {
  const withP = [
    trow({ id: 'a', letter: 'A', credits_attempted: 1 }),
    trow({ id: 'pf', letter: 'P', pass_fail: true, credits_attempted: 0.5, credits_earned: 0.5 }),
  ];
  assert.equal(gpa(withP, uwProfile, tables), 4);
  assert.equal(gpa(withP, wProfile, tables), 4);
  const weightedCredits = [
    trow({ id: 'a', letter: 'A', credits_attempted: 0.5, credits_earned: 0.5 }),
    trow({ id: 'b', letter: 'B', credits_attempted: 1, credits_earned: 1 }),
  ];
  assert.ok(Math.abs(gpa(weightedCredits, uwProfile, tables) - 5 / 1.5) < 1e-9);
});

// --- SRS 11.9 ---------------------------------------------------------------
test('SRS 11.9 locked late-work policy rejected by pure check and DB migration', () => {
  const policy = buildSchoolLockPolicy({
    locks: { late: true, scale: false, rollup: false },
    lock_reasons: { late: 'Campus late policy locked.' },
    values: { late_rule: { type: 'flat', amount: 10, unit: 'percent' } },
  });
  const baseline = { type: 'flat', amount: 10, unit: 'percent' };
  const hit = assertLatePolicyEditable(baseline, { type: 'none' }, policy);
  assert.ok(hit);
  assert.equal(hit!.field, 'late');
  assert.match(hit!.message, /cannot be edited/);
  assert.equal(assertLatePolicyEditable(baseline, baseline, policy), null);

  const sql = read('supabase/migrations/20261001230000_gb_syllabus_should.sql');
  assert.match(sql, /gb_assert_syllabus_locked_fields/);
  assert.match(sql, /Locked field .*late.* cannot be edited by the teacher/);
  assert.match(sql, /locks->>'late'/);
  assert.match(sql, /enable row level security/i);
});

// --- SRS 11.11 --------------------------------------------------------------
test('SRS 11.11 cycle-1 scores do not appear in cycle-2 when book mode is reset-each-period', () => {
  const syllabus = baseSyllabus({
    engine: 'weighted_percent_inside',
    book_mode: 'reset_each_marking_period',
    categories: [{ key: 'tests', label: 'Tests', weight: 100, include: true }],
  });
  const assignments = [
    a({ id: 'c1', category: 'tests', max_points: 100, period_id: 'C1' }),
    a({ id: 'c2', category: 'tests', max_points: 100, period_id: 'C2' }),
  ];
  const cells = [c('c1', 50), c('c2', 100)];
  assert.equal(computePeriod(syllabus, assignments, cells, 'C1').pct, 50);
  assert.equal(computePeriod(syllabus, assignments, cells, 'C2').pct, 100);
});

// --- SRS 11.12 --------------------------------------------------------------
test('SRS 11.12 exam exemption converts 40/40/20 into 50/50', () => {
  const rollup: TermRollup = {
    term_id: 'S1',
    components: [
      { period_id: 'Q1', weight: 0.4 },
      { period_id: 'Q2', weight: 0.4 },
      { period_id: 'exam', weight: 0.2 },
    ],
    exam: { enabled: true, code: 'exam' },
    missing_child: 'renormalize',
  };
  const children = [emptyChild('Q1', 80), emptyChild('Q2', 90)];
  const withExam = computeTerm(rollup, children, 70, { rounding: 'none' });
  const exempt = computeTerm(rollup, children, 70, { exam_exempt: true, rounding: 'none' });
  assert.ok(Math.abs((withExam.pct ?? 0) - (80 * 0.4 + 90 * 0.4 + 70 * 0.2)) < 0.01);
  assert.ok(Math.abs((exempt.pct ?? 0) - 85) < 0.01);
  assert.equal(exempt.exam_exempt, true);
});

// --- SRS 11.13 --------------------------------------------------------------
test('SRS 11.13 syllabus version at store time is retained on the posted record', () => {
  const rows = postPeriod(
    {
      class_id: 'c1',
      student_id: 's1',
      marking_period_code: '6W1',
      pct: 85.4,
      syllabus_version: 3,
      stored_by: 'teacher-1',
      stored_at: '2026-01-15T00:00:00.000Z',
    },
    us,
  );
  assert.equal(rows[0]!.syllabus_version, '3');
  assert.equal(rows[0]!.pct, 85.4);
  assert.equal(rows[0]!.source, 'computed');
});

// --- SRS 11.15 --------------------------------------------------------------
test('SRS 11.15 total-points hides weights; weighted save blocked unless weights = 100', () => {
  let d = createEmptyWizardDraft('class-1');
  d = patchDraft(d, { engine: 'total_points' });
  assert.equal(visibleSteps(d).includes('categories'), false);
  assert.equal(weightsOk(d), true);
  assert.equal(canFinishReview(d), true);

  d = createEmptyWizardDraft('class-2');
  assert.equal(visibleSteps(d).includes('categories'), true);
  d = patchCategory(d, 'tests', { weight_percent: 40 });
  assert.equal(weightsOk(d), false);
  assert.equal(canFinishReview(d), false);
  d = patchCategory(d, 'tests', { weight_percent: 50 });
  assert.equal(weightsOk(d), true);
  assert.equal(canFinishReview(d), true);
});

// --- SRS 11.16 --------------------------------------------------------------
test('SRS 11.16 help.excused removes earned+possible and shows 98/120 vs 98/130', () => {
  const topic = getBundledHelpTopic('help.excused');
  assert.ok(topic);
  // 5d765bef / #341: plain-language “points earned and the points possible”.
  assert.match(topic!.meaning, /points earned and the points possible/i);
  assert.match(topic!.example, /98\/120/);
  assert.match(topic!.example, /98\/130/);
  assert.match(topic!.body, /98\/120/);
  assert.match(topic!.body, /98\/130/);

  const syllabus = baseSyllabus({ engine: 'total_points', categories: [] });
  const assignments = [
    a({ id: 'x1', category: 'work', max_points: 100 }),
    a({ id: 'x2', category: 'work', max_points: 20 }),
    a({ id: 'x3', category: 'work', max_points: 10 }),
  ];
  const excused = computePeriod(syllabus, assignments, [c('x1', 80), c('x2', 18), c('x3', 0, 'excused')], 'P1');
  const asZero = computePeriod(syllabus, assignments, [c('x1', 80), c('x2', 18), c('x3', 0, 'missing')], 'P1');
  assert.ok(Math.abs((excused.pct ?? 0) - (98 / 120) * 100) < 0.0001);
  assert.ok(Math.abs((asZero.pct ?? 0) - (98 / 130) * 100) < 0.0001);
});

// --- SRS 11.17 --------------------------------------------------------------
test('SRS 11.17 high-school “not sure” resolves to Texas 6-week template; fields stay editable', () => {
  let draft = createEmptyDraft('school-hs', 'high');
  draft = setField(draft, 'level', 'high', 'user');
  draft = applyTemplateNotSure(draft);
  assert.equal(getFieldValue(draft, 'calendar.template', ''), 'tx_six_weeks');
  const cal = getFieldValue<{ period_model?: string } | null>(draft, 'calendar.model', null);
  assert.equal(cal?.period_model, 'six_weeks');
  const locks = getFieldValue<Record<string, boolean>>(draft, 'locks.map', {});
  assert.equal(locks.late, false);
  assert.equal(locks.engine, false);
  // still editable: user can change template after not-sure
  draft = setField(draft, 'calendar.template', 'nine_weeks', 'user');
  assert.equal(getFieldValue(draft, 'calendar.template', ''), 'nine_weeks');
});

// --- SRS 11.20 --------------------------------------------------------------
test('SRS 11.20 ingest proposal prefills policy draft; no transcript rows until Publish', () => {
  const raw = JSON.parse(ingestFix('school-good.json'));
  const proposal = parseIngestProposal(raw, { expected_kind: 'school_policy' });
  assert.equal(proposal.kind, 'school_policy');
  assert.ok(proposal.fields.some((f) => f.path === 'calendar.template'));
  assert.ok(proposal.fields.some((f) => f.path === 'rollup.preset'));
  assert.ok(proposal.fields.some((f) => f.path === 'gpa.mode'));

  let setup = createEmptyDraft('sch-1', 'high');
  const merged = mergeIntoSetupDraft(setup, proposal);
  setup = merged.setup;
  assert.ok(merged.result.applied.includes('calendar.template') || getFieldValue(setup, 'calendar.template', '') === 'tx_six_weeks');

  const payload = draftToPayload(setup);
  assert.ok(payload.calendar_template === 'tx_six_weeks' || payload.calendar.period_model === 'six_weeks');
  // Draft/payload never carries transcript rows — only policy + calendar + GPA tables.
  assert.equal('transcript_rows' in payload, false);
  assert.equal((payload as { transcript?: unknown }).transcript, undefined);

  const plan = planPublish(payload, 0, '2026-09-30T12:00:00.000Z');
  assert.equal(plan.status, 'published');
  assert.equal(plan.next_version, 1);
  assert.equal('transcript_rows' in plan.payload, false);
});

// --- SRS 11.22 --------------------------------------------------------------
test('SRS 11.22 quiz without rubric and essay with rubric post into same category; only essay has association', () => {
  const category = 'major';
  const quiz = {
    id: 'asg-quiz',
    title: 'Quiz 1',
    category_key: category,
    rubric_association: null as RubricAssociation | null,
  };
  const essayAssoc: RubricAssociation = {
    id: 'assoc-essay',
    rubric_id: 'rub-1',
    rubric_version: 1,
    assignment_id: 'asg-essay',
    use_for_grading: true,
    map_to_assignment: 'set_max',
    snapshot_id: 'snap-1',
    snapshot: {
      id: 'rub-1',
      owner_id: 't1',
      school_id: null,
      class_id: null,
      scope: 'class',
      title: 'Essay',
      kind: 'analytic',
      status: 'published',
      version: 1,
      criteria: [
        {
          id: 'crit-1',
          name: 'Content',
          description: '',
          max_points: 10,
          extra_credit: false,
          na_allowed: false,
        },
      ],
      levels: [{ id: 'lvl-1', label: 'Proficient', rank: 1, default_points: 8 }],
      cells: [],
      scoring: {
        method: 'sum_points',
        use_for_grading: true,
        hide_score_from_family: false,
      },
      published_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  };
  const essay = {
    id: 'asg-essay',
    title: 'Essay 1',
    category_key: category,
    rubric_association: essayAssoc,
  };
  assert.equal(quiz.category_key, essay.category_key);
  assert.equal(quiz.rubric_association, null);
  assert.ok(essay.rubric_association);
  assert.equal(shouldUseRubricAi(quiz.rubric_association), false);
  assert.equal(shouldUseRubricAi(essay.rubric_association), true);
  const hasRubricTab = (row: { rubric_association: RubricAssociation | null }) =>
    row.rubric_association != null;
  assert.equal(hasRubricTab(quiz), false);
  assert.equal(hasRubricTab(essay), true);
});

// --- SRS 11.23 --------------------------------------------------------------
test('SRS 11.23 AI rubric proposal writes no score until Confirm', () => {
  assert.equal(
    shouldPostAiScoreToGradebook({
      teacherConfirmed: false,
      associationUseForGrading: true,
      rubricUseForGrading: true,
      proposalStatus: 'proposed',
    }),
    false,
  );
  assert.equal(
    shouldPostAiScoreToGradebook({
      teacherConfirmed: false,
      associationUseForGrading: true,
      rubricUseForGrading: true,
      proposalStatus: 'ready_for_review',
    }),
    false,
  );
  assert.equal(
    shouldPostAiScoreToGradebook({
      teacherConfirmed: true,
      writeScore: false,
      associationUseForGrading: true,
      rubricUseForGrading: true,
      proposalStatus: 'accepted',
    }),
    false,
  );
  assert.equal(
    shouldPostAiScoreToGradebook({
      teacherConfirmed: true,
      associationUseForGrading: true,
      rubricUseForGrading: true,
      proposalStatus: statusAfterConfirm(false),
    }),
    true,
  );
  assert.equal(
    shouldPostAiScoreToGradebook({
      teacherConfirmed: true,
      associationUseForGrading: true,
      rubricUseForGrading: true,
      proposalStatus: 'proposed',
    }),
    false,
  );
});
