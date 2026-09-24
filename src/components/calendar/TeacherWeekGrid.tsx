import { useMemo, useRef, type ReactNode } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { siblingBandOpacity } from '@/lib/calendar/zoomTransform';

import { radius, type } from '@/constants/theme';
import { itemDayKey } from '@/lib/calendar/mapItem';
import type { MultidayCount } from '@/lib/calendar/multiday';
import { nextCountFromPinch } from '@/lib/calendar/multiday';
import { roleTintColor } from '@/lib/calendar/roleTint';
import {
  formatHourLabel,
  hasTimedInRange,
  HOUR_HEIGHT,
  layoutTimedBlocks,
  splitDayItems,
  TIMELINE_END_HOUR,
  TIMELINE_START_HOUR,
  timelineHours,
} from '@/lib/calendar/timeline';
import type { CalendarItem } from '@/lib/calendar/types';
import type { ZoomSourceRect } from '@/lib/calendar/zoomDrill';
import {
  dayNumber,
  isSameDayIso,
  todayISO,
  weekdayShort,
} from '@/lib/calendar/week';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  days: string[];
  items: CalendarItem[];
  showHiddenBadge?: boolean;
  onPressItem?: (item: CalendarItem) => void;
  /** CAL-P6-3A: Week day column/header → Day. focusIndex = day column. */
  onPressDay?: (iso: string, source?: ZoomSourceRect, focusIndex?: number) => void;
  /** Live Week→Day drill: fade non-focus day columns. */
  drillProgress?: SharedValue<number> | null;
  drillFocusDayIndex?: number | null;
  /** Month/year title matching MonthGrid (e.g. "January 2026"). Static — never fades. */
  monthTitle?: string;
  /** Sticky CalendarPeriodTitle (outside CalendarZoomDrill) owns the header — skip ours. */
  hideTitle?: boolean;
  /** When set with onChangeDayCount, pinch (full motion) adjusts 7↔5↔3. */
  dayCount?: MultidayCount;
  onChangeDayCount?: (count: MultidayCount) => void;
  /** Reduced-motion: never attach pinch. Stepper remains outside. */
  allowPinch?: boolean;
};

/**
 * CAL-28 denser week + CAL-29 multi-day columns.
 * All-day row + hour gutter when timed items exist. Not FullCalendar.
 */
