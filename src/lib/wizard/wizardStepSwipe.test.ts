/**
 * Unit tests for wizard step-swipe reducer (visible steps only).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decideWizardSwipe,
  isHorizontalWizardSwipe,
  wizardSwipeDirection,
  wizardSwipeDragOffset,
  wizardSwipeShouldCommit,
  WIZARD_SWIPE_DISTANCE_PX,
  WIZARD_SWIPE_EDGE_FOLLOW,
  WIZARD_SWIPE_FOLLOW,
  WIZARD_SWIPE_VELOCITY_PX_S,
  type WizardSwipeSample,
} from './wizardStepSwipe.ts';

function sample(partial: Partial<WizardSwipeSample>): WizardSwipeSample {
  return {
    translationX: 0,
    translationY: 0,
    velocityX: 0,
    ...partial,
  };
}

test('horizontal intent rejects vertical-dominant pans', () => {
  assert.equal(isHorizontalWizardSwipe(sample({ translationX: 40, translationY: 50 })), false);
  assert.equal(isHorizontalWizardSwipe(sample({ translationX: 40, translationY: 10 })), true);
  assert.equal(isHorizontalWizardSwipe(sample({ translationX: 8, translationY: 0 })), false);
});

test('direction: LTR is back, RTL is forward', () => {
  assert.equal(wizardSwipeDirection(sample({ translationX: 60 })), 'back');
  assert.equal(wizardSwipeDirection(sample({ translationX: -60 })), 'forward');
  assert.equal(wizardSwipeDirection(sample({ velocityX: 900 })), 'back');
  assert.equal(wizardSwipeDirection(sample({ velocityX: -900 })), 'forward');
});

test('commit needs distance or velocity', () => {
  assert.equal(wizardSwipeShouldCommit(sample({ translationX: 20, translationY: 0 })), false);
  assert.equal(
    wizardSwipeShouldCommit(sample({ translationX: WIZARD_SWIPE_DISTANCE_PX, translationY: 0 })),
    true,
  );
  assert.equal(
    wizardSwipeShouldCommit(sample({ translationX: 20, translationY: 0, velocityX: WIZARD_SWIPE_VELOCITY_PX_S })),
    true,
  );
});

test('mid-wizard: back goes back_step, forward goes next_step', () => {
  const ctx = { stepIndex: 2, stepCount: 7 };
  assert.equal(decideWizardSwipe(sample({ translationX: 80 }), ctx), 'back_step');
  assert.equal(decideWizardSwipe(sample({ translationX: -80 }), ctx), 'next_step');
});

test('first visible step: back pops stack; forward still advances', () => {
  const ctx = { stepIndex: 0, stepCount: 5 };
  assert.equal(decideWizardSwipe(sample({ translationX: 80 }), ctx), 'pop_stack');
  assert.equal(decideWizardSwipe(sample({ translationX: -80 }), ctx), 'next_step');
});

test('last visible step: forward rubber-bands; back steps back', () => {
  const ctx = { stepIndex: 4, stepCount: 5 };
  assert.equal(decideWizardSwipe(sample({ translationX: -80 }), ctx), 'bounce_forward');
  assert.equal(decideWizardSwipe(sample({ translationX: 80 }), ctx), 'back_step');
});

test('busy or empty step list ignores', () => {
  assert.equal(decideWizardSwipe(sample({ translationX: 80 }), { stepIndex: 1, stepCount: 3, busy: true }), 'ignore');
  assert.equal(decideWizardSwipe(sample({ translationX: 80 }), { stepIndex: 0, stepCount: 0 }), 'ignore');
  assert.equal(decideWizardSwipe(sample({ translationX: 80 }), { stepIndex: -1, stepCount: 3 }), 'ignore');
});

test('short vertical-ish pan ignores (does not steal scroll)', () => {
  assert.equal(
    decideWizardSwipe(sample({ translationX: 30, translationY: 40, velocityX: 100 }), { stepIndex: 1, stepCount: 4 }),
    'ignore',
  );
});

test('drag offset rubber-bands only past last step forward', () => {
  const mid = wizardSwipeDragOffset(-100, { stepIndex: 1, stepCount: 5 });
  const edge = wizardSwipeDragOffset(-100, { stepIndex: 4, stepCount: 5 });
  assert.equal(mid, -100 * WIZARD_SWIPE_FOLLOW);
  assert.equal(edge, -100 * WIZARD_SWIPE_EDGE_FOLLOW);
  assert.ok(Math.abs(edge) < Math.abs(mid));
  // Back drag on first step still follows (pop commits on release).
  assert.equal(wizardSwipeDragOffset(100, { stepIndex: 0, stepCount: 5 }), 100 * WIZARD_SWIPE_FOLLOW);
});

test('single-step wizard: back pops, forward bounces', () => {
  const ctx = { stepIndex: 0, stepCount: 1 };
  assert.equal(decideWizardSwipe(sample({ translationX: 80 }), ctx), 'pop_stack');
  assert.equal(decideWizardSwipe(sample({ translationX: -80 }), ctx), 'bounce_forward');
});
