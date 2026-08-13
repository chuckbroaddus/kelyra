import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  addTeacherGap,
  approveCapture,
  listStudentCaptures,
  markNoteOnly,
  updateGapLabel,
  type StudentCapture,
} from '@/lib/gaps/api';
import { getStudent } from '@/lib/students/api';
import type { StudentRow } from '@/lib/supabase/types';
import { useFocusEffect } from 'expo-router';

export default function StudentScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [captures, setCaptures] = useState<StudentCapture[]>([]);
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const [newGap, setNewGap] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    const nextStudent = await getStudent(studentId);
    const nextCaptures = await listStudentCaptures(studentId);
    setStudent(nextStudent);
    setCaptures(nextCaptures);
    const labels: Record<string, string> = {};
    for (const capture of nextCaptures) {
      for (const gap of capture.gaps) {
        labels[gap.id] = gap.label;
      }
    }
    setDraftLabels(labels);
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => {
        setStatus(err instanceof Error ? err.message : 'Could not load student');
      });
    }, [load]),
  );

  const latest = captures[0];

  const onApprove = async () => {
    if (!latest) return;
    setStatus(null);
    try {
      const gaps = latest.gaps.map((gap) => ({
        ...gap,
        label: (draftLabels[gap.id] ?? gap.label).trim(),
      }));
      for (const gap of gaps) {
        await updateGapLabel(gap.id, gap.label);
      }
      await approveCapture(latest, gaps);
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not approve');
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{student?.display_name ?? 'Student'}</Text>
      <Text style={styles.body}>
        Review drafted gaps. Approve files the focus skill. Note only keeps the photo with no grade.
      </Text>
      {!latest ? (
        <Text style={styles.meta}>No work filed on this student yet.</Text>
      ) : (
        <View style={styles.card}>
          {latest.photoUrl ? (
            <Image source={{ uri: latest.photoUrl }} style={styles.preview} />
          ) : null}
          {latest.transcript ? <Text style={styles.meta}>Heard: {latest.transcript}</Text> : null}
          {latest.teacher_note ? <Text style={styles.meta}>{latest.teacher_note}</Text> : null}
          <Text style={styles.section}>Gaps ({latest.status})</Text>
          {latest.gaps.length === 0 ? (
            <Text style={styles.meta}>
              No AI gaps yet. Deploy analyze-homework or type a gap below.
            </Text>
          ) : (
            latest.gaps.map((gap) => (
              <TextInput
                key={gap.id}
                style={styles.input}
                value={draftLabels[gap.id] ?? gap.label}
                editable={latest.status === 'draft' || latest.status === 'attached'}
                onChangeText={(value) =>
                  setDraftLabels((current) => ({ ...current, [gap.id]: value }))
                }
              />
            ))
          )}
          {latest.status === 'approved' ? (
            <Text style={styles.filed}>Approved</Text>
          ) : latest.status === 'note_only' ? (
            <Text style={styles.meta}>Kept as a note only</Text>
          ) : (
            <>
              <TextInput
                placeholder="Add a gap, e.g. two-digit regrouping"
                style={styles.input}
                value={newGap}
                onChangeText={setNewGap}
              />
              <Pressable style={styles.secondary} onPress={() => void onAddGap()}>
                <Text style={styles.secondaryText}>Add gap</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => void onApprove()}>
                <Text style={styles.buttonText}>Approve</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => void onNoteOnly()}>
                <Text style={styles.secondaryText}>Note only</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
      {status ? <Text style={styles.error}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
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
  section: {
    fontSize: 18,
    fontWeight: '600',
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
  },
  filed: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    gap: 10,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
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
  error: {
    color: '#9b1c1c',
  },
});
