import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DangerButton, GhostButton, PrimaryButton } from '@/components/ui/Button';
import { ScreenOverlay } from '@/components/ui/ScreenOverlay';
import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Hat-agnostic confirm (ConfirmSheet blocks student / parent-danger). */
export function CalendarConfirm({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const Confirm = danger ? DangerButton : PrimaryButton;

  return (
    <ScreenOverlay visible={visible} onRequestClose={onCancel}>
      <View
        style={[
          styles.root,
          web && styles.center,
          { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
        ]}
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
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.mute }]}>{body}</Text>
          <Confirm label={busy ? 'Working…' : confirmLabel} disabled={busy} onPress={onConfirm} />
          <GhostButton label={cancelLabel} onPress={onCancel} />
        </View>
      </View>
    </ScreenOverlay>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, minHeight: 48 },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 400, borderWidth: 1, padding: 16, gap: 12 },
  card: { borderRadius: radius.lg, alignSelf: 'center' },
  bottom: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxWidth: '100%',
  },
  title: type.rowTitle,
  body: type.body,
});
