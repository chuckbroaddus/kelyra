import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_QUALITY_TABLES,
  type GpaProfile,
} from '../gpa/gpa.ts';
import { makeScaleFromTemplate } from '../scale/scale.ts';
import {
  applyOverride,
  applyYearLinkCredit,
  buildEligibilitySnapshot,
  buildReportCardLines,
  buildTermGrade,
  buildTransferInPeriod,
  buildTransferInTerm,
  convertTransferLetter,
  defaultCreditPolicy,
  DEFAULT_TRANSFER_LETTER_TO_PCT,
  gpaFromTermGrades,
  postPeriod,
  setTermRowFlags,
  yearCreditEarned,
  type PostedPeriodGrade,
  type PostingTermRollup,
  type TermGrade,
} from './posting.ts';

const us = makeScaleFromTemplate('us_10');
const tx = makeScaleFromTemplate('texas_no_d');

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

function tg(partial: Partial<TermGrade> & Pick<TermGrade, 'course' | 'letter'>): TermGrade {
  return {
    class_id: 'c1',
    student_id: 's1',
    credit_term: 'Y1',
    course_level: 'regular',
    pct: null,
    credits_attempted: 1,
    credits_earned: 1,
    quality_points: 0,
    repeat: false,
    flags: [],
    ...partial,
  };
}

test('postPeriod freezes pct+letter+syllabus_version (AC13)', () => {
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
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.pct, 85.4);
  assert.equal(rows[0]!.letter, 'B'); // nearest whole 85
  assert.equal(rows[0]!.syllabus_version, '3');
  assert.equal(rows[0]!.source, 'computed');
  assert.equal(rows[0]!.stored_by, 'teacher-1');
});

test('SRS 7.6 six-weeks → semester through posting rows', () => {
  const posted = postPeriod(
    [
      { class_id: 'c1', student_id: 's1', marking_period_code: '6W1', pct: 92, syllabus_version: '1', stored_by: 't' },
      { class_id: 'c1', student_id: 's1', marking_period_code: '6W2', pct: 85, syllabus_version: '1', stored_by: 't' },
      { class_id: 'c1', student_id: 's1', marking_period_code: '6W3', pct: 80, syllabus_version: '1', stored_by: 't' },
    ],
    us,
  );
  // Live layer later changes do not affect these stored rows
  const liveLater = 88;
  assert.notEqual(posted[0]!.pct, liveLater);

  const term = buildTermGrade({
    class_id: 'c1',
    student_id: 's1',
    course: 'Algebra I',
    posted_children: posted.map((p) => ({
      marking_period_code: p.marking_period_code,
      pct: p.pct,
    })),
    exam_pct: 78,
    rollup: s1Rollup,
    scale: us,
    course_level: 'regular',
    credit_policy: defaultCreditPolicy({ passing_threshold: 60 }),
    rounding: 'nearest_whole',
  });
  // 92*2/7 + 85*2/7 + 80*2/7 + 78*1/7 = 84.57 → 85
  assert.equal(term.pct, 85);
  assert.equal(term.letter, 'B');
  assert.equal(term.credit_term, 'S1');
  assert.equal(term.credits_attempted, 0.5);
  assert.equal(term.credits_earned, 0.5);

  const exempt = buildTermGrade({
    class_id: 'c1',
    student_id: 's1',
    course: 'Algebra I',
    posted_children: posted.map((p) => ({
      marking_period_code: p.marking_period_code,
      pct: p.pct,
    })),
    exam_pct: 78,
    exam_exempt: true,
    rollup: s1Rollup,
    scale: us,
    course_level: 'regular',
    credit_policy: defaultCreditPolicy({ passing_threshold: 60 }),
    rounding: 'none',
  });
  assert.ok(Math.abs((exempt.pct ?? 0) - 85.666667) < 0.01);
  assert.equal(exempt.exam_exempt, true);
  assert.ok((exempt.flags ?? []).includes('exam_exempt'));
});

test('AC6 after store live change does not move posted until override', () => {
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
  const frozen = posted!.pct;
  const live = 88;
  assert.equal(frozen, 85);
  assert.notEqual(frozen, live);

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
  assert.equal(ov.letter, 'B');
  assert.equal(ov.source, 'override');
  assert.equal(ov.audit.old_pct, 85);
  assert.equal(ov.audit.new_pct, 88);
  assert.equal(ov.audit.reason, 'score entry error');
  assert.equal(ov.audit.by, 't');
});

