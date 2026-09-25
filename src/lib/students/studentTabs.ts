/** Pure student-view tab config — no React Native imports (unit-testable). */

import { isOfficeChromeRole } from '../chrome/seat.ts';

export type StudentViewTab = {
  key: string;
  label: string;
  icon: 'focus' | 'history' | 'work' | 'practice' | 'parents' | 'details' | 'classes';
};

/** Teacher seat: Focus · Skill history · Work · Practice · Parents · Details. */
export const TEACHER_STUDENT_TABS: StudentViewTab[] = [
  { key: 'focus', label: 'Focus', icon: 'focus' },
  { key: 'history', label: 'Skill history', icon: 'history' },
  { key: 'work', label: 'Work', icon: 'work' },
  { key: 'practice', label: 'Practice', icon: 'practice' },
  { key: 'parents', label: 'Parents', icon: 'parents' },
  { key: 'details', label: 'Details', icon: 'details' },
];

/** Office/superintendent seat: Details · Parents · Classes (read-only class rows). */
export const OFFICE_STUDENT_TABS: StudentViewTab[] = [
  { key: 'details', label: 'Details', icon: 'details' },
  { key: 'parents', label: 'Parents', icon: 'parents' },
  { key: 'classes', label: 'Classes', icon: 'classes' },
];

/**
 * Tab row for the active chrome seat.
 * Office (superintendent / administrator) → details+parents+classes.
 * Teacher seat (including dual-hat admin in Teach) → full teacher row.
 */
export function studentTabsForChromeRole(role: string | null | undefined): StudentViewTab[] {
  if (isOfficeChromeRole(role)) return OFFICE_STUDENT_TABS;
  return TEACHER_STUDENT_TABS;
}

/** Create-assignment plus only on teacher seat. */
export function studentTabsShowAssignPlus(role: string | null | undefined): boolean {
  return !isOfficeChromeRole(role);
}

/** Skip focus/work/practice fetches on office seat. */
export function studentTabsLoadTeacherData(role: string | null | undefined): boolean {
  return !isOfficeChromeRole(role);
}

/**
 * Resolve ?tab= against the seat's visible tabs.
 * Hidden deep links fall back to the seat default (details office, focus teacher).
 */
export function studentTabFromParam(
  role: string | null | undefined,
  tabParam?: string | string[] | null,
): string {
  const tabs = studentTabsForChromeRole(role);
  const defaultKey = tabs[0]?.key ?? 'details';
  const raw = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  if (typeof raw === 'string' && tabs.some((item) => item.key === raw)) return raw;
  return defaultKey;
}
