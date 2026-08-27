import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('Q3 migration: create_school_class is office-only via is_school_admin', () => {
  const sql = read('supabase/migrations/20260826000004_office_only_create_school_class.sql');
  assert.match(sql, /create or replace function public\.create_school_class\(p_name text\)/i);
  assert.match(sql, /not public\.is_school_admin\(\)/i);
  assert.doesNotMatch(sql, /is_staff_profile/);
  assert.match(sql, /teacher_id,\s*name,\s*name_source/i);
  assert.match(sql, /values\s*\(\s*null,\s*n,\s*'typed'\s*\)/i);
});

test('Q3 createClass fails closed: no client classes insert fallback', () => {
  const src = read('src/lib/classes/api.ts');
  const fn = src.slice(src.indexOf('export async function createClass'));
  const body = fn.slice(0, fn.indexOf('export async function listClassesForChildren'));
  assert.match(body, /rpc\('create_school_class'/);
  assert.match(body, /if \(rpc\.error\) throw/);
  assert.doesNotMatch(body, /\.from\('classes'\)\s*\.insert/);
  assert.doesNotMatch(body, /teacher_id:\s*null/);
});

test('Q3 home: teachers have no Create class; office only', () => {
  const src = read('src/app/index.tsx');
  assert.match(src, /canCreateClass\s*=\s*isOfficeRole\(profile\)/);
  assert.doesNotMatch(src, /canCreateClass\s*=\s*teaches\s*\|\|/);
  assert.match(src, /The office assigns the classes you teach/);
  assert.match(src, /if \(isOfficeRole\(profile\)\) router\.replace\(`\/admin\/class\/\$\{created\.id\}`\)/);
});

test('Q3 Ask create_class is office-gated; matrix teachers cannot create', () => {
  const ask = read('src/lib/ai/askTools.ts');
  assert.match(
    ask,
    /if \(spec\.def\.name === 'create_class'\) return isOfficeRole\(ctx\.profile\)/,
  );
  assert.match(ask, /Only the office can create a class/);
  const matrix = read('src/lib/school/matrix.ts');
  assert.match(
    matrix,
    /id:\s*'classes\.create'[\s\S]*?teacher:\s*'none'/,
  );
});
