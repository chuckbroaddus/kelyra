/** Classes tab default order: alphabetical by class name (Chuck 2026-09-25).
 *  Case-insensitive, numbers in natural order ("Period 2" before "Period 10"). */
export function sortClassesByName<T extends { name?: string | null }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base', numeric: true }),
  );
}
