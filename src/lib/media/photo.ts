import { Platform } from 'react-native';

const grokSafe = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export const PHOTO_MAX_EDGE = 1600;
export const THUMB_MAX_EDGE = 480;
const PHOTO_QUALITY = 0.82;
const THUMB_QUALITY = 0.72;

export async function normalizePhoto(
  uri: string,
  mimeType?: string | null,
): Promise<{ uri: string; mimeType: string }> {
  const prepared = await preparePhoto(uri, mimeType, PHOTO_MAX_EDGE, PHOTO_QUALITY);
  return { uri: prepared.uri, mimeType: prepared.mimeType };
}

export async function makePhotoThumb(
  uri: string,
  mimeType?: string | null,
): Promise<{ uri: string; mimeType: string }> {
  const prepared = await preparePhoto(uri, mimeType, THUMB_MAX_EDGE, THUMB_QUALITY);
  return { uri: prepared.uri, mimeType: prepared.mimeType };
}

async function preparePhoto(
  uri: string,
  mimeType: string | null | undefined,
  maxEdge: number,
  quality: number,
): Promise<{ uri: string; mimeType: string }> {
  let mime = (mimeType ?? guessMimeFromUri(uri) ?? '').toLowerCase();
  let next = uri;

  if (Platform.OS === 'web' && (await looksLikeHeic(next, mime))) {
    const converted = await convertHeicOnWeb(next);
    next = converted.uri;
    mime = converted.mimeType;
  }

  const png = mime.includes('png');
  const webp = mime.includes('webp');
  try {
    return await resizeWithManipulator(next, maxEdge, quality, png);
  } catch {
    if (Platform.OS === 'web') {
      try {
        return await resizeOnWeb(next, maxEdge, quality, png || webp ? mime || 'image/png' : 'image/jpeg');
      } catch {
        return { uri: next, mimeType: mime || 'image/jpeg' };
      }
    }
    if (grokSafe.has(mime) || mime.startsWith('image/')) {
      return { uri: next, mimeType: mime === 'image/jpg' ? 'image/jpeg' : mime || 'image/jpeg' };
    }
    return { uri: next, mimeType: 'image/jpeg' };
  }
}

async function resizeWithManipulator(
  uri: string,
  maxEdge: number,
  quality: number,
  png: boolean,
): Promise<{ uri: string; mimeType: string }> {
  const ImageManipulator = await import('expo-image-manipulator');
  const info = await ImageManipulator.manipulateAsync(uri, []);
  const longest = Math.max(info.width, info.height, 1);
  const actions =
    longest > maxEdge
      ? [
          {
            resize: {
              width: Math.max(1, Math.round(info.width * (maxEdge / longest))),
              height: Math.max(1, Math.round(info.height * (maxEdge / longest))),
            },
          },
        ]
      : [];
  const result = await ImageManipulator.manipulateAsync(info.uri, actions, {
    compress: quality,
    format: png ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG,
  });
  const mimeType = png ? 'image/png' : 'image/jpeg';
  if (Platform.OS === 'web') return { uri: result.uri, mimeType };
  return persistLocal(result.uri, png ? 'png' : 'jpg', mimeType);
}

async function persistLocal(
  uri: string,
  ext: string,
  mimeType: string,
): Promise<{ uri: string; mimeType: string }> {
  try {
    const FileSystem = await import('expo-file-system/legacy');
    const dest = `${FileSystem.cacheDirectory}kelyra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return { uri: dest, mimeType };
  } catch {
    return { uri, mimeType };
  }
}

function guessMimeFromUri(uri: string): string | null {
  const path = uri.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.heic') || path.endsWith('.heif')) return 'image/heic';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

async function looksLikeHeic(uri: string, mime: string): Promise<boolean> {
  if (mime.includes('heic') || mime.includes('heif')) return true;
  try {
    const response = await fetch(uri);
    const header = new Uint8Array(await (await response.blob()).slice(0, 16).arrayBuffer());
    return isHeicHeader(header);
  } catch {
    return false;
  }
}

function isHeicHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  return ftyp === 'ftyp' && ['heic', 'heif', 'mif1', 'msf1', 'heix'].includes(brand);
}

async function convertHeicOnWeb(uri: string): Promise<{ uri: string; mimeType: string }> {
  const heic2any = (await import('heic2any')).default;
  const blob = await (await fetch(uri)).blob();
  const converted = await heic2any({ blob, toType: 'image/jpeg', quality: 0.8 });
  const jpeg = Array.isArray(converted) ? converted[0] : converted;
  return { uri: URL.createObjectURL(jpeg), mimeType: 'image/jpeg' };
}

async function resizeOnWeb(
  uri: string,
  maxEdge: number,
  quality: number,
  mime: string,
): Promise<{ uri: string; mimeType: string }> {
  const blob = await (await fetch(uri)).blob();
  const bitmap = await createImageBitmap(blob);
  const longest = Math.max(bitmap.width, bitmap.height, 1);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return { uri, mimeType: mime || 'image/jpeg' };
  }
  const outMime = mime.includes('png') ? 'image/png' : 'image/jpeg';
  if (outMime !== 'image/png') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const out = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => (next ? resolve(next) : reject(new Error('Could not encode photo'))), outMime, quality);
  });
  return { uri: URL.createObjectURL(out), mimeType: outMime };
}
