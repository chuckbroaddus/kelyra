import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';
import type { AppearanceMode } from '@/constants/theme';

const MODES: { key: AppearanceMode; label: string; hint: string }[] = [
  { key: 'system', label: 'System', hint: 'Follow the device appearance' },
  { key: 'light', label: 'Light', hint: 'Always light' },
  { key: 'dark', label: 'Dark', hint: 'Always dark' },
];

export function AppearanceControl() {
  const { colors, mode, setMode } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Color theme" style={styles.group}>
      {MODES.map((item) => {
        const selected = mode === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            onPress={() => setMode(item.key)}
            style={({ pressed }) => [
              styles.row,
              { borderColor: colors.line, backgroundColor: colors.elevated },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View
              style={[
                styles.radio,
                { borderColor: selected ? colors.brand : colors.mute },
              ]}
            >
              {selected ? <View style={[styles.radioDot, { backgroundColor: colors.brand }]} /> : null}
            </View>
            <View style={styles.copy}>
              <Text style={[styles.label, { color: colors.ink }]}>{item.label}</Text>
              <Text style={[styles.hint, { color: colors.mute }]}>{item.hint}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 10,
    width: '100%',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    ...type.rowTitle,
  },
  hint: {
    ...type.meta,
  },
});
