import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('heatmap landscape reuses gradebook landscapeFull collapse (not excluded)', () => {
  const book = read('src/app/class/[id]/gradebook.tsx');
  // Must include heatmap in immersive landscape — only conduct is excluded.
  assert.match(
    book,
    /landscapeFull\s*=\s*!conduct\s*&&\s*isNativePhone/,
    'heatmap must share landscapeFull with gradebook',
  );
  assert.doesNotMatch(
    book,
    /landscapeFull\s*=\s*!heatmap\s*&&\s*!conduct/,
    'heatmap must not be carved out of landscape collapse',
  );
  assert.match(book, /setImmersive\(landscapeFull\)/);
  assert.match(book, /collapse=\{collapsing\}/);
  assert.match(book, /const collapsing = landscapeFull \? null/);
});

test('Heatmap hides legend + uses compact student heads on phone-landscape', () => {
  const heat = read('src/components/Heatmap.tsx');
  const head = read('src/components/ui/GradebookStudentHead.tsx');
  assert.match(heat, /studentHeadFor\(layout\.breakpoint\)/);
  assert.match(heat, /studentHeadCompact\(layout\.breakpoint\)/);
  assert.match(heat, /compact=\{compactHead\}/);
  // Legend is an extra header strip — drop it when compact (landscape).
  assert.match(heat, /compactHead\s*\?\s*null\s*:/);
  assert.match(heat, /LegendSwatch/);
  // Compact head keeps half-size avatars (does not hide faces).
  assert.match(head, /studentHeadLandscape\.avatar/);
  assert.doesNotMatch(head, /compact\s*\?\s*null\s*:/);
  // Landscape body rows share tableRowHeight (~38), not the old 48.
  assert.match(heat, /tableRowHeight\(layout\.breakpoint\)/);
  assert.doesNotMatch(heat, /phone-portrait\s*\?\s*44\s*:\s*48/);
});

test('gradebook landscape distributes period tabs full width', () => {
  const book = read('src/app/class/[id]/gradebook.tsx');
  const tabs = read('src/components/ui/GradeTermTabs.tsx');
  const person = read('src/components/ui/PersonTabs.tsx');
  assert.match(book, /distribute=\{layout\.breakpoint === 'phone-landscape'\}/);
  assert.match(tabs, /distribute\?:/);
  assert.match(person, /distribute\?: boolean/);
  assert.match(person, /styles\.rowDistribute/);
  assert.match(person, /scrollEnabled=\{!distribute\}/);
});
