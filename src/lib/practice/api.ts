import { invokeAi } from '@/lib/ai/invoke';
import { isOpenWork } from '@/lib/assignments/status';
import { isReusableOpenPractice, reusablePracticeKey } from '@/lib/practice/reuse';
import { requireSupabase } from '@/lib/supabase/client';
import type { PracticeItem, SubmissionRow } from '@/lib/supabase/types';

export { isReusableOpenPractice, reusablePracticeKey } from '@/lib/practice/reuse';

function placeholderItems(skillLabel: string): PracticeItem[] {
  return [
    { id: 'item-1', prompt: `Write one problem for ${skillLabel}.` },
    { id: 'item-2', prompt: `Write a second problem for ${skillLabel}.` },
    { id: 'item-3', prompt: `Write a third problem for ${skillLabel}.` },
  ];
}

export function practiceTitle(title: string): string {
  return title.replace(/^Practice:\s*/i, '').trim() || title;
}

export type AssignPracticeResult = {
  created: boolean;
  assignmentId: string;
  submissionId: string;
};

const inFlight = new Map<string, Promise<AssignPracticeResult>>();

export async function assignPractice(input: {
  classId: string;
  studentId: string;
  skillId: string;
  skillLabel: string;
  captureId?: string | null;
  items?: PracticeItem[];
}): Promise<AssignPracticeResult> {
  const key = reusablePracticeKey(input.studentId, input.skillId);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const work = assignPracticeOnce(input).finally(() => {
    if (inFlight.get(key) === work) inFlight.delete(key);
  });
  inFlight.set(key, work);
  return work;
}

async function assignPracticeOnce(input: {
  classId: string;
  studentId: string;
  skillId: string;
  skillLabel: string;
  captureId?: string | null;
  items?: PracticeItem[];
}): Promise<AssignPracticeResult> {
  const supabase = requireSupabase();
  const existing = await findOpenSkillPractice(input.studentId, input.classId, input.skillId);
  if (existing) return { created: false, ...existing };

  let items = input.items?.filter((item) => item.prompt.trim()) ?? [];
  if (!items.length) {
    items = placeholderItems(input.skillLabel);
    try {
      const generated = await invokeAi<{ items?: PracticeItem[] }>('generate-practice', {
        skillLabel: input.skillLabel,
        captureId: input.captureId,
      });
      if (generated.items?.length) items = generated.items;
    } catch {
      // Keep typed placeholders if Grok is offline so the teacher can still assign.
    }
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

  const { data: submission, error: submissionError } = await supabase
    .from('submissions')
    .insert({
      assignment_id: assignment.id,
      student_id: input.studentId,
      status: 'assigned',
    })
    .select('id')
    .single();
  if (submissionError) throw submissionError;
  return { created: true, assignmentId: assignment.id, submissionId: submission.id };
}

async function findOpenSkillPractice(
  studentId: string,
  classId: string,
  skillId: string,
): Promise<{ assignmentId: string; submissionId: string } | null> {
  const supabase = requireSupabase();
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('id, status, assignment_id')
    .eq('student_id', studentId)
    .in('status', ['assigned', 'started']);
  if (error) throw error;
  if (!submissions?.length) return null;

  const { data: assignments, error: assignmentError } = await supabase
    .from('assignments')
    .select('id, class_id, kind, practice_set_id')
    .in(
      'id',
      submissions.map((row) => row.assignment_id),
    )
    .eq('class_id', classId)
    .eq('kind', 'practice');
  if (assignmentError) throw assignmentError;
  const setIds = (assignments ?? []).map((row) => row.practice_set_id).filter((id): id is string => Boolean(id));
  if (!setIds.length) return null;

  const { data: sets, error: setError } = await supabase
    .from('practice_sets')
    .select('id, skill_id')
    .in('id', setIds)
    .eq('skill_id', skillId);
  if (setError) throw setError;
  const matchSets = new Set((sets ?? []).map((row) => row.id));
  const assignment = (assignments ?? []).find((row) => {
    if (!row.practice_set_id || !matchSets.has(row.practice_set_id)) return false;
    return isReusableOpenPractice(
      {
        studentId,
        classId: row.class_id,
        skillId,
        kind: row.kind,
        status: submissions.find((sub) => sub.assignment_id === row.id)?.status ?? '',
      },
      { studentId, classId, skillId },
    );
  });
  if (!assignment) return null;
  const submission = submissions.find((row) => row.assignment_id === assignment.id && isOpenWork(row.status));
  if (!submission) return null;
  return { assignmentId: assignment.id, submissionId: submission.id };
}

export type StudentPractice = SubmissionRow & {
  title: string;
  practiceSetId: string | null;
  items: PracticeItem[];
  dueAt: string | null;
};

export async function listStudentPractice(studentId: string): Promise<StudentPractice[]> {
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

  const setIds = (assignments ?? [])
    .map((row) => row.practice_set_id)
    .filter((id): id is string => Boolean(id));
  const { data: sets, error: setError } = setIds.length
    ? await supabase.from('practice_sets').select('*').in('id', setIds)
    : { data: [], error: null };
  if (setError) throw setError;

  const assignmentById = new Map((assignments ?? []).map((row) => [row.id, row]));
  const setById = new Map((sets ?? []).map((row) => [row.id, row]));

  return submissions.flatMap((row) => {
    const assignment = assignmentById.get(row.assignment_id);
    if (!assignment || assignment.kind !== 'practice') return [];
    const set = assignment.practice_set_id ? setById.get(assignment.practice_set_id) : undefined;
    return [
      {
        ...row,
        title: assignment.title,
        practiceSetId: assignment.practice_set_id ?? null,
        items: set?.items ?? [],
        dueAt: assignment.due_at ?? null,
      },
    ];
  });
}

export async function savePracticeItems(practiceSetId: string, items: PracticeItem[]) {
  const cleaned = items
    .map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      prompt: item.prompt.trim(),
    }))
    .filter((item) => item.prompt);
  if (!cleaned.length) throw new Error('Keep at least one practice item.');
  const { error } = await requireSupabase()
    .from('practice_sets')
    .update({ items: cleaned })
    .eq('id', practiceSetId);
  if (error) throw error;
}
