import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260826000006_tighten_school_link_directories.sql';

test('Q6 migration: school_students_for_link is office / taught-class, not is_staff', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.school_students_for_link\(\)/i);
  assert.match(sql, /public\.is_school_admin\(\)/i);
  assert.match(sql, /public\.my_school_id\(\)/i);
  assert.match(sql, /public\.teaches_class\(e\.class_id\)/i);
  assert.match(sql, /from public\.enrollments e/i);
  assert.doesNotMatch(sql, /is_staff_profile/);
  assert.match(sql, /revoke all on function public\.school_students_for_link\(\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.school_students_for_link\(\) to authenticated/i);
});

test('Q6 migration: school_parents_for_link is office / parent_on_taught_class, not is_staff dump', () => {
  const sql = read(migration);
  const start = sql.indexOf('create or replace function public.school_parents_for_link()');
  const end = sql.indexOf('create or replace function public.class_parent_directory');
  const body = sql.slice(start, end);
  assert.match(body, /public\.is_school_admin\(\)/i);
  assert.match(body, /public\.my_school_id\(\)/i);
  assert.match(body, /public\.parent_on_taught_class\(p\.id\)/i);
  assert.match(body, /x\.parent_id = p\.id/i);
  assert.match(body, /not public\.is_school_admin\(\)/i);
  assert.doesNotMatch(body, /is_staff_profile/);
  assert.doesNotMatch(body, /p\.teacher_id = auth\.uid\(\)/);
  assert.match(sql, /revoke all on function public\.school_parents_for_link\(\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.school_parents_for_link\(\) to authenticated/i);
});

test('Q6 migration: class_parent_directory requires teaches_class and uses school_parents_for_link', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.class_parent_directory\(p_class_id uuid\)/i);
  assert.match(sql, /public\.teaches_class\(p_class_id\)/i);
  assert.match(sql, /from public\.school_parents_for_link\(\)/i);
  assert.doesNotMatch(sql, /is_staff_profile/);
  assert.match(sql, /revoke all on function public\.class_parent_directory\(uuid\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.class_parent_directory\(uuid\) to authenticated/i);
});

test('Q6 clients treat empty RPC success as authoritative; no widen on empty', () => {
  const parents = read('src/lib/parents/api.ts');
  const loadFn = parents.slice(parents.indexOf('async function loadAllParentRows'));
  const loadBody = loadFn.slice(0, loadFn.indexOf('async function attachChildren'));
  assert.match(loadBody, /rpc\('school_parents_for_link'\)/);
  assert.match(loadBody, /Array\.isArray\(rpc\.data\)/);
  assert.doesNotMatch(loadBody, /rpc\.data\?\.length/);

  const listFn = parents.slice(parents.indexOf('export async function listParentsForClass'));
  const listBody = listFn.slice(0, listFn.indexOf('async function fillAvailableWithOwnParents'));
  assert.match(listBody, /rpc\('class_parent_directory'/);
  assert.match(listBody, /Array\.isArray\(data\)/);
  assert.doesNotMatch(listBody, /data\?\.length/);

  const students = read('src/lib/students/api.ts');
  const linkFn = students.slice(students.indexOf('export async function listStudentsForLinking'));
  const linkBody = linkFn.slice(0, linkFn.indexOf('export async function listAvailableStudents'));
  assert.match(linkBody, /rpc\('school_students_for_link'\)/);
  assert.match(linkBody, /if \(!error && data\)/);
});
