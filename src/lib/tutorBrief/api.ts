import { invokeAi } from '@/lib/ai/invoke';
import { requireSupabase } from '@/lib/supabase/client';
import {
  asHintDepth,
  asStringList,
  type TutorBriefGroundOption,
  type TutorBriefSafe,
  type TutorBriefTeacher,
  type TutorHintDepth,
} from '@/lib/tutorBrief/types';

function parseTeacherRow(row: Record<string, unknown> | null | undefined): TutorBriefTeacher | null {
  if (!row || typeof row.assignment_id !== 'string') return null;
  const status = row.status;
  if (status !== 'draft' && status !== 'confirmed' && status !== 'stale') return null;
  return {
    assignment_id: row.assignment_id,
    status,
    objectives: asStringList(row.objectives),
    misconceptions: asStringList(row.misconceptions),
    allowed_hint_depth: asHintDepth(row.allowed_hint_depth),
    vocabulary: asStringList(row.vocabulary),
    teacher_notes: typeof row.teacher_notes === 'string' ? row.teacher_notes : null,
    live_objectives: row.live_objectives == null ? null : asStringList(row.live_objectives),
    confirmed_at: typeof row.confirmed_at === 'string' ? row.confirmed_at : null,
    draft_generated_at: typeof row.draft_generated_at === 'string' ? row.draft_generated_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

function parseSafe(row: Record<string, unknown> | null | undefined): TutorBriefSafe | null {
  if (!row || typeof row.assignment_id !== 'string') return null;
  if (row.status !== 'confirmed') return null;
  return {
    assignment_id: row.assignment_id,
    title: typeof row.title === 'string' ? row.title : null,
    status: 'confirmed',
    objectives: asStringList(row.objectives),
    misconceptions: asStringList(row.misconceptions),
    allowed_hint_depth: asHintDepth(row.allowed_hint_depth),
    vocabulary: asStringList(row.vocabulary),
  };
}

export async function getTutorBriefTeacher(assignmentId: string): Promise<TutorBriefTeacher | null> {
  const { data, error } = await requireSupabase().rpc('get_tutor_brief_teacher' as never, {
    p_assignment_id: assignmentId,
  } as never);
  if (error) throw error;
  return parseTeacherRow((data ?? null) as Record<string, unknown> | null);
}

/** Confirmed safe slice only. Client must not invent pack body for Edge. */
export async function getTutorBriefSafe(
  assignmentId: string,
  studentId?: string | null,
): Promise<TutorBriefSafe | null> {
  const { data, error } = await requireSupabase().rpc('get_tutor_brief_safe' as never, {
    p_assignment_id: assignmentId,
    p_student_id: studentId ?? null,
  } as never);
  if (error) throw error;
  return parseSafe((data ?? null) as Record<string, unknown> | null);
}

export async function listTutorBriefGroundOptions(input?: {
  studentId?: string | null;
  classId?: string | null;
}): Promise<TutorBriefGroundOption[]> {
  const { data, error } = await requireSupabase().rpc('list_tutor_brief_ground_options' as never, {
    p_student_id: input?.studentId ?? null,
    p_class_id: input?.classId ?? null,
  } as never);
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).flatMap((row) => {
    if (typeof row.assignment_id !== 'string' || typeof row.title !== 'string') return [];
    return [
      {
        assignment_id: row.assignment_id,
        title: row.title,
        class_id: typeof row.class_id === 'string' ? row.class_id : '',
        class_name: typeof row.class_name === 'string' ? row.class_name : '',
      },
    ];
  });
}

export async function saveTutorBriefDraft(input: {
  assignmentId: string;
  objectives: string[];
  misconceptions: string[];
  allowedHintDepth: TutorHintDepth;
  vocabulary: string[];
  teacherNotes?: string | null;
  asNewDraft?: boolean;
}): Promise<TutorBriefTeacher> {
  const { data, error } = await requireSupabase().rpc('upsert_tutor_brief_draft' as never, {
    p_assignment_id: input.assignmentId,
    p_objectives: input.objectives,
    p_misconceptions: input.misconceptions,
    p_allowed_hint_depth: input.allowedHintDepth,
    p_vocabulary: input.vocabulary,
    p_teacher_notes: input.teacherNotes ?? null,
    p_as_new_draft: input.asNewDraft ?? false,
  } as never);
  if (error) throw error;
  const parsed = parseTeacherRow(data as Record<string, unknown>);
  if (!parsed) throw new Error('Could not save tutor brief');
  return parsed;
}

export async function confirmTutorBrief(input: {
  assignmentId: string;
  objectives: string[];
  misconceptions: string[];
  allowedHintDepth: TutorHintDepth;
  vocabulary: string[];
  teacherNotes?: string | null;
}): Promise<TutorBriefTeacher> {
  const { data, error } = await requireSupabase().rpc('confirm_tutor_brief' as never, {
    p_assignment_id: input.assignmentId,
    p_objectives: input.objectives,
    p_misconceptions: input.misconceptions,
    p_allowed_hint_depth: input.allowedHintDepth,
    p_vocabulary: input.vocabulary,
    p_teacher_notes: input.teacherNotes ?? null,
  } as never);
  if (error) throw error;
  const parsed = parseTeacherRow(data as Record<string, unknown>);
  if (!parsed) throw new Error('Could not confirm tutor brief');
  return parsed;
}

export async function clearTutorBrief(assignmentId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('clear_tutor_brief' as never, {
    p_assignment_id: assignmentId,
  } as never);
  if (error) throw error;
}

/** One AI pass at publish/update. Returns Draft — not injectable until Confirm. */
export async function generateTutorBrief(assignmentId: string): Promise<TutorBriefTeacher> {
  const reply = await invokeAi<{ brief?: Record<string, unknown>; error?: string }>(
    'generate-tutor-brief',
    { assignmentId },
  );
  if (reply.error) throw new Error(reply.error);
  const parsed = parseTeacherRow(reply.brief ?? null);
  if (!parsed) throw new Error('Couldn’t draft a brief. Try re-generate, or skip for now.');
  return parsed;
}
