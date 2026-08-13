import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth/AuthProvider';
import { createUnassignedHomework } from '@/lib/captures/api';
import { resolveCaptureClass } from '@/lib/classes/api';
import { mimeTypeForRecording, recordingOptions } from '@/lib/media/recording';
import { uploadTeacherAsset } from '@/lib/media/upload';

type RecordingHandle = Audio.Recording;

export default function CaptureScreen() {
  const router = useRouter();
  const { teacher } = useAuth();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState('image/jpeg');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState('audio/m4a');
  const [recording, setRecording] = useState<RecordingHandle | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!teacher) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Sign in first, then come back to capture.</Text>
      </View>
    );
  }

  const pickPhoto = async (fromCamera: boolean) => {
    setStatus(null);
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus('Camera or photo permission is required.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoMime(asset.mimeType ?? 'image/jpeg');
  };

  const startRecording = async () => {
    setStatus(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus('Microphone permission is required to record a name.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const next = new Audio.Recording();
      await next.prepareToRecordAsync(recordingOptions());
      await next.startAsync();
      setRecording(next);
      setAudioUri(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not start the microphone.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) {
      setAudioUri(uri);
      setAudioMime(mimeTypeForRecording());
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  };

  const save = async () => {
    if (!photoUri) {
      setStatus('Add a photo of the work first.');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id);
      const photo = await uploadTeacherAsset({
        teacherId: teacher.id,
        kind: 'photo',
        uri: photoUri,
        mimeType: photoMime,
      });
      const audio = audioUri
        ? await uploadTeacherAsset({
            teacherId: teacher.id,
            kind: 'audio',
            uri: audioUri,
            mimeType: audioMime,
          })
        : null;
      await createUnassignedHomework({
        classId: klass.id,
        photoAssetId: photo.id,
        audioAssetId: audio?.id,
      });
      router.replace('/inbox');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save capture');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture homework</Text>
      <Text style={styles.body}>
        One student per photo. You can skip the voice note — it still saves to Unassigned. No matching yet.
      </Text>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
      <Pressable style={styles.button} onPress={() => void pickPhoto(true)}>
        <Text style={styles.buttonText}>Take photo</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => void pickPhoto(false)}>
        <Text style={styles.secondaryText}>Choose photo</Text>
      </Pressable>
      {recording ? (
        <Pressable style={styles.danger} onPress={() => void stopRecording()}>
          <Text style={styles.buttonText}>Stop recording</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.secondary} onPress={() => void startRecording()}>
          <Text style={styles.secondaryText}>
            {audioUri ? 'Re-record name' : 'Record name (optional)'}
          </Text>
        </Pressable>
      )}
      {audioUri && !recording ? <Text style={styles.meta}>Voice note attached</Text> : null}
      <Pressable disabled={busy} style={styles.button} onPress={() => void save()}>
        <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save to Unassigned'}</Text>
      </Pressable>
      {status ? <Text style={styles.error}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.75,
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  danger: {
    backgroundColor: '#9b1c1c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  error: {
    color: '#9b1c1c',
  },
});
