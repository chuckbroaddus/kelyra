import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, practiceBadge } from '@/components/ui/Badge';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AvatarTray } from '@/components/ui/AvatarTray';
import { ClassmateSheet } from '@/components/ui/ClassmateSheet';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { firstName } from '@/lib/format';
import { signedProfileUrl } from '@/lib/people/photos';
import { practiceTitle } from '@/lib/practice/api';
import {
  listStudentClassmates,
  listStudentTodo,
  loadStudentSession,
  submitStudentTodo,
  type StudentSession,
  type StudentTodo,
} from '@/lib/student-session/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function TodoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { contextTab } = useChrome();
  const { profile } = useAuth();
  const [session, setSession] = useState<StudentSession | null>(null);
  const [items, setItems] = useState<StudentTodo[]>([]);
  const [classmates, setClassmates] = useState<
    { id: string; name: string; photoUrl?: string | null; hasPhoto?: boolean }[]
  >([]);
  const [peer, setPeer] = useState<{ name: string; photoUrl?: string | null } | null>(null);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const next = await loadStudentSession();
    setSession(next);
    if (!next) return;
    const todo = await listStudentTodo();
    setItems(todo);
    const nextAnswers: Record<string, Record<string, string>> = {};
    for (const item of todo) {
      nextAnswers[item.submissionId] = { ...item.answers };
    }
    setAnswers(nextAnswers);
    try {
      const peers = await listStudentClassmates();
      setClassmates(
        await Promise.all(
          peers.map(async (row) => ({
            id: row.studentId,
            name: firstName(row.displayName),
            photoUrl: await signedProfileUrl(row.photoPath),
            hasPhoto: Boolean(row.photoPath),
          })),
        ),
      );
    } catch {
      setClassmates([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => {
        setStatus(err instanceof Error ? err.message : 'Could not load to-do');
      });
    }, [load]),
  );

  const assigned = items.find((item) => item.status === 'assigned');
  const filter = contextTab === 'done' ? 'done' : 'todo';
  const visible = useMemo(
    () => items.filter((item) => (filter === 'done' ? item.status !== 'assigned' : item.status === 'assigned')),
    [items, filter],
  );

  const onSubmit = async (item: StudentTodo) => {
    if (!session) return;
    setBusy(true);
    setStatus(null);
    try {
      await submitStudentTodo(item.submissionId, answers[item.submissionId] ?? {});
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <Screen maxWidth={640} centered>
        <Text style={[styles.lead, { color: colors.mute }]}>
          {profile?.role === 'student'
            ? 'This login is not assigned to a roster name yet. Ask your teacher to assign it on your student page.'
            : 'Sign in with the login your school assigned.'}
        </Text>
        {profile?.role === 'student' ? null : (
          <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
        )}
      </Screen>
    );
  }

  return (
    <Screen
      maxWidth={720}
      keyboard
      sticky={
        assigned && filter === 'todo' ? (
          <PrimaryButton
            label={busy ? 'Turning in…' : 'Turn in'}
            disabled={busy}
            onPress={() => void onSubmit(assigned)}
          />
        ) : undefined
      }
    >
      <AvatarTray
        people={classmates}
        onPress={(person) => setPeer({ name: person.name, photoUrl: person.photoUrl })}
      />
      <GhostButton align="left" label="Class feed" onPress={() => router.push('/feed')} />
      <Text style={[type.meta, { color: colors.mute }]}>Your practice</Text>
      {items[0]?.focusLabel ? (
        <View style={styles.focus}>
          <Badge variant="focus" />
          <Text style={[styles.focusLabel, { color: colors.ink }]} numberOfLines={2}>
            {items[0].focusLabel}
          </Text>
        </View>
      ) : null}
      {visible.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          {filter === 'done'
            ? 'Nothing turned in yet.'
            : 'Nothing to do yet. Your teacher will assign a short set.'}
        </Text>
      ) : (
        <View style={styles.list}>
          {visible.map((item) => (
            <Card key={item.submissionId}>
              <View style={styles.titleRow}>
                <Text style={[styles.skill, { color: colors.ink }]} numberOfLines={2}>
                  {practiceTitle(item.title)}
                </Text>
                <Badge variant={practiceBadge(item.status)} />
              </View>
              {item.items.map((practiceItem, index) => (
                <View key={practiceItem.id} style={styles.item}>
                  <Text style={[styles.gutter, { color: colors.mute }]}>{index + 1}.</Text>
                  <View style={styles.prompt}>
                    <Text style={[type.body, { color: colors.ink }]}>{practiceItem.prompt}</Text>
                    {item.status === 'assigned' ? (
                      <TextField
                        placeholder="Your answer"
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
                      <Text style={[type.meta, { color: colors.mute }]}>{item.answers[practiceItem.id] || 'No answer'}</Text>
                    )}
                  </View>
                </View>
              ))}
            </Card>
          ))}
        </View>
      )}
      {status ? <Text style={[styles.error, { color: colors.danger }]}>{status}</Text> : null}
      <ClassmateSheet
        name={peer?.name ?? null}
        photoUrl={peer?.photoUrl}
        className={session.className ?? 'your class'}
        onClose={() => setPeer(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    ...type.body,
    marginBottom: 16,
    textAlign: 'center',
  },
  empty: {
    ...type.body,
    marginTop: 16,
  },
  focus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  focusLabel: {
    ...type.body,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  list: {
    gap: 24,
    marginTop: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    gap: 8,
  },
  error: {
    ...type.body,
    marginTop: 12,
  },
});
