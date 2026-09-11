import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260911000003_class_avatar.sql';

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

test('class avatar migration: column + set_class_avatar same wall as feed icon', () => {
  const sql = read(migration);
  assert.match(sql, /alter table public\.classes\s+add column if not exists avatar_asset_id uuid references public\.assets/);
  assert.match(sql, /create or replace function public\.set_class_avatar\(p_class_id uuid, p_asset_id uuid\)/);
  const body = sql.slice(
    sql.indexOf('create or replace function public.set_class_avatar'),
    sql.indexOf('revoke all on function public.set_class_avatar'),
  );
  assert.match(body, /public\.is_school_admin\(\) or public\.teaches_class\(p_class_id\)/);
  assert.match(body, /from public\.assets where id = p_asset_id and teacher_id = auth\.uid\(\)/);
  assert.match(body, /perform public\._unref_delete_asset\(prev\)/);
  assert.match(body, /write_audit\(\s*'set_class_avatar'/);
  assert.match(sql, /grant execute on function public\.set_class_avatar\(uuid, uuid\) to authenticated/);
});

test('latest _unref_delete_asset guards classes.avatar_asset_id and never deletes storage.objects', () => {
  const unref = latestUnrefDeleteAssetSql();
  const body = unref.slice(0, 4000);
  assert.match(body, /classes where avatar_asset_id/);
  assert.match(body, /schools where logo_asset_id/);
  assert.match(body, /delete from public\.assets where id = p_asset_id/);
  assert.doesNotMatch(body, /delete from storage\.objects/i);
});

test('student_classes returns avatar_photo_path from classes.avatar_asset_id', () => {
  const sql = read(migration);
  assert.match(sql, /drop function if exists public\.student_classes\(\)/);
  const fn = sql.slice(sql.indexOf('create function public.student_classes()'));
  assert.match(fn, /avatar_photo_path text/);
  assert.match(fn, /left join public\.assets c_asset on c_asset\.id = c\.avatar_asset_id/);
  assert.match(fn, /c_asset\.storage_path/);
});

test('client: Settings and office Teacher pane reuse ClassAvatarRow / PhotoSheet', () => {
  const settings = read('src/app/class/[id]/settings.tsx');
  const office = read('src/app/admin/class/[id].tsx');
  const row = read('src/components/ui/ClassAvatarRow.tsx');
  const api = read('src/lib/classes/avatar.ts');
  assert.match(settings, /<ClassAvatarRow /);
  assert.match(office, /<ClassAvatarRow /);
  assert.match(row, /<PhotoSheet/);
  assert.match(row, /title="Class avatar"/);
  assert.match(row, /pickAndSetClassAvatar/);
  assert.match(row, /setClassAvatar\(klass\.id, null\)/);
  assert.match(api, /\.rpc\(\s*'set_class_avatar'/);
  assert.match(api, /uploadTeacherAsset/);
  assert.match(api, /pickNormalizedPhoto/);
});

test('class lists that already show a class circle pass avatarUrl', () => {
  const home = read('src/app/index.tsx');
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  const profile = read('src/app/profile.tsx');
  const rooms = read('src/components/ui/StudentWorkList.tsx');
  assert.match(home, /photoUrl=\{item\.avatarUrl\}/);
  assert.match(drawer, /photoUrl=\{klass\.avatarUrl\}/);
  assert.match(profile, /photoUrl=\{klass\.avatarUrl\}/);
  assert.match(rooms, /room\.avatarPhotoUrl/);
});
