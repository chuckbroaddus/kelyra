/**
 * Calendar 3D horizontal period wheel — SoT curve helpers.
 *
 * Binding SoT:
 *   notes/company/calendar-3d-wheel-spec.md §2
 *   notes/company/calendar-3d-wheel-pm-lock.md geometry §2 / CAL-3DW-01..18
 *   notes/company/calendar-3d-wheel-mockups/index.html
 *
 * Ship curves from dual-stamped SoT (not the prior brief defaults).
 */
export { snapPeriodPage, PERIOD_PAGER_EDGE_GUARD_PX } from './periodPager.ts';

/** Perspective (px) on the wheel host. Spec §2.1. */
export const WHEEL_PERSPECTIVE = 920;

/** Slot pitch P (px) on 390 stage — center-to-center. */
export const WHEEL_PITCH = 78;

/** Hero leaf layout box. */
export const WHEEL_HERO_WIDTH = 108;
export const WHEEL_HERO_HEIGHT = 126;

/** Stage height (thumb drag band). */
export const WHEEL_STAGE_HEIGHT = 148;

/** Focus band half-width in px (±59 → 118 wide). */
export const WHEEL_FOCUS_BAND_PX = 59;

/** Focus band in slot units (|d|). */
export const WHEEL_FOCUS_BAND = WHEEL_FOCUS_BAND_PX / WHEEL_PITCH;

/** rotateY deg per slot: clamp(d,-3,3) * -14. */
export const WHEEL_ROTATE_Y_PER_SLOT = -14;

/** Max |rotateY| at |d|≥3. */
export const WHEEL_MAX_ROTATE_Y_DEG = 42; // 3 * 14

/** Z lift at center; sides recede by 18*|d|. */
export const WHEEL_Z_CENTER = 36;
export const WHEEL_Z_PER_SLOT = 18;

/** Scale / opacity anchors from SoT formulas (at integer |d|). */
export const WHEEL_CENTER_SCALE = 1;
export const WHEEL_SIDE_SCALE = 0.76; // |d|=1 → 1 - 0.22 - 0.02
export const WHEEL_FAR_SCALE = 0.48; // |d|=2 → 1 - 0.44 - 0.08
export const WHEEL_MIN_SCALE = 0.46;
export const WHEEL_CENTER_OPACITY = 1;
export const WHEEL_SIDE_OPACITY = 0.73; // |d|=1 → 1 - 0.24 - 0.03
export const WHEEL_FAR_OPACITY = 0.4; // |d|=2 → 1 - 0.48 - 0.12
export const WHEEL_MIN_OPACITY = 0.22;

/** Max integer slots committed per fling (AC-M04). */
export const WHEEL_MAX_FLING_SLOTS = 3;

/**
 * Mounted recycle window: center ±3 (7 leaves). Hero still reads as five;
 * |d|=3 peeks so MAX_FLING=3 never hits a blank slot (CAL-P6 Item 2 Approach A).
 */
export const WHEEL_VISIBLE_SLOTS = 7;
export const WHEEL_SLOT_OFFSETS = [-3, -2, -1, 0, 1, 2, 3] as const;
/** Index of offset 0 inside WHEEL_SLOT_OFFSETS / buildPeriodWindow.slots. */
export const WHEEL_CENTER_INDEX = 3;

/** Spring ~300 ms settle (friction/tension pair). */
export const WHEEL_SPRING = { friction: 8, tension: 92 } as const;

/** Set B hanging-ledger hex — unchanged across themes (CAL-3DW-10). */
export const SET_B = {
  header: '#C62828',
  sunday: '#E53935',
  body: '#FFFFFF',
  type: '#1A1A1A',
  grid: '#E0E0E0',
  tabMetal: '#B0BEC5',
  tabHighlight: '#ECEFF1',
  softEdge: 'rgba(0,0,0,0.18)',
} as const;

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/** Normalize a pixel offset from the focus center into slot units (÷ pitch). */
export function wheelNormFromOffset(offsetPx: number, pitch = WHEEL_PITCH): number {
  const p = pitch > 0 ? pitch : WHEEL_PITCH;
  return offsetPx / p;
}

/**
 * Scale curve vs signed distance d (slot units).
 * SoT: clamp(1 - 0.22*|d| - 0.02*d², 0.46, 1)
 */
export function wheelScaleForNorm(d: number): number {
  const a = Math.abs(d);
  return clamp(1 - 0.22 * a - 0.02 * d * d, WHEEL_MIN_SCALE, WHEEL_CENTER_SCALE);
}

/**
 * Opacity curve vs signed distance d.
 * SoT: clamp(1 - 0.24*|d| - 0.03*d², 0.22, 1)
 */
export function wheelOpacityForNorm(d: number): number {
  const a = Math.abs(d);
  return clamp(1 - 0.24 * a - 0.03 * d * d, WHEEL_MIN_OPACITY, WHEEL_CENTER_OPACITY);
}

/**
 * rotateY in degrees. SoT: clamp(d,-3,3) * -14
 * Left (d&lt;0) → positive yaw; right (d&gt;0) → negative.
 */
export function wheelRotateYDegForNorm(d: number): number {
  const deg = clamp(d, -3, 3) * WHEEL_ROTATE_Y_PER_SLOT;
  return deg === 0 ? 0 : deg;
}

/** SoT Z lift curve: z(d) = 36 - 18*|d|. Not applied to RN style.transform (Fabric rejects translateZ). */
export function wheelZForNorm(d: number): number {
  return WHEEL_Z_CENTER - WHEEL_Z_PER_SLOT * Math.abs(d);
}

/** World X at rest / during drag: d * P. */
export function wheelTranslateXForNorm(d: number, pitch = WHEEL_PITCH): number {
  const p = pitch > 0 ? pitch : WHEEL_PITCH;
  return d * p;
}

/** True when |d| is inside the focus band (center chrome / extras). */
export function wheelInFocusBand(d: number, band = WHEEL_FOCUS_BAND): boolean {
  return Math.abs(d) <= band;
}

/**
 * Sample curve outputs for a tile whose parked slot index is `parkedSlot`
 * (…-2,-1,0,1,2…), given current finger drag translateX (content follows finger).
 */
export function wheelSample(args: {
  parkedSlot: number;
  dragPx: number;
  pitch?: number;
}): {
  norm: number;
  scale: number;
  opacity: number;
  rotateYDeg: number;
  translateX: number;
  translateZ: number;
  inFocus: boolean;
} {
  const pitch = args.pitch && args.pitch > 0 ? args.pitch : WHEEL_PITCH;
  const norm = args.parkedSlot + args.dragPx / pitch;
  return {
    norm,
    scale: wheelScaleForNorm(norm),
    opacity: wheelOpacityForNorm(norm),
    rotateYDeg: wheelRotateYDegForNorm(norm),
    translateX: wheelTranslateXForNorm(norm, pitch),
    translateZ: wheelZForNorm(norm),
    inFocus: wheelInFocusBand(norm),
  };
}

/** @deprecated Prefer WHEEL_PITCH. Kept for import compat. */
export const WHEEL_SPACING_RATIO = 1;

/** @deprecated Prefer wheelTranslateXForNorm / WHEEL_PITCH. */
export function wheelSpacingNudgePx(_t: number, _slotWidth: number): number {
  return 0;
}
