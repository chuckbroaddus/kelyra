import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  align?: 'center' | 'left';
  showDot?: boolean;
  tone?: 'danger';
};

function Base({
  label,
  onPress,
  disabled,
  style,
  textStyle,
  align = 'center',
  showDot,
  tone,
  ghost,
  dotColor,
}: Props & {
  style: object;
  textStyle: object;
  ghost?: boolean;
  dotColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        style,
        align === 'left' && styles.left,
        disabled && styles.disabled,
        pressed && { opacity: ghost ? 0.7 : 0.88 },
      ]}
    >
      {showDot ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text
        style={[styles.label, textStyle, tone === 'danger' && { color: colors.danger }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PrimaryButton(props: Props) {
  const { colors } = useTheme();
  return (
    <Base
      {...props}
      style={[styles.primary, { backgroundColor: colors.brand }]}
      textStyle={{ color: colors.brandInk }}
    />
  );
}

export function SecondaryButton(props: Props) {
  const { colors } = useTheme();
  return (
    <Base
      {...props}
      style={[styles.secondary, { backgroundColor: colors.elevated, borderColor: colors.line }]}
      textStyle={{ color: colors.ink }}
    />
  );
}

export function GhostButton(props: Props) {
  const { colors } = useTheme();
  return (
    <Base
      {...props}
      ghost
      style={styles.ghost}
      textStyle={{ color: colors.mute }}
    />
  );
}

export function DangerButton(props: Props) {
  const { colors, scheme } = useTheme();
  const label = scheme === 'dark' ? '#1A120C' : '#FFF8F3';
  return (
    <Base
      {...props}
      style={[styles.danger, { backgroundColor: colors.danger }]}
      textStyle={{ color: label }}
      dotColor={label}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  left: {
    width: 'auto',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    minHeight: 44,
  },
  primary: {},
  secondary: {
    borderWidth: 1,
  },
  ghost: {
    width: 'auto',
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  danger: {},
  label: {
    ...type.button,
    flexShrink: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
