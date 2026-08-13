import { requireSupabase } from '@/lib/supabase/client';
import type { PracticeItem, SubmissionRow } from '@/lib/supabase/types';

function placeholderItems(skillLabel: string): PracticeItem[] {
  return [1, 2, 3].map((n) => ({
    id: `item-${n}`,
    prompt: `Practice ${skillLabel} — item ${n}. Write your work.`,
  }));
}

export async function assignPractice(input: {
  classId: string;
  studentId: string;
  skillId: string;
  skillLabel: string;
  captureId?: string | null;
}): Promise<void> {
  const supabase = requireSupabase();
  let items = placeholderItems(input.skillLabel);
  const { data: generated } = await supabase.functions.invoke('generate-practice', {
    body: { skillLabel: input.skillLabel, captureId: input.captureId },
  });
  const generatedItems = (generated as { items?: PracticeItem[] } | null)?.items;
  if (generatedItems?.length) {
    items = generatedItems;
  }

  const { data: set, error: setError } = await supabase
    .from('practice_sets')
    .insert({
      class_id: input.classId,
      skill_id: input.skillId,
      source_capture_id: input.captureId ?? null,
      items,
      status: 'assigned',
    })
    .select('*')
    .single();
  if (setError) throw setError;

  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .insert({
      class_id: input.classId,
      title: `Practice: ${input.skillLabel}`,
      kind: 'practice',
      practice_set_id: set.id,
      capture_id: input.captureId ?? null,
    })
    .select('*')
    .single();
  if (assignmentError) throw assignmentError;

  const { error: submissionError } = await supabase.from('submissions').insert({
    assignment_id: assignment.id,
    student_id: input.studentId,
    status: 'assigned',
  });
  if (submissionError) throw submissionError;
}

export async function listStudentPractice(studentId: string): Promise<
  Array<SubmissionRow & { title: string }>
> {
  const supabase = requireSupabase();
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!submissions?.length) return [];

  const { data: assignments, error: assignmentError } = await supabase
    .from('assignments')
    .select('*')
    .in(
      'id',
      submissions.map((row) => row.assignment_id),
    );
  if (assignmentError) throw assignmentError;
  const titleById = new Map((assignments ?? []).map((row) => [row.id, row.title]));
  return submissions.map((row) => ({
    ...row,
    title: titleById.get(row.assignment_id) ?? 'Practice',
  }));
}
