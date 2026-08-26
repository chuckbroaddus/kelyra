import { Platform } from 'react-native';

import { invokeAi } from '@/lib/ai/invoke';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';
import { punchSchoolLogo } from '@/lib/school/punchLogo';

const SIZE = 512;

/** School wordmark. Remove background, crop to ink, fit in a square. Not for people faces. */
export async function frameLogoFile(
  uri: string,
  imageUrl?: string | null,
): Promise<{ uri: string; mimeType: string }> {
  let next = uri;
  if (imageUrl) {
    try {
      const cut = await invokeAi<{ imageBase64?: string; mimeType?: string }>('cutout-logo', {
        imageUrl,
      });
      if (cut.imageBase64) next = await writeTempPng(cut.imageBase64);
    } catch {
      // Local punch still runs.
    }
  }
  const punched = await punchSchoolLogo(next);
  if (punched.uri !== next) return punched;
  return resizeLogoFallback(punched.uri);
}

export async function uploadFramedSchoolLogo(input: {
  teacherId: string;
  uri: string;
  mimeType: string;
}): Promise<{ id: string }> {
  const uploaded = await uploadTeacherAsset({
    teacherId: input.teacherId,
    kind: 'photo',
    uri: input.uri,
    mimeType: input.mimeType,
    skipThumb: true,
  });
  const url = await signedUrlForAsset('photo', uploaded.storage_path);
  const framed = await frameLogoFile(input.uri, url);
  const asset = await uploadTeacherAsset({
    teacherId: input.teacherId,
    kind: 'photo',
    uri: framed.uri,
    mimeType: framed.mimeType,
    skipThumb: true,
  });
  if (uploaded.id !== asset.id) {
    try {
      const { requireSupabase } = await import('@/lib/supabase/client');
      await requireSupabase().rpc('teacher_unref_asset', { p_asset_id: uploaded.id });
    } catch {
      // Keep the framed asset even if we cannot drop the probe upload.
    }
  }
  return { id: asset.id };
}

async function resizeLogoFallback(uri: string): Promise<{ uri: string; mimeType: string }> {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const info = await ImageManipulator.manipulateAsync(uri, []);
    const longest = Math.max(info.width, info.height, 1);
    const scale = SIZE / longest;
    const width = Math.max(1, Math.round(info.width * scale));
    const height = Math.max(1, Math.round(info.height * scale));
    const framed = await ImageManipulator.manipulateAsync(uri, [{ resize: { width, height } }], {
      compress: 1,
      format: ImageManipulator.SaveFormat.PNG,
    });
    return { uri: framed.uri, mimeType: 'image/png' };
  } catch {
    return { uri, mimeType: 'image/png' };
  }
}

async function writeTempPng(base64: string): Promise<string> {
  if (Platform.OS === 'web') {
    const bytes = bytesFromBase64(base64);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/png' });
    return URL.createObjectURL(blob);
  }
  const FileSystem = await import('expo-file-system/legacy');
  const dest = `${FileSystem.cacheDirectory}kelyra-logo-${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return dest;
}

function bytesFromBase64(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
