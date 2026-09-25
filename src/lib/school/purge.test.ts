import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { isPurged, purgeConfirmCopy } from './deactivate.ts';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('purge flag + confirm copy keep their name on what they made', () => {
  assert.equal(isPurged({ purged_at: '2026-09-25T19:00:00Z' }), true);
  assert.equal(isPurged({ purged_at: null }), false);
  const copy = purgeConfirmCopy('Ms. Lee');
  assert.equal(copy.confirmLabel, 'Permanently delete');
  assert.match(copy.body, /with their name on it/);
});

test('deleted rows get a danger Permanently delete swipe with typed-name confirm', () => {
  const ui = read('../../components/ui/PeopleAdmin.tsx');
  assert.match(ui, /key: 'purge',\s*\/\/[^\n]*\n\s*label: 'Perm\.\\nDelete',\s*tone: 'danger'/);
  assert.match(ui, /typeName=\{purgeTarget\?\.name \?\? null\}/);
  assert.match(ui, /purgePerson\(target\.id\)/);
  const api = read('./api.ts');
  assert.match(api, /rpc\('admin_purge_person'/);
  assert.match(api, /!row\.purged_at && \(options\?\.includeDeactivated/);
});

test('migration keeps content: drops auth.users FKs, keeps a name-only profile, deletes the login', () => {
  const sql = read('../../../supabase/migrations/20260925150000_purge_person.sql');
  assert.match(sql, /confrelid = 'auth\.users'::regclass/);
  assert.match(sql, /'public\.profiles'::regclass, 'public\.teachers'::regclass/);
  assert.match(sql, /if target\.deactivated_at is null then/);
  assert.match(sql, /if target\.purged_at is not null then/);
  assert.match(sql, /p_profile_id = auth\.uid\(\)/);
  assert.match(sql, /is_protected_staff/);
  assert.match(sql, /purged_at = now\(\)/);
  assert.match(sql, /delete from auth\.users where id = target\.id/);
  assert.match(sql, /delete from public\.message_thread_members where profile_id = target\.id/);
  // Never delete the profile row itself: author references (messages, posts, classes) keep the name.
  assert.doesNotMatch(sql, /delete from public\.profiles/);
  assert.doesNotMatch(sql, /delete from public\.teachers/);
  // Audit goes in before anything is removed.
  assert.ok(sql.indexOf("'purge_person'") < sql.indexOf('delete from public.message_thread_members'));
});

test('purge swipe label fits the tile as two short lines', () => {
  const admin = readFileSync(new URL('../../components/ui/PeopleAdmin.tsx', import.meta.url), 'utf8');
  assert.match(admin, /key: 'purge',[\s\S]{0,120}label: 'Perm\.\\nDelete',/);
});

test('purge fix: every cleanup delete is guarded so a missing table cannot abort the purge', () => {
  const sql = read('../../../supabase/migrations/20260925160000_purge_person_fix.sql');
  const body = sql.slice(sql.indexOf('create or replace function public.admin_purge_person'));
  assert.doesNotMatch(body, /^\s*delete from public\./m);
  assert.match(body, /purge_delete_rows\('post_dismissals', 'profile_id', target\.id\)/);
  assert.match(sql, /to_regclass\(format\('public\.%I', p_table\)\) is null/);
  assert.match(sql, /revoke all on function public\.purge_delete_rows\(text, text, uuid\) from public, anon, authenticated;/);
  assert.match(body, /delete from auth\.users where id = target\.id;/);
});
