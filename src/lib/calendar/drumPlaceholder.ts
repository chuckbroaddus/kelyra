/**
 * CAL-DRUM-PH (variant C): drum placeholder card laws — pure + closure-free worklets.
 * SoT mockup: notes/company/prototypes/drum-placeholder-card/index.html (variant C).
 *
 * Fast flick → every card shows the placeholder (same plate, soft gray blob where
 * the number goes, light sweep over the body + month band). Once the drum slows
 * under ~6 periods/s, cards come into focus center first: 40ms stagger per card
 * from center, 200ms each (mockup "blur 12px→0, opacity .35→1, scale 1.08→1").
 *
 * No live blur on device: the blur is pre-rendered into the blob image, and focus
 * is a cross-fade (blob out, label in) with the mockup's scale. Shimmer = an
 * animated LinearGradient band (transform only). Reduce Motion: plain fade.
 *
 * Worklets take every constant as an argument (periodWheel ⇄ periodPager cycle rule).
 */

/** Enter the placeholder above this speed (periods/s) — hysteresis over EXIT. */
export const DRUM_PH_ENTER_SPEED = 8;
/** Mockup VTH: focus begins once the drum slows under ~6 days/s. */
export const DRUM_PH_EXIT_SPEED = 6;
/** Mockup BLUR_OUT: real label → placeholder. */
export const DRUM_PH_BLUR_OUT_MS = 70;
/** Mockup: each card focuses in 200ms. */
export const DRUM_PH_FOCUS_MS = 200;
/** Mockup: 40ms per card out from center (center first), capped at 3. */
export const DRUM_PH_STAGGER_MS = 40;
export const DRUM_PH_STAGGER_MAX = 3;
/** Whole focus pass: last ring (3 × 40ms) + 200ms. */
export const DRUM_PH_FOCUS_TOTAL_MS = DRUM_PH_FOCUS_MS + DRUM_PH_STAGGER_MS * DRUM_PH_STAGGER_MAX;
/** Mockup `shim 1.1s linear infinite`. */
export const DRUM_PH_SHIMMER_MS = 1100;
/** Speed EMA time constant (ms) — smooths 120Hz frame jitter. */
export const DRUM_PH_SPEED_TAU_MS = 40;
/** Per-sample jump larger than this (periods) = parent jump / Today, not motion. */
export const DRUM_PH_TELEPORT = 4;
/** No position change for this long while in placeholder → treat as stopped. */
export const DRUM_PH_IDLE_MS = 60;

/** Driver mode: 0 real · 1 placeholder (spinning fast) · 2 focusing in. */
export type DrumPhMode = 0 | 1 | 2;

/**
 * One EMA step of drum speed (periods/s) from a position sample.
 * Returns the new speed; NaN prev / tiny dt / teleport keep `speed`.
 */
export function drumPhSpeedStep(
  prevPos: number,
  pos: number,
  dtMs: number,
  speed: number,
  tauMs: number,
  teleport: number,
): number {
  'worklet';
  if (!(prevPos === prevPos) || !(dtMs > 0.5)) return speed;
  const d = Math.abs(pos - prevPos);
  if (d > teleport) return speed;
  const inst = (d / dtMs) * 1000;
  const a = dtMs / tauMs > 1 ? 1 : dtMs / tauMs;
  return speed + (inst - speed) * a;
}

/** Mode transition for a speed sample (hysteresis: enter > ENTER, exit < EXIT). */
export function drumPhNextMode(mode: number, speed: number, enter: number, exit: number): number {
  'worklet';
  if (mode === 0) return speed > enter ? 1 : 0;
  if (mode === 1) return speed < exit ? 2 : 1;
  // Focusing: a renewed fast spin goes back to placeholder; else keep focusing.
  return speed > enter ? 1 : 2;
}

/**
 * Card focus progress k ∈ [0,1] (1 = real card, 0 = placeholder) — mockup modeK.
 * mode 1: k = 1 − blurOut (blurOut animates 0→1 over 70ms) · mode 2: center
 * first — delay 40ms × round(min(3, |index − focusCenter|)), then 200ms.
 */
export function drumPhCardK(
  mode: number,
  blurOut: number,
  clockMs: number,
  focusCenter: number,
  index: number,
  focusMs: number,
  staggerMs: number,
  staggerMax: number,
): number {
  'worklet';
  if (mode === 0) return 1;
  if (mode === 1) {
    const k = 1 - blurOut;
    return k < 0 ? 0 : k > 1 ? 1 : k;
  }
  const a = Math.abs(index - focusCenter);
  const dc = a > staggerMax ? staggerMax : a;
  const k = (clockMs - staggerMs * Math.round(dc)) / focusMs;
  return k < 0 ? 0 : k > 1 ? 1 : k;
}

/**
 * Layer values for focus progress k: [labelOpacity, labelScale, blobOpacity, blobScale].
 * Mockup: e = 1 − (1−k)³; label scale 1.08 → 1; blob opacity 1 − min(1, 1.6k).
 * The 12px→0 blur is not drawn live: label ink ramps e·(.35 + .65e) (a blurred
 * .35 glyph reads as a smudge, not text) while the pre-blurred blob spreads
 * (scale 1 → 1.25 ≈ its blur 0→6px) and fades. RM: plain cross-fade, no scale.
 */
export function drumPhLayers(k: number, reduceMotion: boolean): [number, number, number, number] {
  'worklet';
  const kk = k < 0 ? 0 : k > 1 ? 1 : k;
  if (reduceMotion) return [kk, 1, 1 - kk, 1];
  if (kk >= 1) return [1, 1, 0, 1];
  const u = 1 - kk;
  const e = 1 - u * u * u;
  const blob = 1 - (kk * 1.6 > 1 ? 1 : kk * 1.6);
  return [e * (0.35 + 0.65 * e), 1.08 - 0.08 * e, blob, 1 + 0.25 * kk];
}

/**
 * Shimmer band left edge (px) inside a blob of width w at phase s ∈ [0,1).
 * Mockup: gradient 30/50/70% over background-size 220%, position 120% → −120%:
 * band (0.88w wide, peak at its middle) travels center −0.34w → 2.54w, left to right.
 */
export function drumPhShimmerX(s: number, w: number): number {
  'worklet';
  const center = w * (-0.34 + 2.88 * s);
  return center - 0.44 * w;
}
