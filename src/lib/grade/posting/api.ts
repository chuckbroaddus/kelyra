/**
 * Thin Supabase wrappers for GB-06 posting / transcript / override / GPA.
 * Tables land via migration 20261001130000_gb_posting.sql (DevOps applies).
 */

import { requireSupabase } from '@/lib/supabase/client';

import type { GradeOverride, PostedPeriodGrade, TermGrade } from './types';
import {
  DEFAULT_COURSE_LEVELS,
  DEFAULT_QUALITY_TABLES,
  type GpaProfile,
  type QualityPointTable,
  type CourseLevel,
} from '../gpa/gpa';
import { gpaFromTermGrades } from './posting';

type RpcResult = {
  ok?: boolean;
  posted?: number;
  skipped?: number;
  overridden?: number;
  reason?: string;
  rows?: unknown[];
};

/** Teacher posts (or reposts with reason) a marking period for a class. */
export async function postMarkingPeriod(args: {
  classId: string;
  markingPeriodId: string;
  /** Client-computed rows: student_id, pct, letter?, conduct?, absences?, flags?, syllabus_version */
  rows: Array<{
    student_id: string;
    pct: number | null;
    letter?: string | null;
    conduct?: string | null;
    absences?: number | null;
    flags?: string[];
    syllabus_version: string | number;
  }>;
  /** Required when overwriting an existing posted row. */
  reason?: string | null;
  /**
   * When set, load saved class_conduct_marks for this period_key and merge
   * onto each row (explicit row.conduct still wins only if no saved mark key).
   * Saved marks override empty/missing conduct on the payload.
   */
  conductPeriodKey?: string | null;
}): Promise<RpcResult> {
  const supabase = requireSupabase();
  let rows = args.rows;
  const periodKey = args.conductPeriodKey?.trim();
  if (periodKey) {
    const { applyConductToPostingRows, marksForPeriod } = await import('./conductMarks.ts');
    const { loadConductMarksByPeriod } = await import('./conductMarksApi.ts');
    const nested = await loadConductMarksByPeriod(args.classId);
    rows = applyConductToPostingRows(rows, marksForPeriod(nested, periodKey));
  }
  const { data, error } = await supabase.rpc('post_marking_period' as never, {
    p_class_id: args.classId,
    p_marking_period_id: args.markingPeriodId,
    p_rows: rows,
    p_reason: args.reason ?? null,
  } as never);
  if (error) throw error;
  return (data ?? { ok: true }) as RpcResult;
}

export async function listPostedPeriodGrades(args: {
  classId?: string;
  studentId?: string;
  markingPeriodCode?: string;
}): Promise<PostedPeriodGrade[]> {
  const supabase = requireSupabase();
  let q = supabase.from('posted_period_grades' as never).select('*');
  if (args.classId) q = q.eq('class_id', args.classId);
  if (args.studentId) q = q.eq('student_id', args.studentId);
  if (args.markingPeriodCode) q = q.eq('marking_period_code', args.markingPeriodCode);
  const { data, error } = await q.order('stored_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PostedPeriodGrade[];
}

export async function listTermGrades(args: {
  classId?: string;
  studentId?: string;
}): Promise<TermGrade[]> {
  const supabase = requireSupabase();
  let q = supabase.from('term_grades' as never).select('*');
  if (args.classId) q = q.eq('class_id', args.classId);
  if (args.studentId) q = q.eq('student_id', args.studentId);
  const { data, error } = await q.order('credit_term', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TermGrade[];
}

/** Teacher override of a posted period row; reason required server-side too. */
export async function overridePostedPeriodGrade(args: {
  postedId: string;
  pct: number | null;
  letter?: string | null;
  reason: string;
}): Promise<{ row: PostedPeriodGrade; audit: GradeOverride }> {
  const reason = args.reason.trim();
  if (!reason) throw new Error('override reason is required');
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('override_posted_period_grade' as never, {
    p_posted_id: args.postedId,
    p_pct: args.pct,
    p_letter: args.letter ?? null,
    p_reason: reason,
  } as never);
  if (error) throw error;
  return data as { row: PostedPeriodGrade; audit: GradeOverride };
}

/** Student GPA from stored term_grades rows (client-side pure compute). */
export async function studentGpaFromStored(args: {
  studentId: string;
  profile: GpaProfile;
  tables?: Record<string, QualityPointTable>;
  levels?: CourseLevel[];
}): Promise<{ rows: TermGrade[]; gpa: number }> {
  const rows = await listTermGrades({ studentId: args.studentId });
  const value = gpaFromTermGrades(
    rows,
    args.profile,
    args.tables ?? DEFAULT_QUALITY_TABLES,
    args.levels ?? DEFAULT_COURSE_LEVELS,
  );
  return { rows, gpa: value };
}

/** Office/counselor transfer-in stored grade (FR-CR-07). */
export async function transferInGrade(args: {
  kind: 'period' | 'term';
  classId: string;
  studentId: string;
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; row_id?: string; audit_id?: string }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('transfer_in_grade' as never, {
    p_kind: args.kind,
    p_class_id: args.classId,
    p_student_id: args.studentId,
    p_payload: args.payload,
  } as never);
  if (error) throw error;
  return (data ?? { ok: true }) as { ok: boolean; row_id?: string; audit_id?: string };
}

/** Admin edit of term row flags (transfer|cbe|pf|credit_denied|repeat). */
export async function setTermGradeFlags(args: {
  termId: string;
  flags: string[];
  reason: string;
}): Promise<{ row: TermGrade; audit_id?: string }> {
  const reason = args.reason.trim();
  if (!reason) throw new Error('override reason is required');
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('set_term_grade_flags' as never, {
    p_term_id: args.termId,
    p_flags: args.flags,
    p_reason: reason,
  } as never);
  if (error) throw error;
  return data as { row: TermGrade; audit_id?: string };
}

/** Staff-only eligibility snapshots for a school/period. */
export async function listEligibilitySnapshots(args: {
  schoolId: string;
  markingPeriodCode?: string;
}): Promise<
  Array<{
    student_id: string;
    marking_period_code: string;
    ineligible: boolean;
    failing_class_ids: string[];
  }>
> {
  const supabase = requireSupabase();
  let q = supabase
    .from('eligibility_snapshots' as never)
    .select('student_id, marking_period_code, ineligible, failing_class_ids')
    .eq('school_id', args.schoolId);
  if (args.markingPeriodCode) q = q.eq('marking_period_code', args.markingPeriodCode);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Array<{
    student_id: string;
    marking_period_code: string;
    ineligible: boolean;
    failing_class_ids: string[];
  }>;
}

/** Persist FR-POST-06 eligibility snapshot rows (derived; never AI). */
export async function storeEligibilitySnapshots(args: {
  schoolId: string;
  markingPeriodCode: string;
  rows: Array<{
    student_id: string;
    ineligible: boolean;
    failing_class_ids: string[];
  }>;
}): Promise<{ ok: boolean; stored?: number }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('store_eligibility_snapshots' as never, {
    p_school_id: args.schoolId,
    p_marking_period_code: args.markingPeriodCode,
    p_rows: args.rows,
  } as never);
  if (error) throw error;
  return (data ?? { ok: true }) as { ok: boolean; stored?: number };
}
