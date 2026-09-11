/** Same-first-name roster collisions (twins / two Mateos). Never auto-pick. */

export type TwinCandidate = {
  studentId: string;
  displayName: string;
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Same-first-name roster collisions (twins / two Mateos).
 * Never auto-pick — teacher must Confirm one. Matcher still never INSERT.
 */
export function findTwinCandidates(
  spokenOrGuess: string,
  roster: Array<{ studentId: string; displayName: string; aliases?: string[] }>,
): TwinCandidate[] {
  const needle = normalizeName(spokenOrGuess).split(' ')[0] ?? '';
  if (!needle || needle.length < 2) return [];
  const hits = roster.filter((row) => {
    const names = [row.displayName, ...(row.aliases ?? [])].map(normalizeName).filter(Boolean);
    return names.some((name) => name.split(' ')[0] === needle);
  });
  if (hits.length < 2) return [];
  return hits.map((row) => ({ studentId: row.studentId, displayName: row.displayName }));
}
