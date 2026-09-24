import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { formatDayHeading } from '@/lib/calendar/day';
import type { DaySectionOffset } from '@/lib/calendar/listAnchorDay';
import { itemDayKey } from '@/lib/calendar/mapItem';
import type { CalendarItem } from '@/lib/calendar/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  days: string[];
  items: CalendarItem[];
  /** Teacher DP-A only — family never receives hidden rows. */
  showHiddenBadge?: boolean;
  onPressItem?: (item: CalendarItem) => void;
  /**
   * CAL-R5-11 Day List density A — keep in-list date headers for empty days
   * (one-line muted) so multi-day scroll stays oriented.
   */
  includeEmptyDays?: boolean;
  /**
   * CAL-P6-5C: report section Y offsets (relative to list origin) so the parent
   * can write `listAnchorDay` from scroll position / scroll the list from drum.
   */
  onSectionOffsetsChange?: (sections: DaySectionOffset[]) => void;
};

/** Phone Agenda / Day List — own list, not FullCalendar / Wix Agenda. */
export function AgendaList({
  days,
  items,
  showHiddenBadge,
  onPressItem,
  includeEmptyDays = false,
  onSectionOffsetsChange,
}: Props) {
  const { colors } = useTheme();
  const offsetsRef = useRef<Map<string, number>>(new Map());
  const byDay = new Map<string, CalendarItem[]>();
  for (const day of days) byDay.set(day, []);
  for (const item of items) {
    const key = itemDayKey(item);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(item);
    else {
      // Item outside painted days — still show under its day heading.
      const list = byDay.get(key) ?? [];
      list.push(item);
      byDay.set(key, list);
    }
  }

  const orderedDays = [...days];
  for (const key of byDay.keys()) {
    if (!orderedDays.includes(key)) orderedDays.push(key);
  }
  orderedDays.sort();

  const visibleDays = includeEmptyDays
    ? orderedDays
    : orderedDays.filter((d) => (byDay.get(d) ?? []).length > 0);

  const publishOffsets = () => {
    if (!onSectionOffsetsChange) return;
    const sections: DaySectionOffset[] = visibleDays
      .map((day) => {
        const y = offsetsRef.current.get(day);
        return y == null ? null : { day, y };
      })
      .filter((s): s is DaySectionOffset => s != null)
      .sort((a, b) => a.y - b.y);
    onSectionOffsetsChange(sections);
  };

  useEffect(() => {
    // Drop Ys for days that left the painted window so rebase scroll math stays clean.
    const keep = new Set(visibleDays);
    for (const key of [...offsetsRef.current.keys()]) {
      if (!keep.has(key)) offsetsRef.current.delete(key);
    }
    publishOffsets();
    // Re-publish when the visible day set changes (drum re-anchor / range shift).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- publish from latest offsets map
  }, [visibleDays.join('|'), onSectionOffsetsChange]);

  if (visibleDays.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.mute }]}>Nothing coming up on the calendar.</Text>
    );
  }

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel="Agenda">
      {visibleDays.map((day) => {
        const list = byDay.get(day) ?? [];
        const empty = list.length === 0;
        return (
          <View
            key={day}
            style={styles.section}
            onLayout={(event) => {
              if (!onSectionOffsetsChange) return;
              offsetsRef.current.set(day, event.nativeEvent.layout.y);
              publishOffsets();
            }}
            accessibilityLabel={`Day section ${day}`}
          >
            <Text
              style={[
                styles.heading,
                { color: empty ? colors.mute : colors.ink },
              ]}
            >
              {formatDayHeading(day)}
            </Text>
            {empty ? (
              <Text style={[styles.emptyDay, { color: colors.mute }]}>No events</Text>
            ) : (
              list.map((item) => {
                const hidden = Boolean(showHiddenBadge && item.isHidden);
                return (
                  <Pressable
                    key={`${item.source}:${item.id}`}
                    onPress={() => onPressItem?.(item)}
                    accessibilityRole="button"
                    accessibilityLabel={hidden ? `${item.title}, Hidden` : item.title}
                    style={[
                      styles.row,
                      {
                        backgroundColor: hidden ? colors.warnSoft : colors.wash,
                        borderColor: hidden ? colors.warn : colors.line,
                      },
                    ]}
                  >
                    <View style={styles.rowText}>
                      <Text style={[styles.title, { color: colors.ink }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={[styles.meta, { color: colors.mute }]} numberOfLines={1}>
                        {item.category}
                        {item.roleTint ? ` · ${item.roleTint}` : ''}
                      </Text>
                    </View>
                    {hidden ? (
                      <Text style={[styles.badge, { color: colors.warn }]}>Hidden</Text>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  section: { gap: 8 },
  heading: { ...type.section },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  title: { ...type.body, fontWeight: '600' },
  meta: { ...type.meta },
  badge: { ...type.meta, fontWeight: '700', textTransform: 'uppercase' },
  empty: { ...type.body, marginVertical: 12 },
  emptyDay: { ...type.meta },
});
