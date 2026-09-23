import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  ingestStoragePathPrefix,
  isIngestStoragePathBound,
} from './storagePath.ts';

const uid = '11111111-1111-1111-1111-111111111111';
const batchId = '22222222-2222-2222-2222-222222222222';
const otherUid = '33333333-3333-3333-3333-333333333333';
const otherBatch = '44444444-4444-4444-4444-444444444444';

test('FL-19 ingestStoragePathPrefix is {uid}/ingest/{batchId}/', () => {
  assert.equal(
    ingestStoragePathPrefix(uid, batchId),
    `${uid}/ingest/${batchId}/`,
  );
});

test('FL-19 right prefix: path under {uid}/ingest/{batchId}/ is bound', () => {
  const prefix = ingestStoragePathPrefix(uid, batchId);
  assert.equal(isIngestStoragePathBound(`${prefix}file.pdf`, uid, batchId), true);
  assert.equal(
    isIngestStoragePathBound(`${prefix}a/b/c.jpg`, uid, batchId),
    true,
  );
});

test('FL-19 wrong prefix: other uid / other batch / missing slash / empty refuse', () => {
  const prefix = ingestStoragePathPrefix(uid, batchId);
  assert.equal(
    isIngestStoragePathBound(`${otherUid}/ingest/${batchId}/file.pdf`, uid, batchId),
    false,
  );
  assert.equal(
    isIngestStoragePathBound(`${uid}/ingest/${otherBatch}/file.pdf`, uid, batchId),
    false,
  );
  assert.equal(
    isIngestStoragePathBound(`${uid}/ride/${batchId}/file.pdf`, uid, batchId),
    false,
  );
  // Exact prefix with no object name is not "under" the folder
  assert.equal(isIngestStoragePathBound(prefix.slice(0, -1), uid, batchId), false);
  assert.equal(isIngestStoragePathBound(prefix, uid, batchId), false);
  assert.equal(isIngestStoragePathBound('', uid, batchId), false);
});

test('FL-19 SQL migration binds register_ingest_file to same prefix shape', () => {
  const root = process.cwd();
  const sql = readFileSync(
    join(root, 'supabase/migrations/20260923090000_register_ingest_file_path_bind.sql'),
    'utf8',
  );
  assert.match(sql, /create or replace function public\.register_ingest_file/i);
  assert.ok(
    sql.includes("auth.uid()::text || '/ingest/' || p_batch_id::text || '/'"),
    'SQL expected_prefix must match ingestStoragePathPrefix shape',
  );
  assert.match(sql, /invalid_storage_path/);
  assert.match(sql, /left\(p_storage_path,\s*length\(expected_prefix\)\)/);
  // Header documents additive replace (do not edit original I0 migration in place)
  assert.match(sql, /do not edit 20260913000000_ingest_batches\.sql in place/i);
});
