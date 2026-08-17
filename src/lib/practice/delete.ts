import { requireSupabase } from '@/lib/supabase/client';

export async function deletePracticeSet(practiceSetId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_delete_practice_set', {
    p_practice_set_id: practiceSetId,
  });
  if (error) throw error;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_delete_assignment', {
    p_assignment_id: assignmentId,
  });
  if (error) throw error;
}

export async function deleteSubmission(submissionId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_delete_submission', {
    p_submission_id: submissionId,
  });
  if (error) throw error;
}
