import { useRef, type ReactNode } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { siblingBandOpacity } from '@/lib/calendar/zoomTransform';

import { AgendaList } from '@/components/calendar/AgendaList';
import { radius, type } from '@/constants/theme';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import { buildMonthGrid, weekdayLabels } from '@/lib/date/iso';
import { itemDayKey } from '@/lib/calendar/mapItem';
import {
  CAL_P6_6B_SOFT_BOUNDARY,
  monthListCommitDir,
} from '@/lib/calendar/monthListBoundary';
import { roleTintColor } from '@/lib/calendar/roleTint';
import { dayRoleTints } from '@/lib/calendar/timeline';
import type { CalendarItem } from '@/lib/calendar/types';
import type { ZoomSourceRect } from '@/lib/calendar/zoomDrill';
import type { MonthMode } from '@/lib/calendar/viewPrefs';
import { todayISO } from '@/lib/calendar/week';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  year: number;
  monthIndex0: number;
  label: string;
  items: CalendarItem[];
  selectedDay: string | null;
  showHiddenBadge?: boolean;
  /** CAL-R4 C-B — Compact grid or List. No Stacked/Detail stubs. */
  mode?: MonthMode;
  onSelectDay: (iso: string) => void;
  /** Tap-zoom Month → Week (day cell). focusIndex = week row. */
  onZoomDay?: (iso: string, source: ZoomSourceRect, focusIndex: number) => void;
  /** CAL-P6-3A: week-number / week-row → Week containing that week. */
  onZoomWeek?: (iso: string, source: ZoomSourceRect, focusIndex: number) => void;
  /** Live Month→Week drill: fade non-focus week rows while focus stays opaque. */
  drillProgress?: SharedValue<number> | null;
  drillFocusWeekIndex?: number | null;
  onPressItem?: (item: CalendarItem) => void;
  /**
   * CAL-P6-6B: soft rubber at month edge then commit adjacent month.
   * dir −1 = previous month, +1 = next month.
   */
  onCommitAdjacentMonth?: (dir: -1 | 1) => void;
};

/**
 * CAL-26 / CAL-R4 C-B Month — Compact grid or List only.
 * Compact: grid (+ selected-day list when not zooming). List: month AgendaList.
 * CAL-P6-6B List: open at month start; soft boundary then commit next/prev month.
 */
