import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  dayListDaysBetween,
  dayListExtendNeeds,
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

type Props = {
  /** Day to open on, and the target of each jump (drum snap / Today). */
  day: string;
  /** Bumps when the parent asks for a jump to `day` (even if `day` is unchanged). */
  jumpNonce: number;
  /** Fetch seat-visible items for an inclusive ISO day range (parent owns filters). */
  fetchRange: (fromIso: string, toIso: string) => Promise<CalendarItem[]>;
  /** Bumps when the parent reloads (focus, filters, create/edit/delete). */
  reloadKey: number;
  /** Search text; filters loaded items by title. */
  query?: string;
  showHiddenBadge?: boolean;
  onPressItem?: (item: CalendarItem) => void;
  /** Day whose sticky header is pinned at the top; drives the drum center card. */
  onTopDayChange?: (day: string) => void;
};

type Range = { start: string; end: string };

const itemKey = (item: CalendarItem) => `${item.source}:${item.id}`;

function bucketByDay(rows: CalendarItem[], into?: Map<string, CalendarItem[]>) {
  const map = into ?? new Map<string, CalendarItem[]>();
  for (const item of rows) {
    const key = itemDayKey(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  for (const list of map.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
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
export function DayListPane({
  day,
  jumpNonce,
  fetchRange,
  reloadKey,
  query = '',
  showHiddenBadge,
  onPressItem,
  onTopDayChange,
}: Props) {
  const { colors } = useTheme();
  const chrome = useOptionalChrome();
  const listRef = useRef<FlatList<DayListRow<CalendarItem>>>(null);

  const [range, setRange] = useState<Range | null>(null);
  const [itemsByDay, setItemsByDay] = useState<Map<string, CalendarItem[]>>(() => new Map());
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
  const fetchRef = useRef(fetchRange);
  fetchRef.current = fetchRange;
  const onTopRef = useRef(onTopDayChange);
  onTopRef.current = onTopDayChange;

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
          setError(null);
          setItemsByDay(bucketByDay(rows));
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
    [reportTop],
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
          return bucketByDay(rows, next);
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

  const layout: DayListLayout<CalendarItem> = useMemo(() => {
    const q = query.trim().toLowerCase();
    let source = itemsByDay;
    if (q) {
      source = new Map();
      for (const [d, list] of itemsByDay) {
        const hits = list.filter((item) => item.title.toLowerCase().includes(q));
        if (hits.length) source.set(d, hits);
      }
    }
    return buildDayListLayout(days, source, itemKey);
  }, [days, itemsByDay, query]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

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
        setItemsByDay(bucketByDay(rows));
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
    jumpTargetRef.current = target;
    setTimeout(() => {
      if (jumpTargetRef.current === target) jumpTargetRef.current = null;
    }, 1200);
    listRef.current?.scrollToOffset({
      offset,
      animated: curIdx >= 0 && Math.abs(idx - curIdx) <= 14,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jumpNonce is the trigger
  }, [jumpNonce]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    chrome?.onScroll(event);
    const lay = layoutRef.current;
    const y = event.nativeEvent.contentOffset.y;
    const idx = dayListTopIndexAt(lay.headerOffsets, y);
    if (idx < 0) return;
    const topDay = lay.days[idx]!;
    scrollRef.current = { y, topDay, intra: Math.max(0, y - lay.headerOffsets[idx]!) };
    if (jumpTargetRef.current) {
      if (topDay === jumpTargetRef.current) jumpTargetRef.current = null;
    } else {
      reportTop(topDay);
    }
    const needs = dayListExtendNeeds(idx, lay.days.length);
    if (needs.before) extend(-1);
    if (needs.after) extend(1);
  };

  const renderRow = ({ item: row }: { item: DayListRow<CalendarItem> }) => {
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
            No events
          </Text>
        </View>
      );
    }
    const item = row.item;
    const hidden = Boolean(showHiddenBadge && item.isHidden);
    return (
      <View style={styles.itemRow}>
        <Pressable
          onPress={() => onPressItem?.(item)}
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
      <FlatList
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
        onScroll={onScroll}
        onScrollBeginDrag={(event) => {
          jumpTargetRef.current = null;
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
