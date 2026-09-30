/**
 * Pure posting: freeze period grades, build term rows, overrides, GPA.
 */

import { computeTerm } from '../engine/computeTerm.ts';
import type { PeriodResult, TermRollup } from '../engine/types.ts';
import {
  DEFAULT_COURSE_LEVELS,
  DEFAULT_QUALITY_TABLES,
  gpa,
  qualityPoints,
  type CourseLevel,
  type GpaProfile,
  type QualityPointTable,
  type TranscriptRow,
} from '../gpa/gpa.ts';
import { isPassing, letterFor, type GradeScale } from '../scale/scale.ts';

import type {
  ComputedPeriodInput,
  CreditPolicy,
  GradeOverride,
  PostedPeriodGrade,
  PostingTermRollup,
  TermGrade,
} from './types.ts';

export * from './types.ts';

function nowIso(at?: string): string {
  return at ?? new Date().toISOString();
}

function syllabusVersionStr(v: string | number): string {
  return String(v);
}

/** Freeze computed period results into immutable layer-2 rows (FR-POST-01). */
export function postPeriod(
  computed: ComputedPeriodInput | ComputedPeriodInput[],
  scale: GradeScale,
): PostedPeriodGrade[] {
  const list = Array.isArray(computed) ? computed : [computed];
  return list.map((c) => {
    const pct = c.pct == null || !Number.isFinite(c.pct) ? null : c.pct;
    const letter =
      c.letter != null && String(c.letter).trim() !== ''
        ? String(c.letter)
        : pct == null
          ? null
          : letterFor(scale, pct);
    return {
      class_id: c.class_id,
      student_id: c.student_id,
      marking_period_code: c.marking_period_code,
      marking_period_id: c.marking_period_id ?? null,
      pct,
      letter,
      syllabus_version: syllabusVersionStr(c.syllabus_version),
      stored_at: nowIso(c.stored_at),
      stored_by: c.stored_by,
      source: c.source ?? 'computed',
    };
  });
}

function asEngineRollup(r: PostingTermRollup): TermRollup {
  return {
    term_id: r.term_id,
    components: r.components.map((c) => ({ ...c })),
    exam: { ...r.exam },
    missing_child: r.missing_child,
  };
}

function childrenToPeriodResults(
  children: Array<{ marking_period_code: string; pct: number | null }>,
): PeriodResult[] {
  return children.map((c) => ({
    period_id: c.marking_period_code,
    pct: c.pct,
    categories: [],
    renormalized: false,
    ec_added: 0,
    floor_applied: false,
    blocked_by_incomplete: false,
    min_grades_blocked: false,
  }));
}

export type BuildTermGradeInput = {
  class_id: string;
  student_id: string;
  course: string;
  course_code?: string;
  posted_children: Array<{ marking_period_code: string; pct: number | null }>;
  exam_pct?: number | null;
  exam_exempt?: boolean;
  rollup: PostingTermRollup;
  scale: GradeScale;
  course_level: string;
  credit_policy: CreditPolicy;
  quality_table?: QualityPointTable;
  gpa_profile?: Partial<GpaProfile>;
  repeat?: boolean;
  attendance_pct?: number | null;
  stored_at?: string;
  stored_by?: string;
  rounding?: 'nearest_whole' | 'half_up' | 'truncate' | 'none';
};

/**
 * Build one credit-term (layer-3) row from posted children + optional exam.
 * SRS §7.6 rollup; credit per FR-CR-*. Year-link is applyYearLinkCredit.
 */
export function buildTermGrade(input: BuildTermGradeInput): TermGrade {
  const rollup = { ...input.rollup, components: [...input.rollup.components] };
  let examPct = input.exam_pct ?? null;
  const examExempt = input.exam_exempt === true;

  if (examExempt) {
    rollup.exam = { enabled: false, code: rollup.exam.code };
    rollup.components = rollup.components.filter((c) => {
      const id = c.period_id.toLowerCase();
      return id !== 'exam' && id !== rollup.exam.code.toLowerCase();
    });
    examPct = null;
  }

  const term = computeTerm(
    asEngineRollup(rollup),
    childrenToPeriodResults(input.posted_children),
    examExempt ? null : examPct,
    {
      rounding: input.rounding ?? input.scale.rounding ?? 'nearest_whole',
      decimals: input.scale.decimals ?? 0,
    },
  );

  const pct = term.pct;
  const letter = pct == null ? null : letterFor(input.scale, pct);
  const policy = input.credit_policy;
  const attempted =
    policy.credit_unit === 'none' ? 0 : policy.default_credits_per_term;

  let earned = 0;
  if (attempted > 0 && pct != null) {
    const pass =
      letter != null
        ? isPassing(input.scale, letter) || pct >= policy.passing_threshold
        : pct >= policy.passing_threshold;
    earned = pass ? attempted : 0;
  }

  const flags: string[] = [];
  if (examExempt) flags.push('exam_exempt');
  if (input.repeat) flags.push('repeat');

  const gate = policy.attendance_gate;
  if (
    gate?.enabled &&
    input.attendance_pct != null &&
    input.attendance_pct < gate.min_attendance_pct
  ) {
    if (earned > 0) {
      earned = 0;
      flags.push('credit_denied');
    }
  }

  const table = input.quality_table ?? DEFAULT_QUALITY_TABLES['standard-4']!;
  const qp = qualityPoints(
    table,
    input.course_level,
    { letter, pct },
    input.gpa_profile ?? { use_level_bonus: false },
  );

  return {
    class_id: input.class_id,
    student_id: input.student_id,
    course: input.course,
    course_code: input.course_code,
    credit_term: rollup.term_id,
    pct,
    letter,
    credits_attempted: attempted,
    credits_earned: earned,
    course_level: input.course_level,
    quality_points: qp,
    repeat: input.repeat === true,
    flags,
    exam_pct: examExempt ? null : examPct,
    exam_exempt: examExempt,
    stored_at: input.stored_at,
    stored_by: input.stored_by,
  };
}

