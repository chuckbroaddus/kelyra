import { Pressable, StyleSheet, Text } from 'react-native';

import { HoverTip, tipIfNew } from '@/components/ui/HoverTip';
import { hitSlop, radius } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  label: string;
  tooltip?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export function Chip({ label, tooltip, selected, disabled, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <HoverTip label={tipIfNew(label, tooltip)}>
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? colors.brand : colors.line,
          backgroundColor: selected ? colors.brandSoft : colors.elevated,
        },
        disabled && styles.disabled,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text
        style={[styles.label, { color: selected ? colors.brand : colors.ink }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
    </HoverTip>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 32,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  disabled: {
    opacity: 0.4,
  },
});
