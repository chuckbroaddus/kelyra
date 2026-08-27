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
