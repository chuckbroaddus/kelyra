import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { AvatarTray } from '@/components/ui/AvatarTray';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow } from '@/components/ui/ListRow';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { ClassTabs } from '@/components/ui/ClassTabs';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { isAdminRole } from '@/lib/school/roles';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { firstName } from '@/lib/format';
import { openGroupThread } from '@/lib/messages/api';
import {
  addParentToClass,
  createParent,
  listParentsForClass,
  removeParentFromClass,
  type ClassParent,
} from '@/lib/parents/api';
import { requireSupabase } from '@/lib/supabase/client';
import { deleteParent } from '@/lib/parents/delete';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ParentsScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  usePushedTitle(chrome.className ?? 'Class');
  const router = useRouter();
  const { id: classId } = useLocalSearchParams<{ id: string }>();
  const { teacher, profile } = useAuth();
  const admin = isAdminRole(profile);
  const [linked, setLinked] = useState<ClassParent[]>([]);
  const [unlinked, setUnlinked] = useState<ClassParent[]>([]);
  const [available, setAvailable] = useState<ClassParent[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ClassParent | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!classId) return;
    const next = await listParentsForClass(classId);
    setLinked(next.linked);
    setUnlinked(next.unlinked);
    setAvailable(next.available);
  }, [classId]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load parents');
      });
    }, [load]),
  );



  const onAdd = async () => {
    if (!teacher) return;
    setError(null);
    try {
      const created = await createParent({
        teacherId: teacher.id,
        displayName: name,

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

  const addParent = (parent: ClassParent) => {
    if (!classId) return;
    void addParentToClass(
      classId,
      parent.id,
      parent.children.map((child) => child.id),
    )
      .then((n) => {
        if (!n && !parent.children.length) {
          router.push(`/class/${classId}/parent/${parent.id}`);
          return;
        }
        return load();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not add parent'));
  };

  const all = [...linked, ...available];

  return (
    <Screen keyboard maxWidth={640}>
      {classId ? <ClassTabs classId={classId} /> : null}
      {all.length ? (
        <AvatarTray
          people={all.map((parent) => ({
            id: parent.id,
            name: parent.display_name,
            photoUrl: parent.photoUrl,
            hasPhoto: Boolean(parent.photo_asset_id),
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
      <IconButton name="capture" label="Photograph a contact card" onPress={() => chrome.openHeaderCamera()} />

      <SectionHeader label="In this class" />
      {linked.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>No parents linked to students in this class yet.</Text>
      ) : null}
      {linked.map((parent) => (
        <ListRow
          key={parent.id}
          title={parent.display_name}
          status={parent.children.map((child) => firstName(child.display_name)).join(', ')}
          statusNode={<LinkedKids kids={parent.children} />}
          photoUrl={parent.photoUrl}
          hasPhoto={Boolean(parent.photo_asset_id)}
          selected={picked.includes(parent.id)}
          onPress={() => {
            if (picking) {
              setPicked((current) =>
                current.includes(parent.id) ? current.filter((id) => id !== parent.id) : [...current, parent.id],
              );
              return;
            }
            router.push(`/class/${classId}/parent/${parent.id}`);
          }}
          trailing={[
            {
              key: 'remove',
              label: 'Remove',
              tone: 'wash',
              onPress: () => {
                if (!classId) return;
                void removeParentFromClass(classId, parent.id)
                  .then(() => load())
                  .catch((err) => setError(err instanceof Error ? err.message : 'Could not remove parent'));
              },
            },
          ]}
        />
      ))}
      {linked.length ? (
        <GhostButton
          align="left"
          label={picking ? 'Cancel pick' : 'Message these parents'}
          onPress={() => {
            setPicking((value) => !value);
            setPicked([]);
          }}
        />
      ) : null}
      {picking ? (
        <PrimaryButton
          label={`Message ${picked.length} parent${picked.length === 1 ? '' : 's'}`}
          disabled={!picked.length}
          onPress={() => {
            if (picked.length > 11) {
              setError('Group chats stay small. Pick at most 11 parents.');
              return;
            }
            void (async () => {
              const { data } = await requireSupabase()
                .from('profiles')
                .select('id')
                .in('parent_id', picked);
              const ids = (data ?? []).map((row) => row.id);
              if (!ids.length) {
                setError('Those parents need logins first.');
                return;
              }
              const thread = await openGroupThread('Parents', ids);
              router.push(`/messages/${thread}` as never);
            })().catch((err) => setError(err instanceof Error ? err.message : 'Could not start group'));
          }}
        />
      ) : null}

      <SectionHeader label="All parents" />
      {available.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          Parents not yet on this class show up here. Swipe left to add.
        </Text>
      ) : null}
      {available.map((parent) => (
        <ListRow
          key={parent.id}
          title={parent.display_name}
          status={parent.children.map((child) => firstName(child.display_name)).join(', ') || undefined}
          photoUrl={parent.photoUrl}
          hasPhoto={Boolean(parent.photo_asset_id)}
          onPress={() => router.push(`/class/${classId}/parent/${parent.id}`)}
          trailing={[
            {
              key: 'add',
              label: 'Add',
              tone: 'brand',
              onPress: () => addParent(parent),
            },
            ...(admin
              ? [
                  {
                    key: 'delete',
                    label: 'Delete',
                    tone: 'danger' as const,
                    autoCommit: false,
                    onPress: () => setPending(parent),
                  },
                ]
              : []),
          ]}
        />
      ))}

      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PhaseBanner
        phase={4}
        compact
        detail="Open a parent to link children. They sign in and see the focus skill — not the grade book."
      />

      {admin ? (
        <ConfirmSheet
          visible={Boolean(pending)}
          title={`Delete ${pending?.display_name ?? 'parent'}?`}
          body="The parent card is removed. Students stay. This cannot be undone."
          confirmLabel={`Delete ${pending ? firstName(pending.display_name) : 'parent'}`}
          typeName={pending?.display_name}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={() => void onDelete()}
        />
      ) : null}
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
