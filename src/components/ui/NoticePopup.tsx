import { useEffect } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  notice: { tone: 'success' | 'error'; message: string } | null;
  onDismiss: () => void;
  /** Auto-dismiss delay; errors stay a little longer. */
  durationMs?: number;
  /**
   * WORKING-POPUP: while set, shows the animated K Working line instead of a notice (no tap
   * to close, no timer). Same Modal hands off to the result notice, so iOS never has to
   * present a second Modal while the first is still fading out.
   */
  working?: string | null;
};

/** Brief centered pop-up (tap anywhere to close). Dismisses the keyboard so it is never hidden. */
export function NoticePopup({ notice, onDismiss, durationMs, working }: Props) {
  const { colors } = useTheme();
  const busy = Boolean(working);
  const visible = busy || Boolean(notice);
  const ms = durationMs ?? (notice?.tone === 'error' ? 4500 : 2800);

  useEffect(() => {
    if (!visible) return;
    Keyboard.dismiss();
  }, [visible]);

  useEffect(() => {
    if (busy || !notice) return;
    const timer = setTimeout(onDismiss, ms);
    return () => clearTimeout(timer);
  }, [busy, notice, ms, onDismiss, notice?.message]);

  if (busy) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => undefined}>
        <View style={styles.backdrop}>
          <View style={[styles.card, styles.workingCard, { backgroundColor: colors.elevated, borderColor: colors.line }]}>
            <WorkingLine size={36} text={working ?? 'Working…'} />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onDismiss}
        style={styles.backdrop}
      >
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.card,
            {
              backgroundColor: colors.elevated,
              borderColor: notice?.tone === 'error' ? colors.danger : colors.line,
            },
          ]}
        >
          <Text
            style={[
              styles.message,
              { color: notice?.tone === 'error' ? colors.danger : colors.ink },
            ]}
          >
            {notice?.message ?? ''}
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  card: {
    maxWidth: 420,
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  workingCard: {
    width: 'auto',
    alignItems: 'center',
  },
  message: {
    ...type.body,
    textAlign: 'center',
  },
});
