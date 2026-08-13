import { Audio } from 'expo-av';
import { Platform } from 'react-native';

import { getPreferredDeviceId } from '@/lib/media/devices';
import { mimeTypeForRecording, recordingOptions } from '@/lib/media/recording';

export type LiveRecording = {
  stop: () => Promise<{ uri: string; mimeType: string }>;
};

export async function startLiveRecording(deviceId?: string | null): Promise<LiveRecording> {
  if (Platform.OS === 'web') {
    return startWebRecording(deviceId ?? (await getPreferredDeviceId('audio')));
  }
  return startNativeRecording();
}

async function startNativeRecording(): Promise<LiveRecording> {
  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Microphone permission is required.');
  }
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(recordingOptions());
  await recording.startAsync();
  return {
    async stop() {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) throw new Error('No audio was captured.');
      return { uri, mimeType: mimeTypeForRecording() };
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
      return { uri: URL.createObjectURL(wav), mimeType: 'audio/wav' };
    },
  };
}
