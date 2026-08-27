import { photoUrlsForProfiles } from '@/lib/people/photos';
import { listProfiles, writeAudit } from '@/lib/school/api';
import { isTeacherRole } from '@/lib/school/roles';
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

export type SchoolClass = ClassRow & {
  teacherName: string;
  teacherHandle: string | null;
};

export type ClassTeacher = {
  id: string;
  display_name: string;
  username: string | null;
  email: string | null;
  photoUrl: string | null;
};

async function asTeachers(ids: string[]): Promise<ClassTeacher[]> {
  if (!ids.length) return [];
  const supabase = requireSupabase();
  const [{ data: profiles }, { data: teachers }] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, email, student_id, parent_id').in('id', ids),
    supabase.from('teachers').select('id, display_name, email').in('id', ids),
  ]);
  const profileById = new Map((profiles ?? []).map((row) => [row.id, row]));
  const teacherById = new Map((teachers ?? []).map((row) => [row.id, row]));
  const photos = await photoUrlsForProfiles(
    (profiles ?? []).map((row) => ({
      id: row.id,
      student_id: row.student_id,
      parent_id: row.parent_id,
    })),
  ).catch(() => new Map<string, string | null>());
  return ids.map((id) => {
    const person = profileById.get(id);
    const teacher = teacherById.get(id);
    return {
      id,
      display_name: person?.display_name || teacher?.display_name || teacher?.email || person?.email || 'Teacher',
      username: person?.username ?? null,
      email: person?.email ?? teacher?.email ?? null,
      photoUrl: photos.get(id) ?? null,
    };
  });
}

export async function listClassTeachers(classId: string): Promise<ClassTeacher[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('class_teachers').select('teacher_id').eq('class_id', classId);
  if (!error) {
    return asTeachers((data ?? []).map((row) => row.teacher_id));
  }
  const klass = await getClass(classId);
  return klass.teacher_id ? asTeachers([klass.teacher_id]) : [];
}

export async function listAvailableTeachers(classId: string): Promise<ClassTeacher[]> {
  const [people, assigned] = await Promise.all([listProfiles(), listClassTeachers(classId)]);
  const have = new Set(assigned.map((row) => row.id));
  const eligible = people.filter((row) => isTeacherRole(row) && !have.has(row.id));
  return asTeachers(eligible.map((row) => row.id));
}

export async function addTeacherToClass(classId: string, teacherId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('add_teacher_to_class', {
    p_class_id: classId,
    p_teacher_id: teacherId,
  });
  if (error) throw new Error(error.message || 'Could not add that teacher');
  await writeAudit({
    action: 'add_teacher',
    entityType: 'class',
    entityId: classId,
    classId,
    after: { teacher_id: teacherId },
  }).catch(() => undefined);
}

export async function removeTeacherFromClass(classId: string, teacherId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('remove_teacher_from_class', {
    p_class_id: classId,
    p_teacher_id: teacherId,
  });
  if (error) throw new Error(error.message || 'Could not remove that teacher');
  await writeAudit({
    action: 'remove_teacher',
    entityType: 'class',
    entityId: classId,
    classId,
    after: { teacher_id: teacherId },
  }).catch(() => undefined);
}

export async function listSchoolClasses(): Promise<SchoolClass[]> {
  const supabase = requireSupabase();
  const classes = await listClasses();
  if (!classes.length) return [];
  const { data: links } = await supabase.from('class_teachers').select('class_id, teacher_id');
  const byClass = new Map<string, string[]>();
  for (const row of links ?? []) {
    const list = byClass.get(row.class_id) ?? [];
    list.push(row.teacher_id);
    byClass.set(row.class_id, list);
  }
  for (const row of classes) {
    if (!byClass.has(row.id) && row.teacher_id) byClass.set(row.id, [row.teacher_id]);
  }
  const ids = [...new Set([...byClass.values()].flat())];
  const named = ids.length ? await asTeachers(ids) : [];
  const byId = new Map(named.map((row) => [row.id, row]));
  return classes.map((row) => {
    const teachers = (byClass.get(row.id) ?? []).flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    });
    const first = teachers[0];
    return {
      ...row,
      teacherName: teachers.map((item) => item.display_name).join(', ') || 'No teacher',
      teacherHandle: first?.username ?? null,
    };
  });
}

export async function createClass(name: string): Promise<ClassRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Class name is required');

  const supabase = requireSupabase();
  const rpc = await supabase.rpc('create_school_class', { p_name: trimmed });
  if (rpc.error) throw new Error(rpc.error.message || 'Could not create class');
  const data = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
  if (!data) throw new Error('Could not create class');
  await writeAudit({
    action: 'create_class',
    entityType: 'class',
    entityId: data.id,
    classId: data.id,
    after: { name: data.name },
  }).catch(() => undefined);
  return data;
}

export async function listClassesForChildren(
  children: Array<{ id: string; display_name: string }>,
): Promise<Array<{ id: string; name: string; childNames: string[] }>> {
  const ids = [...new Set(children.map((child) => child.id).filter(Boolean))];
  if (!ids.length) return [];
  const supabase = requireSupabase();
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('class_id, student_id')
    .in('student_id', ids);
  if (error) throw error;
  if (!enrollments?.length) return [];
  const classIds = [...new Set(enrollments.map((row) => row.class_id))];
  const { data: classes, error: classError } = await supabase.from('classes').select('id, name').in('id', classIds);
  if (classError) throw classError;
  const className = new Map((classes ?? []).map((row) => [row.id, row.name]));
  const childName = new Map(children.map((child) => [child.id, child.display_name]));
  const namesByClass = new Map<string, string[]>();
  for (const row of enrollments) {
    const name = childName.get(row.student_id);
    if (!name) continue;
    const list = namesByClass.get(row.class_id) ?? [];
    if (!list.includes(name)) list.push(name);
    namesByClass.set(row.class_id, list);
  }
  return classIds.map((id) => ({
    id,
    name: className.get(id) ?? 'Class',
    childNames: namesByClass.get(id) ?? [],
  }));
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
