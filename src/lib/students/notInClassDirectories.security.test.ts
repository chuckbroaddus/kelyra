import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260908000002_tighten_not_in_class_directories.sql';

test('F08 migration: school_students_not_in_class is office / taught-class, not is_staff dump', () => {
  const sql = read(migration);
  const start = sql.indexOf('create or replace function public.school_students_not_in_class');
  const end = sql.indexOf('create or replace function public.school_parents_not_in_class');
  const body = sql.slice(start, end);
  assert.match(body, /public\.is_school_admin\(\)/);
  assert.match(body, /public\.teaches_class\(p_class_id\)/);
  assert.match(body, /public\.my_school_id\(\)/);
  assert.match(body, /public\.teaches_class\(e\.class_id\)/);
  assert.match(body, /s\.teacher_id = auth\.uid\(\)/);
  assert.doesNotMatch(body, /is_staff_profile/);
});

test('F08 migration: school_parents_not_in_class is office / parent_on_taught_class, not is_staff', () => {
  const sql = read(migration);
  const start = sql.indexOf('create or replace function public.school_parents_not_in_class');
  const end = sql.indexOf('create or replace function public.enroll_school_student');
  const body = sql.slice(start, end);
  assert.match(body, /public\.is_school_admin\(\)/);
  assert.match(body, /public\.teaches_class\(p_class_id\)/);
  assert.match(body, /public\.parent_on_taught_class\(p\.id\)/);
  assert.match(body, /p\.teacher_id = auth\.uid\(\)/);
  assert.doesNotMatch(body, /is_staff_profile/);
});

test('F08 migration: enroll_school_student requires teaches_class or office; uses tightened not_in_class', () => {
  const sql = read(migration);
  const start = sql.indexOf('create or replace function public.enroll_school_student');
  const body = sql.slice(start, sql.indexOf('revoke all on function public.school_students_not_in_class'));
  assert.match(body, /public\.is_school_admin\(\)\s+or\s+public\.teaches_class\(p_class_id\)/);
  assert.match(body, /school_students_not_in_class\(p_class_id\)/);
  assert.doesNotMatch(body, /is_staff_profile/);
  assert.match(sql, /revoke all on function public\.school_students_not_in_class\(uuid\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.school_students_not_in_class\(uuid\) to authenticated/i);
});

test('F08 client: listAvailableStudents still calls school_students_not_in_class', () => {
  const students = read('src/lib/students/api.ts');
  const fn = students.slice(
    students.indexOf('export async function listAvailableStudents'),
    students.indexOf('export async function', students.indexOf('export async function listAvailableStudents') + 10),
  );
  assert.match(fn, /rpc\('school_students_not_in_class'/);
});
