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

/**
 * Soft v8b comet orbit (SoT: working-k-avatar-soft-v8b.html).
 * CSS uses rotateX(26) + rotateY(-360) + translateZ(0.41×letter).
 * RN/iOS often drops rotateX → flat circle; Z-spin can read opposite to CSS yaw.
 * Fake oval: place beads on an ellipse (squash = cos 26°) and spin in screen plane.
 * Yaw: screen-plane rotate to −360deg = HTML `@keyframes yaw-rev` / rotateY(-360).
 * Web must use CSS animation (not RN Animated.loop of rotate strings — hangs after ~2 orbits).
 */
export const COMET_ORBIT = {
  tiltXDeg: 26,
  cantZDeg: 14,
  /** Ellipse vertical squash ≈ cos(tiltX) — oval, not circle. */
  ovalY: Math.cos((26 * Math.PI) / 180),
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
   * Native/WebView: do not trust CSS .billboard counter-rotateY.
   * Host uses JS always-facing ball + js-orbit gas (data-soft-facing/trail) + phase-z occlusion.
   * Face: eyes-glasses-nomouth (CEO — no mouth).
   */
  facingMode: 'js-always' as const,
  occlusionMode: 'phase-z' as const,
  /** Gas trail: JS screen-plane orbit (not CSS rotateX(90°) alone on WKWebView). */
  trailMode: 'js-orbit' as const,
  /** CEO Soft face: eyes + glasses; mouth hard-hidden in host. */
  faceMode: 'eyes-glasses-nomouth' as const,
} as const;
