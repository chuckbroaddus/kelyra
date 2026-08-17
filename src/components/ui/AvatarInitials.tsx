import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/ThemeProvider';

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

export function AvatarInitials({ name, size = 36 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const fontSize = size >= 56 ? 18 : size >= 48 ? 16 : 13;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.wash,
          borderColor: colors.line,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.ink, fontSize }]}>{initialsFor(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    fontWeight: '600',
  },
});
