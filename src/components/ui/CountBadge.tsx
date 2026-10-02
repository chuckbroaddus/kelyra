import { StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import { formatCount } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeProvider';

/** Soft fills for syllabus step marks (light red → light green). Default is the Messages/Needs alert pip. */
export type CountBadgeTone = 'danger' | 'dangerSoft' | 'goodSoft';

/**
 * Tiny count pip on the upper-right of an icon (Messages tray / Needs / syllabus steps).
 * Hidden at 0. Caps at 99+.
 */
export function CountBadge({
  count,
  tone = 'danger',
}: {
  count: number;
  tone?: CountBadgeTone;
}) {
  const { colors, scheme } = useTheme();
  if (count <= 0) return null;

  let backgroundColor = colors.danger;
  let color = scheme === 'dark' ? '#1A120C' : colors.brandInk;
  if (tone === 'dangerSoft') {
    backgroundColor = colors.dangerSoft;
    color = colors.danger;
  } else if (tone === 'goodSoft') {
    backgroundColor = colors.goodSoft;
    color = colors.good;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.badge,
        count > 9 && styles.badgeWide,
        count > 99 && styles.badgeMax,
        { backgroundColor },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={[styles.text, { color }]}>{formatCount(count)}</Text>
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
