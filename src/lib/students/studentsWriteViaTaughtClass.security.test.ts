import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260827000002_students_write_via_taught_class.sql';

test('Q11 migration: drops students_own; taught-class UPDATE only (no taught DELETE)', () => {
  const sql = read(migration);
  assert.match(sql, /drop policy if exists students_own on public\.students/i);
  assert.match(sql, /drop policy if exists students_update_taught on public\.students/i);
  assert.match(sql, /create policy students_write_via_taught_class on public\.students/i);
  assert.match(sql, /public\.student_on_taught_class\(id\)/i);
  assert.match(sql, /create policy students_admin_all on public\.students|students_admin_all stays/i);
  assert.doesNotMatch(sql, /create policy students_own on public\.students/i);
  assert.doesNotMatch(sql, /is_staff_profile/);

  const writePolicy = sql.slice(
    sql.indexOf('create policy students_write_via_taught_class on public.students'),
    sql.indexOf('create policy students_delete_own on public.students'),
  );
  assert.match(writePolicy, /for update/i);
  assert.doesNotMatch(writePolicy, /for all|for delete/i);

  const deletePolicy = sql.slice(
    sql.indexOf('create policy students_delete_own on public.students'),
    sql.indexOf('-- ---------------------------------------------------------------------------\n-- parents RLS'),
  );
  assert.match(deletePolicy, /for delete/i);
  assert.match(deletePolicy, /teacher_id = auth\.uid\(\)/i);
  assert.doesNotMatch(deletePolicy, /student_on_taught_class/);
});

test('Q11 migration: non-admin cannot change students/parents teacher_id (no steal-then-delete)', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.freeze_person_teacher_id\(\)/i);
  assert.match(sql, /new\.teacher_id is distinct from old\.teacher_id/i);
  assert.match(sql, /not public\.is_school_admin\(\)/i);
  assert.match(
    sql,
    /create trigger students_freeze_teacher_id\s+before update on public\.students/i,
  );
  assert.match(
    sql,
    /create trigger parents_freeze_teacher_id\s+before update on public\.parents/i,
  );
  assert.doesNotMatch(sql, /is_staff_profile/);

  const freezeBody = sql.slice(
    sql.indexOf('create or replace function public.freeze_person_teacher_id()'),
    sql.indexOf('drop trigger if exists students_freeze_teacher_id'),
  );
  assert.match(freezeBody, /raise exception 'not allowed'/i);
  assert.doesNotMatch(freezeBody, /student_on_taught_class|parent_on_taught_class|teacher_id = auth\.uid\(\)/);

  // Parent-guard early return for teachers must not allow teacher_id mutation.
  const parentGuard = sql.slice(
    sql.indexOf('create or replace function public.students_parent_guard()'),
    sql.indexOf('-- students RLS: drop owner-only ALL'),
  );
  assert.match(parentGuard, /new\.teacher_id is distinct from old\.teacher_id/i);
  assert.match(parentGuard, /raise exception 'not allowed'/i);
  // Teacher early-return comes after the teacher_id freeze check.
  const freezeIdx = parentGuard.indexOf("new.teacher_id is distinct from old.teacher_id");
  const teacherPassIdx = parentGuard.indexOf("exists (select 1 from public.teachers");
  assert.ok(freezeIdx >= 0 && teacherPassIdx > freezeIdx);
});

test('Q11 migration: owner SELECT restored for students/parents (createParent insert+select)', () => {
  const sql = read(migration);

  const studentsSelect = sql.slice(
    sql.indexOf('create policy students_select_own on public.students'),
    sql.indexOf('create policy students_insert_own on public.students'),
  );
  assert.match(studentsSelect, /for select/i);
  assert.match(studentsSelect, /teacher_id = auth\.uid\(\)/i);
  assert.doesNotMatch(studentsSelect, /for all|for update|for delete|for insert/i);

  const parentsSelect = sql.slice(
    sql.indexOf('create policy parents_select_own on public.parents'),
    sql.indexOf('create policy parents_insert_own on public.parents'),
  );
  assert.match(parentsSelect, /for select/i);
  assert.match(parentsSelect, /teacher_id = auth\.uid\(\)/i);
  assert.doesNotMatch(parentsSelect, /for all|for update|for delete|for insert/i);

  // createParent insert…select('*').single() needs INSERT + SELECT for owner rows.
  const parents = read('src/lib/parents/api.ts');
  const createFn = parents.slice(
    parents.indexOf('export async function createParent'),
    parents.indexOf('export async function getParent'),
  );
  assert.match(createFn, /\.from\('parents'\)/);
  assert.match(createFn, /\.insert\(/);
  assert.match(createFn, /\.select\('\*'\)\s*\n?\s*\.single\(\)/);

  assert.match(sql, /create policy parents_insert_own on public\.parents/i);
  assert.match(sql, /create policy parents_select_own on public\.parents/i);
  assert.match(sql, /listParentsForTeacher|createParent insert/i);
});

test('Q11 migration: student_on_taught_class helper uses teaches_class / enrollment', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.student_on_taught_class\(p_student_id uuid\)/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /from public\.enrollments e/i);
  assert.match(sql, /public\.teaches_class\(e\.class_id\)/i);
  assert.match(sql, /revoke all on function public\.student_on_taught_class\(uuid\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.student_on_taught_class\(uuid\) to authenticated/i);
});

