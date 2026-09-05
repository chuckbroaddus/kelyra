import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260908000001_sign_in_handle_rate_limit.sql';
const edge = 'supabase/functions/sign-in-handle/index.ts';

test('F02 migration: durable sign_in_handle_rate + service_role-only check RPC', () => {
  const sql = read(migration);
  assert.match(sql, /create table if not exists public\.sign_in_handle_rate/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /create or replace function public\.sign_in_handle_rate_check\(/i);
  assert.match(sql, /security definer/i);
  assert.match(
    sql,
    /revoke all on function public\.sign_in_handle_rate_check\(text, integer, integer\) from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.sign_in_handle_rate_check\(text, integer, integer\) to service_role/i,
  );
  assert.doesNotMatch(sql, /grant execute on function public\.sign_in_handle_rate_check[^\n]* to (anon|authenticated)/i);
});

test('F02 Edge: rate limit uses DB RPC, not process-local Map', () => {
  const src = read(edge);
  assert.match(src, /rpc\(\s*'sign_in_handle_rate_check'/);
  assert.doesNotMatch(src, /new Map\s*</);
  assert.doesNotMatch(src, /function allowAttempt/);
  assert.match(src, /WINDOW_MS|p_window_ms/);
  assert.match(src, /MAX_ATTEMPTS|p_max_attempts/);
});

test('F03 Edge: always password-grant; dummy on lookup miss; never echo email', () => {
  const src = read(edge);
  assert.match(src, /DEFAULT_DUMMY_EMAIL|SIGN_IN_DUMMY_EMAIL/);
  assert.match(src, /grantEmail/);
  assert.match(src, /grant_type=password/);
  // Must not early-return on lookup miss before the password grant fetch.
  const lookup = src.indexOf("rpc('login_identifier'");
  const grant = src.indexOf('grant_type=password');
  assert.ok(lookup > 0 && grant > lookup, 'password grant must follow login_identifier');
  const between = src.slice(lookup, grant);
  assert.doesNotMatch(between, /return json\(\s*\{\s*error:\s*FAIL\s*\}\s*,\s*401\s*\)/);
  assert.match(src, /!resolved/);
  assert.match(src, /never echo the resolved email/i);
  assert.doesNotMatch(src, /return json\(\s*\{[^}]*email/s);
});
