import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { ClassTabs } from '@/components/ui/ClassTabs';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { isAdminRole, isOfficeRole } from '@/lib/school/roles';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { firstName } from '@/lib/format';
import { openGroupThread } from '@/lib/messages/api';
import {
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
  const { profile } = useAuth();
  const office = isOfficeRole(profile);
  const admin = isAdminRole(profile);
  const [linked, setLinked] = useState<ClassParent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ClassParent | null>(null);
  const [busy, setBusy] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  /** parent_id → profile id when known; null = lookup not finished yet */
  const [loginByParentId, setLoginByParentId] = useState<Record<string, string> | null>(null);
  /** CTA-adjacent send / login hint (not the buried bottom error) */
  const [sendHint, setSendHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!classId) return;
    const next = await listParentsForClass(classId);
    setLinked(next.linked);
  }, [classId]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load parents');
      });
    }, [load]),
  );

  const selectableParentIds = useMemo(() => {
    if (loginByParentId == null) return linked.map((parent) => parent.id);
    return linked.filter((parent) => loginByParentId[parent.id]).map((parent) => parent.id);
  }, [linked, loginByParentId]);

  const allSelected = useMemo(
    () =>
      selectableParentIds.length > 0 &&
      selectableParentIds.every((id) => picked.includes(id)),
    [selectableParentIds, picked],
  );

  const hasNeedsLoginRows = useMemo(
    () =>
      loginByParentId != null &&
      linked.some((parent) => !loginByParentId[parent.id]),
    [linked, loginByParentId],
  );

  const exitMessaging = () => {
    setMessaging(false);
    setPicked([]);
    setLoginByParentId(null);
    setSendHint(null);
  };

  const loadParentLogins = (parentIds: string[]) => {
    setLoginByParentId(null);
    if (!parentIds.length) {
      setLoginByParentId({});
      return;
    }
    void (async () => {
      const { data, error: queryError } = await requireSupabase()
        .from('profiles')
        .select('id, parent_id')
        .in('parent_id', parentIds);
      if (queryError) {
        setLoginByParentId({});
        return;
      }
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        if (row.parent_id) map[row.parent_id] = row.id;
      }
      setLoginByParentId(map);
    })();
  };

  const enterMessaging = () => {
    setMessaging(true);
    setPicked([]);
    setSendHint(null);
    loadParentLogins(linked.map((parent) => parent.id));
  };

  const togglePick = (parentId: string) => {
    setSendHint(null);
    setPicked((current) =>
      current.includes(parentId) ? current.filter((id) => id !== parentId) : [...current, parentId],
    );
  };

  const toggleSelectAll = () => {
    setSendHint(null);
    setPicked(allSelected ? [] : selectableParentIds);
  };

  const overCap = picked.length > 11;
  const missingLoginAmongPicked =
    loginByParentId == null
      ? 0
      : picked.filter((id) => !loginByParentId[id]).length;
  const noneHaveLogin =
    loginByParentId != null &&
    picked.length > 0 &&
    missingLoginAmongPicked === picked.length;

  const sendMessage = () => {
    if (!picked.length || overCap) return;
    setSendHint(null);
    void (async () => {
      const { data, error: queryError } = await requireSupabase()
        .from('profiles')
        .select('id, parent_id')
        .in('parent_id', picked);
      if (queryError) {
        setSendHint(queryError.message || 'Could not look up parent logins.');
        return;
      }
      const rows = data ?? [];
      const ids = rows.map((row) => row.id);
      const found = new Set(rows.map((row) => row.parent_id).filter(Boolean) as string[]);
      const missingCount = picked.filter((id) => !found.has(id)).length;
      if (rows.length) {
        setLoginByParentId((current) => {
          const next = { ...(current ?? {}) };
          for (const row of rows) {
            if (row.parent_id) next[row.parent_id] = row.id;
          }
          return next;
        });
      }
      if (!ids.length) {
        setSendHint(
          picked.length === 1
            ? 'That parent needs a login first.'
            : 'Those parents need logins first.',
        );
        return;
      }
      if (missingCount > 0) {
        setSendHint(
          `Messaging ${ids.length} of ${picked.length} — ${missingCount} need login${missingCount === 1 ? '' : 's'}`,
        );
      }
      const thread = await openGroupThread('Parents', ids);
      router.push(`/messages/${thread}` as never);
    })().catch((err) =>
      setSendHint(err instanceof Error ? err.message : 'Could not start group'),
    );
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

  return (
    <Screen keyboard maxWidth={640} collapse={classId ? <ClassTabs classId={classId} /> : null}>
      <SectionHeader label="Parents of class' students" first />
      {linked.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          {office
            ? 'No parents linked to students in this class yet.'
            : 'No parents linked to students in this class yet. The office manages the class family list.'}
        </Text>
      ) : null}
      {messaging && linked.length ? (
        <View>
          <View style={styles.selectAllRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allSelected }}
              accessibilityLabel="Select all parents"
              onPress={toggleSelectAll}
              style={styles.selectAll}
            >
              <CheckBox checked={allSelected} />
              <Text style={[styles.selectAllLabel, { color: colors.mute }]}>Select all</Text>
            </Pressable>
            <GhostButton align="left" label="Cancel" onPress={exitMessaging} />
          </View>
          {hasNeedsLoginRows ? (
            <Text style={[type.meta, { color: colors.mute, paddingHorizontal: 4, marginBottom: 4 }]}>
              Grayed-out parents need a login before you can message them. The office can create logins.
            </Text>
          ) : null}
        </View>
      ) : null}
      {linked.map((parent) => {
        const checked = picked.includes(parent.id);
        const loginKnown = loginByParentId != null;
        const hasLogin = !loginKnown || Boolean(loginByParentId[parent.id]);
        const row = (
          <ListRow
            title={parent.display_name}
            status={
              messaging && loginKnown && !hasLogin
                ? 'Needs login'
                : parent.children.map((child) => firstName(child.display_name)).join(', ')
            }
            statusNode={
              messaging && loginKnown && !hasLogin ? undefined : (
                <LinkedKids kids={parent.children} />
              )
            }
            photoUrl={parent.photoUrl}
            hasPhoto={Boolean(parent.photo_asset_id)}
            selected={messaging ? checked : false}
            chevron={!messaging}
            onPress={() => {
              if (messaging) {
                if (!hasLogin) {
                  setSendHint('That parent needs a login first.');
                  return;
                }
                togglePick(parent.id);
                return;
              }
              router.push(`/class/${classId}/parent/${parent.id}`);
            }}
            trailing={
              messaging || !office
                ? undefined
                : [
                    {
                      key: 'remove',
                      label: 'Remove',
                      tone: 'wash' as const,
                      onPress: () => {
                        if (!classId) return;
                        void removeParentFromClass(classId, parent.id)
                          .then(() => load())
                          .catch((err) =>
                            setError(err instanceof Error ? err.message : 'Could not remove parent'),
                          );
                      },
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
                  ]
            }
          />
        );
        if (!messaging) {
          return <View key={parent.id}>{row}</View>;
        }
        return (
          <View key={parent.id} style={[styles.selectRow, !hasLogin ? { opacity: 0.55 } : null]}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: !hasLogin }}
              accessibilityLabel={
                hasLogin
                  ? `Select ${parent.display_name}`
                  : `${parent.display_name}, needs login`
              }
              disabled={!hasLogin}
              onPress={() => {
                if (!hasLogin) {
                  setSendHint('That parent needs a login first.');
                  return;
                }
                togglePick(parent.id);
              }}
              style={styles.checkHit}
            >
              <CheckBox checked={checked} />
            </Pressable>
            <View style={styles.selectRowBody}>{row}</View>
          </View>
        );
      })}
      {linked.length ? (
        messaging ? (
          <View style={styles.footer}>
            {overCap ? (
              <Text style={[type.meta, { color: colors.mute }]}>
                Group chats stay small. Pick at most 11 parents.
              </Text>
            ) : null}
            {!overCap && missingLoginAmongPicked > 0 ? (
              <Text style={[type.meta, { color: colors.mute }]}>
                {missingLoginAmongPicked === picked.length
                  ? picked.length === 1
                    ? 'That parent needs a login first.'
                    : 'Those parents need logins first.'
                  : `${missingLoginAmongPicked} of these parents need logins — send will message the rest`}
              </Text>
            ) : null}
            {!overCap && sendHint ? (
              <Text
                style={[
                  type.meta,
                  {
                    color: sendHint.startsWith('Messaging ') ? colors.mute : colors.danger,
                  },
                ]}
              >
                {sendHint}
              </Text>
            ) : null}
            <PrimaryButton
              label={
                picked.length
                  ? `Message ${picked.length} parent${picked.length === 1 ? '' : 's'}`
                  : 'Message these parents'
              }
              disabled={!picked.length || overCap || noneHaveLogin}
              onPress={sendMessage}
            />
          </View>
        ) : (
          <PrimaryButton label="Message these parents" onPress={enterMessaging} />
        )
      ) : null}

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
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

function CheckBox({ checked }: { checked: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.check,
        {
          borderColor: checked ? colors.brand : colors.line,
          backgroundColor: checked ? colors.brand : colors.card,
        },
      ]}
    >
      {checked ? <Icon name="check" color={colors.brandInk} size={16} /> : null}
    </View>
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
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    flexShrink: 1,
  },
  selectAllLabel: {
    ...type.meta,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkHit: {
    paddingTop: 14,
    paddingRight: 10,
    paddingLeft: 4,
  },
  selectRowBody: {
    flex: 1,
    minWidth: 0,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: 8,
    marginTop: 8,
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
  error: {
    ...type.body,
    marginTop: 12,
  },
});
