import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
} from 'react-native';

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
  personTabScrollX,
  type PersonTabLabelPolicy,
} from '@/components/ui/personTabsLayout';
import { chrome, radius, type } from '@/constants/theme';
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
  /** Tighter gap under the hairline (feed compose). Keeps the 1 px line. */
  compact?: boolean;
  /**
   * Title-slot policy. Default `fraction` (half-row) for most rows.
   * `visibilityReserve` = CT-A hug + ≥3 visible — ClassTabs / DeskSpanTabs only.
   */
  labelPolicy?: PersonTabLabelPolicy;
};

/** Icon-only hit (styles.hit minWidth / minHeight). */
const PERSON_TAB_ICON_HIT = 44;

type ThemeColors = {
  brand: string;
  brandSoft: string;
  mute: string;
};

type PillProps = {
  tab: PersonTab;
  selected: boolean;
  hasGlyph: boolean;
  labelMax: number;
  titleWidth: number;
  colors: ThemeColors;
  reduce: boolean;
  onChange: (key: string) => void;
  onLayoutX: (x: number, width: number) => void;
};

function PersonTabPill({
  tab,
  selected,
  hasGlyph,
  labelMax,
  titleWidth,
  colors,
  reduce,
  onChange,
  onLayoutX,
}: PillProps) {
  const expand = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const [showLabel, setShowLabel] = useState(selected);
  /** Marquee only after the expand settles at full width (Chuck: marquee after max). */
  const [marqueeReady, setMarqueeReady] = useState(selected);
  const slot = labelMax > 0 ? personTabTitleSlot(titleWidth, labelMax) : 0;
  // Hug painted title — labelMax is marquee ceiling only (AC-CT-02 correction).
  const selectedMax = personTabSelectedMaxWidth(slot, hasGlyph);
  const collapsedWidth = PERSON_TAB_ICON_HIT;
  const expandedWidth = Math.max(collapsedWidth, selectedMax);

  useEffect(() => {
    if (selected) {
      setShowLabel(true);
    } else {
      setMarqueeReady(false);
    }
    if (reduce) {
      expand.setValue(selected ? 1 : 0);
      setShowLabel(selected);
      setMarqueeReady(selected);
      return;
    }
    Animated.timing(expand, {
      toValue: selected ? 1 : 0,
      duration: chrome.motion.personTab,
      easing: selected ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      if (!selected) setShowLabel(false);
      if (selected) setMarqueeReady(true);
    });
  }, [expand, reduce, selected]);

  // Label clip width: grows/shrinks so first letter reveals first, and the right
  // edge covers the label on collapse (icon stays left-pinned — never clipped).
  const labelWidth = expand.interpolate({
    inputRange: [0, 1],
    outputRange: [0, slot],
  });
  const pillWidth = expand.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedWidth, expandedWidth],
  });

  return (
    <HoverTip label={tab.badge ? `${tab.label}, ${tab.badge} waiting` : tab.label}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge} waiting` : tab.label}
        onPress={() => onChange(tab.key)}
        onLayout={(event) => {
          onLayoutX(event.nativeEvent.layout.x, event.nativeEvent.layout.width);
        }}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <Animated.View
          style={[
            styles.hit,
            !hasGlyph && styles.labelHit,
            {
              width: pillWidth,
              maxWidth: pillWidth,
              overflow: 'hidden',
            },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colors.brandSoft,
                borderRadius: radius.pill,
                opacity: expand,
              },
            ]}
          />
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
                  // Mute immediately on deselect; width morph continues separately.
                  name={tab.icon}
                  color={selected ? colors.brand : colors.mute}
                  size={PERSON_TAB_GLYPH}
                />
              ) : null}
              <CountBadge count={tab.badge ?? 0} />
            </View>
          ) : null}
          {showLabel && slot > 0 ? (
            <Animated.View style={[styles.labelClip, { width: labelWidth, maxWidth: slot }]}>
              <MarqueeText
                text={tab.label}
                align="start"
                accessible
                accessibilityLabel={tab.label}
                paused={!marqueeReady}
                fadeColor={colors.brandSoft}
                style={[styles.label, { color: colors.brand }]}
              />
            </Animated.View>
          ) : showLabel && selected && slot === 0 ? (
            <Text
              numberOfLines={1}
              accessible
              accessibilityLabel={tab.label}
              style={[styles.label, { color: colors.brand }]}
            >
              {tab.label}
            </Text>
          ) : null}
        </Animated.View>
      </Pressable>
    </HoverTip>
  );
}

/** Icon-first section tabs. Selected tab shows its name next to the left-pinned glyph. */
export function PersonTabs({ tabs, value, onChange, trailing, stacked, compact, labelPolicy = 'fraction' }: Props) {
  const { colors } = useTheme();
  const scroller = useRef<ScrollView>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const [titleByKey, setTitleByKey] = useState<Record<string, number>>({});
  const [reduce, setReduce] = useState(false);
  const xOf = useRef<Record<string, number>>({});
  const widthOf = useRef<Record<string, number>>({});
  const prevValueRef = useRef<string | null>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const hasGlyph = personTabRowHasGlyph(tabs);
  const labelMax = rowWidth > 0 ? personTabLabelMax(rowWidth, tabs.length, hasGlyph, labelPolicy) : 0;

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (live) setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const x = xOf.current[value];
    if (x == null || rowWidth <= 0) return;
    const selectedIndex = tabs.findIndex((tab) => tab.key === value);
    const prevKey = prevValueRef.current;
    const prevIndex = prevKey == null ? null : tabs.findIndex((tab) => tab.key === prevKey);
    const tabWidth = widthOf.current[value] ?? PERSON_TAB_ICON_HIT;
    const target = personTabScrollX({
      tabX: x,
      tabWidth,
      rowWidth,
      contentWidth: contentWidth > 0 ? contentWidth : rowWidth,
      selectedIndex: Math.max(0, selectedIndex),
      prevIndex: prevIndex != null && prevIndex >= 0 ? prevIndex : null,
    });
    scroller.current?.scrollTo({ x: target, animated: !reduce });
    prevValueRef.current = value;
  }, [value, rowWidth, contentWidth, reduce, tabs]);

  return (
    <View
      style={[
        styles.wrap,
        stacked ? styles.stacked : styles.solo,
        compact && !stacked ? styles.compact : null,
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
        onContentSizeChange={(width) => setContentWidth(width)}
      >
        {tabs.map((tab) => (
          <PersonTabPill
            key={tab.key}
            tab={tab}
            selected={tab.key === value}
            hasGlyph={hasGlyph}
            labelMax={labelMax}
            titleWidth={titleByKey[tab.key] ?? 0}
            colors={colors}
            reduce={reduce}
            onChange={onChange}
            onLayoutX={(x, width) => {
              xOf.current[tab.key] = x;
              widthOf.current[tab.key] = width;
            }}
          />
        ))}
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
  compact: {
    marginBottom: 0,
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
    minWidth: PERSON_TAB_ICON_HIT,
    minHeight: PERSON_TAB_ICON_HIT,
    paddingHorizontal: PERSON_TAB_HIT_PAD_X,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    // Icon left-pinned in selected + collapsed; pill grows/shrinks from the right.
    justifyContent: 'flex-start',
    gap: PERSON_TAB_GAP,
    overflow: 'hidden',
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
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: PERSON_TAB_GLYPH / 2,
  },
});
