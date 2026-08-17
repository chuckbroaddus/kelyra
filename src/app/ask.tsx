import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { invokeAi } from '@/lib/ai/invoke';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { firstName } from '@/lib/format';
import { listRoster } from '@/lib/students/api';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Bubble = { from: 'user' | 'assistant'; text: string };

export default function AskScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const layout = useLayout();
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([
    'Who still needs a name?',
    'What gaps did I approve this week?',
  ]);

  useEffect(() => {
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
  }, [chrome.role, chrome.classId]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: Bubble[] = [...messages, { from: 'user', text: trimmed }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError(null);
    try {
      const reply = await invokeAi<{ text?: string }>('ask-assistant', {
        role: chrome.role === 'none' ? 'teacher' : chrome.role,
        classId: chrome.classId,
        studentId: chrome.studentSession?.studentId,
        messages: next,
      });
      setMessages([...next, { from: 'assistant', text: reply.text?.trim() || 'I can’t tell from what’s saved. Open Inbox or the student’s page.' }]);
    } catch {
      setError('Ask is offline. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, maxWidth: layout.orientation === 'landscape' ? 640 : undefined, alignSelf: 'center', width: '100%' }]}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.thread, { paddingBottom: chrome.trayPadding + 72 }]}
        onScroll={chrome.onScroll}
        scrollEventThrottle={16}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            {chrome.role === 'teacher'
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
            key={`${item.from}-${index}`}
            style={[
              styles.bubble,
              item.from === 'user'
                ? [styles.user, { backgroundColor: colors.brandSoft }]
                : [styles.bot, { backgroundColor: colors.card, borderColor: colors.line }],
            ]}
          >
            <Text style={[type.body, { color: colors.ink }]}>{item.text}</Text>
          </View>
        ))}
        {busy ? (
          <View style={[styles.bubble, styles.bot, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <WorkingLine text="Asking AI…" />
          </View>
        ) : null}
        {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
        {messages.length ? (
          <Text style={[type.meta, { color: colors.mute }]}>Ask</Text>
        ) : null}
      </ScrollView>
      <View
        style={[
          styles.composer,
          {
            backgroundColor: colors.elevated,
            borderTopColor: colors.line,
            bottom: chrome.trayRest,
          },
        ]}
      >
        <View style={styles.field}>
          <TextField
            placeholder="Ask…"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => void send(draft)}
            returnKeyType="send"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          disabled={!draft.trim() || busy}
          onPress={() => void send(draft)}
          style={({ pressed }) => [
            styles.send,
            { backgroundColor: colors.brand, opacity: !draft.trim() || busy ? 0.4 : pressed ? 0.88 : 1 },
          ]}
        >
          <Icon name="send" color={colors.brandInk} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroller: {
    flex: 1,
  },
  thread: {
    padding: 16,
    gap: 10,
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
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  field: {
    flex: 1,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
