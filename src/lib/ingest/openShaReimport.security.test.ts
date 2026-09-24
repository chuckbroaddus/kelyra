import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration =
  'supabase/migrations/20260924002000_ingest_batches_open_sha_exclude_done_partial.sql';

test('t_ca6ce548: open_sha uidx excludes done|partial|abandoned|failed (re-import after confirm)', () => {
  const sql = read(migration);
  assert.match(sql, /drop index if exists public\.ingest_batches_open_sha_uidx/i);
  assert.match(sql, /create unique index ingest_batches_open_sha_uidx/i);
  assert.match(
    sql,
    /status not in \('abandoned',\s*'failed',\s*'done',\s*'partial'\)/,
  );
  // Must still be partial unique (WHERE clause) — not a full-table unique.
  assert.match(sql, /where status not in/i);
  assert.match(sql, /original_sha256 is not null/i);
});
