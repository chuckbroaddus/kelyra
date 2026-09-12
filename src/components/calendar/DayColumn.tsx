import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { formatDayHeading } from '@/lib/calendar/day';
import { itemDayKey } from '@/lib/calendar/mapItem';
import type { CalendarItem } from '@/lib/calendar/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  day: string;
  items: CalendarItem[];
  showHiddenBadge?: boolean;
  onPressItem?: (item: CalendarItem) => void;
};

/** Phone Day view (VW-A secondary) — own column, not FullCalendar. */
export function DayColumn({ day, items, showHiddenBadge, onPressItem }: Props) {
  const { colors } = useTheme();
  const list = items.filter((item) => itemDayKey(item) === day);

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={`Day ${day}`}>
      <Text style={[styles.heading, { color: colors.ink }]}>{formatDayHeading(day)}</Text>
      {list.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>Nothing on this day.</Text>
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
                <Text style={[styles.title, { color: colors.ink }]} numberOfLines={3}>
                  {item.title}
                </Text>
                <Text style={[styles.meta, { color: colors.mute }]} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>
              {hidden ? <Text style={[styles.badge, { color: colors.warn }]}>Hidden</Text> : null}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  heading: { ...type.section },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  title: { ...type.body, fontWeight: '600' },
  meta: { ...type.meta },
  badge: { ...type.meta, fontWeight: '700', textTransform: 'uppercase' },
  empty: { ...type.body, marginVertical: 8 },
});
