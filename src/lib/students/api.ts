import { invokeAi } from '@/lib/ai/invoke';
import { setMetaKey } from '@/lib/people/metadata';
import { hydratePhotoUrls } from '@/lib/people/photos';
import { requireSupabase } from '@/lib/supabase/client';
import type { RosterImportRow, StudentRow } from '@/lib/supabase/types';

export type SuggestedRosterName = {
  key: string;
  name: string;
  selected: boolean;
  alreadyHere: boolean;
};

export async function suggestRosterFromPhoto(
  imageUrl: string,
  existingNames: string[],
): Promise<SuggestedRosterName[]> {
  const data = await invokeAi<{ names?: Array<{ name?: string; confident?: boolean }> }>(
    'extract-roster',
    { imageUrl },
  );
  const existing = new Set(existingNames.map((name) => normalizeRosterName(name)));
  const seen = new Set<string>();
  const suggestions: SuggestedRosterName[] = [];
  for (const row of data.names ?? []) {
    const name = String(row.name ?? '').replace(/\s+/g, ' ').trim();
    const key = normalizeRosterName(name);
    if (!name || !key || seen.has(key)) continue;
    seen.add(key);
    const alreadyHere = existing.has(key);
    suggestions.push({
      key,
      name,
      selected: !alreadyHere && row.confident !== false,
      alreadyHere,
    });
  }
  return suggestions;
}

export type RosterStudent = StudentRow & { enrollment_id: string; photoUrl: string | null };

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
  const roster = enrollments.flatMap((row) => {
    const student = byId.get(row.student_id);
    if (!student) return [];
    return [{ ...student, enrollment_id: row.id }];
  });
  return hydratePhotoUrls(roster);
}

export type FocusLogEntry = {
  skillId: string | null;
  label: string;
  result: 'proficient' | 'dismissed';
  at: string;
};

export function focusLogFromMetadata(metadata: Record<string, unknown> | null | undefined): FocusLogEntry[] {
  const raw = metadata?.focusLog;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Record<string, unknown>;
    if (item.result !== 'proficient' && item.result !== 'dismissed') return [];
    if (typeof item.label !== 'string' || !item.label.trim()) return [];
    return [
      {
        skillId: typeof item.skillId === 'string' ? item.skillId : null,
        label: item.label.trim(),
        result: item.result,
        at: typeof item.at === 'string' ? item.at : new Date().toISOString(),
      },
    ];
  });
}

export async function closeFocusSkill(
  student: StudentRow,
  label: string,
  result: 'proficient' | 'dismissed',
) {
  const entry: FocusLogEntry = {
    skillId: student.current_focus_skill_id,
    label,
    result,
    at: new Date().toISOString(),
  };
  const log = [...focusLogFromMetadata(student.metadata), entry].slice(-40);
  const sentence =
    result === 'proficient' ? `Proficient in ${label}.` : student.parent_sentence;
  const { error } = await requireSupabase()
    .from('students')
    .update({
      current_focus_skill_id: null,
      parent_sentence: sentence,
      metadata: { ...student.metadata, focusLog: log },
    })
    .eq('id', student.id);
  if (error) throw error;
}

export async function clearFocusSkill(studentId: string) {
  const { error } = await requireSupabase()
    .from('students')
    .update({ current_focus_skill_id: null })
    .eq('id', studentId);
  if (error) throw error;
}

