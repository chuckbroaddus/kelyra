import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const hotfixMigration = 'supabase/migrations/20260911000001_unref_asset_storage_api.sql';

/** Latest create-or-replace body for _unref_delete_asset across migrations (lexicographic order). */
function latestUnrefDeleteAssetSql(): string {
  const dir = join(root, 'supabase/migrations');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  let latest = '';
  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8');
    const idx = sql.indexOf('create or replace function public._unref_delete_asset');
    if (idx >= 0) latest = sql.slice(idx);
  }
  assert.ok(latest, 'expected at least one _unref_delete_asset definition');
  return latest;
}

test('hotfix migration: _unref_delete_asset deletes assets row only — no storage.objects SQL', () => {
  const sql = read(hotfixMigration);
  assert.match(sql, /create or replace function public\._unref_delete_asset\(p_asset_id uuid\)/);
  const fn = sql.slice(sql.indexOf('create or replace function public._unref_delete_asset'));
  const body = fn.slice(0, fn.indexOf('$$;') + 3);
  assert.match(body, /delete from public\.assets where id = p_asset_id/);
  assert.doesNotMatch(body, /delete\s+from\s+storage\.objects/i);
  assert.match(body, /class_syllabi where source_asset_id/);
  assert.match(body, /schools where logo_asset_id/);
  assert.match(sql, /protect_delete|Storage API/i);
});

test('latest _unref_delete_asset across migrations never deletes storage.objects', () => {
  const unref = latestUnrefDeleteAssetSql();
  // Body ends at next create/revoke/comment-ish boundary; take a generous slice.
  const body = unref.slice(0, 3500);
  assert.match(body, /delete from public\.assets where id = p_asset_id/);
  assert.doesNotMatch(body, /delete from storage\.objects/i);
  assert.match(body, /class_syllabi where source_asset_id/);
});

test('teacher_delete_capture path still unrefs via _unref_delete_asset (matcher/capture RPC unchanged)', () => {
  const sql = read('supabase/migrations/20260816000000_people_photos_delete.sql');
  const delCap = sql.slice(
    sql.indexOf('create or replace function public._delete_capture'),
    sql.indexOf('create or replace function public._delete_roster_import'),
  );
  assert.match(delCap, /delete from public\.captures where id = p_capture_id/);
  assert.match(delCap, /perform public\._unref_delete_asset\(cap\.photo_asset_id\)/);
  assert.match(delCap, /perform public\._unref_delete_asset\(cap\.audio_asset_id\)/);

  const teacherDel = sql.slice(
    sql.indexOf('create or replace function public.teacher_delete_capture'),
    sql.indexOf('create or replace function public.teacher_delete_gap'),
  );
  assert.match(teacherDel, /perform public\._delete_capture\(p_capture_id\)/);
});

test('client deleteCapture: RPC first, then best-effort Storage API remove; Storage failure never thrown', () => {
  const src = read('src/lib/captures/delete.ts');
  assert.match(src, /\.rpc\(\s*'teacher_delete_capture'/);
  assert.match(src, /storage\.from\(bucket\)\.remove/);
  assert.match(src, /bestEffortRemoveStorageObjects|Orphan file OK/);
  // Prefetch then RPC then GC order: rpc appears before .remove in source.
  const rpcIdx = src.indexOf("rpc('teacher_delete_capture'");
  const removeIdx = src.indexOf('.remove(');
  assert.ok(rpcIdx > 0 && removeIdx > rpcIdx, 'Storage remove must follow teacher_delete_capture RPC');
  // Must not throw on storage failure after successful RPC.
  assert.match(src, /if \(error\) throw error/);
  const afterRpc = src.slice(rpcIdx);
  assert.match(afterRpc, /catch\s*\{/);
  assert.doesNotMatch(src, /delete from storage\.objects/i);
});

test('matcher / capture happy path modules untouched by storage SQL delete', () => {
  const matchName = read('src/lib/matching/matchName.ts');
  assert.doesNotMatch(matchName, /storage\.objects|_unref_delete_asset|teacher_delete_capture/);
  const api = read('src/lib/captures/api.ts');
  assert.match(api, /createCapture|attachCapture|matchName/);
  assert.doesNotMatch(api, /delete from storage\.objects/i);
});
