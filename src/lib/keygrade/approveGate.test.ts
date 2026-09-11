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
  assert.match(ui, /Approve this capture/);
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

test('Office/superintendent KEYGRADE Approve chrome OUT of v1 (CEO lock)', () => {
  assert.match(String(keygradeApproveDeniedReason('administrator')), /out of v1/i);
  assert.match(String(keygradeApproveDeniedReason('superintendent')), /out of v1/i);
});
