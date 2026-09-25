import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

/** The "+" attach choices shared by Ask / Messages and the Journal entry editor. */
export type AttachChoice = 'photo' | 'camera' | 'file' | 'link';

export const ATTACH_ROW = 48;
export const ATTACH_VISIBLE = 3;

const ITEMS = [
  { key: 'photo', label: 'Photo', icon: 'photo' },
  { key: 'camera', label: 'Camera', icon: 'capture' },
  { key: 'file', label: 'File', icon: 'file' },
  { key: 'link', label: 'Link', icon: 'link' },
] as const;

/** Inline dropdown (not a modal, so it works inside sheets). Shows 3 rows; scroll for Link. */
export function AttachMenu({
  onPick,
  style,
}: {
  onPick: (choice: AttachChoice) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={[styles.menu, { borderColor: colors.line, backgroundColor: colors.elevated }, style]}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      snapToInterval={ATTACH_ROW}
      disableIntervalMomentum
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
    >
      {ITEMS.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={() => onPick(item.key)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
        >
          <Icon name={item.icon} color={colors.ink} size={18} />
          <Text style={[type.body, { color: colors.ink }]}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/**
 * The "+" drawn as two bars instead of the icon PNG. The plus PNG runs edge to edge
 * in its square and reads larger than other glyphs at the same size; bars let each
 * spot set the exact arm length (Ask composer 16, Journal mic-matched 14).
 */
export function PlusGlyph({ color, size = 16, thickness = 2 }: { color: string; size?: number; thickness?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.bar, { width: size, height: thickness, backgroundColor: color }]} />
      <View style={[styles.bar, { width: thickness, height: size, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    height: ATTACH_ROW * ATTACH_VISIBLE,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    height: ATTACH_ROW,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bar: {
    position: 'absolute',
    borderRadius: 1,
  },
});