test('repost keeps prior values as audit trail shape', () => {
  const original: PostedPeriodGrade = {
    class_id: 'c1',
    student_id: 's1',
    marking_period_code: '6W1',
    pct: 85,
    letter: 'B',
    syllabus_version: '1',
    stored_at: '2026-02-01T00:00:00.000Z',
    stored_by: 't',
    source: 'computed',
    id: 'row-1',
  };
  const first = applyOverride(
    {
      kind: 'posted_period',
      class_id: original.class_id,
      student_id: original.student_id,
      pct: original.pct,
      letter: original.letter,
      id: original.id,
    },
    { pct: 90 },
    { reason: 'regrade', by: 't', scale: us },
  );
  const second = applyOverride(
    {
      kind: 'posted_period',
      class_id: original.class_id,
      student_id: original.student_id,
      pct: first.pct,
      letter: first.letter,
      id: original.id,
    },
    { pct: 92 },
    { reason: 'second correction', by: 't', scale: us },
  );
  assert.equal(first.audit.old_pct, 85);
  assert.equal(second.audit.old_pct, 90);
  assert.equal(second.audit.new_pct, 92);
  assert.equal(second.audit.reason, 'second correction');
});

test('SRS 7.7 year-link credit on semester transcript rows', () => {
  const policy = defaultCreditPolicy({
    passing_threshold: 70,
    year_link: { enabled: true, min_year_average: 70 },
  });
  // S1 fails alone, S2 passes; mean = 70
  const s1: TermGrade = {
    class_id: 'c1',
    student_id: 's1',
    course: 'Biology',
    credit_term: 'S1',
    pct: 68,
    letter: 'F',
    credits_attempted: 0.5,
    credits_earned: 0, // failed alone
    course_level: 'regular',
    quality_points: 0,
    repeat: false,
    flags: [],
  };
  const s2: TermGrade = {
    ...s1,
    credit_term: 'S2',
    pct: 72,
    letter: 'C',
    credits_earned: 0.5,
  };
  const linked = applyYearLinkCredit([s1, s2], policy);
  assert.equal(linked.length, 2);
  assert.equal(linked[0]!.pct, 68);
  assert.equal(linked[1]!.pct, 72);
  assert.equal(linked[0]!.credits_earned, 0.5);
  assert.equal(linked[1]!.credits_earned, 0.5);
  assert.ok((linked[0]!.flags ?? []).includes('year_link'));
  // total year credit 1.0
  assert.equal(
    linked.reduce((s, r) => s + r.credits_earned, 0),
    1.0,
  );

  const off = applyYearLinkCredit(
    [s1, s2],
    defaultCreditPolicy({ year_link: { enabled: false } }),
  );
  assert.equal(off[0]!.credits_earned, 0);
  assert.equal(off[1]!.credits_earned, 0.5);
});

test('AC7 six period grades → two transcript rows (semester unit)', () => {
  const periods = ['6W1', '6W2', '6W3', '6W4', '6W5', '6W6'];
  const posted = postPeriod(
    periods.map((code, i) => ({
      class_id: 'c1',
      student_id: 's1',
      marking_period_code: code,
      pct: 80 + i,
      syllabus_version: '1',
      stored_by: 't',
    })),
    tx,
  );
  assert.equal(posted.length, 6);

  const s1 = buildTermGrade({
    class_id: 'c1',
    student_id: 's1',
    course: 'English I',
    posted_children: posted.slice(0, 3).map((p) => ({
      marking_period_code: p.marking_period_code,
      pct: p.pct,
    })),
    exam_pct: 80,
    rollup: s1Rollup,
    scale: tx,
    course_level: 'regular',
    credit_policy: defaultCreditPolicy({ passing_threshold: 70 }),
  });
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
  const s2 = buildTermGrade({
    class_id: 'c1',
    student_id: 's1',
    course: 'English I',
    posted_children: posted.slice(3, 6).map((p) => ({
      marking_period_code: p.marking_period_code,
      pct: p.pct,
    })),
    exam_pct: 82,
    rollup: s2Rollup,
    scale: tx,
    course_level: 'regular',
    credit_policy: defaultCreditPolicy({ passing_threshold: 70 }),
  });
  const transcript = [s1, s2];
  assert.equal(transcript.length, 2);
  assert.equal(transcript[0]!.credit_term, 'S1');
  assert.equal(transcript[1]!.credit_term, 'S2');
});

