import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260827000000_tighten_profiles_read.sql';

test('Q9 migration: profiles_read is not any-login → all rows', () => {
  const sql = read(migration);
  assert.match(sql, /drop policy if exists profiles_read on public\.profiles/i);
  assert.match(sql, /create policy profiles_read on public\.profiles/i);
  assert.match(sql, /id = auth\.uid\(\)/i);
  assert.match(sql, /public\.is_school_admin\(\)/i);
  assert.match(sql, /public\.my_school_id\(\)/i);
  assert.match(sql, /school_id is not distinct from public\.my_school_id\(\)/i);
  assert.match(sql, /public\.shares_message_thread\(id\)/i);
  assert.match(sql, /public\.can_message\(auth\.uid\(\), id\)/i);
  assert.doesNotMatch(sql, /using\s*\(\s*auth\.uid\(\)\s+is\s+not\s+null\s*\)/i);
  assert.doesNotMatch(sql, /is_staff_profile/);
});

test('Q9 migration: shares_message_thread is security definer and granted to authenticated only', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.shares_message_thread\(p_other uuid\)/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /from public\.message_thread_members mine/i);
  assert.match(sql, /revoke all on function public\.shares_message_thread\(uuid\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.shares_message_thread\(uuid\) to authenticated/i);
});

test('Q9 call sites still load self, by id, and message hydrate from profiles', () => {
  const school = read('src/lib/school/api.ts');
  assert.match(school, /from\('profiles'\)\.select\('\*'\)\.eq\('id', uid\)/);
  assert.match(school, /from\('profiles'\)\.select\('\*'\)\.eq\('id', id\)\.single\(\)/);
  assert.match(school, /from\('profiles'\)\s*\n\s*\.select\('\*'\)\s*\n\s*\.order\('display_name'/);

  const messages = read('src/lib/messages/api.ts');
  assert.match(messages, /from\('profiles'\)\.select\('\*'\)\.in\('id', unique\)/);

  const go = read('src/lib/messages/go.ts');
  assert.match(go, /from\('profiles'\)/);
  assert.match(go, /\.eq\('username', handle\)/);

  const classes = read('src/lib/classes/api.ts');
  assert.match(classes, /from\('profiles'\)\.select\('id, username, display_name, email, student_id, parent_id'\)\.in\('id', ids\)/);
});

import { isOfficeRole, isStaffRole, isTeacherRole } from './roles.ts';

test('T06/T07 behavioral: office seat vs staff hats (RLS uses is_school_admin, not is_staff)', () => {
  const teacher = { role: 'teacher' as const };
  const teacherAlsoAdmin = { role: 'teacher' as const, also_administrator: true };
  const office = { role: 'administrator' as const };
  const parent = { role: 'parent' as const };
  const student = { role: 'student' as const };

  // is_school_admin ≈ office seat — also_administrator teacher must not dump school profiles.
  assert.equal(isOfficeRole(teacher), false);
  assert.equal(isOfficeRole(teacherAlsoAdmin), false);
  assert.equal(isOfficeRole(office), true);
  assert.equal(isOfficeRole(parent), false);
  assert.equal(isOfficeRole(student), false);

  assert.equal(isStaffRole(teacher), true);
  assert.equal(isStaffRole(parent), false);
  assert.equal(isTeacherRole(teacherAlsoAdmin), true);
});

test('T06/T07 client behavior: profile reads are PostgREST selects (RLS wall), not service_role', () => {
  const school = read('src/lib/school/api.ts');
  assert.doesNotMatch(school, /SERVICE_ROLE|service_role|serviceRole/);
  assert.match(school, /from\('profiles'\)\.select\('\*'\)\.eq\('id', uid\)/);
  const messages = read('src/lib/messages/api.ts');
  assert.doesNotMatch(messages, /SERVICE_ROLE|service_role/);
  // Live student/parent JWT SELECT of unrelated same-school profile still needs DB fixture.
});
