/**
 * Soft working face vs idle `kelyra.png` letter size (chrome K1/K3).
 *
 * Soft ink bbox is smaller than idle but Soft is a filled face (denser), so a
 * 1:1 canvas contain makes Soft *read* larger than the stroke K. Scale Soft
 * **down** so Soft letter optical size matches idle K (CEO 2026-09-17).
 * Do **not** upscale idle K.
 *
 * Measured (512 canvases): idle ink ~464×471; Soft ink ~317×314 after recenter.
 * SOFT_LETTER_SCALE on Soft Image so stems/body stack with idle when Soft face
 * features are ignored (eyes/mouth/comet stripped).
 */
export const SOFT_LETTER_SCALE = 0.78;

/** Intro timings (ms) — blink open, mouth/face grow, comet zoom into orbit. */
export const SOFT_INTRO = {
  faceMs: 280,
  blinkMs: 90,
  cometMs: 420,
  outroMs: 220,
} as const;
