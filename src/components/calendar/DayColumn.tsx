import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { radius, type } from '@/constants/theme';
import { formatDayHeading } from '@/lib/calendar/day';
import { ZOOM_DAY_ENTER_MS, ZOOM_DAY_EXIT_MS } from '@/lib/calendar/zoomDrill';
import { CAL_P6_4A_ALWAYS_HOURS, CAL_P6_10B_SLOT_CREATE } from '@/lib/calendar/p6Laws';
import { roleTintColor } from '@/lib/calendar/roleTint';
import {
  formatHourLabel,
  HOUR_HEIGHT,
  layoutTimedBlocks,
  splitDayItems,
  TIMELINE_END_HOUR,
  TIMELINE_START_HOUR,
  timelineHours,
} from '@/lib/calendar/timeline';
import type { CalendarItem } from '@/lib/calendar/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  day: string;
  items: CalendarItem[];
  showHiddenBadge?: boolean;
  onPressItem?: (item: CalendarItem) => void;
  /**
   * CAL-P6-10B: tap empty hour slot → Add Event immediately (day + hour prefilled).
   * Existing event blocks still open/edit via onPressItem.
   */
  onPressSlot?: (day: string, hour: number) => void;
  /** After Week→Day inbound: slide+fade hours/title in. */
  enterAnim?: boolean;
  /** Before Day→Week reverse: slide+fade hours out, then onExitDone. */
  exitAnim?: boolean;
  onExitDone?: () => void;
};

/**
 * CAL-27 Day timeline — hour gutter + all-day strip + timed blocks (not card list).
 * Teacher Hidden badge (DP-A) stays on hidden dues.
 * CAL-P6-4A: always mount full hour gutter/track even with zero events.
 * CAL-P6-10B: empty slot tap opens composer (press highlight OK; no confirm).
 */
