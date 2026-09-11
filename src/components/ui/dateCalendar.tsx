import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { hitSlop, radius, type } from '@/constants/theme';
import {
  addDaysISO,
  buildMonthGrid,
  monthLabels,
  partsFromISO,
  todayISO,
  weekdayLabels,
  yearOptions,
} from '@/lib/date/iso';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  value: string;
  onSelect: (iso: string) => void;
  /** Arrow-key highlight without commit (Enter/click still use onSelect). */
  onNavigate?: (iso: string) => void;
  min?: string | null;
  max?: string | null;
  weekStartsOn?: 0 | 1;
};

export function DateCalendar({
  value,
  onSelect,
  onNavigate,
  min,
  max,
  weekStartsOn = 0,
}: Props) {
  const { colors } = useTheme();
  const parts = partsFromISO(value) ?? partsFromISO(todayISO())!;
  const [viewYear, setViewYear] = useState(parts.year);
  const [viewMonth, setViewMonth] = useState(parts.month - 1);
  const [openMenu, setOpenMenu] = useState<'month' | 'year' | null>(null);

  const months = useMemo(() => monthLabels(), []);
  const weekdays = useMemo(() => weekdayLabels(weekStartsOn), [weekStartsOn]);
  const years = useMemo(() => yearOptions(min, max, value), [min, max, value]);
  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth, weekStartsOn), [viewYear, viewMonth, weekStartsOn]);
  const today = todayISO();

  const shiftMonth = (delta: number) => {
    const date = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
    setOpenMenu(null);
  };

  const moveHighlight = (deltaDays: number) => {
    const next = addDaysISO(value, deltaDays);
    if (!next) return;
    if (min != null && next < min) return;
    if (max != null && next > max) return;
    const nextParts = partsFromISO(next);
    if (nextParts) {
      setViewYear(nextParts.year);
      setViewMonth(nextParts.month - 1);
    }
    if (onNavigate) onNavigate(next);
    else onSelect(next);
  };

  const onGridKeyDown = (event: { key: string; preventDefault: () => void }) => {
    if (openMenu) return;
    const key = event.key;
    if (key === 'ArrowLeft') {
      event.preventDefault();
      moveHighlight(-1);
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      moveHighlight(1);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      moveHighlight(-7);
    } else if (key === 'ArrowDown') {
      event.preventDefault();
      moveHighlight(7);
    } else if (key === 'PageUp') {
      event.preventDefault();
      shiftMonth(-1);
    } else if (key === 'PageDown') {
      event.preventDefault();
      shiftMonth(1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (min != null && value < min) return;
      if (max != null && value > max) return;
      onSelect(value);
    }
  };

  const webGridProps =
    Platform.OS === 'web'
      ? ({
          tabIndex: 0,
          onKeyDown: onGridKeyDown,
        } as Record<string, unknown>)
      : null;

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={hitSlop}
          onPress={() => shiftMonth(-1)}
          style={({ pressed }) => [styles.nav, pressed && { opacity: 0.7 }]}
        >
          <Text style={[type.body, { color: colors.ink }]}>‹</Text>
        </Pressable>
        <View style={styles.menus}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Month ${months[viewMonth]}`}
            onPress={() => setOpenMenu((m) => (m === 'month' ? null : 'month'))}
            style={({ pressed }) => [styles.menuBtn, { borderColor: colors.line, backgroundColor: colors.elevated }, pressed && { opacity: 0.85 }]}
          >
            <Text style={[type.pill, { color: colors.ink }]}>{months[viewMonth]} ▾</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Year ${viewYear}`}
            onPress={() => setOpenMenu((m) => (m === 'year' ? null : 'year'))}
            style={({ pressed }) => [styles.menuBtn, { borderColor: colors.line, backgroundColor: colors.elevated }, pressed && { opacity: 0.85 }]}
          >
            <Text style={[type.pill, { color: colors.ink }]}>{viewYear} ▾</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={hitSlop}
          onPress={() => shiftMonth(1)}
          style={({ pressed }) => [styles.nav, pressed && { opacity: 0.7 }]}
        >
          <Text style={[type.body, { color: colors.ink }]}>›</Text>
        </Pressable>
      </View>

      {openMenu === 'month' ? (
        <ScrollView
          style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.line }]}
          accessibilityLiveRegion="polite"
          nestedScrollEnabled
        >
          {months.map((label, index) => (
            <Pressable
              key={label}
              onPress={() => {
                setViewMonth(index);
                setOpenMenu(null);
              }}
              style={({ pressed }) => [styles.dropItem, pressed && { opacity: 0.8 }]}
            >
              <Text style={[type.body, { color: index === viewMonth ? colors.brand : colors.ink }]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {openMenu === 'year' ? (
        <ScrollView
          style={[styles.dropdown, styles.yearDrop, { backgroundColor: colors.card, borderColor: colors.line }]}
          accessibilityLiveRegion="polite"
          nestedScrollEnabled
        >
          {years.map((year) => (
            <Pressable
              key={year}
              onPress={() => {
                setViewYear(year);
                setOpenMenu(null);
              }}
              style={({ pressed }) => [styles.dropItem, pressed && { opacity: 0.8 }]}
            >
              <Text style={[type.body, { color: year === viewYear ? colors.brand : colors.ink }]}>{year}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.weekRow} accessibilityLiveRegion="polite">
        {weekdays.map((label, i) => (
          <Text key={`${label}-${i}`} style={[styles.weekCell, type.meta, { color: colors.mute }]}>
            {label}
          </Text>
        ))}
      </View>

      <View
        accessibilityRole="summary"
        accessibilityLabel="Calendar grid"
        style={styles.grid}
        {...webGridProps}
      >
        {grid.map((row, ri) => (
          <View key={`r${ri}`} style={styles.weekRow}>
            {row.map((cell, ci) => {
              if (!cell) {
                return <View key={`e${ri}-${ci}`} style={styles.dayCell} />;
              }
              const selected = cell.iso === value;
              const isToday = cell.iso === today;
              const disabled =
                (min != null && cell.iso < min) || (max != null && cell.iso > max);
              return (
                <Pressable
                  key={cell.iso}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  accessibilityLabel={cell.iso}
                  disabled={disabled}
                  onPress={() => onSelect(cell.iso)}
                  style={({ pressed }) => [
                    styles.dayCell,
                    selected && { backgroundColor: colors.brand },
                    !selected && isToday && { borderColor: colors.brand, borderWidth: 1 },
                    pressed && !disabled && { opacity: 0.85 },
                    disabled && { opacity: 0.35 },
                  ]}
                >
                  <Text
                    style={[
                      type.body,
                      {
                        color: selected ? colors.brandInk : colors.ink,
                        fontWeight: selected || isToday ? '600' : '400',
                      },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nav: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menus: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  menuBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: radius.sm,
    maxHeight: 200,
    overflow: 'hidden',
  },
  yearDrop: {
    maxHeight: 220,
  },
  dropItem: {
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  grid: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
});
