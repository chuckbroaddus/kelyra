import { useEffect, useMemo, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { type } from '@/constants/theme';
import {
  clampDay,
  daysInMonth,
  isoFromParts,
  localeDateOrder,
  monthLabels,
  partsFromISO,
} from '@/lib/date/iso';
import { useTheme } from '@/lib/theme/ThemeProvider';

const ITEM_H = 40;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

type Props = {
  value: string;
  onChange: (iso: string) => void;
  minYear?: number;
  maxYear?: number;
};

export function DateWheels({ value, onChange, minYear, maxYear }: Props) {
  const { colors } = useTheme();
  const parts = partsFromISO(value) ?? { year: 2000, month: 1, day: 1 };
  const months = useMemo(() => monthLabels(), []);
  const order = useMemo(() => localeDateOrder(), []);
  const years = useMemo(() => {
    const lo = minYear ?? parts.year - 80;
    const hi = maxYear ?? parts.year + 20;
    const list: number[] = [];
    for (let y = lo; y <= hi; y++) list.push(y);
    return list;
  }, [minYear, maxYear, parts.year]);

  const dayCount = daysInMonth(parts.year, parts.month - 1);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  const setPart = (next: { year?: number; month?: number; day?: number }) => {
    const year = next.year ?? parts.year;
    const month = next.month ?? parts.month;
    const day = clampDay(year, month - 1, next.day ?? parts.day);
    const iso = isoFromParts(year, month, day);
    if (iso) onChange(iso);
  };

  const columns =
    order === 'dmy'
      ? ([
          { key: 'day', items: days.map(String), index: parts.day - 1, onIndex: (i: number) => setPart({ day: i + 1 }) },
          {
            key: 'month',
            items: months,
            index: parts.month - 1,
            onIndex: (i: number) => setPart({ month: i + 1 }),
          },
          {
            key: 'year',
            items: years.map(String),
            index: Math.max(0, years.indexOf(parts.year)),
            onIndex: (i: number) => setPart({ year: years[i] ?? parts.year }),
          },
        ] as const)
      : order === 'ymd'
        ? ([
            {
              key: 'year',
              items: years.map(String),
              index: Math.max(0, years.indexOf(parts.year)),
              onIndex: (i: number) => setPart({ year: years[i] ?? parts.year }),
            },
            {
              key: 'month',
              items: months,
              index: parts.month - 1,
              onIndex: (i: number) => setPart({ month: i + 1 }),
            },
            { key: 'day', items: days.map(String), index: parts.day - 1, onIndex: (i: number) => setPart({ day: i + 1 }) },
          ] as const)
        : ([
            {
              key: 'month',
              items: months,
              index: parts.month - 1,
              onIndex: (i: number) => setPart({ month: i + 1 }),
            },
            { key: 'day', items: days.map(String), index: parts.day - 1, onIndex: (i: number) => setPart({ day: i + 1 }) },
            {
              key: 'year',
              items: years.map(String),
              index: Math.max(0, years.indexOf(parts.year)),
              onIndex: (i: number) => setPart({ year: years[i] ?? parts.year }),
            },
          ] as const);

  return (
    <View style={styles.row} accessibilityRole="adjustable">
      <View
        pointerEvents="none"
        style={[styles.highlight, { backgroundColor: colors.brandSoft, borderColor: colors.line }]}
      />
      {columns.map((col) => (
        <WheelColumn
          key={col.key}
          items={col.items}
          index={col.index}
          onIndex={col.onIndex}
          ink={colors.ink}
          mute={colors.mute}
        />
      ))}
    </View>
  );
}

function WheelColumn({
  items,
  index,
  onIndex,
  ink,
  mute,
}: {
  items: string[];
  index: number;
  onIndex: (index: number) => void;
  ink: string;
  mute: string;
}) {
  const ref = useRef<ScrollView>(null);
  const settling = useRef(false);

  useEffect(() => {
    const y = Math.max(0, index) * ITEM_H;
    settling.current = true;
    requestAnimationFrame(() => {
      ref.current?.scrollTo({ y, animated: false });
      settling.current = false;
    });
  }, [index, items.length]);

  const onMomentum = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (settling.current) return;
    const y = event.nativeEvent.contentOffset.y;
    const next = Math.round(y / ITEM_H);
    const clamped = Math.min(Math.max(0, next), items.length - 1);
    if (clamped !== index) onIndex(clamped);
    else ref.current?.scrollTo({ y: clamped * ITEM_H, animated: true });
  };

  return (
    <ScrollView
      ref={ref}
      style={styles.col}
      contentContainerStyle={{ paddingVertical: PAD }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      onMomentumScrollEnd={onMomentum}
      onScrollEndDrag={onMomentum}
      nestedScrollEnabled
    >
      {items.map((label, i) => (
        <View key={`${label}-${i}`} style={styles.item}>
          <Text style={[type.body, { color: i === index ? ink : mute, textAlign: 'center', fontWeight: i === index ? '600' : '400' }]}>
            {label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: ITEM_H * VISIBLE,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 4,
  },
  highlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: PAD,
    height: ITEM_H,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  col: {
    flex: 1,
  },
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
