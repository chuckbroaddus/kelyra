import assert from 'node:assert/strict';
import test from 'node:test';

import {
  studentHead,
  studentHeadCompact,
  studentHeadFor,
  studentHeadLandscape,
} from './table.ts';

test('portrait and tablet keep full avatar header metrics', () => {
  assert.deepEqual(studentHeadFor('phone-portrait'), studentHead);
  assert.deepEqual(studentHeadFor('tablet'), studentHead);
  assert.equal(studentHead.avatar > 0, true);
  assert.equal(studentHead.height, 96);
  assert.equal(studentHead.colWidth, 72);
  assert.equal(studentHead.avatar, 56);
  assert.equal(studentHeadCompact('phone-portrait'), false);
  assert.equal(studentHeadCompact('tablet'), false);
});

test('phone landscape keeps half-size avatars: shorter, narrower header', () => {
  const land = studentHeadFor('phone-landscape');
  assert.deepEqual(land, studentHeadLandscape);
  assert.equal(land.avatar, studentHead.avatar / 2);
  assert.equal(land.avatar, 28);
  assert.ok(land.height < studentHead.height, 'landscape header must be shorter');
  assert.ok(land.colWidth <= studentHead.colWidth, 'landscape columns must not be wider');
  assert.ok(land.height <= 52, 'landscape head fits half avatar + name');
  assert.ok(land.height >= land.avatar, 'head height covers avatar');
  assert.equal(studentHeadCompact('phone-landscape'), true);
});

test('gradebook screen and heatmap import studentHeadFor for landscape', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const gradebook = fs.readFileSync(path.join(root, 'app/class/[id]/gradebook.tsx'), 'utf8');
  const heatmap = fs.readFileSync(path.join(root, 'components/Heatmap.tsx'), 'utf8');
  const head = fs.readFileSync(path.join(root, 'components/ui/GradebookStudentHead.tsx'), 'utf8');
  assert.match(gradebook, /studentHeadFor/);
  assert.match(gradebook, /studentHeadCompact/);
  assert.match(gradebook, /compact=\{compactHead\}/);
  assert.match(heatmap, /studentHeadFor/);
  assert.match(heatmap, /compact=\{compactHead\}/);
  assert.match(head, /studentHeadLandscape\.avatar/);
  assert.match(head, /avatarSize\s*>\s*0/);
  assert.match(head, /compact\s*=\s*false/);
  assert.doesNotMatch(head, /compact\s*\?\s*null\s*:/);
});
