import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('T05 client types no longer declare login_identifier RPC', () => {
  const types = read('src/lib/supabase/types.ts');
  assert.doesNotMatch(types, /login_identifier\s*:/);
});

test('T16/T17 ai:dev loadImageForGrok uses redirect error', () => {
  const src = read('scripts/ai-dev-server.mjs');
  const start = src.indexOf('async function loadImageForGrok');
  assert.ok(start > 0);
  const body = src.slice(start, start + 400);
  assert.match(body, /fetch\(imageUrl,\s*\{\s*redirect:\s*'error'\s*\}\)/);
});
