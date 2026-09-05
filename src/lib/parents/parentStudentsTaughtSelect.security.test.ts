import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260908000005_parent_students_taught_select.sql';

test('T02 parent_students_via_taught_class SELECT is student_on_taught_class only', () => {
  const sql = read(migration);
  assert.match(sql, /drop policy if exists parent_students_via_taught_class on public\.parent_students/i);
  assert.match(sql, /create policy parent_students_via_taught_class on public\.parent_students/i);
  const body = sql.slice(sql.indexOf('create policy parent_students_via_taught_class'));
  assert.match(body, /for select using/i);
  assert.match(body, /public\.student_on_taught_class\(student_id\)/);
  assert.doesNotMatch(body, /parent_on_taught_class/);
});
