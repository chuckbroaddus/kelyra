import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const f10 = 'supabase/migrations/20260908000003_get_parent_card_uniform_deny.sql';
const f11 = 'supabase/migrations/20260908000004_parents_admin_school_scoped.sql';

test('F10 get_parent_card: single not allowed for missing and unauthorized', () => {
  const sql = read(f10);
  assert.match(sql, /create or replace function public\.get_parent_card\(p_parent_id uuid\)/i);
  const body = sql.slice(sql.indexOf('as $$'), sql.indexOf('$$;', sql.indexOf('as $$')));
  assert.match(body, /raise exception 'not allowed'/);
  assert.doesNotMatch(body, /raise exception 'not found'/);
  assert.match(body, /public\.parent_on_taught_class\(p_parent_id\)/);
  assert.match(body, /public\.is_school_admin\(\)/);
  assert.match(body, /if not allowed then/);
  // Missing/unauthorized share the post-authz 'not allowed' (null auth also uses that string).
  assert.ok(body.lastIndexOf("raise exception 'not allowed'") > body.indexOf('select * into card'));
  assert.ok(body.indexOf('if not allowed then') > body.indexOf('select * into card'));
});

test('F11 parents_admin_all scoped to my_school_id / same-school linkage', () => {
  const sql = read(f11);
  assert.match(sql, /drop policy if exists parents_admin_all on public\.parents/i);
  assert.match(sql, /create policy parents_admin_all on public\.parents/i);
  assert.match(sql, /public\.my_school_id\(\)/);
  assert.match(sql, /x\.id = parents\.teacher_id or x\.parent_id = parents\.id/);
  assert.match(sql, /with check/);
  // Must not be bare is_school_admin().
  const using = sql.slice(sql.indexOf('using ('), sql.indexOf('with check'));
  assert.match(using, /is_school_admin/);
  assert.match(using, /my_school_id/);
});
