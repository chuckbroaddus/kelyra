import assert from 'node:assert/strict';
import test from 'node:test';

import {
  diaryFilterDate,
  ledgerDeepLinkHref,
  sortDiaryEntries,
} from './ledgerLink.ts';
import type { LedgerEventRow } from './types.ts';

function row(partial: Partial<LedgerEventRow>): LedgerEventRow {
  return {
    id: 'evt-1',
    owner_profile_id: 'u1',
    seat: 'teacher',
    action: 'assignment_upsert',
    action_family: 'assign',
    entity_type: null,
    entity_id: null,
    class_id: null,
    student_id: null,
    summary: 'Created assignment',
    before_snippet: null,
    after_snippet: null,
    source_audit_id: null,
    created_at: '2026-09-10T12:00:00.000Z',
    ...partial,
  };
}

test('diaryFilterDate accepts YYYY-MM-DD and fails closed on junk', () => {
  assert.equal(diaryFilterDate('2026-09-01'), '2026-09-01');
  assert.equal(diaryFilterDate(' 2026-09-01 '), '2026-09-01');
  assert.equal(diaryFilterDate(''), null);
  assert.equal(diaryFilterDate('09/01/2026'), null);
  assert.equal(diaryFilterDate('not-a-date'), null);
  assert.equal(diaryFilterDate('2026-13-40'), null);
});

test('ledgerDeepLinkHref maps assignment/submission/student/syllabus; missing ids → null', () => {
  assert.equal(
    ledgerDeepLinkHref(
      row({
        entity_type: 'assignment',
        entity_id: 'a1',
        class_id: 'c1',
      }),
    ),
    '/class/c1/assignment/a1',
  );
  assert.equal(
    ledgerDeepLinkHref(
      row({
        action_family: 'grade',
        entity_type: 'submission',
        entity_id: 's1',
        class_id: 'c1',
      }),
    ),
    '/class/c1/review/s1',
  );
  assert.equal(
    ledgerDeepLinkHref(
      row({
        action_family: 'capture',
        entity_type: 'capture',
        entity_id: 'cap1',
        class_id: 'c1',
        student_id: 'st1',
      }),
    ),
    '/class/c1/student/st1',
  );
  assert.equal(
    ledgerDeepLinkHref(
      row({
        action_family: 'syllabus',
        entity_type: 'class',
        class_id: 'c1',
      }),
    ),
    '/class/c1/syllabus',
  );
  // Fail closed: no entity / incomplete pointer
  assert.equal(ledgerDeepLinkHref(row({ entity_type: 'assignment', entity_id: 'a1' })), null);
  assert.equal(ledgerDeepLinkHref(row({ entity_type: 'assignment', class_id: 'c1' })), null);
  assert.equal(ledgerDeepLinkHref(row({})), null);
});

test('sortDiaryEntries defaults newest-first; oldest flip reverses', () => {
  const rows = [
    { entry_date: '2026-09-01', created_at: '2026-09-01T10:00:00.000Z', id: 'a' },
    { entry_date: '2026-09-03', created_at: '2026-09-03T10:00:00.000Z', id: 'b' },
    { entry_date: '2026-09-02', created_at: '2026-09-02T10:00:00.000Z', id: 'c' },
  ];
  assert.deepEqual(
    sortDiaryEntries(rows, false).map((r) => r.id),
    ['b', 'c', 'a'],
  );
  assert.deepEqual(
    sortDiaryEntries(rows, true).map((r) => r.id),
    ['a', 'c', 'b'],
  );
});
