import { Audio } from 'expo-av';
import { Platform } from 'react-native';

const WEB_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function pickWebMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return WEB_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function recordingOptions(): Audio.RecordingOptions {
  const webMime = pickWebMimeType();
  const high = Audio.RecordingOptionsPresets.HIGH_QUALITY;
  // Speech, not music. Stereo 44.1k made header-camera clips huge and STT slow.
  return {
    ...high,
    isMeteringEnabled: false,
    android: {
      ...high.android,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 32000,
    },
    ios: {
      ...high.ios,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 32000,
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
