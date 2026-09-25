import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('NoticePopup shows the animated K Working line while working (one Modal)', () => {
  const src = read('NoticePopup.tsx');
  assert.match(src, /WORKING-POPUP/);
  assert.match(src, /<WorkingLine size=\{36\} text=\{working \?\? 'Working…'\} \/>/);
  assert.match(src, /if \(busy \|\| !notice\) return;/);
});

test('Create account shows Working while the account is being created', () => {
  const src = read('PeopleAdmin.tsx');
  assert.match(src, /working=\{busy \? 'Creating account…' : null\}/);
});
