import { requireSupabase } from '@/lib/supabase/client';
import type { StudentRow } from '@/lib/supabase/types';

export type RosterStudent = StudentRow & { enrollment_id: string };

export async function listRoster(classId: string): Promise<RosterStudent[]> {
  const supabase = requireSupabase();
  const { data: enrollments, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('id, student_id')
    .eq('class_id', classId)
    .order('created_at', { ascending: true });
  if (enrollmentError) throw enrollmentError;
  if (!enrollments?.length) return [];

  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('*')
    .in(
      'id',
      enrollments.map((row) => row.student_id),
    );
  if (studentError) throw studentError;

  const byId = new Map((students ?? []).map((student) => [student.id, student]));
  return enrollments.flatMap((row) => {
    const student = byId.get(row.student_id);
    if (!student) return [];
    return [{ ...student, enrollment_id: row.id }];
  });
}

export async function addTypedStudent(
  classId: string,
  teacherId: string,
  displayName: string,
): Promise<RosterStudent> {
  const name = displayName.trim();
  if (!name) throw new Error('Student name is required');

  const supabase = requireSupabase();
  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      teacher_id: teacherId,
      display_name: name,
      sort_name: name,
      created_via: 'typed',
    })
    .select('*')
    .single();
  if (studentError) throw studentError;

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .insert({ class_id: classId, student_id: student.id })
    .select('id')
    .single();
  if (enrollmentError) throw enrollmentError;

  return { ...student, enrollment_id: enrollment.id };
}
