/**
 * Soft comet orbit math — shared by native SoftMark (RN Views).
 * Same place(theta) as Soft Soft v8b / HTML SoT: 2D ellipse yaw-rev + cantZ,
 * phase-z front/behind K, thick bead trail for ~40px chrome.
 *
 * HTML Soft v8b host remains design SoT only; WebView Soft is abandoned.
 */
import { COMET_ORBIT, LETTER_INK, SOFT_MOTION } from './softLetterScale';

/** Trail bead count — thick enough for ~40px chrome. */
export const BEAD_N = 14;
/** Phase lag span (fraction of orbit) for bead trail. */
export const TRAIL_SPAN = 0.38;
/** Head bead size as fraction of letter ink height. */
export const BEAD_SIZE_HEAD = 0.14;
/** Head→tail size drop (letter * (0.14 − 0.095 * tFrac)). */
export const BEAD_SIZE_TAIL_DELTA = 0.095;

export type SoftCometPoint = { x: number; y: number };
export type SoftCometBead = SoftCometPoint & { size: number; opacity: number };
export type SoftCometFrame = {
  head: SoftCometPoint;
  headSize: number;
  beads: SoftCometBead[];
  /** true → ball+beads paint in front of letter (zIndex). */
  front: boolean;
  theta: number;
};

/** Letter ink height in px for a mark canvas of `markSize`. */
export function softLetterHeight(markSize: number): number {
  return (markSize * LETTER_INK.height) / LETTER_INK.canvas;
}

/**
 * Screen-plane place on the Soft oval (yaw-rev).
 * x = r·sin(θ), y = r·cos(θ)·ovalY, then cantZ rotation.
 */
export function softCometPlace(theta: number, r: number): SoftCometPoint {
  const cant = (COMET_ORBIT.cantZDeg * Math.PI) / 180;
  const cosC = Math.cos(cant);
  const sinC = Math.sin(cant);
  const x = r * Math.sin(theta);
  const y = r * Math.cos(theta) * COMET_ORBIT.ovalY;
  return { x: x * cosC - y * sinC, y: x * sinC + y * cosC };
}

/**
 * One Soft orbit frame at phase ∈ [0,1) for mark canvas `markSize`.
 * theta = −phase·2π (yaw-rev). front when cos(theta) > 0.
 */
export function softCometFrame(phase: number, markSize: number): SoftCometFrame {
  const letter = softLetterHeight(markSize);
  const r = letter * COMET_ORBIT.radiusOfLetter;
  const theta = -phase * Math.PI * 2;
  const head = softCometPlace(theta, r);
  const headSize = letter * BEAD_SIZE_HEAD;
  const beads: SoftCometBead[] = [];
  for (let b = 0; b < BEAD_N; b++) {
    const lag = ((b + 1) / (BEAD_N + 1)) * TRAIL_SPAN;
    const p = softCometPlace(-(phase - lag) * Math.PI * 2, r);
    const tFrac = (b + 1) / BEAD_N;
    const size = letter * (BEAD_SIZE_HEAD - BEAD_SIZE_TAIL_DELTA * tFrac);
    const opacity = 0.95 - 0.7 * tFrac;
    beads.push({ x: p.x, y: p.y, size, opacity });
  }
  return {
    head,
    headSize,
    beads,
    front: Math.cos(theta) > 0,
    theta,
  };
}

export { SOFT_MOTION, COMET_ORBIT };
