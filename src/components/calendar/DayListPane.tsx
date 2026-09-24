import { useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AgendaList } from '@/components/calendar/AgendaList';
import { type } from '@/constants/theme';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import { formatCalendarDisplayDate } from '@/lib/calendar/displayDate';
import {
  CAL_DAY_LIST_SOFT_BOUNDARY,
  dayListCommitDir,
} from '@/lib/calendar/dayListBoundary';
import type { CalendarItem } from '@/lib/calendar/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  day: string;
  items: CalendarItem[];
  showHiddenBadge?: boolean;
  onPressItem?: (item: CalendarItem) => void;
  /** Soft rubber at day edge then commit adjacent day (−1 prev, +1 next). */
  onCommitAdjacentDay?: (dir: -1 | 1) => void;
};

/**
 * Day List — Month List twin (CEO 2026-09-24):
 * "Month Day Year" header, one day's agenda, soft catch at ends → adjacent day.
 * Parent Screen scroll must be off so this scroller owns the rubber-band.
 */
export function DayListPane({
  day,
  items,
  showHiddenBadge,
  onPressItem,
  onCommitAdjacentDay,
}: Props) {
  const { colors } = useTheme();
  const chrome = useOptionalChrome();
  const overscrollRef = useRef(0);
  const title = formatCalendarDisplayDate(day);

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
      accessibilityLabel={`${title}, day list`}
    >
      <Text style={[styles.dayTitle, { color: colors.ink }]}>{title}</Text>
      <ScrollView
        key={day}
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
          days={[day]}
          items={items}
          showHiddenBadge={showHiddenBadge}
          onPressItem={onPressItem}
          includeEmptyDays
          hideDayHeadings
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  dayTitle: { ...type.title, fontSize: 22, marginBottom: 8 },
  scroller: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 24 },
});
