import type { AuditEventRow } from '@/lib/supabase/types';

import { roleLabel } from '@/lib/school/roles';
import type { SchoolRole } from '@/lib/supabase/types';

const ACTION_LABELS: Record<string, string> = {
  update_profile: 'Updated a profile',
  create_login: 'Created a login',
  claim_superintendent: 'Claimed superintendent',
  set_also_parent: 'Marked as also a parent',
  clear_also_parent: 'Removed the parent hat',
  set_also_hat: 'Changed an extra hat',
  clear_also_hat: 'Changed an extra hat',
  link_parent_student: 'Linked a parent to a student',
  unlink_parent_student: 'Unlinked a parent from a student',
  create_class: 'Created a class',
  delete_class: 'Deleted a class',
  add_student: 'Added a student',
  delete_student: 'Deleted a student',
  set_capability_grant: 'Changed a permission',
  set_feed_icon: 'Changed a feed icon',
  set_school_name: 'Named the school',
  set_school_logo: 'Changed the school logo',
};

export function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]!;
  return action
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function roleDisplay(role: string | null | undefined): string {
  if (!role) return 'Unknown role';
  if (role === 'superintendent' || role === 'administrator' || role === 'teacher' || role === 'parent' || role === 'student') {
    return roleLabel(role as SchoolRole);
  }
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function joinBits(parts: Array<string | null | undefined>): string | null {
  const bits = parts.filter((part): part is string => Boolean(part));
  return bits.length ? bits.join(' · ') : null;
}

/** Human subject of the event — never a raw id. */
export function auditSubject(row: AuditEventRow): string | null {
  const after = row.after ?? {};
  const before = row.before ?? {};
  const username = text(after.username) ?? text(before.username);
  const handle = username ? `@${username.replace(/^@+/, '')}` : null;
  const name = text(after.display_name) ?? text(before.display_name);
  const email = text(after.email) ?? text(before.email);
  const role = text(after.role);
  const hat = text(after.hat);

  if (row.action === 'set_also_hat' || row.action === 'clear_also_hat') {
    if (hat) return `${after.on === false ? 'Removed' : 'Added'} the ${hat} hat`;
  }
  if (row.action === 'set_also_parent') return 'Marked this login as also a parent';
  if (row.action === 'clear_also_parent') return 'Removed the parent hat';
  if (row.action === 'link_parent_student') return 'Linked a parent and a student';
  if (row.action === 'unlink_parent_student') return 'Unlinked a parent and a student';
  if (row.action === 'create_login') {
    return joinBits([name, handle, role ? roleDisplay(role) : null, email]);
  }
  if (row.action === 'update_profile') {
    return joinBits([name, handle, email]);
  }
  if (row.action === 'create_class' || row.action === 'delete_class') {
    return text(after.name) ?? text(before.name);
  }
  if (row.action === 'add_student' || row.action === 'delete_student') {
    return text(after.display_name) ?? text(before.display_name);
  }
  if (row.action === 'set_capability_grant') {
    return joinBits([text(after.capability_id), text(after.role), text(after.access)]);
  }
  return joinBits([name, handle, email]);
}
