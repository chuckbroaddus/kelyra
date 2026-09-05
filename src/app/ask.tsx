import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { MessageComposer } from '@/components/ui/MessageComposer';
import { MessagePayloadView } from '@/components/ui/MessageAttach';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { runAskAgent, type AskChatLine } from '@/lib/ai/askAgent';
import { GAUTH_REFUSAL_TITLE } from '@/lib/ai/askHomeworkRefuse';
import { ASK_MODEL_TURNS, appendAskMessage, listAskMessages, startAskThread } from '@/lib/ai/askHistory';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { firstName } from '@/lib/format';
import { signedMessageUrl, type DraftAttach } from '@/lib/messages/attachments';
import { can } from '@/lib/school/matrix';
import { isOfficeRole } from '@/lib/school/roles';
import { listRoster } from '@/lib/students/api';
import type { MessagePayload } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Bubble = { id?: string; from: 'user' | 'assistant'; text: string; payload?: MessagePayload | null };

async function lineForAi(item: Bubble, attachPhoto: boolean): Promise<AskChatLine> {
  const note =
    item.payload?.type === 'link'
      ? `\nLink: ${item.payload.title} ${item.payload.url}`
      : item.payload?.type === 'file'
        ? `\nAttached file: ${item.payload.name}`
        : item.payload?.type === 'photo' && !attachPhoto
          ? '\n(Earlier photo omitted.)'
          : '';
  const imageUrl =
    attachPhoto && item.payload?.type === 'photo'
      ? await signedMessageUrl('photo', item.payload.storage_path)
      : null;
  return {
    from: item.from,
    text: `${item.text}${note}`,
    imageUrl,
    imageMime: attachPhoto && item.payload?.type === 'photo' ? item.payload.mime_type ?? 'image/jpeg' : null,
  };
}

