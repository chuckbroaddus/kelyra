import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const migration = 'supabase/migrations/20261002090000_roster_imports_class_staff.sql';

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function helperBody(sql: string): string {
  const start = sql.indexOf('create or replace function public.can_manage_roster_import(p_class_id uuid)');
  const end = sql.indexOf('revoke all on function public.can_manage_roster_import');
  assert.ok(start >= 0 && end > start, 'helper function present');
  return sql.slice(start, end);
}

test('roster_imports: old primary-teacher-only policy is replaced by the class-staff policy', () => {
  const sql = read(migration);
  assert.match(sql, /drop policy if exists roster_imports_via_class on public\.roster_imports/i);
  assert.match(sql, /create policy roster_imports_class_staff on public\.roster_imports/i);
  const policy = sql.slice(sql.indexOf('create policy roster_imports_class_staff'));
  assert.match(policy, /to authenticated/i);
  assert.match(policy, /using \(public\.can_manage_roster_import\(class_id\)\)/i);
  assert.match(policy, /with check \(public\.can_manage_roster_import\(class_id\)\)/i);
  assert.doesNotMatch(sql, /create policy roster_imports_via_class/i);
});

test('roster_imports helper: primary teacher, co-teacher, same-school admin only', () => {
  const body = helperBody(read(migration));
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path = public/i);
  assert.match(body, /c\.teacher_id = auth\.uid\(\)/i);
  assert.match(body, /from public\.class_teachers ct\s+where ct\.class_id = p_class_id and ct\.teacher_id = auth\.uid\(\)/i);
  // Admin branch must be school-scoped, never a bare is_school_admin().
  const admin = body.slice(body.indexOf('public.is_school_admin()'));
  assert.match(admin, /public\.my_school_id\(\) is not null/i);
  assert.match(admin, /tp\.school_id = public\.my_school_id\(\)/i);
  assert.doesNotMatch(body, /or public\.is_school_admin\(\)\s*\)/i);
  assert.doesNotMatch(body, /teaches_class|is_staff_profile/);
});

test('roster_imports helper: students and parents are excluded; anon cannot execute', () => {
  const sql = read(migration);
  const body = helperBody(sql);
  assert.match(body, /me\.role in \('student', 'parent'\)/i);
  assert.match(body, /and not exists \(/i);
  assert.match(sql, /revoke all on function public\.can_manage_roster_import\(uuid\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.can_manage_roster_import\(uuid\) to authenticated/i);
});

test('class setup: a failed pending-import save does not show "Could not read that list"', () => {
  const src = read('src/app/class/[id]/setup.tsx');
  const start = src.indexOf('const readListPhoto = async');
  const end = src.indexOf('const onPickList = async');
  const body = src.slice(start, end);
  const park = body.indexOf('createRosterImport(');
  assert.ok(park > 0, 'still parks the import');
  // The park call has its own try/catch that sets the in-card note.
  const parkBlock = body.slice(body.lastIndexOf('try {', park), body.indexOf('} catch (err) {', park));
  assert.match(parkBlock, /catch \{\s*setParkNote\(ROSTER_PARK_FAILED_NOTE\)/);
  assert.match(src, /\{parkNote \? <Text/);
});
