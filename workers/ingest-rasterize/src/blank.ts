import sharp from 'sharp';
import type { RasterizeConfig } from './config.ts';
import { DEFAULT_CONFIG } from './config.ts';

/**
 * Near-white / low ink coverage guess. Never sends pixels to a model.
 */
export async function detectBlank(
  jpeg: Buffer,
  config: RasterizeConfig = DEFAULT_CONFIG,
): Promise<boolean> {
  const { data, info } = await sharp(jpeg)
    .rotate()
    .resize(64, 64, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const pixels = info.width * info.height;
  if (pixels === 0) return true;

  let sum = 0;
  let ink = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    sum += luma;
    // Ink = not near-white
    if (luma < 0.92) ink += 1;
  }

  const mean = sum / pixels;
  const inkFrac = ink / pixels;
  return mean >= config.blankLumaMin && inkFrac <= config.blankInkMax;
}
