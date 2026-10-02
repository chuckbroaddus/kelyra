/**
 * Pure wizard step-swipe decisions (Syllabus + Grading Policy).
 * LTR = back, RTL = forward. Visible-step indices only.
 */

export type WizardSwipeSample = {
  translationX: number;
  translationY: number;
  velocityX: number;
};

export type WizardSwipeContext = {
  /** Index into the *visible* step list (0-based). */
  stepIndex: number;
  /** Length of the *visible* step list. */
  stepCount: number;
  busy?: boolean;
};

export type WizardSwipeAction =
  | 'ignore'
  | 'back_step'
  | 'next_step'
  | 'pop_stack'
  | 'bounce_forward';

/** Min |dx| to commit a step change (px). */
export const WIZARD_SWIPE_DISTANCE_PX = 56;
/** Min |vx| (px/s) to commit when distance is short. */
export const WIZARD_SWIPE_VELOCITY_PX_S = 650;
/** Horizontal must dominate vertical by this ratio. */
export const WIZARD_SWIPE_AXIS_RATIO = 1.15;
/** Min |dx| before we treat the gesture as horizontal intent. */
export const WIZARD_SWIPE_AXIS_MIN_PX = 12;
/** Follow-finger dampening while dragging. */
export const WIZARD_SWIPE_FOLLOW = 0.42;
/** Extra dampening when rubber-banding past the last step. */
export const WIZARD_SWIPE_EDGE_FOLLOW = 0.22;

export function isHorizontalWizardSwipe(sample: WizardSwipeSample): boolean {
  const ax = Math.abs(sample.translationX);
  const ay = Math.abs(sample.translationY);
  if (ax < WIZARD_SWIPE_AXIS_MIN_PX) return false;
  return ax > ay * WIZARD_SWIPE_AXIS_RATIO;
}

export function wizardSwipeDirection(sample: WizardSwipeSample): 'back' | 'forward' | null {
  if (!isHorizontalWizardSwipe(sample) && Math.abs(sample.velocityX) < WIZARD_SWIPE_VELOCITY_PX_S) {
    return null;
  }
  // Positive translationX = finger moved right = content back (LTR back).
  if (sample.translationX > 0) return 'back';
  if (sample.translationX < 0) return 'forward';
  if (sample.velocityX > 0) return 'back';
  if (sample.velocityX < 0) return 'forward';
  return null;
}

export function wizardSwipeShouldCommit(sample: WizardSwipeSample): boolean {
  if (!isHorizontalWizardSwipe(sample)) {
    // Fast edge fling with little travel still counts.
    return Math.abs(sample.velocityX) >= WIZARD_SWIPE_VELOCITY_PX_S;
  }
  return (
    Math.abs(sample.translationX) >= WIZARD_SWIPE_DISTANCE_PX ||
    Math.abs(sample.velocityX) >= WIZARD_SWIPE_VELOCITY_PX_S
  );
}

/**
 * Reduce a finished pan sample + visible step cursor into one nav action.
 * Callers fire the same handlers as tray ‹ › (including badge paint on next).
 */
export function decideWizardSwipe(
  sample: WizardSwipeSample,
  ctx: WizardSwipeContext,
): WizardSwipeAction {
  if (ctx.busy) return 'ignore';
  if (ctx.stepCount <= 0 || ctx.stepIndex < 0) return 'ignore';
  if (!wizardSwipeShouldCommit(sample)) return 'ignore';

  const dir = wizardSwipeDirection(sample);
  if (!dir) return 'ignore';

  if (dir === 'back') {
    if (ctx.stepIndex <= 0) return 'pop_stack';
    return 'back_step';
  }

  // forward
  if (ctx.stepIndex >= ctx.stepCount - 1) return 'bounce_forward';
  return 'next_step';
}

/**
 * Visual translateX while the finger is down. Rubber-bands on the last step
 * when dragging forward; otherwise lightly follows.
 */
export function wizardSwipeDragOffset(
  translationX: number,
  ctx: Pick<WizardSwipeContext, 'stepIndex' | 'stepCount'>,
): number {
  if (!Number.isFinite(translationX) || translationX === 0) return 0;
  const atLast = ctx.stepCount > 0 && ctx.stepIndex >= ctx.stepCount - 1;
  const forward = translationX < 0;
  if (atLast && forward) return translationX * WIZARD_SWIPE_EDGE_FOLLOW;
  return translationX * WIZARD_SWIPE_FOLLOW;
}
