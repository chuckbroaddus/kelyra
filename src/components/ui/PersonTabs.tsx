import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CountBadge } from '@/components/ui/CountBadge';
import { HoverTip } from '@/components/ui/HoverTip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type PersonTab = {
  key: string;
  label: string;
  icon: IconName;
  badge?: number;
};

type Props = {
  tabs: PersonTab[];
  value: string;
  onChange: (key: string) => void;
  trailing?: ReactNode;
};

/** Icon-first section tabs. Selected tab shows its name, at most half the row. */
export function PersonTabs({ tabs, value, onChange, trailing }: Props) {
  const { colors } = useTheme();
  const scroller = useRef<ScrollView>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const xOf = useRef<Record<string, number>>({});
  const labelMax = rowWidth > 0 ? Math.floor(rowWidth * 0.5) : 160;

  useEffect(() => {
    const x = xOf.current[value];
    if (x == null) return;
    scroller.current?.scrollTo({ x: Math.max(0, x - 12), animated: true });
  }, [value, rowWidth]);

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.line }]}>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.scroller}
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      >
        {tabs.map((tab) => {
          const selected = tab.key === value;
          return (
            <HoverTip key={tab.key} label={tab.badge ? `${tab.label}, ${tab.badge} waiting` : tab.label}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge} waiting` : tab.label}
                onPress={() => onChange(tab.key)}
                onLayout={(event) => {
                  xOf.current[tab.key] = event.nativeEvent.layout.x;
                }}
                style={({ pressed }) => [
                  styles.hit,
                  selected && {
                    backgroundColor: colors.brandSoft,
                    maxWidth: 22 + 8 + 24 + labelMax,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.glyph}>
                  <Icon name={tab.icon} color={selected ? colors.brand : colors.mute} size={22} />
                  <CountBadge count={tab.badge ?? 0} />
                </View>
                {selected ? (
                  <Text
                    style={[styles.label, { color: colors.brand, maxWidth: labelMax }]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                ) : null}
              </Pressable>
            </HoverTip>
          );
        })}
      </ScrollView>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -4,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scroller: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  hit: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'visible',
  },
  label: {
    ...type.pill,
    flexShrink: 1,
    lineHeight: 18,
  },
  glyph: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
