import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { isOpenWork } from '@/lib/assignments/status';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { practiceTitle } from '@/lib/practice/api';
import {
  listStudentTodo,
  markStudentWorkStarted,
  submitStudentTodo,
  type StudentTodo,
} from '@/lib/student-session/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function StudentPracticeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { setContextTab } = useChrome();
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();
  const [item, setItem] = useState<StudentTodo | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  usePushedTitle(item ? practiceTitle(item.title) : 'Practice');

  const load = useCallback(async () => {
    if (!submissionId) return;
    const todo = await listStudentTodo();
    const next = todo.find((row) => row.submissionId === submissionId) ?? null;
    setItem(next);
    if (!next) return;
    const raw = next.answers ?? {};
    setAnswers(
      Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, typeof value === 'string' ? value : ''])),
    );
    if (next.status === 'assigned') {
      try {
        await markStudentWorkStarted(next.submissionId);
        setItem({ ...next, status: 'started' });
      } catch {
        // Stay assigned if the RPC is not live yet.
      }
    }
  }, [submissionId]);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void load()
        .then(() => {
          if (live) setStatus(null);
        })
        .catch((err) => {
          if (live) setStatus(err instanceof Error ? err.message : 'Could not load this assignment');
        })
        .finally(() => {
          if (live) setReady(true);
        });
      return () => {
        live = false;
      };
    }, [load]),
  );

  const onSubmit = async () => {
    if (!item) return;
    setBusy(true);
    setStatus(null);
    try {
      await submitStudentTodo(item.submissionId, answers);
      setContextTab('done', '/todo');
      router.replace('/todo' as never);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <Screen maxWidth={640} centered>
        <WorkingLine />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen maxWidth={640} centered>
        <Text style={[type.body, { color: colors.mute }]}>{status ?? 'That assignment is gone.'}</Text>
        <GhostButton label="Back to To Do" onPress={() => router.replace('/todo' as never)} />
      </Screen>
    );
  }

  const open = isOpenWork(item.status);

  return (
    <Screen
      maxWidth={640}
      keyboard
      sticky={
        open ? (
          <PrimaryButton label={busy ? 'Turning in…' : 'Turn in'} disabled={busy} onPress={() => void onSubmit()} />
        ) : undefined
      }
    >
      <Text style={[type.meta, { color: colors.mute }]}>{item.className ?? 'Practice'}</Text>
      {item.items.map((practiceItem, index) => (
        <View key={practiceItem.id} style={styles.item}>
          <Text style={[styles.gutter, { color: colors.mute }]}>{index + 1}.</Text>
          <View style={styles.prompt}>
            <Text style={[type.body, { color: colors.ink }]}>{practiceItem.prompt}</Text>
            {open ? (
              <TextField
                placeholder="Your answer"
                value={answers[practiceItem.id] ?? ''}
                onChangeText={(value) => setAnswers((current) => ({ ...current, [practiceItem.id]: value }))}
              />
            ) : (
              <Text style={[type.meta, { color: colors.mute }]}>{answers[practiceItem.id] || 'No answer'}</Text>
            )}
          </View>
        </View>
      ))}
      {status ? <Text style={[styles.error, { color: colors.danger }]}>{status}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  gutter: {
    ...type.body,
    width: 22,
  },
  prompt: {
    flex: 1,
    gap: 8,
  },
  error: {
    ...type.meta,
    marginTop: 12,
  },
});
