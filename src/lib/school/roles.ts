import type { SchoolRole } from '@/lib/supabase/types';

export const SCHOOL_ROLES: SchoolRole[] = [
  'superintendent',
  'administrator',
  'teacher',
  'parent',
  'student',
];

export type ProfileHats = {
  role?: SchoolRole | null;
  parent_id?: string | null;
  also_administrator?: boolean | null;
  also_teacher?: boolean | null;
};

type RoleLike = SchoolRole | ProfileHats | null | undefined;

function asHats(value: RoleLike): ProfileHats | null {
  if (!value) return null;
  if (typeof value === 'string') return { role: value };
  return value;
}

export function isStaffRole(value: RoleLike): boolean {
  const hats = asHats(value);
  if (!hats?.role) return false;
  return hats.role === 'superintendent' || hats.role === 'administrator' || hats.role === 'teacher';
}

export function isAdminRole(value: RoleLike): boolean {
  const hats = asHats(value);
  if (!hats?.role) return false;
  return hats.role === 'superintendent' || hats.role === 'administrator' || Boolean(hats.also_administrator);
}

/** School office seat — People, Activity, alerts. Not the classroom Needs-you pile. */
export function isOfficeRole(value: RoleLike): boolean {
  const hats = asHats(value);
  return hats?.role === 'superintendent' || hats?.role === 'administrator';
}

export function isTeacherRole(value: RoleLike): boolean {
  const hats = asHats(value);
  if (!hats?.role) return false;
  return hats.role === 'teacher' || Boolean(hats.also_teacher);
}

export function isAlsoParent(profile: ProfileHats | null | undefined): boolean {
  return Boolean(profile?.parent_id) || profile?.role === 'parent';
}

export function canAlsoBeAdministrator(role: SchoolRole | null | undefined): boolean {
  return role === 'superintendent';
}

export function canAlsoBeTeacher(role: SchoolRole | null | undefined): boolean {
  return role === 'superintendent' || role === 'administrator';
}

export function roleLabel(role: SchoolRole): string {
  if (role === 'superintendent') return 'Superintendent';
  if (role === 'administrator') return 'Administrator';
  if (role === 'teacher') return 'Teacher';
  if (role === 'parent') return 'Parent';
  return 'Student';
}

export function handleFromInput(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function formatHandle(username: string): string {
  return `@${username.replace(/^@+/, '')}`;
}

export function roleStatus(value: RoleLike, alsoParent?: boolean): string {
  const hats = asHats(value);
  if (!hats?.role) return '';
  if (hats.role === 'student') return 'Student';
  const parts: string[] = [];
  if (hats.role === 'superintendent') parts.push('Superintendent');
  if (hats.role === 'administrator' || hats.also_administrator) parts.push('Administrator');
  if (hats.role === 'teacher' || hats.also_teacher) parts.push('Teacher');
  if (alsoParent || isAlsoParent(hats)) parts.push('Parent');
  return parts.join(' · ') || roleLabel(hats.role);
}

export const STAFF_PROFILE_FIELDS = [
  { key: 'display_name', label: 'Name' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'notes', label: 'Notes' },
] as const;

export type StaffProfileFieldKey = (typeof STAFF_PROFILE_FIELDS)[number]['key'];

/** A parent may edit a linked child's identity and details — not teacher academic fields. */
export const PARENT_EDITABLE_CHILD_KEYS = [
  'display_name',
  'preferred_name',
  'birthday',
  'grade_or_age',
  'phone',
  'email',
  'address',
  'emergency_name',
  'emergency_phone',
  'allergies',
  'notes',
] as const;

export function isProtectedStaff(profile: ProfileHats | null | undefined): boolean {
  if (!profile?.role) return false;
  return profile.role === 'superintendent' || profile.role === 'administrator' || Boolean(profile.also_administrator);
}

export function canEditProfile(
  actor: (ProfileHats & { id?: string }) | null | undefined,
  target: (ProfileHats & { id?: string }) | null | undefined,
): boolean {
  if (!actor?.role || !target) return false;
  if (actor.id && target.id && actor.id === target.id) return true;
  if (actor.role === 'superintendent') return true;
  if (isAdminRole(actor) && !isProtectedStaff(target)) return true;
  return false;
}

export const PERMISSION_MATRIX: Array<{
  capability: string;
  superintendent: string;
  administrator: string;
  teacher: string;
  parent: string;
  student: string;
}> = [
  { capability: 'Create accounts', superintendent: 'All roles', administrator: 'All except second Superintendent', teacher: 'No', parent: 'No', student: 'No' },
  { capability: 'Create classes / assign teachers', superintendent: 'Yes', administrator: 'Yes', teacher: 'Own classes only', parent: 'No', student: 'No' },
  { capability: 'Also an administrator (same login)', superintendent: 'Yes', administrator: '—', teacher: 'No', parent: 'No', student: 'No' },
  { capability: 'Also a teacher (same login)', superintendent: 'Yes', administrator: 'Yes', teacher: '—', parent: 'No', student: 'No' },
  { capability: 'Also a parent (same login)', superintendent: 'Yes', administrator: 'Yes', teacher: 'Yes', parent: '—', student: 'No' },
  { capability: 'Link parent ↔ student', superintendent: 'Yes', administrator: 'Yes', teacher: 'No', parent: 'No', student: 'No' },
  { capability: 'Add roster name (not a login)', superintendent: 'Yes', administrator: 'Yes', teacher: 'Own classes', parent: 'No', student: 'No' },
  { capability: 'Capture / Approve / grade', superintendent: 'Yes (logged)', administrator: 'Yes (logged)', teacher: 'Own classes', parent: 'No', student: 'Own practice only' },
  { capability: 'View grade book / heatmap', superintendent: 'School', administrator: 'School', teacher: 'Own classes', parent: 'No', student: 'Own marks only' },
  { capability: 'Edit a login profile', superintendent: 'Anyone', administrator: 'Anyone except Super / other admins', teacher: 'Own profile', parent: 'Own profile', student: 'Own profile' },
  { capability: 'Edit child profile details', superintendent: 'Yes', administrator: 'Yes except other Super/admins', teacher: 'Yes (their students)', parent: 'Linked children (all details)', student: 'Own limited fields later' },
  { capability: 'Add a child / invent a student', superintendent: 'Creates accounts', administrator: 'Creates accounts', teacher: 'Roster name only', parent: 'No', student: 'No' },
  { capability: 'Message', superintendent: 'Anyone', administrator: 'Anyone', teacher: 'Own students + their parents + staff', parent: 'Child’s teachers + admins', student: 'Own teachers + admins' },
  { capability: 'View audit log', superintendent: 'Read', administrator: 'Read', teacher: 'No', parent: 'No', student: 'No' },
  { capability: 'Edit / delete audit log', superintendent: 'No', administrator: 'No', teacher: 'No', parent: 'No', student: 'No' },
];
