import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { formatDayHeading } from '@/lib/calendar/day';
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
};

/**
 * CAL-27 Day timeline — hour gutter + all-day strip + timed blocks (not card list).
 * Teacher Hidden badge (DP-A) stays on hidden dues.
 */
export function DayColumn({ day, items, showHiddenBadge, onPressItem }: Props) {
  const { colors } = useTheme();
  const { allDay, timed } = splitDayItems(items, day);
  const hours = timelineHours();
  const layouts = layoutTimedBlocks(timed);
  const bodyHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT;

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={`Day ${day}`}>
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

      {allDay.length === 0 && timed.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>Nothing on this day.</Text>
      ) : (
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
                <View
                  key={`line-${hour}`}
                  style={[
                    styles.hourLine,
                    { top: (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT, borderColor: colors.line },
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
      )}
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
  hourLine: {
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
  },
  blockText: { flex: 1, paddingHorizontal: 6, paddingVertical: 2, gap: 0, minWidth: 0 },
  blockTitle: { ...type.meta, fontSize: 12, fontWeight: '600' },
  blockMeta: { ...type.meta, fontSize: 10 },
  badge: { ...type.meta, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  empty: { ...type.body, marginVertical: 8 },
});
