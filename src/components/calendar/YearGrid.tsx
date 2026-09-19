import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { roleTintColor } from '@/lib/calendar/roleTint';
import type { CalendarItem } from '@/lib/calendar/types';
import { yearMonthBlocks } from '@/lib/calendar/year';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  year: number;
  items: CalendarItem[];
  /** Entire month card (title, weekday row, day numbers, empty cells) zooms to Month. */
  onPressMonth: (year: number, monthIndex0: number) => void;
};

/** CAL-25 Year spine — 2-col mini-months; dots ≤4 role tints. Tap card → Month only. */
export function YearGrid({ year, items, onPressMonth }: Props) {
  const { colors } = useTheme();
  const blocks = yearMonthBlocks(year, items);

  const rows: (typeof blocks)[] = [];
  for (let i = 0; i < blocks.length; i += 2) {
    rows.push(blocks.slice(i, i + 2));
  }

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={`Year ${year}`}>
      <Text style={[styles.yearTitle, { color: colors.ink }]}>{year}</Text>
      {rows.map((pair, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {pair.map((block) => (
            <Pressable
              key={`${block.year}-${block.monthIndex0}`}
              onPress={() => onPressMonth(block.year, block.monthIndex0)}
              accessibilityRole="button"
              accessibilityLabel={`${block.monthLabel} ${block.year}`}
              style={[styles.monthCard, { borderColor: colors.line, backgroundColor: colors.elevated }]}
            >
              <Text style={[styles.monthLabel, { color: colors.brand }]}>{block.monthLabel}</Text>
              <View style={styles.weekdays}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={`${d}-${i}`} style={[styles.wd, { color: colors.mute }]}>
                    {d}
                  </Text>
                ))}
              </View>
              {block.weeks.map((week, wi) => {
                // Pad last week to 7 equal cells so mobile columns stay even (no wrap/minWidth blowout).
                const cells = week.length >= 7 ? week.slice(0, 7) : [...week, ...Array(7 - week.length).fill(null)];
                return (
                  <View key={`w-${wi}`} style={styles.week}>
                    {cells.map((cell, ci) => {
                      if (!cell) {
                        return <View key={`e-${ci}`} style={styles.dayCell} />;
                      }
                      return (
                        <View
                          key={cell.iso}
                          style={styles.dayCell}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        >
                          <Text
                            style={[
                              styles.dayNum,
                              {
                                color: cell.isToday ? colors.brandInk : colors.ink,
                                backgroundColor: cell.isToday ? colors.brand : 'transparent',
                              },
                            ]}
                          >
                            {cell.day}
                          </Text>
                          {cell.tints.length > 0 ? (
                            <View style={styles.dots}>
                              {cell.tints.map((tint) => (
                                <View
                                  key={tint}
                                  style={[
                                    styles.dot,
                                    { backgroundColor: roleTintColor(tint, colors) },
                                  ]}
                                />
                              ))}
                            </View>
                          ) : (
                            <View style={styles.dotSpacer} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </Pressable>
          ))}
          {pair.length === 1 ? <View style={styles.monthCard} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  yearTitle: { ...type.title, fontSize: 28, textAlign: 'center', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10 },
  monthCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 8,
    gap: 2,
    minWidth: 0,
    overflow: 'hidden',
  },
  monthLabel: { ...type.section, fontSize: 13, marginBottom: 4 },
  weekdays: { flexDirection: 'row', overflow: 'hidden' },
  wd: { flex: 1, minWidth: 0, textAlign: 'center', ...type.meta, fontSize: 9 },
  week: { flexDirection: 'row', overflow: 'hidden', flexWrap: 'nowrap' },
  dayCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    minHeight: 22,
    paddingVertical: 1,
  },
  dayNum: {
    ...type.meta,
    fontSize: 11,
    textAlign: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 2,
    maxWidth: '100%',
  },
  dots: { flexDirection: 'row', gap: 2, height: 4, marginTop: 1, maxWidth: '100%', overflow: 'hidden' },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  dotSpacer: { height: 4 },
});
