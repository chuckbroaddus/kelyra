import assert from 'node:assert/strict';
import test from 'node:test';

import {
  gradebookStudentAvatarSize,
  studentHead,
  studentHeadCompact,
  studentHeadFor,
  studentHeadLandscape,
  tableRowHeight,
  tableRowHeightDefault,
  tableRowHeightLandscape,
} from './table.ts';

test('portrait and tablet keep full avatar header metrics constants', () => {
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

test('gradebookStudentAvatarSize is landscape/Conduct size (no new magic number)', () => {
  assert.equal(gradebookStudentAvatarSize, studentHeadLandscape.avatar);
  assert.equal(gradebookStudentAvatarSize, 28);
  assert.equal(gradebookStudentAvatarSize, studentHead.avatar / 2);
});

test('table row height: portrait/tablet 44, phone-landscape ~36–40', () => {
  assert.equal(tableRowHeight('phone-portrait'), tableRowHeightDefault);
  assert.equal(tableRowHeight('tablet'), tableRowHeightDefault);
  assert.equal(tableRowHeightDefault, 44);
  assert.equal(tableRowHeight('phone-landscape'), tableRowHeightLandscape);
  assert.ok(tableRowHeightLandscape >= 36 && tableRowHeightLandscape <= 40);
  assert.ok(tableRowHeightLandscape < tableRowHeightDefault);
});

test('gradebook screen and heatmap always use landscape avatar head metrics', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const gradebook = fs.readFileSync(path.join(root, 'app/class/[id]/gradebook.tsx'), 'utf8');
  const heatmap = fs.readFileSync(path.join(root, 'components/Heatmap.tsx'), 'utf8');
  const head = fs.readFileSync(path.join(root, 'components/ui/GradebookStudentHead.tsx'), 'utf8');
  assert.match(gradebook, /studentHeadLandscape/);
  assert.match(gradebook, /headMetrics\s*=\s*studentHeadLandscape/);
  assert.match(gradebook, /tableRowHeight/);
  assert.match(gradebook, /rowHeight=\{rowHeight\}/);
  assert.match(gradebook, /\bcompact\b/);
  assert.match(heatmap, /studentHeadLandscape/);
  assert.match(heatmap, /head\s*=\s*studentHeadLandscape/);
  assert.match(heatmap, /\bcompact\b/);
  assert.match(heatmap, /tableRowHeight/);
  // Shared size constant — always landscape/Conduct avatar, portrait + landscape.
  assert.match(head, /gradebookStudentAvatarSize/);
  assert.match(head, /GRADEBOOK_STUDENT_AVATAR_SIZE/);
  assert.match(head, /avatarSize\s*>\s*0/);
  assert.doesNotMatch(head, /compact\s*\?\s*studentHeadLandscape/);
  assert.doesNotMatch(head, /compact\s*\?\s*null\s*:/);
});
