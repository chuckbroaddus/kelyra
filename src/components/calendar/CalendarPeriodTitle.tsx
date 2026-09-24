import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { type } from '@/constants/theme';
import {
  PERIOD_TITLE_MORPH_IN_MS,
  PERIOD_TITLE_MORPH_OUT_MS,
  dayPeriodTitleSegments,
  joinDayPeriodTitle,
  morphDayInsertProgress,
  morphWeekdayLetterCount,
  type PeriodTitleMorphSegments,
} from '@/lib/calendar/periodTitle';
import { ZOOM_HANDOFF_IN_MS } from '@/lib/calendar/zoomDrill';
import { useTheme } from '@/lib/theme/ThemeProvider';

const NBSP = '\u00A0';

type Props = {
  /** Long month word shown in collapsed (Month/Week) state, e.g. "February". */
  month: string;
  /** Year shown in collapsed state, e.g. "2026". */
  year: string;
  /** Day whose `4,` + weekday are morphed in when `expanded` (Week→Day). */
  dayIso?: string | null;
  /** true = `February 4, 2026, Wednesday`; false = `February 2026`. */
  expanded?: boolean;
  /** Snap between states (no morph). */
  reduceMotion?: boolean;
  /** Year→Month handoff: fade in once on mount (title had no prior home on Year). */
  enterFade?: boolean;
};

/**
 * Sticky calendar period title (Month / Week / Day). Lives OUTSIDE CalendarZoomDrill
 * so drill transforms never move/fade it. One fixed size (22 / type.title, ink).
 *
 * Week→Day morph: month word stays put; `4,` is inserted between month and year
 * (year slides right as the slot widens), then the weekday rolls in letter by letter.
 * Day→Week plays the same morph backwards.
 */
export function CalendarPeriodTitle({
  month,
  year,
  dayIso = null,
  expanded = false,
  reduceMotion = false,
  enterFade = false,
}: Props) {
  const { colors } = useTheme();
  const textStyle = [styles.title, { color: colors.ink }];

  // Keep last day segments so the collapse can animate out after dayIso clears.
  const nextSeg = dayIso ? dayPeriodTitleSegments(dayIso) : null;
  const lastSegRef = useRef<PeriodTitleMorphSegments | null>(nextSeg);
  if (nextSeg) lastSegRef.current = nextSeg;
  const seg = lastSegRef.current;
  const dayPart = seg?.dayPart ?? '';
  const weekday = seg?.weekday ?? '';
  const target = expanded && seg ? 1 : 0;

  const progress = useSharedValue(target);
  const [letters, setLetters] = useState(() => (target === 1 ? weekday.length : 0));
  const [dayWidth, setDayWidth] = useState(0);
  const dayW = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = target;
      setLetters(target === 1 ? weekday.length : 0);
      return;
    }
    progress.value = withTiming(target, {
      duration: target === 1 ? PERIOD_TITLE_MORPH_IN_MS : PERIOD_TITLE_MORPH_OUT_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [target, reduceMotion, progress, weekday.length]);

  const weekdayLen = weekday.length;
  useAnimatedReaction(
    () => morphWeekdayLetterCount(progress.value, weekdayLen),
    (next, prev) => {
      if (next !== prev) runOnJS(setLetters)(next);
    },
    [weekdayLen],
  );

  const daySlotStyle = useAnimatedStyle(() => {
    const insert = morphDayInsertProgress(progress.value);
    return { width: dayW.value * insert, opacity: insert };
  });

  const enterOpacity = useSharedValue(enterFade && !reduceMotion ? 0 : 1);
  useEffect(() => {
    if (!enterFade || reduceMotion) {
      enterOpacity.value = 1;
      return;
    }
    enterOpacity.value = 0;
    enterOpacity.value = withTiming(1, { duration: ZOOM_HANDOFF_IN_MS });
  }, [enterFade, reduceMotion, enterOpacity]);
  const enterStyle = useAnimatedStyle(() => ({ opacity: enterOpacity.value }));

  const a11yLabel =
    expanded && seg ? joinDayPeriodTitle(seg) : `${month} ${year}`;
  const displayMonth = expanded && seg ? seg.month : month;
  const displayYear = expanded && seg ? seg.year : year;
  const shownWeekday = weekday.slice(0, letters);

  return (
    <Reanimated.View
      style={[styles.wrap, enterStyle]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={a11yLabel}
    >
      {/* Off-screen measurer for the inserted `4, ` slot (same font). */}
      {dayPart ? (
        <Text
          style={[textStyle, styles.measure]}
          numberOfLines={1}
          onLayout={(event) => {
            const w = Math.ceil(event.nativeEvent.layout.width);
            if (w !== dayWidth) {
              setDayWidth(w);
              dayW.value = w;
            }
          }}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {`${dayPart}${NBSP}`}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Text style={textStyle} numberOfLines={1}>
          {`${displayMonth}${NBSP}`}
        </Text>
        <Reanimated.View style={[styles.daySlot, daySlotStyle]}>
          <Text style={[textStyle, { width: dayWidth }]} numberOfLines={1}>
            {`${dayPart}${NBSP}`}
          </Text>
        </Reanimated.View>
        <Text style={textStyle} numberOfLines={1}>
          {displayYear}
        </Text>
        {letters > 0 ? (
          <Text style={[textStyle, styles.weekday]} numberOfLines={1} ellipsizeMode="clip">
            {`,${NBSP}${shownWeekday}`}
          </Text>
        ) : null}
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'flex-start' },
  title: { ...type.title, fontSize: 22 },
  daySlot: { overflow: 'hidden' },
  weekday: { flexShrink: 1 },
  measure: { position: 'absolute', opacity: 0, left: 0, top: 0 },
});