test('Q11 migration: insert defaults teacher_id for acting teacher; does not force overwrite', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.students_default_teacher_id\(\)/i);
  assert.match(sql, /new\.teacher_id is null/i);
  assert.match(sql, /new\.teacher_id := auth\.uid\(\)/i);
  assert.match(sql, /alter column teacher_id set default auth\.uid\(\)/i);
});

test('Q11 migration: provision RPCs allow taught-class; person delete is admin+owner only', () => {
  const sql = read(migration);

  const studentLogin = sql.slice(
    sql.indexOf('create or replace function public.admin_provision_student_login'),
    sql.indexOf('create or replace function public.admin_provision_parent_login'),
  );
  assert.match(studentLogin, /public\.is_school_admin\(\)/i);
  assert.match(studentLogin, /public\.student_on_taught_class\(p_student_id\)/i);
  // Owner remains a fallback for unenrolled cards; taught-class must also pass.
  assert.match(studentLogin, /kid\.teacher_id is distinct from auth\.uid\(\)/i);

  const deleteStudent = sql.slice(
    sql.indexOf('create or replace function public.teacher_delete_student'),
    sql.indexOf('create or replace function public.teacher_remove_enrollment'),
  );
  assert.match(deleteStudent, /public\.is_school_admin\(\)/i);
  assert.match(deleteStudent, /s\.teacher_id = auth\.uid\(\)/i);
  assert.doesNotMatch(deleteStudent, /student_on_taught_class/);

  const deleteParent = sql.slice(
    sql.indexOf('create or replace function public.teacher_delete_parent'),
    sql.indexOf('-- Unlink: office (can_link), parent owner'),
  );
  assert.match(deleteParent, /teacher_id = auth\.uid\(\)/i);
  assert.match(deleteParent, /public\.can_link_parent_student\(\)/i);
  assert.doesNotMatch(deleteParent, /parent_on_taught_class/);

  const removeEnrollment = sql.slice(
    sql.indexOf('create or replace function public.teacher_remove_enrollment'),
    sql.indexOf('create or replace function public.teacher_delete_parent'),
  );
  assert.match(removeEnrollment, /public\.teaches_class\(p_class_id\)/i);
  assert.doesNotMatch(removeEnrollment, /klass\.teacher_id is distinct from auth\.uid\(\)/);

  const clearPhoto = sql.slice(sql.indexOf('create or replace function public.teacher_clear_profile_photo'));
  assert.match(clearPhoto, /public\.student_on_taught_class\(p_person_id\)/i);
  assert.match(clearPhoto, /public\.parent_on_taught_class\(p_person_id\)/i);
});

test('Q11 migration: teacher_unlink_child taught path requires student_on_taught_class, not parent alone', () => {
  const sql = read(migration);
  const unlink = sql.slice(
    sql.indexOf('create or replace function public.teacher_unlink_child'),
    sql.indexOf('create or replace function public.teacher_revoke_invite'),
  );
  assert.match(unlink, /public\.can_link_parent_student\(\)/i);
  assert.match(unlink, /teacher_id = auth\.uid\(\)/i);
  assert.match(unlink, /public\.student_on_taught_class\(p_student_id\)/i);
  // parent_on_taught_class alone must not authorize unlinking a sibling.
  assert.doesNotMatch(unlink, /parent_on_taught_class/);
});

test('Q11 migration: parents UPDATE via taught-class; DELETE owner-only; parent_students select only', () => {
  const sql = read(migration);
  assert.match(sql, /drop policy if exists parents_own on public\.parents/i);
  assert.match(sql, /create policy parents_select_own on public\.parents/i);
  assert.match(sql, /create policy parents_write_via_taught_class on public\.parents/i);
  assert.match(sql, /public\.parent_on_taught_class\(id\)/i);
  assert.match(sql, /create policy parents_delete_own on public\.parents/i);
  assert.match(sql, /create policy parent_students_via_taught_class on public\.parent_students/i);
  assert.match(sql, /for select using/i);

  const writePolicy = sql.slice(
    sql.indexOf('create policy parents_write_via_taught_class on public.parents'),
    sql.indexOf('create policy parents_delete_own on public.parents'),
  );
  assert.match(writePolicy, /for update/i);
  assert.doesNotMatch(writePolicy, /for all|for delete/i);

  const deletePolicy = sql.slice(
    sql.indexOf('create policy parents_delete_own on public.parents'),
    sql.indexOf('-- parent_students: SELECT'),
  );
  assert.match(deletePolicy, /for delete/i);
  assert.match(deletePolicy, /teacher_id = auth\.uid\(\)/i);
  assert.doesNotMatch(deletePolicy, /parent_on_taught_class/);

  const parentStudentsPolicy = sql.slice(
    sql.indexOf('create policy parent_students_via_taught_class'),
    sql.indexOf('create policy parent_accesses_via_parent'),
  );
  assert.doesNotMatch(parentStudentsPolicy, /for all|for insert|for update|for delete/i);

  assert.match(sql, /can_link_parent_student stays office-only|Do not reopen parent/i);
  assert.doesNotMatch(sql, /create or replace function public\.can_link_parent_student/);
});

test('Q11: office student mint client gate unchanged; matcher still never inserts', () => {
  const students = read('src/lib/students/api.ts');
  assert.match(students, /assertOfficeMayMintStudent/);
  assert.match(students, /Only the office may add a new student/);
  assert.match(students, /rpc\('is_school_admin'\)/);

  const officeSql = read('supabase/migrations/20260824000002_office_create_student.sql');
  assert.match(officeSql, /students_insert_office_only/);
  assert.match(officeSql, /Only the office may add a new student/);
});
