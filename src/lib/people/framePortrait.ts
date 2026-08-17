import { Image, Platform } from 'react-native';

import { invokeAi } from '@/lib/ai/invoke';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';

export type FaceBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const SIZE = 640;

export async function framePortraitFile(
  uri: string,
  imageUrl?: string | null,
): Promise<{ uri: string; mimeType: string }> {
  if (imageUrl) {
    try {
      const cut = await invokeAi<{ imageBase64?: string; mimeType?: string }>('cutout-portrait', {
        imageUrl,
      });
      if (cut.imageBase64) {
        return {
          uri: await writeTempPng(cut.imageBase64),
          mimeType: cut.mimeType || 'image/png',
        };
      }
    } catch {
      // Fall through to a local crop if rembg is offline.
    }
  }
  return cropPortraitFallback(uri, imageUrl);
}

export async function uploadFramedProfilePhoto(input: {
  teacherId: string;
  uri: string;
  mimeType: string;
  imageUrl?: string | null;
}): Promise<{ id: string }> {
  let url = input.imageUrl && input.imageUrl.startsWith('http') ? input.imageUrl : null;
  let tempAssetId: string | null = null;
  if (!url) {
    const uploaded = await uploadTeacherAsset({
      teacherId: input.teacherId,
      kind: 'photo',
      uri: input.uri,
      mimeType: input.mimeType,
    });
    tempAssetId = uploaded.id;
    url = await signedUrlForAsset('photo', uploaded.storage_path);
  }
  const framed = await framePortraitFile(input.uri, url);
  const asset = await uploadTeacherAsset({
    teacherId: input.teacherId,
    kind: 'photo',
    uri: framed.uri,
    mimeType: framed.mimeType,
  });
  if (tempAssetId && tempAssetId !== asset.id) {
    try {
      const { requireSupabase } = await import('@/lib/supabase/client');
      await requireSupabase().rpc('teacher_unref_asset', { p_asset_id: tempAssetId });
    } catch {
      // Keep the framed asset even if we cannot drop the probe upload.
    }
  }
  return { id: asset.id };
}

async function cropPortraitFallback(
  uri: string,
  imageUrl?: string | null,
): Promise<{ uri: string; mimeType: string }> {
  const baked = await bakeOrientation(uri);
  let box: FaceBox | null = null;
  if (imageUrl) {
    try {
      box = await invokeAi<FaceBox>('crop-portrait', { imageUrl });
    } catch {
      box = null;
    }
  }
  const crop = squareFromBox(box, baked.width, baked.height);
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const framed = await ImageManipulator.manipulateAsync(
      baked.uri,
      [{ crop }, { resize: { width: SIZE, height: SIZE } }],
      { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG },
    );
    return { uri: framed.uri, mimeType: 'image/jpeg' };
  } catch {
    return { uri: baked.uri, mimeType: 'image/jpeg' };
  }
}

async function bakeOrientation(uri: string): Promise<{ uri: string; width: number; height: number }> {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const baked = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { uri: baked.uri, width: baked.width, height: baked.height };
  } catch {
    const { width, height } = await measureImage(uri);
    return { uri, width, height };
  }
}

function squareFromBox(box: FaceBox | null, imgW: number, imgH: number) {
  const safe = box && box.width > 0.04 && box.height > 0.04 ? box : { left: 0.15, top: 0.15, width: 0.7, height: 0.7 };
  const x = clamp01(safe.left) * imgW;
  const y = clamp01(safe.top) * imgH;
  const w = Math.max(8, clamp01(safe.width) * imgW);
  const h = Math.max(8, clamp01(safe.height) * imgH);
  const cx = x + w / 2;
  const cy = y + h / 2;
  let side = Math.max(w, h) * 1.18;
  side = Math.min(side, imgW, imgH);
  let originX = cx - side / 2;
  let originY = cy - side / 2;
  originX = Math.min(Math.max(0, originX), imgW - side);
  originY = Math.min(Math.max(0, originY), imgH - side);
  return {
    originX: Math.round(originX),
    originY: Math.round(originY),
    width: Math.round(side),
    height: Math.round(side),
  };
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function measureImage(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      async () => {
        try {
          const ImageManipulator = await import('expo-image-manipulator');
          const info = await ImageManipulator.manipulateAsync(uri, []);
          resolve({ width: info.width, height: info.height });
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

async function writeTempPng(base64: string): Promise<string> {
  if (Platform.OS === 'web') {
    const bytes = bytesFromBase64(base64);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/png' });
    return URL.createObjectURL(blob);
  }
  const FileSystem = await import('expo-file-system/legacy');
  const dest = `${FileSystem.cacheDirectory}kelyra-portrait-${Date.now()}.png`;
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
