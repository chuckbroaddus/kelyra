import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { GhostButton } from '@/components/ui/Button';
import { HoverTip } from '@/components/ui/HoverTip';
import { Icon } from '@/components/ui/Icon';
import { MessageComposer } from '@/components/ui/MessageComposer';
import { MessagePayloadView } from '@/components/ui/MessageAttach';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { chrome as chromeTokens, type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { formatMessageWhen } from '@/lib/format';
import {
  createPost,
  isFeedMuted,
  listFeed,
  listPostReplies,
  replyToPost,
  setFeedMuted,
  type FeedPost,
  type PostReply,
} from '@/lib/posts/api';
import { formatHandle, isAdminRole, isStaffRole } from '@/lib/school/roles';
import { useTheme } from '@/lib/theme/ThemeProvider';

const FEED_KIND_TABS = [
  { key: 'post', label: 'Post', icon: 'post' as const },
  { key: 'alert', label: 'Alert', icon: 'alert' as const },
];

type Scope = 'school' | 'class' | 'all';

type Props = {
  classId?: string | null;
  scope: Scope;
  /** Pin the composer; posts scroll underneath. Use with Screen scroll={false}. */
  fill?: boolean;
};

export function FeedPane({ classId = null, scope, fill = false }: Props) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const chrome = useChrome();
  const [dockH, setDockH] = useState(0);
  const dockReveal = useRef(new Animated.Value(1)).current;
  const feedRef = useRef<ScrollView>(null);
  const replyHost = useRef<View>(null);
  const scrollY = useRef(0);
  const [replyFocused, setReplyFocused] = useState(false);
  const [kb, setKb] = useState(0);
  const [rows, setRows] = useState<FeedPost[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [kind, setKind] = useState<'post' | 'alert'>('post');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boundClass = scope === 'class' ? classId : null;
  const canPost =
    Boolean(profile) &&
    profile?.role !== 'student' &&
    (boundClass ? isStaffRole(profile) : isAdminRole(profile));
  const canReply = Boolean(profile) && profile?.role !== 'student';
  const canMute = Boolean(profile) && profile?.role !== 'student';
  const canKind = canPost && (Boolean(boundClass) || isAdminRole(profile));

  const load = useCallback(async () => {
    setError(null);
    const next = await listFeed();
    setRows(next);
    if (profile && profile.role !== 'student') {
      setMuted(await isFeedMuted(boundClass).catch(() => false));
    }
  }, [boundClass, profile]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load feed'));
    }, [load]),
  );

  const dockOpen = replyFocused ? false : chrome.visible || chrome.keyboardVisible;

  useEffect(() => {
    Animated.timing(dockReveal, {
      toValue: dockOpen ? 1 : 0,
      duration: chromeTokens.motion.tray,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [dockOpen, dockReveal]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (event) => setKb(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => {
      setKb(0);
      setReplyFocused(false);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const keepReplyWithFeed = useCallback(() => {
    const node = replyHost.current;
    const scroller = feedRef.current;
    if (!node || !scroller) return;
    node.measureInWindow((_x, y, _w, h) => {
      const win = Dimensions.get('window').height;
      const cover = Platform.OS === 'ios' ? kb : 0;
      const targetBottom = win - cover - 12;
      const delta = y + h - targetBottom;
      if (Math.abs(delta) < 8) return;
      scroller.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: true });
    });
  }, [kb]);

  useEffect(() => {
    if (!replyFocused) return;
    const timer = setTimeout(keepReplyWithFeed, dockOpen ? 80 : 200);
    return () => clearTimeout(timer);
  }, [replyFocused, kb, dockOpen, keepReplyWithFeed]);

  const onFeedScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = event.nativeEvent.contentOffset.y;
      chrome.onScroll(event);
    },
    [chrome],
  );

  const visible = useMemo(() => {
    if (!rows) return null;
    if (scope === 'school') return rows.filter((row) => !row.classId);
    if (scope === 'class') return rows.filter((row) => row.classId === boundClass);
    return rows;
  }, [rows, scope, boundClass]);

  const publish = async (body: string, payload: Parameters<typeof createPost>[0]['payload']) => {
    setBusy(true);
    setError(null);
    try {
      await createPost({ classId: boundClass, kind, body, payload });
      chrome.refreshChrome();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const open = async (id: string) => {
    setOpenId(id);
    try {
      setReplies(await listPostReplies(id));
    } catch {
      setReplies([]);
    }
  };

  const sendReply = async (body: string, payload: Parameters<typeof createPost>[0]['payload']) => {
    if (!openId) return;
    setBusy(true);
    setError(null);
    try {
      await replyToPost(openId, body, payload);
      setReplies(await listPostReplies(openId));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reply');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const onToggleMute = () => {
    void setFeedMuted(boundClass, !muted)
      .then(() => {
        setMuted(!muted);
        return load();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not mute'));
  };

  const muteBtn = canMute ? (
    <HoverTip label={muted ? 'Unmute this feed' : 'Mute this feed'}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: muted }}
        accessibilityLabel={muted ? 'Unmute this feed' : 'Mute this feed'}
        onPress={onToggleMute}
        style={({ pressed }) => [styles.muteHit, pressed && { opacity: 0.85 }]}
      >
        <Icon name={muted ? 'mute' : 'speaker'} color={muted ? colors.brand : colors.mute} size={22} />
      </Pressable>
    </HoverTip>
  ) : null;

  const list = (
    <>
      {visible == null ? <WorkingLine /> : null}
      {visible?.length === 0 ? (
        <Text style={[type.body, { color: colors.mute, marginTop: 16 }]}>
          {muted ? 'This feed is muted.' : 'No posts yet.'}
        </Text>
      ) : null}
      {visible?.map((row) => (
        <Card key={row.id}>
          <Text style={[type.meta, { color: colors.mute }]}>
            {row.kind === 'alert' ? 'Alert' : 'Post'}
            {row.className ? ` · ${row.className}` : ' · School'}
            {` · ${formatMessageWhen(row.createdAt)}`}
          </Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            {row.authorName} {formatHandle(row.authorUsername)}
          </Text>
          {row.payload ? (
            <MessagePayloadView payload={row.payload} body={row.body} onOpenWork={() => {}} />
          ) : (
            <Text style={[type.body, { color: colors.ink }]}>{row.body}</Text>
          )}
          {row.kind === 'alert' ? null : (
            <>
              <GhostButton
                align="left"
                label={openId === row.id ? `${row.replyCount} replies` : `Replies · ${row.replyCount}`}
                onPress={() => void open(row.id)}
              />
              {openId === row.id ? (
                <>
                  {replies.map((item) => (
                    <View key={item.id} style={styles.reply}>
                      <Text style={[type.meta, { color: colors.mute }]}>
                        {item.authorName} · {formatMessageWhen(item.createdAt)}
                      </Text>
                      {item.payload ? (
                        <MessagePayloadView payload={item.payload} body={item.body} onOpenWork={() => {}} />
                      ) : (
                        <Text style={[type.body, { color: colors.ink }]}>{item.body}</Text>
                      )}
                    </View>
                  ))}
                  {canReply ? (
                    <View ref={replyHost} collapsable={false} style={styles.replyComposer}>
                      <MessageComposer
                        layout="feed"
                        placeholder="Write a reply"
                        busy={busy}
                        onSend={sendReply}
                        onError={setError}
                        onFocusChange={(on) => {
                          if (on) setReplyFocused(true);
                        }}
                      />
                    </View>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </Card>
      ))}
    </>
  );

  return (
    <View style={fill ? styles.fill : undefined}>
      {canPost ? (
        <Animated.View
          pointerEvents={dockOpen ? 'auto' : 'none'}
          style={[
            styles.dockClip,
            dockH > 0
              ? {
                  height: dockReveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, dockH],
                  }),
                  opacity: dockReveal,
                }
              : null,
          ]}
        >
          <View
            style={[styles.dock, dockH > 0 ? styles.dockAbs : null]}
            onLayout={(event) => {
              const next = Math.ceil(event.nativeEvent.layout.height);
              if (next > 0) setDockH(next);
            }}
          >
            {canKind ? (
              <PersonTabs
                tabs={FEED_KIND_TABS}
                value={kind}
                onChange={(key) => setKind(key === 'alert' ? 'alert' : 'post')}
                trailing={muteBtn}
              />
            ) : muteBtn ? (
              <View style={[styles.muteRow, { borderBottomColor: colors.line }]}>{muteBtn}</View>
            ) : null}
            <View style={styles.composer}>
              <MessageComposer
                layout="feed"
                placeholder={kind === 'alert' ? 'Urgent note for families' : 'Write a post'}
                busy={busy}
                onSend={publish}
                onError={setError}
                onFocusChange={(on) => {
                  if (on) setReplyFocused(false);
                }}
              />
            </View>
          </View>
        </Animated.View>
      ) : null}
      {!canPost && muteBtn ? (
        <View style={[styles.muteRow, { borderBottomColor: colors.line }]}>{muteBtn}</View>
      ) : null}
      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
      {fill ? (
        <ScrollView
          ref={feedRef}
          style={styles.feed}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onFeedScroll}
          contentContainerStyle={{ paddingBottom: 24 + (replyFocused ? Math.max(kb, 48) : 24) }}
        >
          {list}
        </ScrollView>
      ) : (
        list
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    minHeight: 0,
  },
  dockClip: {
    overflow: 'hidden',
    flexShrink: 0,
  },
  dock: {
    flexShrink: 0,
  },
  dockAbs: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  composer: { marginTop: 8, marginBottom: 12 },
  muteHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginHorizontal: -4,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  feed: {
    flex: 1,
    minHeight: 0,
  },
  reply: { marginTop: 8, gap: 2 },
  replyComposer: { marginTop: 8 },
});
