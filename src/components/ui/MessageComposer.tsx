import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AttachPreview } from '@/components/ui/MessageAttach';
import { PrimaryButton } from '@/components/ui/Button';
import { FormSheet } from '@/components/ui/FormSheet';
import { HoverTip } from '@/components/ui/HoverTip';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  fileFromClipboardItem,
  firstHttpUrl,
  pickMessageDocument,
  pickMessagePhoto,
  stripUrl,
  unfurlLink,
  uploadMessageFile,
  type DraftAttach,
} from '@/lib/messages/attachments';
import { useTheme } from '@/lib/theme/ThemeProvider';

const COMPOSER_PAD = 24;
const COMPOSER_LINE = type.body.lineHeight ?? 24;
const ATTACH_ROW = 48;
const ATTACH_VISIBLE = 3;

type Props = {
  placeholder?: string;
  busy?: boolean;
  disabled?: boolean;
  /** Feed: menu and attach card sit under the field. Thread: they sit above, toward the chat. */
  layout?: 'thread' | 'feed';
  /** Grow the field this many lines, then scroll inside. */
  maxLines?: number;
  onSend: (body: string, payload: DraftAttach | null) => Promise<void>;
  onError?: (message: string | null) => void;
  onFocusChange?: (focused: boolean) => void;
};

