/**
 * Thin Supabase load/upsert for class_conduct_marks.
 */

import { requireSupabase } from '@/lib/supabase/client';

import {
  nestConductMarkRows,
  type ClassConductMarkRow,
  type ConductMarksByPeriod,
} from './conductMarks.ts';

export async function listClassConductMarks(classId: string): Promise<ClassConductMarkRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('class_conduct_marks' as never)
    .select('class_id, student_id, period_key, mark, updated_by, updated_at')
    .eq('class_id', classId);
  if (error) throw error;
  return (data ?? []) as unknown as ClassConductMarkRow[];
}

export async function loadConductMarksByPeriod(classId: string): Promise<ConductMarksByPeriod> {
  const rows = await listClassConductMarks(classId);
  return nestConductMarkRows(rows);
}

/**
 * Persist one tap. Null/empty mark deletes the row (cleared selection).
 * Returns the canonical mark written (null when cleared).
 */
export async function upsertClassConductMark(args: {
  classId: string;
  studentId: string;
  periodKey: string;
  mark: string | null;
}): Promise<string | null> {
  const periodKey = args.periodKey.trim();
  if (!periodKey) throw new Error('period key required');
  const mark =
    args.mark == null || String(args.mark).trim() === '' ? null : String(args.mark).trim();
  const supabase = requireSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? null;

  if (mark == null) {
    const { error } = await supabase
      .from('class_conduct_marks' as never)
      .delete()
      .eq('class_id', args.classId)
      .eq('student_id', args.studentId)
      .eq('period_key', periodKey);
    if (error) throw error;
    return null;
  }

  const { error } = await supabase.from('class_conduct_marks' as never).upsert(
    {
      class_id: args.classId,
      student_id: args.studentId,
      period_key: periodKey,
      mark,
      updated_by: uid,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'class_id,student_id,period_key' },
  );
  if (error) throw error;
  return mark;
}
