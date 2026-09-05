import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppearanceControl } from '@/components/ui/AppearanceControl';
import { GhostButton } from '@/components/ui/Button';
import { HoverTip } from '@/components/ui/HoverTip';
import { Icon } from '@/components/ui/Icon';
import { radius, type } from '@/constants/theme';
import {
  DIARY_FERPA_NOTE,
  DIARY_PRIVACY_BODY,
  DIARY_PRIVACY_TITLE,
} from '@/lib/diary/privacy';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsSheet({ visible, onClose }: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close settings" />
        <View
          pointerEvents="auto"
          style={[
            styles.card,
            {
              backgroundColor: colors.elevated,
              borderColor: colors.line,
              marginBottom: web ? 0 : insets.bottom,
            },
          ]}
        >
          <View style={styles.head}>
            <Text style={[styles.title, { color: colors.ink }]}>Settings</Text>
            <HoverTip label="Close">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close settings"
                onPress={onClose}
                style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}
              >
                <Icon name="close" color={colors.ink} size={20} />
              </Pressable>
            </HoverTip>
          </View>
          <Text style={[styles.section, { color: colors.mute }]}>Color theme</Text>
          <AppearanceControl />
          <Text style={[styles.section, { color: colors.mute }]}>Diary</Text>
          <Text style={[styles.diaryTitle, { color: colors.ink }]}>{DIARY_PRIVACY_TITLE}</Text>
          <Text style={[styles.diaryBody, { color: colors.mute }]}>{DIARY_PRIVACY_BODY}</Text>
          <Text style={[styles.diaryBody, { color: colors.mute }]}>{DIARY_FERPA_NOTE}</Text>
          <GhostButton label="Done" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    ...type.title,
    flex: 1,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    ...type.section,
    textTransform: 'uppercase',
  },
  diaryTitle: {
    ...type.body,
    fontWeight: '600',
  },
  diaryBody: {
    ...type.meta,
  },
});
