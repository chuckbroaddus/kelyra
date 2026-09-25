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
