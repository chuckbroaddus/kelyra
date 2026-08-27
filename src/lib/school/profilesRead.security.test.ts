import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260827000000_tighten_profiles_read.sql';

test('Q9 migration: profiles_read is not any-login → all rows', () => {
  const sql = read(migration);
  assert.match(sql, /drop policy if exists profiles_read on public\.profiles/i);
  assert.match(sql, /create policy profiles_read on public\.profiles/i);
  assert.match(sql, /id = auth\.uid\(\)/i);
  assert.match(sql, /public\.is_school_admin\(\)/i);
  assert.match(sql, /public\.my_school_id\(\)/i);
  assert.match(sql, /school_id is not distinct from public\.my_school_id\(\)/i);
  assert.match(sql, /public\.shares_message_thread\(id\)/i);
  assert.match(sql, /public\.can_message\(auth\.uid\(\), id\)/i);
  assert.doesNotMatch(sql, /using\s*\(\s*auth\.uid\(\)\s+is\s+not\s+null\s*\)/i);
  assert.doesNotMatch(sql, /is_staff_profile/);
});

test('Q9 migration: shares_message_thread is security definer and granted to authenticated only', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.shares_message_thread\(p_other uuid\)/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /from public\.message_thread_members mine/i);
  assert.match(sql, /revoke all on function public\.shares_message_thread\(uuid\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.shares_message_thread\(uuid\) to authenticated/i);
});

test('Q9 call sites still load self, by id, and message hydrate from profiles', () => {
  const school = read('src/lib/school/api.ts');
  assert.match(school, /from\('profiles'\)\.select\('\*'\)\.eq\('id', uid\)/);
  assert.match(school, /from\('profiles'\)\.select\('\*'\)\.eq\('id', id\)\.single\(\)/);
  assert.match(school, /from\('profiles'\)\s*\n\s*\.select\('\*'\)\s*\n\s*\.order\('display_name'/);

  const messages = read('src/lib/messages/api.ts');
  assert.match(messages, /from\('profiles'\)\.select\('\*'\)\.in\('id', unique\)/);

  const go = read('src/lib/messages/go.ts');
  assert.match(go, /from\('profiles'\)/);
  assert.match(go, /\.eq\('username', handle\)/);

  const classes = read('src/lib/classes/api.ts');
  assert.match(classes, /from\('profiles'\)\.select\('id, username, display_name, email, student_id, parent_id'\)\.in\('id', ids\)/);
});
