import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, theme } from '@/constants/theme';
import {
  addTeacherGap,
  analyzeAttachedCapture,
  approveCapture,
  listStudentCaptures,
  markNoteOnly,
  updateGapLabel,
  type StudentCapture,
} from '@/lib/gaps/api';
import { buildSkillHistory, focusSkillLabel, loadFocusSkillLabel } from '@/lib/gaps/history';
import { createParentInvite, parentInviteUrl } from '@/lib/parents/api';
import { assignPractice, listStudentPractice, savePracticeItems, type StudentPractice } from '@/lib/practice/api';
import { closeFocusSkill, getStudent } from '@/lib/students/api';
import type { PracticeItem, StudentRow } from '@/lib/supabase/types';
import { useFocusEffect } from 'expo-router';

export default function StudentScreen() {
  const { id: classId, studentId } = useLocalSearchParams<{ id: string; studentId: string }>();
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [captures, setCaptures] = useState<StudentCapture[]>([]);
  const [practice, setPractice] = useState<StudentPractice[]>([]);
  const [itemDrafts, setItemDrafts] = useState<Record<string, PracticeItem[]>>({});
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const [newGap, setNewGap] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [storedFocusLabel, setStoredFocusLabel] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    const nextStudent = await getStudent(studentId);
    const nextCaptures = await listStudentCaptures(studentId);
    setStudent(nextStudent);
    setCaptures(nextCaptures);
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
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => {
        setStatus(err instanceof Error ? err.message : 'Could not load student');
      });
    }, [load]),
  );

  const latest = captures[0];

  const editedGaps = () =>
    (latest?.gaps ?? []).map((gap) => ({
      ...gap,
      label: (draftLabels[gap.id] ?? gap.label).trim(),
    }));

  const onAssignGap = async (alsoPractice: boolean) => {
    if (!latest || !studentId || !classId || assigning) return;
    setAssigning(true);
    setStatus(alsoPractice ? 'Assigning gap and practice…' : 'Assigning gap…');
    try {
      const gaps = editedGaps();
      for (const gap of gaps) {
        await updateGapLabel(gap.id, gap.label);
      }
      const assigned = await approveCapture(latest, gaps);
      if (alsoPractice) {
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
      setStatus(err instanceof Error ? err.message : 'Could not assign that gap');
    } finally {
      setAssigning(false);
    }
  };

  const onNoteOnly = async () => {
    if (!latest) return;
    try {
      await markNoteOnly(latest.id);
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save note');
    }
  };

  const onSaveItems = async (practiceSetId: string, item: StudentPractice) => {
    setStatus(null);
    try {
      await savePracticeItems(practiceSetId, itemDrafts[practiceSetId] ?? item.items);
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save items');
    }
  };

  const onAssignPractice = async () => {
    if (!latest || !studentId || !classId) return;
    const gap = latest.gaps.find((item) => item.status === 'approved' && item.skill_id);
    if (!gap?.skill_id) {
      setStatus('Approve a gap first so there is a skill to practice.');
      return;
    }
    setStatus(null);
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
      setStatus(err instanceof Error ? err.message : 'Could not assign practice');
    }
  };

  const onCloseFocus = async (result: 'proficient' | 'dismissed') => {
    if (!student || !focusLabel) return;
    setStatus(null);
    try {
      await closeFocusSkill(student, focusLabel, result);
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not update focus');
    }
  };

  const onInviteParent = async () => {
    if (!studentId) return;
    setStatus(null);
    try {
      const token = await createParentInvite(studentId);
      setInviteUrl(parentInviteUrl(token));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create invite');
    }
  };

  const onAddGap = async () => {
    if (!latest || !studentId) return;
    try {
      await addTeacherGap(latest.id, studentId, newGap);
      setNewGap('');
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not add gap');
    }
  };

  const onAskGrok = async () => {
    if (!latest || asking) return;
    setAsking(true);
    setStatus('Asking AI… this can take a few seconds.');
    try {
      await analyzeAttachedCapture(latest.id);
      await load();
      setStatus(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not analyze');
    } finally {
      setAsking(false);
    }
  };

  const canAskGrok =
    Boolean(latest?.photo_asset_id || latest?.photoUrls?.length) &&
    (latest?.status === 'attached' || latest?.status === 'draft');
  const history = buildSkillHistory(student, captures, practice);
  const focusLabel = focusSkillLabel(student, captures, storedFocusLabel);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{student?.display_name ?? 'Student'}</Text>
      <Text style={styles.filed}>Focus: {focusLabel ?? 'none yet'}</Text>
      <Text style={styles.body}>
        Grok suggests a gap. Assign it to set {student?.display_name ?? 'this student'}'s focus.
        Then you can give practice. Note only keeps the photo with no grade.
      </Text>
      {!latest ? (
        <Text style={styles.meta}>No work filed on this student yet.</Text>
      ) : (
        <View style={styles.card}>
          {(latest.photoUrls?.length ? latest.photoUrls : latest.photoUrl ? [latest.photoUrl] : []).map(
            (url, index) => (
              <View key={url}>
                {latest.photoUrls && latest.photoUrls.length > 1 ? (
                  <Text style={styles.meta}>Page {index + 1}</Text>
                ) : null}
                <Image source={{ uri: url }} style={styles.preview} />
              </View>
            ),
          )}
          {latest.transcript ? <Text style={styles.meta}>Heard: {latest.transcript}</Text> : null}
          {latest.teacher_note ? <Text style={styles.meta}>{latest.teacher_note}</Text> : null}
          <Text style={styles.section}>
            {latest.status === 'approved' ? 'Assigned gap' : 'Suggested gap'} ({latest.status})
          </Text>
          {latest.gaps.length === 0 ? (
            <Text style={styles.meta}>
              No AI gaps yet. Tap Ask AI, or type a gap below.
            </Text>
          ) : (
            <>
              {latest.status !== 'approved' && latest.status !== 'note_only' ? (
                <Text style={styles.meta}>
                  Not assigned yet. Edit the label if you want, then assign it to{' '}
                  {student?.display_name ?? 'this student'}.
                </Text>
              ) : null}
              {latest.gaps.map((gap) => (
                <TextInput
                  key={gap.id}
                  style={styles.input}
                  value={draftLabels[gap.id] ?? gap.label}
                  placeholderTextColor={colors.muted}
                  editable={latest.status === 'draft' || latest.status === 'attached'}
                  onChangeText={(value) =>
                    setDraftLabels((current) => ({ ...current, [gap.id]: value }))
                  }
                />
              ))}
            </>
          )}
          {latest.status === 'approved' ? (
            <>
              <Text style={styles.filed}>
                Assigned to {student?.display_name ?? 'this student'}
              </Text>
              <Pressable style={styles.button} onPress={() => void onAssignPractice()}>
                <Text style={styles.buttonText}>Assign practice</Text>
              </Pressable>
            </>
          ) : latest.status === 'note_only' ? (
            <Text style={styles.meta}>Kept as a note only</Text>
          ) : (
            <>
              {latest.gaps.length ? (
                <>
                  <Pressable
                    disabled={assigning}
                    style={styles.button}
                    onPress={() => void onAssignGap(false)}
                  >
                    <Text style={styles.buttonText}>
                      {assigning
                        ? 'Assigning…'
                        : `Assign gap to ${student?.display_name ?? 'student'}`}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={assigning}
                    style={styles.secondary}
                    onPress={() => void onAssignGap(true)}
                  >
                    <Text style={styles.secondaryText}>Assign gap and give practice</Text>
                  </Pressable>
                </>
              ) : null}
              {canAskGrok ? (
                <Pressable
                  disabled={asking}
                  style={styles.secondary}
                  onPress={() => void onAskGrok()}
                >
                  <Text style={styles.secondaryText}>{asking ? 'Asking AI…' : 'Ask AI'}</Text>
                </Pressable>
              ) : null}
              {status ? <Text style={styles.error}>{status}</Text> : null}
              <TextInput
                placeholder="Add a gap, e.g. two-digit regrouping"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={newGap}
                onChangeText={setNewGap}
              />
              <Pressable style={styles.secondary} onPress={() => void onAddGap()}>
                <Text style={styles.secondaryText}>Add gap</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => void onNoteOnly()}>
                <Text style={styles.secondaryText}>Note only</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
      {student?.current_focus_skill_id && focusLabel ? (
        <>
          <Pressable style={styles.button} onPress={() => void onCloseFocus('proficient')}>
            <Text style={styles.buttonText}>Mark {focusLabel} proficient</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => void onCloseFocus('dismissed')}>
            <Text style={styles.secondaryText}>Dismiss focus</Text>
          </Pressable>
        </>
      ) : null}
      <Pressable style={styles.secondary} onPress={() => void onInviteParent()}>
        <Text style={styles.secondaryText}>Create parent link</Text>
      </Pressable>
      {inviteUrl ? <Text selectable style={styles.meta}>{inviteUrl}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.section}>Skill history</Text>
        {history.length === 0 ? (
          <Text style={styles.meta}>No gaps, notes, or practice yet.</Text>
        ) : (
          history.map((row) => (
            <Text key={row.id} style={styles.body}>
              {row.detail}
              {' · '}
              {row.label}
              {row.isFocus ? ' · focus' : ''}
            </Text>
          ))
        )}
      </View>
      {practice.length ? (
        <View style={styles.card}>
          <Text style={styles.section}>Practice</Text>
          {practice.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.meta}>
                {item.title}: {item.status}
              </Text>
              {item.practiceSetId && item.status === 'assigned'
                ? (itemDrafts[item.practiceSetId] ?? item.items).map((practiceItem, index) => (
                    <TextInput
                      key={practiceItem.id}
                      placeholderTextColor={colors.muted}
                      style={styles.input}
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
                  ))
                : item.items.map((practiceItem) => (
                    <Text key={practiceItem.id} style={styles.meta}>
                      {practiceItem.prompt}
                    </Text>
                  ))}
              {item.practiceSetId && item.status === 'assigned' ? (
                <>
                  <Pressable
                    style={styles.secondary}
                    onPress={() =>
                      setItemDrafts((current) => ({
                        ...current,
                        [item.practiceSetId!]: [
                          ...(current[item.practiceSetId!] ?? item.items),
                          { id: `item-${Date.now()}`, prompt: '' },
                        ],
                      }))
                    }
                  >
                    <Text style={styles.secondaryText}>Add item</Text>
                  </Pressable>
                  <Pressable
                    style={styles.button}
                    onPress={() => void onSaveItems(item.practiceSetId!, item)}
                  >
                    <Text style={styles.buttonText}>Save items</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {status ? <Text style={styles.error}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: theme.scroll,
  title: theme.title,
  body: theme.body,
  section: theme.section,
  meta: theme.meta,
  filed: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    gap: 10,
  },
  item: {
    gap: 8,
    marginBottom: 12,
  },
  preview: theme.preview,
  input: theme.input,
  button: theme.button,
  buttonText: theme.buttonText,
  secondary: theme.secondary,
  secondaryText: theme.secondaryText,
  error: theme.error,
});
