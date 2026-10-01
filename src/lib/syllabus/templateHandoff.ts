/**
 * In-memory hand-off from school template picker → Syllabus screen (same JS runtime).
 * Consumed once on focus.
 */

const store = new Map<string, { key: string; at: number }>();

export function putSyllabusTemplateHandoff(classId: string, templateKey: string): void {
  store.set(classId, { key: templateKey, at: Date.now() });
}

/** Returns and clears the pending template key (ignores entries older than 30 min). */
export function takeSyllabusTemplateHandoff(classId: string): string | null {
  const hit = store.get(classId);
  store.delete(classId);
  if (!hit) return null;
  if (Date.now() - hit.at > 30 * 60 * 1000) return null;
  return hit.key;
}
