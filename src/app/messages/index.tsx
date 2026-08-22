import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeedPane } from '@/components/ui/FeedPane';
import { ListRow } from '@/components/ui/ListRow';
import { MessagesMenu } from '@/components/ui/MessagesMenu';
import { MessagesTray } from '@/components/ui/MessagesTray';
import { NotificationsPane } from '@/components/ui/NotificationsPane';
import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
import { Screen } from '@/components/ui/Screen';
import { ThreadAvatar } from '@/components/ui/ThreadAvatar';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { listMyFeeds, type FeedRef } from '@/lib/feeds/api';
import { formatThreadWhen } from '@/lib/format';
import {
  listThreads,
  setThreadPinned,
  threadDisplayName,
  type ThreadPreview,
} from '@/lib/messages/api';
import { formatHandle } from '@/lib/school/roles';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Filter = 'all' | 'unread' | 'groups';

export default function MessagesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const chrome = useChrome();
  const refreshChrome = chrome.refreshChrome;
  const { profile } = useAuth();
  const [threads, setThreads] = useState<ThreadPreview[] | null>(null);
  const [feeds, setFeeds] = useState<FeedRef[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const [nextThreads, nextFeeds] = await Promise.all([
        listThreads(profile.id),
        listMyFeeds(profile),
      ]);
      setThreads(nextThreads);
      setFeeds(nextFeeds);
    } catch (err) {
      setThreads([]);
      setError(err instanceof Error ? err.message : 'Could not load messages');
    }
    refreshChrome();
  }, [profile, refreshChrome]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const tabs: PersonTab[] = useMemo(
    () => [
      { key: 'messages', label: 'Messages', icon: 'chat' },
      ...feeds.map((feed) => ({
        key: feed.key,
        label: feed.name,
        icon: feed.icon,
      })),
      { key: 'alerts', label: 'Alerts', icon: 'alert' as const, badge: chrome.badgeCount },
    ],
    [chrome.badgeCount, feeds],
  );

  const requested = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  const pane = tabs.some((item) => item.key === requested) ? requested! : 'messages';
  const setPane = (key: string) => {
    router.setParams({ tab: key });
  };
  const activeFeed = feeds.find((feed) => feed.key === pane) ?? null;
  const onMessages = pane === 'messages';
  const onAlerts = pane === 'alerts';
  const fillFeed = Boolean(activeFeed);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (threads ?? []).filter((thread) => {
      if (thread.pinned) return false;
      if (filter === 'unread' && !thread.unread) return false;
      if (filter === 'groups' && thread.kind !== 'group') return false;
      if (!needle) return true;
      const name = threadDisplayName(thread).toLowerCase();
      const preview = (thread.lastBody ?? '').toLowerCase();
      const handle = thread.other?.username ? formatHandle(thread.other.username).toLowerCase() : '';
      return name.includes(needle) || preview.includes(needle) || handle.includes(needle);
    });
  }, [threads, query, filter]);

  const favorites = (threads ?? []).filter((thread) => thread.pinned);

  const openThread = (id: string) => router.push(`/messages/${id}` as never);

  const togglePin = async (thread: ThreadPreview) => {
    try {
      await setThreadPinned(thread.id, !thread.pinned);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update favorite');
    }
  };

  if (!profile) {
    return (
      <Screen>
        <Text style={[type.body, { color: colors.mute }]}>Sign in to message people at this school.</Text>
      </Screen>
    );
  }

  return (
    <View style={styles.shell}>
    <Screen
      keyboard={onMessages || fillFeed}
      maxWidth={640}
      scroll={!fillFeed}
      avoidKeyboard={!fillFeed}
    >
      <PersonTabs tabs={tabs} value={pane} onChange={setPane} />
      {onMessages ? (
        <>
          {favorites.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.favRow}
            >
              {favorites.map((thread) => {
                const name = threadDisplayName(thread);
                return (
                  <Pressable
                    key={thread.id}
                    accessibilityRole="button"
                    accessibilityLabel={thread.unread ? `Unread. ${name}` : name}
                    onPress={() => openThread(thread.id)}
                    onLongPress={() => void togglePin(thread)}
                    style={({ pressed }) => [styles.fav, pressed && { opacity: 0.8 }]}
                  >
                    <ThreadAvatar
                      name={name}
                      faces={thread.faces}
                      photoUrl={thread.photoUrl}
                      size={64}
                      unread={thread.unread}
                    />
                    <Text
                      style={[styles.favName, { color: thread.unread ? colors.brand : colors.ink }]}
                      numberOfLines={1}
                    >
                      {name.split(/\s+/)[0] || name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {threads == null ? <WorkingLine /> : null}
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          {threads && visible.length === 0 ? (
            <Text style={[type.body, { color: colors.mute }]}>
              {threads.length === 0
                ? 'No messages yet. Tap the compose icon to start one.'
                : favorites.length && !query.trim() && filter === 'all'
                  ? 'Favorites are at the top. Unpin one to see it in the list again.'
                  : 'No matches.'}
            </Text>
          ) : null}

          {visible.map((thread) => {
            const name = threadDisplayName(thread);
            const preview = thread.lastBody
              ? `${thread.lastFromMe ? 'You: ' : ''}${thread.lastBody}`
              : thread.kind === 'group'
                ? `${thread.memberCount} people`
                : 'No messages yet';
            return (
              <ListRow
                key={thread.id}
                title={name}
                status={`${preview}${thread.muted ? ' · Muted' : ''}`}
                unread={thread.unread}
                avatar={
                  <ThreadAvatar
                    name={name}
                    faces={thread.faces}
                    photoUrl={thread.photoUrl}
                    size={52}
                    unread={thread.unread}
                  />
                }
                right={
                  <Text style={[styles.when, { color: thread.unread ? colors.brand : colors.mute }]}>
                    {formatThreadWhen(thread.lastMessageAt)}
                  </Text>
                }
                chevron={false}
                onPress={() => openThread(thread.id)}
                trailing={[
                  {
                    key: 'pin',
                    label: thread.pinned ? 'Unpin' : 'Favorite',
                    tone: 'brand',
                    autoCommit: true,
                    onPress: () => void togglePin(thread),
                  },
                ]}
              />
            );
          })}

        </>
      ) : null}

      {activeFeed ? (
        <FeedPane
          classId={activeFeed.kind === 'class' ? activeFeed.id : null}
          scope={activeFeed.kind === 'class' ? 'class' : 'school'}
          fill
        />
      ) : null}

      {onAlerts ? <NotificationsPane /> : null}
    </Screen>
    {onMessages ? (
      <>
        <MessagesTray
          query={query}
          onQuery={setQuery}
          onCompose={() => router.push('/messages/new' as never)}
          onMenu={() => setMenuOpen(true)}
        />
        <MessagesMenu
          visible={menuOpen}
          filter={filter}
          onFilter={setFilter}
          onNewGroup={() => {
            setMenuOpen(false);
            router.push('/messages/new?group=1' as never);
          }}
          onClose={() => setMenuOpen(false)}
        />
      </>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  favRow: {
    gap: 16,
    paddingVertical: 8,
    paddingRight: 12,
  },
  fav: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  favName: {
    ...type.meta,
    width: '100%',
    textAlign: 'center',
  },
  when: {
    ...type.meta,
    marginLeft: 8,
  },
  error: {
    ...type.body,
    marginBottom: 8,
  },
});
