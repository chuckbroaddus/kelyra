import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Text } from 'react-native';

import {
  AssignmentForm,
  dueAtFromDate,
  emptyAssignmentForm,
  lessonFieldsFromForm,
  plannedAssignmentInput,
  type AssignmentFormValue,
  type SyllabusCategoryOption,
} from '@/components/ui/AssignmentForm';
import { categoryOptionsForAssign, getClassSyllabus } from '@/lib/syllabus/api';
import { GhostButton } from '@/components/ui/Button';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { Screen } from '@/components/ui/Screen';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { type } from '@/constants/theme';
import { invokeAi } from '@/lib/ai/invoke';
import { createAssignment, getAssignment, listClassAssignments, updateAssignment } from '@/lib/assignments/api';
import { groupingLabels } from '@/lib/assignments/tree';
import { deriveKeyKind, parseKeyItems, type AnswerKeyItem } from '@/lib/assignments/keys';
import { takeAssignmentFormSeed } from '@/lib/assignments/session';
import { appendAskMessage, startAskThread } from '@/lib/ai/askHistory';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { assignLesson, listLessonPacks, updateLessonAssignment } from '@/lib/lessons/api';
import { useAssignmentHeaderChrome } from '@/lib/lessons/chrome';
import { parseGradeTerm } from '@/lib/grade/marks';
import { packKey, parsePackKey } from '@/lib/lessons/protocol';
import { followUpTitle, getFollowUpDraft, setFollowUpDraft } from '@/lib/practice/followUp';
import {
  assignmentIsFollowUp,
  assignFollowUpToStudent,
  buildFollowUpPack,
  createFollowUpAssignment,
  saveFollowUpAssignment,
} from '@/lib/practice/followUpApi';
import { getStudent } from '@/lib/students/api';
import type { LessonPackRow } from '@/lib/supabase/types';
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
  const { id, assignmentId, student: studentParam } = useLocalSearchParams<{
    id: string;
    assignmentId: string;
    student?: string;
  }>();
  const creating = assignmentId === 'new';
  const lockedStudentId = typeof studentParam === 'string' ? studentParam : null;
  useAssignmentHeaderChrome();
  const [seed] = useState(() => takeAssignmentFormSeed());
  const [followUp] = useState(() => getFollowUpDraft());
  const isFollowUp = Boolean(followUp && lockedStudentId && followUp.studentId === lockedStudentId);
  const [value, setValue] = useState<AssignmentFormValue>(() => {
    const next = emptyAssignmentForm(seed ?? undefined);
    if (followUp && lockedStudentId && followUp.studentId === lockedStudentId) {
      next.workKind = 'lesson';
      next.title = followUpTitle(followUp.skillLabel, followUp.sourceTitle);
      next.category = 'homework';
    }
    return next;
  });
  const [packs, setPacks] = useState<LessonPackRow[]>([]);
  const [studentLockedName, setStudentLockedName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keyBusy, setKeyBusy] = useState(false);
  const [ready, setReady] = useState(creating && !isFollowUp);
  const [building, setBuilding] = useState(false);
  const [followUpRow, setFollowUpRow] = useState(false);
  const buildOnce = useRef(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([]);
  const [sectionSuggestions, setSectionSuggestions] = useState<string[]>([]);
  const [syllabusCategories, setSyllabusCategories] = useState<SyllabusCategoryOption[] | null>(null);

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
        const follow = assignmentIsFollowUp(row);
        setFollowUpRow(follow);
        setValue({
          workKind: row.kind === 'lesson' ? 'lesson' : 'planned',
          packKey: row.deck_id && row.lesson_version ? packKey(row.deck_id, row.lesson_version) : '',
          title: row.title,
          category: (row.category as AssignmentFormValue['category']) ?? 'homework',
          dueDate: row.due_at ? row.due_at.slice(0, 10) : '',
          weightBand: (row.weight_band as AssignmentFormValue['weightBand']) ?? 'none',
          weightPercent: row.weight_percent != null ? String(row.weight_percent) : '',
          term: parseGradeTerm(row.term),
          scoreScheme: (row.score_scheme as AssignmentFormValue['scoreScheme']) ?? 'numeric',
          includeInAverage: row.include_in_average !== false,
          isMakeup: row.is_makeup === true,
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
          helpMode: (row.help_mode as AssignmentFormValue['helpMode']) ?? 'off',
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
    void getClassSyllabus(id)
      .then((bundle) => {
        if (bundle.syllabus?.status === 'published') {
          const options = categoryOptionsForAssign(bundle.categories);
          setSyllabusCategories(options);
          if (creating) {
            setValue((current) => {
              const match = options.find((row) => row.key === current.category) ?? options[0];
              if (!match) return current;
              return {
                ...current,
                category: match.key,
                includeInAverage:
                  current.workKind === 'lesson'
                    ? false
                    : match.default_include_in_average === true,
              };
            });
          }
        } else {
          setSyllabusCategories(null);
        }
      })
      .catch(() => setSyllabusCategories(null));
  }, [id, creating]);

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

  useEffect(() => {
    void listLessonPacks()
      .then(setPacks)
      .catch(() => setPacks([]));
  }, []);

  useEffect(() => {
    if (!creating || !isFollowUp || !followUp || !id || buildOnce.current) return;
    buildOnce.current = true;
    let live = true;
    setBuilding(true);
    setStatus(null);
    void buildFollowUpPack(followUp)
      .then(async (pack) => {
        if (!live) return;
        const row = await createFollowUpAssignment(followUp, pack, {
          title: value.title,
          dueAt: dueAtFromDate(value.dueDate),
          category: value.category,
        });
        setFollowUpDraft({ ...followUp, assignmentId: row.id });
        setValue((current) => ({ ...current, packKey: packKey(pack.deckId, pack.version), title: current.title || pack.title }));
        router.replace(`/class/${id}/assignment/${row.id}?student=${followUp.studentId}` as never);
      })
      .catch((err) => {
        if (live) {
          setStatus(err instanceof Error ? err.message : 'Could not build the practice page');
          setReady(true);
        }
      })
      .finally(() => {
        if (live) setBuilding(false);
      });
    return () => {
      live = false;
    };
  }, [creating, followUp, id, isFollowUp]);

  useEffect(() => {
    if (!lockedStudentId) return;
    void getStudent(lockedStudentId)
      .then((student) => setStudentLockedName(student.display_name))
      .catch(() => setStudentLockedName('this student'));
  }, [lockedStudentId]);

  usePushedTitle(creating ? 'Assign' : value.title.trim() || 'Assign');

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

  const afterSave = () => {
    if (lockedStudentId) {
      router.replace(`/class/${id}/student/${lockedStudentId}?tab=work` as never);
      return;
    }
    router.replace(`/class/${id}/assignments`);
  };

  const followUpMode = isFollowUp || followUpRow;

  const onAskAdjust = async () => {
    if (!id || !assignmentId || assignmentId === 'new') return;
    const draft = getFollowUpDraft();
    const questions = (draft?.items ?? []).map((item, index) => `${index + 1}. ${item.prompt}`).join('\n');
    setBusy(true);
    setStatus(null);
    try {
      await startAskThread();
      await appendAskMessage(
        'user',
        `Revise this follow-up practice page before I assign it.\nTitle: ${value.title}\nAssignment id: ${assignmentId}\nClass id: ${id}\nQuestions (keep them as one assignment):\n${questions || '(see the hosted page)'}\nRebuild the page when I tell you what to change.`,
      );
      const ret = `/class/${id}/assignment/${assignmentId}${lockedStudentId ? `?student=${lockedStudentId}` : ''}`;
      router.push(`/ask?return=${encodeURIComponent(ret)}` as never);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not open Ask');
    } finally {
      setBusy(false);
    }
  };

  const onRebuild = async () => {
    const draft = getFollowUpDraft();
    if (!draft || !id) return;
    setBuilding(true);
    setStatus(null);
    try {
      const pack = await buildFollowUpPack({ ...draft, assignmentId: assignmentId === 'new' ? undefined : assignmentId });
      setValue((current) => ({ ...current, packKey: packKey(pack.deckId, pack.version) }));
      setStatus('Rebuilt the page. Preview it before you assign.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not rebuild the page');
    } finally {
      setBuilding(false);
    }
  };

  const save = async () => {
    if (!id) return;
    setBusy(true);
    setStatus(null);
    try {
      if (followUpMode && assignmentId && assignmentId !== 'new') {
        const pack = parsePackKey(value.packKey);
        if (!pack) throw new Error('The practice page is not ready yet.');
        await saveFollowUpAssignment(assignmentId, id, pack, {
          title: value.title,
          ...lessonFieldsFromForm(value),
        });
        if (lockedStudentId) await assignFollowUpToStudent(assignmentId, lockedStudentId);
        setFollowUpDraft(null);
        afterSave();
        return;
      }
      if (value.workKind === 'lesson') {
        const pack = parsePackKey(value.packKey);
        if (!pack) throw new Error('Pick a lesson.');
        const fields = lessonFieldsFromForm(value);
        if (creating) {
          await assignLesson({
            classIds: [id],
            title: value.title,
            pack,
            studentId: lockedStudentId,
            ...fields,
          });
        } else if (assignmentId) {
          await updateLessonAssignment(assignmentId, {
            classId: id,
            title: value.title,
            pack,
            ...fields,
          });
        }
        afterSave();
        return;
      }
      const payload = plannedAssignmentInput(id, value, creating ? lockedStudentId : null);
      const row = creating ? await createAssignment(payload) : await updateAssignment(assignmentId!, payload);
      if (seed?.returnTo === 'proposal') {
        const draft = getProposalDraft();
        if (draft) setProposalDraft({ ...draft, assignmentId: row.id });
        router.replace('/proposal');
        return;
      }
      afterSave();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not assign');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen keyboard>
      <Text style={[type.meta, { color: colors.mute }]}>
        {followUpMode
          ? 'All of those questions are one assignment. Preview the page, or Ask if it is not right, then assign.'
          : seed?.returnTo === 'proposal'
            ? 'Save and you’ll go back to the capture you were filing.'
            : creating
              ? 'Assign a lesson or practice. This does not create a class.'
              : 'This column shows in the grade book even before anyone turns it in.'}
      </Text>
      {followUpMode && (getFollowUpDraft()?.items.length ?? 0) > 0 ? (
        <>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
            {getFollowUpDraft()!.items.length} questions · one assignment
          </Text>
          {getFollowUpDraft()!.items.map((item, index) => (
            <Text key={item.id} style={[type.body, { color: colors.ink }]}>
              {index + 1}. {item.prompt}
            </Text>
          ))}
        </>
      ) : null}
      {building ? <WorkingLine text="Building the practice page…" /> : null}
      {!creating && value.workKind === 'lesson' && assignmentId ? (
        <GhostButton
          align="left"
          label="Preview page"
          onPress={() => router.push(`/lesson/${assignmentId}?preview=1` as never)}
        />
      ) : null}
      {followUpMode && !creating && assignmentId ? (
        <>
          <GhostButton align="left" label="Not right? Ask" onPress={() => void onAskAdjust()} />
          {getFollowUpDraft()?.items.length ? (
            <GhostButton align="left" label="Rebuild page" onPress={() => void onRebuild()} />
          ) : null}
        </>
      ) : null}
      {!ready && !building ? <WorkingLine /> : null}
      {ready ? (
        <AssignmentForm
          value={value}
          onChange={setValue}
          busy={busy || building}
          keyBusy={keyBusy}
          keyStatus={keyStatus}
          submitLabel={followUpMode ? 'Assign to student' : creating ? 'Assign' : 'Save'}
          onSubmit={() => void save()}
          onCancel={() => router.back()}
          onPickKeyPhoto={() => setPhotoOpen(true)}
          onClearKeyPhoto={onClearKeyPhoto}
          unitSuggestions={unitSuggestions}
          sectionSuggestions={sectionSuggestions}
          packs={packs}
          classLocked
          studentLockedName={studentLockedName}
          lockWorkKind={!creating || followUpMode}
          hidePackPicker={followUpMode}
          syllabusCategories={syllabusCategories}
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
