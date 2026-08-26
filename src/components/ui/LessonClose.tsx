import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  onPress: () => void;
};

export function LessonClose({ onPress }: Props) {
  const { colors } = useTheme();
  return (
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
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    top: 0,
    right: 8,
    zIndex: 21,
    elevation: 21,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