test('SRS 7.8 / 7.8b gpaFromTermGrades matches fixtures (AC8)', () => {
  const tables = DEFAULT_QUALITY_TABLES;
  const rows: TermGrade[] = [
    tg({ course: 'English', letter: 'A', credits_attempted: 1, credits_earned: 1 }),
    tg({ course: 'Algebra', letter: 'B', credits_attempted: 1, credits_earned: 1 }),
    tg({
      course: 'PE',
      letter: 'P',
      credits_attempted: 0.5,
      credits_earned: 0.5,
      flags: ['pf'],
    }),
    tg({ course: 'Art', letter: 'A', credits_attempted: 0.5, credits_earned: 0.5 }),
  ];
  assert.equal(gpaFromTermGrades(rows, uwProfile, tables), 3.6);

  const wRows: TermGrade[] = [
    tg({
      course: 'AP Calculus',
      letter: 'A',
      course_level: 'ap',
      credits_attempted: 1,
      credits_earned: 1,
    }),
    tg({
      course: 'Honors English',
      letter: 'B+',
      course_level: 'honors',
      credits_attempted: 1,
      credits_earned: 1,
    }),
    tg({
      course: 'Biology',
      letter: 'A-',
      course_level: 'regular',
      credits_attempted: 1,
      credits_earned: 1,
    }),
    tg({
      course: 'PE',
      letter: 'A',
      credits_attempted: 0.5,
      credits_earned: 0.5,
      flags: ['pe'],
    }),
  ];
  const uw = gpaFromTermGrades(wRows, uwProfile, tables);
  assert.ok(Math.abs(uw - 13 / 3.5) < 1e-9, `uw=${uw}`);
  const w = gpaFromTermGrades(wRows, wProfile, tables);
  assert.ok(Math.abs(w - 12.5 / 3) < 1e-9, `w=${w}`);
});

test('failing term earns 0 credit below threshold', () => {
  const term = buildTermGrade({
    class_id: 'c1',
    student_id: 's1',
    course: 'Chem',
    posted_children: [{ marking_period_code: 'Q1', pct: 55 }],
    rollup: {
      term_id: 'S1',
      components: [{ period_id: 'Q1', weight: 1 }],
      exam: { enabled: false, code: 'exam' },
      missing_child: 'renormalize',
    },
    scale: tx,
    course_level: 'regular',
    credit_policy: defaultCreditPolicy({ passing_threshold: 70 }),
  });
  assert.equal(term.pct, 55);
  assert.equal(term.credits_attempted, 0.5);
  assert.equal(term.credits_earned, 0);
});

test('FR-GPA-08 default transfer letter map', () => {
  assert.equal(convertTransferLetter('A+'), 98);
  assert.equal(convertTransferLetter('A'), 95);
  assert.equal(convertTransferLetter('B-'), 82);
  assert.equal(convertTransferLetter('F'), 55);
  assert.equal(DEFAULT_TRANSFER_LETTER_TO_PCT['C+'], 78);
  // school override map
  assert.equal(convertTransferLetter('B', { B: 84, F: 50 }), 84);
});

test('transfer-in period + term rows carry transfer flag and audit', () => {
  const period = buildTransferInPeriod({
    class_id: 'c1',
    student_id: 's1',
    marking_period_code: '6W1',
    letter: 'B+',
    scale: us,
    stored_by: 'counselor-1',
    stored_at: '2026-03-01T00:00:00.000Z',
    reason: 'transfer from Spring ISD',
  });
  assert.equal(period.row.pct, 88);
  assert.equal(period.row.letter, 'B+');
  assert.equal(period.row.source, 'transfer');
  assert.ok((period.row.flags ?? []).includes('transfer'));
  assert.equal(period.audit.reason, 'transfer from Spring ISD');
  assert.equal(period.audit.old_pct, null);

  const term = buildTransferInTerm({
    class_id: 'c1',
    student_id: 's1',
    course: 'Algebra I',
    course_code: 'ALG1',
    credit_term: 'S1',
    letter: 'A-',
    scale: us,
    credit_policy: defaultCreditPolicy({ passing_threshold: 60 }),
    stored_by: 'counselor-1',
  });
  assert.equal(term.row.pct, 92);
  assert.equal(term.row.letter, 'A-');
  assert.ok((term.row.flags ?? []).includes('transfer'));
  assert.equal(term.row.credits_earned, 0.5);
  assert.equal(term.audit.new_flags?.[0], 'transfer');
});

