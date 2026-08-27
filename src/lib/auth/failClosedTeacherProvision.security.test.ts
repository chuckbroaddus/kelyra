import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260827000003_fail_closed_teacher_provision.sql';

test('Q12 migration: handle_new_user never inserts teachers or default teacher profile', () => {
  const sql = read(migration);
  const body = sql.slice(
    sql.indexOf('create or replace function public.handle_new_user()'),
    sql.indexOf('-- teachers RLS'),
  );
  assert.match(body, /return new;/i);
  assert.doesNotMatch(body, /insert into public\.teachers/i);
  assert.doesNotMatch(body, /insert into public\.profiles/i);
  assert.doesNotMatch(body, /role\s*=\s*'teacher'|,\s*'teacher'\s*\)/i);
});

test('Q12 migration: teachers_own ALL dropped; self SELECT+UPDATE only (no INSERT)', () => {
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

  const updatePolicy = sql.slice(
    sql.indexOf('create policy teachers_self_update on public.teachers'),
    sql.indexOf('-- teachers_admin_read'),
  );
  assert.match(updatePolicy, /for update/i);
  assert.match(updatePolicy, /id = auth\.uid\(\)/i);
  assert.doesNotMatch(updatePolicy, /for all|for insert|for delete/i);
});

test('Q12 migration: admin_create_login one-shot staff teachers; no leftover delete', () => {
  const sql = read(migration);
  const fn = sql.slice(
    sql.indexOf('create or replace function public.admin_create_login('),
    sql.indexOf('create or replace function public.admin_provision_student_login'),
  );
  assert.match(fn, /set_config\('kelyra\.provision_profile',\s*'on'/i);
  assert.match(fn, /insert into public\.profiles/i);
  assert.match(fn, /if is_staff then/i);
  assert.match(fn, /insert into public\.teachers/i);
  assert.doesNotMatch(fn, /delete from public\.teachers/i);
  // Direct insert — not update-then-insert relying on the trigger.
  assert.doesNotMatch(fn, /update public\.profiles[\s\S]*where id = uid[\s\S]*if not found/i);
});

test('Q12 migration: student/parent provision never mint or delete teachers', () => {
  const sql = read(migration);

  const student = sql.slice(
    sql.indexOf('create or replace function public.admin_provision_student_login'),
    sql.indexOf('create or replace function public.admin_provision_parent_login'),
  );
  assert.match(student, /role,\s*student_id/i);
  assert.match(student, /'student'/i);
  assert.match(student, /insert into public\.profiles/i);
  assert.doesNotMatch(student, /insert into public\.teachers/i);
  assert.doesNotMatch(student, /delete from public\.teachers/i);
  assert.doesNotMatch(student, /update public\.profiles[\s\S]*where id = uid[\s\S]*if not found/i);

  const parent = sql.slice(sql.indexOf('create or replace function public.admin_provision_parent_login'));
  assert.match(parent, /role,\s*parent_id/i);
  assert.match(parent, /'parent'/i);
  assert.match(parent, /insert into public\.profiles/i);
  assert.doesNotMatch(parent, /insert into public\.teachers/i);
  assert.doesNotMatch(parent, /delete from public\.teachers/i);
  assert.doesNotMatch(parent, /update public\.profiles[\s\S]*where id = uid[\s\S]*if not found/i);
});

test('Q12 AuthProvider: never ensureTeacherProfile for missing/student/parent', () => {
  const src = read('src/lib/auth/AuthProvider.tsx');
  assert.match(src, /shouldLoadTeacherRow\(mine\)/);
  // Every ensureTeacherProfile call must be behind shouldLoadTeacherRow.
  const calls = [...src.matchAll(/ensureTeacherProfile\(\)/g)];
  assert.equal(calls.length, 2);
  for (const match of calls) {
    const before = src.slice(Math.max(0, match.index! - 80), match.index!);
    assert.match(before, /shouldLoadTeacherRow\(mine\)/);
  }
  assert.match(src, /else setTeacher\(null\)/);
});

test('Q12 ensureTeacherProfile selects only; never inserts teachers', () => {
  const src = read('src/lib/auth/api.ts');
  const fn = src.slice(src.indexOf('export async function ensureTeacherProfile'));
  assert.match(fn, /\.from\('teachers'\)/);
  assert.match(fn, /\.select\('\*'\)/);
  assert.match(fn, /\.maybeSingle\(\)/);
  assert.doesNotMatch(fn, /\.insert\(/);
  assert.doesNotMatch(fn, /\.upsert\(/);
});

test('Q12 sign-in: no public Create teacher / signUp', () => {
  const src = read('src/app/sign-in.tsx');
  assert.doesNotMatch(src, /Create a teacher/i);
  assert.doesNotMatch(src, /signUp|sign-up|createTeacher|auth\.signUp/i);
  assert.match(src, /school_claim_superintendent/);
  assert.match(src, /Accounts come from the office/i);
});
