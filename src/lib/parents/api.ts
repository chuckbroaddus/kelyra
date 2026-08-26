import { asSubmissionStatus, submissionStatusLabel } from '@/lib/assignments/status';
import { firstName } from '@/lib/format';
import { metaString, setMetaKey } from '@/lib/people/metadata';
import { hydratePhotoUrls, signedProfileUrl } from '@/lib/people/photos';
import { provisionParentLogin } from '@/lib/school/api';
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
  await provisionParentLogin(parent.id).catch(() => undefined);
  return { parent, token };
}

export async function getParent(parentId: string): Promise<ParentRow> {
  const supabase = requireSupabase();
  const direct = await supabase.from('parents').select('*').eq('id', parentId).maybeSingle();
  if (!direct.error && direct.data) return direct.data;
  const rpc = await supabase.rpc('get_parent_card', { p_parent_id: parentId });
  const card = !rpc.error ? (Array.isArray(rpc.data) ? rpc.data[0] : rpc.data) : null;
  if (card) return card;
  throw direct.error ?? rpc.error ?? new Error('Could not load parent');
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

type DirectoryRow = ParentRow & { pool: string; children: ClassParent['children'] };

function mapDirectory(rows: DirectoryRow[]): {
  linked: ClassParent[];
  unlinked: ClassParent[];
  available: ClassParent[];
} {
  const linked: ClassParent[] = [];
  const unlinked: ClassParent[] = [];
  const available: ClassParent[] = [];
  for (const row of rows) {
    const kids = Array.isArray(row.children) ? row.children : [];
    const item: ClassParent = { ...row, children: kids, inviteCount: 0, photoUrl: null };
    if (row.pool === 'linked') linked.push(item);
    else if (kids.length === 0) unlinked.push(item);
    else available.push(item);
  }
  return { linked, unlinked, available };
}

export async function listParentsForClass(classId: string): Promise<{
  linked: ClassParent[];
  unlinked: ClassParent[];
  available: ClassParent[];
}> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('class_parent_directory', { p_class_id: classId });
  if (!error && data?.length) {
    const grouped = mapDirectory(data as DirectoryRow[]);
    const all = [...grouped.linked, ...grouped.unlinked, ...grouped.available];
    const withPhotos = await hydratePhotoUrls(all);
    const photo = new Map(withPhotos.map((row) => [row.id, row.photoUrl]));
    const paint = (rows: ClassParent[]) => rows.map((row) => ({ ...row, photoUrl: photo.get(row.id) ?? null }));
    const filled = await fillAvailableWithOwnParents(classId, {
      linked: paint(grouped.linked),
      unlinked: paint(grouped.unlinked),
      available: paint([...grouped.unlinked, ...grouped.available]),
    });
    return filled;
  }

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
  if (!parents?.length) return { linked: [], unlinked: [], available: [] };

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
  const available: ClassParent[] = [];
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
    if (kids.some((child) => classStudentIds.has(child.id))) linked.push(item);
    else if (kids.length === 0) unlinked.push(item);
    else available.push(item);
  }
  return fillAvailableWithOwnParents(classId, {
    linked,
    unlinked,
    available: [...unlinked, ...available],
  });
}

async function fillAvailableWithOwnParents(
  _classId: string,
  pools: { linked: ClassParent[]; unlinked: ClassParent[]; available: ClassParent[] },
): Promise<{ linked: ClassParent[]; unlinked: ClassParent[]; available: ClassParent[] }> {
  const supabase = requireSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const teacherId = auth.user?.id;
  if (!teacherId) return pools;
  const mine = await listParentsForTeacher(teacherId);
  const have = new Set([...pools.linked, ...pools.available].map((row) => row.id));
  const extra = mine.filter((row) => !have.has(row.id));
  if (!extra.length) return pools;
  const hydrated = await hydratePhotoUrls(extra);
  return {
    ...pools,
    available: [
      ...pools.available,
      ...hydrated.map((row) => ({ ...row, children: [] as ClassParent['children'], inviteCount: 0 })),
    ],
  };
}

export async function removeParentFromClass(classId: string, parentId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('remove_parent_from_class', {
    p_class_id: classId,
    p_parent_id: parentId,
  });
  if (!error) return;
  const { removeEnrollment } = await import('@/lib/students/delete');
  const { data: links } = await supabase.from('parent_students').select('student_id').eq('parent_id', parentId);
  const { data: enrollments } = await supabase.from('enrollments').select('student_id').eq('class_id', classId);
  const inClass = new Set((enrollments ?? []).map((row) => row.student_id));
  for (const row of links ?? []) {
    if (inClass.has(row.student_id)) await removeEnrollment(classId, row.student_id);
  }
}

export async function addParentToClass(
  classId: string,
  parentId: string,
  childIds: string[] = [],
): Promise<number> {
  const { data, error } = await requireSupabase().rpc('add_parent_to_class', {
    p_class_id: classId,
    p_parent_id: parentId,
  });
  if (!error) return data ?? 0;
  const { enrollExistingStudent } = await import('@/lib/students/api');
  for (const childId of childIds) {
    await enrollExistingStudent(classId, childId);
  }
  if (childIds.length) return childIds.length;
  throw new Error(error.message || 'Could not add that parent');
}

