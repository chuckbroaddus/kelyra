import { canShowOfficeReset } from './resetPassword.ts';

type Actor = Parameters<typeof canShowOfficeReset>[0];
type Target = Parameters<typeof canShowOfficeReset>[1];

/**
 * PEOPLE-DEACTIVATE: office "Delete" deactivates (Chuck 2026-09-25). Blocks sign-in and hides
 * the person from People; keeps every record; Restore brings them back. Same wall as the
 * office password reset (server: admin_set_person_active).
 */
export function canDeactivatePerson(actor: Actor, target: Target): boolean {
  return canShowOfficeReset(actor, target);
}

export function isDeactivated(row: { deactivated_at?: string | null } | null | undefined): boolean {
  return Boolean(row?.deactivated_at);
}

export function deactivateConfirmCopy(name: string) {
  return {
    title: `Delete ${name}?`,
    body: `${name} will not be able to sign in and will be hidden from People. Their classes, work, messages, and records stay. You can restore them later from Show deleted people.`,
    confirmLabel: 'Delete',
  };
}

export function deactivatedStatus(handle: string): string {
  return `${handle} was deleted. They can no longer sign in. Restore them from Show deleted people.`;
}

export function restoredStatus(handle: string): string {
  return `${handle} was restored and can sign in again.`;
}

export function isPurged(row: { purged_at?: string | null } | null | undefined): boolean {
  return Boolean(row?.purged_at);
}

/** PEOPLE-PURGE: typed-name confirm. Their name stays on what they made (Chuck 2026-09-25). */
export function purgeConfirmCopy(name: string) {
  return {
    title: `Permanently delete ${name}?`,
    body: `${name}'s login and their links to classes, message threads, calendars, and duties are removed for good, along with their private journal and AI chats. Homework, grades, messages, and anything else they made stay, with their name on it.`,
    confirmLabel: 'Permanently delete',
  };
}

export function purgedStatus(name: string): string {
  return `${name} was permanently deleted.`;
}
