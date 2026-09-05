import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260908000000_teacher_unref_taught_class.sql';

test('F01 migration: teacher_unref_asset allows taught-class / office when asset still linked', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.teacher_unref_asset\(p_asset_id uuid\)/i);
  const body = sql.slice(
    sql.indexOf('create or replace function public.teacher_unref_asset'),
    sql.indexOf('create or replace function public.teacher_set_profile_photo'),
  );
  assert.match(body, /teacher_id = auth\.uid\(\)/);
  assert.match(body, /public\.student_on_taught_class\(s\.id\)/);
  assert.match(body, /public\.parent_on_taught_class\(p\.id\)/);
  assert.match(body, /public\.is_school_admin\(\)/);
  assert.match(body, /s\.photo_asset_id = p_asset_id/);
  assert.match(body, /p\.photo_asset_id = p_asset_id/);
  assert.match(body, /perform public\._unref_delete_asset\(p_asset_id\)/);
  assert.match(body, /raise exception 'Not found'/);
});

test('F01 migration: teacher_set_profile_photo authorizes like clear; unrefs previous without uploader check', () => {
  const sql = read(migration);
  assert.match(
    sql,
    /create or replace function public\.teacher_set_profile_photo\(\s*p_kind text,\s*p_person_id uuid,\s*p_asset_id uuid\s*\)/i,
  );
  const body = sql.slice(
    sql.indexOf('create or replace function public.teacher_set_profile_photo'),
    sql.indexOf('revoke all on function public.teacher_unref_asset'),
  );
  assert.match(body, /public\.student_on_taught_class\(p_person_id\)/);
  assert.match(body, /public\.parent_on_taught_class\(p_person_id\)/);
  assert.match(body, /public\.is_school_admin\(\)/);
  // New asset must belong to actor (co-teacher upload).
  assert.match(body, /from public\.assets\s+where id = p_asset_id and teacher_id = auth\.uid\(\)/);
  // Previous unref bypasses assets.teacher_id ownership — uses _unref_delete_asset directly.
  assert.match(body, /perform public\._unref_delete_asset\(photo_id\)/);
  assert.doesNotMatch(
    body.slice(body.indexOf('if photo_id is not null')),
    /assets where id = photo_id and teacher_id/,
  );
  assert.match(sql, /grant execute on function public\.teacher_set_profile_photo\(text, uuid, uuid\) to authenticated/i);
});

test('F01 client: setProfilePhoto uses teacher_set_profile_photo and surfaces RPC errors', () => {
  const photos = read('src/lib/people/photos.ts');
  const fn = photos.slice(
    photos.indexOf('export async function setProfilePhoto'),
    photos.indexOf('export async function clearProfilePhoto'),
  );
  assert.match(fn, /\.rpc\(\s*'teacher_set_profile_photo'/);
  assert.match(fn, /if \(error\) throw error/);
  assert.doesNotMatch(fn, /\.from\(table\)\.update/);
  // Must not ignore unref / set failures with a bare rpc and no throw.
  assert.doesNotMatch(fn, /await supabase\.rpc\('teacher_unref_asset'/);
});
