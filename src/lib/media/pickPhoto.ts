import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { normalizePhoto } from '@/lib/media/photo';

export function webCameraNeeded(fromCamera: boolean): boolean {
  return fromCamera && Platform.OS === 'web';
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
