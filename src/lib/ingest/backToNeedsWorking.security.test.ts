/**
 * t_9ffaf989: Back to Needs must clear WorkingLine without a full page refresh.
 * Regression for IQG-DRIVE-NEEDS hang after split-stack replace('/inbox').
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const inbox = 'src/app/inbox.tsx';
const host = 'src/app/split-stack.tsx';
const splitReview = 'src/components/ingest/SplitReview.tsx';
const copy = 'src/lib/ingest/copy.ts';
const api = 'src/lib/ingest/api.ts';

test('t_9ffaf989 Back to Needs: rowsReady clears; no refreshTeacher thrash; Back does not abandon', () => {
  const inboxSrc = read(inbox);
  const loadAt = inboxSrc.indexOf('const load = useCallback');
  assert.ok(loadAt > 0);
  const depsAt = inboxSrc.indexOf('}, [teacher', loadAt);
  assert.ok(depsAt > loadAt);
  const loadBody = inboxSrc.slice(loadAt, depsAt);

  // Early exit must clear WorkingLine (remount after replace('/inbox')).
  assert.match(loadBody, /if\s*\(\s*!teacher\s*\)\s*\{[^}]*setRowsReady\(\s*true\s*\)/s);

  // Waiting list then setRowsReady — class-scoped work must not own the pencil.
  const waitingIdx = loadBody.indexOf('listIngestWaitingSplit');
  const readyIdx = loadBody.indexOf('setRowsReady(true)', waitingIdx);
  const resolveIdx = loadBody.indexOf('resolveCaptureClass');
  assert.ok(waitingIdx > 0 && readyIdx > waitingIdx);
  assert.ok(resolveIdx < 0 || readyIdx < resolveIdx);

  // Re-fetching the auth teacher row reassigns identity → focus load thrash after Back.
  assert.doesNotMatch(loadBody, /await\s+refreshTeacher\s*\(/);
  assert.doesNotMatch(loadBody, /refreshTeacher/);

  // Host Back path: replace inbox, no abandon on close.
  const hostSrc = read(host);
  assert.match(hostSrc, /router\.replace\('\/inbox'\)/);
  assert.match(hostSrc, /entrySource="needs"/);
  assert.equal(read(copy).includes("backToNeeds: 'Back to Needs'"), true);

  const review = read(splitReview);
  const closeAt = review.indexOf('const handleClose');
  assert.ok(closeAt > 0);
  const closeBody = review.slice(closeAt, closeAt + 280);
  assert.doesNotMatch(closeBody, /abandonIngestBatch|handleAbandon/);
  assert.match(review, /fromNeeds \? INGEST_COPY\.backToNeeds/);

  assert.match(read(api), /export async function listIngestWaitingSplit/);
});

test('t_9ffaf989 WorkingLine gate includes waiting rows (empty ≠ loading after Back)', () => {
  const inboxSrc = read(inbox);
  assert.match(
    inboxSrc,
    /showWorking =\s*!rowsReady && waiting\.length === 0 && items\.length === 0 && turned\.length === 0/,
  );
  assert.match(inboxSrc, /showWorking \? <WorkingLine/);
  // Waiting row opens Split stack desk — not Capture handoff.
  assert.match(inboxSrc, /\/split-stack\?batch=/);
});

test('t_9ffaf989 class switch restores rowsReady after lists settle (empty desk ≠ forever WorkingLine)', () => {
  const inboxSrc = read(inbox);
  const loadAt = inboxSrc.indexOf('const load = useCallback');
  const depsAt = inboxSrc.indexOf('}, [teacher', loadAt);
  const loadBody = inboxSrc.slice(loadAt, depsAt);

  const classChangedAt = loadBody.indexOf('classChanged');
  assert.ok(classChangedAt > 0);
  const clearReadyAt = loadBody.indexOf('setRowsReady(false)', classChangedAt);
  assert.ok(clearReadyAt > classChangedAt, 'classChanged must clear rowsReady before new lists');

  const listsAt = loadBody.indexOf('Promise.all', clearReadyAt);
  assert.ok(listsAt > clearReadyAt);
  // After class-scoped lists settle, rowsReady must be restored (even when empty).
  const restoreAt = loadBody.indexOf('setRowsReady(true)', listsAt);
  assert.ok(restoreAt > listsAt, 'must setRowsReady(true) after Promise.all success');
  assert.match(loadBody.slice(listsAt, restoreAt + 40), /setItems\(captures\)/);
  assert.match(loadBody.slice(listsAt, restoreAt + 40), /setTurned\(completed\)/);
});
