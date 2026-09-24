import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MarqueeText } from '@/components/ui/MarqueeText';
import { type } from '@/constants/theme';
import {
  PERIOD_TITLE_MORPH_IN_MS,
  PERIOD_TITLE_MORPH_OUT_MS,
  dayPeriodTitleSegments,
  joinDayPeriodTitle,
  monthTrimParts,
  morphCommaVisible,
  morphDayInsertProgress,
  morphMonthTrimProgress,
  morphWeekdayRevealProgress,
  spokenDayPeriodTitle,
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
  /** true = `Feb. 4, 2026, Wed.`; false = `February 2026`. */
  expanded?: boolean;
  /** Snap between states (no morph). */
  reduceMotion?: boolean;
  /** Year→Month handoff: fade in once on mount (title had no prior home on Year). */
  enterFade?: boolean;
};

/** Measure one string in the title font (off-screen). */
function useTextWidth(): [number, (w: number) => void] {
  const [w, setW] = useState(0);
  return [w, (next: number) => setW((cur) => (cur === next ? cur : next))];
}

/**
 * Sticky calendar period title (Month / Week / Day). Lives OUTSIDE CalendarZoomDrill
 * so drill transforms never move/fade it. One fixed size (22 / type.title, ink).
 *
 * Week→Day morph, three sequential beats (Day→Week plays them backwards):
 *   1. `February` shrinks to `Feb.` — `ruary` clips away, the period fades in, and the
 *      year rides left with it.
 *   2. The year shifts right as `4,` opens between month and year.
 *   3. A comma appears at once, then `Wed.` slides out to the right from behind it.
 * At rest the title is the app-standard MarqueeText.
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
  const parts = seg ? monthTrimParts(seg) : null;
  const target = expanded && seg ? 1 : 0;

  // Linear overall progress; each phase eases itself (periodTitle.ts).
  const progress = useSharedValue(target);
  const [settled, setSettled] = useState(true);
  useEffect(() => {
    if (reduceMotion) {
      progress.value = target;
      setSettled(true);
      return;
    }
    setSettled(false);
    progress.value = withTiming(
      target,
      {
        duration: target === 1 ? PERIOD_TITLE_MORPH_IN_MS : PERIOD_TITLE_MORPH_OUT_MS,
        easing: Easing.linear,
      },
      (finished) => {
        'worklet';
        if (finished) runOnJS(setSettled)(true);
      },
    );
  }, [target, reduceMotion, progress]);

  // Measured widths (title font) for the three animated slots.
  const [tailW, takeTailW] = useTextWidth();
  const [dotW, takeDotW] = useTextWidth();
  const [dayW, takeDayW] = useTextWidth();
  const [wdW, takeWdW] = useTextWidth();
  const tailWv = useSharedValue(0);
  const dotWv = useSharedValue(0);
  const dayWv = useSharedValue(0);
  const wdWv = useSharedValue(0);
  useEffect(() => {
    tailWv.value = tailW;
    dotWv.value = dotW;
    dayWv.value = dayW;
    wdWv.value = wdW;
  }, [tailW, dotW, dayW, wdW, tailWv, dotWv, dayWv, wdWv]);

  // Phase 1 — tail slot narrows from `ruary` to `.`; tail fades out, period fades in.
  const tailSlotStyle = useAnimatedStyle(() => {
    // Unmeasured first frame: natural width, so `February` never flashes as `Feb`.
    if (tailWv.value <= 0) return {};
    const t = morphMonthTrimProgress(progress.value);
    return { width: tailWv.value + (dotWv.value - tailWv.value) * t };
  });
  const tailTextStyle = useAnimatedStyle(() => ({
    opacity: 1 - morphMonthTrimProgress(progress.value),
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: morphMonthTrimProgress(progress.value),
  }));
  // Non-prefix locales: swap long→short month at the phase-1 midpoint.
  const [shortSwap, setShortSwap] = useState(target === 1);
  useAnimatedReaction(
    () => morphMonthTrimProgress(progress.value) >= 0.5,
    (next, prev) => {
      if (next !== prev) runOnJS(setShortSwap)(next);
    },
  );

  // Phase 2 — `4, ` opens; the year shifts right.
  const daySlotStyle = useAnimatedStyle(() => {
    const insert = morphDayInsertProgress(progress.value);
    return { width: dayWv.value * insert, opacity: insert };
  });

  // Phase 3 — comma pops in, then the weekday slides out rightward from behind it.
  const commaStyle = useAnimatedStyle(() => ({
    opacity: morphCommaVisible(progress.value) ? 1 : 0,
  }));
  const wdSlotStyle = useAnimatedStyle(() => ({
    width: wdWv.value * morphWeekdayRevealProgress(progress.value),
  }));
  const wdTextStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -wdWv.value * (1 - morphWeekdayRevealProgress(progress.value)) },
    ],
  }));

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

  // Visible: `February 2026` / `Feb. 4, 2026, Wed.`. Spoken: full words.
  const visibleTitle = expanded && seg ? joinDayPeriodTitle(seg) : `${month} ${year}`;
  const a11yLabel = expanded && seg ? spokenDayPeriodTitle(seg) : `${month} ${year}`;
  const weekdayTail = seg ? `${NBSP}${seg.weekday}` : '';

  return (
    <Reanimated.View
      style={[styles.wrap, enterStyle]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={a11yLabel}
    >
      {/* Off-screen measurers (same font) for the animated slots. */}
      {seg ? (
        <View style={styles.measureBox} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {parts ? (
            <>
              <Text style={textStyle} onLayout={(e) => takeTailW(Math.ceil(e.nativeEvent.layout.width))}>
                {parts.tail}
              </Text>
              <Text style={textStyle} onLayout={(e) => takeDotW(parts.dot ? Math.ceil(e.nativeEvent.layout.width) : 0)}>
                {parts.dot || '.'}
              </Text>
            </>
          ) : null}
          <Text style={textStyle} onLayout={(e) => takeDayW(Math.ceil(e.nativeEvent.layout.width))}>
            {`${seg.dayPart}${NBSP}`}
          </Text>
          <Text style={textStyle} onLayout={(e) => takeWdW(Math.ceil(e.nativeEvent.layout.width))}>
            {weekdayTail}
          </Text>
        </View>
      ) : null}
      {/* At rest: the app-standard MarqueeText (ui-design §30). During the Week↔Day
          morph: the phased row, clipped, no crawl, so the two motions never fight. */}
      {settled || !seg ? (
        <MarqueeText text={visibleTitle} style={textStyle} fadeColor={colors.bg} />
      ) : (
        <ScrollView
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={styles.clip}
        >
          <View style={styles.row}>
            {parts ? (
              <>
                <Text style={textStyle} numberOfLines={1}>
                  {parts.stem}
                </Text>
                <Reanimated.View style={[styles.slot, tailSlotStyle]}>
                  <Reanimated.Text style={[textStyle, tailW > 0 ? { width: tailW } : null, tailTextStyle]} numberOfLines={1}>
                    {parts.tail}
                  </Reanimated.Text>
                  {parts.dot ? (
                    <Reanimated.Text style={[textStyle, styles.dot, dotStyle]} numberOfLines={1}>
                      {parts.dot}
                    </Reanimated.Text>
                  ) : null}
                </Reanimated.View>
              </>
            ) : (
              <Text style={textStyle} numberOfLines={1}>
                {shortSwap ? seg.monthShort : seg.month}
              </Text>
            )}
            <Text style={textStyle}>{NBSP}</Text>
            <Reanimated.View style={[styles.slot, daySlotStyle]}>
              <Text style={[textStyle, { width: dayW }]} numberOfLines={1}>
                {`${seg.dayPart}${NBSP}`}
              </Text>
            </Reanimated.View>
            <Text style={textStyle} numberOfLines={1}>
              {seg.year}
            </Text>
            <Reanimated.Text style={[textStyle, commaStyle]} numberOfLines={1}>
              ,
            </Reanimated.Text>
            <Reanimated.View style={[styles.slot, wdSlotStyle]}>
              <Reanimated.Text style={[textStyle, { width: wdW }, wdTextStyle]} numberOfLines={1}>
                {weekdayTail}
              </Reanimated.Text>
            </Reanimated.View>
          </View>
        </ScrollView>
      )}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'flex-start' },
  title: { ...type.title, fontSize: 22 },
  slot: { overflow: 'hidden' },
  dot: { position: 'absolute', left: 0, top: 0 },
  clip: { flexGrow: 0 },
  measureBox: { position: 'absolute', opacity: 0, left: 0, top: 0, flexDirection: 'row', width: 4000 },
});