export function MonthGrid({
  year,
  monthIndex0,
  label,
  items,
  selectedDay,
  showHiddenBadge,
  mode = 'compact',
  onSelectDay,
  onZoomDay,
  onZoomWeek,
  onPressItem,
  onCommitAdjacentMonth,
  drillProgress = null,
  drillFocusWeekIndex = null,
}: Props) {
  const { colors } = useTheme();
  const chrome = useOptionalChrome();
  const today = todayISO();
  const weekRowRefs = useRef<Map<number, View | null>>(new Map());
  const dayCellRefs = useRef<Map<string, View | null>>(new Map());
  const measureNode = (
    node: View | null | undefined,
    fire: (source: ZoomSourceRect) => void,
  ) => {
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => fire({ x, y, width, height }));
    } else {
      fire({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  const weeks = buildMonthGrid(year, monthIndex0, 0);
  const weekdays = weekdayLabels(0);
  const fromIso = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-01`;
  const monthPrefix = fromIso.slice(0, 7);
  const overscrollRef = useRef(0);
  const listKey = `${year}-${monthIndex0}`;

  void CAL_P6_6B_SOFT_BOUNDARY;

  const selectedItems = selectedDay
    ? items.filter((item) => itemDayKey(item) === selectedDay)
    : [];

  const inMonthDays = weeks
    .flat()
    .filter((cell): cell is { day: number; iso: string } =>
      Boolean(cell && cell.iso.startsWith(monthPrefix)),
    )
    .map((cell) => cell.iso);

  const onListScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // CAL-P6-8A: Month List owns vertical scroll while Screen scroll=false — forward
    // into chrome hide/show so PersonTabs + tray still leave together.
    chrome?.onScroll(event);
    if (!onCommitAdjacentMonth) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const y = contentOffset.y;
    const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
    if (y < 0) {
      overscrollRef.current = y;
      return;
    }
    if (y > maxY) {
      overscrollRef.current = y - maxY;
      return;
    }
    overscrollRef.current = 0;
  };

  const onListScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onCommitAdjacentMonth) return;
    const { contentOffset, contentSize, layoutMeasurement, velocity } = event.nativeEvent;
    const y = contentOffset.y;
    const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
    const over = overscrollRef.current;
    overscrollRef.current = 0;
    const dir = monthListCommitDir({
      overscrollPx: over,
      y,
      maxY,
      velocityY: velocity?.y,
    });
    if (dir === -1 || dir === 1) onCommitAdjacentMonth(dir);
  };

  if (mode === 'list') {
    // CAL-P6-6B: flex-bounded scroller (parent Screen scroll=false in list mode).
    // Unbounded nested ScrollView never self-scrolls → soft-boundary never fires.
    return (
      <View
        style={[styles.wrap, styles.listWrap]}
        accessibilityRole="summary"
        accessibilityLabel={`${label}, list`}
      >
        <Text style={[styles.monthTitle, { color: colors.ink }]}>{label}</Text>
        <ScrollView
          key={listKey}
          style={styles.listScroller}
          nestedScrollEnabled
          bounces
          alwaysBounceVertical
          scrollEventThrottle={16}
          onScroll={onListScroll}
          onScrollBeginDrag={(event) => {
            chrome?.onScrollBeginDrag(event);
          }}
          onScrollEndDrag={onListScrollEnd}
          onMomentumScrollEnd={onListScrollEnd}
          contentContainerStyle={styles.listScrollContent}
          accessibilityLabel="Month activity list"
        >
          <AgendaList
            days={inMonthDays}
            items={items.filter((item) => itemDayKey(item).startsWith(monthPrefix))}
            showHiddenBadge={showHiddenBadge}
            onPressItem={onPressItem}
            includeEmptyDays
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={label}>
      <Text style={[styles.monthTitle, { color: colors.ink }]}>{label}</Text>
      <View style={styles.weekdays}>
        {onZoomWeek ? (
          <Text style={[styles.weekNumHdr, { color: colors.mute }]} accessibilityElementsHidden>
            W
          </Text>
        ) : null}
        {weekdays.map((d, i) => (
          <Text key={`${d}-${i}`} style={[styles.wd, { color: colors.mute }]}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => {
        const firstInMonth = week.find((cell) => cell && cell.iso.startsWith(monthPrefix));
        const weekAnchor = firstInMonth?.iso ?? week.find(Boolean)?.iso ?? null;
        return (
          <DrillWeekRow
            key={`w-${wi}`}
            weekIndex={wi}
            drillProgress={drillProgress}
            drillFocusWeekIndex={drillFocusWeekIndex}
            rowRef={(node) => {
              weekRowRefs.current.set(wi, node);
            }}
          >
            {onZoomWeek && weekAnchor ? (
              <Pressable
                onPress={() =>
                  measureNode(weekRowRefs.current.get(wi), (source) =>
                    onZoomWeek(weekAnchor, source, wi),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Week of ${weekAnchor}`}
                style={styles.weekNumHit}
              >
                <Text style={[styles.weekNum, { color: colors.mute }]}>{wi + 1}</Text>
              </Pressable>
            ) : onZoomWeek ? (
              <View style={styles.weekNumHit} />
            ) : null}
            {week.map((cell, ci) => {
              if (!cell) {
                return <View key={`e-${ci}`} style={styles.dayCell} />;
              }
              const inMonth = cell.iso.slice(0, 7) === monthPrefix;
              const isToday = cell.iso === today;
              const isSelected = cell.iso === selectedDay;
              const tints = dayRoleTints(items, cell.iso, 4);
              return (
                <Pressable
                  key={cell.iso}
                  ref={(node) => {
                    dayCellRefs.current.set(cell.iso, node as unknown as View | null);
                  }}
                  onPress={() => {
                    if (onZoomDay) {
                      measureNode(
                        dayCellRefs.current.get(cell.iso),
                        (source) => onZoomDay(cell.iso, source, wi),
                      );
                    } else {
                      onSelectDay(cell.iso);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={cell.iso}
                  style={[
                    styles.dayCell,
                    styles.compactCell,
                    isSelected && {
                      backgroundColor: colors.brandSoft,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    allowFontScaling={false}
                    ellipsizeMode="clip"
                    style={[
                      styles.dayNum,
                      {
                        color: isToday
                          ? colors.brandInk
                          : inMonth
                            ? colors.ink
                            : colors.mute,
                        backgroundColor: isToday ? colors.brand : 'transparent',
                        opacity: inMonth ? 1 : 0.45,
                      },
                    ]}
                  >
                    {cell.day}
                  </Text>
                  {tints.length > 0 ? (
                    <View style={styles.dots}>
                      {tints.map((tint) => (
                        <View
                          key={tint}
                          style={[styles.dot, { backgroundColor: roleTintColor(tint, colors) }]}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.dotSpacer} />
                  )}
                </Pressable>
              );
            })}
          </DrillWeekRow>
        );
      })}

      {selectedDay && !onZoomDay ? (
        <View style={styles.listBlock}>
          {selectedItems.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mute }]}>Nothing on this day.</Text>
          ) : (
            <AgendaList
              days={[selectedDay]}
              items={selectedItems}
              showHiddenBadge={showHiddenBadge}
              onPressItem={onPressItem}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

function DrillWeekRow({
  weekIndex,
  drillProgress,
  drillFocusWeekIndex,
  rowRef,
  children,
}: {
  weekIndex: number;
  drillProgress: SharedValue<number> | null;
  drillFocusWeekIndex: number | null;
  rowRef: (node: View | null) => void;
  children: ReactNode;
}) {
  const animated = useAnimatedStyle(() => {
    if (drillProgress == null || drillFocusWeekIndex == null) {
      return { opacity: 1 };
    }
    const isFocus = weekIndex === drillFocusWeekIndex;
    return { opacity: siblingBandOpacity(drillProgress.value, isFocus) };
  });
  return (
    <Reanimated.View
      ref={rowRef as never}
      collapsable={false}
      style={[styles.week, animated]}
    >
      {children}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({

  wrap: { gap: 4 },
  listWrap: { flex: 1, minHeight: 0 },
  listScroller: { flex: 1, minHeight: 0 },
  monthTitle: { ...type.title, fontSize: 22, marginBottom: 8 },
  weekdays: { flexDirection: 'row', marginBottom: 4, alignItems: 'center' },
  weekNumHdr: {
    width: 28,
    textAlign: 'center',
    ...type.meta,
    fontSize: 11,
  },
  wd: { flex: 1, textAlign: 'center', ...type.meta, fontSize: 12 },
  week: { flexDirection: 'row', alignItems: 'center' },
  weekNumHit: {
    width: 28,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNum: { ...type.meta, fontSize: 11, fontVariant: ['tabular-nums'] },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 4,
  },
  compactCell: {
    minHeight: 36,
    paddingVertical: 2,
  },
  dayNum: {
    ...type.body,
    // Item 7 KEEP: two-digit dayNum single-line on phone Month grid.
    fontSize: 14,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 0,
    paddingVertical: 2,
    fontVariant: ['tabular-nums'],
  },
  dots: { flexDirection: 'row', gap: 3, height: 5, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dotSpacer: { height: 5 },
  listBlock: { marginTop: 16, gap: 8 },
  listScrollContent: { paddingBottom: 24 },
  empty: { ...type.body, marginVertical: 8 },
});
