import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { roleTintColor } from '@/lib/calendar/roleTint';
import type { CalendarItem } from '@/lib/calendar/types';
import { yearMonthBlocks, type YearMonthCell } from '@/lib/calendar/year';
import type { ZoomSourceRect } from '@/lib/calendar/zoomDrill';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  year: number;
  items: CalendarItem[];
  /** Entire month card (title, weekday row, day numbers, empty cells) zooms to Month. */
  onPressMonth: (year: number, monthIndex0: number, source: ZoomSourceRect) => void;
  /**
   * Today on Year — scroll so this month’s row is in the viewport (CEO 2026-09-24).
   * `focusNonce` bumps on every Today press so a second tap still re-scrolls.
   */
  focusMonthIndex0?: number | null;
  focusNonce?: number;
  /** Y of the focused month’s row relative to this YearGrid root. */
  onFocusMonthY?: (y: number) => void;
};

/** CAL-25 Year spine — 2-col mini-months; dots ≤4 role tints. Tap card → Month only. */
export function YearGrid({
  year,
  items,
  onPressMonth,
  focusMonthIndex0 = null,
  focusNonce = 0,
  onFocusMonthY,
}: Props) {
  const { colors } = useTheme();
  const blocks = yearMonthBlocks(year, items);
  const monthYRef = useRef<Map<number, number>>(new Map());
  const monthCardRefs = useRef<Map<number, View | null>>(new Map());
  const pendingRef = useRef<{ month: number; nonce: number } | null>(null);

  const rows: (typeof blocks)[] = [];
  for (let i = 0; i < blocks.length; i += 2) {
    rows.push(blocks.slice(i, i + 2));
  }

  const tryPublish = (monthIndex0: number) => {
    if (!onFocusMonthY) return false;
    const y = monthYRef.current.get(monthIndex0);
    if (y == null) return false;
    onFocusMonthY(y);
    pendingRef.current = null;
    return true;
  };

  useEffect(() => {
    if (focusMonthIndex0 == null || focusMonthIndex0 < 0 || focusMonthIndex0 > 11) return;
    if (!onFocusMonthY) return;
    pendingRef.current = { month: focusMonthIndex0, nonce: focusNonce };
    tryPublish(focusMonthIndex0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Today nonce / month / year only
  }, [focusMonthIndex0, focusNonce, year]);

  // CAL-R5-02: chevron year row lives in calendar toolbar — no duplicate bold year here.
  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={`Year ${year}`}>
      {rows.map((pair, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={styles.row}
          onLayout={(event) => {
            const y = event.nativeEvent.layout.y;
            for (const block of pair) {
              monthYRef.current.set(block.monthIndex0, y);
            }
            const pending = pendingRef.current;
            if (pending && pair.some((b) => b.monthIndex0 === pending.month)) {
              tryPublish(pending.month);
            }
          }}
        >
          {pair.map((block) => (
            <Pressable
              key={`${block.year}-${block.monthIndex0}`}
              ref={(node) => {
                monthCardRefs.current.set(block.monthIndex0, node as unknown as View | null);
              }}
              onPress={() => {
                const node = monthCardRefs.current.get(block.monthIndex0);
                const fire = (source: ZoomSourceRect) =>
                  onPressMonth(block.year, block.monthIndex0, source);
                if (node && typeof (node as View).measureInWindow === 'function') {
                  (node as View).measureInWindow((x, y, width, height) => {
                    fire({ x, y, width, height });
                  });
                } else {
                  fire({ x: 0, y: 0, width: 0, height: 0 });
                }
              }}
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
                // Typed pad: Array.fill(null) is any[] and would widen cell/tint to implicit any.
                const cells: YearMonthCell[] =
                  week.length >= 7
                    ? week.slice(0, 7)
                    : [...week, ...Array<YearMonthCell>(7 - week.length).fill(null)];
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
                            // iPhone Year 2-col: ~1/7 of half-phone — two-digit days must not wrap (30≠3/0).
                            numberOfLines={1}
                            allowFontScaling={false}
                            ellipsizeMode="clip"
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
    // ~390/2/7 ≈ 24pt cell; font 9 + no H-pad keeps "30"/"31" on one line.
    fontSize: 9,
    lineHeight: 11,
    paddingHorizontal: 0,
    textAlign: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
    maxWidth: '100%',
    fontVariant: ['tabular-nums'],
  },
  dots: { flexDirection: 'row', gap: 2, height: 4, marginTop: 1, maxWidth: '100%', overflow: 'hidden' },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  dotSpacer: { height: 4 },
});
