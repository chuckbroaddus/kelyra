/**
 * Client mirror of supabase/functions/_shared/homeworkGrading.ts cleanHomeworkStudentName.
 * Client code does not import from supabase/functions; homeworkName.test.ts keeps both in lockstep.
 */
const PLACEHOLDER_NAME_RE =
  /^(?:name|student(?:\s+name)?|first\s+last|first\s+name(?:\s+last\s+name)?|last\s+name|full\s+name|your\s+name|unknown|unknown\s+student|n\/?a|none|null|blank|illegible|unreadable|not\s+visible|no\s+name|anonymous|redacted|\[?\s*redacted\s*\]?|\?+|_+|-+|\.+|x+)$/i;

/** Placeholder-safe paper name ("Name:", "[redacted]", "First Last" → null). */
export function cleanHomeworkStudentName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (/\[\s*(?:redacted|name|student|illegible|unreadable)[^\]]*\]|<\s*name\s*>|\{\s*name\s*\}/i.test(s)) return null;
  s = s.replace(/^(?:student\s+)?name\s*[:\-–—]\s*/i, '').trim();
  s = s.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  if (!s || PLACEHOLDER_NAME_RE.test(s)) return null;
  if (!/[\p{L}]{2,}/u.test(s)) return null;
  return s;
}

/** Other readable student names on a two-student frame (excludes the primary). */
export function otherHomeworkStudents(primary: string | null, students: unknown): string[] {
  const rows = Array.isArray(students) ? students : [];
  const p = (primary ?? '').toLowerCase();
  const out: string[] = [];
  for (const row of rows) {
    const name = cleanHomeworkStudentName(typeof row === 'string' ? row : (row as { name?: unknown } | null)?.name);
    if (!name || name.toLowerCase() === p || out.some((n) => n.toLowerCase() === name.toLowerCase())) continue;
    out.push(name);
  }
  return out;
}