async function loadAllParentRows(): Promise<ParentRow[]> {
  const supabase = requireSupabase();
  const rpc = await supabase.rpc('school_parents_for_link');
  if (!rpc.error && rpc.data?.length) return rpc.data;
  const fallback = await supabase.from('parents').select('*').order('display_name', { ascending: true });
  if (!fallback.error && fallback.data?.length) return fallback.data;
  return rpc.data ?? fallback.data ?? [];
}

async function attachChildren(parents: ParentRow[]): Promise<ClassParent[]> {
  if (!parents.length) return [];
  const supabase = requireSupabase();
  const hydrated = await hydratePhotoUrls(parents);
  const { data: links } = await supabase
    .from('parent_students')
    .select('parent_id, student_id')
    .in(
      'parent_id',
      hydrated.map((row) => row.id),
    );
  const childIds = [...new Set((links ?? []).map((row) => row.student_id))];
  const { data: kids } = childIds.length
    ? await supabase.from('students').select('id, display_name, photo_asset_id').in('id', childIds)
    : { data: [] as Array<Pick<StudentRow, 'id' | 'display_name' | 'photo_asset_id'>> };
  const kidsWithPhotos = await hydratePhotoUrls(kids ?? []);
  const kidById = new Map(kidsWithPhotos.map((row) => [row.id, row]));
  const withKids: ClassParent[] = hydrated.map((parent) => ({
    ...parent,
    children: (links ?? [])
      .filter((row) => row.parent_id === parent.id)
      .flatMap((row) => {
        const child = kidById.get(row.student_id);
        if (!child) return [];
        return [{ id: child.id, display_name: child.display_name, photoUrl: child.photoUrl }];
      }),
    inviteCount: 0,
  }));
  const missing = withKids.filter((parent) => parent.children.length === 0);
  if (missing.length) {
    await Promise.all(
      missing.map(async (parent) => {
        const children = await listChildrenForParent(parent.id).catch(() => []);
        parent.children = children.map((child) => ({
          id: child.id,
          display_name: child.display_name,
          photoUrl: child.photoUrl,
        }));
      }),
    );
  }
  return withKids;
}

export async function listParentsForLinking(): Promise<ClassParent[]> {
  return attachChildren(await loadAllParentRows());
}

function putParent(into: Map<string, ClassParent>, parent: ClassParent) {
  const have = into.get(parent.id);
  if (!have) {
    into.set(parent.id, parent);
    return;
  }
  if (parent.children.length > have.children.length) {
    into.set(parent.id, { ...have, children: parent.children, photoUrl: have.photoUrl ?? parent.photoUrl });
  }
}

export type OfficeRosterKid = { id: string; display_name: string; photoUrl?: string | null };

function childRef(child: OfficeRosterKid): ClassParent['children'][number] {
  return { id: child.id, display_name: child.display_name, photoUrl: child.photoUrl ?? null };
}

function ensureChild(parent: ClassParent, child: OfficeRosterKid): ClassParent {
  if (parent.children.some((row) => row.id === child.id)) return parent;
  return { ...parent, children: [...parent.children, childRef(child)] };
}

export async function listOfficeClassParents(
  roster: OfficeRosterKid[],
  extraStudentIds: string[] = [],
): Promise<{ linked: ClassParent[]; available: ClassParent[] }> {
  const inClass = new Set(roster.map((row) => row.id));
  const rosterById = new Map(roster.map((row) => [row.id, row]));
  const { listDirectory } = await import('@/lib/school/api');
  const lookupIds = [...new Set([...inClass, ...extraStudentIds])];
  const [cards, people, fromRoster] = await Promise.all([
    listParentsForLinking().catch(() => [] as ClassParent[]),
    listDirectory().catch(() => []),
    Promise.all(
      lookupIds.map(async (studentId) => {
        const parents = await listParentsForStudent(studentId).catch(() => [] as ClassParent[]);
        const kid = rosterById.get(studentId);
        return parents.map((parent) => (kid ? ensureChild(parent, kid) : parent));
      }),
    ).then((rows) => rows.flat()),
  ]);
  const byId = new Map<string, ClassParent>();
  const linkedIds = new Set<string>();
  for (const row of cards) putParent(byId, row);
  for (const row of fromRoster) {
    putParent(byId, row);
    linkedIds.add(row.id);
  }

  const parentPeople = people.filter((row) => row.parent_id || row.role === 'parent');
  await Promise.all(
    parentPeople.map(async (person) => {
      const cardId = person.parent_id;
      if (!cardId) return;
      const have = byId.get(cardId);
      if (have?.children.length) {
        if (!have.photoUrl && person.photoUrl) have.photoUrl = person.photoUrl;
        return;
      }
      const kids = await listChildrenForParent(cardId).catch(() => []);
      const children = kids.map((child) => childRef(child));
      if (have) {
        putParent(byId, { ...have, children, photoUrl: have.photoUrl ?? person.photoUrl });
        return;
      }
      const card = await getParent(cardId).catch(() => null);
      putParent(byId, {
        id: cardId,
        teacher_id: card?.teacher_id ?? person.id,
        display_name: card?.display_name || person.display_name || person.username,
        sort_name: card?.sort_name ?? person.display_name,
        photo_asset_id: card?.photo_asset_id ?? null,
        metadata: card?.metadata ?? {},
        created_at: card?.created_at ?? person.created_at,
        created_via: card?.created_via ?? 'typed',
        photoUrl: person.photoUrl,
        children,
        inviteCount: 0,
      });
    }),
  );

  const linked: ClassParent[] = [];
  const available: ClassParent[] = [];
  for (const parent of byId.values()) {
    if (linkedIds.has(parent.id) || parent.children.some((child) => inClass.has(child.id))) linked.push(parent);
    else available.push(parent);
  }
  const byName = (a: ClassParent, b: ClassParent) => a.display_name.localeCompare(b.display_name);
  linked.sort(byName);
  available.sort(byName);
  return { linked, available };
}

