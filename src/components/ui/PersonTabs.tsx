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
  personTabExpandEasingKind,
  personTabLabelMax,
  personTabRowHasGlyph,
  personTabPillWidthRange,
  personTabRowMaxContentWidth,
  personTabTitleNeedsMarquee,
  personTabScrollTabWidth,
  personTabScrollX,
  personTabScrollNeeded,
  personTabScrollMotion,
  type PersonTabLabelPolicy,
  type PersonTabMotionPack,
} from '@/components/ui/personTabsLayout';

export type { PersonTabMotionPack } from '@/components/ui/personTabsLayout';
export { personTabExpandEasingKind } from '@/components/ui/personTabsLayout';
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

function easingForKind(kind: ReturnType<typeof personTabExpandEasingKind>) {
  if (kind === 'linear') return Easing.linear;
  if (kind === 'cubic-out') return Easing.out(Easing.cubic);
  return Easing.in(Easing.cubic);
}

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
   * Title-slot policy. Default `visibilityReserve` (FoM hug + ≥3 visible) app-wide.
   * Pass `fraction` only for a documented legacy half-row exception.
   */
  labelPolicy?: PersonTabLabelPolicy;
  /**
   * Morph easing. Default `cm-linear` (Easing.linear grow AND shrink) — FoM lock app-wide.
   * Pass `current` only for a documented cubic opt-out — never on destination rows.
   */
  motionPack?: PersonTabMotionPack;
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
  motionPack: PersonTabMotionPack;
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
  motionPack,
  onChange,
  onLayoutX,
}: PillProps) {
  const expand = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const [showLabel, setShowLabel] = useState(selected);
  /** Marquee only after the expand settles at full width (Chuck: marquee after max). */
  const [marqueeReady, setMarqueeReady] = useState(selected);
  // Paint vs ceiling — never treat occupancy/hug slot alone as overflow.
  const needsMarquee = personTabTitleNeedsMarquee(titleWidth, labelMax);
  // Hug painted title — labelMax is marquee ceiling only (AC-CT-02 correction).
  // Width range is paint/ceiling only — never live onLayout width (first-tab snap).
  const { collapsed: collapsedWidth, expanded: expandedWidth, slot } = personTabPillWidthRange(
    titleWidth,
    labelMax,
    hasGlyph,
  );

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
      easing: easingForKind(personTabExpandEasingKind(selected, motionPack)),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      if (!selected) setShowLabel(false);
      if (selected) setMarqueeReady(true);
    });
  }, [expand, motionPack, reduce, selected]);

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
              // Width alone drives the morph. Animated maxWidth + leading-pill
              // reflow was snapping labels shut on first-tab transitions.
              width: pillWidth,
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
                paused={!marqueeReady || !needsMarquee}
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
export function PersonTabs({ tabs, value, onChange, trailing, stacked, compact, labelPolicy = 'visibilityReserve', motionPack = 'cm-linear' }: Props) {
  const { colors } = useTheme();
  const scroller = useRef<ScrollView>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const [titleByKey, setTitleByKey] = useState<Record<string, number>>({});
  const [reduce, setReduce] = useState(false);
  const xOf = useRef<Record<string, number>>({});
  const widthOf = useRef<Record<string, number>>({});
  const prevValueRef = useRef<string | null>(null);
  /** Content width is ref-only — setState here re-rendered every morph frame and
   *  re-fired scrollTo(0) on first-tab transitions, snapping the outgoing label. */
  const contentWidthRef = useRef(0);
  /** Live contentOffset.x — skip no-op scrollTo (iOS cancels leading width morph). */
  const scrollOffsetRef = useRef(0);
  /** Last value we applied a scroll policy for (blocks layout-only re-scroll). */
  const scrolledValueRef = useRef<string | null>(null);
  const hasGlyph = personTabRowHasGlyph(tabs);
  const labelMax = rowWidth > 0 ? personTabLabelMax(rowWidth, tabs.length, hasGlyph, labelPolicy) : 0;
  const tabKeys = tabs.map((tab) => tab.key);
  /** Worst-case strip width — pins UIScrollView contentSize while pills morph. */
  const maxContentWidth =
    labelMax > 0 ? personTabRowMaxContentWidth(tabKeys, titleByKey, labelMax, hasGlyph) : 0;
  /** Stable overflow (prefer maxContentWidth vs rowWidth — not live onContentSizeChange). */
  const rowOverflows = rowWidth > 0 && maxContentWidth > rowWidth + 0.5;
  if (maxContentWidth > 0) contentWidthRef.current = maxContentWidth;

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

  // Scroll math reads these via refs so title/labelMax updates mid-morph cannot
  // re-fire scrollTo or clear a deferred leave-first timer (Expo Go iOS snap).
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const scrollMetricsRef = useRef({
    selectedTitleWidth: titleByKey[value] ?? 0,
    labelMax,
    hasGlyph,
  });
  scrollMetricsRef.current = {
    selectedTitleWidth: titleByKey[value] ?? 0,
    labelMax,
    hasGlyph,
  };

  useEffect(() => {
    const row = tabsRef.current;
    const x = xOf.current[value];
    if (x == null || rowWidth <= 0) return;
    const selectedIndex = row.findIndex((tab) => tab.key === value);
    const prevKey = prevValueRef.current;
    const selectionChanged = prevKey !== value;
    // rowWidth-only re-run after first layout: still need one scroll. Mid-morph
    // re-runs with the same value must not start a second scroll.
    if (!selectionChanged && scrolledValueRef.current === value) return;
    const prevIndex = prevKey == null ? null : row.findIndex((tab) => tab.key === prevKey);
    const safeSelected = Math.max(0, selectedIndex);
    const safePrev = prevIndex != null && prevIndex >= 0 ? prevIndex : null;
    const motion = personTabScrollMotion(safeSelected, safePrev);
    // Leading-pill (index 0) enter/leave: any programmatic scrollTo — instant or
    // deferred — races the CM-Linear width morph on iOS UIScrollView (and web).
    // Skip all scrollTo for instant/defer; mid↔mid keeps animated scroll.
    if (motion === 'instant' || motion === 'defer') {
      scrolledValueRef.current = value;
      prevValueRef.current = value;
      return;
    }
    const { selectedTitleWidth, labelMax: maxLabel, hasGlyph: glyph } = scrollMetricsRef.current;
    // Predicted hugged width — not live onLayout — so we scroll once per select.
    const tabWidth = personTabScrollTabWidth(
      selectedTitleWidth,
      maxLabel,
      glyph,
      widthOf.current[value] ?? PERSON_TAB_ICON_HIT,
    );
    const contentWidth = contentWidthRef.current > 0 ? contentWidthRef.current : rowWidth;
    const target = personTabScrollX({
      tabX: x,
      tabWidth,
      rowWidth,
      contentWidth,
      selectedIndex: safeSelected,
      prevIndex: safePrev,
    });
    if (!personTabScrollNeeded(scrollOffsetRef.current, target)) {
      scrolledValueRef.current = value;
      prevValueRef.current = value;
      return;
    }
    scroller.current?.scrollTo({ x: target, animated: !reduce });
    scrolledValueRef.current = value;
    prevValueRef.current = value;
    // Deps: value + rowWidth + reduce only. contentWidth / tabs[] / title metrics
    // stay in refs so mid-morph cannot re-scroll (first-tab snap on Expo Go iOS).
  }, [value, rowWidth, reduce]);

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
        // Always ScrollView (never View↔ScrollView host swap — that hid tabs).
        // Post/Alert (content fits): scrollEnabled false; overflow rows scroll.
        // Index-0 enter/leave: skip scrollTo (instant/defer).
        scrollEnabled={rowOverflows}
        showsHorizontalScrollIndicator={false}
        // Animating child widths + clipped subviews snaps leading labels on iOS.
        removeClippedSubviews={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroller}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
        }}
        onLayout={(event) => {
          const w = event.nativeEvent.layout.width;
          setRowWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
        }}
      >
        {/* Fixed max width so UIScrollView contentSize stays put while pills morph. */}
        <View
          collapsable={false}
          style={[styles.row, maxContentWidth > 0 ? { width: maxContentWidth } : null]}
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
              motionPack={motionPack}
              onChange={onChange}
              onLayoutX={(x, width) => {
                xOf.current[tab.key] = x;
                widthOf.current[tab.key] = width;
              }}
            />
          ))}
        </View>
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
    // Morphing pill widths must not change the office column layout width.
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    overflow: 'hidden',
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
    maxWidth: '100%',
    // Clip morphing pills; do not let content width grow the host.
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: PERSON_TAB_ROW_PAD_END,
    // Content may be wider than the row — ScrollView scrolls; host width stays put.
    flexGrow: 0,
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
