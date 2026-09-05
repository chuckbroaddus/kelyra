import assert from 'node:assert/strict';
import test from 'node:test';

import { ledgerToCsv } from './exportCsv.ts';
import type { LedgerEventRow } from './types.ts';

test('ledgerToCsv exports filtered owner rows as CSV', () => {
  const rows: LedgerEventRow[] = [
    {
      id: '1',
      owner_profile_id: 'u1',
      seat: 'teacher',
      action: 'approve_grade',
      action_family: 'grade',
      entity_type: 'submission',
      entity_id: 's1',
      class_id: 'c1',
      student_id: 'st1',
      summary: 'Graded Johnny 87',
      before_snippet: null,
      after_snippet: null,
      source_audit_id: null,
      created_at: '2026-09-05T12:00:00.000Z',
    },
  ];
  const csv = ledgerToCsv(rows);
  assert.match(csv, /^created_at,action_family,action,summary/);
  assert.match(csv, /Graded Johnny 87/);
  assert.match(csv, /grade,approve_grade/);
  assert.doesNotMatch(csv, /diary body|end-to-end/i);
});
