import type { LedgerEventRow } from '@/lib/diary/types';

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Thin My Ledger export of the currently visible (filtered) owner rows only. */
export function ledgerToCsv(rows: LedgerEventRow[]): string {
  const header = [
    'created_at',
    'action_family',
    'action',
    'summary',
    'class_id',
    'student_id',
    'entity_type',
    'entity_id',
  ];
  const body = rows.map((row) =>
    [
      row.created_at,
      row.action_family,
      row.action,
      row.summary,
      row.class_id ?? '',
      row.student_id ?? '',
      row.entity_type ?? '',
      row.entity_id ?? '',
    ].map((cell) => escapeCsv(String(cell))),
  );
  return [header, ...body].map((line) => line.join(',')).join('\n');
}
