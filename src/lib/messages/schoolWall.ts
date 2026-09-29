import type { MessageThreadKind, ProfileRow, SchoolRole } from '@/lib/supabase/types';

/** School wall: null / empty school_id is never in the signed-in school. */
export function isSameSchool(
  mySchoolId: string | null | undefined,
  theirSchoolId: string | null | undefined,
): boolean {
  if (mySchoolId == null || mySchoolId === '') return false;
  if (theirSchoolId == null || theirSchoolId === '') return false;
  return mySchoolId === theirSchoolId;
}

export type SchoolWallPerson = {
  id: string;
  school_id: string | null | undefined;
  username: string;
  display_name: string | null;
  role: SchoolRole;
  photoUrl?: string | null;
};

export type SchoolWallThreadInput = {
  id: string;
  kind: MessageThreadKind;
  title: string | null;
  lastMessageAt: string;
  lastBody: string | null;
  lastFromMe: boolean;
  photoUrl: string | null;
  muted: boolean;
  unread: boolean;
  pinned: boolean;
  /** Other members (not the signed-in teacher). */
  otherIds: string[];
};

export type SchoolWallThreadPreview = {
  id: string;
  kind: MessageThreadKind;
  title: string | null;
  lastMessageAt: string;
  lastBody: string | null;
  lastFromMe: boolean;
  other: Pick<ProfileRow, 'id' | 'username' | 'display_name' | 'role'> | null;
  faces: Array<{ id: string; name: string; photoUrl: string | null }>;
  photoUrl: string | null;
  memberCount: number;
  muted: boolean;
  unread: boolean;
  pinned: boolean;
};

function personLabel(person: SchoolWallPerson): string {
  return (person.display_name || person.username || '').trim();
}

/** True when a saved group title is only an out-of-school person's name. */
export function titleIsOnlyOutOfSchoolName(
  title: string | null | undefined,
  outOfSchool: SchoolWallPerson[],
): boolean {
  const trimmed = title?.trim();
  if (!trimmed) return false;
  const needle = trimmed.toLowerCase();
  return outOfSchool.some((person) => {
    const full = personLabel(person).toLowerCase();
    const handle = person.username.trim().toLowerCase();
    return (full.length > 0 && full === needle) || (handle.length > 0 && handle === needle);
  });
}

/**
 * Apply the teacher messages school wall to one thread preview.
 * Returns null when the tray must hide the row (no in-school other person).
 * Does not delete memberships or profiles — list-only.
 */
export function applySchoolWallToThread(
  mySchoolId: string | null | undefined,
  thread: SchoolWallThreadInput,
  personById: Map<string, SchoolWallPerson>,
): SchoolWallThreadPreview | null {
  if (mySchoolId == null || mySchoolId === '') return null;

  const resolved = thread.otherIds.map((id) => personById.get(id)).filter(Boolean) as SchoolWallPerson[];
  const inSchool = resolved.filter((person) => isSameSchool(mySchoolId, person.school_id));
  const outOfSchool = resolved.filter((person) => !isSameSchool(mySchoolId, person.school_id));

  // Hide 1:1 / group when every other person is out of school (or unresolved).
  if (inSchool.length === 0) return null;

  let title = thread.title ?? null;
  if (titleIsOnlyOutOfSchoolName(title, outOfSchool)) {
    title = null;
  }

  const faces = inSchool.map((person) => ({
    id: person.id,
    name: personLabel(person) || person.username,
    photoUrl: person.photoUrl ?? null,
  }));

  const primary = inSchool[0]!;

  return {
    id: thread.id,
    kind: thread.kind,
    title,
    lastMessageAt: thread.lastMessageAt,
    lastBody: thread.lastBody,
    lastFromMe: thread.lastFromMe,
    other: {
      id: primary.id,
      username: primary.username,
      display_name: primary.display_name,
      role: primary.role,
    },
    faces,
    photoUrl: thread.photoUrl,
    memberCount: inSchool.length + 1,
    muted: thread.muted,
    unread: thread.unread,
    pinned: thread.pinned,
  };
}

/** Directory / add-person / compose picker: keep only same-school rows. */
export function filterDirectoryBySchool<T extends { id: string; school_id: string | null | undefined }>(
  mySchoolId: string | null | undefined,
  rows: T[],
): T[] {
  if (mySchoolId == null || mySchoolId === '') return [];
  return rows.filter((row) => isSameSchool(mySchoolId, row.school_id));
}

/** Thread member list: keep self and same-school people only. */
export function filterMembersBySchool<T extends { id: string; school_id: string | null | undefined }>(
  myId: string,
  mySchoolId: string | null | undefined,
  members: T[],
): T[] {
  if (mySchoolId == null || mySchoolId === '') {
    return members.filter((row) => row.id === myId);
  }
  return members.filter((row) => row.id === myId || isSameSchool(mySchoolId, row.school_id));
}
