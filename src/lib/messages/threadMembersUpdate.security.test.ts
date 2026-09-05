import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function migration(name: string): string {
  return readFileSync(join(root, 'supabase/migrations', name), 'utf8');
}

test('Q2 insert fail-closed stays applied; no second insert migration', () => {
  const sql = migration('20260826000002_fail_closed_thread_members_insert.sql');
  assert.match(sql, /drop policy if exists thread_members_insert/i);
  assert.match(sql, /revoke insert on public\.message_thread_members from public, anon, authenticated/i);
});

test('Q2 update fail-closed: column UPDATE only + self_update cannot move thread_id', () => {
  const sql = migration('20260826000003_fail_closed_thread_members_update.sql');
  assert.match(sql, /revoke update on public\.message_thread_members from public, anon, authenticated/i);
  assert.match(
    sql,
    /grant update\s*\(\s*last_read_at\s*,\s*muted_at\s*\)\s*on public\.message_thread_members to authenticated/i,
  );
  assert.doesNotMatch(sql, /grant update\s+on public\.message_thread_members/i);
  assert.match(sql, /drop policy if exists thread_members_self_update/i);
  assert.match(sql, /with check\s*\(\s*profile_id = auth\.uid\(\)\s*and public\.is_thread_member\(thread_id\)\s*\)/i);
  assert.doesNotMatch(sql, /create policy thread_members_insert/i);
  assert.doesNotMatch(sql, /grant insert/i);
});

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('T19/T21/T22 client behavior: markRead updates last_read_at only; membership via RPC', () => {
  const api = readSrc('src/lib/messages/api.ts');

  const markAt = api.indexOf('export async function markRead');
  assert.ok(markAt > 0);
  const markBody = api.slice(markAt, api.indexOf('export async function', markAt + 1));
  assert.match(markBody, /\.from\('message_thread_members'\)/);
  assert.match(markBody, /\.update\(\{\s*last_read_at:/);
  assert.doesNotMatch(markBody, /\.update\(\{[^}]*thread_id/);
  assert.match(markBody, /\.eq\('profile_id'/);
  assert.doesNotMatch(markBody, /pinned_at/);

  assert.match(api, /rpc\('add_group_member'/);
  assert.match(api, /rpc\('remove_group_member'/);
  assert.match(api, /rpc\('set_thread_muted'/);
  assert.match(api, /rpc\('set_thread_pinned'/);
  assert.doesNotMatch(api, /\.from\('message_thread_members'\)\s*\.insert/);
  assert.doesNotMatch(api, /\.update\(\{[^}]*thread_id/);
});

test('T19/T21/T22 privilege matrix: INSERT revoked; UPDATE columns last_read_at+muted_at only; no pinned_at grant', () => {
  const insertSql = migration('20260826000002_fail_closed_thread_members_insert.sql');
  const updateSql = migration('20260826000003_fail_closed_thread_members_update.sql');
  assert.match(insertSql, /revoke insert on public\.message_thread_members from public, anon, authenticated/i);
  assert.match(
    updateSql,
    /grant update\s*\(\s*last_read_at\s*,\s*muted_at\s*\)\s*on public\.message_thread_members to authenticated/i,
  );
  assert.match(updateSql, /do not grant it here/i);
  assert.doesNotMatch(updateSql, /grant update\s*\([^)]*pinned_at/i);
  assert.doesNotMatch(updateSql, /grant insert/i);
  // Live authenticated INSERT / thread_id UPDATE fail still needs DB JWT fixture.
});
