/**
 * Edge (Deno) page signature: decode JPEG/PNG with imagescript, 32x32 greyscale, then the
 * shared signatureFromGrey32. HEIC/WebP/unknown → empty signature (match-key then relies on
 * header + vision instead of the hash).
 */
import { decode, Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';

import { EMPTY_SIGNATURE, signatureFromGrey32, type PageSignature } from './answerKeyMatch.ts';
import { isAllowedAskImageUrl } from './askImageUrl.ts';

export async function imageBytesFromUrl(imageUrl: string): Promise<Uint8Array | null> {
  if (!isAllowedAskImageUrl(imageUrl)) return null;
  const dataUrl = imageUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataUrl) {
    const bin = atob(dataUrl[2]!);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }
  const response = await fetch(imageUrl, { redirect: 'error' });
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer());
}

export async function pageSignatureFromBytes(bytes: Uint8Array | null): Promise<PageSignature> {
  if (!bytes?.length) return { ...EMPTY_SIGNATURE };
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50;
  if (!jpeg && !png) return { ...EMPTY_SIGNATURE };
  try {
    const decoded = await decode(bytes);
    if (!(decoded instanceof Image)) return { ...EMPTY_SIGNATURE };
    const thumb = decoded.resize(32, 32);
    const grey = new Uint8Array(32 * 32);
    const px = thumb.bitmap; // RGBA
    for (let i = 0; i < 32 * 32; i += 1) {
      const r = px[i * 4]!;
      const g = px[i * 4 + 1]!;
      const b = px[i * 4 + 2]!;
      grey[i] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    }
    return signatureFromGrey32(grey);
  } catch {
    return { ...EMPTY_SIGNATURE };
  }
}

export async function pageSignatureFromUrl(imageUrl: string): Promise<PageSignature> {
  try {
    return await pageSignatureFromBytes(await imageBytesFromUrl(imageUrl));
  } catch {
    return { ...EMPTY_SIGNATURE };
  }
}
