import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, theme } from '@/constants/theme';
import {
  clearStudentSession,
  listStudentTodo,
  loadStudentSession,
  submitStudentTodo,
  type StudentSession,
  type StudentTodo,
} from '@/lib/student-session/api';
import { useFocusEffect } from 'expo-router';

export default function TodoScreen() {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [items, setItems] = useState<StudentTodo[]>([]);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const next = await loadStudentSession();
    setSession(next);
    if (!next) return;
    const todo = await listStudentTodo(next.joinCode, next.studentId);
    setItems(todo);
    const nextAnswers: Record<string, Record<string, string>> = {};
    for (const item of todo) {
      nextAnswers[item.submissionId] = { ...item.answers };
    }
    setAnswers(nextAnswers);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => {
        setStatus(err instanceof Error ? err.message : 'Could not load to-do');
      });
    }, [load]),
  );

  const onSubmit = async (item: StudentTodo) => {
    if (!session) return;
    setStatus(null);
    try {
      await submitStudentTodo(
        session.joinCode,
        session.studentId,
        item.submissionId,
        answers[item.submissionId] ?? {},
      );
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not submit');
    }
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Join a class first.</Text>
        <Link href="/join">
          <Text style={styles.linkText}>Join class</Text>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{session.displayName}</Text>
      <Text style={styles.body}>{session.className}</Text>
      {items[0]?.focusLabel ? (
        <Text style={styles.meta}>Focus: {items[0].focusLabel}</Text>
      ) : null}
      {items.length === 0 ? (
        <Text style={styles.meta}>No practice assigned yet.</Text>
      ) : (
        items.map((item) => (
          <View key={item.submissionId} style={styles.card}>
            <Text style={styles.section}>
              {item.title} · {item.status}
            </Text>
            {item.items.map((practiceItem) => (
              <View key={practiceItem.id} style={styles.item}>
                <Text style={styles.body}>{practiceItem.prompt}</Text>
                {item.status === 'assigned' ? (
                  <TextInput
                    style={styles.input}
                    placeholder="Your answer"
                    placeholderTextColor={colors.muted}
                    value={answers[item.submissionId]?.[practiceItem.id] ?? ''}
                    onChangeText={(value) =>
                      setAnswers((current) => ({
                        ...current,
                        [item.submissionId]: {
                          ...(current[item.submissionId] ?? {}),
                          [practiceItem.id]: value,
                        },
                      }))
                    }
                  />
                ) : (
                  <Text style={styles.meta}>
                    {item.answers[practiceItem.id] || 'No answer'}
                  </Text>
                )}
              </View>
            ))}
            {item.status === 'assigned' ? (
              <Pressable style={styles.button} onPress={() => void onSubmit(item)}>
                <Text style={styles.buttonText}>Submit</Text>
              </Pressable>
            ) : (
              <Text style={styles.filed}>Submitted</Text>
            )}
          </View>
        ))
      )}
      {status ? <Text style={styles.error}>{status}</Text> : null}
      <Pressable
        onPress={() => {
          void clearStudentSession().then(() => setSession(null));
        }}
      >
        <Text style={styles.meta}>Leave class</Text>
      </Pressable>
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
    marginBottom: 12,
  },
  item: {
    gap: 6,
  },
  input: theme.input,
  button: theme.button,
  buttonText: theme.buttonText,
  linkText: theme.linkText,
  error: theme.error,
});
