import assert from 'node:assert/strict';
import test from 'node:test';

import {
  diaryFilterDate,
  ledgerDeepLinkHref,
  ledgerDeepLinkStillPermitted,
  sortDiaryEntries,
  type LedgerLinkDb,
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

type FakeRow = Record<string, unknown> & { id: string };

/** In-memory PostgREST stub: filters by eq() then maybeSingle. */
function fakeDb(tables: Record<string, FakeRow[]>, opts?: { errorOn?: string }): LedgerLinkDb {
  return {
    from(table: string) {
      return {
        select(_cols: string) {
          const filters: Array<[string, string]> = [];
          const api = {
            eq(col: string, val: string) {
              filters.push([col, val]);
              return api;
            },
            async maybeSingle() {
              if (opts?.errorOn === table) {
                return { data: null, error: { message: `forced ${table} error` } };
              }
              const rows = tables[table] ?? [];
              const hit = rows.find((r) => filters.every(([c, v]) => String(r[c]) === v)) ?? null;
              return { data: hit, error: null };
            },
          };
          return api;
        },
      };
    },
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

test('ledgerDeepLinkStillPermitted: no href → false without querying', async () => {
  const db = fakeDb({});
  assert.equal(await ledgerDeepLinkStillPermitted(row({}), db), false);
});

test('ledgerDeepLinkStillPermitted: empty class select → false', async () => {
  const db = fakeDb({ classes: [], assignments: [{ id: 'a1', class_id: 'c1' }] });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'assignment', entity_id: 'a1', class_id: 'c1' }),
      db,
    ),
    false,
  );
});

test('ledgerDeepLinkStillPermitted: class query error → false', async () => {
  const db = fakeDb(
    { classes: [{ id: 'c1' }], assignments: [{ id: 'a1', class_id: 'c1' }] },
    { errorOn: 'classes' },
  );
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'assignment', entity_id: 'a1', class_id: 'c1' }),
      db,
    ),
    false,
  );
});

test('ledgerDeepLinkStillPermitted: deleted assignment → false', async () => {
  const db = fakeDb({ classes: [{ id: 'c1' }], assignments: [] });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'assignment', entity_id: 'a1', class_id: 'c1' }),
      db,
    ),
    false,
  );
});

test('ledgerDeepLinkStillPermitted: assignment query error → false', async () => {
  const db = fakeDb(
    { classes: [{ id: 'c1' }], assignments: [{ id: 'a1', class_id: 'c1' }] },
    { errorOn: 'assignments' },
  );
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'assignment', entity_id: 'a1', class_id: 'c1' }),
      db,
    ),
    false,
  );
});

test('ledgerDeepLinkStillPermitted: mismatched assignment class_id → false', async () => {
  const db = fakeDb({
    classes: [{ id: 'c1' }],
    // entity exists but belongs to another class
    assignments: [{ id: 'a1', class_id: 'c-other' }],
  });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'assignment', entity_id: 'a1', class_id: 'c1' }),
      db,
    ),
    false,
  );
});

test('ledgerDeepLinkStillPermitted: matching assignment class_id → true', async () => {
  const db = fakeDb({
    classes: [{ id: 'c1' }],
    assignments: [{ id: 'a1', class_id: 'c1' }],
  });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'assignment', entity_id: 'a1', class_id: 'c1' }),
      db,
    ),
    true,
  );
});

test('ledgerDeepLinkStillPermitted: submission re-binds via assignment class_id', async () => {
  const match = fakeDb({
    classes: [{ id: 'c1' }],
    submissions: [{ id: 'sub1', assignment_id: 'a1' }],
    assignments: [{ id: 'a1', class_id: 'c1' }],
  });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'submission', entity_id: 'sub1', class_id: 'c1' }),
      match,
    ),
    true,
  );

  const mismatch = fakeDb({
    classes: [{ id: 'c1' }],
    submissions: [{ id: 'sub1', assignment_id: 'a1' }],
    assignments: [{ id: 'a1', class_id: 'c-other' }],
  });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'submission', entity_id: 'sub1', class_id: 'c1' }),
      mismatch,
    ),
    false,
  );

  const deletedSub = fakeDb({
    classes: [{ id: 'c1' }],
    submissions: [],
    assignments: [{ id: 'a1', class_id: 'c1' }],
  });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'submission', entity_id: 'sub1', class_id: 'c1' }),
      deletedSub,
    ),
    false,
  );
});

test('ledgerDeepLinkStillPermitted: student/capture re-binds via enrollment', async () => {
  const enrolled = fakeDb({
    classes: [{ id: 'c1' }],
    enrollments: [{ id: 'e1', student_id: 'st1', class_id: 'c1' }],
  });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'student', student_id: 'st1', class_id: 'c1' }),
      enrolled,
    ),
    true,
  );
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'capture', student_id: 'st1', class_id: 'c1', entity_id: 'cap1' }),
      enrolled,
    ),
    true,
  );

  const wrongClass = fakeDb({
    classes: [{ id: 'c1' }],
    enrollments: [{ id: 'e1', student_id: 'st1', class_id: 'c-other' }],
    students: [{ id: 'st1' }],
  });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'student', student_id: 'st1', class_id: 'c1' }),
      wrongClass,
    ),
    false,
  );

  const missing = fakeDb({
    classes: [{ id: 'c1' }],
    enrollments: [],
  });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'student', student_id: 'st1', class_id: 'c1' }),
      missing,
    ),
    false,
  );
});

test('ledgerDeepLinkStillPermitted: syllabus/class only needs readable class', async () => {
  const db = fakeDb({ classes: [{ id: 'c1' }] });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'class', class_id: 'c1', action_family: 'syllabus' }),
      db,
    ),
    true,
  );
  const gone = fakeDb({ classes: [] });
  assert.equal(
    await ledgerDeepLinkStillPermitted(
      row({ entity_type: 'syllabus', class_id: 'c1' }),
      gone,
    ),
    false,
  );
});
