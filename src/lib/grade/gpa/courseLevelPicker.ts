/**
 * Course level picker options — FR-LVL-01 / catalog.
 * Pure list + tiny presentational helper; admin assigns level, not teachers.
 */
import type { CourseLevel } from './gpa.ts';
import { courseLevelPickerOptions } from './gpa.ts';

export type CourseLevelOption = {
  key: string;
  label: string;
  weighted_bonus: number;
};

export function listCourseLevelOptions(levels?: CourseLevel[]): CourseLevelOption[] {
  return courseLevelPickerOptions(levels).map((l) => ({
    key: l.key,
    label: l.label,
    weighted_bonus: l.weighted_bonus,
  }));
}

export function labelForCourseLevel(
  key: string,
  levels?: CourseLevel[],
): string {
  const hit = listCourseLevelOptions(levels).find((l) => l.key === key);
  if (hit) return hit.label;
  if (key === 'dual') return 'Dual Credit / Dual Enrollment';
  return key;
}
