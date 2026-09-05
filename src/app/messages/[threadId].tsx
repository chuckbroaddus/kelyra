import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WebCameraCapture } from '@/components/WebCameraCapture';
import { Avatar } from '@/components/ui/Avatar';
import { MessagePayloadView } from '@/components/ui/MessageAttach';
import { MessageComposer } from '@/components/ui/MessageComposer';
import { ThreadAvatar } from '@/components/ui/ThreadAvatar';
import { FormSheet } from '@/components/ui/FormSheet';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { DangerButton } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { formatMessageWhen } from '@/lib/format';
import {
  addGroupMember,
  getThread,
  isThreadMuted,
  listMessageDirectory,
  listMessages,
  listPeopleByIds,
  listThreadMembers,
  markRead,
  removeGroupMember,
  replaceThreadPhoto,
  sendMessage,
  setThreadPhoto,
  setThreadMuted,
  subscribeThread,
  type ThreadPerson,
} from '@/lib/messages/api';
import { pickGroupPhoto, signedMessageUrl } from '@/lib/messages/attachments';
import { webCameraNeeded } from '@/lib/media/pickPhoto';
import { formatHandle, isAdminRole, isStaffRole, roleLabel } from '@/lib/school/roles';
import type { MessageRow, MessageThreadKind, MessageWorkCard, ProfileRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ThreadScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const refreshChrome = chrome.refreshChrome;
  const router = useRouter();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { profile } = useAuth();
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [members, setMembers] = useState<ThreadPerson[]>([]);
  const [peopleById, setPeopleById] = useState<Map<string, ThreadPerson>>(new Map());
  const [kind, setKind] = useState<MessageThreadKind>('direct');
  const [title, setTitle] = useState('Message');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [candidates, setCandidates] = useState<ProfileRow[]>([]);
  const [pending, setPending] = useState<{ kind: 'leave' } | { kind: 'remove'; id: string; name: string } | null>(
    null,
  );
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const pinEnd = useRef(true);
  const photoBusy = useRef(false);
  const staff = isStaffRole(profile);
  const admin = isAdminRole(profile);

  const load = useCallback(async () => {
    if (!threadId || !profile || photoBusy.current) return;
    const [thread, nextMembers, messages] = await Promise.all([
      getThread(threadId),
      listThreadMembers(threadId),
      listMessages(threadId),
    ]);
    const others = nextMembers.filter((row) => row.id !== profile.id);
    const known = new Set(nextMembers.map((row) => row.id));
    const missing = [...new Set(messages.map((row) => row.sender_id).filter((id) => !known.has(id)))];
    const extras = missing.length ? await listPeopleByIds(missing) : [];
    const byId = new Map([...nextMembers, ...extras].map((row) => [row.id, row]));
    if (photoBusy.current) return;
    setKind(thread.kind === 'group' ? 'group' : 'direct');
    setMembers(nextMembers);
    setPeopleById(byId);
    setPhotoUrl(thread.photo_path ? await signedMessageUrl('photo', thread.photo_path, 'thumb') : null);
    setTitle(
      thread.kind === 'group'
        ? thread.title ||
            others.map((person) => person.display_name || person.username).slice(0, 3).join(', ') ||
            `Group · ${nextMembers.length}`
        : others[0]?.display_name || others[0]?.username || 'Message',
    );
    setMuted(await isThreadMuted(threadId, profile.id));
    setRows(messages);
    await markRead(threadId, profile.id);
    refreshChrome();
  }, [threadId, profile, refreshChrome]);

  usePushedTitle(title);

  const ingest = useCallback(
    async (row: MessageRow) => {
      if (!threadId || !profile) return;
      setRows((current) => (current.some((item) => item.id === row.id) ? current : [...current, row]));
      if (row.sender_id && row.sender_id !== profile.id) {
        void listPeopleByIds([row.sender_id]).then((extra) => {
          if (!extra.length) return;
          setPeopleById((current) => {
            const next = new Map(current);
            extra.forEach((person) => next.set(person.id, person));
            return next;
          });
        });
      }
      await markRead(threadId, profile.id);
      refreshChrome();
    },
    [threadId, profile, refreshChrome],
  );

  useFocusEffect(
    useCallback(() => {
      pinEnd.current = true;
      void load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load'));
      if (!threadId) return undefined;
      const stop = subscribeThread(threadId, (row) => {
        void ingest(row);
      });
      const poll = setInterval(() => {
        void listMessages(threadId)
          .then((messages) => {
            setRows((current) => {
              if (messages.length === current.length && messages.at(-1)?.id === current.at(-1)?.id) return current;
              return messages;
            });
          })
          .catch(() => undefined);
      }, 3000);
      return () => {
        stop();
        clearInterval(poll);
      };
    }, [load, threadId, ingest]),
  );

  useEffect(() => {
    if (!pinEnd.current) return;
    const id = requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(id);
  }, [rows]);

  const onSend = async (body: string, payload: Parameters<typeof sendMessage>[3]) => {
    if (!threadId || !profile) return;
    pinEnd.current = true;
    await sendMessage(threadId, profile.id, body, payload);
    await load();
  };

  const openCard = (payload: MessageWorkCard) => {
    const classId = chrome.classId;
    if (payload.assignment_id && classId) {
      router.push(`/class/${classId}/assignment/${payload.assignment_id}`);
      return;
    }
    if (payload.student_id && classId) {
      router.push(`/class/${classId}/student/${payload.student_id}`);
      return;
    }
    if ((payload.assignment_id || payload.student_id) && !classId) {
      setError('Could not open that work — no active class.');
      return;
    }
    router.push('/todo');
  };

  const applyPhoto = async (uri: string, mimeType: string) => {
    if (!threadId || !profile) return;
    photoBusy.current = true;
    setError(null);
    setPhotoUrl(uri);
    try {
      setPhotoUrl(await replaceThreadPhoto(threadId, profile.id, uri, mimeType));
    } catch (err) {
      setPhotoUrl(null);
      setError(err instanceof Error ? err.message : 'Could not set photo');
    } finally {
      photoBusy.current = false;
    }
  };

  const onPickPhoto = async (fromCamera: boolean) => {
    setPhotoOpen(false);
    if (fromCamera && webCameraNeeded(true)) {
      setCameraOpen(true);
      return;
    }
    photoBusy.current = true;
    try {
      const picked = await pickGroupPhoto(fromCamera);
      if (!picked) {
        photoBusy.current = false;
        return;
      }
      await applyPhoto(picked.uri, picked.mimeType);
    } catch (err) {
      photoBusy.current = false;
      setError(err instanceof Error ? err.message : 'Could not set photo');
    }
  };

  const openAdd = async () => {
    if (!threadId) return;
    try {
      const directory = await listMessageDirectory();
      const have = new Set(members.map((row) => row.id));
      setCandidates(directory.filter((row) => !have.has(row.id)));
      setAddOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load people');
    }
  };

  const confirmPending = async () => {
    if (!threadId || !profile || !pending) return;
    try {
      if (pending.kind === 'leave') {
        await removeGroupMember(threadId, profile.id);
        setPending(null);
        router.replace('/messages');
        return;
      }
      await removeGroupMember(threadId, pending.id);
      setPending(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update group');
    }
  };

  return (
    <Screen
      keyboard
      maxWidth={640}
      scrollRef={scroller}
      onContentSizeChange={() => {
        if (pinEnd.current) scroller.current?.scrollToEnd({ animated: true });
      }}
      onScroll={(event) => {
        const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
        pinEnd.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 96;
      }}
      sticky={
        <MessageComposer
          placeholder="Write a message"
          busy={busy}
          onSend={onSend}
          onError={setError}
        />
      }
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change group photo"
          onPress={() => setPhotoOpen(true)}
          style={({ pressed }) => [pressed && { opacity: 0.8 }]}
        >
          <ThreadAvatar
            name={title}
            faces={members
              .filter((person) => person.id !== profile?.id)
              .map((person) => ({
                name: person.display_name || person.username,
                photoUrl: person.photoUrl,
              }))}
            photoUrl={photoUrl}
            size={44}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title} details`}
          onPress={() => threadId && router.push(`/messages/info/${threadId}` as never)}
          style={({ pressed }) => [styles.headerText, pressed && { opacity: 0.8 }]}
        >
          <Text style={[type.title, { color: colors.ink }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            {kind === 'group' ? `${members.length} people · tap for settings` : 'Tap for details'}
          </Text>
        </Pressable>
      </View>
      {rows.map((row) => {
        const mine = row.sender_id === profile?.id;
        const sender = peopleById.get(row.sender_id);
        const name = mine
          ? 'You'
          : sender?.display_name || (sender?.username ? formatHandle(sender.username) : 'Someone');
        const when = formatMessageWhen(row.created_at);
        const spoken = `${name}, ${when}. ${row.body}`;
        return (
          <View
            key={row.id}
            style={[styles.turn, mine ? styles.turnMine : styles.turnTheirs]}
            accessibilityRole="text"
            accessibilityLabel={spoken}
          >
            {mine ? null : (
              <Avatar
                name={sender?.display_name || sender?.username || name}
                photoUrl={sender?.photoUrl}
                size={32}
              />
            )}
            <View style={[styles.stack, mine ? styles.stackMine : styles.stackTheirs]}>
              <Text style={[styles.who, { color: colors.mute, textAlign: mine ? 'right' : 'left' }]}>
                {`${name} · ${when}`}
              </Text>
              <View
                style={[
                  styles.bubble,
                  { backgroundColor: mine ? colors.brandSoft : colors.wash, alignSelf: mine ? 'flex-end' : 'flex-start' },
                ]}
              >
                {row.payload ? (
                  <MessagePayloadView payload={row.payload} body={row.body} onOpenWork={openCard} />
                ) : (
                  <Text style={[type.body, { color: colors.ink }]}>{row.body}</Text>
                )}
              </View>
            </View>
            {mine ? (
              <Avatar
                name={sender?.display_name || profile?.display_name || profile?.username || name}
                photoUrl={sender?.photoUrl}
                size={32}
              />
            ) : null}
          </View>
        );
      })}
      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
      <FormSheet
        visible={Boolean(pending)}
        title={pending?.kind === 'remove' ? `Remove ${pending.name}?` : 'Leave this group?'}
        onClose={() => setPending(null)}
      >
        <Text style={[type.body, { color: colors.mute }]}>
          {pending?.kind === 'remove'
            ? 'They can be added again later.'
            : 'You will stop seeing new messages here.'}
        </Text>
        <DangerButton
          label={pending?.kind === 'remove' ? 'Remove' : 'Leave'}
          onPress={() => void confirmPending()}
        />
      </FormSheet>
      <FormSheet visible={addOpen} title="Add to group" onClose={() => setAddOpen(false)}>
        {candidates.length === 0 ? (
          <Text style={[type.meta, { color: colors.mute }]}>Nobody else you may add.</Text>
        ) : null}
        {candidates.map((person) => (
          <ListRow
            key={person.id}
            title={person.display_name || formatHandle(person.username)}
            status={`${formatHandle(person.username)} · ${roleLabel(person.role)}`}
            avatarName={person.display_name || person.username}
            onPress={() => {
              if (!threadId) return;
              void addGroupMember(threadId, person.id)
                .then(() => {
                  setAddOpen(false);
                  return load();
                })
                .catch((err) => setError(err instanceof Error ? err.message : 'Could not add'));
            }}
          />
        ))}
      </FormSheet>
      <PhotoSheet
        visible={photoOpen}
        title={kind === 'group' ? 'Group photo' : 'Photo'}
        hasPhoto={Boolean(photoUrl)}
        onTake={() => void onPickPhoto(true)}
        onLibrary={() => void onPickPhoto(false)}
        onRemove={
          photoUrl
            ? () => {
                setPhotoOpen(false);
                if (!threadId) return;
                photoBusy.current = true;
                void setThreadPhoto(threadId, null)
                  .then(() => {
                    setPhotoUrl(null);
                    photoBusy.current = false;
                  })
                  .catch((err) => {
                    photoBusy.current = false;
                    setError(err instanceof Error ? err.message : 'Could not clear photo');
                  });
              }
            : undefined
        }
        onCancel={() => setPhotoOpen(false)}
      />
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <WebCameraCapture
          onCapture={(uri, mime) => {
            setCameraOpen(false);
            void applyPhoto(uri, mime);
          }}
          onCancel={() => setCameraOpen(false)}
        />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  turn: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
    maxWidth: '100%',
  },
  turnMine: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  turnTheirs: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  stack: {
    flexShrink: 1,
    maxWidth: '78%',
  },
  stackMine: {
    alignItems: 'flex-end',
  },
  stackTheirs: {
    alignItems: 'flex-start',
  },
  who: {
    ...type.meta,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '100%',
    padding: 12,
    borderRadius: 12,
  },
});
