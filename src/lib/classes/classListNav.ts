/** Pure class-list row navigation — entry-point gate, no React Native. */

import { isOfficeChromeRole } from '../chrome/seat.ts';

/**
 * Where the class row appears.
 * - main-classes: home Classes tab (always opens class detail)
 * - parent-classes-tab: parent person view Classes tab (office: read-only)
 * - student-classes-tab: student person view Classes tab (office: read-only)
 */
export type ClassListEntryPoint = 'main-classes' | 'parent-classes-tab' | 'student-classes-tab';

/**
 * Entry-point-based pressability (Chuck amendment).
 * Blocks only back-door lists; never locks class detail itself.
 */
export function classListRowPressable(
  entryPoint: ClassListEntryPoint,
  role: string | null | undefined,
): boolean {
  if (entryPoint === 'main-classes') return true;
  if (entryPoint === 'parent-classes-tab' || entryPoint === 'student-classes-tab') {
    return !isOfficeChromeRole(role);
  }
  return true;
}

/** Href for a class row, or null when the row must not navigate. */
export function classListRowNavTarget(
  entryPoint: ClassListEntryPoint,
  role: string | null | undefined,
  classId: string,
): string | null {
  if (!classId) return null;
  if (!classListRowPressable(entryPoint, role)) return null;
  // Home Classes: office opens the overview card; teacher opens the desk.
  if (entryPoint === 'main-classes') {
    return isOfficeChromeRole(role) ? `/admin/class/${classId}` : `/class/${classId}`;
  }
  return `/class/${classId}`;
}
