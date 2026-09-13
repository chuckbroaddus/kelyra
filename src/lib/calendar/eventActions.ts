import type { CalendarItem, CalendarSeat } from './types.ts';

export type EventMenuAction = {
  key: 'open-assignment' | 'edit' | 'delete' | 'view';
  label: string;
  disabled?: boolean;
  reason?: string | null;
  danger?: boolean;
};

/**
 * MG-A event menu. Assignment projection = Open assignment only (no calendar
 * soft-delete). Teacher cannot edit/delete office school events.
 * Parent edits/deletes own absence only (server re-checks owner).
 */
export function eventMenuActions(seat: CalendarSeat, item: CalendarItem): EventMenuAction[] {
  if (item.source === 'assignment') {
    return [{ key: 'open-assignment', label: 'Open assignment' }];
  }

  const actions: EventMenuAction[] = [{ key: 'view', label: 'View' }];
  const schoolEvent = item.visibility === 'school' || item.category === 'school';
  const absence = item.category === 'absence' || item.visibility === 'student_teachers';
  const personal = item.visibility === 'self';
  const classEvent = item.visibility === 'class';

  if (seat === 'office' && schoolEvent) {
    actions.push({ key: 'edit', label: 'Edit' });
    actions.push({ key: 'delete', label: 'Delete', danger: true });
    return actions;
  }

  if (schoolEvent && seat !== 'office') {
    actions.push({
      key: 'delete',
      label: 'Delete',
      disabled: true,
      reason: 'Managed by office',
    });
    return actions;
  }

  if (seat === 'teacher' && absence) {
    return actions; // view only — parent-owned
  }

  if (seat === 'teacher' && (classEvent || personal) && !item.isReadOnly) {
    actions.push({ key: 'edit', label: 'Edit' });
    actions.push({ key: 'delete', label: 'Delete', danger: true });
    return actions;
  }

  if (seat === 'parent' && absence) {
    actions.push({ key: 'edit', label: 'Edit' });
    actions.push({ key: 'delete', label: 'Delete', danger: true });
    return actions;
  }

  if ((seat === 'parent' || seat === 'student') && personal && !item.isReadOnly) {
    actions.push({ key: 'edit', label: 'Edit' });
    actions.push({ key: 'delete', label: 'Delete', danger: true });
    return actions;
  }

  return actions;
}

export function canCreateOnSeat(seat: CalendarSeat | null): boolean {
  return seat != null;
}
