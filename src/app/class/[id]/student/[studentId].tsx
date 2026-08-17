import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { WebCameraCapture } from '@/components/WebCameraCapture';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarTray } from '@/components/ui/AvatarTray';
import { Badge, captureBadge, practiceBadge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { FormSheet } from '@/components/ui/FormSheet';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { DetailsRows } from '@/components/ui/DetailsRows';
import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { PhotoPager } from '@/components/ui/PhotoPager';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { Screen, useScreenPad } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { WorkRow } from '@/components/ui/WorkRow';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { deleteCapture } from '@/lib/captures/delete';
import { returnCaptureToInbox } from '@/lib/captures/api';
import { firstName, formatWhen } from '@/lib/format';
import { deleteGap } from '@/lib/gaps/delete';
import {
  addTeacherGap,
  analyzeAttachedCapture,
  approveCapture,
  listStudentCaptures,
  markNoteOnly as markCaptureNoteOnly,
  updateGapLabel,
  type StudentCapture,
} from '@/lib/gaps/api';
import { buildSkillHistory, focusSkillLabel, loadFocusSkillLabel } from '@/lib/gaps/history';
import {
  createParent,
  createParentInvite,
  linkChild,
  listParentsForClass,
  listParentsForStudent,
  parentInviteUrl,
  parentStatusLine,
  type ClassParent,
} from '@/lib/parents/api';
import { unlinkChild } from '@/lib/parents/delete';
import {
  STUDENT_DETAIL_FIELDS,
  formatBirthdayMd,
  metaString,
  parseBirthdayInput,
  setMetaKey,
} from '@/lib/people/metadata';
import {
  clearProfilePhoto,
  pickAndSetProfilePhoto,
  setProfilePhoto,
  signedProfileUrlForAssetId,
  uploadProfilePhoto,
} from '@/lib/people/photos';
import { deletePracticeSet, deleteSubmission } from '@/lib/practice/delete';
import {
  assignPractice,
  listStudentPractice,
  practiceTitle,
  savePracticeItems,
  type StudentPractice,
} from '@/lib/practice/api';
import { closeFocusSkill, getStudent, patchStudentMetadata, updateStudentMetadata } from '@/lib/students/api';
import { deleteStudent, listStudentEnrollments, removeEnrollment } from '@/lib/students/delete';
import type { PracticeItem, SkillGapRow, StudentRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type ConfirmKind =
  | { kind: 'delete-student' }
  | { kind: 'remove-class'; otherName: string }
  | { kind: 'delete-work'; capture: StudentCapture }
  | { kind: 'inbox'; capture: StudentCapture }
  | { kind: 'delete-gap'; gap: SkillGapRow }
  | { kind: 'delete-set'; practice: StudentPractice }
  | { kind: 'remove-assignment'; practice: StudentPractice }
  | { kind: 'unlink'; parent: ClassParent }
  | { kind: 'link-parent'; parent: ClassParent }
  | { kind: 'remove-photo' }
  | { kind: 'clear'; key: string; label: string };

export default function StudentScreen() {
  const { colors, scheme } = useTheme();
  const chrome = useChrome();
  const router = useRouter();
  const { teacher } = useAuth();
  const { isSplit } = useScreenPad();
  const { id: classId, studentId, capture: captureParam } = useLocalSearchParams<{
    id: string;
    studentId: string;
    capture?: string;
  }>();
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [captures, setCaptures] = useState<StudentCapture[]>([]);
  const [practice, setPractice] = useState<StudentPractice[]>([]);
  const [parents, setParents] = useState<ClassParent[]>([]);
  const [enrollments, setEnrollments] = useState<Array<{ class_id: string; class_name: string }>>([]);
  const [itemDrafts, setItemDrafts] = useState<Record<string, PracticeItem[]>>({});
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const [newGap, setNewGap] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [storedFocusLabel, setStoredFocusLabel] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addParentOpen, setAddParentOpen] = useState(false);
  const [invitePickOpen, setInvitePickOpen] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentRel, setParentRel] = useState('mother');
  const [alsoInvite, setAlsoInvite] = useState(true);
  const [parentFilter, setParentFilter] = useState('');
  const [existingParents, setExistingParents] = useState<ClassParent[]>([]);
  const [score, setScore] = useState('');
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!studentId) return;
    const nextStudent = await getStudent(studentId);
    const nextCaptures = await listStudentCaptures(studentId);
    setStudent(nextStudent);
    setPhotoUrl(await signedProfileUrlForAssetId(nextStudent.photo_asset_id));
    setCaptures(nextCaptures);
    setParents(await listParentsForStudent(studentId));
    setEnrollments(await listStudentEnrollments(studentId));
    const nextPractice = await listStudentPractice(studentId);
    setPractice(nextPractice);
    const drafts: Record<string, PracticeItem[]> = {};
    for (const item of nextPractice) {
      if (item.practiceSetId) drafts[item.practiceSetId] = item.items.map((row) => ({ ...row }));
    }
    setItemDrafts(drafts);
    const labels: Record<string, string> = {};
    for (const capture of nextCaptures) {
      for (const gap of capture.gaps) {
        labels[gap.id] = gap.label;
      }
    }
    setDraftLabels(labels);
    setStoredFocusLabel(await loadFocusSkillLabel(nextStudent.current_focus_skill_id));
    const nextLatest = nextCaptures.find((item) => item.id === captureParam) ?? nextCaptures[0];
    setScore(
      nextLatest?.approved_score != null
        ? String(nextLatest.approved_score)
        : nextLatest?.draft_score != null
          ? String(nextLatest.draft_score)
          : '',
    );
  }, [studentId, captureParam]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load student');
      });
    }, [load]),
  );

  useEffect(() => {
    chrome.setPushedTitle(student?.display_name ?? 'Student');
    return () => chrome.setPushedTitle(null);
  }, [chrome, student?.display_name]);

  const latest =
    captures.find((item) => item.id === captureParam) ??
    captures[0];

  const editedGaps = () =>
    (latest?.gaps ?? []).map((gap) => ({
      ...gap,
      label: (draftLabels[gap.id] ?? gap.label).trim(),
    }));

  const onAssignGap = async (alsoPractice: boolean) => {
    if (!latest || !studentId || !classId || assigning) return;
    setAssigning(true);
    setError(null);
    setStatus(alsoPractice ? 'Approving and creating practice…' : 'Approving…');
    try {
      const gaps = editedGaps();
      for (const gap of gaps) {
        await updateGapLabel(gap.id, gap.label);
      }
      const parsedScore = score.trim() === '' ? null : Number(score);
      const assigned = await approveCapture(
        latest,
        gaps,
        Number.isFinite(parsedScore as number) ? parsedScore : null,
      );
      if (alsoPractice && assigned.skillId && assigned.skillLabel) {
        await assignPractice({
          classId,
          studentId,
          skillId: assigned.skillId,
          skillLabel: assigned.skillLabel,
          captureId: latest.id,
        });
      }
      await load();
      setStatus(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not assign that gap');
    } finally {
      setAssigning(false);
    }
  };

  const onNoteOnly = async () => {
    if (!latest) return;
    try {
      await markCaptureNoteOnly(latest.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note');
    }
  };

  const onSaveItems = async (practiceSetId: string, item: StudentPractice) => {
    setStatus(null);
    setError(null);
    try {
      await savePracticeItems(practiceSetId, itemDrafts[practiceSetId] ?? item.items);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save items');
    }
  };

  const onAssignPractice = async () => {
    if (!latest || !studentId || !classId) return;
    const gap = latest.gaps.find((item) => item.status === 'approved' && item.skill_id);
    if (!gap?.skill_id) {
      setError('Approve a gap first so there is a skill to practice.');
      return;
    }
    setStatus(null);
    setError(null);
    try {
      await assignPractice({
        classId,
        studentId,
        skillId: gap.skill_id,
        skillLabel: gap.label,
        captureId: latest.id,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign practice');
    }
  };

  const onCloseFocus = async (result: 'proficient' | 'dismissed') => {
    if (!student || !focusLabel) return;
    setStatus(null);
    setError(null);
    try {
      await closeFocusSkill(student, focusLabel, result);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update focus');
    }
  };

  const onInviteParent = async (parentId?: string) => {
    const target = parentId ?? parents[0]?.id;
    if (!target) return;
    setStatus(null);
    setError(null);
    try {
      const token = await createParentInvite(target, studentId);
      setInviteUrl(parentInviteUrl(token));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invite');
    }
  };

  const openEdit = () => {
    if (!student) return;
    const next: Record<string, string> = {};
    for (const field of STUDENT_DETAIL_FIELDS) {
      next[field.key] = metaString(student.metadata, field.key) ?? '';
    }
    setDraft(next);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!student) return;
    setBusy(true);
    try {
      let metadata = { ...student.metadata };
      for (const field of STUDENT_DETAIL_FIELDS) {
        const raw = draft[field.key] ?? '';
        if (field.key === 'birthday') {
          metadata = setMetaKey(metadata, field.key, parseBirthdayInput(raw) ?? raw);
        } else {
          metadata = setMetaKey(metadata, field.key, raw);
        }
      }
      await updateStudentMetadata(student, metadata);
      setEditOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save details');
    } finally {
      setBusy(false);
    }
  };

  const onPickPhoto = async (fromCamera: boolean) => {
    if (!teacher || !student) return;
    setPhotoOpen(false);
    setPhotoBusy(true);
    try {
      const result = await pickAndSetProfilePhoto({
        teacherId: teacher.id,
        kind: 'student',
        personId: student.id,
        fromCamera,
      });
      if (result === 'camera-web') setCameraOpen(true);
      else if (result === 'set') await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not set photo';
      setError(message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const onWebCapture = async (uri: string, mimeType: string) => {
    if (!teacher || !student) return;
    setCameraOpen(false);
    setPhotoBusy(true);
    try {
      await uploadProfilePhoto({
        teacherId: teacher.id,
        kind: 'student',
        personId: student.id,
        uri,
        mimeType,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const onUseHomeworkPhoto = async () => {
    if (!student || !latest?.photo_asset_id) return;
    setPhotoOpen(false);
    setPhotoBusy(true);
    try {
      const source = latest.photoUrls[0] || latest.photoUrl;
      if (teacher && source) {
        await uploadProfilePhoto({
          teacherId: teacher.id,
          kind: 'student',
          personId: student.id,
          uri: source,
          mimeType: 'image/jpeg',
          imageUrl: source.startsWith('http') ? source : null,
        });
      } else {
        await setProfilePhoto('student', student.id, latest.photo_asset_id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const openAddParent = async () => {
    setAddParentOpen(true);
    setParentFilter('');
    if (!classId) return;
    try {
      const next = await listParentsForClass(classId);
      setExistingParents([...next.linked, ...next.unlinked]);
    } catch {
      setExistingParents([]);
    }
  };

  const onAddParent = async () => {
    if (!teacher || !studentId) return;
    setBusy(true);
    try {
      const created = await createParent({
        teacherId: teacher.id,
        displayName: parentName,
        studentId,
        alsoInvite,
        metadata: { relationship: parentRel },
      });
      setAddParentOpen(false);
      setParentName('');
      if (created.token) setInviteUrl(parentInviteUrl(created.token));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add parent');
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!student || !confirm) return;
    setBusy(true);
    setError(null);
    try {
      if (confirm.kind === 'delete-student') {
        await deleteStudent(student.id);
        setConfirm(null);
        router.replace(`/class/${classId}`);
        return;
      }
      if (confirm.kind === 'remove-class' && classId) {
        await removeEnrollment(classId, student.id);
        setConfirm(null);
        router.replace(`/class/${classId}`);
        return;
      }
      if (confirm.kind === 'delete-work') await deleteCapture(confirm.capture.id);
      if (confirm.kind === 'inbox') await returnCaptureToInbox(confirm.capture.id);
      if (confirm.kind === 'delete-gap') await deleteGap(confirm.gap.id);
      if (confirm.kind === 'link-parent') {
        await linkChild(confirm.parent.id, student.id);
        setAddParentOpen(false);
      }
      if (confirm.kind === 'delete-set' && confirm.practice.practiceSetId) {
        await deletePracticeSet(confirm.practice.practiceSetId);
      }
      if (confirm.kind === 'remove-assignment') await deleteSubmission(confirm.practice.id);
      if (confirm.kind === 'unlink') await unlinkChild(confirm.parent.id, student.id);
      if (confirm.kind === 'remove-photo') await clearProfilePhoto('student', student.id);
      if (confirm.kind === 'clear') await patchStudentMetadata(student, confirm.key, null);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish that');
    } finally {
      setBusy(false);
    }
  };

  const onAddGap = async () => {
    if (!latest || !studentId) return;
    try {
      await addTeacherGap(latest.id, studentId, newGap);
      setNewGap('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add gap');
    }
  };

  const onAskGrok = async () => {
    if (!latest || asking) return;
    setAsking(true);
    setError(null);
    setStatus('Asking AI… this can take a few seconds.');
    try {
      await analyzeAttachedCapture(latest.id);
      await load();
      setStatus(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not analyze');
    } finally {
      setAsking(false);
    }
  };

  const canAskGrok =
    Boolean(latest?.photo_asset_id || latest?.photoUrls?.length) &&
    (latest?.status === 'attached' || latest?.status === 'draft');
  const history = buildSkillHistory(student, captures, practice);
  const focusLabel = focusSkillLabel(student, captures, storedFocusLabel);
  const photos = latest?.photoUrls?.length
    ? latest.photoUrls
    : latest?.photoUrl
      ? [latest.photoUrl]
      : [];

  const preferred = student ? metaString(student.metadata, 'preferred_name') : null;
  const birthdayMd = student ? formatBirthdayMd(metaString(student.metadata, 'birthday')) : null;
  const otherClass = enrollments.find((row) => row.class_id !== classId);
  const unlinkedExistingParents = existingParents.filter(
    (parent) => !parents.some((linked) => linked.id === parent.id),
  );
  const parentNeedle = parentFilter.trim().toLowerCase();
  const visibleExistingParents = parentNeedle
    ? unlinkedExistingParents.filter((parent) => parent.display_name.toLowerCase().includes(parentNeedle))
    : unlinkedExistingParents;
  const openPhotoSheet = () => {
    if (photoOpen) {
      setPhotoOpen(false);
      setTimeout(() => setPhotoOpen(true), 50);
      return;
    }
    setPhotoOpen(true);
  };

  const details = STUDENT_DETAIL_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    value:
      field.key === 'birthday'
        ? metaString(student?.metadata, 'birthday')
        : metaString(student?.metadata, field.key),
  }));

  return (
    <Screen maxWidth={isSplit ? 900 : 720} keyboard>
      {student ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change photo, ${student.display_name}`}
          onPress={photoBusy ? undefined : openPhotoSheet}
          style={styles.hero}
        >
          {({ pressed }) => (
            <>
          <Avatar name={student.display_name} photoUrl={photoUrl} size={72} />
          <View style={styles.heroText}>
            <MarqueeText
              text={student.display_name}
              align="start"
              paused={pressed}
              fadeColor={colors.bg}
              style={[styles.heroName, { color: colors.ink }]}
            />
            {photoBusy ? (
              <WorkingLine text="Working…" />
            ) : (
              <Text style={[type.meta, { color: colors.mute }]}>
                {[preferred, birthdayMd].filter(Boolean).join(' · ') || 'Add details'}
              </Text>
            )}
          </View>
            </>
          )}
        </Pressable>
      ) : null}
      <View style={styles.pills}>
        <GhostButton align="left" label="Photo" disabled={photoBusy} onPress={openPhotoSheet} />
        <GhostButton align="left" label="Edit" onPress={openEdit} />
        <GhostButton align="left" label="Add parent" onPress={() => void openAddParent()} />
      </View>
      <SectionHeader label="Details" />
      <DetailsRows
        rows={details}
        onPress={openEdit}
        onClear={(row) => setConfirm({ kind: 'clear', key: row.key, label: row.label })}
      />
      <View style={styles.focusRow}>
        {focusLabel ? (
          <>
            <Badge variant="focus" />
            <Text style={[styles.focusLabel, { color: colors.ink }]} numberOfLines={2}>
              {focusLabel}
            </Text>
          </>
        ) : (
          <Text style={[type.meta, { color: colors.mute }]}>No focus skill yet</Text>
        )}
      </View>
      {!latest ? (
        <>
          <Text style={[styles.empty, { color: colors.mute }]}>No work filed yet.</Text>
          <GhostButton align="left" label="Photograph work" onPress={() => router.push('/capture')} />
        </>
      ) : (
        <Card>
          <View style={isSplit ? styles.split : styles.stack}>
            <View style={styles.col}>
              {photos.length ? (
                <PhotoPager
                  pages={photos.map((url, index) => ({ key: `${url}-${index}`, uri: url }))}
                />
              ) : null}
            </View>
            <View style={styles.col}>
              {latest.transcript ? (
                <Text style={[type.meta, { color: colors.mute }]} numberOfLines={4}>
                  Heard: {latest.transcript}
                </Text>
              ) : null}
              {latest.teacher_note ? <Text style={[type.body, { color: colors.ink }]}>{latest.teacher_note}</Text> : null}
              {latest.status === 'draft' || latest.status === 'attached' ? (
                <TextField
                  label="Draft score"
                  value={score}
                  keyboardType="numeric"
                  onChangeText={setScore}
                />
              ) : latest.approved_score != null || latest.draft_score != null ? (
                <Text style={[type.meta, { color: colors.mute }]}>
                  Score {latest.approved_score ?? latest.draft_score}
                </Text>
              ) : null}
              <View style={styles.focusRow}>
                <Text style={[type.section, { textTransform: 'uppercase', flex: 1, color: colors.mute }]} numberOfLines={1}>
                  {latest.status === 'approved' ? 'Approved gap' : 'Suggested gap'}
                </Text>
                <Badge variant={captureBadge(latest.status)} />
              </View>
              {latest.gaps.length === 0 ? (
                <Text style={[type.meta, { color: colors.mute }]}>No suggested gaps yet. Ask AI, or type one below.</Text>
              ) : (
                latest.gaps.map((gap) => (
                  <View key={gap.id} style={styles.gapRow}>
                    <View style={styles.gapField}>
                      <TextField
                        value={draftLabels[gap.id] ?? gap.label}
                        editable={latest.status === 'draft' || latest.status === 'attached'}
                        onChangeText={(value) =>
                          setDraftLabels((current) => ({ ...current, [gap.id]: value }))
                        }
                      />
                    </View>
                    <GhostButton
                      align="left"
                      label="Remove"
                      onPress={() => setConfirm({ kind: 'delete-gap', gap })}
                    />
                  </View>
                ))
              )}
              {latest.status === 'approved' ? (
                <>
                  <Text style={[styles.assigned, { color: colors.ink }]}>
                    Approved for {student?.display_name ?? 'this student'}
                  </Text>
                  <PrimaryButton label="Give practice" onPress={() => void onAssignPractice()} />
                </>
              ) : latest.status === 'note_only' ? (
                <Text style={[type.meta, { color: colors.mute }]}>Kept as a note</Text>
              ) : (
                <>
                  {latest.gaps.length ? (
                    <>
                      <PrimaryButton
                        disabled={assigning}
                        label={assigning ? 'Approving…' : 'Approve'}
                        onPress={() => void onAssignGap(false)}
                      />
                      <SecondaryButton
                        disabled={assigning}
                        label="Approve & give practice"
                        onPress={() => void onAssignGap(true)}
                      />
                    </>
                  ) : null}
                  {canAskGrok ? (
                    <SecondaryButton
                      disabled={asking}
                      label="Ask AI"
                      onPress={() => void onAskGrok()}
                    />
                  ) : null}
                  {asking ? <WorkingLine text="Asking AI…" /> : null}
                  <TextField
                    placeholder="Add a gap, e.g. two-digit regrouping"
                    value={newGap}
                    onChangeText={setNewGap}
                  />
                  <GhostButton align="left" label="Add gap" onPress={() => void onAddGap()} />
                  <GhostButton align="left" label="Keep as a note" onPress={() => void onNoteOnly()} />
                </>
              )}
            </View>
          </View>
        </Card>
      )}
      {student?.current_focus_skill_id && focusLabel ? (
        <View style={styles.block}>
          <SecondaryButton
            label={`Mark ${focusLabel} proficient`}
            onPress={() => void onCloseFocus('proficient')}
          />
          <GhostButton align="left" label="Dismiss focus" onPress={() => void onCloseFocus('dismissed')} />
        </View>
      ) : null}

      <SectionHeader label="Parents" />
      {parents.length ? (
        <AvatarTray
          people={parents.map((parent) => ({
            id: parent.id,
            name: parent.display_name,
            photoUrl: parent.photoUrl,
          }))}
          onPress={(person) => router.push(`/class/${classId}/parent/${person.id}`)}
        />
      ) : null}
      {parents.map((parent) => (
        <ListRow
          key={parent.id}
          title={parent.display_name}
          status={parentStatusLine(parent)}
          photoUrl={parent.photoUrl}
          onPress={() => router.push(`/class/${classId}/parent/${parent.id}`)}
          trailing={[
            {
              key: 'unlink',
              label: 'Unlink',
              tone: 'wash',
              autoCommit: false,
              onPress: () => setConfirm({ kind: 'unlink', parent }),
            },
          ]}
        />
      ))}
      <GhostButton align="left" label="Add parent" onPress={() => void openAddParent()} />
      {parents.length ? (
        <GhostButton
          align="left"
          label="Create invite link"
          onPress={() => {
            if (parents.length === 1) void onInviteParent(parents[0]!.id);
            else setInvitePickOpen(true);
          }}
        />
      ) : null}
      {inviteUrl ? (
        <Card>
          <Text selectable style={type.meta}>
            {inviteUrl}
          </Text>
        </Card>
      ) : null}

      <SectionHeader label="Skill history" />
      {history.length === 0 ? (
        <Card>
          <Text style={[type.body, { color: colors.mute }]}>No gaps, notes, or practice yet.</Text>
        </Card>
      ) : (
        history.map((row) => (
          <ListRow
            key={row.id}
            title={row.label}
            status={row.detail}
            avatarName={row.label}
            chevron={false}
            right={row.isFocus ? <Badge variant="focus" /> : null}
            trailing={
              row.gapId
                ? [
                    {
                      key: 'delete',
                      label: 'Delete',
                      tone: 'danger',
                      autoCommit: false,
                      onPress: () =>
                        setConfirm({
                          kind: 'delete-gap',
                          gap: {
                            id: row.gapId!,
                            capture_id: '',
                            student_id: studentId ?? '',
                            skill_id: null,
                            label: row.label,
                            source: 'teacher',
                            status: (row.gapStatus as SkillGapRow['status']) ?? 'draft',
                            sort_order: 1,
                            created_at: row.at,
                          },
                        }),
                    },
                  ]
                : undefined
            }
          />
        ))
      )}

      <SectionHeader label="Work" />
      {captures.map((item) => (
        <WorkRow
          key={item.id}
          title={item.transcript?.trim() || 'Work'}
          status={item.status === 'approved' ? 'Approved' : item.status === 'note_only' ? 'Note' : 'Review'}
          meta={formatWhen(item.created_at)}
          photoUrl={item.photoUrl}
          badge={captureBadge(item.status)}
          onPress={() => router.setParams({ capture: item.id })}
          pills={[
            ...(item.status === 'draft' || item.status === 'attached'
              ? [{ key: 'approve', label: 'Approve', kind: 'primary' as const, onPress: () => router.setParams({ capture: item.id }) }]
              : []),
            {
              key: 'inbox',
              label: 'Inbox',
              kind: 'ghost' as const,
              onPress: () => setConfirm({ kind: 'inbox', capture: item }),
            },
            {
              key: 'delete',
              label: 'Delete',
              kind: 'ghost' as const,
              onPress: () => setConfirm({ kind: 'delete-work', capture: item }),
            },
          ]}
          trailing={[
            {
              key: 'delete',
              label: 'Delete',
              tone: 'danger',
              autoCommit: false,
              onPress: () => setConfirm({ kind: 'delete-work', capture: item }),
            },
          ]}
          leading={[
            {
              key: 'inbox',
              label: 'Inbox',
              tone: 'wash',
              autoCommit: false,
              onPress: () => setConfirm({ kind: 'inbox', capture: item }),
            },
          ]}
        />
      ))}

      {practice.length ? (
        <>
          <SectionHeader label="Practice" />
          {practice.map((item) => (
            <Card key={item.id}>
              <View style={styles.focusRow}>
                <Text style={[styles.skill, { color: colors.ink }]}>{practiceTitle(item.title)}</Text>
                <Badge variant={practiceBadge(item.status)} />
              </View>
              {(item.practiceSetId && item.status === 'assigned'
                ? (itemDrafts[item.practiceSetId] ?? item.items)
                : item.items
              ).map((practiceItem, index) => (
                <View key={practiceItem.id} style={styles.item}>
                  <Text style={[styles.gutter, { color: colors.mute }]}>{index + 1}.</Text>
                  <View style={styles.prompt}>
                    {item.practiceSetId && item.status === 'assigned' ? (
                      <TextField
                        multiline
                        value={practiceItem.prompt}
                        onChangeText={(value) =>
                          setItemDrafts((current) => ({
                            ...current,
                            [item.practiceSetId!]: (current[item.practiceSetId!] ?? item.items).map(
                              (row, rowIndex) =>
                                rowIndex === index ? { ...row, prompt: value } : row,
                            ),
                          }))
                        }
                      />
                    ) : (
                      <Text style={[type.body, { color: colors.ink }]}>{practiceItem.prompt}</Text>
                    )}
                  </View>
                </View>
              ))}
              {item.practiceSetId && item.status === 'assigned' ? (
                <>
                  <GhostButton
                    align="left"
                    label="Add item"
                    onPress={() =>
                      setItemDrafts((current) => ({
                        ...current,
                        [item.practiceSetId!]: [
                          ...(current[item.practiceSetId!] ?? item.items),
                          { id: `item-${Date.now()}`, prompt: '' },
                        ],
                      }))
                    }
                  />
                  <SecondaryButton label="Save items" onPress={() => void onSaveItems(item.practiceSetId!, item)} />
                </>
              ) : null}
              {item.practiceSetId ? (
                <GhostButton
                  align="left"
                  label="Delete set"
                  onPress={() => setConfirm({ kind: 'delete-set', practice: item })}
                />
              ) : null}
              <GhostButton
                align="left"
                label="Remove assignment"
                onPress={() => setConfirm({ kind: 'remove-assignment', practice: item })}
              />
            </Card>
          ))}
        </>
      ) : null}

      {otherClass && classId ? (
        <GhostButton
          align="left"
          label={`Remove from ${enrollments.find((row) => row.class_id === classId)?.class_name ?? 'class'}`}
          onPress={() => setConfirm({ kind: 'remove-class', otherName: otherClass.class_name })}
        />
      ) : null}
      {student ? (
        <GhostButton
          align="left"
          label={`Delete ${firstName(student.display_name)}`}
          onPress={() => setConfirm({ kind: 'delete-student' })}
        />
      ) : null}

      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PhaseBanner
        phase={2}
        compact
        detail="Look at the work, then approve. Nothing is a grade until you do."
      />

      <PhotoSheet
        visible={photoOpen}
        hasPhoto={Boolean(student?.photo_asset_id)}
        showUseHomework={Boolean(latest?.photo_asset_id)}
        onTake={() => void onPickPhoto(true)}
        onLibrary={() => void onPickPhoto(false)}
        onUseHomework={() => void onUseHomeworkPhoto()}
        onRemove={() => {
          setPhotoOpen(false);
          setConfirm({ kind: 'remove-photo' });
        }}
        onCancel={() => setPhotoOpen(false)}
      />

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <WebCameraCapture onCapture={(uri, mime) => void onWebCapture(uri, mime)} onCancel={() => setCameraOpen(false)} />
      </Modal>

      <FormSheet visible={editOpen} title="Details" onClose={() => setEditOpen(false)}>
            {STUDENT_DETAIL_FIELDS.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                value={draft[field.key] ?? ''}
                multiline={field.key === 'address' || field.key === 'allergies' || field.key === 'notes'}
                keyboardType={
                  field.key === 'phone' || field.key === 'emergency_phone'
                    ? 'phone-pad'
                    : field.key === 'email'
                      ? 'email-address'
                      : field.key === 'birthday'
                        ? Platform.OS === 'web'
                          ? 'default'
                          : 'numbers-and-punctuation'
                        : 'default'
                }
                placeholder={
                  field.key === 'birthday'
                    ? 'YYYY-MM-DD'
                    : field.key === 'grade_or_age'
                      ? '3rd / 8 years'
                      : undefined
                }
                onChangeText={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
              />
            ))}
            <Text style={[type.meta, { color: colors.mute }]}>Allergies and notes: only you will see this.</Text>
            <PrimaryButton label={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={() => void saveEdit()} />
      </FormSheet>

      <FormSheet visible={addParentOpen} title="Add parent" onClose={() => setAddParentOpen(false)}>
            <TextField placeholder="Amina Chen" value={parentName} onChangeText={setParentName} />
            <Text style={[type.meta, { color: colors.mute }]}>Relationship</Text>
            <ChipRow>
              {(['mother', 'father', 'guardian', 'other'] as const).map((rel) => (
                <Chip
                  key={rel}
                  label={rel === 'mother' ? 'Mother' : rel === 'father' ? 'Father' : rel === 'guardian' ? 'Guardian' : 'Other'}
                  selected={parentRel === rel}
                  onPress={() => setParentRel(rel)}
                />
              ))}
            </ChipRow>
            <Chip
              label="Also create a link"
              selected={alsoInvite}
              onPress={() => setAlsoInvite((value) => !value)}
            />
            <PrimaryButton
              disabled={busy}
              label={busy ? 'Adding…' : 'Add and link'}
              onPress={() => void onAddParent()}
            />
            {unlinkedExistingParents.length ? (
              <>
                <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
                  Or link an existing parent
                </Text>
                {unlinkedExistingParents.length > 8 ? (
                  <TextField placeholder="Find a parent" value={parentFilter} onChangeText={setParentFilter} />
                ) : null}
                {visibleExistingParents.map((parent) => (
                  <ListRow
                    key={parent.id}
                    title={parent.display_name}
                    status={parentStatusLine(parent)}
                    photoUrl={parent.photoUrl}
                    onPress={() => {
                      setAddParentOpen(false);
                      setConfirm({ kind: 'link-parent', parent });
                    }}
                  />
                ))}
                {unlinkedExistingParents.length > 8 && visibleExistingParents.length === 0 ? (
                  <Text style={[type.meta, { color: colors.mute }]}>No names match that search.</Text>
                ) : null}
              </>
            ) : null}
      </FormSheet>

      <FormSheet visible={invitePickOpen} title="Create invite for" onClose={() => setInvitePickOpen(false)}>
            {parents.map((parent) => (
              <ListRow
                key={parent.id}
                title={parent.display_name}
                status={parentStatusLine(parent)}
                photoUrl={parent.photoUrl}
                onPress={() => {
                  setInvitePickOpen(false);
                  void onInviteParent(parent.id);
                }}
              />
            ))}
      </FormSheet>

      <ConfirmSheet
        visible={Boolean(confirm)}
        title={studentConfirmTitle(confirm, student?.display_name ?? 'student')}
        body={studentConfirmBody(confirm, student?.display_name ?? 'student')}
        confirmLabel={studentConfirmLabel(confirm, student?.display_name ?? 'student')}
        typeName={confirm?.kind === 'delete-student' ? student?.display_name : undefined}
        photoUrl={confirm?.kind === 'delete-work' ? confirm.capture.photoUrl : undefined}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void onConfirm()}
      />
    </Screen>
  );
}

function studentConfirmTitle(confirm: ConfirmKind | null, name: string): string {
  if (!confirm) return '';
  if (confirm.kind === 'delete-student') return `Delete ${name}?`;
  if (confirm.kind === 'remove-class') return `Remove ${firstName(name)} from this class?`;
  if (confirm.kind === 'delete-work') return 'Delete this work?';
  if (confirm.kind === 'inbox') return 'Send this back to Inbox?';
  if (confirm.kind === 'link-parent') return `Link ${confirm.parent.display_name} to ${name}?`;
  if (confirm.kind === 'delete-gap') {
    return confirm.gap.status === 'approved' ? 'Remove this approved gap?' : 'Remove this suggested gap?';
  }
  if (confirm.kind === 'delete-set') return 'Delete this practice set?';
  if (confirm.kind === 'remove-assignment') return `Remove ${firstName(name)} from ${confirm.practice.title}?`;
  if (confirm.kind === 'unlink') return `Unlink ${firstName(name)} from ${confirm.parent.display_name}?`;
  if (confirm.kind === 'remove-photo') return 'Remove this photo?';
  return `Clear ${confirm.label}?`;
}

function studentConfirmBody(confirm: ConfirmKind | null, name: string): string {
  if (!confirm) return '';
  if (confirm.kind === 'delete-student') {
    return `This deletes ${firstName(name)} from every class, including their work, grades, parent links, and photo. This cannot be undone.`;
  }
  if (confirm.kind === 'remove-class') {
    return `Their work in this class will be deleted. They will stay in ${confirm.otherName}. This cannot be undone.`;
  }
  if (confirm.kind === 'delete-work') return 'This removes the photo and is not a grade. This cannot be undone.';
  if (confirm.kind === 'inbox') return 'This is not delete. You can assign a name again later.';
  if (confirm.kind === 'link-parent') {
    return `They will see ${firstName(name)}’s note home. This cannot be undone.`;
  }
  if (confirm.kind === 'delete-gap' && confirm.gap.status === 'approved') {
    return 'The homework and the grade stay. If this is the focus skill, focus will move or clear. This cannot be undone.';
  }
  if (confirm.kind === 'delete-gap') return 'This cannot be undone.';
  if (confirm.kind === 'delete-set') {
    return confirm.practice.status === 'assigned'
      ? 'Delete this practice set and its grade-book column? Students will lose the to-do. This cannot be undone.'
      : 'This cannot be undone.';
  }
  if (confirm.kind === 'remove-assignment') return 'This cannot be undone.';
  if (confirm.kind === 'unlink') {
    return `They will not see ${firstName(name)}’s note. This does not delete anyone. This cannot be undone.`;
  }
  if (confirm.kind === 'remove-photo') return `${name} stays. This cannot be undone.`;
  return 'This cannot be undone.';
}

function studentConfirmLabel(confirm: ConfirmKind | null, name: string): string {
  if (!confirm) return 'Delete';
  if (confirm.kind === 'delete-student') return `Delete ${firstName(name)}`;
  if (confirm.kind === 'remove-class') return 'Remove';
  if (confirm.kind === 'delete-work') return 'Delete';
  if (confirm.kind === 'inbox') return 'Send to Inbox';
  if (confirm.kind === 'link-parent') return 'Link';
  if (confirm.kind === 'delete-gap') return 'Remove';
  if (confirm.kind === 'delete-set') return 'Delete set';
  if (confirm.kind === 'remove-assignment') return 'Remove';
  if (confirm.kind === 'unlink') return 'Unlink';
  if (confirm.kind === 'remove-photo') return 'Remove photo';
  return 'Clear';
}

const styles = StyleSheet.create({
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  empty: type.body,
  focusLabel: {
    ...type.body,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  split: {
    flexDirection: 'row',
    gap: 16,
  },
  stack: {
    gap: 12,
  },
  col: {
    flex: 1,
    gap: 12,
  },
  assigned: {
    ...type.body,
    fontWeight: '600',
  },
  block: {
    marginTop: 16,
    gap: 8,
  },
  skill: {
    ...type.body,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  item: {
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  gutter: {
    ...type.meta,
    width: 24,
    flexShrink: 0,
  },
  prompt: {
    flex: 1,
    minWidth: 0,
  },
  error: {
    ...type.body,
    marginTop: 12,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  heroName: {
    ...type.title,
    width: '100%',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gapField: {
    flex: 1,
    minWidth: 0,
  },
});
