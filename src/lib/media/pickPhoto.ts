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
  const permission = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera or photo permission is required.');
  }

  const result = fromCamera
    ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

  if (result.canceled || !result.assets[0]) return null;
  return normalizePhoto(result.assets[0].uri, result.assets[0].mimeType);
}
