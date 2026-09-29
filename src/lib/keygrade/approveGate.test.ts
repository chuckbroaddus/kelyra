import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canApproveKeygrade, keygradeApproveDeniedReason } from './approveGate.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

test('Approve wall: Teach seat only', () => {
  assert.equal(canApproveKeygrade('teacher'), true);
  assert.equal(canApproveKeygrade('parent'), false);
  assert.equal(canApproveKeygrade('administrator'), false);
  assert.equal(canApproveKeygrade('superintendent'), false);
  assert.equal(canApproveKeygrade('student'), false);
  assert.equal(canApproveKeygrade('none'), false);
  assert.equal(canApproveKeygrade(null), false);
});

test('Approve wall: Parent seat denied with clear reason', () => {
  const reason = keygradeApproveDeniedReason('parent');
  assert.match(String(reason), /Parent seat cannot Approve/i);
});

test('Pack B capture review gates Approve on canApproveKeygrade', () => {
  const ui = readFileSync(join(root, 'src/components/ui/KeygradePackBReview.tsx'), 'utf8');
  assert.match(ui, /canApproveKeygrade/);
  assert.match(ui, /Accept recommendation/);
  assert.match(ui, /Confirm & next/);
  assert.match(ui, /twinsNeedConfirm|twinCandidates/);
  assert.match(ui, /Unassigned/);
  const capture = readFileSync(join(root, 'src/app/capture.tsx'), 'utf8');
  assert.match(capture, /KeygradePackBReview/);
  assert.match(capture, /canApproveKeygrade/);
  assert.match(capture, /persistCapture\('approve'/);
  const proposal = readFileSync(join(root, 'src/app/proposal.tsx'), 'utf8');
  assert.match(proposal, /canApproveKeygrade\(chrome\.role\)/);
});

test('AC-PACKB: saved keyed draft review shows Pack B Accept; parent seat hides it', () => {
  const student = readFileSync(join(root, 'src/app/class/[id]/student/[studentId].tsx'), 'utf8');
  assert.match(student, /KeygradePackBReview/);
  assert.match(student, /keyScoreItemsFromDraft/);
  assert.match(student, /canApproveKeygrade/);
  assert.match(student, /showPackB/);
  assert.match(student, /onPackBApprove/);
  assert.match(student, /approveCapture/);
  assert.match(student, /storeCaptureDraft/);
  // Teach-only mount — parent seat must not render Accept on this review.
  assert.match(student, /showPackB = keyedDraftOpen && allowKeygradeApprove/);
  assert.match(student, /Teach seat required to Approve keyed work/);
  // Persist before approve; no rollback after committed approve.
  const approveFn = student.slice(student.indexOf('const onPackBApprove'));
  const body = approveFn.slice(0, approveFn.indexOf('const onPackBSaveDraft'));
  assert.match(body, /persistPackDraft/);
  assert.match(body, /await approveCapture/);
  assert.ok(
    body.indexOf('persistPackDraft') < body.indexOf('approveCapture'),
    'persist must precede approveCapture',
  );
  assert.doesNotMatch(body, /rollback|storeCaptureDraft\([\s\S]*catch[\s\S]*storeCaptureDraft/);

  const inbox = readFileSync(join(root, 'src/app/inbox.tsx'), 'utf8');
  assert.match(inbox, /capture=\$\{item\.id\}/);
  assert.match(inbox, /tab=focus/);

  const proposal = readFileSync(join(root, 'src/app/proposal.tsx'), 'utf8');
  assert.match(proposal, /buildKeyScoreDraft/);
  assert.match(proposal, /method: 'key_score'|buildKeyScoreDraft/);

  const capture = readFileSync(join(root, 'src/app/capture.tsx'), 'utf8');
  assert.match(capture, /match-key/);
});

test('Office/superintendent KEYGRADE Approve chrome OUT of v1 (CEO lock)', () => {
  assert.match(String(keygradeApproveDeniedReason('administrator')), /out of v1/i);
  assert.match(String(keygradeApproveDeniedReason('superintendent')), /out of v1/i);
});
