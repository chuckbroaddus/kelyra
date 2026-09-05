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

import {
  DEFAULT_DUMMY_EMAIL,
  normalizeSignInHandle,
  pickGrantEmail,
  resolveLoginEmail,
  sessionResponseKeys,
  sessionTokensOnly,
  shouldReturnSession,
} from '../../../supabase/functions/_shared/signInHandlePolicy.ts';
import { handleFromInput } from '../school/roles.ts';

test('T04 behavioral: normalizeSignInHandle matches client handleFromInput core', () => {
  assert.equal(normalizeSignInHandle('@Ada.Lovelace'), 'ada.lovelace');
  assert.equal(normalizeSignInHandle('  Bob  '), 'bob');
  assert.equal(normalizeSignInHandle('X'.repeat(40)).length, 32);
  // Client handleFromInput has no 32-cap; Edge does — both strip @ and lower.
  assert.equal(handleFromInput('@Ada'), 'ada');
});

test('T04 behavioral: sessionTokensOnly never includes email; miss path withholds tokens', () => {
  const tokens = sessionTokensOnly({
    access_token: 'a.jwt.here',
    refresh_token: 'r.jwt.here',
  });
  assert.deepEqual(sessionResponseKeys(tokens), ['access_token', 'refresh_token']);
  assert.equal('email' in tokens, false);

  assert.equal(resolveLoginEmail('kid@school.test', null), 'kid@school.test');
  assert.equal(resolveLoginEmail('not-an-email', null), null);
  assert.equal(resolveLoginEmail('kid@school.test', { message: 'fail' }), null);
  assert.equal(pickGrantEmail(null), DEFAULT_DUMMY_EMAIL);
  assert.equal(pickGrantEmail('a@b.c', 'dummy@x'), 'a@b.c');

  assert.equal(shouldReturnSession(null, true, tokens), false);
  assert.equal(shouldReturnSession('a@b.c', false, tokens), false);
  assert.equal(shouldReturnSession('a@b.c', true, { access_token: 'a' }), false);
  assert.equal(shouldReturnSession('a@b.c', true, tokens), true);
});

test('T04 Edge drift: still uses login_identifier + token-only success shape', () => {
  const src = read('supabase/functions/sign-in-handle/index.ts');
  assert.match(src, /rpc\(['"]login_identifier['"]/);
  assert.match(src, /access_token:\s*tokenPayload\.access_token/);
  assert.match(src, /refresh_token:\s*tokenPayload\.refresh_token/);
  assert.doesNotMatch(src, /return json\(\s*\{[^}]*email/s);
  assert.match(src, /never echo the resolved email/i);
  // Shared policy mirrors Edge; live anon RPC deny still needs DB JWT fixture.
  assert.match(read('supabase/functions/_shared/signInHandlePolicy.ts'), /sessionTokensOnly/);
});
