import { createPortal } from 'react-dom';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  onPress: () => void;
};

export function LessonClose({ onPress }: Props) {
  const { colors } = useTheme();
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div style={portalStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close lesson"
        onPress={onPress}
        style={({ pressed }) => [
          styles.hit,
          {
            backgroundColor: colors.elevated,
            borderColor: colors.line,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
      >
        <Icon name="close" color={colors.ink} size={20} />
      </Pressable>
    </div>,
    document.body,
  );
}

const portalStyle = {
  position: 'fixed',
  top: 8,
  right: 8,
  zIndex: 100000,
  pointerEvents: 'auto',
  width: 44,
  height: 44,
  display: 'flex',
} as const;

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
