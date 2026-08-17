import { deriveKeyKind, keySummary, normalizeKeyItems, type AnswerKeyItem, type AnswerKeyKind } from '@/lib/assignments/keys';
import { gradeKindLabel, type GradeKind, type GradeTerm, type ScoreScheme, type WeightBand } from '@/lib/grade/marks';
import { listRoster } from '@/lib/students/api';
import { requireSupabase } from '@/lib/supabase/client';
import type { AssignmentRow } from '@/lib/supabase/types';

export type AssignmentInput = {
  classId: string;
  title: string;
  category?: GradeKind | string;
  dueAt?: string | null;
  weightBand?: WeightBand;
  weightPercent?: number | null;
  term?: GradeTerm;
  scoreScheme?: ScoreScheme;
  includeInAverage?: boolean;
  maxScore?: number | null;
  keyKind?: AnswerKeyKind;
  keyNotes?: string | null;
  keyPassAt?: number | null;
  keyItems?: AnswerKeyItem[];
  keyAssetId?: string | null;
  keyPhash?: string | null;
  keyLayout?: number[] | null;
  keyHeader?: string | null;
  unit?: string | null;
  section?: string | null;
};

export async function listClassAssignments(classId: string): Promise<AssignmentRow[]> {
  const { data, error } = await requireSupabase()
    .from('assignments')
    .select('*')
    .eq('class_id', classId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAssignment(assignmentId: string): Promise<AssignmentRow | null> {
  const { data, error } = await requireSupabase()
    .from('assignments')
    .select('*')
    .eq('id', assignmentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAssignment(input: AssignmentInput): Promise<AssignmentRow> {
  const row = { ...buildRow(input), kind: 'planned' as const };
  const { data, error } = await requireSupabase().from('assignments').insert(row).select('*').single();
  if (error) {
    const slim = {
      class_id: input.classId,
      title: input.title.trim(),
      kind: 'planned' as const,
      due_at: input.dueAt ?? null,
    };
    let retry = await requireSupabase().from('assignments').insert(slim).select('*').single();
    if (retry.error) {
      retry = await requireSupabase()
        .from('assignments')
        .insert({ ...slim, kind: 'capture' })
        .select('*')
        .single();
    }
    if (retry.error) throw retry.error;
    await seedAssignedCells(retry.data.id, input.classId);
    return retry.data;
  }
  await seedAssignedCells(data.id, input.classId);
  return data;
}

export async function updateAssignment(assignmentId: string, input: AssignmentInput): Promise<AssignmentRow> {
  const row = buildRow(input);
  const { data, error } = await requireSupabase()
    .from('assignments')
    .update(row)
    .eq('id', assignmentId)
    .select('*')
    .single();
  if (error) throw error;
  await seedAssignedCells(assignmentId, input.classId);
  return data;
}

export async function seedAssignedCells(assignmentId: string, classId: string): Promise<void> {
  const roster = await listRoster(classId);
  if (!roster.length) return;
  const { data: existing } = await requireSupabase()
    .from('submissions')
    .select('student_id')
    .eq('assignment_id', assignmentId);
  const have = new Set((existing ?? []).map((row) => row.student_id));
  const missing = roster.filter((student) => !have.has(student.id));
  if (!missing.length) return;
  await requireSupabase()
    .from('submissions')
    .insert(missing.map((student) => ({ assignment_id: assignmentId, student_id: student.id, status: 'assigned' as const })));
}

export function matchSpokenAssignment(transcript: string, assignments: AssignmentRow[]): AssignmentRow | null {
  const hay = transcript.toLowerCase();
  if (!hay.trim() || !assignments.length) return null;
  const hits = assignments.filter((row) => {
    const title = row.title.toLowerCase();
    if (title.length > 2 && hay.includes(title)) return true;
    const tokens = title.split(/\s+/).filter((token) => token.length > 2);
    return tokens.length > 0 && tokens.every((token) => hay.includes(token));
  });
  return hits.length === 1 ? hits[0]! : null;
}

export function assignmentSubtitle(row: AssignmentRow): string {
  const bits = [gradeKindLabel(row.category ?? 'homework')];
  if (row.unit?.trim()) bits.push(row.unit.trim());
  if (row.section?.trim()) bits.push(row.section.trim());
  if (row.due_at) bits.push(dueLabel(row.due_at));
  const key = keySummary(row);
  if (key) bits.push(key);
  return bits.join(' · ');
}

export function assignmentHasKey(row: AssignmentRow): boolean {
  return Boolean(row.key_kind && row.key_kind !== 'none');
}

export function dueLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildRow(input: AssignmentInput) {
  const include =
    input.includeInAverage ?? (input.scoreScheme === 'pass_fail' ? false : true);
  const items = normalizeKeyItems(input.keyItems ?? []);
  const keyKind = input.keyKind ?? deriveKeyKind(Boolean(input.keyAssetId), items);
  return {
    class_id: input.classId,
    title: input.title.trim(),
    due_at: input.dueAt ?? null,
    max_score: input.maxScore ?? null,
    category: input.category ?? 'homework',
    weight_band: input.weightBand ?? 'none',
    weight_percent: input.weightBand === 'custom' ? input.weightPercent ?? null : null,
    term: input.term ?? 'none',
    score_scheme: input.scoreScheme ?? 'numeric',
    include_in_average: include,
    key_kind: keyKind,
    key_notes: input.keyNotes?.trim() || null,
    key_pass_at: input.keyPassAt ?? null,
    key_items: items,
    key_asset_id: input.keyAssetId ?? null,
    key_phash: input.keyPhash ?? null,
    key_layout: input.keyLayout ?? null,
    key_header: input.keyHeader?.trim() || null,
    key_ready_at: keyKind === 'none' ? null : new Date().toISOString(),
    unit: input.unit?.trim() || null,
    section: input.section?.trim() || null,
  };
}
