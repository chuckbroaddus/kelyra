import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgendaList } from '@/components/calendar/AgendaList';
import { radius, type } from '@/constants/theme';
import { buildMonthGrid, weekdayLabels } from '@/lib/date/iso';
import { itemDayKey } from '@/lib/calendar/mapItem';
import { roleTintColor } from '@/lib/calendar/roleTint';
import { dayRoleTints } from '@/lib/calendar/timeline';
import type { CalendarItem } from '@/lib/calendar/types';
import { todayISO } from '@/lib/calendar/week';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  year: number;
  monthIndex0: number;
  label: string;
  items: CalendarItem[];
  selectedDay: string | null;
  showHiddenBadge?: boolean;
  onSelectDay: (iso: string) => void;
  onPressItem?: (item: CalendarItem) => void;
};

/**
 * CAL-26 Month grid + list hybrid.
 * Grid on top; selected-day list below (AgendaList). No parallax title.
 */
export function MonthGrid({
  year,
  monthIndex0,
  label,
  items,
  selectedDay,
  showHiddenBadge,
  onSelectDay,
  onPressItem,
}: Props) {
  const { colors } = useTheme();
  const today = todayISO();
  const weeks = buildMonthGrid(year, monthIndex0, 0);
  const weekdays = weekdayLabels(0);
  const fromIso = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-01`;

  const selectedItems = selectedDay
    ? items.filter((item) => itemDayKey(item) === selectedDay)
    : [];

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={label}>
      <Text style={[styles.monthTitle, { color: colors.ink }]}>{label}</Text>
      <View style={styles.weekdays}>
        {weekdays.map((d, i) => (
          <Text key={`${d}-${i}`} style={[styles.wd, { color: colors.mute }]}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={`w-${wi}`} style={styles.week}>
          {week.map((cell, ci) => {
            if (!cell) {
              return <View key={`e-${ci}`} style={styles.dayCell} />;
            }
            const inMonth = cell.iso.slice(0, 7) === fromIso.slice(0, 7);
            const isToday = cell.iso === today;
            const isSelected = cell.iso === selectedDay;
            const tints = dayRoleTints(items, cell.iso, 4);
            return (
              <Pressable
                key={cell.iso}
                onPress={() => onSelectDay(cell.iso)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={cell.iso}
                style={[
                  styles.dayCell,
                  isSelected && {
                    backgroundColor: colors.brandSoft,
                    borderRadius: radius.sm,
                  },
                ]}
              >
                <Text
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
        </View>
      ))}

      {selectedDay ? (
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

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  monthTitle: { ...type.title, fontSize: 22, marginBottom: 8 },
  weekdays: { flexDirection: 'row', marginBottom: 4 },
  wd: { flex: 1, textAlign: 'center', ...type.meta, fontSize: 12 },
  week: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 4,
  },
  dayNum: {
    ...type.body,
    fontSize: 15,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  dots: { flexDirection: 'row', gap: 3, height: 5, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dotSpacer: { height: 5 },
  listBlock: { marginTop: 16, gap: 8 },
  empty: { ...type.body, marginVertical: 8 },
});
