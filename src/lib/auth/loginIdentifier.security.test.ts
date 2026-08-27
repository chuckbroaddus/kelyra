import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260827000001_revoke_login_identifier_anon.sql';

test('Q10 migration: login_identifier revoked from anon/authenticated; service_role only', () => {
  const sql = read(migration);
  assert.match(sql, /revoke all on function public\.login_identifier\(text\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.login_identifier\(text\) to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.login_identifier\(text\) to anon/i);
});

test('Q10 client never calls login_identifier RPC; handle sign-in uses Edge', () => {
  const school = read('src/lib/school/api.ts');
  assert.doesNotMatch(school, /rpc\(['"]login_identifier['"]/);
  assert.doesNotMatch(school, /lookupLoginEmail/);

  const auth = read('src/lib/auth/api.ts');
  assert.doesNotMatch(auth, /rpc\(['"]login_identifier['"]/);
  assert.doesNotMatch(auth, /lookupLoginEmail/);
  assert.match(auth, /functions\.invoke\(['"]sign-in-handle['"]/);
  assert.match(auth, /auth\.setSession/);
  assert.match(auth, /auth\.signInWithPassword/);
});

test('Q10 Edge sign-in-handle does not return looked-up email', () => {
  const src = read('supabase/functions/sign-in-handle/index.ts');
  assert.match(src, /rpc\(['"]login_identifier['"]/);
  assert.match(src, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(src, /grant_type=password/);
  assert.match(src, /access_token/);
  assert.match(src, /refresh_token/);
  assert.doesNotMatch(src, /return json\(\s*\{[^}]*email/s);
  assert.match(src, /never echo the resolved email/i);
});

test('Q10 config: sign-in-handle verify_jwt is false', () => {
  const cfg = read('supabase/config.toml');
  assert.match(cfg, /\[functions\.sign-in-handle\]\s*\nverify_jwt\s*=\s*false/);
});
