import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { createClass, listClasses } from '@/lib/classes/api';
import { deleteClass } from '@/lib/classes/delete';
import type { ClassRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { switch: pick } = useLocalSearchParams<{ switch?: string }>();
  const { configured, loading, teacher, error } = useAuth();
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<ClassRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!teacher) return;
    try {
      const next = await listClasses();
      setClasses(next);
      if (next.length === 1 && next[0] && !pick) {
        router.replace(`/class/${next[0].id}`);
      }
    } catch (err) {
      setClasses([]);
      setStatus(err instanceof Error ? err.message : 'Could not load classes');
    }
  }, [teacher, router, pick]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!configured) {
    return (
      <Screen centered maxWidth={480}>
        <Text style={[type.display, { color: colors.ink }]}>Kelyra</Text>
        <Text style={[styles.lead, { color: colors.mute }]}>
          Slice 01 needs a Supabase project. Copy .env.example to .env, then apply
          supabase/migrations/20260812000000_slice01_foundation.sql. See docs/slice-01.md.
        </Text>
      </Screen>
    );
  }

  if (loading || (teacher && classes === null)) {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  if (!teacher) {
    return (
      <Screen centered maxWidth={400}>
        <Text style={[styles.wordmark, { color: colors.ink }]}>Kelyra</Text>
        <Text style={[styles.lead, { color: colors.mute }]}>
          Photograph the work. Approve the gap. Send a short practice set.
        </Text>
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <PrimaryButton label="Teacher sign in" onPress={() => router.push('/sign-in')} />
        <GhostButton label="Student join" onPress={() => router.push('/join')} />
      </Screen>
    );
  }

  const onCreate = async () => {
    setStatus(null);
    setCreating(true);
    try {
      const created = await createClass(name, teacher.id);
      setName('');
      router.replace(`/class/${created.id}/setup`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create class');
    } finally {
      setCreating(false);
    }
  };

  const empty = (classes ?? []).length === 0;

  return (
    <Screen keyboard maxWidth={480}>
      <Text style={[type.display, { color: colors.ink }]}>{empty ? 'Name your class' : 'Your classes'}</Text>
      <Text style={[styles.lead, { color: colors.mute }]}>
        {empty
          ? 'One field. Then you can photograph work and file it to a student.'
          : 'Open a class to see what needs you today.'}
      </Text>

      {(classes ?? []).map((item) => (
        <ListRow
          key={item.id}
          title={item.name}
          avatarName={item.name}
          onPress={() => router.push(`/class/${item.id}`)}
          trailing={[
            {
              key: 'delete',
              label: 'Delete',
              tone: 'danger',
              autoCommit: false,
              onPress: () => setPending(item),
            },
          ]}
        />
      ))}

      <SectionHeader label={empty ? 'New class' : 'Another class'} first={empty} />
      <TextField
        placeholder="Room 14 math"
        value={name}
        onChangeText={setName}
        returnKeyType="done"
        onSubmitEditing={() => void onCreate()}
      />
      <View style={styles.gap} />
      <PrimaryButton
        label={creating ? 'Creating…' : 'Create class'}
        disabled={creating}
        onPress={() => void onCreate()}
      />
      {status ? <Text style={[styles.error, { color: colors.danger }]}>{status}</Text> : null}
      <ConfirmSheet
        visible={Boolean(pending)}
        title={`Delete ${pending?.name ?? 'class'}?`}
        body="This deletes the class, its homework, practice, and grade book. Students who are only in this class will be deleted. Students who are also in another class will stay on those rosters. This cannot be undone."
        confirmLabel={`Delete ${pending?.name ?? 'class'}`}
        typeName={pending?.name}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          setBusy(true);
          void deleteClass(pending.id)
            .then(async () => {
              setPending(null);
              const remaining = await listClasses();
              setClasses(remaining);
              if (remaining[0]) router.replace(`/class/${remaining[0].id}`);
              else router.replace('/');
            })
            .catch((err) => {
              setStatus(err instanceof Error ? err.message : 'Could not delete class');
            })
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    ...type.display,
    textAlign: 'center',
  },
  lead: {
    ...type.body,
    marginTop: 8,
    marginBottom: 24,
  },
  gap: {
    height: 12,
  },
  error: {
    ...type.body,
    marginTop: 12,
  },
});