export async function renameStudent(
  studentId: string,
  displayName: string,
  previousName?: string | null,
): Promise<StudentRow> {
  const name = displayName.replace(/\s+/g, ' ').trim();
  if (!name) throw new Error('Student name is required');
  const supabase = requireSupabase();
  const { data: current, error: loadError } = await supabase
    .from('students')
    .select('name_aliases')
    .eq('id', studentId)
    .single();
  if (loadError) throw loadError;

  const aliases = [...(current?.name_aliases ?? [])];
  const prior = previousName?.replace(/\s+/g, ' ').trim();
  if (prior && normalizeRosterName(prior) !== normalizeRosterName(name) && !aliases.includes(prior)) {
    aliases.push(prior);
  }

  const { data, error } = await supabase
    .from('students')
    .update({
      display_name: name,
      sort_name: name,
      name_aliases: aliases,
    })
    .eq('id', studentId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getStudent(studentId: string): Promise<StudentRow> {
  const { data, error } = await requireSupabase()
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();
  if (error) throw error;
  return data;
}

function normalizeRosterName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function addConfirmedStudents(input: {
  classId: string;
  teacherId: string;
  names: string[];
  createdVia: 'typed' | 'photo_list' | 'voice';
}): Promise<{ added: RosterStudent[]; skipped: string[] }> {
  const roster = await listRoster(input.classId);
  const existing = new Set(roster.map((student) => normalizeRosterName(student.display_name)));
  const added: RosterStudent[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const raw of input.names) {
    const name = raw.replace(/\s+/g, ' ').trim();
    const key = normalizeRosterName(name);
    if (!name || !key) continue;
    if (existing.has(key) || seen.has(key)) {
      skipped.push(name);
      continue;
    }
    seen.add(key);
    added.push(
      await insertStudent({
        classId: input.classId,
        teacherId: input.teacherId,
        displayName: name,
        createdVia: input.createdVia,
      }),
    );
    existing.add(key);
  }

  return { added, skipped };
}

async function insertStudent(input: {
  classId: string;
  teacherId: string;
  displayName: string;
  createdVia: 'typed' | 'photo_list' | 'voice';
}): Promise<RosterStudent> {
  const supabase = requireSupabase();
  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      teacher_id: input.teacherId,
      display_name: input.displayName,
      sort_name: input.displayName,
      created_via: input.createdVia,
    })
    .select('*')
    .single();
  if (studentError) throw studentError;

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .insert({ class_id: input.classId, student_id: student.id })
    .select('id')
    .single();
  if (enrollmentError) throw enrollmentError;

  return { ...student, enrollment_id: enrollment.id, photoUrl: null };
}

export async function updateStudentMetadata(
  student: StudentRow,
  metadata: Record<string, unknown>,
): Promise<StudentRow> {
  const preferred = typeof metadata.preferred_name === 'string' ? metadata.preferred_name.trim() : '';
  const aliases = [...student.name_aliases];
  if (preferred && !aliases.some((alias) => normalizeRosterName(alias) === normalizeRosterName(preferred))) {
    aliases.push(preferred);
  }
  const { data, error } = await requireSupabase()
    .from('students')
    .update({ metadata, name_aliases: aliases })
    .eq('id', student.id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function patchStudentMetadata(
  student: StudentRow,
  key: string,
  value: string | null,
): Promise<StudentRow> {
  return updateStudentMetadata(student, setMetaKey(student.metadata, key, value));
}

export async function listPendingRosterImports(classId: string): Promise<RosterImportRow[]> {
  const { data, error } = await requireSupabase()
    .from('roster_imports')
    .select('*')
    .eq('class_id', classId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRosterImport(input: {
  classId: string;
  photoAssetId: string;
  suggestions: RosterImportRow['suggestions'];
}): Promise<RosterImportRow> {
  const { data, error } = await requireSupabase()
    .from('roster_imports')
    .insert({
      class_id: input.classId,
      photo_asset_id: input.photoAssetId,
      status: 'pending',
      suggestions: input.suggestions,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function markRosterImportConfirmed(importId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('roster_imports')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', importId);
  if (error) throw error;
}

export async function deleteRosterImport(importId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_delete_roster_import', { p_import_id: importId });
  if (error) throw error;
}

export async function addTypedStudent(
  classId: string,
  teacherId: string,
  displayName: string,
): Promise<RosterStudent> {
  const name = displayName.trim();
  if (!name) throw new Error('Student name is required');
  const { added, skipped } = await addConfirmedStudents({
    classId,
    teacherId,
    names: [name],
    createdVia: 'typed',
  });
  if (added[0]) return added[0];
  throw new Error(skipped[0] ? `${skipped[0]} is already on this roster.` : 'Student name is required');
}
