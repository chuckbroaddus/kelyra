/**
 * Pure helpers for working conduct marks (class + student + period).
 * DB load/upsert lives in conductMarksApi.ts.
 */

import type { ComputedPeriodInput } from './types.ts';

export type ClassConductMarkRow = {
  class_id: string;
  student_id: string;
  period_key: string;
  mark: string | null;
  updated_by?: string | null;
  updated_at?: string;
};

/** Nested map used by the gradebook Conduct tab: period → student → mark. */
export type ConductMarksByPeriod = Record<string, Record<string, string | null>>;

export function nestConductMarkRows(rows: ClassConductMarkRow[]): ConductMarksByPeriod {
  const out: ConductMarksByPeriod = {};
  for (const row of rows) {
    const period = String(row.period_key ?? '').trim();
    const studentId = String(row.student_id ?? '').trim();
    if (!period || !studentId) continue;
    const mark =
      row.mark == null || String(row.mark).trim() === '' ? null : String(row.mark).trim();
    if (!out[period]) out[period] = {};
    out[period]![studentId] = mark;
  }
  return out;
}

export function marksForPeriod(
  nested: ConductMarksByPeriod,
  periodKey: string,
): Record<string, string | null> {
  if (Object.prototype.hasOwnProperty.call(nested, periodKey)) {
    return { ...(nested[periodKey] ?? {}) };
  }
  const want = String(periodKey ?? '')
    .trim()
    .toLowerCase();
  if (!want) return {};
  for (const [key, marks] of Object.entries(nested)) {
    if (key.trim().toLowerCase() === want) return { ...marks };
  }
  return {};
}

/** Attach saved conduct onto pure postPeriod inputs for one period. */
export function applyConductToComputedInputs(
  computed: ComputedPeriodInput[],
  marksByStudent: Record<string, string | null | undefined>,
): ComputedPeriodInput[] {
  return computed.map((c) => {
    if (!Object.prototype.hasOwnProperty.call(marksByStudent, c.student_id)) {
      return { ...c, conduct: c.conduct ?? null };
    }
    const raw = marksByStudent[c.student_id];
    const conduct =
      raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    return { ...c, conduct };
  });
}

/** Attach saved conduct onto postMarkingPeriod RPC row payloads. */
export function applyConductToPostingRows<
  T extends { student_id: string; conduct?: string | null },
>(rows: T[], marksByStudent: Record<string, string | null | undefined>): T[] {
  return rows.map((r) => {
    if (!Object.prototype.hasOwnProperty.call(marksByStudent, r.student_id)) {
      return { ...r, conduct: r.conduct ?? null };
    }
    const raw = marksByStudent[r.student_id];
    const conduct =
      raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    return { ...r, conduct };
  });
}
