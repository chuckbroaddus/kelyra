import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260827000005_fail_closed_teachers_own_insert.sql';

test('F12 migration: teachers_own ALL dropped; self SELECT+UPDATE only (no INSERT)', () => {
  const sql = read(migration);
  assert.match(sql, /drop policy if exists teachers_own on public\.teachers/i);
  assert.match(sql, /create policy teachers_self_select on public\.teachers/i);
  assert.match(sql, /create policy teachers_self_update on public\.teachers/i);
  assert.doesNotMatch(sql, /create policy teachers_own on public\.teachers/i);
  assert.doesNotMatch(sql, /create policy teachers_self_insert/i);

  const selectPolicy = sql.slice(
    sql.indexOf('create policy teachers_self_select on public.teachers'),
    sql.indexOf('create policy teachers_self_update on public.teachers'),
  );
  assert.match(selectPolicy, /for select/i);
  assert.match(selectPolicy, /id = auth\.uid\(\)/i);
  assert.doesNotMatch(selectPolicy, /for all|for insert|for update|for delete/i);

  const updatePolicy = sql.slice(sql.indexOf('create policy teachers_self_update on public.teachers'));
  assert.match(updatePolicy, /for update/i);
  assert.match(updatePolicy, /id = auth\.uid\(\)/i);
  assert.doesNotMatch(updatePolicy, /for all|for insert|for delete/i);
});

test('F12: does not rewrite Q1/Q12 handle_new_user or provision RPCs', () => {
  const sql = read(migration);
  const executable = sql
    .split('\n')
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
  assert.doesNotMatch(executable, /create or replace function/i);
  assert.doesNotMatch(executable, /handle_new_user|admin_create_login|school_claim_superintendent/i);
  assert.doesNotMatch(executable, /admin_provision_student_login|admin_provision_parent_login/i);
});

test('F12: ensureTeacherProfile selects only; never inserts teachers', () => {
  const src = read('src/lib/auth/api.ts');
  const fn = src.slice(src.indexOf('export async function ensureTeacherProfile'));
  assert.match(fn, /\.from\('teachers'\)/);
  assert.match(fn, /\.select\('\*'\)/);
  assert.match(fn, /\.maybeSingle\(\)/);
  assert.doesNotMatch(fn, /\.insert\(/);
  assert.doesNotMatch(fn, /\.upsert\(/);
});
