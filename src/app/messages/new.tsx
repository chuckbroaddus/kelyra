import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { HoverTip } from '@/components/ui/HoverTip';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { listMessageDirectory, openGroupThread, openThread } from '@/lib/messages/api';
import { attachProfilePhotos } from '@/lib/people/photos';
import { formatHandle, isStaffRole, roleLabel } from '@/lib/school/roles';
import type { ProfileRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Person = ProfileRow & { photoUrl: string | null };

export default function NewMessageScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const { group } = useLocalSearchParams<{ group?: string }>();
  const groupMode = group === '1';
  const [people, setPeople] = useState<Person[] | null>(null);
  const [picked, setPicked] = useState<Person[]>([]);
  const [query, setQuery] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [adding, setAdding] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePushedTitle(groupMode ? 'New Group' : 'New Message');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void listMessageDirectory()
        .then((rows) => attachProfilePhotos(rows))
        .then((rows) => {
          if (!cancelled) setPeople(rows);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load people');
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const matches = useMemo(() => {
    if (!people) return [];
    const have = new Set(picked.map((row) => row.id));
    const needle = query.trim().toLowerCase();
    return people
      .filter((person) => person.id !== profile?.id && !have.has(person.id))
      .filter((person) => {
        if (!needle) return adding;
        const name = (person.display_name || '').toLowerCase();
        const handle = person.username.toLowerCase();
        const role = roleLabel(person.role).toLowerCase();
        return (
          name.includes(needle) ||
          handle.includes(needle) ||
          formatHandle(person.username).includes(needle) ||
          role.includes(needle)
        );
      });
  }, [people, picked, query, profile?.id, adding]);

  const grouped = useMemo(() => {
    const staff: Person[] = [];
    const parents: Person[] = [];
    const students: Person[] = [];
    for (const person of matches) {
      if (isStaffRole(person)) staff.push(person);
      else if (person.role === 'student') students.push(person);
      else parents.push(person);
    }
    return [
      { label: 'Staff', rows: staff },
      { label: 'Parents', rows: parents },
      { label: 'Students', rows: students },
    ].filter((group) => group.rows.length);
  }, [matches]);

  const addPerson = (person: Person) => {
    setPicked((current) => (current.some((row) => row.id === person.id) ? current : [...current, person]));
    setQuery('');
    setAdding(false);
    setError(null);
  };

  const removePerson = (id: string) => {
    setPicked((current) => current.filter((row) => row.id !== id));
    setAdding(true);
  };

  const start = async () => {
    if (!profile || !picked.length) {
      setError('Add someone to the To field.');
      return;
    }
    if (picked.length + 1 > 12) {
      setError('Group chats stay small. Pick at most 12 people.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id =
        picked.length === 1 && !groupMode
          ? await openThread(profile.id, picked[0]!.id)
          : await openGroupThread(
              groupTitle.trim() || picked.map((row) => row.display_name || row.username).join(', '),
              picked.map((row) => row.id),
            );
      router.replace(`/messages/${id}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start that chat');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen keyboard maxWidth={640}>
      {groupMode ? (
        <TextField
          label="Group name"
          placeholder="Optional"
          value={groupTitle}
          onChangeText={setGroupTitle}
        />
      ) : null}
      <View style={[styles.toRow, { borderBottomColor: colors.line }]}>
        <Text style={[styles.toLabel, { color: colors.mute }]}>To:</Text>
        <View style={styles.chips}>
          {picked.map((person) => (
            <Pressable
              key={person.id}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${person.display_name || person.username}`}
              onPress={() => removePerson(person.id)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: colors.brandSoft, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.ink }]}>
                {person.display_name || formatHandle(person.username)}
              </Text>
            </Pressable>
          ))}
          {adding || !picked.length ? (
            <TextInput
              placeholder={picked.length ? 'Add another name' : 'Type a name'}
              placeholderTextColor={colors.mute}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              style={[styles.toField, { color: colors.ink }]}
            />
          ) : null}
        </View>
        {picked.length ? (
          <HoverTip label="Add someone">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add someone"
              onPress={() => setAdding(true)}
              style={({ pressed }) => [styles.plus, { backgroundColor: colors.wash, opacity: pressed ? 0.8 : 1 }]}
            >
              <Icon name="plus" color={colors.ink} size={18} />
            </Pressable>
          </HoverTip>
        ) : null}
      </View>

      {people == null ? <WorkingLine /> : null}
      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
      {people && matches.length === 0 && (adding || query.trim()) ? (
        <Text style={[type.meta, { color: colors.mute }]}>
          {query.trim() ? 'No names match that search.' : 'Nobody you may message yet.'}
        </Text>
      ) : null}
      {grouped.map((group) => (
        <View key={group.label}>
          <SectionHeader label={`${group.label} · ${group.rows.length}`} />
          {group.rows.map((person) => (
            <ListRow
              key={person.id}
              title={person.display_name || formatHandle(person.username)}
              status={`${formatHandle(person.username)} · ${roleLabel(person.role)}`}
              avatarName={person.display_name || person.username}
              photoUrl={person.photoUrl}
              chevron={false}
              onPress={() => addPerson(person)}
            />
          ))}
        </View>
      ))}

      {picked.length ? (
        <View style={styles.actions}>
          <PrimaryButton
            label={
              busy
                ? 'Opening…'
                : picked.length === 1 && !groupMode
                  ? `Chat with ${picked[0]!.display_name || picked[0]!.username}`
                  : `Start group · ${picked.length + 1}`
            }
            disabled={busy}
            onPress={() => void start()}
          />
          <GhostButton
            align="left"
            label="Clear"
            onPress={() => {
              setPicked([]);
              setQuery('');
              setAdding(true);
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
  },
  toLabel: {
    ...type.body,
    fontWeight: '600',
    width: 32,
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  chip: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    ...type.meta,
    fontWeight: '600',
  },
  toField: {
    flexGrow: 1,
    minWidth: 120,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    minHeight: 36,
    padding: 0,
  },
  plus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
});
