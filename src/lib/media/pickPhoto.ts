import * as ImagePicker from 'expo-image-picker';
import { InteractionManager, Platform } from 'react-native';

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
