import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { DevicePicker } from '@/components/DevicePicker';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { KeygradePackBReview } from '@/components/ui/KeygradePackBReview';
import { ListRow } from '@/components/ui/ListRow';
import { PhotoPager } from '@/components/ui/PhotoPager';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

import { useAuth } from '@/lib/auth/AuthProvider';
import {
  assignmentHasKey,
  listClassAssignments,
} from '@/lib/assignments/api';
import { parseKeyItems } from '@/lib/assignments/keys';
import type { ScoredKeyItem } from '@/lib/assignments/scoreKey';
import {
  applyTranscriptAndMatch,
  attachCapture,
  createCapture,
  saveCaptureEvaluation,
  transcribeCaptureAudio,
} from '@/lib/captures/api';
import { evaluateCaptureMedia, type CaptureEvaluation } from '@/lib/captures/evaluate';
import { resolveCaptureClass } from '@/lib/classes/api';
import { approveCapture, markNoteOnly } from '@/lib/gaps/api';
import { invokeAi } from '@/lib/ai/invoke';
import { canApproveKeygrade } from '@/lib/keygrade/approveGate';
import {
  buildKeyScoreDraft,
  extractMarksFromVisionItems,
} from '@/lib/keygrade/draft';
import { findTwinCandidates } from '@/lib/keygrade/twins';
import { matchPaperName, shouldAutoAttach } from '@/lib/matching/matchName';
import { splitByRoster } from '@/lib/matching/splitTranscript';
import { transcribeAudioDirect } from '@/lib/matching/captureSpeech';
import { existingRosterMatch } from '@/lib/matching/spokenName';
import { getPreferredDeviceId, setPreferredDeviceId } from '@/lib/media/devices';
import { normalizePhoto } from '@/lib/media/photo';
import {
  composeDictatedField,
  isLiveDictationSupported,
  startLiveDictation,
  type LiveDictation,
} from '@/lib/media/liveDictation';
import { startLiveRecording, type LiveRecording } from '@/lib/media/recorder';
import { uploadTeacherAsset, signedUrlForAsset } from '@/lib/media/upload';
import { pickMessageDocument } from '@/lib/messages/attachments';
import {
  createParent,
  linkChild,
  listParentsForClass,
  updateParentMetadata,
  type ClassParent,
} from '@/lib/parents/api';
import { mapClassifierFields } from '@/lib/people/metadata';
import {
  setProfilePhoto,
  signedOriginalUrlsForAssetIds,
  uploadProfilePhoto,
} from '@/lib/people/photos';
import { isOfficeRole } from '@/lib/school/roles';
import {
  addConfirmedStudents,
  createRosterImport,
  enrollExistingStudent,
  getStudent,
  listAvailableStudents,
  listPendingRosterImports,
  listRoster,
  markRosterImportConfirmed,
  suggestRosterFromPhoto,
  updateStudentMetadata,
  type RosterStudent,
  type SuggestedRosterName,
} from '@/lib/students/api';
import { birthdayForSave } from '@/lib/date/iso';
import { upsertSyllabusAskDraft } from '@/lib/syllabus/api';
import type { AssignmentRow } from '@/lib/supabase/types';

type CaptureIntent =
  | 'homework'
  | 'syllabus'
  | 'portrait'
  | 'parent_card'
  | 'student_card'
  | 'roster'
  | 'unsure';

/** Teacher note / spoken text that should force syllabus over homework. */
function spokenSuggestsSyllabus(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!t) return false;
  return /\b(syllabus|grading\s*policy|grade\s*weights?|category\s*weights?|weight(ing)?\s*(percent|%|table)|how\s+(this\s+)?class\s+grades)\b/.test(
    t,
  );
}

type ClassifyResult = {
  intent: CaptureIntent;
  confidence: number;
  studentGuessId: string | null;
  studentGuessName: string | null;
  parentGuessName: string | null;
  draftScore: number | null;
  gaps: { label: string }[];
  fields: { label: string; value: string }[];
  names: { name: string; confidence: number }[];
  note: string | null;
};

type CaptureFile = { key: string; uri: string; mimeType: string; name: string };

const INTENT_COPY: Record<CaptureIntent, string> = {
  homework: 'This will be student work / a grade draft',
  syllabus: 'This will be a class syllabus / grading policy',
  portrait: 'This will be a profile portrait',
  parent_card: 'This will be a parent card',
  student_card: 'This will be a student card',
  roster: 'This will be a roster list',
  unsure: 'This will be… (pick a job — we will not guess)',
};

