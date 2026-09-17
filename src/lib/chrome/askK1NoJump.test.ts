import assert from 'node:assert/strict';
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

test('Tray Ask glyph box equals KelyraMark size (no shorter clip slot)', () => {
  const tray = read('src/components/ui/FloatingTabTray.tsx');
  assert.match(tray, /width: glyphSize\(tab,/);
  assert.match(tray, /height: glyphSize\(tab,/);
  assert.match(tray, /KelyraMark size=\{size\}/);
});
