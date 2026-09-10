import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DangerButton, GhostButton, PrimaryButton } from '@/components/ui/Button';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { ScreenOverlay } from '@/components/ui/ScreenOverlay';
import { TextField } from '@/components/ui/TextField';
import { radius, type } from '@/constants/theme';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Defaults to Cancel. Clear-brief uses Keep brief. Leave line uses Keep waiting. */
  cancelLabel?: string;
  typeName?: string | null;
  photoUrl?: string | null;
  busy?: boolean;
  /**
   * `danger` (default) = delete ConfirmSheet (§20.1): DangerButton + undo coda; blocked on parent/student/none.
   * `primary` = parent-safe confirm (§13.13b): PrimaryButton, no undo coda; allowed on parent seat.
   */
  tone?: 'danger' | 'primary';
  /** Optional a11y on the confirm control (e.g. Leave line + child names). */
  confirmAccessibilityLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function namesMatch(typed: string, expected: string): boolean {
  return typed.trim().toLowerCase() === expected.trim().toLowerCase();
}

export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  typeName,
  photoUrl,
  busy,
  tone = 'danger',
  confirmAccessibilityLabel,
  onCancel,
  onConfirm,
}: Props) {
  const { colors, scheme } = useTheme();
  const chrome = useOptionalChrome();
  const insets = useSafeAreaInsets();
  const [typed, setTyped] = useState('');
  const web = Platform.OS === 'web';
  const needsName = Boolean(typeName?.trim());
  const ready = !needsName || namesMatch(typed, typeName ?? '');
  const parentSafe = tone === 'primary';
  const copy = parentSafe
    ? body.trim()
    : body.includes('This cannot be undone.')
      ? body
      : `${body.trim()}\nThis cannot be undone.`;

  useEffect(() => {
    if (!visible) setTyped('');
  }, [visible]);

  if (chrome && (chrome.role === 'none' || chrome.role === 'student')) {
    return null;
  }
  // Destructive delete sheet stays teacher/office-only; parent-safe primary is allowed on parent seat.
  if (chrome && chrome.role === 'parent' && !parentSafe) {
    return null;
  }

  const ConfirmControl = parentSafe ? PrimaryButton : DangerButton;

  return (
    <ScreenOverlay visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={[
          styles.root,
          web && styles.center,
          { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={!web}
      >
        <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Cancel" />
        <View
          pointerEvents="auto"
          style={[
            styles.sheet,
            web ? styles.card : styles.bottom,
            {
              backgroundColor: colors.elevated,
              borderColor: colors.line,
              paddingBottom: web ? 16 : 16 + insets.bottom,
            },
          ]}
        >
          {photoUrl ? (
            <RemoteImage uri={photoUrl} style={[styles.thumb, { borderColor: colors.line }]} />
          ) : null}
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.mute }]}>{copy}</Text>
          {needsName ? (
            <TextField
              placeholder={`Type ${typeName}`}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}
          <ConfirmControl
            label={busy ? 'Working…' : confirmLabel}
            disabled={!ready || busy}
            accessibilityLabel={confirmAccessibilityLabel}
            onPress={onConfirm}
          />
          <GhostButton label={cancelLabel} onPress={onCancel} />
        </View>
      </KeyboardAvoidingView>
    </ScreenOverlay>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    flex: 1,
    minHeight: 48,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: radius.lg,
    alignSelf: 'center',
  },
  bottom: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxWidth: '100%',
  },
  title: type.rowTitle,
  body: type.body,
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    alignSelf: 'center',
    overflow: 'hidden',
  },
});
