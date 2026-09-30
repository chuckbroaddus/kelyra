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
  /** Client-computed rows: student_id, pct, letter?, syllabus_version */
  rows: Array<{
    student_id: string;
    pct: number | null;
    letter?: string | null;
    syllabus_version: string | number;
  }>;
  /** Required when overwriting an existing posted row. */
  reason?: string | null;
}): Promise<RpcResult> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('post_marking_period' as never, {
    p_class_id: args.classId,
    p_marking_period_id: args.markingPeriodId,
    p_rows: args.rows,
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
