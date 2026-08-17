import { Platform } from 'react-native';

const grokSafe = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export async function normalizePhoto(
  uri: string,
  mimeType?: string | null,
): Promise<{ uri: string; mimeType: string }> {
  const mime = (mimeType ?? guessMimeFromUri(uri) ?? '').toLowerCase();

  if (Platform.OS === 'web') {
    if (await looksLikeHeic(uri, mime)) {
      return convertHeicOnWeb(uri);
    }
    if (grokSafe.has(mime)) {
      return { uri, mimeType: mime === 'image/jpg' ? 'image/jpeg' : mime };
    }
    return { uri, mimeType: mime || 'image/jpeg' };
  }

  const ImageManipulator = await import('expo-image-manipulator');
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return persistLocalJpeg(result.uri);
}

/** iOS deletes ImagePicker temps when the camera closes. Copy to our cache first. */
async function persistLocalJpeg(uri: string): Promise<{ uri: string; mimeType: string }> {
  try {
    const FileSystem = await import('expo-file-system/legacy');
    const dest = `${FileSystem.cacheDirectory}kelyra-${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return { uri: dest, mimeType: 'image/jpeg' };
  } catch {
    return { uri, mimeType: 'image/jpeg' };
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
