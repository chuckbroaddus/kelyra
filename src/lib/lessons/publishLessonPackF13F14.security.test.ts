import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const edge = 'supabase/functions/publish-lesson-pack/index.ts';

test('F14 validateManifest always requires beat_start/beat_end in pack beat ids', () => {
  const src = read(edge);
  const start = src.indexOf('function validateManifest');
  const end = src.indexOf('async function listPrefix', start);
  const body = src.slice(start, end);
  assert.match(body, /beatIds\.size === 0/);
  assert.match(body, /beat_start\/beat_end must exist in the pack/);
  assert.doesNotMatch(body, /if \(beatIds\.size > 0\)/);
});

test('F13 shared-prefix replace_live skips orphan storage deletes', () => {
  const src = read(edge);
  assert.match(src, /sharedPrefix/);
  assert.match(src, /if \(!sharedPrefix\)/);
  assert.match(src, /catalog-only slice|shared the prefix/i);
  const orphanIdx = src.indexOf('sharedPrefix');
  const removeIdx = src.indexOf(".remove(orphans)");
  assert.ok(orphanIdx > 0 && removeIdx > orphanIdx);
  // remove only inside !sharedPrefix block
  const block = src.slice(src.indexOf('const sharedPrefix'), src.indexOf('const packRow'));
  assert.match(block, /if \(!sharedPrefix\)/);
  assert.match(block, /\.remove\(orphans\)/);
});
