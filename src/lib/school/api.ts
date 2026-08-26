import { requireSupabase } from '@/lib/supabase/client';
import type { AuditEventRow, ProfileRow, SchoolRole } from '@/lib/supabase/types';

import { handleFromInput } from '@/lib/school/roles';

export async function lookupLoginEmail(handle: string): Promise<string | null> {
  const raw = handle.trim();
  if (!raw) return null;
  if (raw.includes('@') && raw.includes('.')) return raw;
  try {
    const { data, error } = await requireSupabase().rpc('login_identifier', {
      p_handle: handleFromInput(raw),
    });
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}

export async function loadMyProfile(): Promise<ProfileRow | null> {
  const supabase = requireSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data;
}

export async function claimSuperintendent(): Promise<ProfileRow> {
  const { data, error } = await requireSupabase().rpc('school_claim_superintendent');
  if (error) throw error;
  return data;
}

export async function getProfile(id: string): Promise<ProfileRow> {
  const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', id).single();
  if (error) throw new Error(error.message || 'Could not load profile');
  return data;
}

export async function updateProfileDetails(input: {
  profileId: string;
  displayName: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}): Promise<ProfileRow> {
  const { data, error } = await requireSupabase().rpc('update_profile_details', {
    p_profile_id: input.profileId,
    p_display_name: input.displayName,
    p_username: handleFromInput(input.username),
    p_email: input.email.trim(),
    p_phone: input.phone,
    p_address: input.address,
    p_notes: input.notes,
  });
  if (error) throw new Error(error.message || error.details || 'Could not save profile');
  return data;
}

export async function listProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('*')
    .order('display_name', { ascending: true });
  if (error) throw new Error(error.message || error.details || 'Could not load people');
  return data ?? [];
}

export type ProvisionedLogin = {
  profileId: string;
  studentId: string;
  displayName: string;
  username: string;
  email: string;
  tempPassword: string | null;
  created: boolean;
};

function mapProvisioned(row: {
  profile_id: string;
  student_id: string;
  display_name: string;
  username: string;
  email: string;
  temp_password: string | null;
  created: boolean;
}): ProvisionedLogin {
  return {
    profileId: row.profile_id,
    studentId: row.student_id,
    displayName: row.display_name,
    username: row.username,
    email: row.email,
    tempPassword: row.temp_password,
    created: row.created,
  };
}

export async function provisionStudentLogin(studentId: string): Promise<ProvisionedLogin> {
  const { data, error } = await requireSupabase().rpc('admin_provision_student_login', {
    p_student_id: studentId,
  });
  if (error) throw new Error(error.message || error.details || 'Could not create student login');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Could not create student login');
  return mapProvisioned(row);
}

export type DirectoryPerson = ProfileRow & {
  classId: string | null;
  className: string | null;
  photoUrl: string | null;
  hasChildren: boolean;
};

export async function provisionParentLogin(parentId: string): Promise<ProvisionedLogin> {
  const { data, error } = await requireSupabase().rpc('admin_provision_parent_login', {
    p_parent_id: parentId,
  });
  if (error) throw new Error(error.message || error.details || 'Could not create parent login');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Could not create parent login');
  return {
    profileId: row.profile_id,
    studentId: row.parent_id,
    displayName: row.display_name,
    username: row.username,
    email: row.email,
    tempPassword: row.temp_password,
    created: row.created,
  };
}

export async function listDirectory(): Promise<DirectoryPerson[]> {
  const { photoUrlsForProfiles } = await import('@/lib/people/photos');
  const people = await listProfiles();
  const studentIds = [...new Set(people.map((row) => row.student_id).filter((id): id is string => Boolean(id)))];
  const parentIds = [...new Set(people.map((row) => row.parent_id).filter((id): id is string => Boolean(id)))];
  const supabase = requireSupabase();

  const [{ data: enrollments }, { data: childLinks }] = await Promise.all([
    studentIds.length
      ? supabase.from('enrollments').select('student_id, class_id').in('student_id', studentIds)
      : Promise.resolve({ data: [] as Array<{ student_id: string; class_id: string }> }),
    parentIds.length
      ? supabase.from('parent_students').select('parent_id, student_id').in('parent_id', parentIds)
      : Promise.resolve({ data: [] as Array<{ parent_id: string; student_id: string }> }),
  ]);

  const childIds = [...new Set((childLinks ?? []).map((row) => row.student_id))];
  const [{ data: childRows }, { data: childEnrollments }] = await Promise.all([
    childIds.length
      ? supabase.from('students').select('id, display_name').in('id', childIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string }> }),
    childIds.length
      ? supabase.from('enrollments').select('student_id, class_id').in('student_id', childIds)
      : Promise.resolve({ data: [] as Array<{ student_id: string; class_id: string }> }),
  ]);

  const classIds = [
    ...new Set([
      ...(enrollments ?? []).map((row) => row.class_id),
      ...(childEnrollments ?? []).map((row) => row.class_id),
    ]),
  ];
  const { data: classes } = classIds.length
    ? await supabase.from('classes').select('id, name').in('id', classIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const classNameById = new Map((classes ?? []).map((row) => [row.id, row.name]));
  const classByStudent = new Map<string, { classId: string; className: string }>();
  for (const row of enrollments ?? []) {
    if (classByStudent.has(row.student_id)) continue;
    classByStudent.set(row.student_id, {
      classId: row.class_id,
      className: classNameById.get(row.class_id) ?? 'Class',
    });
  }
  const classByChild = new Map<string, string>();
  for (const row of childEnrollments ?? []) {
    if (!classByChild.has(row.student_id)) classByChild.set(row.student_id, row.class_id);
  }
  const childNameById = new Map((childRows ?? []).map((row) => [row.id, row.display_name]));
  const childrenByParent = new Map<string, string[]>();
  const classByParent = new Map<string, string>();
  for (const row of childLinks ?? []) {
    const names = childrenByParent.get(row.parent_id) ?? [];
    const name = childNameById.get(row.student_id);
    if (name) names.push(name);
    childrenByParent.set(row.parent_id, names);
    if (!classByParent.has(row.parent_id)) {
      const classId = classByChild.get(row.student_id);
      if (classId) classByParent.set(row.parent_id, classId);
    }
  }

  const photos = await photoUrlsForProfiles(people);

  return people.map((row) => {
    const photoUrl = photos.get(row.id) ?? null;
    if (row.student_id) {
      const klass = classByStudent.get(row.student_id);
      return {
        ...row,
        classId: klass?.classId ?? null,
        className: klass?.className ?? null,
        photoUrl,
        hasChildren: false,
      };
    }
    if (row.parent_id) {
      const classId = classByParent.get(row.parent_id) ?? null;
      const kids = childrenByParent.get(row.parent_id) ?? [];
      return {
        ...row,
        classId,
        className: kids.length ? kids.join(' · ') : classId ? classNameById.get(classId) ?? null : null,
        photoUrl,
        hasChildren: kids.length > 0,
      };
    }
    return { ...row, classId: null, className: null, photoUrl, hasChildren: false };
  });
}

