import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260827000004_fail_closed_parent_students_own.sql';

test('F07 migration: parent_students_own is SELECT-only (no teacher INSERT/UPDATE)', () => {
  const sql = read(migration);
  assert.match(sql, /drop policy if exists parent_students_own on public\.parent_students/i);
  assert.match(sql, /create policy parent_students_own on public\.parent_students/i);

  const policy = sql.slice(sql.indexOf('create policy parent_students_own on public.parent_students'));
  assert.match(policy, /for select using/i);
  assert.match(policy, /parents p where p\.id = parent_id and p\.teacher_id = auth\.uid\(\)/i);
  assert.match(policy, /students s where s\.id = student_id and s\.teacher_id = auth\.uid\(\)/i);
  assert.doesNotMatch(policy, /for all|for insert|for update|for delete|with check/i);
});

test('F07: does not rewrite Q8 can_link / does not touch taught-class SELECT', () => {
  const sql = read(migration);
  // Executable SQL only — comments may name the office RPC for humans.
  const executable = sql
    .split('\n')
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
  assert.doesNotMatch(executable, /can_link_parent_student|admin_set_parent_link|add_parent_to_class/i);
  assert.doesNotMatch(executable, /parent_students_via_taught_class|parent_students_admin_all/i);
  assert.doesNotMatch(executable, /create or replace function/i);
});

test('F07: linkChild stays office RPC-only; no parent_students insert fallback', () => {
  const src = read('src/lib/parents/api.ts');
  const fn = src.slice(src.indexOf('export async function linkChild'));
  const body = fn.slice(0, fn.indexOf('export async function createParentInvite'));
  assert.match(body, /rpc\('admin_set_parent_link'/);
  assert.doesNotMatch(body, /\.from\('parent_students'\)\s*\.insert/);
});
