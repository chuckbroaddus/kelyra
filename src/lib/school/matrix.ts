import type { SchoolRole } from '@/lib/supabase/types';

import { isAlsoParent, type ProfileHats, SCHOOL_ROLES } from '@/lib/school/roles';

/** What the software allows — not a classic RACI letter. */
export type Access = 'none' | 'own' | 'school' | 'all';

export const ACCESS_LEVELS: Access[] = ['none', 'own', 'school', 'all'];

export const ACCESS_LABEL: Record<Access, string> = {
  none: 'None',
  own: 'Own',
  school: 'School',
  all: 'All',
};

export const ACCESS_HELP: Record<Access, string> = {
  none: 'Cannot do this.',
  own: 'Self, own classes, or own children only.',
  school: 'The whole school office view.',
  all: 'Break-glass. Includes other admins / the superintendent seat.',
};

export type Capability = {
  id: string;
  area: string;
  label: string;
  help: string;
  superintendent: Access;
  administrator: Access;
  teacher: Access;
  parent: Access;
  student: Access;
};

export type GrantMap = Record<string, Record<SchoolRole, Access>>;

/** Product defaults — what the app does today. Superintendent includes the office. */
export const CAPABILITIES: Capability[] = [
  { id: 'school.home', area: 'School', label: 'School home', help: 'The School / House landing screen.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'own', student: 'own' },
  { id: 'school.settings', area: 'School', label: 'App settings', help: 'Theme and device settings popup.', superintendent: 'own', administrator: 'own', teacher: 'own', parent: 'own', student: 'own' },
  { id: 'school.matrix', area: 'School', label: 'Edit this matrix', help: 'Change who may do what, then the app follows.', superintendent: 'all', administrator: 'none', teacher: 'none', parent: 'none', student: 'none' },
  { id: 'school.identity', area: 'School', label: 'School name and logo', help: 'Wordmark and mark in the header.', superintendent: 'all', administrator: 'none', teacher: 'none', parent: 'none', student: 'none' },

  { id: 'accounts.view', area: 'People', label: 'See logins', help: 'People list and directory.', superintendent: 'school', administrator: 'school', teacher: 'school', parent: 'school', student: 'school' },
  { id: 'accounts.create', area: 'People', label: 'Create logins', help: 'Make a new account.', superintendent: 'all', administrator: 'school', teacher: 'none', parent: 'none', student: 'none' },
  { id: 'accounts.reset_password', area: 'People', label: 'Reset someone else’s password', help: 'Office sets a temporary password. They must change it at next sign-in. Not self-service.', superintendent: 'all', administrator: 'school', teacher: 'none', parent: 'none', student: 'none' },
  { id: 'accounts.edit', area: 'People', label: 'Edit login profiles', help: 'Name, handle, email, contact.', superintendent: 'all', administrator: 'school', teacher: 'own', parent: 'own', student: 'own' },
  { id: 'accounts.hats', area: 'People', label: 'Extra hats', help: 'Also administrator / teacher / parent.', superintendent: 'all', administrator: 'school', teacher: 'none', parent: 'none', student: 'none' },
  { id: 'accounts.link_parent', area: 'People', label: 'Link parent ↔ student', help: 'Who is a parent of which child.', superintendent: 'school', administrator: 'school', teacher: 'none', parent: 'none', student: 'none' },

  { id: 'classes.view', area: 'Classes', label: 'See classes', help: 'List of classes. Own = classes you teach. School = every class.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'own' },
  { id: 'classes.create', area: 'Classes', label: 'Create a class', help: 'Office opens an unassigned class, then assigns a teacher.', superintendent: 'own', administrator: 'own', teacher: 'none', parent: 'none', student: 'none' },
  { id: 'classes.overview', area: 'Classes', label: 'Class office card', help: 'Name, teacher, roster — not the teacher desk.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'none' },
  { id: 'classes.teach', area: 'Classes', label: 'Teacher desk', help: 'Today, Capture, Inbox, grade book for a class.', superintendent: 'none', administrator: 'none', teacher: 'own', parent: 'none', student: 'none' },
  { id: 'classes.delete', area: 'Classes', label: 'Delete a class', help: 'Hard-delete a class and its work.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'none' },

  { id: 'roster.view', area: 'Roster', label: 'See roster names', help: 'Students in a class.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'own', student: 'own' },
  { id: 'roster.add', area: 'Roster', label: 'Add a roster name', help: 'Enroll an existing school student. Creating a person is office-only.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'none' },
  { id: 'roster.delete', area: 'Roster', label: 'Delete a student', help: 'Remove the person record.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'none' },

  { id: 'capture.use', area: 'Records', label: 'Capture work', help: 'Photograph or voice-note work.', superintendent: 'none', administrator: 'none', teacher: 'own', parent: 'none', student: 'none' },
  { id: 'capture.approve', area: 'Records', label: 'Approve / grade', help: 'Teacher last click. Nothing is a grade until Approve.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'none' },
  { id: 'gradebook.view', area: 'Records', label: 'View grade book', help: 'Marks grid.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'own' },
  { id: 'heatmap.view', area: 'Records', label: 'View heatmap', help: 'Who is stuck where.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'none' },
  { id: 'assignments.manage', area: 'Records', label: 'Assignments', help: 'Keys, units, planned work.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'own' },

  { id: 'parents.view', area: 'Family', label: 'See parents', help: 'Parent people for a class.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'own', student: 'none' },
  { id: 'parents.invite', area: 'Family', label: 'Link a parent', help: 'Attach a parent login to a child.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'none' },
  { id: 'children.view', area: 'Family', label: 'See own children', help: 'Parent progress.', superintendent: 'own', administrator: 'own', teacher: 'own', parent: 'own', student: 'none' },
  { id: 'children.edit', area: 'Family', label: 'Edit child details', help: 'Name and contact on a linked child.', superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'own', student: 'none' },

  { id: 'messages.use', area: 'Messages', label: 'In-app messages', help: '1:1 threads.', superintendent: 'school', administrator: 'school', teacher: 'school', parent: 'school', student: 'school' },
  { id: 'audit.view', area: 'Audit', label: 'View activity log', help: 'Who changed what.', superintendent: 'school', administrator: 'school', teacher: 'none', parent: 'none', student: 'none' },
  { id: 'audit.mutate', area: 'Audit', label: 'Edit or delete the log', help: 'Nobody. The log is append-only.', superintendent: 'none', administrator: 'none', teacher: 'none', parent: 'none', student: 'none' },
];

const RANK: Record<Access, number> = { none: 0, own: 1, school: 2, all: 3 };

export function nextAccess(current: Access): Access {
  const i = ACCESS_LEVELS.indexOf(current);
  return ACCESS_LEVELS[(i + 1) % ACCESS_LEVELS.length]!;
}

export function maxAccess(levels: Access[]): Access {
  return levels.reduce((best, item) => (RANK[item] > RANK[best] ? item : best), 'none');
}

export function grantsFromCapabilities(rows: Capability[] = CAPABILITIES): GrantMap {
  const map: GrantMap = {};
  for (const row of rows) {
    map[row.id] = {
      superintendent: row.superintendent,
      administrator: row.administrator,
      teacher: row.teacher,
      parent: row.parent,
      student: row.student,
    };
  }
  return map;
}

export function applyGrants(rows: Capability[], grants: GrantMap): Capability[] {
  return rows.map((row) => {
    const g = grants[row.id];
    if (!g) return row;
    return { ...row, ...g };
  });
}

export function accessForHats(profile: ProfileHats | null | undefined, capabilityId: string, grants?: GrantMap): Access {
  if (!profile?.role) return 'none';
  const row = (grants ?? grantsFromCapabilities())[capabilityId];
  if (!row) return 'none';
  const levels: Access[] = [row[profile.role]];
  if (profile.role === 'superintendent') levels.push(row.administrator);
  if (profile.also_administrator) levels.push(row.administrator);
  if (profile.also_teacher) levels.push(row.teacher);
  if (isAlsoParent(profile)) levels.push(row.parent);
  return maxAccess(levels);
}

export function can(profile: ProfileHats | null | undefined, capabilityId: string, need: Access = 'own', grants?: GrantMap): boolean {
  return RANK[accessForHats(profile, capabilityId, grants)] >= RANK[need];
}

export { SCHOOL_ROLES };
