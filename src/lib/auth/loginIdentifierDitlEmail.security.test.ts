import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration =
  'supabase/migrations/20260924001000_login_identifier_coalesce_auth_email.sql';
const laneB = 'scripts/ditl_seed_auth_admin.mjs';

test('t_cddd654c migration: backfill profiles.email + coalesce auth.users; service_role only', () => {
  const sql = read(migration);
  assert.match(sql, /update public\.profiles p/i);
  assert.match(sql, /from auth\.users u/i);
  assert.match(sql, /p\.email is null/i);
  assert.match(sql, /create or replace function public\.login_identifier/i);
  assert.match(sql, /coalesce\(nullif\(trim\(p\.email\)/i);
  assert.match(sql, /left join auth\.users u on u\.id = p\.id/i);
  assert.match(sql, /revoke all on function public\.login_identifier\(text\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.login_identifier\(text\) to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.login_identifier\(text\) to anon/i);
});

test('t_cddd654c Lane B seed writes profiles.email and backfills nulls', () => {
  const src = read(laneB);
  assert.match(src, /username,\s*\n\s*email,/);
  assert.match(src, /\$\{username\}@ditl\.test/);
  assert.match(src, /backfillMissingProfileEmails/);
  assert.match(src, /email patch existing/);
});
