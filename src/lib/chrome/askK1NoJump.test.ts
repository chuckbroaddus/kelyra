import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('K1 markSlot is square markSize (not bar-tall) so Soft shares optical center', () => {
  const header = read('src/components/ui/AppHeader.tsx');
  assert.match(header, /const markSize = bar \+ 12/);
  assert.match(header, /styles\.markSlot, \{ width: markSize, height: markSize \}/);
  assert.doesNotMatch(header, /styles\.markSlot, \{ width: markSize, height: bar \}/);
});

test('K1 markSlot / bar clip Soft on native (no Yoga expand)', () => {
  const header = read('src/components/ui/AppHeader.tsx');
  assert.match(header, /markSlot:[\s\S]*overflow: Platform\.OS === 'web' \? 'visible' : 'hidden'/);
  assert.match(header, /bar:[\s\S]*overflow: Platform\.OS === 'web' \? 'visible' : 'hidden'/);
  assert.match(header, /collapsable=\{false\}/);
});

test('SoftMark layers are absoluteFill; canvas clips on native', () => {
  const soft = read('src/components/ui/SoftMark.tsx');
  assert.match(soft, /StyleSheet\.absoluteFill/);
  assert.match(soft, /overflow: Platform\.OS === 'web' \? 'visible' : 'hidden'/);
  assert.match(soft, /collapsable=\{false\}/);
  assert.doesNotMatch(soft, /<Animated\.View\s*\n\s*style=\{\{\s*\n\s*width: size,/);
});

test('KelyraMark host clips Soft on native; layers absolute', () => {
  const mark = read('src/components/ui/KelyraMark.tsx');
  assert.match(mark, /overflow: Platform\.OS === 'web' \? 'visible' : 'hidden'/);
  assert.match(mark, /StyleSheet\.absoluteFill/);
  assert.match(mark, /collapsable=\{false\}/);
});

test('Tray Ask glyph box equals KelyraMark size (no shorter clip slot)', () => {
  const tray = read('src/components/ui/FloatingTabTray.tsx');
  assert.match(tray, /width: glyphSize\(tab,/);
  assert.match(tray, /height: glyphSize\(tab,/);
  assert.match(tray, /KelyraMark size=\{size\}/);
  assert.match(tray, /overflow: Platform\.OS === 'web' \? 'visible' : 'hidden'/);
});

test('Soft PNG ink center aligns with idle K canvas center (±8px)', () => {
  const out = execFileSync(
    '/tmp/pilvenv/bin/python',
    [join(root, 'scripts/check-soft-ink-align.py'), join(root, 'assets/brand')],
    { encoding: 'utf8' },
  ).trim();
  assert.match(out, /ok=True/);
});
