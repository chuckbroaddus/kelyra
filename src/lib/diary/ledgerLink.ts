import type { LedgerEventRow } from './types.ts';

/** YYYY-MM-DD only — invalid/empty → null (fail closed for filter args). */
export function diaryFilterDate(raw: string | null | undefined): string | null {
  const value = String(raw ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const t = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(t)) return null;
  return value;
}

/**
 * Build an in-app href for a ledger row when entity ids are present.
 * Missing / incomplete pointers → null (summary only).
 */
export function ledgerDeepLinkHref(row: LedgerEventRow): string | null {
  const classId = row.class_id?.trim() || null;
  const entityId = row.entity_id?.trim() || null;
  const studentId = row.student_id?.trim() || null;
  const type = row.entity_type?.trim() || null;

  if (type === 'assignment' && entityId && classId) {
    return `/class/${classId}/assignment/${entityId}`;
  }
  if (type === 'submission' && entityId && classId) {
    return `/class/${classId}/review/${entityId}`;
  }
  if ((type === 'student' || type === 'capture') && studentId && classId) {
    return `/class/${classId}/student/${studentId}`;
  }
  if (
    (type === 'class' || type === 'syllabus' || row.action_family === 'syllabus') &&
    classId
  ) {
    return `/class/${classId}/syllabus`;
  }
  if (!type && studentId && classId) {
    return `/class/${classId}/student/${studentId}`;
  }
  return null;
}

/**
 * Confirm the linked entity is still readable for this seat (RLS).
 * Fail closed: missing href, deleted row, or forbidden → false. Never throws.
 */
export async function ledgerDeepLinkStillPermitted(row: LedgerEventRow): Promise<boolean> {
  const href = ledgerDeepLinkHref(row);
  if (!href) return false;
  try {
    const { requireSupabase } = await import('@/lib/supabase/client');
    const db = requireSupabase();
    const classId = row.class_id?.trim() || null;
    const entityId = row.entity_id?.trim() || null;
    const studentId = row.student_id?.trim() || null;
    const type = row.entity_type?.trim() || null;

    if (classId) {
      const { data: klass, error } = await db.from('classes').select('id').eq('id', classId).maybeSingle();
      if (error || !klass?.id) return false;
    }

    if (type === 'assignment' && entityId) {
      const { data, error } = await db.from('assignments').select('id').eq('id', entityId).maybeSingle();
      return Boolean(!error && data?.id);
    }
    if (type === 'submission' && entityId) {
      const { data, error } = await db.from('submissions').select('id').eq('id', entityId).maybeSingle();
      return Boolean(!error && data?.id);
    }
    if ((type === 'student' || type === 'capture' || (!type && studentId)) && studentId) {
      const { data, error } = await db.from('students').select('id').eq('id', studentId).maybeSingle();
      return Boolean(!error && data?.id);
    }
    if (type === 'class' || type === 'syllabus' || row.action_family === 'syllabus') {
      return Boolean(classId);
    }
    return false;
  } catch {
    return false;
  }
}

/** Newest default; flip for oldest-first. Stable for Apply refresh. */
export function sortDiaryEntries<T extends { entry_date: string; created_at: string }>(
  rows: T[],
  oldestFirst: boolean,
): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const byDate = a.entry_date.localeCompare(b.entry_date);
    if (byDate !== 0) return oldestFirst ? byDate : -byDate;
    const byCreated = a.created_at.localeCompare(b.created_at);
    return oldestFirst ? byCreated : -byCreated;
  });
  return copy;
}
