import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('F09: listParentsForStudentPageLinking merges listParentsForTeacher; does not widen RPC', () => {
  const api = read('src/lib/parents/api.ts');
  assert.match(api, /export async function listParentsForStudentPageLinking\(teacherId: string\)/);
  const start = api.indexOf('export async function listParentsForStudentPageLinking');
  const body = api.slice(start, api.indexOf('function putParent', start));
  assert.match(body, /listParentsForLinking\(\)/);
  assert.match(body, /listParentsForTeacher\(teacherId\)/);
  assert.doesNotMatch(body, /rpc\(/);
  // loadAllParentRows must still refuse to widen on empty RPC success.
  const load = api.slice(api.indexOf('async function loadAllParentRows'), api.indexOf('async function attachChildren'));
  assert.match(load, /Empty success is authoritative/);
  assert.match(load, /Do not widen/);
});

test('F09 student page Add parent uses student-page merge helper, not bare listParentsForLinking', () => {
  const page = read('src/app/class/[id]/student/[studentId].tsx');
  assert.match(page, /listParentsForStudentPageLinking/);
  assert.match(page, /openAddParent/);
  const open = page.slice(page.indexOf('const openAddParent'), page.indexOf('const linkNow'));
  assert.match(open, /listParentsForStudentPageLinking\(teacher\.id\)/);
  assert.doesNotMatch(open, /listParentsForLinking\(\)/);
});

test('F09 Q6 RPC wall unchanged: school_parents_for_link teacher branch has no teacher_id = auth.uid', () => {
  const sql = read('supabase/migrations/20260826000006_tighten_school_link_directories.sql');
  const start = sql.indexOf('create or replace function public.school_parents_for_link()');
  const end = sql.indexOf('create or replace function public.class_parent_directory');
  const body = sql.slice(start, end);
  assert.match(body, /public\.parent_on_taught_class\(p\.id\)/);
  assert.doesNotMatch(body, /p\.teacher_id = auth\.uid\(\)/);
  assert.doesNotMatch(body, /is_staff_profile/);
});