test('conduct stored on period and excluded from GPA', () => {
  const [row] = postPeriod(
    {
      class_id: 'c1',
      student_id: 's1',
      marking_period_code: '6W1',
      pct: 90,
      conduct: 'E',
      absences: 2,
      syllabus_version: '1',
      stored_by: 't',
    },
    us,
  );
  assert.equal(row!.conduct, 'E');
  assert.equal(row!.absences, 2);
  const lines = buildReportCardLines([row!]);
  assert.equal(lines[0]!.conduct, 'E');

  // GPA uses term rows only — conduct is not a term field
  const gBefore = gpaFromTermGrades(
    [
      tg({ course: 'English', letter: 'A', credits_attempted: 1, credits_earned: 1 }),
    ],
    uwProfile,
  );
  const gAfter = gpaFromTermGrades(
    [
      tg({ course: 'English', letter: 'A', credits_attempted: 1, credits_earned: 1 }),
    ],
    uwProfile,
  );
  assert.equal(gBefore, gAfter);
  assert.equal(gBefore, 4);
});

test('FR-POST-06 eligibility flags below-passing credit courses', () => {
  const snap = buildEligibilitySnapshot(
    [
      { student_id: 's1', class_id: 'math', marking_period_code: '6W1', pct: 92 },
      { student_id: 's1', class_id: 'eng', marking_period_code: '6W1', pct: 65 },
      { student_id: 's2', class_id: 'math', marking_period_code: '6W1', pct: 88 },
      {
        student_id: 's1',
        class_id: 'pe',
        marking_period_code: '6W1',
        pct: 50,
        is_credit_course: false,
      },
    ],
    70,
    { marking_period_code: '6W1' },
  );
  const s1 = snap.find((x) => x.student_id === 's1')!;
  const s2 = snap.find((x) => x.student_id === 's2')!;
  assert.equal(s1.ineligible, true);
  assert.deepEqual(s1.failing_class_ids, ['eng']);
  assert.equal(s2.ineligible, false);
});

test('setTermRowFlags admin edit is audited and keeps ops flags', () => {
  const base: TermGrade = {
    id: 'tg-1',
    class_id: 'c1',
    student_id: 's1',
    course: 'Bio',
    credit_term: 'S1',
    pct: 80,
    letter: 'B',
    credits_attempted: 0.5,
    credits_earned: 0.5,
    course_level: 'regular',
    quality_points: 3,
    repeat: false,
    flags: ['year_link'],
  };
  const { row, audit } = setTermRowFlags(base, ['transfer', 'cbe', 'repeat'], {
    reason: 'counselor correction',
    by: 'admin-1',
  });
  assert.ok(row.flags!.includes('year_link'));
  assert.ok(row.flags!.includes('transfer'));
  assert.ok(row.flags!.includes('cbe'));
  assert.ok(row.flags!.includes('repeat'));
  assert.equal(row.repeat, true);
  assert.equal(audit.reason, 'counselor correction');
  assert.deepEqual(audit.old_flags, ['year_link']);
});

test('year-link attendance gate is flag only; year credit totals 1.0', () => {
  const policy = defaultCreditPolicy({
    passing_threshold: 70,
    year_link: { enabled: true, min_year_average: 70 },
    attendance_gate: { enabled: true, min_attendance_pct: 90 },
  });
  const s1 = buildTermGrade({
    class_id: 'c1',
    student_id: 's1',
    course: 'Biology',
    posted_children: [{ marking_period_code: 'Q1', pct: 68 }],
    rollup: {
      term_id: 'S1',
      components: [{ period_id: 'Q1', weight: 1 }],
      exam: { enabled: false, code: 'exam' },
      missing_child: 'renormalize',
    },
    scale: tx,
    course_level: 'regular',
    credit_policy: policy,
    attendance_pct: 80,
  });
  assert.ok((s1.flags ?? []).includes('credit_denied'));
  // With year_link on, store does not zero earned solely for attendance
  assert.equal(s1.credits_earned, 0); // still fail by mark

  const s2: TermGrade = {
    ...s1,
    credit_term: 'S2',
    pct: 72,
    letter: 'C',
    credits_earned: 0.5,
    flags: ['credit_denied'],
  };
  const linked = applyYearLinkCredit(
    [
      { ...s1, credits_earned: 0 },
      s2,
    ],
    policy,
  );
  assert.equal(yearCreditEarned(linked), 1.0);
  assert.ok((linked[0]!.flags ?? []).includes('credit_denied'));
  assert.ok((linked[0]!.flags ?? []).includes('year_link'));
  assert.equal(linked[0]!.pct, 68);
  assert.equal(linked[1]!.pct, 72);
});