export async function resetLoginPassword(profileId: string, password: string): Promise<void> {
  const { error } = await requireSupabase().rpc('admin_reset_login_password', {
    p_profile_id: profileId,
    p_password: password,
  });
  if (error) throw new Error(error.message || error.details || 'Could not reset password');
}

export async function createLogin(input: {
  email: string;
  password: string;
  username: string;
  role: SchoolRole;
  displayName: string;
  mustChange?: boolean;
  alsoParent?: boolean;
  alsoAdministrator?: boolean;
  alsoTeacher?: boolean;
}): Promise<string> {
  const { data, error } = await requireSupabase().rpc('admin_create_login', {
    p_email: input.email.trim(),
    p_password: input.password,
    p_username: handleFromInput(input.username),
    p_role: input.role,
    p_display_name: input.displayName.trim(),
    p_must_change: input.mustChange ?? true,
    p_also_parent: input.alsoParent ?? input.role === 'parent',
    p_also_administrator: input.alsoAdministrator ?? false,
    p_also_teacher: input.alsoTeacher ?? false,
  });
  if (error) throw new Error(error.message || error.details || 'Could not create account');
  return data;
}

export async function setAlsoHat(profileId: string, hat: 'administrator' | 'teacher', also: boolean): Promise<void> {
  const { error } = await requireSupabase().rpc('admin_set_also_hat', {
    p_profile_id: profileId,
    p_hat: hat,
    p_also: also,
  });
  if (error) throw new Error(error.message || error.details || 'Could not update hats');
}

export async function setAlsoParent(profileId: string, also: boolean): Promise<string | null> {
  const { data, error } = await requireSupabase().rpc('admin_set_also_parent', {
    p_profile_id: profileId,
    p_also: also,
  });
  if (error) throw new Error(error.message || error.details || 'Could not update parent identity');
  return data;
}

export async function setStudentLink(profileId: string, studentId: string | null): Promise<void> {
  const { error } = await requireSupabase().rpc('admin_set_student_link', {
    p_profile_id: profileId,
    p_student_id: studentId,
  });
  if (error) throw new Error(error.message || error.details || 'Could not assign login');
}

export async function setParentLink(parentId: string, studentId: string, link: boolean): Promise<void> {
  const { error } = await requireSupabase().rpc('admin_set_parent_link', {
    p_parent_id: parentId,
    p_student_id: studentId,
    p_link: link,
  });
  if (error) throw new Error(error.message || error.details || 'Could not update that family link');
}

export async function setParentCardLink(profileId: string, parentId: string | null): Promise<void> {
  const { error } = await requireSupabase().rpc('admin_set_parent_card_link', {
    p_profile_id: profileId,
    p_parent_id: parentId,
  });
  if (error) throw new Error(error.message || error.details || 'Could not assign login');
}

export async function listAuditEvents(): Promise<AuditEventRow[]> {
  const { data, error } = await requireSupabase()
    .from('audit_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data ?? [];
}

export async function writeAudit(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  studentId?: string | null;
  classId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}): Promise<void> {
  const { error } = await requireSupabase().rpc('write_audit', {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_student_id: input.studentId ?? null,
    p_class_id: input.classId ?? null,
    p_before: input.before ?? null,
    p_after: input.after ?? null,
  });
  if (error) throw error;
}

export async function updatePassword(next: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw error;
  const { data: user } = await supabase.auth.getUser();
  if (user.user) {
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.user.id);
  }
}
