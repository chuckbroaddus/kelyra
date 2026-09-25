import { useEffect } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  notice: { tone: 'success' | 'error'; message: string } | null;
  onDismiss: () => void;
  /** Auto-dismiss delay; errors stay a little longer. */
  durationMs?: number;
};

/** Brief centered pop-up (tap anywhere to close). Dismisses the keyboard so it is never hidden. */
export function NoticePopup({ notice, onDismiss, durationMs }: Props) {
  const { colors } = useTheme();
  const visible = Boolean(notice);
  const ms = durationMs ?? (notice?.tone === 'error' ? 4500 : 2800);

  useEffect(() => {
    if (!visible) return;
    Keyboard.dismiss();
    const timer = setTimeout(onDismiss, ms);
    return () => clearTimeout(timer);
  }, [visible, ms, onDismiss, notice?.message]);

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
  message: {
    ...type.body,
    textAlign: 'center',
  },
});
