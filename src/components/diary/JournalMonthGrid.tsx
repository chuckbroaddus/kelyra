import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import {
  journalMonthWeeks,
  presenceMark,
  type JournalMonthModel,
} from '@/lib/diary/dayBrowse';
import { todayISO, weekdayLabels } from '@/lib/date/iso';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  month: JournalMonthModel;
  selectedDay: string;
  /** Owner-only entry counts by ISO day (PR-BOTH). Never roleTint. */
  presenceByDay: Map<string, number>;
  onSelectDay: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
};

/**
 * DB-B Journal month chrome — Diary-named fork of month *kind*.
 * No CalendarItem, AgendaList, roleTint, or EventComposer.
 */
export function JournalMonthGrid({
  month,
  selectedDay,
  presenceByDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
}: Props) {
  const { colors } = useTheme();
  const today = todayISO();
  const weeks = journalMonthWeeks(month.year, month.monthIndex0);
  const weekdays = weekdayLabels(0);
  const monthKey = month.fromIso.slice(0, 7);

  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel={`Journal ${month.label}`}
    >
      <View style={styles.monthBar}>
        <Pressable
          onPress={onPrevMonth}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={[styles.arrow, { borderColor: colors.line, backgroundColor: colors.elevated }]}
        >
          <Text style={[styles.arrowText, { color: colors.ink }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthTitle, { color: colors.ink }]} numberOfLines={1}>
          {month.label}
        </Text>
        <Pressable
          onPress={onNextMonth}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={[styles.arrow, { borderColor: colors.line, backgroundColor: colors.elevated }]}
        >
          <Text style={[styles.arrowText, { color: colors.ink }]}>›</Text>
        </Pressable>
        <Pressable
          onPress={onToday}
          accessibilityRole="button"
          accessibilityLabel="Today"
          style={[styles.todayBtn, { borderColor: colors.brandSoft }]}
        >
          <Text style={[styles.todayLabel, { color: colors.brand }]}>Today</Text>
        </Pressable>
      </View>

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
            const inMonth = cell.iso.slice(0, 7) === monthKey;
            const isToday = cell.iso === today;
            const isSelected = cell.iso === selectedDay;
            const mark = presenceMark(presenceByDay.get(cell.iso) ?? 0);
            return (
              <Pressable
                key={cell.iso}
                onPress={() => {
                  if (inMonth) onSelectDay(cell.iso);
                }}
                disabled={!inMonth}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: !inMonth }}
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
                {mark.kind === 'dot' ? (
                  <View style={[styles.dot, { backgroundColor: colors.mute }]} />
                ) : mark.kind === 'count' ? (
                  <Text style={[styles.cnt, { color: colors.mute }]}>{mark.label}</Text>
                ) : (
                  <View style={styles.dotSpacer} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginBottom: 8 },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  monthTitle: {
    ...type.title,
    fontSize: 16,
    flex: 1,
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  todayBtn: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  todayLabel: {
    ...type.meta,
    fontWeight: '600',
  },
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
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  cnt: {
    ...type.meta,
    fontSize: 9,
    marginTop: 1,
  },
  dotSpacer: { height: 5 },
});
