import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { AvatarTray } from '@/components/ui/AvatarTray';
import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow } from '@/components/ui/ListRow';
import { PhotoPager } from '@/components/ui/PhotoPager';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { invokeAi } from '@/lib/ai/invoke';
import { formatUsd } from '@/lib/ai/policy';
import { useAuth } from '@/lib/auth/AuthProvider';
import { attachCapture, createCapture, saveCaptureEvaluation } from '@/lib/captures/api';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { approveCapture, markNoteOnly } from '@/lib/gaps/api';
import {
  matchSpokenStudent,
  resolveSpokenCapture,
  transcribeAudioDirect,
} from '@/lib/matching/captureSpeech';
import { assignmentHasKey, listClassAssignments, matchSpokenAssignment } from '@/lib/assignments/api';
import { parseKeyItems } from '@/lib/assignments/keys';
import { AssignmentPicker } from '@/components/ui/AssignmentPicker';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { setAssignmentFormSeed } from '@/lib/assignments/session';
import { GRADE_KINDS, formatScoreMark, type GradeKind, type ScoreMark } from '@/lib/grade/marks';
import { matchPaperName } from '@/lib/matching/matchName';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';
import { requireSupabase } from '@/lib/supabase/client';
import { getProposalDraft, setProposalDraft } from '@/lib/proposal/session';
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
import { existingRosterMatch } from '@/lib/matching/spokenName';
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
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { WorkingLine } from '@/components/ui/WorkingMark';

type Intent = 'homework' | 'portrait' | 'parent_card' | 'student_card' | 'roster' | 'unsure';

