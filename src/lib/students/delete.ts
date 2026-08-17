import { requireSupabase } from '@/lib/supabase/client';

export async function deleteStudent(studentId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_delete_student', { p_student_id: studentId });
  if (error) throw error;
}

export async function removeEnrollment(classId: string, studentId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_remove_enrollment', {
    p_class_id: classId,
    p_student_id: studentId,
  });
  if (error) throw error;
}

export async function listStudentEnrollments(
  studentId: string,
): Promise<Array<{ class_id: string; class_name: string }>> {
  const supabase = requireSupabase();
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId);
  if (error) throw error;
  if (!enrollments?.length) return [];
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id, name')
    .in(
      'id',
      enrollments.map((row) => row.class_id),
    );
  if (classError) throw classError;
  const nameById = new Map((classes ?? []).map((row) => [row.id, row.name]));
  return enrollments.map((row) => ({
    class_id: row.class_id,
    class_name: nameById.get(row.class_id) ?? 'Class',
  }));
}
