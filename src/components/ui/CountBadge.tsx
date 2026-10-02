import { StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import { formatCount } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeProvider';

/**
 * Default `danger` = Messages/Needs alert pip (solid red + light ink).
 * Syllabus step marks: `danger` / `goodSoft` fills with `blackInk` (black numeral).
 * Soft colored numerals remain available via dangerSoft / goodSoft without blackInk.
 */
export type CountBadgeTone = 'danger' | 'dangerSoft' | 'goodSoft';

/** Near-black numeral on colored step-mark fills (Chuck: number is black). */
const STEP_MARK_INK = '#1A120C';

/**
 * Tiny count pip on the upper-right of an icon (Messages tray / Needs / syllabus steps).
 * Hidden at 0. Caps at 99+.
 */
export function CountBadge({
  count,
  tone = 'danger',
  blackInk = false,
}: {
  count: number;
  tone?: CountBadgeTone;
  /** Force near-black numeral (syllabus step marks). */
  blackInk?: boolean;
}) {
  const { colors, scheme } = useTheme();
  if (count <= 0) return null;

  let backgroundColor = colors.danger;
  let color = scheme === 'dark' ? STEP_MARK_INK : colors.brandInk;
  if (tone === 'dangerSoft') {
    backgroundColor = colors.dangerSoft;
    color = colors.danger;
  } else if (tone === 'goodSoft') {
    backgroundColor = colors.goodSoft;
    color = colors.good;
  }
  if (blackInk) {
    // Light green wash is dark in dark scheme — keep numeral readable there.
    color = scheme === 'dark' && tone === 'goodSoft' ? colors.ink : STEP_MARK_INK;
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