export default function AskScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const router = useRouter();
  const pathname = usePathname();
  const { return: returnParam } = useLocalSearchParams<{ return?: string }>();
  const returnTo = typeof returnParam === 'string' && returnParam.startsWith('/') ? returnParam : null;
  const { profile, teacher } = useAuth();
  const scroller = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Asking AI…');
  const [error, setError] = useState<string | null>(null);
  const office = isOfficeRole(profile);

  const loadHistory = useCallback(async () => {
    if (!profile) {
      setMessages([]);
      setReady(true);
      return;
    }
    try {
      const rows = await listAskMessages();
      setMessages(
        rows.map((row) => ({
          id: row.id,
          from: row.role,
          text: row.body,
          payload: row.payload,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this chat');
    } finally {
      setReady(true);
    }
  }, [profile]);

  useEffect(() => {
    setReady(false);
    void loadHistory();
  }, [loadHistory]);
  const [chips, setChips] = useState<string[]>(
    office
      ? ['Create a parent record', 'List the classes']
      : ['Who still needs a name?', 'What gaps did I approve this week?'],
  );

  useEffect(() => {
    if (office && can(profile, 'parents.invite')) {
      setChips(['Create a parent record', 'List the classes']);
      return;
    }
    if (chrome.role !== 'teacher' || !chrome.classId) return;
    void listRoster(chrome.classId)
      .then((roster) => {
        const first = roster[0]?.display_name;
        if (first) {
          setChips([
            'Who still needs a name?',
            `Draft a parent sentence for ${firstName(first)}.`,
            'What gaps did I approve this week?',
          ]);
        }
      })
      .catch(() => undefined);
  }, [chrome.role, chrome.classId, office, profile]);

  const send = async (text: string, payload: DraftAttach | MessagePayload | null = null) => {
    const trimmed = text.trim();
    if ((!trimmed && !payload) || busy) return;
    const body =
      trimmed ||
      (payload?.type === 'photo' ? 'Photo' : payload?.type === 'file' ? payload.name : payload?.type === 'link' ? payload.title : '');
    const userBubble: Bubble = { from: 'user', text: body, payload };
    const next: Bubble[] = [...messages, userBubble];
    setMessages(next);
    setBusy(true);
    setStatus('Asking AI…');
    setError(null);
    try {
      const savedId = await appendAskMessage('user', body, payload).catch(() => null);
      if (savedId) userBubble.id = savedId;
      const forModel = next.slice(-ASK_MODEL_TURNS);
      const lastPhoto = forModel.findLastIndex((row) => row.payload?.type === 'photo');
      const reply = await runAskAgent({
        profile,
        teacherId: teacher?.id ?? null,
        classId: chrome.classId,
        live: {
          role: profile?.role ?? (chrome.role === 'none' ? 'teacher' : chrome.role),
          displayName: profile?.display_name ?? null,
          handle: profile?.username ?? null,
          classId: chrome.classId,
          className: chrome.className,
          classCount: chrome.classes.length,
          studentId: chrome.studentSession?.studentId ?? null,
          screen: pathname || '/ask',
        },
        messages: await Promise.all(forModel.map((item, index) => lineForAi(item, index === lastPhoto))),
        onStatus: setStatus,
      });
      const bot: Bubble = { from: 'assistant', text: reply.text };
      setMessages([...next, bot]);
      const botId = await appendAskMessage('assistant', reply.text, null).catch(() => null);
      if (botId) bot.id = botId;
      if (reply.href) router.push(reply.href as never);
    } catch {
      setError('Kelyra is offline. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const onNewChat = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await startAskThread();
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start a new chat');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      keyboard
      maxWidth={640}
      scrollRef={scroller}
      onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      sticky={
        <MessageComposer
          placeholder="Ask…"
          busy={busy}
          onSend={send}
          onError={setError}
        />
      }
    >
      {returnTo ? (
        <GhostButton align="left" label="Back to the assignment" onPress={() => router.push(returnTo as never)} />
      ) : null}
      {!ready ? <WorkingLine text="Opening Kelyra…" /> : null}
      {chrome.role === 'teacher' && chrome.className ? (
        <View style={styles.contextRow}>
          <Chip
            label={chrome.className}
            selected
            disabled
            tooltip={`Working in ${chrome.className}`}
          />
        </View>
      ) : null}
      {ready && messages.length === 0 ? (
        <View style={styles.empty}>
          {chrome.role === 'teacher' || office
            ? chips.map((chip) => (
                <Chip key={chip} label={chip} onPress={() => void send(chip)} />
              ))
            : (
              <Text style={[type.body, { color: colors.mute }]}>Ask a question about this week’s work.</Text>
            )}
        </View>
      ) : null}
      {messages.map((item, index) => (
        <View
          key={item.id ?? `${item.from}-${index}`}
          style={[
            styles.bubble,
            item.from === 'user'
              ? [styles.user, { backgroundColor: colors.brandSoft }]
              : [styles.bot, { backgroundColor: colors.card, borderColor: colors.line }],
          ]}
        >
          {item.payload ? (
            <MessagePayloadView payload={item.payload} body={item.text} onOpenWork={() => {}} />
          ) : item.from === 'assistant' && item.text.startsWith(GAUTH_REFUSAL_TITLE) ? (
            <View style={{ gap: 6 }}>
              <Text style={[type.section, { color: colors.ink }]}>{GAUTH_REFUSAL_TITLE}</Text>
              <Text style={[type.body, { color: colors.ink }]}>
                {item.text.slice(GAUTH_REFUSAL_TITLE.length).trim()}
              </Text>
            </View>
          ) : (
            <Text style={[type.body, { color: colors.ink }]}>{item.text}</Text>
          )}
        </View>
      ))}
      {busy ? (
        <View style={[styles.bubble, styles.bot, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <WorkingLine text={status} />
        </View>
      ) : null}
      {ready && messages.length > 0 ? (
        <GhostButton label="New chat" align="left" disabled={busy} onPress={() => void onNewChat()} />
      ) : null}
      {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  empty: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: 18,
    padding: 12,
  },
  user: {
    alignSelf: 'flex-end',
  },
  bot: {
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
});
