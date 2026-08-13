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
  const { data, error } = await supabase
    .from('classes')
    .insert({ teacher_id: teacherId, name: trimmed, name_source: 'typed' })
    .select('*')
    .single();
  if (error) throw error;

  await supabase.from('teachers').update({ active_class_id: data.id }).eq('id', teacherId);
  return data;
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
