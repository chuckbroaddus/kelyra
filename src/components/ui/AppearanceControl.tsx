import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, shadows, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';
import type { AppearanceMode } from '@/constants/theme';

const MODES: { key: AppearanceMode; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export function AppearanceControl() {
  const { colors, scheme, mode, setMode } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: colors.wash }]}
    >
      {MODES.map((item) => {
        const selected = mode === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => setMode(item.key)}
            style={[
              styles.segment,
              selected && {
                backgroundColor: colors.elevated,
                borderColor: colors.line,
                ...(scheme === 'light' ? shadows.light : null),
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? colors.ink : colors.mute, fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {selected ? `✓ ${item.label}` : item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    minHeight: 44,
    height: 44,
    borderRadius: radius.md,
    padding: 3,
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    ...type.badge,
    fontSize: 13,
  },
});