export function DayColumn({
  day,
  items,
  showHiddenBadge,
  onPressItem,
  onPressSlot,
  enterAnim = false,
  exitAnim = false,
  onExitDone,
}: Props) {
  const { colors } = useTheme();
  const { allDay, timed } = splitDayItems(items, day);
  const hours = timelineHours();
  const layouts = layoutTimedBlocks(timed);
  const bodyHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT;
  const empty = allDay.length === 0 && timed.length === 0;
  const [pressedHour, setPressedHour] = useState<number | null>(null);

  const enterY = useSharedValue(enterAnim ? 56 : 0);
  const enterOp = useSharedValue(enterAnim ? 0 : 1);

  useEffect(() => {
    if (!enterAnim) {
      enterY.value = 0;
      enterOp.value = 1;
      return;
    }
    enterY.value = 56;
    enterOp.value = 0;
    enterY.value = withTiming(0, { duration: ZOOM_DAY_ENTER_MS });
    enterOp.value = withTiming(1, { duration: ZOOM_DAY_ENTER_MS });
  }, [enterAnim, enterY, enterOp, day]);

  useEffect(() => {
    if (!exitAnim) return;
    enterY.value = withTiming(-48, { duration: ZOOM_DAY_EXIT_MS });
    enterOp.value = withTiming(0, { duration: ZOOM_DAY_EXIT_MS }, (finished) => {
      'worklet';
      if (finished && onExitDone) {
        runOnJS(onExitDone)();
      }
    });
  }, [exitAnim, enterY, enterOp, onExitDone]);

  const handoffStyle = useAnimatedStyle(() => ({
    opacity: enterOp.value,
    transform: [{ translateY: enterY.value }],
  }));

  // Named law pins (static analysis / tests).
  void CAL_P6_4A_ALWAYS_HOURS;
  void CAL_P6_10B_SLOT_CREATE;

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={`Day ${day}`}>
      <Reanimated.View style={handoffStyle}>
      <Text style={[styles.heading, { color: colors.ink }]}>{formatDayHeading(day)}</Text>

      {allDay.length > 0 ? (
        <View
          style={[styles.allDayStrip, { borderColor: colors.line, backgroundColor: colors.wash }]}
          accessibilityLabel="All-day events"
        >
          <Text style={[styles.allDayLabel, { color: colors.mute }]}>All-day</Text>
          <View style={styles.allDayList}>
            {allDay.map((item) => {
              const hidden = Boolean(showHiddenBadge && item.isHidden);
              const tint = roleTintColor(item.roleTint, colors);
              return (
                <Pressable
                  key={`ad:${item.source}:${item.id}`}
                  onPress={() => onPressItem?.(item)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    hidden
                      ? `${item.title}, all day, ${item.category}, Hidden`
                      : `${item.title}, all day, ${item.category}`
                  }
                  style={[
                    styles.allDayChip,
                    {
                      backgroundColor: hidden ? colors.warnSoft : colors.elevated,
                      borderColor: hidden ? colors.warn : tint,
                    },
                  ]}
                >
                  <View style={[styles.tintBar, { backgroundColor: tint }]} />
                  <Text style={[styles.allDayTitle, { color: colors.ink }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {hidden ? (
                    <Text style={[styles.badge, { color: colors.warn }]}>Hidden</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* CAL-P6-4A-02: optional one-line muted cue — never replaces the hour gutter. */}
      {empty ? (
        <Text style={[styles.emptyCue, { color: colors.mute }]}>Nothing on this day.</Text>
      ) : null}

      <ScrollView
        style={styles.timelineScroll}
        contentContainerStyle={{ minHeight: bodyHeight + 8 }}
        nestedScrollEnabled
      >
        <View style={[styles.timeline, { minHeight: bodyHeight }]}>
          <View style={styles.gutter}>
            {hours.map((hour) => (
              <View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
                <Text style={[styles.hourLabel, { color: colors.mute }]}>
                  {formatHourLabel(hour)}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.track, { borderColor: colors.line, height: bodyHeight }]}>
            {hours.map((hour) => (
              <Pressable
                key={`slot-${hour}`}
                accessibilityRole="button"
                accessibilityLabel={`Add event at ${formatHourLabel(hour)}`}
                disabled={!onPressSlot}
                onPressIn={() => setPressedHour(hour)}
                onPressOut={() => setPressedHour((cur) => (cur === hour ? null : cur))}
                onPress={() => onPressSlot?.(day, hour)}
                style={[
                  styles.hourSlot,
                  {
                    top: (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT,
                    height: HOUR_HEIGHT,
                    borderColor: colors.line,
                    backgroundColor:
                      pressedHour === hour ? colors.brandSoft : 'transparent',
                  },
                ]}
              />
            ))}
            {layouts.map(({ item, top, height }) => {
              const hidden = Boolean(showHiddenBadge && item.isHidden);
              const tint = roleTintColor(item.roleTint, colors);
              return (
                <Pressable
                  key={`t:${item.source}:${item.id}`}
                  onPress={() => onPressItem?.(item)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    hidden
                      ? `${item.title}, ${item.category}, Hidden`
                      : `${item.title}, ${item.category}`
                  }
                  style={[
                    styles.block,
                    {
                      top,
                      height,
                      backgroundColor: hidden ? colors.warnSoft : colors.elevated,
                      borderColor: hidden ? colors.warn : tint,
                    },
                  ]}
                >
                  <View style={[styles.tintBar, { backgroundColor: tint }]} />
                  <View style={styles.blockText}>
                    <Text style={[styles.blockTitle, { color: colors.ink }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[styles.blockMeta, { color: colors.mute }]} numberOfLines={1}>
                      {item.category}
                    </Text>
                    {hidden ? (
                      <Text style={[styles.badge, { color: colors.warn }]}>Hidden</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { ...type.section },
  allDayStrip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 8,
    gap: 6,
  },
  allDayLabel: { ...type.meta, textTransform: 'uppercase' },
  allDayList: { gap: 4 },
  allDayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingRight: 8,
    minHeight: 36,
    overflow: 'hidden',
  },
  allDayTitle: { ...type.meta, fontWeight: '600', flex: 1 },
  tintBar: { width: 4, alignSelf: 'stretch' },
  timelineScroll: { maxHeight: 520 },
  timeline: { flexDirection: 'row', gap: 4 },
  gutter: { width: 52 },
  hourRow: { justifyContent: 'flex-start' },
  hourLabel: { ...type.meta, fontSize: 11, textAlign: 'right', paddingRight: 4 },
  track: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  hourSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  block: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 18,
    zIndex: 2,
  },
  blockText: { flex: 1, paddingHorizontal: 6, paddingVertical: 2, gap: 0, minWidth: 0 },
  blockTitle: { ...type.meta, fontSize: 12, fontWeight: '600' },
  blockMeta: { ...type.meta, fontSize: 10 },
  badge: { ...type.meta, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  emptyCue: { ...type.meta, marginTop: 2 },
});
