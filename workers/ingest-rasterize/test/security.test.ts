import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const workerRoot = join(process.cwd());
const repoRoot = join(workerRoot, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|js|mjs|md|Dockerfile)$/.test(name) || name === 'Dockerfile') out.push(p);
  }
  return out;
}

test('I2-sec: worker lives under workers/ingest-rasterize not supabase/functions/rasterize-*', () => {
  assert.match(workerRoot.replace(/\\/g, '/'), /workers\/ingest-rasterize$/);
  const fnDir = join(repoRoot, 'supabase', 'functions');
  const names = readdirSync(fnDir);
  for (const n of names) {
    assert.doesNotMatch(n, /^rasterize/);
  }
});

test('I2-sec: worker sources never call model / never attach class PDF to AI', () => {
  const files = walk(join(workerRoot, 'src'));
  assert.ok(files.length > 0);
  const joined = files.map((f) => readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(joined, /XAI_API_KEY/);
  assert.doesNotMatch(joined, /GEMINI|GOOGLE_API_KEY/i);
  assert.doesNotMatch(joined, /analyze-homework/);
  assert.doesNotMatch(joined, /openai|anthropic/i);
  assert.doesNotMatch(joined, /supabase\/functions\/rasterize/);
  // Must not POST PDF bytes to a completion endpoint
  assert.doesNotMatch(joined, /chat\/completions/);
  assert.doesNotMatch(joined, /generateContent/);
});

test('I2-sec: Dockerfile documents no model key', () => {
  const df = readFileSync(join(workerRoot, 'Dockerfile'), 'utf8');
  assert.match(df, /Never XAI_API_KEY/);
  assert.match(df, /poppler-utils/);
  assert.doesNotMatch(df, /EXPO_PUBLIC/);
});

test('I2-sec: progress migration adds pages_done only (no live apply in worker)', () => {
  const sql = readFileSync(
    join(repoRoot, 'supabase', 'migrations', '20260913000002_ingest_rasterize_progress.sql'),
    'utf8',
  );
  assert.match(sql, /pages_done/);
  assert.match(sql, /do not apply/i);
  assert.doesNotMatch(sql, /drop table/i);
});
