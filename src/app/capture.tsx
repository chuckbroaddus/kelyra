import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { DevicePicker } from '@/components/DevicePicker';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import {
  DangerButton,
  GhostButton,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { PhotoPager } from '@/components/ui/PhotoPager';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

import { useAuth } from '@/lib/auth/AuthProvider';
import {
  applyTranscriptAndMatch,
  createCapture,
  saveCaptureEvaluation,
  transcribeCaptureAudio,
} from '@/lib/captures/api';
import { evaluateCaptureMedia, type CaptureEvaluation } from '@/lib/captures/evaluate';
import { resolveCaptureClass } from '@/lib/classes/api';
import { shouldAutoAttach } from '@/lib/matching/matchName';
import { splitByRoster } from '@/lib/matching/splitTranscript';
import { getPreferredDeviceId, setPreferredDeviceId } from '@/lib/media/devices';
import { normalizePhoto } from '@/lib/media/photo';
import { startLiveRecording, type LiveRecording } from '@/lib/media/recorder';
import { uploadTeacherAsset } from '@/lib/media/upload';
import { listRoster, type RosterStudent } from '@/lib/students/api';

export default function CaptureScreen() {
  const { colors } = useTheme();
  const layout = useLayout();
  const chrome = useChrome();
  const router = useRouter();
  const { teacher } = useAuth();
  const [pages, setPages] = useState<Array<{ key: string; uri: string; mimeType: string }>>([]);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState('audio/m4a');
  const [spokenName, setSpokenName] = useState('');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [recording, setRecording] = useState<LiveRecording | null>(null);
  const [micId, setMicId] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [deviceTick, setDeviceTick] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [evaluation, setEvaluation] = useState<CaptureEvaluation | null>(null);

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
        shouldAutoAttach(part.match) && student ? student.display_name : 'Inbox';
      return `${target}: ${part.text}`;
    });

    if (parts.length > 1) {
      return {
        button: `Save ${parts.length} notes`,
        hint: lines.join('\n'),
        saved: `${parts.length} notes saved. Next photo whenever you’re ready.`,
      };
    }
    if (lines[0] && parts[0]) {
      const only = parts[0].match;
      const student = roster.find((row) => row.id === only.guessedStudentId);
      if (shouldAutoAttach(only) && student) {
        return {
          button: `Save to ${student.display_name}`,
          hint: `This goes on ${student.display_name}’s record.`,
          saved: `Saved to ${student.display_name}. Next photo whenever you’re ready.`,
        };
      }
      return {
        button: 'Save to Inbox',
        hint:
          only.confidence > 0
            ? 'Name is unclear — it will wait in Inbox.'
            : 'No name yet — it will wait in Inbox.',
        saved: 'Saved to Inbox. You can put a name on it after class.',
      };
    }
    return {
      button: 'Save to Inbox',
      hint: 'No name is fine — it goes to Inbox.',
      saved: 'Saved to Inbox. You can put a name on it after class.',
    };
  }, [spokenName, roster]);

  useFocusEffect(
    useCallback(() => {
      if (!teacher) return;
      void (async () => {
        try {
          const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id);
          setRoster(await listRoster(klass.id));
          setMicId(await getPreferredDeviceId('audio'));
          setCameraId(await getPreferredDeviceId('video'));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not load roster');
        }
      })();
    }, [teacher]),
  );

  useFocusEffect(
    useCallback(() => {
      chrome.setForceHidden(cameraOpen);
      return () => chrome.setForceHidden(false);
    }, [cameraOpen, chrome]),
  );

  if (!teacher) {
    return (
      <Screen>
        <Text style={[styles.lead, { color: colors.mute }]}>Sign in first, then come back to capture.</Text>
        <GhostButton align="left" label="Sign in" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  const resetSlip = () => {
    setPages([]);
    setAudioUri(null);
    setSpokenName('');
    setEvaluation(null);
    setRecording(null);
    setCameraOpen(false);
  };

  const applyPhoto = async (uri: string, mimeType?: string | null) => {
    try {
      const prepared = await normalizePhoto(uri, mimeType);
      setPages((current) => [
        ...current,
        {
          key: `${Date.now()}-${current.length}`,
          uri: prepared.uri,
          mimeType: prepared.mimeType,
        },
      ]);
      setEvaluation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that photo.');
    }
  };

  const pickPhoto = async (fromCamera: boolean) => {
    setStatus(null);
    setError(null);
    if (fromCamera && Platform.OS === 'web') {
      setCameraOpen(true);
      return;
    }

    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Camera or photo permission is required.');
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
    await applyPhoto(asset.uri, asset.mimeType);
  };

  const startRecording = async () => {
    setStatus(null);
    setError(null);
    try {
      setRecording(await startLiveRecording(micId));
      setAudioUri(null);
      setEvaluation(null);
      setDeviceTick((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the microphone.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      const captured = await recording.stop();
      setRecording(null);
      setAudioUri(captured.uri);
      setAudioMime(captured.mimeType);
    } catch (err) {
      setRecording(null);
      setError(err instanceof Error ? err.message : 'Could not finish the recording.');
    }
  };

  const onAskAi = async () => {
    if ((!pages.length && !audioUri) || asking || recording) return;
    setAsking(true);
    setError(null);
    setStatus('Asking AI… this can take a few seconds.');
    try {
      const result = await evaluateCaptureMedia({
        teacherId: teacher.id,
        pages: pages.map((page, index) => ({
          uri: page.uri,
          mimeType: page.mimeType,
          asset: evaluation?.photoAssets[index],
        })),
        audioUri,
        audioMime,
        existingAudio: evaluation?.audioAsset,
      });
      setEvaluation(result);
      if (!spokenName.trim() && result.studentName) {
        setSpokenName(result.studentName);
      } else if (!spokenName.trim() && result.transcript) {
        setSpokenName(result.transcript);
      }
      const bits = [];
      if (result.studentName) bits.push(`Name: ${result.studentName}`);
      if (result.draftScore != null) bits.push(`Draft score: ${result.draftScore}`);
      if (result.gaps.length) bits.push(result.gaps.map((gap) => gap.label).join(', '));
      setStatus(bits.length ? bits.join(' · ') : 'AI finished. Check the save button.');
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not ask AI');
    } finally {
      setAsking(false);
    }
  };

  const save = async () => {
    if (!pages.length && !spokenName.trim() && !audioUri) {
      setError('Add a photo, a name, or a short note.');
      return;
    }
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id);
      const photoAssets =
        evaluation?.photoAssets?.length === pages.length
          ? evaluation.photoAssets
          : await Promise.all(
              pages.map((page) =>
                uploadTeacherAsset({
                  teacherId: teacher.id,
                  kind: 'photo',
                  uri: page.uri,
                  mimeType: page.mimeType,
                }),
              ),
            );
      const photo = photoAssets[0] ?? null;
      const audio = evaluation?.audioAsset
        ? evaluation.audioAsset
        : audioUri
          ? await uploadTeacherAsset({
              teacherId: teacher.id,
              kind: 'audio',
              uri: audioUri,
              mimeType: audioMime,
            })
          : null;
      const draftToSave = photoAssets.length
        ? {
            gaps: evaluation?.gaps ?? [],
            draftScore: evaluation?.draftScore ?? null,
            teacherNote: evaluation?.teacherNote ?? null,
            studentName: evaluation?.studentName ?? null,
            parentSentence: evaluation?.parentSentence ?? null,
            pageAssetIds: photoAssets.map((asset) => asset.id),
          }
        : evaluation;

      const first = await createCapture({
        classId: klass.id,
        kind: photo ? 'homework' : 'voice_note',
        inputSource: photo ? 'camera' : spokenName.trim() ? 'typed' : 'voice',
        photoAssetId: photo?.id,
        audioAssetId: audio?.id,
        transcript: spokenName.trim() || null,
      });

      let fullText = spokenName.trim() || evaluation?.transcript?.trim() || '';
      if (!fullText && audio && !evaluation) {
        fullText = (await transcribeCaptureAudio(first.id)) ?? '';
      }
      const names = roster.map((student) => ({
        studentId: student.id,
        displayName: student.display_name,
        aliases: student.name_aliases,
      }));
      const segments = splitByRoster(fullText, names);
      const texts = segments.length ? segments.map((part) => part.text) : fullText ? [fullText] : [];
      if (!texts.length && draftToSave) {
        await saveCaptureEvaluation(first.id, draftToSave, null);
      }

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
        await applyTranscriptAndMatch(row, segment, index === 0 ? draftToSave : null);
      }

      resetSlip();
      setStatus(preview.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save capture');
    } finally {
      setBusy(false);
    }
  };

  const hasMedia = pages.length > 0 || Boolean(audioUri);
  const TakeButton = pages.length === 0 ? PrimaryButton : SecondaryButton;
  const split = layout.isSplit || (layout.orientation === 'landscape' && layout.width >= 640);
  const sticky = hasMedia || spokenName.trim() ? (
    <PrimaryButton
      label={busy ? 'Saving…' : preview.button}
      disabled={busy}
      onPress={() => void save()}
    />
  ) : undefined;

  const photoBlock = (
    <View style={styles.block}>
      {!cameraOpen ? (
        <PhotoPager
          empty={pages.length === 0}
          pages={pages}
          hero
          fill={split}
          onRemove={(key) => {
            setPages((current) => current.filter((item) => item.key !== key));
            setEvaluation(null);
          }}
        />
      ) : null}
      {cameraOpen ? (
        <WebCameraCapture
          deviceId={cameraId}
          onCapture={(uri, mimeType) => {
            setCameraOpen(false);
            void applyPhoto(uri, mimeType);
          }}
          onCancel={() => setCameraOpen(false)}
        />
      ) : (
        <>
          <DevicePicker
            kind="video"
            selectedId={cameraId}
            nonce={deviceTick}
            onSelect={(deviceId) => {
              setCameraId(deviceId);
              void setPreferredDeviceId('video', deviceId);
            }}
          />
          <TakeButton
            label={pages.length ? 'Add a page' : 'Take photo'}
            onPress={() => void pickPhoto(true)}
          />
          <GhostButton
            label={pages.length ? 'Add a page from library' : 'Choose from library'}
            onPress={() => void pickPhoto(false)}
          />
        </>
      )}
    </View>
  );

  const whoBlock = (
    <View style={styles.block}>
      <SectionHeader label="Who is this?" first={split} />
      {recording ? (
        <DangerButton showDot label="Stop recording" onPress={() => void stopRecording()} />
      ) : (
        <SecondaryButton label="Record the name" onPress={() => void startRecording()} />
      )}
      <TextField
        multiline
        placeholder="Maya Chen, still lining up place value"
        value={spokenName}
        onChangeText={setSpokenName}
      />
      <Text style={[type.meta, { color: colors.mute }]}>{preview.hint}</Text>
      {evaluation?.gaps.length ? (
        <Card>
          <Text style={[type.section, { color: colors.mute }]}>Suggested gaps</Text>
          <View style={styles.gaps}>
            {evaluation.gaps.map((gap) => (
              <Chip key={gap.label} label={gap.label} />
            ))}
          </View>
          {evaluation.draftScore != null ? (
            <Text style={[type.meta, { color: colors.mute }]}>Draft score {evaluation.draftScore}</Text>
          ) : null}
          {evaluation.teacherNote ? <Text style={[type.meta, { color: colors.mute }]}>{evaluation.teacherNote}</Text> : null}
        </Card>
      ) : null}
      {hasMedia && !recording ? (
        <GhostButton
          label={asking ? 'Asking AI…' : 'Ask AI to guess the name'}
          disabled={asking || busy}
          onPress={() => void onAskAi()}
        />
      ) : null}
      {asking ? <WorkingLine text="Asking AI…" /> : status ? <Text style={[styles.status, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {split && sticky ? sticky : null}
    </View>
  );

  if (split) {
    return (
      <View style={[styles.split, { backgroundColor: colors.bg }]}>
        <View style={styles.left}>{photoBlock}</View>
        <View style={styles.right}>
          <Screen scroll maxWidth={480}>
            {whoBlock}
            <PhaseBanner
              phase={2}
              compact
              detail="Photograph one student’s work, then say the name. Incomplete is fine."
            />
          </Screen>
        </View>
      </View>
    );
  }

  return (
    <Screen keyboard sticky={sticky}>
      {photoBlock}
      {whoBlock}
      <PhaseBanner
        phase={2}
        compact
        detail="Photograph one student’s work, then say the name. Incomplete is fine."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    ...type.body,
    marginBottom: 8,
  },
  block: {
    gap: 8,
    marginBottom: 8,
  },
  gaps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  status: {
    ...type.meta,
    marginTop: 12,
  },
  error: {
    ...type.body,
    marginTop: 12,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  left: {
    flex: 1.2,
    minWidth: 0,
    padding: 16,
  },
  right: {
    flex: 1,
    minWidth: 280,
    padding: 16,
  },
});
