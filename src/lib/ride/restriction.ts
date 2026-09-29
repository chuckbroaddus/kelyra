/** Active row ids for this student+parent pair only (null parent ≠ any parent). */
export function pickupRestrictionClearTargets(
  rows: Array<{ id: string; student_id: string; parent_id: string | null; active: boolean }>,
  studentId: string,
  parentId: string | null,
): string[] {
  return rows
    .filter((r) => r.active && r.student_id === studentId && r.parent_id === parentId)
    .map((r) => r.id);
}
