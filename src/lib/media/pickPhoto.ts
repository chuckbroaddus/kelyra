import * as ImagePicker from 'expo-image-picker';
import { InteractionManager, Platform } from 'react-native';

import { MAX_GRADING_DOC_PAGES } from '@/lib/ingest/gradingDocPages';
import { normalizePhoto } from '@/lib/media/photo';

export function webCameraNeeded(fromCamera: boolean): boolean {
  return fromCamera && Platform.OS === 'web';
}

/** iOS will not present the camera/library over another Modal. Wait for it to dismiss. */
export function waitForModalDismiss(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, Platform.OS === 'ios' ? 400 : 200);
    });
  });
}

export async function pickNormalizedPhoto(
  fromCamera: boolean,
): Promise<{ uri: string; mimeType: string } | null> {
  // Web file inputs only open inside the original click. Do not await
  // permissions first — they are always granted on web and the extra tick
  // swallows the picker.
  if (Platform.OS !== 'web') {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Camera or photo permission is required.');
    }
  }

  const result = fromCamera
    ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

  if (result.canceled || !result.assets[0]) return null;
  return normalizePhoto(result.assets[0].uri, result.assets[0].mimeType);
}

export type PickNormalizedPhotosOptions = {
  /** Cap (default MAX_GRADING_DOC_PAGES = 20). Camera is always one shot. */
  max?: number;
  /**
   * Library multi-select (default). Camera stays single-shot — screens collect
   * more pages with “Add another page”.
   */
  fromCamera?: boolean;
};

/**
 * Multi-page document pick for syllabus / school-policy ingest.
 * Library: allowsMultipleSelection + selectionLimit (web file input gets `multiple`).
 * Keeps picker order. Does not replace pickNormalizedPhoto for avatars etc.
 */
export async function pickNormalizedPhotos(
  options: PickNormalizedPhotosOptions = {},
): Promise<Array<{ uri: string; mimeType: string }> | null> {
  const max = Math.max(1, Math.min(MAX_GRADING_DOC_PAGES, Math.floor(options.max ?? MAX_GRADING_DOC_PAGES)));
  const fromCamera = options.fromCamera === true;

  if (fromCamera) {
    const one = await pickNormalizedPhoto(true);
    return one ? [one] : null;
  }

  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Photo permission is required.');
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: true,
    selectionLimit: max,
  });

  if (result.canceled || !result.assets?.length) return null;

  const limited = result.assets.slice(0, max);
  const normalized: Array<{ uri: string; mimeType: string }> = [];
  for (const asset of limited) {
    const next = await normalizePhoto(asset.uri, asset.mimeType);
    normalized.push(next);
  }
  return normalized.length ? normalized : null;
}

/**
 * Camera or library as-is. No face crop, no background cutout.
 * Use for group chat avatars. People avatars still go through pickNormalizedPhoto + framePortrait.
 */
export async function pickRawPhoto(
  fromCamera: boolean,
): Promise<{ uri: string; mimeType: string } | null> {
  if (Platform.OS !== 'web') {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Camera or photo permission is required.');
    }
  }

  const result = fromCamera
    ? await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: false, exif: false })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
        exif: false,
      });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const mime = asset.mimeType || 'image/jpeg';
  if (Platform.OS === 'web') return { uri: asset.uri, mimeType: mime };
  try {
    const FileSystem = await import('expo-file-system/legacy');
    const ext = mime.includes('png')
      ? 'png'
      : mime.includes('webp')
        ? 'webp'
        : mime.includes('heic') || mime.includes('heif')
          ? 'heic'
          : 'jpg';
    const dest = `${FileSystem.cacheDirectory}kelyra-raw-${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: asset.uri, to: dest });
    return { uri: dest, mimeType: mime };
  } catch {
    return { uri: asset.uri, mimeType: mime };
  }
}
