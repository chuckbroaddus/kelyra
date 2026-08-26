import { invokeAi } from '@/lib/ai/invoke';
import { packKey } from '@/lib/lessons/protocol';
import {
  assignLesson,
  assignLessonToStudent,
  updateLessonAssignment,
} from '@/lib/lessons/api';
import { isPracticePackId } from '@/lib/lessons/practicePage';
import { requireSupabase } from '@/lib/supabase/client';
import type { AssignmentRow, PracticeItem } from '@/lib/supabase/types';
import { followUpItems, type FollowUpDraft } from '@/lib/practice/followUp';

export type BuiltPracticePack = {
  deckId: string;
  version: string;
  storageDeckId: string;
  beatStart: string;
  beatEnd: string;
  title: string;
};

export async function buildFollowUpPack(draft: FollowUpDraft): Promise<BuiltPracticePack> {
  const items = followUpItems(draft.items);
  if (!items.length) throw new Error('Add at least one question first.');
  const data = await invokeAi<BuiltPracticePack & { ok?: boolean; error?: string }>('build-practice-lesson', {
    classId: draft.classId,
    studentId: draft.studentId,
    sourceAssignmentId: draft.sourceAssignmentId,
    title: draft.sourceTitle,
    skillLabel: draft.skillLabel,
    items,
    ...(draft.assignmentId ? { assignmentId: draft.assignmentId } : {}),
  });
  if (data.error) throw new Error(data.error);
  if (!data.deckId || !data.version) throw new Error('Could not build the practice page.');
  return data;
}

async function ensureClassSkill(classId: string, label: string): Promise<string> {
  const supabase = requireSupabase();
  const normalized = label.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const { data: existing } = await supabase
    .from('skills')
    .select('id')
    .eq('class_id', classId)
    .eq('normalized_label', normalized)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await supabase
    .from('skills')
    .insert({ class_id: classId, label, normalized_label: normalized })
    .select('id')
    .single();
  if (error) throw error;
  return created.id;
}

export async function createFollowUpAssignment(
  draft: FollowUpDraft,
  pack: BuiltPracticePack,
  fields: {
    title: string;
    dueAt?: string | null;
    category?: string;
    weightBand?: string;
    weightPercent?: number | null;
    term?: string;
    scoreScheme?: string;
  },
): Promise<AssignmentRow> {
  const items = followUpItems(draft.items);
  const skillId = await ensureClassSkill(draft.classId, draft.skillLabel || 'practice');
  const { data: set, error: setError } = await requireSupabase()
    .from('practice_sets')
    .insert({
      class_id: draft.classId,
      skill_id: skillId,
      items,
      status: 'assigned',
    })
    .select('id')
    .single();
  if (setError) throw setError;
  const created = await assignLesson({
    classIds: [draft.classId],
    title: fields.title,
    pack: { deckId: pack.deckId, version: pack.version },
    dueAt: fields.dueAt,
    studentId: draft.studentId,
    seedSubmissions: false,
    category: fields.category ?? 'homework',
    weightBand: fields.weightBand,
    weightPercent: fields.weightPercent,
    term: fields.term,
    scoreScheme: fields.scoreScheme,
    includeInAverage: fields.scoreScheme === 'pass_fail' ? false : true,
    practiceSetId: set.id,
  });
  const row = created[0];
  if (!row) throw new Error('Could not create that assignment.');
  return row;
}

export async function saveFollowUpAssignment(
  assignmentId: string,
  classId: string,
  pack: { deckId: string; version: string },
  fields: {
    title: string;
    dueAt?: string | null;
    category?: string;
    weightBand?: string;
    weightPercent?: number | null;
    term?: string;
    scoreScheme?: string;
    unit?: string | null;
    section?: string | null;
  },
): Promise<void> {
  await updateLessonAssignment(assignmentId, {
    classId,
    pack,
    title: fields.title,
    dueAt: fields.dueAt,
    category: fields.category,
    weightBand: fields.weightBand,
    weightPercent: fields.weightPercent,
    term: fields.term,
    scoreScheme: fields.scoreScheme,
    includeInAverage: fields.scoreScheme === 'pass_fail' ? false : true,
    unit: fields.unit,
    section: fields.section,
  });
}

export async function assignFollowUpToStudent(assignmentId: string, studentId: string): Promise<void> {
  await assignLessonToStudent(assignmentId, studentId);
}

export function followUpPackKey(row: Pick<AssignmentRow, 'deck_id' | 'lesson_version' | 'storage_deck_id'>): string {
  if (row.deck_id && row.lesson_version) return packKey(row.deck_id, row.lesson_version);
  return '';
}

export function assignmentIsFollowUp(row: Pick<AssignmentRow, 'kind' | 'storage_deck_id' | 'deck_id'>): boolean {
  return row.kind === 'lesson' && isPracticePackId(row.storage_deck_id ?? row.deck_id);
}

export async function loadFollowUpItems(practiceSetId: string | null | undefined): Promise<PracticeItem[]> {
  if (!practiceSetId) return [];
  const { data, error } = await requireSupabase()
    .from('practice_sets')
    .select('items')
    .eq('id', practiceSetId)
    .maybeSingle();
  if (error) throw error;
  const raw = Array.isArray(data?.items) ? data.items : [];
  return followUpItems(
    raw.map((item: { id?: string; prompt?: string; answerKey?: string }, index: number) => ({
      id: item.id || `item-${index + 1}`,
      prompt: String(item.prompt ?? ''),
      ...(item.answerKey ? { answerKey: String(item.answerKey) } : {}),
    })),
  );
}
