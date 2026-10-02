/**
 * Grading policy wizard chrome + step helpers unit checks.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createEmptyDraft,
  setPolicyStep,
  templatesForLevel,
  visiblePolicySteps,
  periodSplitSummary,
  draftToPayload,
  applyLevelDefaults,
} from './gradingPolicy.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('visiblePolicySteps hides GPA stack for elementary', () => {
  let d = createEmptyDraft('s1', 'elementary');
  const steps = visiblePolicySteps(d);
  assert.ok(!steps.includes('credit'));
  assert.ok(!steps.includes('gpa'));
  assert.ok(!steps.includes('quality_points'));
  assert.ok(steps.includes('calendar'));
  assert.ok(steps.includes('review'));
  d = applyLevelDefaults(d, 'high');
  assert.ok(visiblePolicySteps(d).includes('gpa'));
  assert.equal(visiblePolicySteps(d).length, 11);
});

test('templatesForLevel is config-driven by school level', () => {
  assert.deepEqual(templatesForLevel('elementary'), [
    'elementary_year_4',
    'elementary_year_6',
    'semester',
  ]);
  assert.ok(templatesForLevel('high').includes('tx_six_weeks'));
  assert.ok(!templatesForLevel('college').includes('tx_six_weeks'));
});

test('periodSplitSummary reflects six-weeks calendar periods', () => {
  const payload = draftToPayload(createEmptyDraft('s1', 'high'));
  const summary = periodSplitSummary(payload);
  assert.match(summary, /Six weeks/);
  assert.match(summary, /\d+ periods/);
});

test('setPolicyStep clamps to visible steps', () => {
  let d = createEmptyDraft('s1', 'elementary');
  d = setPolicyStep(d, 'gpa');
  assert.equal(d.current_step, 'level');
  d = setPolicyStep(d, 'review');
  assert.equal(d.current_step, 'review');
});

test('policy screen uses shared wizard chrome', () => {
  const ui = read('src/app/school/grading-policy/index.tsx');
  const action = read('src/components/wizard/WizardActionTray.tsx');
  assert.match(ui, /WizardActionTray/);
  assert.match(ui, /pin=\{stepTabs\}/);
  assert.match(ui, /setTrayBump\(true\)/);
  assert.match(ui, /stepScrollRef/);
  assert.match(ui, /scrollTo\(\{\s*y:\s*0,\s*animated:\s*false\s*\}\)/);
  assert.match(ui, /markStepContinued/);
  assert.match(ui, /saveDraftPayload/);
  assert.match(ui, /ConfirmSheet/);
  assert.match(ui, /TopicHelpHit/);
  assert.match(ui, /formatRollupFormulaDisplay/);
  assert.match(ui, /templatesForLevel/);
  assert.match(ui, /LockedField/);
  assert.match(ui, /styles\.navHost/);
  assert.match(action, /slideIntoTraySpot/);
  assert.match(ui, /policyPersonTabs/);
});
