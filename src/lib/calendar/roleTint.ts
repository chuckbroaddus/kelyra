import type { Palette } from '@/constants/theme';
import type { CalendarRoleTint } from './types.ts';

/** Canonical ≤4 role tints (VZ-A / CAL-31). Never invent per-calendar hues. */
export const ROLE_TINTS = ['academic', 'school', 'sport', 'personal'] as const;

export type RoleTintId = (typeof ROLE_TINTS)[number];

export function normalizeRoleTint(raw: string | null | undefined): RoleTintId {
  const v = (raw ?? '').toLowerCase();
  if (v === 'school') return 'school';
  if (v === 'sport') return 'sport';
  if (v === 'personal' || v === 'absence') return 'personal';
  return 'academic';
}

/** Map role tint → existing palette token (no rainbow). */
export function roleTintColor(tint: string | null | undefined, colors: Palette): string {
  switch (normalizeRoleTint(tint)) {
    case 'school':
      return colors.ink;
    case 'sport':
      return colors.good;
    case 'personal':
      return colors.warn;
    case 'academic':
    default:
      return colors.brand;
  }
}

export function roleTintLabel(tint: string | null | undefined): string {
  switch (normalizeRoleTint(tint)) {
    case 'school':
      return 'School';
    case 'sport':
      return 'Sport';
    case 'personal':
      return 'Personal';
    case 'academic':
    default:
      return 'Academic';
  }
}
