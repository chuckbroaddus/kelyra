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

/** Minimal PostgREST-shaped client for stillPermitted (real Supabase or unit stub). */
export type LedgerLinkDb = {
  from: (table: string) => LedgerLinkTable;
};

type LedgerLinkTable = {
  select: (cols: string) => LedgerLinkFilter;
};

type LedgerLinkFilter = {
  eq: (col: string, val: string) => LedgerLinkFilter;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
};

type ProbeOk = { ok: true; row: Record<string, unknown> };
type ProbeFail = { ok: false };

async function probe(
  db: LedgerLinkDb,
  table: string,
  cols: string,
  filters: Array<[string, string]>,
): Promise<ProbeOk | ProbeFail> {
  let q: LedgerLinkFilter = db.from(table).select(cols);
  for (const [col, val] of filters) {
    q = q.eq(col, val);
  }
  const { data, error } = await q.maybeSingle();
  if (error || !data || typeof data.id !== 'string' || !data.id) return { ok: false };
  return { ok: true, row: data };
}

/**
 * Confirm the linked entity is still readable for this seat (RLS).
 * Fail closed: missing href, deleted row, forbidden, or class_id mismatch → false.
 * When classId is present, entity probes re-bind to that class (assignments.class_id,
 * submissions → assignments.class_id, students → enrollments). Never throws.
 *
 * @param db optional injectable client (unit tests); defaults to requireSupabase().
 */
export async function ledgerDeepLinkStillPermitted(
  row: LedgerEventRow,
  db?: LedgerLinkDb,
): Promise<boolean> {
  const href = ledgerDeepLinkHref(row);
  if (!href) return false;
  try {
    const client =
      db ??
      ((await import('@/lib/supabase/client')).requireSupabase() as unknown as LedgerLinkDb);
    const classId = row.class_id?.trim() || null;
    const entityId = row.entity_id?.trim() || null;
    const studentId = row.student_id?.trim() || null;
    const type = row.entity_type?.trim() || null;

    if (classId) {
      const klass = await probe(client, 'classes', 'id', [['id', classId]]);
      if (!klass.ok) return false;
    }

    if (type === 'assignment' && entityId) {
      const filters: Array<[string, string]> = [['id', entityId]];
      if (classId) filters.push(['class_id', classId]);
      const hit = await probe(client, 'assignments', 'id', filters);
      return hit.ok;
    }

    if (type === 'submission' && entityId) {
      // submissions have no class_id — re-bind via parent assignment when classId present
      const sub = await probe(client, 'submissions', 'id, assignment_id', [['id', entityId]]);
      if (!sub.ok) return false;
      if (!classId) return true;
      const assignmentId = typeof sub.row.assignment_id === 'string' ? sub.row.assignment_id : '';
      if (!assignmentId) return false;
      const asg = await probe(client, 'assignments', 'id', [
        ['id', assignmentId],
        ['class_id', classId],
      ]);
      return asg.ok;
    }

    if ((type === 'student' || type === 'capture' || (!type && studentId)) && studentId) {
      if (classId) {
        // Soft student pointer is never ACL — enrollment bind is defense-in-depth only
        const enr = await probe(client, 'enrollments', 'id', [
          ['student_id', studentId],
          ['class_id', classId],
        ]);
        return enr.ok;
      }
      const stu = await probe(client, 'students', 'id', [['id', studentId]]);
      return stu.ok;
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
