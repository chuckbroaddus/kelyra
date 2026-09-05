import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { isOpenWork } from '@/lib/assignments/status';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { practiceTitle } from '@/lib/practice/api';
import { requestPracticeHelp, type PracticeHelpAction } from '@/lib/practice/helpApi';
import {
  listStudentTodo,
  loadStudentSession,
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
  const [studentId, setStudentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [helpText, setHelpText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [helpBusy, setHelpBusy] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  usePushedTitle(item ? practiceTitle(item.title) : 'Practice');

  const load = useCallback(async () => {
    if (!submissionId) return;
    const [todo, session] = await Promise.all([listStudentTodo(), loadStudentSession()]);
    setStudentId(session?.studentId ?? null);
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

  const onHelp = async (practiceItemId: string, action: PracticeHelpAction) => {
    if (!item || !studentId) return;
    setHelpBusy(`${practiceItemId}:${action}`);
    setStatus(null);
    try {
      const result = await requestPracticeHelp({
        assignmentId: item.assignmentId,
        studentId,
        itemId: practiceItemId,
        action,
        attemptText: answers[practiceItemId] ?? '',
      });
      if (result.error || result.refused) {
        setStatus(result.error ?? 'Help is not available right now.');
        return;
      }
      if (result.text) {
        setHelpText((current) => ({ ...current, [practiceItemId]: result.text! }));
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not get help');
    } finally {
      setHelpBusy(null);
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
  const helpOn = item.kind === 'practice' && item.helpMode && item.helpMode !== 'off';

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
            {helpOn && open ? (
              <ChipRow>
                <Chip
                  label={helpBusy === `${practiceItem.id}:hint` ? 'Hint…' : 'Hint'}
                  disabled={Boolean(helpBusy)}
                  onPress={() => void onHelp(practiceItem.id, 'hint')}
                />
                {(item.helpMode === 'steps_after_try' || item.helpMode === 'check_work') ? (
                  <Chip
                    label={helpBusy === `${practiceItem.id}:next_step` ? 'Step…' : 'Next step'}
                    disabled={Boolean(helpBusy)}
                    onPress={() => void onHelp(practiceItem.id, 'next_step')}
                  />
                ) : null}
                {item.helpMode === 'check_work' ? (
                  <Chip
                    label={helpBusy === `${practiceItem.id}:check_work` ? 'Checking…' : 'Check work'}
                    disabled={Boolean(helpBusy)}
                    onPress={() => void onHelp(practiceItem.id, 'check_work')}
                  />
                ) : null}
              </ChipRow>
            ) : null}
            {helpText[practiceItem.id] ? (
              <Text style={[type.meta, { color: colors.ink }]}>{helpText[practiceItem.id]}</Text>
            ) : null}
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