/**
 * SRS §7.7 year-link: if mean of two semester marks ≥ threshold, award full-year
 * credit across the pair while keeping original marks. GPA uses semester rows.
 */
export function applyYearLinkCredit(
  semesterRows: TermGrade[],
  policy: CreditPolicy,
): TermGrade[] {
  if (!policy.year_link?.enabled || semesterRows.length < 2) {
    return semesterRows.map((r) => ({ ...r, flags: [...(r.flags ?? [])] }));
  }

  const minAvg = policy.year_link.min_year_average ?? policy.passing_threshold;
  const keyOf = (r: TermGrade) =>
    `${(r.course_code || r.course).trim().toLowerCase()}|${r.class_id}|${r.student_id}`;
  const groups = new Map<string, TermGrade[]>();
  for (const r of semesterRows) {
    const k = keyOf(r);
    const list = groups.get(k) ?? [];
    list.push(r);
    groups.set(k, list);
  }

  const out: TermGrade[] = [];
  for (const list of groups.values()) {
    const graded = list.filter((r) => r.pct != null);
    if (graded.length < 2) {
      out.push(...list.map((r) => ({ ...r, flags: [...(r.flags ?? [])] })));
      continue;
    }
    const sorted = [...graded].sort((a, b) => a.credit_term.localeCompare(b.credit_term));
    const pair = sorted.slice(0, 2);
    const mean = (pair[0]!.pct! + pair[1]!.pct!) / 2;
    const award = mean >= minAvg;
    const pairTerms = new Set(pair.map((p) => p.credit_term));

    for (const r of list) {
      const copy: TermGrade = { ...r, flags: [...(r.flags ?? [])] };
      if (award && pairTerms.has(r.credit_term) && r.pct != null) {
        const per = policy.default_credits_per_term;
        copy.credits_attempted = per;
        copy.credits_earned = per;
        if (!copy.flags!.includes('year_link')) copy.flags!.push('year_link');
      }
      out.push(copy);
    }
  }
  return out;
}

export type OverrideTarget = {
  kind: 'posted_period' | 'term';
  class_id: string;
  student_id: string;
  pct: number | null;
  letter: string | null;
  id?: string;
};

/** Apply audited override. Reason required (FR-POST-07). */
export function applyOverride(
  current: OverrideTarget,
  next: { pct?: number | null; letter?: string | null },
  meta: { reason: string; by: string; at?: string; scale?: GradeScale },
): {
  pct: number | null;
  letter: string | null;
  source: 'override';
  audit: GradeOverride;
} {
  const reason = (meta.reason ?? '').trim();
  if (!reason) {
    throw new Error('override reason is required');
  }

  let pct = next.pct !== undefined ? next.pct : current.pct;
  if (pct != null && !Number.isFinite(pct)) pct = null;

  let letter: string | null;
  if (next.letter !== undefined) {
    letter = next.letter;
  } else if (next.pct !== undefined && meta.scale && pct != null) {
    letter = letterFor(meta.scale, pct);
  } else if (next.pct !== undefined && pct == null) {
    letter = null;
  } else {
    letter = current.letter;
  }

  const audit: GradeOverride = {
    target_kind: current.kind,
    target_id: current.id,
    class_id: current.class_id,
    student_id: current.student_id,
    old_pct: current.pct,
    old_letter: current.letter,
    new_pct: pct,
    new_letter: letter,
    reason,
    by: meta.by,
    at: nowIso(meta.at),
  };

  return { pct, letter, source: 'override', audit };
}

/** Map TermGrade → gpa TranscriptRow. */
export function termGradeToTranscriptRow(tg: TermGrade): TranscriptRow {
  const flags = [...(tg.flags ?? [])];
  if (tg.repeat && !flags.includes('repeat')) flags.push('repeat');
  const passFail = flags.includes('pf') || flags.includes('pass_fail');

  return {
    id: tg.id ?? `${tg.class_id}:${tg.student_id}:${tg.credit_term}:${tg.course}`,
    student_id: tg.student_id,
    course_name: tg.course,
    course_code: tg.course_code,
    term_code: tg.credit_term,
    pct: tg.pct,
    letter: tg.letter,
    credits_attempted: tg.credits_attempted,
    credits_earned: tg.credits_earned,
    level: tg.course_level,
    pass_fail: passFail,
    flags,
  };
}

/** GPA from stored term/transcript rows only (FR-POST-04). */
export function gpaFromTermGrades(
  rows: TermGrade[],
  profile: GpaProfile,
  tables: Record<string, QualityPointTable> = DEFAULT_QUALITY_TABLES,
  levels: CourseLevel[] = DEFAULT_COURSE_LEVELS,
): number {
  return gpa(rows.map(termGradeToTranscriptRow), profile, tables, levels);
}

export function defaultCreditPolicy(over: Partial<CreditPolicy> = {}): CreditPolicy {
  return {
    credit_unit: 'semester',
    default_credits_per_term: 0.5,
    passing_threshold: 70,
    attendance_gate: null,
    ...over,
    year_link: {
      enabled: false,
      min_year_average: 70,
      ...(over.year_link ?? {}),
    },
  };
}
