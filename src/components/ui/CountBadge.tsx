import { StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import { formatCount } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeProvider';

/** Tiny count pip on the upper-right of an icon. Hidden at 0. Caps at 99+. */
export function CountBadge({ count }: { count: number }) {
  const { colors, scheme } = useTheme();
  if (count <= 0) return null;
  const ink = scheme === 'dark' ? '#1A120C' : colors.brandInk;
  return (
    <View
      style={[
        styles.badge,
        count > 9 && styles.badgeWide,
        count > 99 && styles.badgeMax,
        { backgroundColor: colors.danger },
      ]}
    >
      <Text style={[styles.text, { color: ink }]}>{formatCount(count)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 12,
    height: 12,
    paddingHorizontal: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWide: {
    minWidth: 15,
    height: 13,
  },
  badgeMax: {
    minWidth: 18,
  },
  text: {
    ...type.badge,
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
  },
});
