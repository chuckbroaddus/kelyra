import { RecordingPresets, type RecordingOptions } from 'expo-audio';
import { Platform } from 'react-native';

const WEB_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function pickWebMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return WEB_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function recordingOptions(): RecordingOptions {
  const webMime = pickWebMimeType();
  const high = RecordingPresets.HIGH_QUALITY;
  // Speech, not music. Stereo 44.1k made header-camera clips huge and STT slow.
  return {
    ...high,
    isMeteringEnabled: false,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    android: {
      ...high.android,
    },
    ios: {
      ...high.ios,
    },
    web: webMime ? { mimeType: webMime, bitsPerSecond: 24000 } : high.web,
  };
}

export function mimeTypeForRecording(): string {
  if (Platform.OS === 'web') {
    return pickWebMimeType()?.split(';')[0] ?? 'audio/webm';
  }
  return 'audio/m4a';
}
