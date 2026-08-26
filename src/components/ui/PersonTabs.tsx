import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { CountBadge } from '@/components/ui/CountBadge';
import { HoverTip } from '@/components/ui/HoverTip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { MarqueeText } from '@/components/ui/MarqueeText';
import {
  PERSON_TAB_GAP,
  PERSON_TAB_GLYPH,
  PERSON_TAB_HIT_PAD_X,
  PERSON_TAB_ROW_PAD_END,
  personTabLabelMax,
  personTabRowHasGlyph,
  personTabSelectedMaxWidth,
  personTabTitleSlot,
} from '@/components/ui/personTabsLayout';
import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type PersonTab = {
  key: string;
  label: string;
  /** Omit on a labels-only row (Counts toward). Unselected tabs then keep their name. */
  icon?: IconName;
  /** Class tabs: the class teacher’s face. Wins over `icon`. */
  photoUrl?: string | null;
  photoName?: string | null;
  badge?: number;
};

type Props = {
  tabs: PersonTab[];
  value: string;
  onChange: (key: string) => void;
  trailing?: ReactNode;
  /** Stacked under another PersonTabs row: no extra gap or hairline. */
  stacked?: boolean;
};

/** Icon-first section tabs. Selected tab shows its name next to the glyph. */
export function PersonTabs({ tabs, value, onChange, trailing, stacked }: Props) {
  const { colors } = useTheme();
  const scroller = useRef<ScrollView>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const [titleByKey, setTitleByKey] = useState<Record<string, number>>({});
  const xOf = useRef<Record<string, number>>({});
  const hasGlyph = personTabRowHasGlyph(tabs);
  const labelMax = rowWidth > 0 ? personTabLabelMax(rowWidth, tabs.length, hasGlyph) : 0;

  useEffect(() => {
    const x = xOf.current[value];
    if (x == null) return;
    scroller.current?.scrollTo({ x: Math.max(0, x - 12), animated: true });
  }, [value, rowWidth]);

  return (
    <View
      style={[
        styles.wrap,
        stacked ? styles.stacked : styles.solo,
        { borderBottomColor: colors.line },
      ]}
    >
      {tabs.map((tab) => (
        <Text
          key={`measure:${tab.key}`}
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no"
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            if (width <= 0) return;
            setTitleByKey((current) =>
              Math.abs((current[tab.key] ?? 0) - width) < 0.5 ? current : { ...current, [tab.key]: width },
            );
          }}
          style={[
            styles.label,
            styles.measure,
            Platform.OS === 'web'
              ? ({ width: 'max-content', maxWidth: 'none', whiteSpace: 'nowrap' } as unknown as TextStyle)
              : null,
            { color: colors.brand },
          ]}
        >
          {tab.label}
        </Text>
      ))}
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
          const titleWidth = titleByKey[tab.key] ?? 0;
          const slot = selected && labelMax > 0 ? personTabTitleSlot(titleWidth, labelMax) : 0;
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
                  !hasGlyph && styles.labelHit,
                  selected && {
                    backgroundColor: colors.brandSoft,
                    maxWidth: personTabSelectedMaxWidth(labelMax || titleWidth, hasGlyph),
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                {hasGlyph ? (
                  <View style={styles.glyph}>
                    {tab.photoName || tab.photoUrl ? (
                      <Avatar
                        name={tab.photoName || tab.label}
                        photoUrl={tab.photoUrl}
                        hasPhoto={Boolean(tab.photoUrl)}
                        size={PERSON_TAB_GLYPH}
                      />
                    ) : tab.icon ? (
                      <Icon
                        name={tab.icon}
                        color={selected ? colors.brand : colors.mute}
                        size={PERSON_TAB_GLYPH}
                      />
                    ) : null}
                    <CountBadge count={tab.badge ?? 0} />
                  </View>
                ) : null}
                {selected ? (
                  slot > 0 ? (
                    <View style={[styles.labelClip, { width: slot, maxWidth: labelMax }]}>
                      <MarqueeText
                        text={tab.label}
                        align="start"
                        accessible
                        accessibilityLabel={tab.label}
                        fadeColor={colors.brandSoft}
                        style={[styles.label, { color: colors.brand }]}
                      />
                    </View>
                  ) : (
                    <Text
                      numberOfLines={1}
                      accessible
                      accessibilityLabel={tab.label}
                      style={[styles.label, { color: colors.brand }]}
                    >
                      {tab.label}
                    </Text>
                  )
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  solo: {
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stacked: {
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  labelClip: {
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
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
    paddingRight: PERSON_TAB_ROW_PAD_END,
  },
  hit: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: PERSON_TAB_HIT_PAD_X,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PERSON_TAB_GAP,
    overflow: 'visible',
  },
  labelHit: {
    gap: 0,
  },
  label: {
    ...type.pill,
    flexShrink: 1,
    lineHeight: 18,
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
    zIndex: -1,
    flexShrink: 0,
  },
  glyph: {
    width: PERSON_TAB_GLYPH,
    height: PERSON_TAB_GLYPH,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: PERSON_TAB_GLYPH / 2,
  },
});
