import { useMemo, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AgendaList } from '@/components/calendar/AgendaList';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import {
  CAL_DAY_LIST_SOFT_BOUNDARY,
  dayListCommitDir,
} from '@/lib/calendar/dayListBoundary';
import {
  DAY_LIST_WINDOW_DAYS,
  dayListOriginAround,
  dayListWindowDays,
} from '@/lib/calendar/listAnchorDay';
import type { CalendarItem } from '@/lib/calendar/types';

type Props = {
  day: string;
  items: CalendarItem[];
  showHiddenBadge?: boolean;
  onPressItem?: (item: CalendarItem) => void;
  /** Soft rubber at list edge then shift the window (−1 prev, +1 next). */
  onCommitAdjacentDay?: (dir: -1 | 1) => void;
};

/**
 * Day List — continuous painted window of days with empty stubs (CEO 2026-09-24).
 * Every day in the window shows a heading + events or "No events". Soft catch at
 * ends recenters via parent dayAnchor (Month List soft-page pattern).
 */
export function DayListPane({
  day,
  items,
  showHiddenBadge,
  onPressItem,
  onCommitAdjacentDay,
}: Props) {
  const chrome = useOptionalChrome();
  const overscrollRef = useRef(0);
  const origin = useMemo(() => dayListOriginAround(day), [day]);
  const days = useMemo(
    () => dayListWindowDays(origin, DAY_LIST_WINDOW_DAYS),
    [origin],
  );

  void CAL_DAY_LIST_SOFT_BOUNDARY;

  const onListScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    chrome?.onScroll(event);
    if (!onCommitAdjacentDay) return;
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
    if (!onCommitAdjacentDay) return;
    const { contentOffset, contentSize, layoutMeasurement, velocity } = event.nativeEvent;
    const y = contentOffset.y;
    const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
    const over = overscrollRef.current;
    overscrollRef.current = 0;
    const dir = dayListCommitDir({
      overscrollPx: over,
      y,
      maxY,
      velocityY: velocity?.y,
    });
    if (dir === -1 || dir === 1) onCommitAdjacentDay(dir);
  };

  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel="Day list"
    >
      <ScrollView
        key={origin}
        style={styles.scroller}
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
        contentContainerStyle={styles.scrollContent}
        accessibilityLabel="Day activity list"
      >
        <AgendaList
          days={days}
          items={items}
          showHiddenBadge={showHiddenBadge}
          onPressItem={onPressItem}
          includeEmptyDays
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  scroller: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 24 },
});
