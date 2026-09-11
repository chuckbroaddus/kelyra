import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

test('KEYGRADE family omit: drafts / keys listed in FAMILY_OMIT (S1 T1 / M11)', () => {
  const api = readFileSync(join(root, 'src/lib/explain/api.ts'), 'utf8');
  assert.match(api, /FAMILY_OMIT_CAPTURE_KEYS/);
  assert.match(api, /model_draft/);
  assert.match(api, /draft_score/);
  assert.match(api, /key_items/);
  assert.match(api, /key_asset_id/);
  assert.match(api, /omitFamilyCaptureSecrets/);

  const familyDto = readFileSync(join(root, 'src/lib/explain/familyDto.ts'), 'utf8');
  assert.match(familyDto, /key_items/);
  assert.match(familyDto, /extract/);

  // Behavioral: omit helper deletes listed keys
  const start = api.indexOf('export function omitFamilyCaptureSecrets');
  assert.ok(start > 0);
  const fn = api.slice(start, start + 400);
  assert.match(fn, /for \(const key of FAMILY_OMIT_CAPTURE_KEYS\)/);
  assert.match(fn, /delete next\[key\]/);
});

test('FAMILY_CAPTURE_SELECT omits drafts and keys', () => {
  const api = readFileSync(join(root, 'src/lib/explain/api.ts'), 'utf8');
  const sel = api.slice(api.indexOf('FAMILY_CAPTURE_SELECT'), api.indexOf('FAMILY_OMIT_CAPTURE_KEYS'));
  assert.doesNotMatch(sel, /model_draft|draft_score|key_items|explain_draft/);
  assert.match(sel, /approved_score/);
});