type ClassifyResult = {
  intent: Intent;
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

type HomeworkVision = {
  studentName?: string | null;
  gaps?: { label: string }[];
  draftScore?: number | null;
  maxScore?: number | null;
  teacherNote?: string | null;
  costUsd?: number | null;
  items?: Array<{
    n: number;
    expected?: string | null;
    seen?: string | null;
    credit?: number | null;
    of?: number;
    gap?: string | null;
  }>;
};

export default function ProposalScreen() {
  const { colors } = useTheme();
  const { teacher, profile } = useAuth();
  const office = isOfficeRole(profile);
  const chrome = useChrome();
  const router = useRouter();
  const layout = useLayout();
  const split = layout.isSplit || (layout.orientation === 'landscape' && layout.width >= 640);
  const draft = getProposalDraft();
  const draftKey = draft ? `${draft.uri}::${draft.assetId ?? ''}::${draft.audioOnly ? 'voice' : 'photo'}` : '';
  const audioOnly = Boolean(draft?.audioOnly || (!draft?.uri && draft?.spokenAudio));

  const [imageUrl, setImageUrl] = useState(draft?.imageUrl ?? draft?.uri ?? '');
  const [assetId, setAssetId] = useState(draft?.assetId ?? '');
  const [status, setStatus] = useState('Studying the photo');
  const [error, setError] = useState<string | null>(null);
  const [classified, setClassified] = useState<ClassifyResult | null>(null);
  const [intent, setIntent] = useState<Intent>('unsure');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [heardName, setHeardName] = useState<string | null>(null);
  const [score, setScore] = useState('');
  const [gaps, setGaps] = useState<{ label: string }[]>([]);
  const [note, setNote] = useState('');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedRosterName[]>([]);
  const [busy, setBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [scoreMark, setScoreMark] = useState<ScoreMark>('numeric');
  const [gradeKind, setGradeKind] = useState<GradeKind>('homework');
  const [assignmentId, setAssignmentId] = useState<string | null>(draft?.assignmentId ?? null);
  const [assignments, setAssignments] = useState<import('@/lib/supabase/types').AssignmentRow[]>([]);
  const [keyDraftItems, setKeyDraftItems] = useState<NonNullable<HomeworkVision['items']>>([]);
  const [keyMax, setKeyMax] = useState<number | null>(null);
  const [aiCost, setAiCost] = useState<number | null>(null);
  const [parents, setParents] = useState<ClassParent[]>([]);
  const [parentId, setParentId] = useState<string | null>(null);
  const [parentName, setParentName] = useState('');
  const [portraitTarget, setPortraitTarget] = useState<'student' | 'parent'>('student');
  const [fieldChecks, setFieldChecks] = useState<Array<{ key: string; label: string; value: string; checked: boolean }>>(
    [],
  );
  const [studyPass, setStudyPass] = useState(0);
  const [followUp, setFollowUp] = useState(false);
  const [heardSpeech, setHeardSpeech] = useState(draft?.spokenHint?.transcript ?? '');
  const classifiedRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const resumeRetryRef = useRef(false);
  const homeworkVisionRan = useRef(false);
  const rosterVisionRan = useRef(false);

  const retryStudy = () => {
    classifiedRef.current = false;
    resumeRetryRef.current = false;
    errorRef.current = null;
    setClassified(null);
    setError(null);
    setStatus('Studying the photo');
    setStudyPass((pass) => pass + 1);
  };

  useFocusEffect(
    useCallback(() => {
      const next = getProposalDraft();
      if (next?.assignmentId) setAssignmentId(next.assignmentId);
    }, []),
  );

  useEffect(() => {
    classifiedRef.current = false;
    resumeRetryRef.current = false;
    errorRef.current = null;
    homeworkVisionRan.current = false;
    rosterVisionRan.current = false;
    setFollowUp(false);
  }, [draftKey]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' || classifiedRef.current) return;
      if (!resumeRetryRef.current && !errorRef.current) return;
      // The last pass died because iOS cancelled the request, or the teacher
      // is looking at a stale “Cannot reach Grok” after coming back.
      retryStudy();
    });
    return () => sub.remove();
  }, [draftKey]);

  useEffect(() => {
    if (!draft || !teacher) return;
    let cancelled = false;
    void (async () => {
      try {
        let nextAssetId = draft.assetId ?? '';
        let url = draft.imageUrl && draft.imageUrl.startsWith('http') ? draft.imageUrl : null;
        if (!audioOnly) {
          if (!nextAssetId) {
            const uploaded = await uploadTeacherAsset({
              teacherId: teacher.id,
              kind: 'photo',
              uri: draft.uri,
              mimeType: draft.mimeType,
            });
            nextAssetId = uploaded.id;
            url = await signedUrlForAsset('photo', uploaded.storage_path);
          } else if (!url) {
            const { data, error } = await requireSupabase()
              .from('assets')
              .select('storage_path')
              .eq('id', nextAssetId)
              .maybeSingle();
            if (error) throw error;
            url = data?.storage_path ? await signedUrlForAsset('photo', data.storage_path) : null;
          }
          if (!url) throw new Error('Could not open that photo.');
          if (cancelled) return;
          setAssetId(nextAssetId);
          setImageUrl(url);
        }

        if (draft.spokenAudio || draft.spokenPending || draft.spokenTranscript) {
          setStatus('Hearing what you said');
        }
        const hearSpeech = (async () => {
          if (draft.spokenHint) return draft.spokenHint.transcript;
          if (draft.spokenTranscript) return draft.spokenTranscript;
          if (draft.spokenPending) return draft.spokenPending;
          if (draft.spokenAudio) {
            return transcribeAudioDirect({
              uri: draft.spokenAudio.uri,
              mimeType: draft.spokenAudio.mimeType,
            });
          }
          return '';
        })().catch(() => '');

        const [names, grownups, transcript, classAssignments] = await Promise.all([
          chrome.classId ? listRoster(chrome.classId) : Promise.resolve([]),
          chrome.classId
            ? listParentsForClass(chrome.classId)
            : Promise.resolve({ linked: [], unlinked: [] }),
          hearSpeech,
          chrome.classId ? listClassAssignments(chrome.classId).catch(() => []) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setRoster(names);
        setAssignments(classAssignments);
        const parentList = [...grownups.linked, ...grownups.unlinked];
        setParents(parentList);

        const rosterPayload = names.map((student) => ({
          id: student.id,
          name: student.display_name.split(/\s+/).filter(Boolean)[0] ?? student.display_name,
        }));
        const rosterNames = names.map((student) => ({
          studentId: student.id,
          displayName: student.display_name,
          aliases: student.name_aliases,
        }));

        let spoken = draft.spokenHint ?? null;
        if (!spoken && transcript) {
          spoken = await resolveSpokenCapture(transcript, rosterNames);
          setProposalDraft({ ...draft, spokenHint: spoken, spokenTranscript: transcript });
          if (spoken.transcript) setHeardSpeech(spoken.transcript);
        } else if (transcript) {
          setHeardSpeech(transcript);
        }
        if (cancelled) return;

        const spokenMatch = matchSpokenStudent(spoken?.studentName ?? null, rosterNames);
        const spokenType = spoken?.captureIntent ?? null;
        if (spoken?.skipGrade || spoken?.scoreMark === 'pass') {
          setScoreMark('pass');
          setScore('');
        } else if (spoken?.scoreMark === 'fail') {
          setScoreMark('fail');
          setScore('');
        } else if (spoken?.numericScore != null) {
          setScoreMark('numeric');
          setScore(String(spoken.numericScore));
        }
        if (spoken?.gradeKind) setGradeKind(spoken.gradeKind);
        let pickedAssignmentId = assignmentId ?? draft.assignmentId ?? null;
        if (!pickedAssignmentId && spoken?.transcript) {
          const spokenAssignment = matchSpokenAssignment(spoken.transcript, classAssignments);
          if (spokenAssignment) pickedAssignmentId = spokenAssignment.id;
        }

        const keyed = classAssignments.filter((row) => assignmentHasKey(row));
        const keyUrls = await signedOriginalUrlsForAssetIds(
          keyed.map((row) => row.key_asset_id).filter((id): id is string => Boolean(id)),
        );
        const matchPromise =
          !audioOnly && url && keyed.length
            ? invokeAi<{ assignmentId?: string | null; confidence?: number }>('match-key', {
                imageUrl: url,
                keys: keyed.map((row) => ({
                  id: row.id,
                  title: row.title,
                  phash: row.key_phash,
                  layout: row.key_layout,
                  header: row.key_header,
                  imageUrl: row.key_asset_id ? keyUrls.get(row.key_asset_id) ?? null : null,
                })),
              }).catch(() => ({ assignmentId: null as string | null, confidence: 0 }))
            : Promise.resolve({ assignmentId: null as string | null, confidence: 0 });

        if (!audioOnly && !spokenType) setStatus('Studying the photo');
        const classifyPromise: Promise<ClassifyResult> = audioOnly
          ? Promise.resolve({
              intent: spokenType ?? 'homework',
              confidence: spokenType ? 0.92 : 0.4,
              studentGuessId: spokenMatch?.studentId ?? null,
              studentGuessName: spoken?.studentName ?? null,
              parentGuessName: spoken?.parentName ?? null,
              draftScore: spoken?.numericScore ?? null,
              gaps: [],
              fields: [],
              names: [],
              note: spoken?.transcript ? `Heard: ${spoken.transcript}` : null,
            })
          : spokenType
            ? Promise.resolve({
                intent: spokenType,
                confidence: 0.92,
                studentGuessId: spokenMatch?.studentId ?? null,
                studentGuessName: spoken?.studentName ?? null,
                parentGuessName: spoken?.parentName ?? null,
                draftScore: null,
                gaps: [],
                fields: [],
                names: [],
                note: spoken?.transcript ? `Heard: ${spoken.transcript}` : null,
              })
            : invokeAi<ClassifyResult>('classify-capture', {
                imageUrl: url,
                classId: chrome.classId,
                rosterFirstNames: rosterPayload,
              });

        const [result, match] = await Promise.all([classifyPromise, matchPromise]);
        if (cancelled) return;

        if (!pickedAssignmentId && match.assignmentId) pickedAssignmentId = match.assignmentId;
        if (pickedAssignmentId) setAssignmentId(pickedAssignmentId);

        const rawIntent = (result.intent as string) === 'metadata' ? 'student_card' : result.intent;
        const named = ['homework', 'portrait', 'parent_card', 'student_card', 'roster'] as const;
        let nextIntent = named.includes(rawIntent as (typeof named)[number]) ? rawIntent : 'unsure';
        if (nextIntent === 'unsure' && (result.studentGuessName || result.gaps?.length || spokenMatch)) {
          nextIntent = 'homework';
        }

        const skipGradeVision = Boolean(
          spoken?.skipGrade || spoken?.scoreMark === 'pass' || spoken?.scoreMark === 'fail' || spoken?.numericScore != null,
        );
        const needHomeworkVision =
          nextIntent === 'homework' &&
          !audioOnly &&
          Boolean(url) &&
          !homeworkVisionRan.current &&
          !skipGradeVision &&
          !((spokenMatch || result.studentGuessName) && result.gaps.length > 0);
        let vision: HomeworkVision | null = null;
        if (needHomeworkVision) {
          homeworkVisionRan.current = true;
          setStatus('Studying the photo');
          const assigned = classAssignments.find((row) => row.id === pickedAssignmentId) ?? null;
          vision = await invokeAi<HomeworkVision>('evaluate-homework', {
            imageUrl: url,
            imageUrls: [url],
            rosterNames: names.map((student) => student.display_name),
            ...evaluateKeyPayload(assigned, keyUrls),
          }).catch(() => {
            homeworkVisionRan.current = false;
            return null;
          });
          if (vision?.items?.length) setKeyDraftItems(vision.items);
          if (vision?.maxScore != null) setKeyMax(vision.maxScore);
          if (vision?.costUsd != null) setAiCost(vision.costUsd);
        }
        if (cancelled) return;

        const paperName =
          spokenMatch?.displayName ||
          spoken?.studentName?.trim() ||
          vision?.studentName?.trim() ||
          result.studentGuessName?.trim() ||
          null;
        const paperGaps = vision?.gaps?.length ? vision.gaps.slice(0, 3) : result.gaps?.slice(0, 3) ?? [];
        const paperScore = vision?.draftScore ?? result.draftScore ?? null;
        const paperNote = vision?.teacherNote?.trim() || result.note || '';
        const fromId =
          spokenMatch?.studentId ??
          (names.some((student) => student.id === result.studentGuessId) ? result.studentGuessId : null);
        const matched = paperName ? matchPaperName(paperName, rosterNames) : { guessedStudentId: null, confidence: 0 };
        const guessOnRoster = fromId ?? matched.guessedStudentId;

        classifiedRef.current = true;
        setClassified(result);
        setIntent(nextIntent);
        setHeardName(paperName);
        setStudentId(guessOnRoster);
        setParentName(result.parentGuessName ?? '');
        const mapped = mapClassifierFields(
          result.fields ?? [],
          nextIntent === 'parent_card' ? 'parent' : 'student',
        );
        setFieldChecks(mapped.map((field) => ({ ...field, checked: true })));
        setScore(paperScore != null ? String(paperScore) : '');
        setGaps(paperGaps);
        setNote(
          result.fields?.length
            ? result.fields.map((field) => `${field.label}: ${field.value}`).join('\n')
            : paperNote,
        );
        if (nextIntent === 'roster' && url && !rosterVisionRan.current) {
          rosterVisionRan.current = true;
          try {
            const suggested = await suggestRosterFromPhoto(
              url,
              names.map((student) => student.display_name),
            );
            if (!cancelled) setSuggestions(suggested);
            if (chrome.classId && nextAssetId) {
              await createRosterImport({
                classId: chrome.classId,
                photoAssetId: nextAssetId,
                suggestions: suggested.map((row) => ({
                  name: row.name,
                  selected: row.selected,
                  already_enrolled: row.alreadyHere,
                })),
              });
            }
          } catch {
            rosterVisionRan.current = false;
          }
        }
        if (!cancelled) setStatus('');
      } catch (err) {
        if (!cancelled) {
          // Swiping away mid-study cancels the fetch. Do not flash “Cannot
          // reach Grok” — AppState will restart this pass when we come back.
          if (AppState.currentState !== 'active') {
            resumeRetryRef.current = true;
            setStatus('Studying the photo');
            return;
          }
          const message = err instanceof Error ? err.message : 'Could not read this photo.';
          errorRef.current = message;
          setIntent('unsure');
          setStatus('');
          setError(message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teacher, chrome.classId, draftKey, studyPass]);

  const applyHomeworkVision = (vision: HomeworkVision, source: ClassifyResult, names: RosterStudent[]) => {
    const paperName = vision.studentName?.trim() || source.studentGuessName?.trim() || null;
    const paperGaps = vision.gaps?.length ? vision.gaps.slice(0, 3) : source.gaps?.slice(0, 3) ?? [];
    const paperScore = vision.draftScore ?? source.draftScore ?? null;
    const rosterNames = names.map((student) => ({
      studentId: student.id,
      displayName: student.display_name,
      aliases: student.name_aliases,
    }));
    const fromId = names.some((student) => student.id === source.studentGuessId) ? source.studentGuessId : null;
    const matched = paperName ? matchPaperName(paperName, rosterNames) : { guessedStudentId: null, confidence: 0 };
    setHeardName(paperName);
    setStudentId(fromId ?? matched.guessedStudentId);
    setScore(paperScore != null ? String(paperScore) : '');
    setGaps(paperGaps);
    if (!source.fields?.length) {
      setNote(vision.teacherNote?.trim() || source.note || '');
    }
  };

  const pickHomework = () => {
    setIntent('homework');
    setError(null);
    if (!imageUrl || homeworkVisionRan.current) return;
    homeworkVisionRan.current = true;
    setFollowUp(true);
    void invokeAi<HomeworkVision>('evaluate-homework', {
      imageUrl,
      imageUrls: [imageUrl],
      rosterNames: roster.map((student) => student.display_name),
    })
      .then((vision) => {
        if (classified) applyHomeworkVision(vision, classified, roster);
      })
      .catch(() => {
        homeworkVisionRan.current = false;
      })
      .finally(() => setFollowUp(false));
  };

  const pickRoster = () => {
    setIntent('roster');
    setError(null);
    if (!imageUrl || rosterVisionRan.current) return;
    rosterVisionRan.current = true;
    setFollowUp(true);
    void suggestRosterFromPhoto(
      imageUrl,
      roster.map((student) => student.display_name),
    )
      .then(async (suggested) => {
        setSuggestions(suggested);
        if (chrome.classId && assetId) {
          await createRosterImport({
            classId: chrome.classId,
            photoAssetId: assetId,
            suggestions: suggested.map((row) => ({
              name: row.name,
              selected: row.selected,
              already_enrolled: row.alreadyHere,
            })),
          });
        }
      })
      .catch(() => {
        rosterVisionRan.current = false;
      })
      .finally(() => setFollowUp(false));
  };

  const leaveProposal = () => {
    setDiscardOpen(false);
    setProposalDraft(null);
    router.back();
  };

  const discard = () => {
    if (dirty || note || score || gaps.some((gap) => gap.label)) {
      setDiscardOpen(true);
      return;
    }
    leaveProposal();
  };

  useEffect(() => {
    const dirtyNow = dirty || note || score || gaps.some((gap) => gap.label);
    // iOS hides < when swipe can pop; keep chevron when dirty so discard still runs.
    chrome.setHeaderChrome(dirtyNow ? { forceBackChevron: true } : null);
    chrome.setPushedBackHandler(() => {
      if (dirty || note || score || gaps.some((gap) => gap.label)) {
        setDiscardOpen(true);
        return true;
      }
      return false;
    });
    return () => {
      chrome.setPushedBackHandler(null);
      chrome.setHeaderChrome(null);
    };
  }, [chrome, dirty, note, score, gaps]);

  const retake = () => {
    setProposalDraft(null);
    chrome.openHeaderCamera();
    router.back();
  };

  const saveHomework = async (mode: 'approve' | 'inbox' | 'note') => {
    if (!teacher || !chrome.classId) return;
    if (!assetId && !audioOnly) return;
    setBusy(true);
    setError(null);
    try {
      const capture = await createCapture({
        classId: chrome.classId,
        kind: assetId ? 'homework' : 'voice_note',
        inputSource: assetId ? 'camera' : 'voice',
        photoAssetId: assetId || null,
        transcript: heardSpeech || null,
        assignmentId,
      });
      const numeric = scoreMark === 'numeric' && score.trim() ? Number(score) : null;
      const draftPayload = {
        gaps: gaps.filter((gap) => gap.label.trim()).map((gap, index) => ({ label: gap.label, sortOrder: index + 1 })),
        draftScore: Number.isFinite(numeric as number) ? numeric : null,
        teacherNote: note || null,
        scoreMark,
        gradeKind,
        skipGrade: scoreMark !== 'numeric' && !gaps.some((gap) => gap.label.trim()),
        costUsd: aiCost,
      };
      await saveCaptureEvaluation(capture.id, draftPayload, studentId);
      if (studentId) {
        const attached = await attachCapture(capture.id, studentId);
        if (mode === 'approve') {
          const { listStudentCaptures } = await import('@/lib/gaps/api');
          const studentCaps = await listStudentCaptures(studentId);
          const latest = studentCaps.find((item) => item.id === capture.id);
          await approveCapture(latest ?? attached, latest?.gaps ?? [], draftPayload.draftScore, {
            scoreMark,
            gradeKind,
            assignmentId,
          });
        }
      }
      if (mode === 'note') await markNoteOnly(capture.id);
      setProposalDraft(null);
      if (mode === 'approve' && studentId) {
        router.replace(`/class/${chrome.classId}/student/${studentId}`);
        return;
      }
      router.replace(mode === 'inbox' || !studentId ? '/inbox' : `/class/${chrome.classId}/student/${studentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!chrome.classId || !assetId) return;
    setBusy(true);
    try {
      const capture = await createCapture({
        classId: chrome.classId,
        kind: 'homework',
        inputSource: 'camera',
        photoAssetId: assetId,
        transcript: note || null,
      });
      if (studentId) await attachCapture(capture.id, studentId);
      await markNoteOnly(capture.id);
      setProposalDraft(null);
      router.replace(studentId && chrome.classId ? `/class/${chrome.classId}/student/${studentId}` : '/inbox');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note');
    } finally {
      setBusy(false);
    }
  };

  const savePortrait = async () => {
    const personId = portraitTarget === 'student' ? studentId : parentId;
    if (!personId || !teacher) return;
    const sourceUri = draft?.uri || imageUrl;
    if (!sourceUri && !assetId) return;
    setBusy(true);
    try {
      if (sourceUri) {
        await uploadProfilePhoto({
          teacherId: teacher.id,
          kind: portraitTarget,
          personId,
          uri: sourceUri,
          mimeType: draft?.mimeType || 'image/jpeg',
          imageUrl: imageUrl.startsWith('http') ? imageUrl : null,
        });
      } else if (assetId) {
        await setProfilePhoto(portraitTarget, personId, assetId);
      }
      setProposalDraft(null);
      if (portraitTarget === 'student' && chrome.classId) {
        router.replace(`/class/${chrome.classId}/student/${personId}`);
        return;
      }
      if (chrome.classId) router.replace(`/class/${chrome.classId}/parent/${personId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set photo');
    } finally {
      setBusy(false);
    }
  };

  const saveParentCard = async () => {
    if (!teacher) return;
    setBusy(true);
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
      setProposalDraft(null);
      router.replace(chrome.classId ? `/class/${chrome.classId}/parent/${id}` : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save parent');
    } finally {
      setBusy(false);
    }
  };

  const saveStudentCard = async () => {
    if (!studentId || !chrome.classId || !assetId) return;
    setBusy(true);
    try {
      const student = await getStudent(studentId);
      const checked = fieldChecks.filter((field) => field.checked);
      let metadata = { ...student.metadata };
      for (const field of checked) {
        if (field.key === 'notes' && typeof metadata.notes === 'string' && metadata.notes) {
          metadata = { ...metadata, notes: `${metadata.notes}\n${field.value}` };
        } else {
          metadata = { ...metadata, [field.key]: field.value };
        }
      }
      await updateStudentMetadata(student, metadata);
      const capture = await createCapture({
        classId: chrome.classId,
        kind: 'homework',
        inputSource: 'camera',
        photoAssetId: assetId,
      });
      await attachCapture(capture.id, studentId);
      await markNoteOnly(capture.id);
      setProposalDraft(null);
      router.replace(`/class/${chrome.classId}/student/${studentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save details');
    } finally {
      setBusy(false);
    }
  };

  const saveRoster = async () => {
    if (!chrome.classId || !teacher) {
      router.replace('/?switch=1');
      return;
    }
    const selected = suggestions.filter((row) => row.selected && !row.alreadyHere && row.name.trim());
    setBusy(true);
    try {
      if (selected.length) {
        if (office) {
          await addConfirmedStudents({
            classId: chrome.classId,
            teacherId: teacher.id,
            names: selected.map((row) => row.name),
            createdVia: 'photo_list',
          });
        } else {
          const available = await listAvailableStudents(chrome.classId);
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
            if (match) await enrollExistingStudent(chrome.classId, match.studentId);
            else missing.push(row.name);
          }
          if (missing.length) {
            throw new Error(
              `Only the office may add a new student. Not on the school roster: ${missing.join(', ')}.`,
            );
          }
        }
        const pending = await listPendingRosterImports(chrome.classId);
        if (pending[0]) await markRosterImportConfirmed(pending[0].id);
      }
      setProposalDraft(null);
      router.replace(`/class/${chrome.classId}/setup`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add those students');
    } finally {
      setBusy(false);
    }
  };

  const useVoiceOnly = () => {
    if (!draft?.spokenAudio) return;
    setProposalDraft({
      ...draft,
      uri: '',
      mimeType: '',
      assetId: '',
      imageUrl: '',
      audioOnly: true,
      spokenAudio: draft.spokenAudio,
    });
    setAssetId('');
    setImageUrl('');
    retryStudy();
  };

  const orderedRoster = useMemo(() => {
    if (!studentId) return roster;
    return [...roster].sort((a, b) => (a.id === studentId ? -1 : b.id === studentId ? 1 : 0));
  }, [roster, studentId]);

  if (!draft) {
    return (
      <Screen>
        <Text style={[type.body, { color: colors.mute }]}>Take a photo from the header camera first.</Text>
        <GhostButton align="left" label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const working = (!classified && !error) || followUp;
  const intentLabel = working
    ? 'Studying the photo'
    : intent === 'homework'
      ? 'Grade'
      : intent === 'roster'
        ? 'Roster'
        : intent === 'portrait'
          ? 'Portrait'
          : intent === 'parent_card'
            ? 'Parent card'
            : intent === 'student_card'
              ? 'Student card'
              : 'Not sure';

  const fields = (
    <View style={styles.fields}>
      <Text style={[type.meta, { color: colors.mute }]}>{intentLabel}</Text>
      {heardSpeech ? (
        <Text style={[type.meta, { color: colors.mute }]} numberOfLines={3}>
          Heard: {heardSpeech}
        </Text>
      ) : null}
      {working ? <WorkingLine text={status || 'Studying the photo'} /> : null}
      {!working && busy && intent === 'portrait' ? <WorkingLine text="Working…" /> : null}
      {!working && (intent === 'unsure' || error) ? (
        <>
          <Text style={[type.body, { color: colors.mute }]}>
            {error ?? 'We can’t tell what this is. Pick a job. We will not guess a student.'}
          </Text>
          {error ? <SecondaryButton label="Try again" onPress={retryStudy} /> : null}
          <SecondaryButton label="Grade" onPress={pickHomework} />
          <SecondaryButton label="Roster" onPress={pickRoster} />
          <SecondaryButton label="Portrait" onPress={() => setIntent('portrait')} />
          <SecondaryButton label="Parent card" onPress={() => setIntent('parent_card')} />
          <SecondaryButton label="Student card" onPress={() => setIntent('student_card')} />
        </>
      ) : null}

      {!working && intent === 'homework' ? (
        <>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Student</Text>
          {studentId ? (
            <Text style={[type.meta, { color: colors.mute }]}>
              {heardName
                ? `Suggested from the page: ${orderedRoster.find((row) => row.id === studentId)?.display_name ?? heardName}. Not them? Scroll to Unknown.`
                : `Selected: ${orderedRoster.find((row) => row.id === studentId)?.display_name}. Not them? Scroll to Unknown.`}
            </Text>
          ) : heardName ? (
            <Text style={[type.meta, { color: colors.mute }]}>
              Read on the page: {heardName}. Pick the student — we will not invent one.
            </Text>
          ) : (
            <Text style={[type.meta, { color: colors.mute }]}>No name was clear. Unknown waits in Inbox.</Text>
          )}
          <AvatarTray
            allowUnknown
            selectedId={studentId}
            people={orderedRoster.map((student) => ({
              id: student.id,
              name: student.display_name,
              photoUrl: student.photoUrl,
              hasPhoto: Boolean(student.photo_asset_id),
            }))}
            onPress={(person) => {
              setStudentId(person.id);
              setDirty(true);
            }}
            onUnknown={() => {
              setStudentId(null);
              setDirty(true);
            }}
          />
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Assignment</Text>
          {(() => {
            const assigned = assignments.find((row) => row.id === assignmentId);
            if (!assigned || !assignmentHasKey(assigned)) return null;
            return (
              <Text style={[type.meta, { color: colors.mute }]}>
                Looks like {assigned.title} · against key
                {keyMax != null ? ` · ${score || '—'} / ${keyMax}` : ''}
                {aiCost != null ? ` · ${formatUsd(aiCost)}` : ''}
              </Text>
            );
          })()}
          <AssignmentPicker
            assignments={assignments}
            selectedId={assignmentId}
            onSelect={(id) => {
              setAssignmentId(id);
              setDirty(true);
              const assigned = assignments.find((row) => row.id === id) ?? null;
              if (intent === 'homework' && imageUrl && assigned && assignmentHasKey(assigned)) {
                setFollowUp(true);
                void (async () => {
                  try {
                    const urls = await signedOriginalUrlsForAssetIds(
                      assigned.key_asset_id ? [assigned.key_asset_id] : [],
                    );
                    const vision = await invokeAi<HomeworkVision>('evaluate-homework', {
                      imageUrl,
                      imageUrls: [imageUrl],
                      rosterNames: roster.map((student) => student.display_name),
                      ...evaluateKeyPayload(assigned, urls),
                    });
                    if (vision.draftScore != null) setScore(String(vision.draftScore));
                    if (vision.items?.length) setKeyDraftItems(vision.items);
                    if (vision.maxScore != null) setKeyMax(vision.maxScore);
                    if (vision.gaps?.length) setGaps(vision.gaps.slice(0, 3));
                    if (vision.teacherNote) setNote(vision.teacherNote);
                  } catch {
                    // Keep the picked column even if a second score pass fails.
                  } finally {
                    setFollowUp(false);
                  }
                })();
              }
            }}
            onCreate={
              chrome.classId
                ? () => {
                    const current = getProposalDraft();
                    if (current) setProposalDraft({ ...current, assignmentId: assignmentId ?? undefined });
                    setAssignmentFormSeed({
                      returnTo: 'proposal',
                      title: heardSpeech ? heardSpeech.slice(0, 48) : undefined,
                      category: gradeKind,
                    });
                    router.push(`/class/${chrome.classId}/assignment/new`);
                  }
                : undefined
            }
          />
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Kind</Text>
          <ChipRow>
            {GRADE_KINDS.map((kind) => (
              <Chip
                key={kind.key}
                label={kind.label}
                selected={gradeKind === kind.key}
                onPress={() => {
                  setGradeKind(kind.key);
                  setDirty(true);
                }}
              />
            ))}
          </ChipRow>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Mark</Text>
          <ChipRow>
            <Chip
              label="Number"
              selected={scoreMark === 'numeric'}
              onPress={() => {
                setScoreMark('numeric');
                setDirty(true);
              }}
            />
            <Chip
              label="Pass"
              selected={scoreMark === 'pass'}
              onPress={() => {
                setScoreMark('pass');
                setScore('');
                setDirty(true);
              }}
            />
            <Chip
              label="Fail"
              selected={scoreMark === 'fail'}
              onPress={() => {
                setScoreMark('fail');
                setScore('');
                setDirty(true);
              }}
            />
          </ChipRow>
          {scoreMark === 'numeric' ? (
            <TextField
              label="Draft score"
              value={score}
              keyboardType="numeric"
              onChangeText={(value) => {
                setScore(value);
                setDirty(true);
              }}
            />
          ) : (
            <Text style={[type.meta, { color: colors.mute }]}>
              {formatScoreMark(scoreMark, null)} is not averaged with number grades.
            </Text>
          )}
          {keyDraftItems.length ? (
            <>
              {keyDraftItems.map((item) => (
                <Text key={`key-hit-${item.n}`} style={[type.meta, { color: colors.mute }]}>
                  {item.n}. {item.expected ?? '—'}
                  {item.seen ? ` · saw ${item.seen}` : ''}
                  {item.credit != null ? ` · ${item.credit}/${item.of ?? 1}` : ' · unread'}
                  {item.gap ? ` · ${item.gap}` : ''}
                </Text>
              ))}
            </>
          ) : null}
          {gaps.map((gap, index) => (
            <TextField
              key={`gap-${index}`}
              value={gap.label}
              onChangeText={(value) => {
                setGaps((current) => current.map((item, i) => (i === index ? { ...item, label: value } : item)));
                setDirty(true);
              }}
            />
          ))}
          <SecondaryButton label="Save as note" disabled={busy} onPress={() => void saveHomework('note')} />
        </>
      ) : null}

      {intent === 'portrait' ? (
        <>
          <Text style={[type.body, { color: colors.mute }]}>
            This looks like a portrait — set as profile for a person on the roster. We will not invent a student.
          </Text>
          <ChipRow>
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
          </ChipRow>
          {portraitTarget === 'student'
            ? roster.map((student) => (
                <ListRow
                  key={student.id}
                  title={student.display_name}
                  photoUrl={student.photoUrl}
                  chevron={false}
                  selected={student.id === studentId}
                  onPress={() => setStudentId(student.id)}
                />
              ))
            : parents.map((parent) => (
                <ListRow
                  key={parent.id}
                  title={parent.display_name}
                  photoUrl={parent.photoUrl}
                  chevron={false}
                  selected={parent.id === parentId}
                  onPress={() => setParentId(parent.id)}
                />
              ))}
        </>
      ) : null}

      {intent === 'parent_card' ? (
        <>
          <TextField label="Parent name" value={parentName} onChangeText={setParentName} />
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Fields</Text>
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
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Link a child</Text>
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
            Confirm every field. Unrecognized lines become a note. We will not invent a student.
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
          {!chrome.classId ? (
            <PrimaryButton label="Name a class" onPress={() => router.replace('/?switch=1')} />
          ) : (
            <>
              {suggestions.map((row) => (
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
              ))}
            </>
          )}
        </>
      ) : null}

      {!audioOnly && draft?.spokenAudio ? (
        <IconButton name="mic" label="Use voice only" onPress={useVoiceOnly} />
      ) : null}
      <GhostButton align="left" label="Retake" onPress={retake} />
      <GhostButton align="left" label="Throw away" onPress={discard} />
      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      <ConfirmSheet
        visible={discardOpen}
        title="Throw away this photo?"
        body="The photo will not be saved."
        confirmLabel="Throw away"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={leaveProposal}
      />
    </View>
  );

  const photo = (
    <PhotoPager
      hero
      fill={split}
      pages={imageUrl ? [{ key: 'page', uri: imageUrl }] : []}
      empty={!imageUrl}
    />
  );

  if (split) {
    return (
      <View style={[styles.split, { backgroundColor: colors.bg }]}>
        <View style={styles.left}>{photo}</View>
        <View style={styles.right}>
          <Screen scroll maxWidth={480}>
            {fields}
          </Screen>
        </View>
      </View>
    );
  }

  return (
    <Screen
      sticky={
        intent === 'homework' ? (
          studentId ? (
            <PrimaryButton disabled={busy} label={busy ? 'Saving…' : 'Approve'} onPress={() => void saveHomework('approve')} />
          ) : (
            <PrimaryButton disabled={busy} label={busy ? 'Saving…' : 'Save to Inbox'} onPress={() => void saveHomework('inbox')} />
          )
        ) : intent === 'portrait' ? (
          <PrimaryButton
            disabled={busy || (portraitTarget === 'student' ? !studentId : !parentId)}
            label={busy ? 'Saving…' : 'Use as profile'}
            onPress={() => void savePortrait()}
          />
        ) : intent === 'parent_card' ? (
          <PrimaryButton
            disabled={busy || !parentName.trim()}
            label={busy ? 'Saving…' : 'Save parent'}
            onPress={() => void saveParentCard()}
          />
        ) : intent === 'student_card' ? (
          <PrimaryButton
            disabled={busy || !studentId}
            label={busy ? 'Saving…' : 'Save details'}
            onPress={() => void saveStudentCard()}
          />
        ) : intent === 'roster' && chrome.classId ? (
          <PrimaryButton
            disabled={busy}
            label={
              office
                ? `Add ${suggestions.filter((row) => row.selected && !row.alreadyHere).length} students`
                : `Enroll matching names`
            }
            onPress={() => void saveRoster()}
          />
        ) : undefined
      }
    >
      {photo}
      {fields}
    </Screen>
  );
}

function evaluateKeyPayload(
  assigned: import('@/lib/supabase/types').AssignmentRow | null,
  keyUrls: Map<string, string>,
) {
  if (!assigned || !assignmentHasKey(assigned)) return {};
  const items = parseKeyItems(assigned.key_items);
  return {
    keyItems: items,
    keyNotes: assigned.key_notes ?? '',
    scoreScheme: assigned.score_scheme ?? 'numeric',
    maxScore: assigned.max_score,
    keyImageUrls: assigned.key_asset_id ? [keyUrls.get(assigned.key_asset_id)].filter(Boolean) : [],
  };
}

const styles = StyleSheet.create({
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  left: {
    flex: 1.2,
    minWidth: 0,
    padding: 12,
  },
  right: {
    flex: 1,
    minWidth: 280,
  },
  fields: {
    gap: 10,
    marginTop: 12,
  },
  chips: {
    gap: 8,
  },
});
