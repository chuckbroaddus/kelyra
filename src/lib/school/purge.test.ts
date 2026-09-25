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
  assert.match(ui, /key: 'purge',\s*label: 'Permanently delete',\s*tone: 'danger'/);
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
