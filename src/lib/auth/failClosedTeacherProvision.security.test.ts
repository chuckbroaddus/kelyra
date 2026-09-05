/**
 * Q12 fail-closed teacher provision — static source assertions only.
 * Matches other Q* security tests: pin migration/TS text; do not require a live DB.
 * CoS smoke after apply: provision student/parent and confirm no public.teachers row.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260827000003_fail_closed_teacher_provision.sql';
const q12Stamp = '20260827000003_fail_closed_teacher_provision.sql';

function laterMigrations(): string[] {
  return readdirSync(join(root, 'supabase/migrations'))
    .filter((name) => name.endsWith('.sql') && name > q12Stamp)
    .sort();
}

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

test('Q12 drift: later migrations do not remint teachers via handle_new_user or teachers_own', () => {
  for (const name of laterMigrations()) {
    const sql = read(`supabase/migrations/${name}`);
    if (/create or replace function public\.handle_new_user\s*\(/i.test(sql)) {
      const start = sql.search(/create or replace function public\.handle_new_user\s*\(/i);
      const endMatch = sql.slice(start).search(/\$\$\s*;/);
      const body = endMatch >= 0 ? sql.slice(start, start + endMatch) : sql.slice(start);
      assert.doesNotMatch(body, /insert into public\.teachers/i, name);
      assert.doesNotMatch(body, /insert into public\.profiles/i, name);
    }
    assert.doesNotMatch(sql, /create policy teachers_own on public\.teachers/i, name);
    assert.doesNotMatch(sql, /create policy teachers_self_insert/i, name);
  }
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

test('Q12 AuthProvider: never loadTeacherProfile for missing/student/parent', () => {
  const src = read('src/lib/auth/AuthProvider.tsx');
  assert.match(src, /shouldLoadTeacherRow\(mine\)/);
  // Every loadTeacherProfile call must be behind shouldLoadTeacherRow.
  const calls = [...src.matchAll(/loadTeacherProfile\(\)/g)];
  assert.equal(calls.length, 2);
  for (const match of calls) {
    const before = src.slice(Math.max(0, match.index! - 80), match.index!);
    assert.match(before, /shouldLoadTeacherRow\(mine\)/);
  }
  assert.match(src, /else setTeacher\(null\)/);
});

test('Q12 shouldLoadTeacherRow: staff/teacher only; never mint for missing/student/parent', () => {
  const src = read('src/lib/school/roles.ts');
  const start = src.indexOf('/** Auth chrome may load teachers only');
  assert.ok(start >= 0, 'shouldLoadTeacherRow fail-closed comment missing');
  const fn = src.slice(start);
  const end = fn.indexOf('\nexport function', fn.indexOf('export function shouldLoadTeacherRow'));
  const body = end >= 0 ? fn.slice(0, end) : fn;
  assert.match(body, /never mint/i);
  assert.match(body, /isStaffRole\(value\) \|\| isTeacherRole\(value\)/);
  assert.doesNotMatch(body, /insert|upsert|loadTeacherProfile/i);
});

test('Q12 loadTeacherProfile selects only; never inserts teachers', () => {
  const src = read('src/lib/auth/api.ts');
  const fn = src.slice(src.indexOf('export async function loadTeacherProfile'));
  assert.match(fn, /\.from\('teachers'\)/);
  assert.match(fn, /\.select\('\*'\)/);
  assert.match(fn, /\.maybeSingle\(\)/);
  assert.doesNotMatch(fn, /\.insert\(/);
  assert.doesNotMatch(fn, /\.upsert\(/);
});

test('Q12 sign-in: no public Create teacher / signUp', () => {
  const gate = read('src/app/sign-in.tsx');
  const splash = read('src/components/ui/SplashLanding.tsx');
  assert.doesNotMatch(gate, /Create a teacher/i);
  assert.doesNotMatch(gate, /signUp|sign-up|createTeacher|auth\.signUp/i);
  assert.doesNotMatch(gate, /school_claim_superintendent/);
  assert.doesNotMatch(splash, /Create a teacher/i);
  assert.doesNotMatch(splash, /signUp|createTeacher|auth\.signUp/i);
  assert.doesNotMatch(splash, /school_claim_superintendent/);
  assert.match(
    splash,
    /Account creation is performed by the school office\. Please contact your school's administration for access\./,
  );
});

