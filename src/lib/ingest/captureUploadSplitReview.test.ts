import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

/**
 * t_b64bc94d: Capture CE-A "Upload class stack" must open Split review the same
 * way Needs → /capture does. Dual FormSheet+SplitReview Modal visibility flips
 * dropped both sheets on RN-web after rasterize reached split_review.
 */
test('t_b64bc94d: Capture CE-A hosts ClassStackBinder beside surface (not composer ScrollView)', () => {
  const capture = read('src/components/capture/CaptureSurface.tsx');
  assert.match(capture, /setStackOpen\(true\)/);
  assert.match(capture, /const stackBinder/);
  assert.match(capture, /teachSeat && showClassStack && assetOwnerId/);
  // Binder must not be gated on teacher?.id alone (profile id is enough for Teach).
  assert.doesNotMatch(capture, /showClassStack && teacher\?\.id/);
  // Sibling of surface — survives split-layout toggles; not nested in composerBlock.
  assert.match(capture, /\{\s*surface\s*\}\s*\n\s*\{\s*stackBinder\s*\}/);
  assert.doesNotMatch(
    capture.slice(capture.indexOf('const composerBlock'), capture.indexOf('const stackBinder')),
    /<ClassStackBinder/,
  );
});

test('t_b64bc94d: binder exclusively mounts SplitReview on split (no dual-Modal visible flip)', () => {
  const binder = read('src/components/ingest/ClassStackBinder.tsx');
  assert.match(binder, /const showSplit = phase === 'split' && Boolean\(batchId\) && teachSeat/);
  // FormSheet unmounts while SplitReview mounts — not both with opposite visible=.
  assert.match(binder, /\{showSplit \? null : \(/);
  assert.match(binder, /\{showSplit && batchId \? \(/);
  assert.doesNotMatch(binder, /visible=\{visible && phase !== 'split'\}/);
  assert.doesNotMatch(binder, /visible=\{visible && phase === 'split'\}/);
  // SplitReview still polls from waiting via applyBatchProgress → setPhase('split').
  assert.match(binder, /batch\.status === 'split_review'/);
  assert.match(binder, /setPhase\('split'\)/);
  assert.match(binder, /startPolling\(result\.batch\.id\)/);
});

test('t_b64bc94d: Needs empty-state still routes to /capture (same binder host)', () => {
  const inbox = read('src/app/inbox.tsx');
  const classNeeds = read('src/app/class/[id]/index.tsx');
  assert.match(inbox, /INGEST_COPY\.entryNeeds/);
  assert.match(inbox, /router\.push\('\/capture'\)/);
  assert.match(classNeeds, /INGEST_COPY\.entryNeeds/);
  assert.match(classNeeds, /router\.push\('\/capture'\)/);
});
