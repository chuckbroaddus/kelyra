import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ASK_STORAGE_HOST, isAllowedAskImageUrl } from './askImageUrl.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function readRel(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

/** Strip TS/export surface so Edge (.ts) and ai:dev (.mjs) twins can match. */
function normalizeAllowlistSource(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\bexport /g, '')
    .replace(/: string\b/g, '')
    .replace(/: URL\b/g, '')
    .replace(/: boolean\b/g, '')
    .trim();
}

test('allows data: images', () => {
  assert.equal(isAllowedAskImageUrl('data:image/jpeg;base64,abc'), true);
});

test('allows this project storage https object URLs', () => {
  assert.equal(
    isAllowedAskImageUrl(
      `https://${ASK_STORAGE_HOST}/storage/v1/object/sign/photos/school/a.jpg?token=x`,
    ),
    true,
  );
  assert.equal(
    isAllowedAskImageUrl(`https://${ASK_STORAGE_HOST}/storage/v1/object/public/photos/a.jpg`),
    true,
  );
});

test('rejects http, off-host, and non-storage paths', () => {
  assert.equal(
    isAllowedAskImageUrl(`http://${ASK_STORAGE_HOST}/storage/v1/object/sign/photos/a.jpg`),
    false,
  );
  assert.equal(
    isAllowedAskImageUrl('https://evil.example/storage/v1/object/sign/photos/a.jpg'),
    false,
  );
  assert.equal(
    isAllowedAskImageUrl(`https://other.supabase.co/storage/v1/object/sign/photos/a.jpg`),
    false,
  );
  assert.equal(isAllowedAskImageUrl(`https://${ASK_STORAGE_HOST}/rest/v1/profiles`), false);
  assert.equal(isAllowedAskImageUrl(`https://${ASK_STORAGE_HOST}/storage/v1/bucket/photos`), false);
});

test('rejects private, loopback, link-local, and metadata hosts', () => {
  assert.equal(isAllowedAskImageUrl('https://127.0.0.1/storage/v1/object/x'), false);
  assert.equal(isAllowedAskImageUrl('https://10.0.0.8/storage/v1/object/x'), false);
  assert.equal(isAllowedAskImageUrl('https://192.168.1.1/storage/v1/object/x'), false);
  assert.equal(isAllowedAskImageUrl('https://172.16.0.1/storage/v1/object/x'), false);
  assert.equal(isAllowedAskImageUrl('https://169.254.169.254/latest/meta-data'), false);
  assert.equal(isAllowedAskImageUrl('https://metadata.google.internal/computeMetadata/v1'), false);
  assert.equal(isAllowedAskImageUrl('https://localhost/storage/v1/object/x'), false);
});

test('Ask image allowlist copies stay in lockstep (Edge + ai:dev + src)', () => {
  const src = readRel('src/lib/ai/askImageUrl.ts');
  const edge = readRel('supabase/functions/_shared/askImageUrl.ts');
  const mjs = readRel('scripts/lib/ask-image-url.mjs');
  assert.equal(normalizeAllowlistSource(src), normalizeAllowlistSource(edge), 'src vs Edge _shared drifted');
  assert.equal(normalizeAllowlistSource(src), normalizeAllowlistSource(mjs), 'src vs scripts/lib drifted');
});