export function TeacherWeekGrid({
  days,
  items,
  showHiddenBadge,
  onPressItem,
  onPressDay,
  dayCount,
  onChangeDayCount,
  allowPinch = false,
  drillProgress = null,
  drillFocusDayIndex = null,
  monthTitle,
  hideTitle = false,
}: Props) {
  const { colors } = useTheme();
  const today = todayISO();
  const showTimeline = hasTimedInRange(items, days);
  const hours = timelineHours();
  const bodyHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT;

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const day of days) map.set(day, []);
    for (const item of items) {
      const key = itemDayKey(item);
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
    }
    return map;
  }, [days, items]);

  const pinchRef = useRef({ startDist: 0, armed: false });
  const countRef = useRef(dayCount ?? 7);
  countRef.current = dayCount ?? 7;
  const dayHeaderRefs = useRef<Map<string, View | null>>(new Map());

  const pinchResponder = useMemo(() => {
    if (!allowPinch || !onChangeDayCount) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: (e) => (e.nativeEvent.touches?.length ?? 0) >= 2,
      onMoveShouldSetPanResponder: (e) => (e.nativeEvent.touches?.length ?? 0) >= 2,
      onPanResponderGrant: (e) => {
        const dist = touchDistance(e);
        pinchRef.current = { startDist: dist, armed: dist > 0 };
      },
      onPanResponderMove: (e) => {
        if (!pinchRef.current.armed) return;
        const dist = touchDistance(e);
        if (!(pinchRef.current.startDist > 0) || !(dist > 0)) return;
        const scale = dist / pinchRef.current.startDist;
        const next = nextCountFromPinch(countRef.current, scale);
        if (next !== countRef.current) {
          countRef.current = next;
          pinchRef.current.startDist = dist;
          onChangeDayCount(next);
        }
      },
      onPanResponderRelease: () => {
        pinchRef.current = { startDist: 0, armed: false };
      },
      onPanResponderTerminate: () => {
        pinchRef.current = { startDist: 0, armed: false };
      },
    });
  }, [allowPinch, onChangeDayCount]);

  const accessibilityLabel =
    days.length === 7 ? 'Week calendar' : `${days.length}-day calendar`;

  return (
    <View
      style={styles.grid}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
      {...(pinchResponder ? pinchResponder.panHandlers : null)}
    >
      {monthTitle && !hideTitle ? (
        <Text style={[styles.monthTitle, { color: colors.ink }]} accessibilityRole="header">
          {monthTitle}
        </Text>
      ) : null}
      <View style={styles.headerRow}>
        {showTimeline ? <View style={styles.gutterSpacer} /> : null}
        {days.map((day, di) => {
          const isToday = isSameDayIso(day, today);
          const Header = onPressDay ? Pressable : View;
          return (
            <DrillDayCol
              key={`h-${day}`}
              dayIndex={di}
              drillProgress={drillProgress}
              drillFocusDayIndex={drillFocusDayIndex}
            >
            <Header
              ref={(node: View | null) => {
                dayHeaderRefs.current.set(day, node);
              }}
              style={styles.col}
              {...(onPressDay
                ? {
                    onPress: () => {
                      const node = dayHeaderRefs.current.get(day);
                      const fire = (source: ZoomSourceRect) => onPressDay(day, source, di);
                      if (node && typeof node.measureInWindow === 'function') {
                        node.measureInWindow((x, y, width, height) => {
                          fire({ x, y, width, height });
                        });
                      } else {
                        fire({ x: 0, y: 0, width: 0, height: 0 });
                      }
                    },
                    accessibilityRole: 'button' as const,
                    accessibilityLabel: `Open day ${day}`,
                  }
                : null)}
            >
              <Text
                style={[styles.weekday, { color: isToday ? colors.brand : colors.mute }]}
              >
                {weekdayShort(day).toUpperCase()}
              </Text>
              <Text
                numberOfLines={1}
                allowFontScaling={false}
                style={[
                  styles.dayNum,
                  {
                    color: isToday ? colors.brandInk : colors.ink,
                    backgroundColor: isToday ? colors.brand : 'transparent',
                  },
                ]}
              >
                {dayNumber(day)}
              </Text>
            </Header>
            </DrillDayCol>
          );
        })}
      </View>

      {/* All-day row */}
      <View style={[styles.allDayRow, { borderColor: colors.line }]}>
        {showTimeline ? (
          <Text style={[styles.allDayGutter, { color: colors.mute }]}>All-day</Text>
        ) : null}
        {days.map((day, di) => {
          const { allDay } = splitDayItems(byDay.get(day) ?? [], day);
          return (
            <DrillDayCol key={`ad-${day}`} dayIndex={di} drillProgress={drillProgress} drillFocusDayIndex={drillFocusDayIndex}>
            <View style={[styles.col, styles.allDayCell]}>
              {allDay.map((item) => {
                const hidden = Boolean(showHiddenBadge && item.isHidden);
                const tint = roleTintColor(item.roleTint, colors);
                return (
                  <Pressable
                    key={`ad:${item.source}:${item.id}`}
                    onPress={() => onPressItem?.(item)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      hidden ? `${item.title}, Hidden` : item.title
                    }
                    style={[
                      styles.chip,
                      {
                        backgroundColor: hidden ? colors.warnSoft : colors.wash,
                        borderColor: hidden ? colors.warn : tint,
                      },
                    ]}
                  >
                    <Text numberOfLines={1} style={[styles.chipTitle, { color: colors.ink }]}>
                      {item.title}
                    </Text>
                    {hidden ? (
                      <Text style={[styles.hiddenBadge, { color: colors.warn }]}>Hidden</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            </DrillDayCol>
          );
        })}
      </View>

      {showTimeline ? (
        <ScrollView style={styles.timelineScroll} nestedScrollEnabled>
          <View style={[styles.timelineBody, { height: bodyHeight }]}>
            <View style={styles.gutter}>
              {hours.map((hour) => (
                <View key={hour} style={{ height: HOUR_HEIGHT }}>
                  <Text style={[styles.hourLabel, { color: colors.mute }]}>
                    {formatHourLabel(hour)}
                  </Text>
                </View>
              ))}
            </View>
            {days.map((day, di) => {
              const { timed } = splitDayItems(byDay.get(day) ?? [], day);
              const layouts = layoutTimedBlocks(timed);
              return (
                <DrillDayCol key={`t-${day}`} dayIndex={di} drillProgress={drillProgress} drillFocusDayIndex={drillFocusDayIndex}>
                <View
                  style={[styles.col, styles.dayTrack, { borderColor: colors.line }]}
                >
                  {hours.map((hour) => (
                    <View
                      key={`line-${day}-${hour}`}
                      style={[
                        styles.hourLine,
                        {
                          top: (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT,
                          borderColor: colors.line,
                        },
                      ]}
                    />
                  ))}
                  {layouts.map(({ item, top, height }) => {
                    const hidden = Boolean(showHiddenBadge && item.isHidden);
                    const tint = roleTintColor(item.roleTint, colors);
                    return (
                      <Pressable
                        key={`tb:${item.source}:${item.id}`}
                        onPress={() => onPressItem?.(item)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          hidden ? `${item.title}, Hidden` : item.title
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
                        <Text
                          numberOfLines={2}
                          style={[styles.chipTitle, { color: colors.ink }]}
                        >
                          {item.title}
                        </Text>
                        {hidden ? (
                          <Text style={[styles.hiddenBadge, { color: colors.warn }]}>
                            Hidden
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                </DrillDayCol>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.bodyRow}>
          {days.map((day, di) => {
            const list = (byDay.get(day) ?? []).filter((i) => !i.allDay);
            return (
              <DrillDayCol key={`b-${day}`} dayIndex={di} drillProgress={drillProgress} drillFocusDayIndex={drillFocusDayIndex}>
              <View
                style={[styles.col, styles.dayCell, { borderColor: colors.line }]}
              >
                {list.length === 0 ? (
                  <Text style={[styles.emptyCell, { color: colors.mute }]}>·</Text>
                ) : (
                  list.map((item) => {
                    const hidden = Boolean(showHiddenBadge && item.isHidden);
                    const tint = roleTintColor(item.roleTint, colors);
                    return (
                      <Pressable
                        key={`${item.source}:${item.id}`}
                        onPress={() => onPressItem?.(item)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          hidden ? `${item.title}, Hidden` : item.title
                        }
                        style={[
                          styles.chip,
                          {
                            backgroundColor: hidden ? colors.warnSoft : colors.wash,
                            borderColor: hidden ? colors.warn : tint,
                          },
                        ]}
                      >
                        <Text
                          numberOfLines={2}
                          style={[styles.chipTitle, { color: colors.ink }]}
                        >
                          {item.title}
                        </Text>
                        {hidden ? (
                          <Text style={[styles.hiddenBadge, { color: colors.warn }]}>
                            Hidden
                          </Text>
                        ) : null}
                        <Text
                          style={[styles.chipMeta, { color: colors.mute }]}
                          numberOfLines={1}
                        >
                          {item.category}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
              </DrillDayCol>
            );
          })}
        </View>
      )}
    </View>
  );
}

function touchDistance(e: GestureResponderEvent): number {
  const touches = e.nativeEvent.touches;
  if (!touches || touches.length < 2) return 0;
  const a = touches[0]!;
  const b = touches[1]!;
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.hypot(dx, dy);
}

function DrillDayCol({
  dayIndex,
  drillProgress,
  drillFocusDayIndex,
  children,
}: {
  dayIndex: number;
  drillProgress: SharedValue<number> | null;
  drillFocusDayIndex: number | null;
  children: ReactNode;
}) {
  const animated = useAnimatedStyle(() => {
    if (drillProgress == null || drillFocusDayIndex == null) {
      return { opacity: 1 };
    }
    const isFocus = dayIndex === drillFocusDayIndex;
    return { opacity: siblingBandOpacity(drillProgress.value, isFocus) };
  });
  return <Reanimated.View style={[{ flex: 1, minWidth: 0 }, animated]}>{children}</Reanimated.View>;
}

const styles = StyleSheet.create({

  grid: { gap: 6 },
  monthTitle: { ...type.title, fontSize: 22, marginBottom: 8 },
  headerRow: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  gutterSpacer: { width: 44 },
  allDayRow: {
    flexDirection: 'row',
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 4,
    minHeight: 28,
  },
  allDayGutter: {
    width: 44,
    ...type.meta,
    fontSize: 9,
    textTransform: 'uppercase',
    paddingTop: 4,
  },
  allDayCell: { gap: 2, minHeight: 24 },
  timelineScroll: { maxHeight: 420 },
  timelineBody: { flexDirection: 'row', gap: 2 },
  gutter: { width: 44 },
  hourLabel: { ...type.meta, fontSize: 10, textAlign: 'right', paddingRight: 2 },
  dayTrack: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
    minWidth: 0,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  block: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: 2,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'stretch',
    minHeight: 160,
  },
  col: { flex: 1, minWidth: 0 },
  weekday: {
    ...type.meta,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontSize: 10,
  },
  dayNum: {
    ...type.section,
    textAlign: 'center',
    alignSelf: 'center',
    minWidth: 26,
    // Item 7 KEEP: two-digit dayNum single-line.
    paddingHorizontal: 0,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: 2,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  dayCell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  emptyCell: { ...type.meta, textAlign: 'center', marginTop: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: 3,
    paddingVertical: 3,
    gap: 1,
  },
  chipTitle: { ...type.meta, fontSize: 10, fontWeight: '600' },
  chipMeta: { ...type.meta, fontSize: 9 },
  hiddenBadge: {
    ...type.meta,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
