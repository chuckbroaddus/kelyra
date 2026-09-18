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
 *
 * Runtime Soft is native RN Views (SoftMark.tsx). HTML Soft v8b is design SoT only
 * (notes/company/working-k-avatar-soft-v8b.html / assets/brand/soft-v8b-host.html).
 * Face runtime: react-native-svg Soft v8b ellipses + glasses (no mouth).
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

/**
 * Face layout in 512-space (Soft v8b host SVG).
 * Eyes are ellipses (not circles); glasses stroke 6.5; no mouth at runtime.
 */
export const SOFT_FACE = {
  leftEye: { x: 169, y: 198 },
  rightEye: { x: 292, y: 198 },
  /** Left white ellipse rx/ry (Soft v8b SoT). */
  eyeRx: 27.2,
  eyeRy: 29.9,
  /** Alias for left eye rx — chrome scale / tests. */
  eyeR: 27.2,
  rightEyeRx: 25.9,
  rightEyeRy: 28.6,
  pupilR: 14.3,
  rightPupilR: 13.6,
  catchlightR: 5.1,
  rightCatchlightR: 4.8,
  /** Glasses circles — SoT left r=32.4 @ (169,198), right r=31.1 @ (292,198). */
  glassesLeftR: 32.4,
  glassesRightR: 31.1,
  glassesStroke: 6.5,
  glassesMidX: 230.5,
  glassesMidY: 198,
  glassesBridge: 'M201.4 198 Q230.5 176.0 260.9 198',
  /** Mouth center + half-width — design SoT only; runtime Soft has no mouth. */
  mouth: { x: 230, y: 268, halfW: 39 },
} as const;

/**
 * Soft v8b comet orbit (SoT: working-k-avatar-soft-v8b.html).
 * Locked for iPhone chrome ~40px: ovalY 0.58, cantZ 14, tilt 26, radius 0.41.
 * Native SoftMark drives place(theta) via requestAnimationFrame (softCometFacing).
 */
export const COMET_ORBIT = {
  tiltXDeg: 26,
  cantZDeg: 14,
  /** Locked squash for iPhone chrome ~40px — cos(26°)≈0.90 reads circular; 0.58 reads oval. */
  ovalY: 0.58,
  /** Orbit radius as fraction of letter ink height. */
  radiusOfLetter: 0.41,
  /** Gimbal box as fraction of letter ink height. */
  gimbalOfLetter: 1.44,
  /** Screen-plane spin matching SoT yaw-rev (negative full turn). */
  yawToDeg: -360,
  ballOfLetter: 0.08,
  /** Web: keyframes + nativeID (maps to DOM id). Never RN className. */
  webYawNativeId: 'kelyra-soft-yaw-spin',
  webYawKeyframes: 'kelyra-soft-yaw-rev',
  /**
   * Native Soft: always-facing circular View ball + bead trail + phase-z occlusion.
   * Face: eyes-glasses-nomouth (CEO — no mouth).
   */
  facingMode: 'js-always' as const,
  occlusionMode: 'phase-z' as const,
  /** Gas trail: RN View beads along orbit (HTML js-beads SoT). */
  trailMode: 'js-beads' as const,
  /** CEO Soft face: eyes + glasses; no mouth. */
  faceMode: 'eyes-glasses-nomouth' as const,
} as const;