export function MessageComposer({
  placeholder = 'Write a message',
  busy = false,
  disabled = false,
  layout = 'thread',
  maxLines = 4,
  onSend,
  onError,
  onFocusChange,
}: Props) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const fieldRef = useRef<TextInput>(null);
  const minHeight = COMPOSER_PAD + COMPOSER_LINE;
  const maxHeight = COMPOSER_PAD + COMPOSER_LINE * maxLines;
  const [draft, setDraft] = useState('');
  const [textLines, setTextLines] = useState(1);
  const [sizeLines, setSizeLines] = useState(1);
  const visibleLines = Math.min(maxLines, Math.max(1, textLines, sizeLines));
  const composerHeight = COMPOSER_PAD + COMPOSER_LINE * visibleLines;

  const pinToTyping = useCallback(() => {
    const pin = () => {
      const node = fieldRef.current as unknown as { scrollTop?: number; scrollHeight?: number } | null;
      if (node && typeof node.scrollTop === 'number' && typeof node.scrollHeight === 'number') {
        node.scrollTop = node.scrollHeight;
      }
    };
    pin();
    requestAnimationFrame(pin);
  }, []);

  const measureWeb = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const el = fieldRef.current as unknown as HTMLTextAreaElement | null;
    if (!el || typeof el.scrollHeight !== 'number') return;
    const previous = el.style.height;
    el.style.height = 'auto';
    const sh = el.scrollHeight;
    el.style.height = previous;
    const inner = Math.max(COMPOSER_LINE, sh - COMPOSER_PAD);
    setSizeLines(Math.max(1, Math.round(inner / COMPOSER_LINE)));
    pinToTyping();
  }, [pinToTyping]);
  const [attach, setAttach] = useState<DraftAttach | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [workingAttach, setWorkingAttach] = useState(false);
  const [sending, setSending] = useState(false);
  const locked = busy || sending || disabled || !profile;
  const empty = !draft.trim() && !attach;

  const takeFile = async (picked: { uri: string; mimeType: string; name: string } | null, kind: 'photo' | 'file') => {
    if (!profile || !picked) return;
    setWorkingAttach(true);
    onError?.(null);
    try {
      setAttach(await uploadMessageFile({ ownerId: profile.id, ...picked, kind }));
      setAttachOpen(false);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not attach');
    } finally {
      setWorkingAttach(false);
    }
  };

  const takeLink = async (raw: string, fromDraft = false) => {
    const url = firstHttpUrl(raw);
    if (!url) {
      onError?.('Need an https link');
      return;
    }
    setWorkingAttach(true);
    onError?.(null);
    try {
      setAttach(await unfurlLink(url));
      if (fromDraft) setDraft((current) => stripUrl(current, url));
      setLinkOpen(false);
      setLinkDraft('');
      setAttachOpen(false);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not add that link');
    } finally {
      setWorkingAttach(false);
    }
  };

  const onPaste = (event: {
    preventDefault?: () => void;
    nativeEvent?: { clipboardData?: DataTransfer };
    clipboardData?: DataTransfer;
  }) => {
    const data = event.clipboardData ?? event.nativeEvent?.clipboardData;
    if (!data) return;
    const file = data.files?.[0];
    if (file && profile) {
      event.preventDefault?.();
      const kind = file.type.startsWith('image/') ? 'photo' : 'file';
      void fileFromClipboardItem(file).then((picked) => takeFile(picked, kind));
      return;
    }
    const text = `${data.getData?.('text/uri-list') || ''} ${data.getData?.('text/plain') || ''}`;
    const url = firstHttpUrl(text);
    if (url) {
      event.preventDefault?.();
      void takeLink(url, true);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onWindowPaste = (event: ClipboardEvent) => {
      const node = event.target as HTMLElement | null;
      const tag = node?.tagName;
      if (tag !== 'TEXTAREA' && tag !== 'INPUT') return;
      const data = event.clipboardData;
      if (!data) return;
      const file = data.files?.[0];
      if (file && profile) {
        event.preventDefault();
        const kind = file.type.startsWith('image/') ? 'photo' : 'file';
        void fileFromClipboardItem(file).then((picked) => takeFile(picked, kind));
        return;
      }
      const text = `${data.getData('text/uri-list') || ''} ${data.getData('text/plain') || ''}`;
      const url = firstHttpUrl(text);
      if (!url) return;
      event.preventDefault();
      void takeLink(url, true);
    };
    window.addEventListener('paste', onWindowPaste, true);
    return () => window.removeEventListener('paste', onWindowPaste, true);
  }, [profile]);

  const submit = async () => {
    if (locked || empty) return;
    let payload = attach;
    let body = draft;
    if (!payload) {
      const url = firstHttpUrl(draft);
      if (url) {
        payload = await unfurlLink(url);
        body = stripUrl(draft, url);
      }
    }
    if (!body.trim() && !payload) return;
    setSending(true);
    onError?.(null);
    try {
      await onSend(body, payload);
      setDraft('');
      setAttach(null);
      setTextLines(1);
      setSizeLines(1);
      setAttachOpen(false);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not send');
    } finally {
      setSending(false);
    }
  };

  const menu = attachOpen ? (
    <ScrollView
      style={[
        styles.attachMenu,
        layout === 'feed' ? styles.attachMenuBelow : styles.attachMenuAbove,
        { borderColor: colors.line, backgroundColor: colors.elevated },
      ]}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      snapToInterval={ATTACH_ROW}
      disableIntervalMomentum
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
    >
      {(
        [
          { key: 'photo', label: 'Photo', icon: 'photo' as const },
          { key: 'camera', label: 'Camera', icon: 'capture' as const },
          { key: 'file', label: 'File', icon: 'file' as const },
          { key: 'link', label: 'Link', icon: 'link' as const },
        ] as const
      ).map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={() => {
            setAttachOpen(false);
            if (item.key === 'link') {
              setLinkOpen(true);
              return;
            }
            if (item.key === 'file') {
              void pickMessageDocument().then((picked) => takeFile(picked, 'file'));
              return;
            }
            void pickMessagePhoto(item.key === 'camera').then((picked) => takeFile(picked, 'photo'));
          }}
          style={({ pressed }) => [styles.attachRow, pressed && { opacity: 0.88 }]}
        >
          <Icon name={item.icon} color={colors.ink} size={18} />
          <Text style={[type.body, { color: colors.ink }]}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  ) : null;

  const preview = (
    <>
      {attach ? <AttachPreview attach={attach} onClear={() => setAttach(null)} /> : null}
      {workingAttach ? <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>Adding…</Text> : null}
    </>
  );

  const row = (
      <View style={styles.composer}>
        <HoverTip label="Add a photo, file, or link">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
            disabled={locked}
            onPress={() => setAttachOpen((open) => !open)}
            style={({ pressed }) => [
              styles.add,
              { backgroundColor: colors.wash, borderColor: colors.line, opacity: locked ? 0.4 : pressed ? 0.88 : 1 },
            ]}
          >
            <View style={[styles.addBar, styles.addH, { backgroundColor: colors.ink }]} />
            <View style={[styles.addBar, styles.addV, { backgroundColor: colors.ink }]} />
          </Pressable>
        </HoverTip>
        <View style={styles.field}>
          <TextField
            ref={fieldRef}
            placeholder={placeholder}
            value={draft}
            editable={!locked}
            onFocus={() => {
              setAttachOpen(false);
              onFocusChange?.(true);
            }}
            onBlur={() => {
              onFocusChange?.(false);
              const url = firstHttpUrl(draft);
              if (url && !attach) void takeLink(url, true);
            }}
            onChangeText={(value) => {
              setAttachOpen(false);
              setTextLines(Math.max(1, value.split('\n').length));
              const grew = value.length - draft.length > 8;
              setDraft(value);
              if (grew && !attach) {
                const url = firstHttpUrl(value);
                if (url) void takeLink(url, true);
              }
              requestAnimationFrame(() => {
                measureWeb();
                pinToTyping();
              });
            }}
            multiline
            blurOnSubmit={false}
            submitBehavior="newline"
            returnKeyType="default"
            scrollEnabled
            onContentSizeChange={(event) => {
              const raw = event.nativeEvent.contentSize.height;
              const inner = raw > COMPOSER_PAD + COMPOSER_LINE / 2 ? raw - COMPOSER_PAD : raw;
              setSizeLines(Math.max(1, Math.round(inner / COMPOSER_LINE)));
            }}
            onPaste={onPaste}
            style={[
              { height: composerHeight, minHeight, maxHeight },
              Platform.OS === 'web' ? ({ overflow: 'scroll' } as const) : null,
            ]}
          />
        </View>
        <HoverTip label="Send">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={locked || empty}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.send,
              {
                backgroundColor: colors.brand,
                opacity: locked || empty ? 0.4 : pressed ? 0.88 : 1,
              },
            ]}
          >
            <Icon name="send" color={colors.brandInk} size={18} />
          </Pressable>
        </HoverTip>
      </View>
  );

  return (
    <View>
      {layout === 'feed' ? (
        <>
          {row}
          {menu}
          {preview}
        </>
      ) : (
        <>
          {menu}
          {preview}
          {row}
        </>
      )}
      <FormSheet visible={linkOpen} title="Add a link" onClose={() => setLinkOpen(false)}>
        <TextField
          placeholder="https://"
          autoCapitalize="none"
          autoCorrect={false}
          value={linkDraft}
          onChangeText={setLinkDraft}
          onSubmitEditing={() => void takeLink(linkDraft)}
        />
        <PrimaryButton
          label={workingAttach ? 'Adding…' : 'Add link'}
          disabled={workingAttach}
          onPress={() => void takeLink(linkDraft)}
        />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  field: {
    flex: 1,
    minWidth: 0,
  },
  add: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addBar: {
    position: 'absolute',
    borderRadius: 1,
  },
  addH: {
    width: 16,
    height: 2,
  },
  addV: {
    width: 2,
    height: 16,
  },
  attachMenu: {
    height: ATTACH_ROW * ATTACH_VISIBLE,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachMenuAbove: {
    marginBottom: 8,
  },
  attachMenuBelow: {
    marginTop: 8,
    marginBottom: 8,
  },
  attachRow: {
    height: ATTACH_ROW,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
