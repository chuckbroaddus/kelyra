import { Audio } from 'expo-av';
import { Platform } from 'react-native';

const WEB_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function pickWebMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return WEB_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function recordingOptions(): Audio.RecordingOptions {
  const webMime = pickWebMimeType();
  return {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
    web: webMime
      ? { mimeType: webMime, bitsPerSecond: 128000 }
      : {},
  };
}

export function mimeTypeForRecording(): string {
  if (Platform.OS === 'web') {
    return pickWebMimeType()?.split(';')[0] ?? 'audio/webm';
  }
  return 'audio/m4a';
}
