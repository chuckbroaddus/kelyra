import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Text } from 'react-native';

import { AssignmentForm, dueAtFromDate, emptyAssignmentForm, type AssignmentFormValue } from '@/components/ui/AssignmentForm';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { Screen } from '@/components/ui/Screen';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { type } from '@/constants/theme';
import { invokeAi } from '@/lib/ai/invoke';
import { createAssignment, getAssignment, listClassAssignments, updateAssignment } from '@/lib/assignments/api';
import { groupingLabels } from '@/lib/assignments/tree';
import { deriveKeyKind, keyMaxScore, parseKeyItems, type AnswerKeyItem } from '@/lib/assignments/keys';
import { takeAssignmentFormSeed } from '@/lib/assignments/session';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { pickNormalizedPhoto, waitForModalDismiss, webCameraNeeded } from '@/lib/media/pickPhoto';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';
import { signedProfileUrlForAssetId } from '@/lib/people/photos';
import { getProposalDraft, setProposalDraft } from '@/lib/proposal/session';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { WorkingLine } from '@/components/ui/WorkingMark';

type KeyAnalysis = {
  pageState?: 'blank' | 'filled' | 'unsure';
  header?: string | null;
  items?: AnswerKeyItem[];
  maxScore?: number | null;
  teacherNote?: string | null;
  phash?: string | null;
  layout?: number[] | null;
};

