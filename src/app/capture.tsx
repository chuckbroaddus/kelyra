import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/lib/auth/AuthProvider';
import {
  applyTranscriptAndMatch,
  createCapture,
  transcribeCaptureAudio,
} from '@/lib/captures/api';
import { resolveCaptureClass } from '@/lib/classes/api';
import { matchName, shouldAutoAttach } from '@/lib/matching/matchName';
import { splitByRoster } from '@/lib/matching/splitTranscript';
import { mimeTypeForRecording, recordingOptions } from '@/lib/media/recording';
import { uploadTeacherAsset } from '@/lib/media/upload';
import { listRoster, type RosterStudent } from '@/lib/students/api';

type RecordingHandle = Audio.Recording;

export default function CaptureScreen() {
  const router = useRouter();
  const { teacher } = useAuth();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState('image/jpeg');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState('audio/m4a');
  const [spokenName, setSpokenName] = useState('');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [recording, setRecording] = useState<RecordingHandle | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    const names = roster.map((student) => ({
      studentId: student.id,
      displayName: student.display_name,
      aliases: student.name_aliases,
    }));
    const parts = splitByRoster(spokenName, names);
    const lines = parts.map((part) => {
      const student = roster.find((row) => row.id === part.match.guessedStudentId);
      const target =
        shouldAutoAttach(part.match) && student ? student.display_name : 'Unassigned';
      return `${target}: ${part.text}`;
    });

    if (parts.length > 1) {
      return {
        button: `Save ${parts.length} notes`,
        hint: lines.join('\n'),
      };
    }
    if (lines[0] && parts[0]) {
      const only = parts[0].match;
      const student = roster.find((row) => row.id === only.guessedStudentId);
      if (shouldAutoAttach(only) && student) {
        return { button: `Save to ${student.display_name}`, hint: lines[0] };
      }
      return {
        button: 'Save to Unassigned',
        hint: only.confidence > 0
          ? `${lines[0]} (name unclear — pick in inbox)`
          : `${lines[0]} (no roster match — pick in inbox)`,
      };
    }
    return { button: 'Save to Unassigned', hint: 'No name yet — this will stay in Unassigned.' };
  }, [spokenName, roster]);

  useFocusEffect(
    useCallback(() => {
      if (!teacher) return;
      void (async () => {
        try {
          const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id);
          setRoster(await listRoster(klass.id));
        } catch (err) {
          setStatus(err instanceof Error ? err.message : 'Could not load roster');
        }
      })();
    }, [teacher]),
  );

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
    if (!photoUri && !spokenName.trim() && !audioUri) {
      setStatus('Add a photo, a name, or a short note.');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id);
      const photo = photoUri
        ? await uploadTeacherAsset({
            teacherId: teacher.id,
            kind: 'photo',
            uri: photoUri,
            mimeType: photoMime,
          })
        : null;
      const audio = audioUri
        ? await uploadTeacherAsset({
            teacherId: teacher.id,
            kind: 'audio',
            uri: audioUri,
            mimeType: audioMime,
          })
        : null;
      const first = await createCapture({
        classId: klass.id,
        kind: photo ? 'homework' : 'voice_note',
        inputSource: photo ? 'camera' : spokenName.trim() ? 'typed' : 'voice',
        photoAssetId: photo?.id,
        audioAssetId: audio?.id,
        transcript: spokenName.trim() || null,
      });

      let fullText = spokenName.trim();
      if (!fullText && audio) {
        fullText = (await transcribeCaptureAudio(first.id)) ?? '';
      }
      const names = roster.map((student) => ({
        studentId: student.id,
        displayName: student.display_name,
        aliases: student.name_aliases,
      }));
      const segments = splitByRoster(fullText, names);
      const texts = segments.length ? segments.map((part) => part.text) : fullText ? [fullText] : [];
      let lastFiledStudentId: string | null = null;
      let anyUnassigned = !texts.length;

      for (const [index, segment] of texts.entries()) {
        const row =
          index === 0
            ? first
            : await createCapture({
                classId: klass.id,
                kind: 'voice_note',
                inputSource: 'typed',
                transcript: segment,
              });
        const matched = await applyTranscriptAndMatch(row, segment);
        if (matched.student_id) lastFiledStudentId = matched.student_id;
        else anyUnassigned = true;
      }

      if (anyUnassigned || !lastFiledStudentId) {
        router.replace('/inbox');
      } else {
        router.replace(`/class/${klass.id}/student/${lastFiledStudentId}`);
      }
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
        Photo optional. Name each student in their own sentence: Jamal guessed on the quiz. Mateo finished early.
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
      <TextInput
        placeholder="Jamal guessed on the quiz. Mateo finished early."
        style={styles.input}
        value={spokenName}
        onChangeText={setSpokenName}
      />
      <Text style={styles.meta}>{preview.hint}</Text>
      <Pressable disabled={busy} style={styles.button} onPress={() => void save()}>
        <Text style={styles.buttonText}>{busy ? 'Saving…' : preview.button}</Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
