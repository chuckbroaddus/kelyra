import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  children: ReactNode;
  onPress?: () => void;
};

export function Card({ children, onPress }: Props) {
  const { colors } = useTheme();
  const paint = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.line },
  ];
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...paint, pressed && { opacity: 0.88 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={paint}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
});
