import sharp from 'sharp';
import type { RasterizeConfig } from './config.ts';
import { DEFAULT_CONFIG } from './config.ts';

export type JpegPair = {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
};

/**
 * JPEG long-edge 1600–2048 (max 2048; min 1600 unless source smaller), q ~0.85, ≤4 MB.
 * Thumb long-edge ~400.
 */
export async function normalizePageJpeg(
  input: Buffer,
  config: RasterizeConfig = DEFAULT_CONFIG,
): Promise<JpegPair> {
  const meta = await sharp(input).rotate().metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const longEdge = Math.max(w, h);

  let targetLong = longEdge;
  if (longEdge > config.jpegLongEdgeMax) {
    targetLong = config.jpegLongEdgeMax;
  } else if (longEdge >= config.jpegLongEdgeMin) {
    targetLong = longEdge; // already in band
  } else if (longEdge > 0) {
    // Source smaller than 1600 — keep native (architecture: min 1600 unless source smaller)
    targetLong = longEdge;
  }

  let quality = Math.round(config.jpegQuality * 100);
  let full = await resizeJpeg(input, targetLong, quality);

  // Shrink quality then edge if still over hard max
  while (full.byteLength > config.jpegHardMaxBytes && quality > 50) {
    quality -= 5;
    full = await resizeJpeg(input, targetLong, quality);
  }
  while (full.byteLength > config.jpegHardMaxBytes && targetLong > 800) {
    targetLong = Math.floor(targetLong * 0.85);
    full = await resizeJpeg(input, targetLong, quality);
  }

  const thumb = await resizeJpeg(input, config.thumbLongEdge, Math.round(config.thumbQuality * 100));
  const outMeta = await sharp(full).metadata();

  return {
    full,
    thumb,
    width: outMeta.width ?? 0,
    height: outMeta.height ?? 0,
  };
}

async function resizeJpeg(input: Buffer, longEdge: number, quality: number): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({
      width: longEdge,
      height: longEdge,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

/** Enforce long-edge band for tests / callers. */
export function longEdgeOf(width: number, height: number): number {
  return Math.max(width, height);
}
