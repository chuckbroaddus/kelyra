import { Platform, Share } from 'react-native';

async function downloadToCache(url: string): Promise<string> {
  if (Platform.OS === 'web') return url;
  const FileSystem = await import('expo-file-system/legacy');
  const dest = `${FileSystem.cacheDirectory}kelyra-${Date.now()}.jpg`;
  const result = await FileSystem.downloadAsync(url, dest);
  if (!result.uri) throw new Error('Could not download that photo.');
  return result.uri;
}

export async function sharePhoto(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      const blob = await fetch(url).then((res) => res.blob());
      const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
      await navigator.share({ files: [file] });
      return;
    }
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return;
  }
  const local = await downloadToCache(url);
  const Sharing = await import('expo-sharing');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(local, { mimeType: 'image/jpeg', dialogTitle: 'Send photo' });
    return;
  }
  await Share.share({ url: local });
}

export async function savePhoto(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await fetch(url).then((res) => res.blob());
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'photo.jpg';
    link.click();
    URL.revokeObjectURL(href);
    return;
  }
  const MediaLibrary = await import('expo-media-library');
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) throw new Error('Photo library permission is required.');
  const local = await downloadToCache(url);
  await MediaLibrary.saveToLibraryAsync(local);
}
