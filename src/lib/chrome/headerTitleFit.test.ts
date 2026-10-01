import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { fitHeaderTitleSize, HEADER_TITLE_MIN_SIZE } from './headerTitleFit.ts';

const root = join(import.meta.dirname, '..', '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

test('fits: title that fits keeps the base size', () => {
  assert.deepEqual(fitHeaderTitleSize(175, 120, 18), { fontSize: 18, truncated: false });
  assert.deepEqual(fitHeaderTitleSize(120.4, 120.8, 18), { fontSize: 18, truncated: false });
});

test('fits: "Grading policy" (120 pt at 18) beside the school logo at 375 (103 pt slot) shrinks, no ellipsis', () => {
  const r = fitHeaderTitleSize(103, 120, 18);
  assert.equal(r.truncated, false);
  assert.ok(r.fontSize >= HEADER_TITLE_MIN_SIZE && r.fontSize < 18);
  assert.ok((120 * r.fontSize) / 18 <= 103);
});

test('fits: too narrow even at the floor stays at the floor and truncates (ellipsis on the right)', () => {
  assert.deepEqual(fitHeaderTitleSize(48, 120, 18), { fontSize: HEADER_TITLE_MIN_SIZE, truncated: true });
});

test('fits: unmeasured (0) clip or text keeps the base size', () => {
  assert.deepEqual(fitHeaderTitleSize(0, 120, 18), { fontSize: 18, truncated: false });
  assert.deepEqual(fitHeaderTitleSize(100, 0, 20), { fontSize: 20, truncated: false });
});

test('AppHeader wordmark: no marquee, one line, tail ellipsis', () => {
  const header = read('src/components/ui/AppHeader.tsx');
  assert.doesNotMatch(header, /MarqueeText/);
  assert.match(header, /<HeaderTitle/);
  const title = read('src/components/ui/HeaderTitle.tsx');
  assert.match(title, /numberOfLines=\{1\}/);
  assert.match(title, /ellipsizeMode="tail"/);
  assert.doesNotMatch(title, /translateX/);
});
