import type { CalendarSeat } from './types.ts';

/**
 * Map active chrome role → calendar p_seat.
 * Dual-hat: declared chrome only — never OR hats (CAL-S1-04 / S2-01).
 */
export function calendarSeatForChrome(role: string | null | undefined): CalendarSeat | null {
  if (!role) return null;
  if (role === 'teacher') return 'teacher';
  if (role === 'student') return 'student';
  if (role === 'parent') return 'parent';
  if (role === 'superintendent' || role === 'administrator') return 'office';
  return null;
}