export default function AssignmentEditScreen() {
  const { colors } = useTheme();
  const { teacher } = useAuth();
  const router = useRouter();
  const { id, assignmentId } = useLocalSearchParams<{ id: string; assignmentId: string }>();
  const creating = assignmentId === 'new';
  const [seed] = useState(() => takeAssignmentFormSeed());
  const [value, setValue] = useState<AssignmentFormValue>(() => emptyAssignmentForm(seed ?? undefined));
  const [status, setStatus] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keyBusy, setKeyBusy] = useState(false);
  const [ready, setReady] = useState(creating);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([]);
  const [sectionSuggestions, setSectionSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (creating || !assignmentId) return;
    void getAssignment(assignmentId)
      .then(async (row) => {
        if (!row) {
          setStatus('That assignment is gone.');
          setReady(true);
          return;
        }
        const keyPhotoUrl = await signedProfileUrlForAssetId(row.key_asset_id);
        const items = parseKeyItems(row.key_items);
        setValue({
          title: row.title,
          category: (row.category as AssignmentFormValue['category']) ?? 'homework',
          dueDate: row.due_at ? row.due_at.slice(0, 10) : '',
          weightBand: (row.weight_band as AssignmentFormValue['weightBand']) ?? 'none',
          weightPercent: row.weight_percent != null ? String(row.weight_percent) : '',
          term: (row.term as AssignmentFormValue['term']) ?? 'none',
          scoreScheme: (row.score_scheme as AssignmentFormValue['scoreScheme']) ?? 'numeric',
          keyKind: row.key_kind ?? deriveKeyKind(Boolean(row.key_asset_id), items),
          keyNotes: row.key_notes ?? '',
          keyPassAt: row.key_pass_at != null ? String(row.key_pass_at) : '',
          keyItems: items,
          keyAssetId: row.key_asset_id ?? null,
          keyPhotoUrl,
          keyPhash: row.key_phash ?? null,
          keyLayout: Array.isArray(row.key_layout) ? row.key_layout : null,
          keyHeader: row.key_header ?? null,
          keyPageState: null,
          unit: row.unit ?? '',
          section: row.section ?? '',
        });
        setReady(true);
      })
      .catch((err) => {
        setStatus(err instanceof Error ? err.message : 'Could not open assignment');
        setReady(true);
      });
  }, [assignmentId, creating]);

  useEffect(() => {
    if (!id) return;
    void listClassAssignments(id)
      .then((rows) => {
        const labels = groupingLabels(rows);
        setUnitSuggestions(labels.units);
        setSectionSuggestions(labels.sections);
      })
      .catch(() => {
        setUnitSuggestions([]);
        setSectionSuggestions([]);
      });
  }, [id]);

  usePushedTitle(creating ? 'New Assignment' : value.title.trim() || 'Edit Assignment');

  const applyKeyPhoto = async (uri: string, mimeType: string) => {
    if (!teacher) return;
    setKeyBusy(true);
    setKeyStatus(null);
    setStatus(null);
    try {
      const uploaded = await uploadTeacherAsset({
        teacherId: teacher.id,
        kind: 'photo',
        uri,
        mimeType,
      });
      const url = await signedUrlForAsset('photo', uploaded.storage_path);
      let analysis: KeyAnalysis = {};
      if (url) {
        analysis = await invokeAi<KeyAnalysis>('analyze-answer-key', { imageUrl: url });
      }
      const items = parseKeyItems(analysis.items);
      const previous = value.keyAssetId;
      setValue((current) => ({
        ...current,
        keyKind: deriveKeyKind(true, items.length ? items : current.keyItems),
        keyItems: items.length ? items : current.keyItems,
        keyAssetId: uploaded.id,
        keyPhotoUrl: url,
        keyPhash: analysis.phash ?? null,
        keyLayout: analysis.layout ?? null,
        keyHeader: analysis.header ?? current.keyHeader,
        keyPageState: analysis.pageState ?? 'unsure',
        keyNotes: current.keyNotes || analysis.teacherNote || '',
      }));
      if (analysis.pageState === 'blank') setKeyStatus('Proposed answers — check each one, then save.');
      else if (analysis.pageState === 'filled') setKeyStatus('Read the written answers. Edit anything that’s off.');
      else setKeyStatus('Could not tell if this was blank. Add answers if you want a scored key.');
      if (previous && previous !== uploaded.id) {
        try {
          const { requireSupabase } = await import('@/lib/supabase/client');
          await requireSupabase().rpc('teacher_unref_asset', { p_asset_id: previous });
        } catch {
          // Keep the new key photo even if we cannot drop the old one.
        }
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not read that key photo');
    } finally {
      setKeyBusy(false);
    }
  };

  const onPickKeyPhoto = async (fromCamera: boolean) => {
    setPhotoOpen(false);
    if (webCameraNeeded(fromCamera)) {
      setCameraOpen(true);
      return;
    }
    try {
      await waitForModalDismiss();
      const photo = await pickNormalizedPhoto(fromCamera);
      if (photo) await applyKeyPhoto(photo.uri, photo.mimeType);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not open the camera');
    }
  };

  const onClearKeyPhoto = () => {
    setValue((current) => ({
      ...current,
      keyAssetId: null,
      keyPhotoUrl: null,
      keyPhash: null,
      keyLayout: null,
      keyHeader: current.keyItems.length ? current.keyHeader : null,
      keyKind: current.keyItems.length ? 'items' : 'none',
      keyPageState: null,
    }));
    setKeyStatus(null);
  };

  const save = async () => {
    if (!id) return;
    setBusy(true);
    setStatus(null);
    try {
      const items = value.keyItems;
      const payload = {
        classId: id,
        title: value.title,
        category: value.category,
        dueAt: dueAtFromDate(value.dueDate),
        weightBand: value.weightBand,
        weightPercent: value.weightPercent.trim() ? Number(value.weightPercent) : null,
        term: value.term,
        scoreScheme: value.scoreScheme,
        includeInAverage: value.scoreScheme !== 'pass_fail',
        maxScore: keyMaxScore(items),
        keyKind: deriveKeyKind(Boolean(value.keyAssetId), items),
        keyNotes: value.keyNotes,
        keyPassAt: value.keyPassAt.trim() ? Number(value.keyPassAt) : null,
        keyItems: items,
        keyAssetId: value.keyAssetId,
        keyPhash: value.keyPhash,
        keyLayout: value.keyLayout,
        keyHeader: value.keyHeader,
        unit: value.unit,
        section: value.section,
      };
      const row = creating ? await createAssignment(payload) : await updateAssignment(assignmentId!, payload);
      if (seed?.returnTo === 'proposal') {
        const draft = getProposalDraft();
        if (draft) setProposalDraft({ ...draft, assignmentId: row.id });
        router.replace('/proposal');
        return;
      }
      router.replace(`/class/${id}/assignments`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save assignment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen keyboard>
      <Text style={[type.meta, { color: colors.mute }]}>
        {seed?.returnTo === 'proposal'
          ? 'Save and you’ll go back to the capture you were filing.'
          : 'This column shows in the grade book even before anyone turns it in.'}
      </Text>
      {!ready ? <WorkingLine /> : null}
      {ready ? (
        <AssignmentForm
          value={value}
          onChange={setValue}
          busy={busy}
          keyBusy={keyBusy}
          keyStatus={keyStatus}
          submitLabel={creating ? 'Create assignment' : 'Save assignment'}
          onSubmit={() => void save()}
          onCancel={() => router.back()}
          onPickKeyPhoto={() => setPhotoOpen(true)}
          onClearKeyPhoto={onClearKeyPhoto}
          unitSuggestions={unitSuggestions}
          sectionSuggestions={sectionSuggestions}
        />
      ) : null}
      {status ? <Text style={[type.body, { color: colors.danger }]}>{status}</Text> : null}
      <PhotoSheet
        visible={photoOpen}
        hasPhoto={Boolean(value.keyAssetId)}
        onTake={() => void onPickKeyPhoto(true)}
        onLibrary={() => void onPickKeyPhoto(false)}
        onRemove={onClearKeyPhoto}
        onCancel={() => setPhotoOpen(false)}
      />
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <WebCameraCapture
          onCapture={(uri, mime) => {
            setCameraOpen(false);
            void applyKeyPhoto(uri, mime);
          }}
          onCancel={() => setCameraOpen(false)}
        />
      </Modal>
    </Screen>
  );
}
