import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { AvatarTray } from '@/components/ui/AvatarTray';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { firstName } from '@/lib/format';
import {
  createParent,
  listParentsForClass,
  type ClassParent,
} from '@/lib/parents/api';
import { deleteParent } from '@/lib/parents/delete';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ParentsScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const router = useRouter();
  const { id: classId } = useLocalSearchParams<{ id: string }>();
  const { teacher } = useAuth();
  const [linked, setLinked] = useState<ClassParent[]>([]);
  const [unlinked, setUnlinked] = useState<ClassParent[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ClassParent | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!classId) return;
    const next = await listParentsForClass(classId);
    setLinked(next.linked);
    setUnlinked(next.unlinked);
  }, [classId]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load parents');
      });
    }, [load]),
  );

  useEffect(() => {
    chrome.setPushedTitle(null);
    return () => chrome.setPushedTitle(null);
  }, [chrome]);

  const onAdd = async () => {
    if (!teacher) return;
    setError(null);
    try {
      const created = await createParent({
        teacherId: teacher.id,
        displayName: name,
        alsoInvite: true,
      });
      setName('');
      await load();
      router.push(`/class/${classId}/parent/${created.parent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add parent');
    }
  };

  const onDelete = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await deleteParent(pending.id);
      setPending(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete parent');
    } finally {
      setBusy(false);
    }
  };

  const all = [...linked, ...unlinked];

  return (
    <Screen keyboard maxWidth={640}>
      {all.length ? (
        <AvatarTray
          people={all.map((parent) => ({
            id: parent.id,
            name: parent.display_name,
            photoUrl: parent.photoUrl,
          }))}
          onPress={(person) => router.push(`/class/${classId}/parent/${person.id}`)}
        />
      ) : (
        <Text style={[styles.empty, { color: colors.mute }]}>No parents yet.</Text>
      )}

      <TextField
        placeholder="Amina Chen"
        value={name}
        onChangeText={setName}
        returnKeyType="done"
        onSubmitEditing={() => void onAdd()}
      />
      <View style={styles.gap} />
      <PrimaryButton label={name.trim() ? `Add ${name.trim()}` : 'Add parent'} onPress={() => void onAdd()} />
      <GhostButton
        align="left"
        label="Photograph a contact card"
        onPress={() => chrome.openHeaderCamera()}
      />

      {linked.map((parent) => (
        <ListRow
          key={parent.id}
          title={parent.display_name}
          status={parent.children.map((child) => firstName(child.display_name)).join(', ')}
          statusNode={<LinkedKids kids={parent.children} />}
          photoUrl={parent.photoUrl}
          onPress={() => router.push(`/class/${classId}/parent/${parent.id}`)}
          trailing={[
            {
              key: 'delete',
              label: 'Delete',
              tone: 'danger',
              autoCommit: false,
              onPress: () => setPending(parent),
            },
          ]}
        />
      ))}

      {unlinked.length ? <SectionHeader label="Not linked yet" /> : null}
      {unlinked.map((parent) => (
        <ListRow
          key={parent.id}
          title={parent.display_name}
          photoUrl={parent.photoUrl}
          onPress={() => router.push(`/class/${classId}/parent/${parent.id}`)}
          trailing={[
            {
              key: 'delete',
              label: 'Delete',
              tone: 'danger',
              autoCommit: false,
              onPress: () => setPending(parent),
            },
          ]}
        />
      ))}

      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PhaseBanner
        phase={4}
        compact
        detail="People and invite links. Open a parent to link children. They see the focus skill — not the grade book."
      />

      <ConfirmSheet
        visible={Boolean(pending)}
        title={`Delete ${pending?.display_name ?? 'parent'}?`}
        body={`Their invite links die. Students stay. This cannot be undone.`}
        confirmLabel={`Delete ${pending ? firstName(pending.display_name) : 'parent'}`}
        typeName={pending?.display_name}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void onDelete()}
      />
    </Screen>
  );
}

function LinkedKids({
  kids,
}: {
  kids: Array<{ id: string; display_name: string; photoUrl: string | null }>;
}) {
  const { colors } = useTheme();
  if (!kids.length) return null;
  return (
    <View style={styles.kids}>
      {kids.map((child) => (
        <View key={child.id} style={styles.kid}>
          <Avatar name={child.display_name} photoUrl={child.photoUrl} size={28} />
          <MarqueeText
            text={firstName(child.display_name)}
            align="start"
            fadeColor={colors.bg}
            style={[styles.kidName, { color: colors.ink }]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...type.body,
    marginBottom: 12,
  },
  kids: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  kid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 120,
  },
  kidName: {
    ...type.badge,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  gap: {
    height: 12,
  },
  error: {
    ...type.body,
    marginTop: 12,
  },
});
