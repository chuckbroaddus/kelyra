import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { stickyHeaderShiftX, stickyHScrollIsOverscrolling } from './stickyTableScroll.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('stickyHeaderShiftX mirrors body offset 1:1 including overscroll', () => {
  assert.equal(stickyHeaderShiftX(0), 0);
  assert.equal(stickyHeaderShiftX(120), -120);
  assert.equal(stickyHeaderShiftX(-24), 24);
  assert.equal(stickyHeaderShiftX(900), -900);
});

test('stickyHScrollIsOverscrolling detects both ends', () => {
  assert.equal(stickyHScrollIsOverscrolling(0, 200), false);
  assert.equal(stickyHScrollIsOverscrolling(200, 200), false);
  assert.equal(stickyHScrollIsOverscrolling(-1, 200), true);
  assert.equal(stickyHScrollIsOverscrolling(201, 200), true);
  assert.equal(stickyHScrollIsOverscrolling(5, 0), true);
});

test('StickyTable: body owns horizontal scroll; header mirrors via translateX (no dual scrollTo sync)', () => {
  const src = read('src/components/ui/StickyTable.tsx');
  assert.match(src, /Animated\.multiply\(scrollX,\s*-1\)/);
  assert.match(src, /transform:\s*\[\{\s*translateX:/);
  assert.match(src, /Animated\.ScrollView/);
  assert.match(src, /Animated\.event/);
  assert.match(src, /useNativeDriver:\s*true/);
  assert.match(src, /scrollEventThrottle=\{1\}/);
  assert.doesNotMatch(src, /driving\.current/);
  assert.doesNotMatch(src, /headRef\.current\?\.scrollTo/);
  assert.doesNotMatch(src, /bodyRef\.current\?\.scrollTo/);
  assert.doesNotMatch(src, /setTimeout\(\s*\(\)\s*=>\s*\{\s*driving/);
  // Exactly one horizontal ScrollView prop (body owner) — header is Animated.View mirror
  const horizontalProps = src.match(/\bhorizontal\b/g) ?? [];
  assert.equal(horizontalProps.length, 1);
  assert.match(src, /Header mirrors body contentOffset\.x/);
});

test('Gradebook + Heatmap still mount StickyTable for student columns', () => {
  assert.match(read('src/app/class/[id]/gradebook.tsx'), /StickyTable/);
  assert.match(read('src/components/Heatmap.tsx'), /StickyTable/);
  assert.match(read('src/components/ui/StudentGradeBook.tsx'), /StickyTable/);
});