export default function CaptureScreen() {
  const { colors } = useTheme();
  const layout = useLayout();
  const chrome = useChrome();
  const setForceHidden = chrome.setForceHidden;
  const chromeClassId = chrome.classId;
  const chromeRole = chrome.role;
  const router = useRouter();
  const { teacher } = useAuth();
  const office = chromeRole !== 'none' && isOfficeRole(chromeRole);

  const [pages, setPages] = useState<Array<{ key: string; uri: string; mimeType: string }>>([]);
  const [files, setFiles] = useState<CaptureFile[]>([]);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState('audio/m4a');
  const [spokenName, setSpokenName] = useState('');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [parents, setParents] = useState<ClassParent[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [parentName, setParentName] = useState('');
  const [portraitTarget, setPortraitTarget] = useState<'student' | 'parent'>('student');
  const [packItems, setPackItems] = useState<ScoredKeyItem[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [recording, setRecording] = useState<LiveRecording | null>(null);
  const [dictation, setDictation] = useState<LiveDictation | null>(null);
  const dictationRef = useRef<LiveDictation | null>(null);
  const dictationBaseRef = useRef('');
  const [micId, setMicId] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [deviceTick, setDeviceTick] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [evaluation, setEvaluation] = useState<CaptureEvaluation | null>(null);
  const [intent, setIntent] = useState<CaptureIntent | null>(null);
  const [classified, setClassified] = useState<ClassifyResult | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedRosterName[]>([]);
  const [fieldChecks, setFieldChecks] = useState<
    Array<{ key: string; label: string; value: string; checked: boolean }>
  >([]);
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [dropHover, setDropHover] = useState(false);

  const micLive = Boolean(recording || dictation);

  const keyedAssignments = useMemo(
    () => assignments.filter((row) => assignmentHasKey(row)),
    [assignments],
  );
  const selectedAssignment = useMemo(
    () => assignments.find((row) => row.id === assignmentId) ?? null,
    [assignments, assignmentId],
  );
  const twinCandidates = useMemo(() => {
    const names = roster.map((student) => ({
      studentId: student.id,
      displayName: student.display_name,
      aliases: student.name_aliases,
    }));
    return findTwinCandidates(spokenName || classified?.studentGuessName || evaluation?.studentName || '', names);
  }, [spokenName, classified?.studentGuessName, evaluation?.studentName, roster]);

  const hasContent =
    pages.length > 0 || files.length > 0 || Boolean(audioUri) || Boolean(spokenName.trim());

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
          const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id, chromeClassId);
          setRoster(await listRoster(klass.id));
          setAssignments(await listClassAssignments(klass.id));
          try {
            const grownups = await listParentsForClass(klass.id);
            setParents([...grownups.linked, ...grownups.unlinked]);
          } catch {
            setParents([]);
          }
          setMicId(await getPreferredDeviceId('audio'));
          setCameraId(await getPreferredDeviceId('video'));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not load roster');
        }
      })();
    }, [teacher, chromeClassId]),
  );

  useFocusEffect(
    useCallback(() => {
      setForceHidden(cameraOpen);
      return () => setForceHidden(false);
    }, [cameraOpen, setForceHidden]),
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        void dictationRef.current?.stop().catch(() => {});
        dictationRef.current = null;
        setDictation(null);
      };
    }, []),
  );

  if (!teacher) {
    return (
      <Screen>
        <Text style={[styles.lead, { color: colors.mute }]}>Sign in first, then come back to capture.</Text>
        <GhostButton align="left" label="Sign in" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  const clearClassify = () => {
    setIntent(null);
    setClassified(null);
    setSuggestions([]);
    setFieldChecks([]);
    setUploadedAssetId(null);
  };

  const resetSlip = () => {
    setPages([]);
    setFiles([]);
    setAudioUri(null);
    setSpokenName('');
    setEvaluation(null);
    void dictationRef.current?.stop().catch(() => {});
    dictationRef.current = null;
    setDictation(null);
    setRecording(null);
    setCameraOpen(false);
    setPackItems([]);
    setReviewOpen(false);
    setStudentId(null);
    setParentId(null);
    setParentName('');
    setAssignmentId(null);
    clearClassify();
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
      setPackItems([]);
      setReviewOpen(false);
      clearClassify();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that photo.');
    }
  };

  const applyLibraryAsset = async (uri: string, mimeType?: string | null, name?: string | null) => {
    const mime = mimeType || 'application/octet-stream';
    if (mime.startsWith('image/')) {
      await applyPhoto(uri, mime);
      return;
    }
    setFiles((current) => [
      ...current,
      {
        key: `${Date.now()}-${current.length}`,
        uri,
        mimeType: mime,
        name: name || (mime.startsWith('video/') ? 'Video' : 'File'),
      },
    ]);
    clearClassify();
  };

  const pickCamera = async () => {
    setStatus(null);
    setError(null);
    if (Platform.OS === 'web') {
      setCameraOpen(true);
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await applyPhoto(asset.uri, asset.mimeType);
  };

  const pickLibrary = async () => {
    setStatus(null);
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await applyLibraryAsset(asset.uri, asset.mimeType, asset.fileName);
  };

  const pickFiles = async () => {
    setStatus(null);
    setError(null);
    try {
      const picked = await pickMessageDocument();
      if (!picked) return;
      await applyLibraryAsset(picked.uri, picked.mimeType, picked.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open Files.');
    }
  };

  const ingestDroppedFiles = async (list: FileList | File[] | null | undefined) => {
    if (!list || !list.length) return;
    setError(null);
    for (const file of Array.from(list)) {
      const uri = URL.createObjectURL(file);
      await applyLibraryAsset(uri, file.type || 'application/octet-stream', file.name);
    }
  };

  const startRecording = async () => {
    setStatus(null);
    setError(null);
    try {
      if (isLiveDictationSupported()) {
        dictationBaseRef.current = spokenName;
        const session = await startLiveDictation({
          onUpdate: ({ display }) => {
            setSpokenName(composeDictatedField(dictationBaseRef.current, display));
          },
          onError: (err) => {
            setError(err.message);
            dictationRef.current = null;
            setDictation(null);
          },
        });
        dictationRef.current = session;
        setDictation(session);
        setAudioUri(null);
        setEvaluation(null);
        setDeviceTick((value) => value + 1);
        return;
      }
      setRecording(await startLiveRecording(micId));
      setAudioUri(null);
      setEvaluation(null);
      setDeviceTick((value) => value + 1);
    } catch (err) {
      dictationRef.current = null;
      setDictation(null);
      setError(err instanceof Error ? err.message : 'Could not start the microphone.');
    }
  };

  const stopRecording = async () => {
    const live = dictationRef.current ?? dictation;
    if (live) {
      try {
        const finalText = await live.stop();
        dictationRef.current = null;
        setDictation(null);
        setSpokenName(composeDictatedField(dictationBaseRef.current, finalText));
        setStatus(null);
        clearClassify();
      } catch (err) {
        dictationRef.current = null;
        setDictation(null);
        setStatus(null);
        setError(err instanceof Error ? err.message : 'Could not finish dictation.');
      }
      return;
    }
    if (!recording) return;
    try {
      const captured = await recording.stop();
      setRecording(null);
      setAudioUri(captured.uri);
      setAudioMime(captured.mimeType);
      setStatus('Transcribing…');
      const text = await transcribeAudioDirect({ uri: captured.uri, mimeType: captured.mimeType });
      if (text) {
        setSpokenName((current) => (current.trim() ? `${current.trim()} ${text}` : text));
      }
      setStatus(null);
      clearClassify();
    } catch (err) {
      setRecording(null);
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not finish the recording.');
    }
  };

  const runKeyedExtract = async (
    photoAssets: NonNullable<CaptureEvaluation['photoAssets']>,
    assigned: AssignmentRow,
  ) => {
    const imageUrls: string[] = [];
    for (const asset of photoAssets) {
      const imageUrl = await signedUrlForAsset('photo', asset.storage_path);
      if (imageUrl) imageUrls.push(imageUrl);
    }
    if (!imageUrls.length) throw new Error('Could not open those photos.');
    const keyUrls = await signedOriginalUrlsForAssetIds(
      assigned.key_asset_id ? [assigned.key_asset_id] : [],
    );
    const keyItems = parseKeyItems(assigned.key_items);
    const vision = await invokeAi<{
      studentName?: string | null;
      gaps?: CaptureEvaluation['gaps'];
      draftScore?: number | null;
      teacherNote?: string | null;
      costUsd?: number | null;
      items?: Array<{ n?: number; seen?: string | null; expected?: string; credit?: number | null }>;
    }>('evaluate-homework', {
      imageUrls,
      imageUrl: imageUrls[0],
      keyItems,
      keyNotes: assigned.key_notes ?? '',
      scoreScheme: assigned.score_scheme ?? 'numeric',
      maxScore: assigned.max_score,
      keyImageUrls: assigned.key_asset_id
        ? [keyUrls.get(assigned.key_asset_id)].filter(Boolean)
        : [],
    });
    const extract = extractMarksFromVisionItems(vision.items);
    const marks =
      extract.length > 0
        ? extract
        : keyItems.map((item) => ({
            n: item.n,
            extracted: null as string | null,
            confidence: 0.2,
            flag: 'blank' as const,
          }));
    const { draft, scored } = buildKeyScoreDraft({
      keyItems,
      extract: marks,
      assignmentId: assigned.id,
      maxScore: assigned.max_score,
      modelTotal: vision.draftScore,
      teacherNote: vision.teacherNote ?? null,
      studentName: vision.studentName ?? null,
      gaps: vision.gaps ?? [],
      pageAssetIds: photoAssets.map((asset) => asset.id),
      costUsd: vision.costUsd ?? null,
      extractModel: 'evaluate-homework',
    });
    return { draft, scored, vision };
  };

  const onAskAi = async () => {
    if (!hasContent || asking || micLive) return;
    setAsking(true);
    setError(null);
    setStatus('Asking AI…');
    clearClassify();
    try {
      const firstImage = pages.find((page) => page.mimeType.startsWith('image/')) ?? pages[0] ?? null;
      let imageUrl: string | null = null;
      let assetId: string | null = null;

      if (firstImage) {
        const uploaded = await uploadTeacherAsset({
          teacherId: teacher.id,
          kind: 'photo',
          uri: firstImage.uri,
          mimeType: firstImage.mimeType,
        });
        assetId = uploaded.id;
        imageUrl = await signedUrlForAsset('photo', uploaded.storage_path);
        setUploadedAssetId(assetId);
        setEvaluation({
          photoAssets: [uploaded],
          audioAsset: null,
          transcript: spokenName.trim() || null,
          studentName: null,
          gaps: [],
          draftScore: null,
          teacherNote: null,
          costUsd: null,
          parentSentence: null,
          pageAssetIds: [uploaded.id],
        });
      }

      if (audioUri && !spokenName.trim()) {
        const text = await transcribeAudioDirect({ uri: audioUri, mimeType: audioMime }).catch(() => '');
        if (text) setSpokenName(text);
      }

      const rosterPayload = roster.map((student) => ({
        id: student.id,
        name: student.display_name.split(/\s+/).filter(Boolean)[0] ?? student.display_name,
      }));

      let result: ClassifyResult;
      if (imageUrl) {
        result = await invokeAi<ClassifyResult>('classify-capture', {
          imageUrl,
          classId: chromeClassId,
          rosterFirstNames: rosterPayload,
          teacherNote: spokenName.trim() || null,
          spokenName: spokenName.trim() || null,
        });
      } else {
        result = {
          intent: spokenSuggestsSyllabus(spokenName) ? 'syllabus' : 'homework',
          confidence: spokenName.trim() ? 0.6 : 0.4,
          studentGuessId: null,
          studentGuessName: null,
          parentGuessName: null,
          draftScore: null,
          gaps: [],
          fields: [],
          names: [],
          note: spokenName.trim() ? `Heard: ${spokenName.trim()}` : files.length ? `File: ${files.map((f) => f.name).join(', ')}` : null,
        };
      }

      const rawIntent = (result.intent as string) === 'metadata' ? 'student_card' : result.intent;
      const named = ['homework', 'syllabus', 'portrait', 'parent_card', 'student_card', 'roster'] as const;
      let nextIntent: CaptureIntent = named.includes(rawIntent as (typeof named)[number])
        ? (rawIntent as CaptureIntent)
        : 'unsure';
      // Teacher note wins for syllabus language; do not hammer syllabus notes into homework.
      if (spokenSuggestsSyllabus(spokenName)) {
        nextIntent = 'syllabus';
      } else if (
        nextIntent === 'unsure' &&
        (result.studentGuessName || result.gaps?.length || spokenName.trim())
      ) {
        nextIntent = 'homework';
      }

      const rosterNames = roster.map((student) => ({
        studentId: student.id,
        displayName: student.display_name,
        aliases: student.name_aliases,
      }));
      const paperName = result.studentGuessName?.trim() || null;
      const fromId = roster.some((student) => student.id === result.studentGuessId)
        ? result.studentGuessId
        : null;
      const matched = paperName ? matchPaperName(paperName, rosterNames) : { guessedStudentId: null, confidence: 0 };
      const guessOnRoster = fromId ?? matched.guessedStudentId;
      if (guessOnRoster) setStudentId(guessOnRoster);
      if (result.parentGuessName) setParentName(result.parentGuessName);
      if (!spokenName.trim() && (result.studentGuessName || result.note)) {
        setSpokenName(result.studentGuessName || result.note || '');
      }

      const mapped = mapClassifierFields(
        result.fields ?? [],
        nextIntent === 'parent_card' ? 'parent' : 'student',
      );
      setFieldChecks(mapped.map((field) => ({ ...field, checked: true })));
      setClassified(result);
      setIntent(nextIntent);

      if (nextIntent === 'roster' && imageUrl && chromeClassId) {
        const suggested = await suggestRosterFromPhoto(
          imageUrl,
          roster.map((student) => student.display_name),
        );
        setSuggestions(suggested);
        if (assetId) {
          await createRosterImport({
            classId: chromeClassId,
            photoAssetId: assetId,
            suggestions: suggested.map((row) => ({
              name: row.name,
              selected: row.selected,
              already_enrolled: row.alreadyHere,
            })),
          }).catch(() => undefined);
        }
      }

      if (nextIntent === 'homework' && selectedAssignment && assignmentHasKey(selectedAssignment) && pages.length) {
        try {
          const media = await evaluateCaptureMedia({
            teacherId: teacher.id,
            pages: pages.map((page) => ({ uri: page.uri, mimeType: page.mimeType })),
            audioUri,
            audioMime,
          });
          setEvaluation(media);
          if (media.photoAssets.length) {
            const keyed = await runKeyedExtract(media.photoAssets, selectedAssignment);
            setEvaluation({
              ...media,
              gaps: keyed.draft.gaps,
              draftScore: keyed.draft.draftScore,
              teacherNote: keyed.draft.teacherNote,
              studentName: keyed.draft.studentName ?? media.studentName,
              costUsd: keyed.draft.costUsd ?? media.costUsd,
              pageAssetIds: keyed.draft.pageAssetIds,
            });
            setPackItems(keyed.scored.items.map((item) => ({ ...item, confirmed: false })));
            setReviewOpen(true);
          }
        } catch {
          // Confirm strip still works without Pack B extract.
        }
      }

      setStatus(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not ask AI');
    } finally {
      setAsking(false);
    }
  };

  const openPackBReview = async () => {
    if (!selectedAssignment || !assignmentHasKey(selectedAssignment) || !pages.length) {
      setError('Pick a keyed assignment and a photo first.');
      return;
    }
    setAsking(true);
    setError(null);
    setStatus('Extracting against key…');
    try {
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
      const keyed = await runKeyedExtract(photoAssets, selectedAssignment);
      setEvaluation({
        photoAssets,
        audioAsset: evaluation?.audioAsset ?? null,
        transcript: evaluation?.transcript ?? null,
        studentName: keyed.draft.studentName ?? evaluation?.studentName ?? null,
        gaps: keyed.draft.gaps,
        draftScore: keyed.draft.draftScore,
        teacherNote: keyed.draft.teacherNote,
        costUsd: keyed.draft.costUsd ?? null,
        parentSentence: null,
        pageAssetIds: keyed.draft.pageAssetIds,
      });
      setPackItems(keyed.scored.items.map((item) => ({ ...item, confirmed: false })));
      setReviewOpen(true);
      setIntent('homework');
      setStatus('Confirm each item, file the student if needed, then Approve.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start keyed review');
    } finally {
      setAsking(false);
    }
  };

  const persistCapture = async (mode: 'draft' | 'approve', draftScore: number | null) => {
    if (!pages.length && !spokenName.trim() && !audioUri && !files.length) {
      setError('Add a photo, a file, a name, or a short note.');
      return;
    }
    if (mode === 'approve' && !canApproveKeygrade(chromeRole)) {
      setError('Teach seat required to Approve.');
      return;
    }
    if (mode === 'approve' && !studentId) {
      setError('File a student before Approve. Unassigned cannot publish.');
      return;
    }
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id, chromeClassId);
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

      const keyItems = selectedAssignment ? parseKeyItems(selectedAssignment.key_items) : [];
      const keyed =
        selectedAssignment && assignmentHasKey(selectedAssignment) && packItems.length
          ? buildKeyScoreDraft({
              keyItems,
              extract: packItems.map((item) => ({
                n: item.n,
                extracted: item.extracted,
                confidence: item.confidence,
                flag: item.flag,
              })),
              assignmentId: selectedAssignment.id,
              maxScore: selectedAssignment.max_score,
              teacherNote: evaluation?.teacherNote ?? null,
              studentName: evaluation?.studentName ?? null,
              gaps: evaluation?.gaps ?? [],
              pageAssetIds: photoAssets.map((asset) => asset.id),
              costUsd: evaluation?.costUsd ?? null,
            })
          : null;

      const draftToSave = keyed
        ? {
            ...keyed.draft,
            items: packItems,
            draftScore: draftScore ?? keyed.draft.draftScore,
            residuals: packItems.filter((item) => item.residual || item.awarded == null).length,
          }
        : photoAssets.length
          ? {
              gaps: (evaluation?.gaps ?? classified?.gaps ?? []).map((gap, index) => ({
                label: gap.label,
                sortOrder: 'sortOrder' in gap && typeof (gap as { sortOrder?: number }).sortOrder === 'number'
                  ? (gap as { sortOrder: number }).sortOrder
                  : index + 1,
              })),
              draftScore: evaluation?.draftScore ?? classified?.draftScore ?? null,
              teacherNote: evaluation?.teacherNote ?? classified?.note ?? null,
              studentName: evaluation?.studentName ?? classified?.studentGuessName ?? null,
              parentSentence: evaluation?.parentSentence ?? null,
              pageAssetIds: photoAssets.map((asset) => asset.id),
            }
          : evaluation;

      const first = await createCapture({
        classId: klass.id,
        kind: photo ? 'homework' : 'voice_note',
        inputSource: photo ? 'camera' : spokenName.trim() ? 'typed' : 'voice',
        photoAssetId: photo?.id ?? uploadedAssetId,
        audioAssetId: audio?.id,
        transcript: spokenName.trim() || null,
        assignmentId: selectedAssignment?.id ?? null,
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
        await saveCaptureEvaluation(first.id, draftToSave, studentId);
      }

      let targetCaptureId = first.id;
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
        if (index === 0) targetCaptureId = row.id;
      }

      let filedStudentId = studentId;
      if (filedStudentId) {
        await attachCapture(targetCaptureId, filedStudentId);
      } else if (!texts.length) {
        // keep Unassigned
      } else {
        const firstMatch = segments[0]?.match;
        if (firstMatch && shouldAutoAttach(firstMatch) && firstMatch.guessedStudentId) {
          filedStudentId = firstMatch.guessedStudentId;
        }
      }

      if (mode === 'approve') {
        if (!filedStudentId) throw new Error('File a student before Approve.');
        const { listStudentCaptures } = await import('@/lib/gaps/api');
        const studentCaps = await listStudentCaptures(filedStudentId);
        const latest = studentCaps.find((item) => item.id === targetCaptureId);
        const { requireSupabase } = await import('@/lib/supabase/client');
        const { data: captureRow } = await requireSupabase()
          .from('captures')
          .select('*')
          .eq('id', targetCaptureId)
          .single();
        if (!captureRow) throw new Error('Capture missing after save.');
        await approveCapture(latest ?? captureRow, latest?.gaps ?? [], draftScore, {
          scoreMark: 'numeric',
          gradeKind: 'homework',
          assignmentId: selectedAssignment?.id ?? null,
        });
        resetSlip();
        setStatus('Approved. Grade published.');
        router.replace(`/class/${klass.id}/student/${filedStudentId}`);
        return;
      }

      resetSlip();
      setStatus(preview.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save capture');
    } finally {
      setBusy(false);
    }
  };

  const saveHomeworkConfirm = async (mode: 'inbox' | 'approve' | 'note') => {
    if (mode === 'approve') {
      await persistCapture('approve', packItems.length ? null : evaluation?.draftScore ?? classified?.draftScore ?? null);
      return;
    }
    if (mode === 'note') {
      setBusy(true);
      setError(null);
      try {
        const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id, chromeClassId);
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
        const photo = photoAssets[0];
        if (!photo && !uploadedAssetId) throw new Error('Add a photo first.');
        const capture = await createCapture({
          classId: klass.id,
          kind: 'homework',
          inputSource: 'camera',
          photoAssetId: photo?.id ?? uploadedAssetId,
          transcript: spokenName.trim() || null,
        });
        if (studentId) await attachCapture(capture.id, studentId);
        await markNoteOnly(capture.id);
        resetSlip();
        setStatus('Saved as a note.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save note');
      } finally {
        setBusy(false);
      }
      return;
    }
    await persistCapture('draft', packItems.length ? null : evaluation?.draftScore ?? classified?.draftScore ?? null);
  };

  const savePortraitConfirm = async () => {
    const personId = portraitTarget === 'student' ? studentId : parentId;
    if (!personId) {
      setError('Pick a person for the portrait.');
      return;
    }
    const source = pages[0];
    if (!source && !uploadedAssetId) {
      setError('Add a photo first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (source) {
        await uploadProfilePhoto({
          teacherId: teacher.id,
          kind: portraitTarget,
          personId,
          uri: source.uri,
          mimeType: source.mimeType,
          imageUrl: null,
        });
      } else if (uploadedAssetId) {
        await setProfilePhoto(portraitTarget, personId, uploadedAssetId);
      }
      const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id, chromeClassId);
      resetSlip();
      setStatus('Portrait saved.');
      if (portraitTarget === 'student') {
        router.replace(`/class/${klass.id}/student/${personId}`);
      } else {
        router.replace(`/class/${klass.id}/parent/${personId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set photo');
    } finally {
      setBusy(false);
    }
  };

  const saveParentCardConfirm = async () => {
    if (!parentName.trim()) {
      setError('Add a parent name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const checked = fieldChecks.filter((field) => field.checked && field.key !== 'notes');
      const notes = fieldChecks.filter((field) => field.checked && field.key === 'notes').map((field) => field.value);
      const metadata: Record<string, string> = {};
      for (const field of checked) metadata[field.key] = field.value;
      if (notes.length) metadata.notes = notes.join('\n');
      let id = parentId;
      if (!id) {
        const created = await createParent({
          teacherId: teacher.id,
          displayName: parentName,
          createdVia: 'photo_card',
          metadata,
          studentId: studentId ?? undefined,
        });
        id = created.parent.id;
      } else {
        const existing = parents.find((row) => row.id === id);
        const merged = { ...(existing?.metadata ?? {}), ...metadata };
        if (notes.length && typeof existing?.metadata.notes === 'string' && existing.metadata.notes) {
          merged.notes = `${existing.metadata.notes}\n${notes.join('\n')}`;
        }
        await updateParentMetadata(id, merged);
        if (studentId) await linkChild(id, studentId);
      }
      const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id, chromeClassId);
      resetSlip();
      setStatus('Parent saved.');
      router.replace(`/class/${klass.id}/parent/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save parent');
    } finally {
      setBusy(false);
    }
  };

  const saveStudentCardConfirm = async () => {
    if (!studentId) {
      setError('Pick a student first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id, chromeClassId);
      const student = await getStudent(studentId);
      const checked = fieldChecks.filter((field) => field.checked);
      let metadata = { ...student.metadata };
      for (const field of checked) {
        if (field.key === 'notes' && typeof metadata.notes === 'string' && metadata.notes) {
          metadata = { ...metadata, notes: `${metadata.notes}\n${field.value}` };
        } else if (field.key === 'birthday') {
          const result = birthdayForSave(field.value);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          if (result.value) metadata = { ...metadata, birthday: result.value };
          else {
            const next = { ...metadata };
            delete next.birthday;
            metadata = next;
          }
        } else {
          metadata = { ...metadata, [field.key]: field.value };
        }
      }
      await updateStudentMetadata(student, metadata);
      const photoAssets =
        evaluation?.photoAssets?.length
          ? evaluation.photoAssets
          : pages.length
            ? await Promise.all(
                pages.map((page) =>
                  uploadTeacherAsset({
                    teacherId: teacher.id,
                    kind: 'photo',
                    uri: page.uri,
                    mimeType: page.mimeType,
                  }),
                ),
              )
            : [];
      const photoId = photoAssets[0]?.id ?? uploadedAssetId;
      if (photoId) {
        const capture = await createCapture({
          classId: klass.id,
          kind: 'homework',
          inputSource: 'camera',
          photoAssetId: photoId,
        });
        await attachCapture(capture.id, studentId);
        await markNoteOnly(capture.id);
      }
      resetSlip();
      setStatus('Student details saved.');
      router.replace(`/class/${klass.id}/student/${studentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save details');
    } finally {
      setBusy(false);
    }
  };

  const saveRosterConfirm = async () => {
    if (!chromeClassId) {
      router.replace('/?switch=1');
      return;
    }
    const selected = suggestions.filter((row) => row.selected && !row.alreadyHere && row.name.trim());
    setBusy(true);
    setError(null);
    try {
      if (selected.length) {
        if (office) {
          await addConfirmedStudents({
            classId: chromeClassId,
            teacherId: teacher.id,
            names: selected.map((row) => row.name),
            createdVia: 'photo_list',
          });
        } else {
          const available = await listAvailableStudents(chromeClassId);
          const missing: string[] = [];
          for (const row of selected) {
            const match = existingRosterMatch(
              row.name,
              available.map((student) => ({
                studentId: student.id,
                displayName: student.display_name,
                aliases: student.name_aliases,
              })),
            );
            if (match) await enrollExistingStudent(chromeClassId, match.studentId);
            else missing.push(row.name);
          }
          if (missing.length) {
            throw new Error(
              `Only the office may add a new student. Not on the school roster: ${missing.join(', ')}.`,
            );
          }
        }
        const pending = await listPendingRosterImports(chromeClassId);
        if (pending[0]) await markRosterImportConfirmed(pending[0].id);
      }
      resetSlip();
      setStatus('Roster updated.');
      router.replace(`/class/${chromeClassId}/setup`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add those students');
    } finally {
      setBusy(false);
    }
  };


  const saveSyllabusConfirm = async () => {
    if (!teacher) return;
    if (!chromeClassId) {
      setError('Name a class first — syllabus drafts need a class.');
      return;
    }
    const firstImage = pages.find((page) => page.mimeType.startsWith('image/')) ?? pages[0] ?? null;
    if (!firstImage && !evaluation?.photoAssets?.[0]) {
      setError('Add a syllabus photo first.');
      return;
    }
    setBusy(true);
    setError(null);
    setStatus('Reading syllabus photo…');
    try {
      let asset = evaluation?.photoAssets?.[0] ?? null;
      if (!asset && firstImage) {
        asset = await uploadTeacherAsset({
          teacherId: teacher.id,
          kind: 'photo',
          uri: firstImage.uri,
          mimeType: firstImage.mimeType,
        });
      }
      if (!asset) throw new Error('Add a syllabus photo first.');
      const imageUrl = await signedUrlForAsset('photo', asset.storage_path);
      if (!imageUrl) throw new Error('Could not open the uploaded photo.');
      const draft = await invokeAi<Record<string, unknown>>('parse-class-syllabus', {
        classId: chromeClassId,
        imageUrl,
        mimeType: firstImage?.mimeType ?? asset.mime_type ?? 'image/jpeg',
      });
      if (draft.error) throw new Error(String(draft.error));
      await upsertSyllabusAskDraft(
        chromeClassId,
        { ...draft, schema_version: 1, class_id: chromeClassId },
        asset.id,
      );
      resetSlip();
      setStatus('Ask draft ready — review before publish.');
      router.replace(`/class/${chromeClassId}/syllabus`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that syllabus photo');
    } finally {
      setBusy(false);
    }
  };

  const split = layout.isSplit || (layout.orientation === 'landscape' && layout.width >= 640);

  // Sticky CTA only — note field is composed separately so it can pin above the
  // keyboard with the bar on phones (Screen skips KAV/insets when sticky is set).
  const stickyCta = (() => {
    if (asking) {
      return <PrimaryButton label="Asking AI…" disabled onPress={() => undefined} />;
    }
    if (intent === 'homework') {
      if (reviewOpen && packItems.length) return undefined; // Pack B owns Approve
      return studentId ? (
        <PrimaryButton
          disabled={busy}
          label={busy ? 'Saving…' : 'Save to student'}
          onPress={() => void saveHomeworkConfirm('inbox')}
        />
      ) : (
        <PrimaryButton
          disabled={busy}
          label={busy ? 'Saving…' : 'Save to Inbox'}
          onPress={() => void saveHomeworkConfirm('inbox')}
        />
      );
    }
    if (intent === 'portrait') {
      return (
        <PrimaryButton
          disabled={busy || (portraitTarget === 'student' ? !studentId : !parentId)}
          label={busy ? 'Saving…' : 'Use as profile'}
          onPress={() => void savePortraitConfirm()}
        />
      );
    }
    if (intent === 'parent_card') {
      return (
        <PrimaryButton
          disabled={busy || !parentName.trim()}
          label={busy ? 'Saving…' : 'Save parent'}
          onPress={() => void saveParentCardConfirm()}
        />
      );
    }
    if (intent === 'student_card') {
      return (
        <PrimaryButton
          disabled={busy || !studentId}
          label={busy ? 'Saving…' : 'Save details'}
          onPress={() => void saveStudentCardConfirm()}
        />
      );
    }
    if (intent === 'syllabus') {
      if (!chromeClassId) {
        return <PrimaryButton label="Name a class" onPress={() => router.replace('/?switch=1')} />;
      }
      return (
        <PrimaryButton
          disabled={busy || (!pages.length && !evaluation?.photoAssets?.length)}
          label={busy ? 'Reading…' : 'Parse syllabus for this class'}
          onPress={() => void saveSyllabusConfirm()}
        />
      );
    }
    if (intent === 'roster' && chromeClassId) {
      return (
        <PrimaryButton
          disabled={busy}
          label={
            busy
              ? 'Saving…'
              : office
                ? `Add ${suggestions.filter((row) => row.selected && !row.alreadyHere).length} students`
                : 'Enroll matching names'
          }
          onPress={() => void saveRosterConfirm()}
        />
      );
    }
    if (hasContent && !micLive) {
      return (
        <PrimaryButton
          label="Ask AI to process"
          disabled={asking || busy}
          onPress={() => void onAskAi()}
        />
      );
    }
    return undefined;
  })();

  const noteRow = (
    <View style={styles.textRow}>
      <View style={styles.textFlex}>
        <TextField
          multiline
          placeholder="What is this? Name, note, or say it"
          value={spokenName}
          onChangeText={(value) => {
            setSpokenName(value);
            if (intent) clearClassify();
          }}
        />
      </View>
      <IconButton
        name="mic"
        size="lg"
        tone={micLive ? 'danger' : 'wash'}
        live={micLive}
        label={micLive ? 'Stop listening' : 'Dictate into the field'}
        onPress={() => void (micLive ? stopRecording() : startRecording())}
      />
    </View>
  );

  // Phone: pin note+mic in the sticky bar so Screen's keyboardHeight lift keeps
  // them above the soft keyboard (body scroll fields stay buried otherwise).
  // Split: note stays in the scroller — Screen has no sticky, so KAV/insets apply.
  const sticky = (
    <View style={styles.stickyStack}>
      {noteRow}
      {stickyCta}
    </View>
  );

  const webDropProps =
    Platform.OS === 'web'
      ? ({
          onDragEnter: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
            event.preventDefault?.();
            event.stopPropagation?.();
            setDropHover(true);
          },
          onDragOver: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
            event.preventDefault?.();
            event.stopPropagation?.();
            setDropHover(true);
          },
          onDragLeave: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
            event.preventDefault?.();
            event.stopPropagation?.();
            setDropHover(false);
          },
          onDrop: (event: {
            preventDefault?: () => void;
            stopPropagation?: () => void;
            dataTransfer?: { files?: FileList };
            nativeEvent?: { dataTransfer?: { files?: FileList } };
          }) => {
            event.preventDefault?.();
            event.stopPropagation?.();
            setDropHover(false);
            const list = event.dataTransfer?.files ?? event.nativeEvent?.dataTransfer?.files;
            void ingestDroppedFiles(list);
          },
        } as Record<string, unknown>)
      : {};

  const previewBlock = (
    <View style={styles.block}>
      {!cameraOpen ? (
        <View
          style={[
            styles.dropWell,
            dropHover && { borderColor: colors.brand, backgroundColor: colors.brandSoft },
          ]}
          {...webDropProps}
        >
          <PhotoPager
            empty={pages.length === 0}
            pages={pages}
            hero
            fill={split}
            onRemove={(key) => {
              setPages((current) => current.filter((item) => item.key !== key));
              setEvaluation(null);
              setPackItems([]);
              setReviewOpen(false);
              clearClassify();
            }}
          />
          {Platform.OS === 'web' && pages.length === 0 ? (
            <Text style={[type.meta, styles.dropHint, { color: colors.mute }]}>
              Drop photos, videos, or files here
            </Text>
          ) : null}
        </View>
      ) : null}
      {files.length ? (
        <View style={styles.gaps}>
          {files.map((file) => (
            <Chip
              key={file.key}
              label={file.name}
              onPress={() => {
                setFiles((current) => current.filter((item) => item.key !== file.key));
                clearClassify();
              }}
            />
          ))}
        </View>
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
          <View style={styles.mediaHits}>
            <IconButton name="capture" size="lg" tone="brand" label="Camera" onPress={() => void pickCamera()} />
            <IconButton name="photo" size="lg" tone="wash" label="Photo or Video" onPress={() => void pickLibrary()} />
            <IconButton name="file" size="lg" tone="wash" label="Files" onPress={() => void pickFiles()} />
          </View>
        </>
      )}
    </View>
  );

  const composerBlock = (
    <View style={styles.block}>
      {split ? noteRow : null}
      {preview.hint ? <Text style={[type.meta, { color: colors.mute }]}>{preview.hint}</Text> : null}

      {keyedAssignments.length ? (
        <Card>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
            Keyed assignment
          </Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            Pack B: confirm extracts on this phone, then Approve this capture.
          </Text>
          <View style={styles.gaps}>
            {keyedAssignments.slice(0, 8).map((row) => (
              <Chip
                key={row.id}
                label={row.title}
                selected={assignmentId === row.id}
                onPress={() => {
                  setAssignmentId(row.id);
                  setPackItems([]);
                  setReviewOpen(false);
                }}
              />
            ))}
          </View>
          {selectedAssignment && pages.length ? (
            <GhostButton
              label={asking ? 'Extracting…' : 'Review & score against key'}
              disabled={asking || busy || micLive}
              onPress={() => void openPackBReview()}
            />
          ) : null}
        </Card>
      ) : null}

      {intent ? (
        <Card>
          <Text style={[type.section, { color: colors.ink }]}>{INTENT_COPY[intent]}</Text>
          {classified?.note ? (
            <Text style={[type.meta, { color: colors.mute }]} numberOfLines={3}>
              {classified.note}
            </Text>
          ) : null}

          {intent === 'unsure' ? (
            <View style={styles.gaps}>
              {(
                [
                  ['homework', 'Grade'],
                  ['syllabus', 'Syllabus'],
                  ['roster', 'Roster'],
                  ['portrait', 'Portrait'],
                  ['parent_card', 'Parent card'],
                  ['student_card', 'Student card'],
                ] as const
              ).map(([key, label]) => (
                <SecondaryButton key={key} label={label} onPress={() => setIntent(key)} />
              ))}
            </View>
          ) : null}

          {intent === 'homework' ? (
            <>
              <Text style={[type.meta, { color: colors.mute }]}>
                {studentId
                  ? `Suggested student: ${roster.find((row) => row.id === studentId)?.display_name ?? 'Selected'}. Tap another to change.`
                  : classified?.studentGuessName
                    ? `Read on the page: ${classified.studentGuessName}. Pick the student — we will not invent one.`
                    : 'No name was clear. Unknown waits in Inbox.'}
              </Text>
              <View style={styles.gaps}>
                {roster.slice(0, 12).map((student) => (
                  <Chip
                    key={student.id}
                    label={student.display_name.split(/\s+/)[0] ?? student.display_name}
                    selected={studentId === student.id}
                    onPress={() => setStudentId(student.id === studentId ? null : student.id)}
                  />
                ))}
                <Chip label="Unknown" selected={studentId == null} onPress={() => setStudentId(null)} />
              </View>
              <GhostButton
                label="Save as note"
                disabled={busy}
                onPress={() => void saveHomeworkConfirm('note')}
              />
            </>
          ) : null}

          {intent === 'syllabus' ? (
            <>
              {!chromeClassId ? (
                <Text style={[type.meta, { color: colors.mute }]}>
                  Pick a class first. We will parse this into a syllabus draft for that class — nothing publishes until you review.
                </Text>
              ) : (
                <Text style={[type.meta, { color: colors.mute }]}>
                  Parses grading policy / category weights for this class. Opens the Syllabus screen to review — no auto-publish.
                </Text>
              )}
            </>
          ) : null}

          {intent === 'portrait' ? (
            <>
              <View style={styles.gaps}>
                <Chip
                  label="Student"
                  selected={portraitTarget === 'student'}
                  onPress={() => setPortraitTarget('student')}
                />
                <Chip
                  label="Parent"
                  selected={portraitTarget === 'parent'}
                  onPress={() => setPortraitTarget('parent')}
                />
              </View>
              {(portraitTarget === 'student' ? roster : parents).map((person) => (
                <ListRow
                  key={person.id}
                  title={person.display_name}
                  photoUrl={'photoUrl' in person ? person.photoUrl : null}
                  chevron={false}
                  selected={portraitTarget === 'student' ? person.id === studentId : person.id === parentId}
                  onPress={() => {
                    if (portraitTarget === 'student') setStudentId(person.id);
                    else setParentId(person.id);
                  }}
                />
              ))}
            </>
          ) : null}

          {intent === 'parent_card' ? (
            <>
              <TextField label="Parent name" value={parentName} onChangeText={setParentName} />
              {fieldChecks.map((field, index) => (
                <ListRow
                  key={`${field.key}-${index}`}
                  title={field.label}
                  status={field.value}
                  chevron={false}
                  selected={field.checked}
                  onPress={() =>
                    setFieldChecks((current) =>
                      current.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item)),
                    )
                  }
                />
              ))}
              <Text style={[type.meta, { color: colors.mute }]}>Link a child (optional)</Text>
              {roster.map((student) => (
                <ListRow
                  key={student.id}
                  title={student.display_name}
                  photoUrl={student.photoUrl}
                  chevron={false}
                  selected={student.id === studentId}
                  onPress={() => setStudentId(student.id)}
                />
              ))}
            </>
          ) : null}

          {intent === 'student_card' ? (
            <>
              <Text style={[type.meta, { color: colors.mute }]}>
                Confirm every field. We will not invent a student.
              </Text>
              {roster.map((student) => (
                <ListRow
                  key={student.id}
                  title={student.display_name}
                  photoUrl={student.photoUrl}
                  chevron={false}
                  selected={student.id === studentId}
                  onPress={() => setStudentId(student.id)}
                />
              ))}
              {fieldChecks.map((field, index) => (
                <ListRow
                  key={`${field.key}-${index}`}
                  title={field.label}
                  status={field.value}
                  chevron={false}
                  selected={field.checked}
                  onPress={() =>
                    setFieldChecks((current) =>
                      current.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item)),
                    )
                  }
                />
              ))}
            </>
          ) : null}

          {intent === 'roster' ? (
            <>
              {!chromeClassId ? (
                <PrimaryButton label="Name a class" onPress={() => router.replace('/?switch=1')} />
              ) : (
                suggestions.map((row) => (
                  <ListRow
                    key={row.key}
                    title={row.alreadyHere ? `${row.name} · already here` : row.name}
                    chevron={false}
                    selected={row.selected && !row.alreadyHere}
                    onPress={() =>
                      setSuggestions((current) =>
                        current.map((item) =>
                          item.key === row.key ? { ...item, selected: !item.selected } : item,
                        ),
                      )
                    }
                  />
                ))
              )}
            </>
          ) : null}

          <GhostButton
            align="left"
            label="Clear AI result"
            onPress={() => {
              clearClassify();
              setReviewOpen(false);
            }}
          />
        </Card>
      ) : null}

      {reviewOpen && packItems.length ? (
        <KeygradePackBReview
          chromeRole={chromeRole}
          items={packItems}
          assignmentTitle={selectedAssignment?.title}
          maxScore={selectedAssignment?.max_score}
          studentId={studentId}
          twinCandidates={twinCandidates}
          roster={roster.map((row) => ({ id: row.id, displayName: row.display_name }))}
          busy={busy}
          onChangeItems={setPackItems}
          onSelectStudent={setStudentId}
          onApprove={(score) => void persistCapture('approve', score)}
          onSaveDraft={(score) => void persistCapture('draft', score)}
        />
      ) : null}

      {evaluation?.gaps.length && !reviewOpen && intent === 'homework' ? (
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
          {evaluation.teacherNote ? (
            <Text style={[type.meta, { color: colors.mute }]}>{evaluation.teacherNote}</Text>
          ) : null}
        </Card>
      ) : null}

      {asking ? <WorkingLine text="Asking AI…" /> : null}
      {status ? <Text style={[styles.status, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {split && stickyCta ? stickyCta : null}
    </View>
  );

  if (split) {
    return (
      <View style={[styles.split, { backgroundColor: colors.bg }]}>
        <View style={styles.left}>{previewBlock}</View>
        <View style={styles.right}>
          <Screen scroll maxWidth={480}>
            {composerBlock}
          </Screen>
        </View>
      </View>
    );
  }

  return (
    <Screen keyboard sticky={sticky}>
      {previewBlock}
      {composerBlock}
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
  mediaHits: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginVertical: 4,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  textFlex: {
    flex: 1,
    minWidth: 0,
  },
  stickyStack: {
    gap: 8,
  },
  dropWell: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  dropHint: {
    textAlign: 'center',
    paddingBottom: 8,
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
