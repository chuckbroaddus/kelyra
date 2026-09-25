import {
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, {
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { radius, type } from '@/constants/theme';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import {
  DAY_LIST_EMPTY_H,
  DAY_LIST_HEADER_H,
  DAY_LIST_INDENT,
  DAY_LIST_ITEM_H,
  DAY_LIST_MAX_RELOAD_DAYS,
  buildDayListLayout,
  dayListChunkAfter,
  dayListChunkBefore,
  dayListCompensatedOffset,
  dayListDayNumber,
  dayListDaysBetween,
  dayListExtendNeeds,
  dayListFollowAt,
  dayListOffsetAt,
  dayListSeedRange,
  dayListTopIndexAt,
  type DayListLayout,
  type DayListRow,
} from '@/lib/calendar/dayListRows';
import { itemDayKey } from '@/lib/calendar/mapItem';
import {
  dayPeriodTitleSegments,
  formatDayPeriodTitle,
  spokenDayPeriodTitle,
} from '@/lib/calendar/periodTitle';
import type { CalendarItem } from '@/lib/calendar/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props<T> = {
  /** Day to open on, and the target of each jump (drum snap / Today). */
  day: string;
  /** Bumps when the parent asks for a jump to `day` (even if `day` is unchanged). */
  jumpNonce: number;
  /** Fetch seat-visible items for an inclusive ISO day range (parent owns filters). */
  fetchRange: (fromIso: string, toIso: string) => Promise<T[]>;
  /** Bumps when the parent reloads (focus, filters, create/edit/delete). */
  reloadKey: number;
  /** Search text; filters loaded items by title (or `matchesQuery`). */
  query?: string;
  showHiddenBadge?: boolean;
  onPressItem?: (item: T) => void;
  /**
   * DIARY-LIST: reuse the Day List for non-calendar rows (Journal / Ledger).
   * Omit all of these for CalendarItem rows. Rows keep the fixed DAY_LIST_ITEM_H.
   */
  itemKey?: (item: T) => string;
  itemDay?: (item: T) => string;
  compareItems?: (a: T, b: T) => number;
  matchesQuery?: (item: T, lowerQuery: string) => boolean;
  renderItem?: (item: T) => ReactElement;
  /** Label under an empty day (default "No events"). */
  emptyLabel?: string;
  /** Day whose sticky header is pinned at the top; drives the drum center card. */
  onTopDayChange?: (day: string) => void;
  /**
   * CAL-DRUM-FOLLOW: written on every scroll with day number + fraction through
   * the pinned section, so the drum turns with the list both ways.
   */
  followPosition?: SharedValue<number> | null;
  /**
   * CAL-LIST-FOLLOW: drum position while the drum is dragged / coasting (NaN when
   * idle). The list scrolls to it live instead of waiting for finger-up.
   */
  drivePosition?: SharedValue<number> | null;
};

type Range = { start: string; end: string };

const calendarItemKey = (item: CalendarItem) => `${item.source}:${item.id}`;
const calendarCompare = (a: CalendarItem, b: CalendarItem) => a.startsAt.localeCompare(b.startsAt);
const calendarMatches = (item: CalendarItem, q: string) => item.title.toLowerCase().includes(q);

type RowFns<T> = {
  key: (item: T) => string;
  day: (item: T) => string;
  compare: (a: T, b: T) => number;
  matches: (item: T, q: string) => boolean;
};

function bucketByDay<T>(rows: T[], fns: RowFns<T>, into?: Map<string, T[]>) {
  const map = into ?? new Map<string, T[]>();
  for (const item of rows) {
    const key = fns.day(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  for (const list of map.values()) list.sort(fns.compare);
  return map;
}

/**
 * Day List — continuous infinite scroll of days (CEO 2026-09-24 v2).
 * Each day is a sticky section header styled like the Single Day title
 * (`Feb. 4, 2026, Wed.`); its events or "No events" sit indented beneath. The header
 * stays pinned while its section's rows scroll under it, then the next day's header
 * takes over. Days load in chunks ahead of the viewport both ways, so the list never
 * stops at an edge; the pinned day drives the drum center card.
 */
export function DayListPane<T = CalendarItem>({
  day,
  jumpNonce,
  fetchRange,
  reloadKey,
  query = '',
  showHiddenBadge,
  onPressItem,
  onTopDayChange,
  followPosition = null,
  drivePosition = null,
  itemKey,
  itemDay,
  compareItems,
  matchesQuery,
  renderItem,
  emptyLabel = 'No events',
}: Props<T>) {
  const { colors } = useTheme();
  const chrome = useOptionalChrome();
  const listRef = useAnimatedRef<FlatList<DayListRow<T>>>();
  // Calendar rows use the CalendarItem defaults; Diary passes its own.
  const fnsRef = useRef<RowFns<T>>(null as unknown as RowFns<T>);
  fnsRef.current = {
    key: itemKey ?? (calendarItemKey as unknown as (item: T) => string),
    day: itemDay ?? (itemDayKey as unknown as (item: T) => string),
    compare: compareItems ?? (calendarCompare as unknown as (a: T, b: T) => number),
    matches: matchesQuery ?? (calendarMatches as unknown as (item: T, q: string) => boolean),
  };

  const [range, setRange] = useState<Range | null>(null);
  const [itemsByDay, setItemsByDay] = useState<Map<string, T[]>>(() => new Map());
  const [seedId, setSeedId] = useState(0);
  const [seedTarget, setSeedTarget] = useState(day);
  const [error, setError] = useState<string | null>(null);

  const rangeRef = useRef<Range | null>(null);
  const genRef = useRef(0);
  const seedingRef = useRef(false);
  const loadingBeforeRef = useRef(false);
  const loadingAfterRef = useRef(false);
  /** Where the top edge sits: pinned day + distance below its header. */
  const scrollRef = useRef({ y: 0, topDay: day, intra: 0 });
  const reportedTopRef = useRef<string | null>(null);
  /** Programmatic jump in flight: hold drum reports until the list lands on it. */
  const jumpTargetRef = useRef<string | null>(null);
  /** UI-thread mirror of jumpTargetRef: 1 holds drum follow during a jump. */
  const jumpingShared = useSharedValue(0);
  const setJumpTarget = useCallback(
    (target: string | null) => {
      jumpTargetRef.current = target;
      jumpingShared.value = target ? 1 : 0;
    },
    [jumpingShared],
  );
  const fetchRef = useRef(fetchRange);
  fetchRef.current = fetchRange;
  const onTopRef = useRef(onTopDayChange);
  onTopRef.current = onTopDayChange;
  const followRef = useRef(followPosition);
  followRef.current = followPosition;
  const setFollow = useCallback((pos: number) => {
    if (followRef.current) followRef.current.value = pos;
  }, []);

  const reportTop = useCallback((d: string) => {
    if (reportedTopRef.current === d) return;
    reportedTopRef.current = d;
    onTopRef.current?.(d);
  }, []);

  const seed = useCallback(
    (target: string) => {
      const gen = ++genRef.current;
      seedingRef.current = true;
      loadingBeforeRef.current = false;
      loadingAfterRef.current = false;
      const r = dayListSeedRange(target);
      fetchRef
        .current(r.start, r.end)
        .then((rows) => {
          if (gen !== genRef.current) return;
          rangeRef.current = r;
          scrollRef.current = { y: 0, topDay: target, intra: 0 };
          setFollow(dayListDayNumber(target));
          setError(null);
          setItemsByDay(bucketByDay(rows, fnsRef.current));
          setRange(r);
          setSeedTarget(target);
          setSeedId((n) => n + 1);
          reportTop(target);
        })
        .catch((err: unknown) => {
          if (gen !== genRef.current) return;
          setError(err instanceof Error ? err.message : 'Could not load calendar');
        })
        .finally(() => {
          if (gen === genRef.current) seedingRef.current = false;
        });
    },
    [reportTop, setFollow],
  );

  const extend = useCallback((dir: -1 | 1) => {
    const r = rangeRef.current;
    if (!r || seedingRef.current) return;
    const flag = dir < 0 ? loadingBeforeRef : loadingAfterRef;
    if (flag.current) return;
    flag.current = true;
    const gen = genRef.current;
    const chunk = dir < 0 ? dayListChunkBefore(r.start) : dayListChunkAfter(r.end);
    fetchRef
      .current(chunk.start, chunk.end)
      .then((rows) => {
        if (gen !== genRef.current) return;
        setItemsByDay((prev) => {
          const next = new Map(prev);
          for (const d of dayListDaysBetween(chunk.start, chunk.end)) next.delete(d);
          return bucketByDay(rows, fnsRef.current, next);
        });
        const cur = rangeRef.current!;
        const nextRange =
          dir < 0 ? { start: chunk.start, end: cur.end } : { start: cur.start, end: chunk.end };
        rangeRef.current = nextRange;
        setRange(nextRange);
      })
      .catch(() => {
        // Next scroll tick near the edge retries.
      })
      .finally(() => {
        flag.current = false;
      });
  }, []);

  // Mount: paint around the opening day.
  useEffect(() => {
    seed(day);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only; jumps use jumpNonce
  }, []);

  const days = useMemo(
    () => (range ? dayListDaysBetween(range.start, range.end) : []),
    [range],
  );

  const layout: DayListLayout<T> = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fns = fnsRef.current;
    let source = itemsByDay;
    if (q) {
      source = new Map();
      for (const [d, list] of itemsByDay) {
        const hits = list.filter((item) => fns.matches(item, q));
        if (hits.length) source.set(d, hits);
      }
    }
    return buildDayListLayout(days, source, fns.key);
  }, [days, itemsByDay, query]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // CAL-DRUM-FOLLOW: header geometry on the UI thread so the drum turns in the
  // same frame as the scroll (no JS-thread hop, no jank when JS is busy).
  const headerOffsetsShared = useSharedValue<number[]>([]);
  const dayNumbersShared = useSharedValue<number[]>([]);
  const totalHeightShared = useSharedValue(0);
  useLayoutEffect(() => {
    headerOffsetsShared.value = layout.headerOffsets.slice();
    dayNumbersShared.value = layout.days.map(dayListDayNumber);
    totalHeightShared.value = layout.totalHeight;
  }, [layout, headerOffsetsShared, dayNumbersShared, totalHeightShared]);

  // Web keeps the same content under the top edge when rows change above it
  // (prepend, refresh, search). Native does this via maintainVisibleContentPosition.
  const laidOutSeedRef = useRef(-1);
  useLayoutEffect(() => {
    if (!range) return;
    if (laidOutSeedRef.current !== seedId) {
      laidOutSeedRef.current = seedId;
      return;
    }
    if (Platform.OS !== 'web') return;
    const { topDay, intra, y } = scrollRef.current;
    const off = dayListCompensatedOffset(layout, topDay, intra);
    if (off == null || Math.abs(off - y) < 0.5) return;
    scrollRef.current = { ...scrollRef.current, y: off };
    listRef.current?.scrollToOffset({ offset: off, animated: false });
  }, [layout, range, seedId]);

  // Refresh: refetch the loaded span in place (re-seed if it grew very long).
  const firstReloadRef = useRef(true);
  useEffect(() => {
    if (firstReloadRef.current) {
      firstReloadRef.current = false;
      return;
    }
    const r = rangeRef.current;
    if (!r || seedingRef.current) return;
    if (dayListDaysBetween(r.start, r.end).length > DAY_LIST_MAX_RELOAD_DAYS) {
      seed(scrollRef.current.topDay);
      return;
    }
    const gen = genRef.current;
    fetchRef
      .current(r.start, r.end)
      .then((rows) => {
        if (gen !== genRef.current) return;
        const cur = rangeRef.current;
        if (!cur || cur.start !== r.start || cur.end !== r.end) return;
        setError(null);
        setItemsByDay(bucketByDay(rows, fnsRef.current));
      })
      .catch((err: unknown) => {
        if (gen !== genRef.current) return;
        setError(err instanceof Error ? err.message : 'Could not load calendar');
      });
  }, [reloadKey, seed]);

  // Drum snap / Today: scroll there if loaded, otherwise paint around it.
  const firstJumpRef = useRef(true);
  useEffect(() => {
    if (firstJumpRef.current) {
      firstJumpRef.current = false;
      return;
    }
    const target = day;
    const lay = layoutRef.current;
    const idx = lay.days.indexOf(target);
    if (idx < 0 || !rangeRef.current) {
      seed(target);
      return;
    }
    const curIdx = lay.days.indexOf(scrollRef.current.topDay);
    const offset = lay.headerOffsets[idx]!;
    reportTop(target);
    // Drum already snapped to target; park follow there until the list lands.
    setFollow(dayListDayNumber(target));
    setJumpTarget(target);
    setTimeout(() => {
      if (jumpTargetRef.current === target) setJumpTarget(null);
    }, 1200);
    listRef.current?.scrollToOffset({
      offset,
      animated: curIdx >= 0 && Math.abs(idx - curIdx) <= 14,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jumpNonce is the trigger
  }, [jumpNonce]);

  /** CAL-LIST-FOLLOW: true while the drum drives the list (hold chrome + top-day reports). */
  const drivingRef = useRef(false);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!drivingRef.current) chrome?.onScroll(event);
    const lay = layoutRef.current;
    const y = event.nativeEvent.contentOffset.y;
    const idx = dayListTopIndexAt(lay.headerOffsets, y);
    if (idx < 0) return;
    const topDay = lay.days[idx]!;
    scrollRef.current = { y, topDay, intra: Math.max(0, y - lay.headerOffsets[idx]!) };
    if (drivingRef.current) {
      // Drum owns the day; reporting now would re-anchor it mid-drag.
    } else if (jumpTargetRef.current) {
      if (topDay === jumpTargetRef.current) setJumpTarget(null);
    } else {
      reportTop(topDay);
    }
    const needs = dayListExtendNeeds(idx, lay.days.length);
    if (needs.before) extend(-1);
    if (needs.after) extend(1);
  };

  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;
  const onScrollJs = useCallback(
    (y: number, contentH: number, layoutH: number, vy: number, driving: boolean) => {
      drivingRef.current = driving;
      const event = {
        nativeEvent: {
          contentOffset: { x: 0, y },
          contentSize: { width: 0, height: contentH },
          layoutMeasurement: { width: 0, height: layoutH },
          velocity: { x: 0, y: vy },
        },
      } as unknown as NativeSyntheticEvent<NativeScrollEvent>;
      onScrollRef.current(event);
    },
    [],
  );
  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        'worklet';
        const y = e.contentOffset.y;
        const driving = drivePosition ? !Number.isNaN(drivePosition.value) : false;
        if (followPosition && jumpingShared.value === 0 && !driving) {
          const pos = dayListFollowAt(
            headerOffsetsShared.value,
            dayNumbersShared.value,
            totalHeightShared.value,
            y,
          );
          if (!Number.isNaN(pos)) followPosition.value = pos;
        }
        runOnJS(onScrollJs)(
          y,
          e.contentSize.height,
          e.layoutMeasurement.height,
          e.velocity?.y ?? 0,
          driving,
        );
      },
    },
    [followPosition, drivePosition, onScrollJs],
  );

  // CAL-LIST-FOLLOW: drum drag / coast scrolls the list live (not on finger-up).
  // Native: UI-thread scrollTo. Web: same thread anyway — scrollToOffset via JS.
  const scrollToJs = useCallback(
    (offset: number) => {
      listRef.current?.scrollToOffset({ offset, animated: false });
    },
    [listRef],
  );
  const isWeb = Platform.OS === 'web';
  useAnimatedReaction(
    () => (drivePosition ? drivePosition.value : NaN),
    (pos, prev) => {
      'worklet';
      if (Number.isNaN(pos)) return;
      if (pos === prev) return;
      const y = dayListOffsetAt(
        headerOffsetsShared.value,
        dayNumbersShared.value,
        totalHeightShared.value,
        pos,
      );
      if (Number.isNaN(y)) return;
      if (isWeb) runOnJS(scrollToJs)(y);
      else scrollTo(listRef, 0, y, false);
    },
    [drivePosition, isWeb, scrollToJs],
  );

  const renderRow = ({ item: row }: { item: DayListRow<T> }) => {
    if (row.kind === 'header') {
      const seg = dayPeriodTitleSegments(row.day);
      return (
        <View style={[styles.header, { backgroundColor: colors.bg }]}>
          <Text
            style={[styles.headerText, { color: colors.ink }]}
            numberOfLines={1}
            allowFontScaling={false}
            accessibilityRole="header"
            accessibilityLabel={seg ? spokenDayPeriodTitle(seg) : row.day}
          >
            {formatDayPeriodTitle(row.day)}
          </Text>
        </View>
      );
    }
    if (row.kind === 'empty') {
      return (
        <View style={styles.emptyRow}>
          <Text style={[styles.emptyText, { color: colors.mute }]} maxFontSizeMultiplier={1.2}>
            {emptyLabel}
          </Text>
        </View>
      );
    }
    if (renderItem) {
      return <View style={styles.itemRow}>{renderItem(row.item)}</View>;
    }
    const item = row.item as unknown as CalendarItem;
    const hidden = Boolean(showHiddenBadge && item.isHidden);
    return (
      <View style={styles.itemRow}>
        <Pressable
          onPress={() => onPressItem?.(row.item)}
          accessibilityRole="button"
          accessibilityLabel={hidden ? `${item.title}, Hidden` : item.title}
          style={[
            styles.card,
            {
              backgroundColor: hidden ? colors.warnSoft : colors.wash,
              borderColor: hidden ? colors.warn : colors.line,
            },
          ]}
        >
          <View style={styles.cardText}>
            <Text
              style={[styles.title, { color: colors.ink }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {item.title}
            </Text>
            <Text
              style={[styles.meta, { color: colors.mute }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {item.category}
              {item.roleTint ? ` · ${item.roleTint}` : ''}
            </Text>
          </View>
          {hidden ? <Text style={[styles.badge, { color: colors.warn }]}>Hidden</Text> : null}
        </Pressable>
      </View>
    );
  };

  if (!range) {
    return (
      <View style={styles.wrap} accessibilityLabel="Day list">
        {error ? <Text style={[styles.error, { color: colors.mute }]}>{error}</Text> : null}
      </View>
    );
  }

  const seedIdx = layout.days.indexOf(seedTarget);
  const initialScrollIndex = seedIdx >= 0 ? layout.headerIndices[seedIdx] : undefined;

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel="Day list">
      <Reanimated.FlatList
        key={seedId}
        ref={listRef}
        style={styles.scroller}
        data={layout.rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        getItemLayout={(_, index) => ({
          length: layout.lengths[index] ?? 0,
          offset: layout.offsets[index] ?? 0,
          index,
        })}
        stickyHeaderIndices={layout.headerIndices}
        initialScrollIndex={initialScrollIndex}
        initialNumToRender={30}
        maxToRenderPerBatch={30}
        windowSize={21}
        removeClippedSubviews={false}
        maintainVisibleContentPosition={
          Platform.OS === 'web' ? undefined : { minIndexForVisible: 0 }
        }
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        onScrollBeginDrag={(event) => {
          setJumpTarget(null);
          chrome?.onScrollBeginDrag(event);
        }}
        contentContainerStyle={styles.scrollContent}
        accessibilityLabel="Day activity list"
      />
      {error ? <Text style={[styles.errorBar, { color: colors.mute }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  scroller: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 24 },
  /** Same text as the Single Day title (CalendarPeriodTitle: type.title @ 22pt, ink). */
  header: {
    height: DAY_LIST_HEADER_H,
    justifyContent: 'center',
  },
  headerText: { ...type.title, fontSize: 22 },
  emptyRow: {
    height: DAY_LIST_EMPTY_H,
    paddingLeft: DAY_LIST_INDENT,
    justifyContent: 'center',
  },
  emptyText: { ...type.meta },
  itemRow: {
    height: DAY_LIST_ITEM_H,
    paddingLeft: DAY_LIST_INDENT,
    paddingBottom: 8,
  },
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  cardText: { flex: 1, gap: 2, minWidth: 0 },
  title: { ...type.body, fontWeight: '600' },
  meta: { ...type.meta },
  badge: { ...type.meta, fontWeight: '700', textTransform: 'uppercase' },
  error: { ...type.body, marginVertical: 12 },
  errorBar: { ...type.meta, paddingVertical: 4 },
});
