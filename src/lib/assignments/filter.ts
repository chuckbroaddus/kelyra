export function assignmentCategoryKey(row: { category?: string | null }): string {
  return row.category ?? 'homework';
}

export function matchesAssignmentFilter(row: { category?: string | null }, filter: string): boolean {
  if (filter === 'all') return true;
  return assignmentCategoryKey(row) === filter;
}

export function comingDueAssignments<T extends { due_at?: string | null }>(
  rows: T[],
  now = Date.now(),
  limit = 8,
): T[] {
  return rows
    .filter((row) => row.due_at && new Date(row.due_at).getTime() >= now)
    .slice()
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, limit);
}
