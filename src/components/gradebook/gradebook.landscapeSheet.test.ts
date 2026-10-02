import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('gradebook Practice/Other cell sheet avoids RN Modal portrait lock in landscape', () => {
  const book = read('src/app/class/[id]/gradebook.tsx');
  // Cell + header menus must not present RN Modal (iPhone default = portrait-only).
  assert.match(book, /ScreenOverlay\s+visible=\{Boolean\(cellSheet\)\}/);
  assert.match(book, /ScreenOverlay\s+visible=\{Boolean\(headerMenu\)\}/);
  assert.match(
    book,
    /import\s*\{[^}]*\}\s*from\s*'react-native'/,
  );
  assert.doesNotMatch(
    book,
    /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*'react-native'/,
    'do not import Modal on gradebook',
  );
  assert.doesNotMatch(book, /<Modal\b/);
  // Review / Remove actions still on the cell sheet path.
  assert.match(book, /label=\"Review\"/);
  assert.match(book, /label=\"Remove\"/);
  assert.match(book, /setCellSheet\(/);
});

test('ScreenOverlay skips Modal VC on iOS and allows landscape on other platforms', () => {
  const overlay = read('src/components/ui/ScreenOverlay.tsx');
  assert.match(overlay, /FullWindowOverlay/);
  assert.match(overlay, /Platform\.OS === 'ios'/);
  assert.match(overlay, /SCREEN_OVERLAY_ORIENTATIONS/);
  assert.match(overlay, /supportedOrientations=\{\[\.\.\.SCREEN_OVERLAY_ORIENTATIONS\]\}/);
  assert.match(overlay, /'landscape'/);
});

test('grade breakdown sheet also uses ScreenOverlay (same landscape gradebook surface)', () => {
  const sheet = read('src/components/gradebook/GradeBreakdownSheet.tsx');
  assert.match(sheet, /ScreenOverlay/);
  assert.doesNotMatch(sheet, /<Modal\b/);
});
