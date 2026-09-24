import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Reanimated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { type } from '@/constants/theme';
import { weekdayLabels } from '@/lib/date/iso';
import { ZOOM_HANDOFF_IN_MS } from '@/lib/calendar/zoomDrill';
import { useTheme } from '@/lib/theme/ThemeProvider';

/** Gutter slide when Month (no gutter) hands off to a Week with a timeline gutter. */
export const WEEKDAY_ROW_GUTTER_MS = 280;

type Props = {
  /** Left inset so columns line up with the grid below (Week timeline gutter = 44). */
  gutter?: number;
  /** Column gap of the grid below (Month 0, Week 2). */
  gap?: number;
  /** Column to tint `brand` (Week containing today). */
  todayIndex?: number | null;
  reduceMotion?: boolean;
  /** Year→Month handoff: fade in once on mount (row had no prior home on Year). */
  enterFade?: boolean;
  /** Week↔Day drill progress (0 = Week, 1 = Day). Row fades out toward Day. */
  fadeProgress?: SharedValue<number> | null;
};

/**
 * Sticky Sun…Sat column-header row shared by Month and Week. Lives OUTSIDE
 * CalendarZoomDrill (like CalendarPeriodTitle) so Month→Week never moves or
 * re-fades it; MonthGrid / TeacherWeekGrid skip their own weekday labels.
 */
export function CalendarWeekdayRow({
  gutter = 0,
  gap = 0,
  todayIndex = null,
  reduceMotion = false,
  enterFade = false,
  fadeProgress = null,
}: Props) {
  const { colors } = useTheme();
  const labels = weekdayLabels(0, undefined, 'short');

  const inset = useSharedValue(gutter);
  useEffect(() => {
    inset.value = reduceMotion ? gutter : withTiming(gutter, { duration: WEEKDAY_ROW_GUTTER_MS });
  }, [gutter, reduceMotion, inset]);

  const enter = useSharedValue(enterFade && !reduceMotion ? 0 : 1);
  useEffect(() => {
    if (!enterFade || reduceMotion) {
      enter.value = 1;
      return;
    }
    enter.value = 0;
    enter.value = withTiming(1, { duration: ZOOM_HANDOFF_IN_MS });
  }, [enterFade, reduceMotion, enter]);

  const rowStyle = useAnimatedStyle(() => {
    const p = fadeProgress ? Math.min(1, Math.max(0, fadeProgress.value)) : 0;
    return { paddingLeft: inset.value, opacity: enter.value * (1 - p) };
  });

  return (
    <Reanimated.View
      style={[styles.row, { gap }, rowStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {labels.map((label, i) => (
        <Text
          key={`${label}-${i}`}
          numberOfLines={1}
          style={[styles.wd, { color: i === todayIndex ? colors.brand : colors.mute }]}
        >
          {label}
        </Text>
      ))}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  wd: { flex: 1, minWidth: 0, textAlign: 'center', ...type.meta, fontSize: 12 },
});
