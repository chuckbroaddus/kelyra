import {
  AudioModule,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Platform } from 'react-native';

import { getPreferredDeviceId } from '@/lib/media/devices';
import { mimeTypeForRecording, recordingOptions } from '@/lib/media/recording';

export type LiveRecording = {
  stop: () => Promise<{ uri: string; mimeType: string }>;
};

async function persistLocalAudio(
  uri: string,
  mimeType: string,
): Promise<{ uri: string; mimeType: string }> {
  if (Platform.OS === 'web') return { uri, mimeType };
  try {
    const FileSystem = await import('expo-file-system/legacy');
    const ext = mimeType.includes('wav') ? 'wav' : 'm4a';
    const dest = `${FileSystem.cacheDirectory}kelyra-voice-${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return { uri: dest, mimeType };
  } catch {
    return { uri, mimeType };
  }
}

export async function startLiveRecording(deviceId?: string | null): Promise<LiveRecording> {
  if (Platform.OS === 'web') {
    return startWebRecording(deviceId ?? (await getPreferredDeviceId('audio')));
  }
  return startNativeRecording();
}

async function startNativeRecording(): Promise<LiveRecording> {
  const permission = await requestRecordingPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Microphone permission is required.');
  }
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
    shouldRouteThroughEarpiece: false,
  });
  const options = recordingOptions();
  const recording = new AudioModule.AudioRecorder(options);
  await recording.prepareToRecordAsync(options);
  recording.record();
  return {
    async stop() {
      await recording.stop();
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
        shouldRouteThroughEarpiece: false,
      });
      const uri = recording.uri;
      if (!uri) throw new Error('No audio was captured.');
      return persistLocalAudio(uri, mimeTypeForRecording());
    },
  };
}

async function startWebRecording(deviceId?: string | null): Promise<LiveRecording> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    throw new Error('This browser cannot record audio.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    video: false,
  });
  const mimeType = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ].find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type));
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.start();

  return {
    async stop() {
      const raw = await new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error('Recording failed.'));
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        if (recorder.state !== 'inactive') recorder.stop();
      });
      stream.getTracks().forEach((track) => track.stop());
      if (!raw.size) throw new Error('No audio was captured.');
      const { audioBlobToWav } = await import('@/lib/media/wav');
      const wav = await audioBlobToWav(raw);
      return persistLocalAudio(URL.createObjectURL(wav), 'audio/wav');
    },
  };
}
