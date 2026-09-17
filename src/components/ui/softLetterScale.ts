/**
 * Soft v8b letter ink metrics (512-space) — SoT lock.
 *
 * Working Soft letter is idle `kelyra.png` 1:1 (same canvas contain as chrome idle).
 * Face + comet overlay in 512-normalized coords. Do **not** size Soft from
 * `kelyra-soft.png` bbox. Prior Soft PRs used SOFT_LETTER_SCALE 0.78 as a false
 * 1:1 — that constant is gone; letter is the idle PNG at full mark size.
 *
 * Ink box on 512 canvas: 443×468 at (24,21)→(466,488).
 * Letter height = size * 468/512; letter center at size*(245/512, 254.5/512).
 */

export const LETTER_INK = {
  canvas: 512,
  /** Left edge of letter ink (512-space). */
  x: 24,
  /** Top edge of letter ink (512-space). */
  y: 21,
  width: 443,
  height: 468,
  /** Ink center x (512-space). */
  cx: 245,
  /** Ink center y (512-space). */
  cy: 254.5,
} as const;

/** Intro timings (ms) — lids blink open, mouth/face grow, comet zoom into orbit. */
export const SOFT_INTRO = {
  faceMs: 280,
  blinkMs: 90,
  cometMs: 420,
  outroMs: 220,
} as const;

/** Independent loops (ms). */
export const SOFT_MOTION = {
  blinkPeriodMs: 4400,
  glancePeriodMs: 8000,
  orbitMs: 2450,
  wobbleMs: 1700,
} as const;

/** Face layout in 512-space (Soft v8b). Eyes are 60% of Peek v7 Soft size. */
export const SOFT_FACE = {
  leftEye: { x: 169, y: 198 },
  rightEye: { x: 292, y: 198 },
  /** Eye white radius (512-space), ~60% of v7. */
  eyeR: 14.4,
  pupilR: 6.2,
  glassesLeftR: 31.1,
  glassesRightR: 32.4,
  /** Mouth center + half-width (78% of ±50). */
  mouth: { x: 230, y: 268, halfW: 39 },
} as const;
