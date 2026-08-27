import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('Q5 migration: get_parent_card is taught-class / office, not is_staff', () => {
  const sql = read('supabase/migrations/20260826000005_tighten_get_parent_card.sql');
  assert.match(sql, /create or replace function public\.get_parent_card\(p_parent_id uuid\)/i);
  assert.match(sql, /public\.is_school_admin\(\)/i);
  assert.match(sql, /public\.parent_on_taught_class\(p_parent_id\)/i);
  assert.match(sql, /public\.my_school_id\(\)/i);
  assert.match(sql, /x\.parent_id = card\.id/i);
  assert.doesNotMatch(sql, /is_staff_profile/);
  assert.match(sql, /revoke all on function public\.get_parent_card\(uuid\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.get_parent_card\(uuid\) to authenticated/i);
});

test('Q5 getParent still uses get_parent_card RPC fallback; no second dump', () => {
  const src = read('src/lib/parents/api.ts');
  const fn = src.slice(src.indexOf('export async function getParent'));
  const body = fn.slice(0, fn.indexOf('export async function renameParent'));
  assert.match(body, /from\('parents'\)\.select\('\*'\)/);
  assert.match(body, /rpc\('get_parent_card'/);
  assert.doesNotMatch(body, /school_parents_for_link/);
});
