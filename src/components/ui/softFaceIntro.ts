import { SOFT_INTRO } from './softLetterScale.ts';

/** Intro length: lids close-open-close-open over 3 blinks, after the face has grown in. */
export const SOFT_INTRO_TOTAL_MS = SOFT_INTRO.blinkMs * 3 + SOFT_INTRO.faceMs;

/** Intro lids: 0 closed .. 1 open (open, dip to 0.15, open) over 3 × blinkMs. */
function introBlinkOpen(t: number): number {
  const b = SOFT_INTRO.blinkMs;
  if (t <= 0) return 0;
  if (t < b) return 1 - (1 - t / b) ** 2;
  if (t < 2 * b) return 1 - 0.85 * ((t - b) / b) ** 2;
  if (t < 3 * b) return 0.15 + 0.85 * (1 - (1 - (t - 2 * b) / b) ** 2);
  return 1;
}

/** SOFT-FACE-CLOCK: face opacity/scale and intro lid from rAF elapsed (pure; tested). */
export function softFaceIntro(
  working: boolean,
  reduce: boolean,
  elapsedMs: number,
): { opacity: number; scale: number; lid: number | null } {
  if (!working) return { opacity: 0, scale: 0.2, lid: null };
  if (reduce) return { opacity: 1, scale: 1, lid: null };
  const t = Math.max(0, Math.min(1, elapsedMs / SOFT_INTRO.faceMs));
  const grown = 1 - (1 - t) ** 3;
  const lid = elapsedMs < SOFT_INTRO_TOTAL_MS ? 1 - introBlinkOpen(elapsedMs) * (1 - 0.06) : null;
  return { opacity: grown, scale: 0.2 + 0.8 * grown, lid };
}
