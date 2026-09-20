/**
 * Calendar 3D horizontal period wheel — pure curve helpers.
 *
 * Binding SoT (Mac-local / not on origin/main at implement):
 *   notes/company/calendar-3d-wheel-spec.md
 *   notes/company/calendar-3d-wheel-pm-lock.md
 *   notes/company/calendar-3d-wheel-intent.md
 *   notes/company/calendar-3d-wheel-mockups/index.html
 *   notes/company/calendar-view-icon-pm-lock.md (Set B icons, if present)
 *
 * Curves below are Hermes-brief defaults (scale + opacity + rotateY + spacing +
 * focus band) until those notes land. Dual stamp 2026-09-20 + Chuck send.
 * Supersedes PR 149 flat Rolodex scale/opacity-only row as ship look.
 */
export { snapPeriodPage, PERIOD_PAGER_EDGE_GUARD_PX } from './periodPager.ts';

/** Perspective (px) applied before rotateY on each tile. */
export const WHEEL_PERSPECTIVE = 900;

/** Max |rotateY| at |t|=1 (deg). Linear in t for Animated-friendly ranges. */
export const WHEEL_MAX_ROTATE_Y_DEG = 48;

/** Scale / opacity anchors (Hermes brief defaults). */
export const WHEEL_CENTER_SCALE = 1;
export const WHEEL_SIDE_SCALE = 0.78;
export const WHEEL_FAR_SCALE = 0.62;
export const WHEEL_CENTER_OPACITY = 1;
export const WHEEL_SIDE_OPACITY = 0.52;
export const WHEEL_FAR_OPACITY = 0.28;

/**
 * Slot spacing as a fraction of measured tile width (tighter than flat row → drum).
 * 1 = flat pager; <1 pulls sides inward.
 */
export const WHEEL_SPACING_RATIO = 0.72;

/**
 * Focus band in normalized slot units (|t|). Inside → center extras / full chrome.
 * Outside → side caption only.
 */
export const WHEEL_FOCUS_BAND = 0.34;

/** Spring used on snap / momentum settle. */
export const WHEEL_SPRING = { friction: 8, tension: 92 } as const;

/** Normalize a pixel offset from the focus center into slot units. */
export function wheelNormFromOffset(offsetPx: number, slotWidth: number): number {
  const w = slotWidth > 0 ? slotWidth : 1;
  return offsetPx / w;
}

function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/** Smooth hermite between side and far anchors by |t|. */
function blendByAbsT(absT: number, center: number, side: number, far: number): number {
  const a = Math.abs(absT);
  if (a <= 1) {
    const u = clamp01(a);
    const s = u * u * (3 - 2 * u);
    return center + (side - center) * s;
  }
  const u = clamp01(a - 1);
  const s = u * u * (3 - 2 * u);
  return side + (far - side) * s;
}

/** Scale curve vs normalized slot offset. */
export function wheelScaleForNorm(t: number): number {
  return blendByAbsT(t, WHEEL_CENTER_SCALE, WHEEL_SIDE_SCALE, WHEEL_FAR_SCALE);
}

/** Opacity curve vs normalized slot offset. */
export function wheelOpacityForNorm(t: number): number {
  return blendByAbsT(t, WHEEL_CENTER_OPACITY, WHEEL_SIDE_OPACITY, WHEEL_FAR_OPACITY);
}

/**
 * rotateY in degrees. Tile left of center (t<0) → positive Y (faces inward);
 * tile right (t>0) → negative Y. Linear for native driver interpolations.
 */
export function wheelRotateYDegForNorm(t: number): number {
  const deg = -t * WHEEL_MAX_ROTATE_Y_DEG;
  return deg === 0 ? 0 : deg;
}

/**
 * Extra translateX so visual spacing follows WHEEL_SPACING_RATIO vs flat slots.
 * parked flat offset is `t * slotWidth`; drum wants `t * slotWidth * ratio`.
 */
export function wheelSpacingNudgePx(t: number, slotWidth: number): number {
  const w = slotWidth > 0 ? slotWidth : 1;
  const nudge = t * w * (WHEEL_SPACING_RATIO - 1);
  return nudge === 0 ? 0 : nudge;
}

/** True when |t| is inside the focus band (center chrome / extras). */
export function wheelInFocusBand(t: number, band = WHEEL_FOCUS_BAND): boolean {
  return Math.abs(t) <= band;
}

/**
 * Sample curve outputs for a tile whose parked center is `parkedOffsetPx`
 * from the viewport focus, given current drag translateX.
 */
export function wheelSample(args: {
  parkedOffsetPx: number;
  dragPx: number;
  slotWidth: number;
}): {
  norm: number;
  scale: number;
  opacity: number;
  rotateYDeg: number;
  spacingNudgePx: number;
  inFocus: boolean;
} {
  const spacing = args.slotWidth * WHEEL_SPACING_RATIO;
  const offset = args.parkedOffsetPx + args.dragPx;
  const norm = wheelNormFromOffset(offset, spacing > 0 ? spacing : args.slotWidth);
  return {
    norm,
    scale: wheelScaleForNorm(norm),
    opacity: wheelOpacityForNorm(norm),
    rotateYDeg: wheelRotateYDegForNorm(norm),
    spacingNudgePx: wheelSpacingNudgePx(norm, args.slotWidth),
    inFocus: wheelInFocusBand(norm),
  };
}
