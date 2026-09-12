import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { itemDayKey } from '@/lib/calendar/mapItem';
import type { CalendarItem } from '@/lib/calendar/types';
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
  onPressItem?: (item: CalendarItem) => void;
};

/** Own Week grid — not FullCalendar / Wix Agenda (CAL-R2 VW-A). */
export function TeacherWeekGrid({ days, items, onPressItem }: Props) {
  const { colors } = useTheme();
  const today = todayISO();
  const byDay = new Map<string, CalendarItem[]>();
  for (const day of days) byDay.set(day, []);
  for (const item of items) {
    const key = itemDayKey(item);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(item);
  }

  return (
    <View style={styles.grid} accessibilityRole="summary" accessibilityLabel="Week calendar">
      <View style={styles.headerRow}>
        {days.map((day) => {
          const isToday = isSameDayIso(day, today);
          return (
            <View key={`h-${day}`} style={styles.col}>
              <Text
                style={[
                  styles.weekday,
                  { color: isToday ? colors.brand : colors.mute },
                ]}
              >
                {weekdayShort(day)}
              </Text>
              <Text
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
            </View>
          );
        })}
      </View>
      <View style={styles.bodyRow}>
        {days.map((day) => {
          const list = byDay.get(day) ?? [];
          return (
            <View
              key={`b-${day}`}
              style={[styles.col, styles.dayCell, { borderColor: colors.line }]}
            >
              {list.length === 0 ? (
                <Text style={[styles.emptyCell, { color: colors.mute }]}>·</Text>
              ) : (
                list.map((item) => (
                  <Pressable
                    key={`${item.source}:${item.id}`}
                    onPress={() => onPressItem?.(item)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      item.isHidden ? `${item.title}, Hidden` : item.title
                    }
                    style={[
                      styles.chip,
                      {
                        backgroundColor: item.isHidden ? colors.warnSoft : colors.wash,
                        borderColor: item.isHidden ? colors.warn : colors.line,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={2}
                      style={[styles.chipTitle, { color: colors.ink }]}
                    >
                      {item.title}
                    </Text>
                    {item.isHidden ? (
                      <Text style={[styles.hiddenBadge, { color: colors.warn }]}>Hidden</Text>
                    ) : null}
                    <Text style={[styles.chipMeta, { color: colors.mute }]} numberOfLines={1}>
                      {item.category}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 4,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'stretch',
    minHeight: 180,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  weekday: {
    ...type.meta,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontSize: 11,
  },
  dayNum: {
    ...type.section,
    textAlign: 'center',
    alignSelf: 'center',
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: 2,
  },
  dayCell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  emptyCell: {
    ...type.meta,
    textAlign: 'center',
    marginTop: 8,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
  chipTitle: {
    ...type.meta,
    fontSize: 11,
    fontWeight: '600',
  },
  chipMeta: {
    ...type.meta,
    fontSize: 10,
  },
  hiddenBadge: {
    ...type.meta,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
