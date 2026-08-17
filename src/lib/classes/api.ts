import { generateJoinCode } from '@/lib/classes/joinCode';
import { requireSupabase } from '@/lib/supabase/client';
import type { ClassRow } from '@/lib/supabase/types';

export async function listClasses(): Promise<ClassRow[]> {
  const { data, error } = await requireSupabase()
    .from('classes')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createClass(name: string, teacherId: string): Promise<ClassRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Class name is required');

  const supabase = requireSupabase();
  const data = await insertClassWithCode(teacherId, trimmed);
  await supabase.from('teachers').update({ active_class_id: data.id }).eq('id', teacherId);
  return data;
}

async function insertClassWithCode(teacherId: string, name: string): Promise<ClassRow> {
  const supabase = requireSupabase();
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from('classes')
      .insert({
        teacher_id: teacherId,
        name,
        name_source: 'typed',
        join_code: generateJoinCode(),
      })
      .select('*')
      .single();
    if (!error && data) return data;
    lastError = error ?? new Error('Could not create class');
    if (error && !/join_code|duplicate|unique/i.test(error.message)) throw error;
  }
  throw lastError ?? new Error('Could not create class');
}

export async function rotateJoinCode(classId: string): Promise<ClassRow> {
  const supabase = requireSupabase();
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from('classes')
      .update({ join_code: generateJoinCode() })
      .eq('id', classId)
      .select('*')
      .single();
    if (!error && data) return data;
    lastError = error ?? new Error('Could not update join code');
    if (error && !/join_code|duplicate|unique/i.test(error.message)) throw error;
  }
  throw lastError ?? new Error('Could not update join code');
}

export async function getClass(classId: string): Promise<ClassRow> {
  const { data, error } = await requireSupabase()
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();
  if (error) throw error;
  return data;
}

export async function setActiveClass(teacherId: string, classId: string) {
  const { error } = await requireSupabase()
    .from('teachers')
    .update({ active_class_id: classId })
    .eq('id', teacherId);
  if (error) throw error;
}

export async function resolveCaptureClass(
  teacherId: string,
  activeClassId: string | null,
): Promise<ClassRow> {
  if (activeClassId) {
    try {
      return await getClass(activeClassId);
    } catch {
      // Fall through to first class if the saved id is stale.
    }
  }
  const classes = await listClasses();
  if (!classes[0]) {
    throw new Error('Create a class before capturing work.');
  }
  await setActiveClass(teacherId, classes[0].id);
  return classes[0];
}
