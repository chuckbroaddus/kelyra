import { firstName } from '@/lib/format';
import { metaString, setMetaKey } from '@/lib/people/metadata';
import { hydratePhotoUrls, signedProfileUrl } from '@/lib/people/photos';
import { requireSupabase } from '@/lib/supabase/client';
import type {
  ParentAccessRow,
  ParentCreatedVia,
  ParentOpenChild,
  ParentOpenRow,
  ParentRow,
  StudentRow,
} from '@/lib/supabase/types';

export type ParentChildProgress = ParentOpenChild & { photoUrl: string | null };

export type ParentProgress = {
  parentId: string;
  parentName: string;
  parentPhotoUrl: string | null;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  preferredContact: string | null;
  children: ParentChildProgress[];
};

export type ClassParent = ParentRow & {
  photoUrl: string | null;
  children: Array<{ id: string; display_name: string; photoUrl: string | null }>;
  inviteCount: number;
};

function makeToken(): string {
  return Array.from({ length: 24 }, () =>
    'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)],
  ).join('');
}

export async function createParent(input: {
  teacherId: string;
  displayName: string;
  createdVia?: ParentCreatedVia;
  metadata?: Record<string, unknown>;
  studentId?: string;
  alsoInvite?: boolean;
}): Promise<{ parent: ParentRow; token?: string }> {
  const name = input.displayName.replace(/\s+/g, ' ').trim();
  if (!name) throw new Error('Parent name is required');
  const supabase = requireSupabase();
  const { data: parent, error } = await supabase
    .from('parents')
    .insert({
      teacher_id: input.teacherId,
      display_name: name,
      sort_name: name,
      created_via: input.createdVia ?? 'typed',
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();
  if (error) throw error;
  if (input.studentId) {
    await linkChild(parent.id, input.studentId);
  }
  let token: string | undefined;
  if (input.alsoInvite) {
    token = await createParentInvite(parent.id, input.studentId);
  }
  return { parent, token };
}

export async function getParent(parentId: string): Promise<ParentRow> {
  const { data, error } = await requireSupabase().from('parents').select('*').eq('id', parentId).single();
  if (error) throw error;
  return data;
}

export async function renameParent(parentId: string, displayName: string): Promise<ParentRow> {
  const name = displayName.replace(/\s+/g, ' ').trim();
  if (!name) throw new Error('Parent name is required');
  const { data, error } = await requireSupabase()
    .from('parents')
    .update({ display_name: name, sort_name: name })
    .eq('id', parentId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateParentMetadata(
  parentId: string,
  metadata: Record<string, unknown>,
): Promise<ParentRow> {
  const { data, error } = await requireSupabase()
    .from('parents')
    .update({ metadata })
    .eq('id', parentId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function patchParentMetadata(
  parent: ParentRow,
  key: string,
  value: string | null,
): Promise<ParentRow> {
  return updateParentMetadata(parent.id, setMetaKey(parent.metadata, key, value));
}

export async function listParentsForTeacher(teacherId: string): Promise<ParentRow[]> {
  const { data, error } = await requireSupabase()
    .from('parents')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('display_name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listParentsForClass(classId: string): Promise<{
  linked: ClassParent[];
  unlinked: ClassParent[];
}> {
  const supabase = requireSupabase();
  const { data: enrollments, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId);
  if (enrollmentError) throw enrollmentError;
  const classStudentIds = new Set((enrollments ?? []).map((row) => row.student_id));

  const { data: parents, error: parentError } = await supabase
    .from('parents')
    .select('*')
    .order('display_name', { ascending: true });
  if (parentError) throw parentError;
  if (!parents?.length) return { linked: [], unlinked: [] };

  const parentIds = parents.map((row) => row.id);
  const [{ data: links }, { data: accesses }] = await Promise.all([
    supabase.from('parent_students').select('*').in('parent_id', parentIds),
    supabase.from('parent_accesses').select('parent_id').in('parent_id', parentIds),
  ]);
  const studentIds = [...new Set((links ?? []).map((row) => row.student_id))];
  const { data: students } = studentIds.length
    ? await supabase.from('students').select('*').in('id', studentIds)
    : { data: [] as StudentRow[] };
  const studentById = new Map((students ?? []).map((row) => [row.id, row]));
  const studentsWithPhotos = await hydratePhotoUrls(students ?? []);
  const photoByStudent = new Map(studentsWithPhotos.map((row) => [row.id, row.photoUrl]));
  const parentsWithPhotos = await hydratePhotoUrls(parents);
  const inviteCount = new Map<string, number>();
  for (const row of accesses ?? []) {
    inviteCount.set(row.parent_id, (inviteCount.get(row.parent_id) ?? 0) + 1);
  }

  const linked: ClassParent[] = [];
  const unlinked: ClassParent[] = [];
  for (const parent of parentsWithPhotos) {
    const kids = (links ?? [])
      .filter((row) => row.parent_id === parent.id)
      .flatMap((row) => {
        const student = studentById.get(row.student_id);
        if (!student) return [];
        return [
          {
            id: student.id,
            display_name: student.display_name,
            photoUrl: photoByStudent.get(student.id) ?? null,
          },
        ];
      });
    const item: ClassParent = {
      ...parent,
      children: kids,
      inviteCount: inviteCount.get(parent.id) ?? 0,
    };
    if (kids.length === 0) unlinked.push(item);
    else if (kids.some((child) => classStudentIds.has(child.id))) linked.push(item);
  }
  return { linked, unlinked };
}

export async function listParentsForStudent(studentId: string): Promise<ClassParent[]> {
  const supabase = requireSupabase();
  const { data: links, error } = await supabase
    .from('parent_students')
    .select('parent_id')
    .eq('student_id', studentId);
  if (error) throw error;
  if (!links?.length) return [];
  const { data: parents, error: parentError } = await supabase
    .from('parents')
    .select('*')
    .in(
      'id',
      links.map((row) => row.parent_id),
    );
  if (parentError) throw parentError;
  const hydrated = await hydratePhotoUrls(parents ?? []);
  const parentIds = hydrated.map((row) => row.id);
  const [{ data: accesses }, { data: allLinks }] = await Promise.all([
    supabase.from('parent_accesses').select('parent_id').in('parent_id', parentIds),
    supabase.from('parent_students').select('*').in('parent_id', parentIds),
  ]);
  const childIds = [...new Set((allLinks ?? []).map((row) => row.student_id))];
  const { data: kids } = childIds.length
    ? await supabase.from('students').select('id, display_name, photo_asset_id').in('id', childIds)
    : { data: [] as Array<Pick<StudentRow, 'id' | 'display_name' | 'photo_asset_id'>> };
  const kidsWithPhotos = await hydratePhotoUrls(kids ?? []);
  const kidById = new Map(kidsWithPhotos.map((row) => [row.id, row]));
  const inviteCount = new Map<string, number>();
  for (const row of accesses ?? []) {
    inviteCount.set(row.parent_id, (inviteCount.get(row.parent_id) ?? 0) + 1);
  }
  return hydrated.map((parent) => ({
    ...parent,
    children: (allLinks ?? [])
      .filter((row) => row.parent_id === parent.id)
      .flatMap((row) => {
        const child = kidById.get(row.student_id);
        if (!child) return [];
        return [{ id: child.id, display_name: child.display_name, photoUrl: child.photoUrl }];
      }),
    inviteCount: inviteCount.get(parent.id) ?? 0,
  }));
}

export async function listChildrenForParent(parentId: string): Promise<
  Array<StudentRow & { photoUrl: string | null }>
> {
  const supabase = requireSupabase();
  const { data: links, error } = await supabase
    .from('parent_students')
    .select('student_id')
    .eq('parent_id', parentId);
  if (error) throw error;
  if (!links?.length) return [];
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('*')
    .in(
      'id',
      links.map((row) => row.student_id),
    );
  if (studentError) throw studentError;
  return hydratePhotoUrls(students ?? []);
}

export async function listInvitesForParent(parentId: string): Promise<ParentAccessRow[]> {
  const { data, error } = await requireSupabase()
    .from('parent_accesses')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function linkChild(parentId: string, studentId: string): Promise<void> {
  const { error } = await requireSupabase().from('parent_students').insert({
    parent_id: parentId,
    student_id: studentId,
  });
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

export async function createParentInvite(parentId: string, studentIdHint?: string | null): Promise<string> {
  const token = makeToken();
  const { error } = await requireSupabase().from('parent_accesses').insert({
    parent_id: parentId,
    student_id: studentIdHint ?? null,
    token,
  });
  if (error) throw error;
  return token;
}

export async function loadParentProgress(token: string): Promise<ParentProgress | null> {
  const { data, error } = await requireSupabase().rpc('parent_open', { p_token: token.trim() });
  if (error) throw error;
  const row = (data?.[0] ?? null) as ParentOpenRow | null;
  if (!row) return null;
  const childrenRaw = Array.isArray(row.children) ? row.children : [];
  const children = await Promise.all(
    childrenRaw.map(async (child) => ({
      ...child,
      photoUrl: await signedProfileUrl(child.photo_path),
    })),
  );
  return {
    parentId: row.parent_id,
    parentName: row.parent_display_name,
    parentPhotoUrl: await signedProfileUrl(row.parent_photo_path),
    relationship: row.parent_relationship_other || row.parent_relationship,
    phone: row.parent_phone,
    email: row.parent_email,
    address: row.parent_address,
    preferredContact: row.parent_preferred_contact,
    children,
  };
}

export function parentInviteUrl(token: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/parent?t=${token}`;
  }
  return `/parent?t=${token}`;
}

export function formatPracticeStatus(status: string | null): string {
  if (status === 'submitted' || status === 'approved') return 'Done';
  if (status === 'assigned' || status === 'draft_scored') return 'Assigned';
  return 'None yet';
}

export function familyPracticeWords(status: string | null): string {
  if (status === 'submitted' || status === 'approved') return 'done';
  if (status === 'assigned' || status === 'draft_scored') return 'assigned';
  return 'none yet';
}

export function parentStatusLine(parent: ClassParent): string {
  const n = parent.children.length;
  const kids = n === 0 ? 'No children' : n === 1 ? firstName(parent.children[0]!.display_name) : `${n} children`;
  const invite = parent.inviteCount > 0 ? 'Linked' : 'No link';
  const rel = metaString(parent.metadata, 'relationship');
  return [rel ? relationshipWord(rel, metaString(parent.metadata, 'relationship_other')) : null, kids, invite]
    .filter(Boolean)
    .join(' · ');
}

function relationshipWord(rel: string, other: string | null): string {
  if (rel === 'mother') return 'Mother';
  if (rel === 'father') return 'Father';
  if (rel === 'guardian') return 'Guardian';
  if (rel === 'other') return other || 'Other';
  return rel;
}
