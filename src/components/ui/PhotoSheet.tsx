import {
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GhostButton } from '@/components/ui/Button';
import { hitSlop, radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  visible: boolean;
  hasPhoto?: boolean;
  showUseHomework?: boolean;
  onTake: () => void;
  onLibrary: () => void;
  onUseHomework?: () => void;
  onRemove?: () => void;
  onCancel: () => void;
};

function afterDismiss(run: () => void) {
  if (Platform.OS === 'web') {
    run();
    return;
  }
  InteractionManager.runAfterInteractions(() => {
    setTimeout(run, Platform.OS === 'ios' ? 450 : 250);
  });
}

export function PhotoSheet({
  visible,
  hasPhoto,
  showUseHomework,
  onTake,
  onLibrary,
  onUseHomework,
  onRemove,
  onCancel,
}: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';

  const run = (action: () => void, waitForPicker = false) => {
    onCancel();
    if (waitForPicker) afterDismiss(action);
    else action();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
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
          <Text style={[styles.title, { color: colors.ink }]}>Photo</Text>
          <Row label="Take photo" onPress={() => run(onTake, true)} color={colors.ink} />
          <Row label="Choose from library" onPress={() => run(onLibrary, true)} color={colors.ink} />
          {showUseHomework ? (
            <Row
              label="Use this homework as profile"
              onPress={() => run(() => onUseHomework?.())}
              color={colors.ink}
            />
          ) : null}
          {hasPhoto ? (
            <Row label="Remove photo" onPress={() => run(() => onRemove?.())} color={colors.danger} />
          ) : null}
          <GhostButton label="Cancel" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={hitSlop}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrim: {
    flex: 1,
    minHeight: 48,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    padding: 16,
    gap: 4,
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
  title: {
    ...type.section,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    minHeight: 48,
    justifyContent: 'center',
  },
  rowLabel: type.body,
});