export async function listParentsForStudent(studentId: string): Promise<ClassParent[]> {
  const supabase = requireSupabase();
  const listed = await supabase.rpc('student_parents', { p_student_id: studentId });
  let parents = !listed.error && listed.data?.length ? listed.data : null;
  if (!parents) {
    const { data: links, error } = await supabase.from('parent_students').select('parent_id').eq('student_id', studentId);
    if (error) throw error;
    if (!links?.length) return [];
    const { data, error: parentError } = await supabase
      .from('parents')
      .select('*')
      .in(
        'id',
        links.map((row) => row.parent_id),
      );
    if (parentError) throw parentError;
    parents = data ?? [];
  }
  return hydrateLinkedParents(parents);
}

async function hydrateLinkedParents(parents: ParentRow[]): Promise<ClassParent[]> {
  if (!parents.length) return [];
  const supabase = requireSupabase();
  const hydrated = await hydratePhotoUrls(parents);
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
  const rows: ClassParent[] = hydrated.map((parent) => ({
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
  const missing = rows.filter((parent) => parent.children.length === 0);
  if (missing.length) {
    await Promise.all(
      missing.map(async (parent) => {
        const children = await listChildrenForParent(parent.id).catch(() => []);
        parent.children = children.map((child) => ({
          id: child.id,
          display_name: child.display_name,
          photoUrl: child.photoUrl,
        }));
      }),
    );
  }
  return rows;
}

export async function listChildrenForParent(parentId: string): Promise<
  Array<StudentRow & { photoUrl: string | null }>
> {
  const supabase = requireSupabase();
  const listed = await supabase.rpc('parent_children', { p_parent_id: parentId });
  if (!listed.error && listed.data?.length) {
    return hydratePhotoUrls(listed.data);
  }
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
  const supabase = requireSupabase();
  const rpc = await supabase.rpc('admin_set_parent_link', {
    p_parent_id: parentId,
    p_student_id: studentId,
    p_link: true,
  });
  if (!rpc.error) return;
  const { error } = await supabase.from('parent_students').insert({
    parent_id: parentId,
    student_id: studentId,
  });
  if (!error || /duplicate|unique/i.test(error.message)) return;
  throw new Error(rpc.error.message || error.message || 'Could not link that family');
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

async function progressFromOpenRow(row: ParentOpenRow | null): Promise<ParentProgress | null> {
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

export async function loadParentProgress(token: string): Promise<ParentProgress | null> {
  const { data, error } = await requireSupabase().rpc('parent_open', { p_token: token.trim() });
  if (error) throw error;
  return progressFromOpenRow((data?.[0] ?? null) as ParentOpenRow | null);
}

export async function loadParentProgressMine(): Promise<ParentProgress | null> {
  const { data, error } = await requireSupabase().rpc('parent_open_mine');
  if (error) throw new Error(error.message || 'Could not load your children');
  return progressFromOpenRow((data?.[0] ?? null) as ParentOpenRow | null);
}

export function parentInviteUrl(token: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/parent?t=${token}`;
  }
  return `/parent?t=${token}`;
}

export function formatPracticeStatus(status: string | null): string {
  return submissionStatusLabel(status) || 'None yet';
}

export function formatLessonStatus(status: string | null | undefined): string {
  return submissionStatusLabel(status) || 'None yet';
}

export function familyPracticeWords(status: string | null): string {
  const next = asSubmissionStatus(status);
  if (next === 'graded') return 'graded';
  if (next === 'completed') return 'completed';
  if (next === 'started') return 'started';
  if (next === 'assigned') return 'assigned';
  return 'none yet';
}

export function parentStatusLine(parent: ClassParent): string {
  const n = parent.children.length;
  const kids = n === 0 ? 'No children' : n === 1 ? firstName(parent.children[0]!.display_name) : `${n} children`;
  const rel = metaString(parent.metadata, 'relationship');
  return [rel ? relationshipWord(rel, metaString(parent.metadata, 'relationship_other')) : null, kids]
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
