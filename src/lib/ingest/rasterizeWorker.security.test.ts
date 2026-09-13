import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('I2-01 dedicated worker path exists; no Edge rasterize-* function', () => {
  assert.ok(existsSync(join(root, 'workers/ingest-rasterize/src/index.ts')));
  assert.ok(existsSync(join(root, 'workers/ingest-rasterize/Dockerfile')));
  const fns = readdirSync(join(root, 'supabase/functions'));
  for (const n of fns) assert.doesNotMatch(n, /^rasterize/);
});

test('I2-02 pages_done migration additive; worker polls + healthz', () => {
  const sql = readFileSync(
    join(root, 'supabase/migrations/20260913000003_ingest_rasterize_progress.sql'),
    'utf8',
  );
  assert.match(sql, /add column if not exists pages_done/);
  assert.match(sql, /do not apply/i);

  const index = readFileSync(join(root, 'workers/ingest-rasterize/src/index.ts'), 'utf8');
  assert.match(index, /\/healthz/);
  assert.match(index, /POLL_MS|setInterval/);
  assert.match(index, /claimNextBatch/);
});

test('I2-03 ADR-016: worker must not send class PDF to a model', () => {
  const srcDir = join(root, 'workers/ingest-rasterize/src');
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.ts'));
  const joined = files.map((f) => readFileSync(join(srcDir, f), 'utf8')).join('\n');
  assert.doesNotMatch(joined, /XAI_API_KEY|analyze-homework|generateContent|chat\/completions/);
  assert.match(joined, /encrypted_pdf/);
});
