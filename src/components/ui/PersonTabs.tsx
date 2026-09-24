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
  PERSON_TAB_SCROLL_SETTLE_MS,
  personTabExpandEasingKind,
  personTabLabelMax,
  personTabLeadingScrollLockMs,
  personTabNeedsLeadingScrollLock,
  personTabRowHasGlyph,
  personTabPillWidthRange,
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
  /**
   * When selected but false, hold width expand until enter-0 scroll settles.
   * A11y selected + icon color still follow `selected` immediately.
   */
  morphArmed: boolean;
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
  morphArmed,
  hasGlyph,
  labelMax,
  titleWidth,
  colors,
  reduce,
  motionPack,
  onChange,
  onLayoutX,
}: PillProps) {
  // Expand only when selected AND armed (enter-0 may delay arm after scroll).
  const expandOpen = selected && morphArmed;
  const expand = useRef(new Animated.Value(expandOpen ? 1 : 0)).current;
  const [showLabel, setShowLabel] = useState(expandOpen);
  /** Marquee only after the expand settles at full width (Chuck: marquee after max). */
  const [marqueeReady, setMarqueeReady] = useState(expandOpen);
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
    if (expandOpen) {
      setShowLabel(true);
    } else {
      setMarqueeReady(false);
    }
    if (reduce) {
      expand.setValue(expandOpen ? 1 : 0);
      setShowLabel(expandOpen);
      setMarqueeReady(expandOpen);
      return;
    }
    Animated.timing(expand, {
      toValue: expandOpen ? 1 : 0,
      duration: chrome.motion.personTab,
      easing: easingForKind(personTabExpandEasingKind(expandOpen, motionPack)),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      if (!expandOpen) setShowLabel(false);
      if (expandOpen) setMarqueeReady(true);
    });
  }, [expand, expandOpen, motionPack, reduce]);

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
          // Keep native view identity stable while width morphs (iOS snap).
          collapsable={false}
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
  /**
   * Arm/lock gates sync in render when `value` changes so the selected pill does
   * not start expanding before enter-0 scroll settles (effect would be one frame late).
   */
  const [armGate, setArmGate] = useState<{ key: string; armed: boolean }>({ key: value, armed: true });
  const [lockGate, setLockGate] = useState<{ key: string; locked: boolean }>({ key: value, locked: false });
  const xOf = useRef<Record<string, number>>({});
  const widthOf = useRef<Record<string, number>>({});
  const prevValueRef = useRef<string | null>(null);
  /** Content width is ref-only — setState here re-rendered every morph frame and
   *  re-fired scrollTo(0) on first-tab transitions, snapping the outgoing label. */
  const contentWidthRef = useRef(0);
  /** Live contentOffset.x — skip no-op scrollTo (iOS cancels leading width morph). */
  const scrollOffsetRef = useRef(0);
  /** Offset frozen for the leading-morph lock window. */
  const frozenOffsetRef = useRef(0);
  /** Ignore onScroll while we re-assert frozen offset (no feedback loop). */
  const assertingScrollRef = useRef(false);
  /** Bumps to cancel a deferred leave-first scroll when selection changes again. */
  const scrollGenRef = useRef(0);
  /** Last value we applied a scroll policy for (blocks layout-only re-scroll). */
  const scrolledValueRef = useRef<string | null>(null);
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

  // Render-phase gate: hold expand + lock scroll the same commit as selection change.
  // Use the computed values on this render — armGate/lockGate state lags one setState.
  let morphArmed: boolean;
  let scrollLocked: boolean;
  if (armGate.key === value && lockGate.key === value) {
    morphArmed = armGate.armed;
    scrollLocked = lockGate.locked;
  } else {
    const selectedIndex = Math.max(0, tabs.findIndex((tab) => tab.key === value));
    const prevKey = prevValueRef.current;
    const prevIndex = prevKey == null ? null : tabs.findIndex((tab) => tab.key === prevKey);
    const safePrev = prevIndex != null && prevIndex >= 0 ? prevIndex : null;
    const motion = personTabScrollMotion(selectedIndex, safePrev);
    const needsLock = personTabNeedsLeadingScrollLock(selectedIndex, safePrev);
    let armed = true;
    const enter0ScrollNeeded =
      motion === 'scroll-then-morph' && personTabScrollNeeded(scrollOffsetRef.current, 0);
    if (enter0ScrollNeeded) {
      armed = false;
    }
    morphArmed = armGate.key === value ? armGate.armed : armed;
    scrollLocked = lockGate.key === value ? lockGate.locked : needsLock;
    if (armGate.key !== value) {
      setArmGate({ key: value, armed });
    }
    if (lockGate.key !== value) {
      // Enter-0: freeze at target (0) so intentional scrollTo is not fought by the lock.
      // Leave-0: freeze at current offset so contentSize thrash cannot drift during shrink.
      if (needsLock) {
        frozenOffsetRef.current = enter0ScrollNeeded ? 0 : scrollOffsetRef.current;
      }
      setLockGate({ key: value, locked: needsLock });
    }
  }

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
    const motion = personTabScrollMotion(safeSelected, safePrev);
    const runScroll = (animated: boolean, toX = target) => {
      if (!personTabScrollNeeded(scrollOffsetRef.current, toX)) return false;
      assertingScrollRef.current = true;
      scroller.current?.scrollTo({ x: toX, animated });
      requestAnimationFrame(() => {
        assertingScrollRef.current = false;
      });
      return true;
    };
    // Leading-pill (index 0) width morph on iOS UIScrollView: concurrent
    // scrollTo / contentSize thrash cancels JS width timing so the label snaps.
    // Lock scroll + freeze offset for the morph window; enter-0 scrolls first.
    let deferTimer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let unlockTimer: ReturnType<typeof setTimeout> | undefined;
    const token = ++scrollGenRef.current;

    const unlockAfter = (ms: number) => {
      if (unlockTimer) clearTimeout(unlockTimer);
      unlockTimer = setTimeout(() => {
        if (token !== scrollGenRef.current) return;
        setLockGate({ key: value, locked: false });
      }, ms);
    };

    // Arm/lock already gated in render for this value; effect only scrolls + timers.
    if (motion === 'scroll-then-morph') {
      // Enter index 0: scroll (if needed) BEFORE width expand — never concurrent.
      const scrollNeeded = personTabScrollNeeded(scrollOffsetRef.current, target);
      if (scrollNeeded) {
        runScroll(false);
        frozenOffsetRef.current = target;
        scrollOffsetRef.current = target;
        const settle = reduce ? 0 : PERSON_TAB_SCROLL_SETTLE_MS;
        settleTimer = setTimeout(() => {
          if (token !== scrollGenRef.current) return;
          setArmGate({ key: value, armed: true });
          unlockAfter(personTabLeadingScrollLockMs(reduce, chrome.motion.personTab));
        }, settle);
      } else {
        frozenOffsetRef.current = scrollOffsetRef.current;
        setArmGate({ key: value, armed: true });
        unlockAfter(personTabLeadingScrollLockMs(reduce, chrome.motion.personTab));
      }
    } else if (motion === 'defer') {
      // Leave index 0: shrink now; scroll after morph; keep lock for that window.
      const delay = personTabLeadingScrollLockMs(reduce, chrome.motion.personTab);
      deferTimer = setTimeout(() => {
        if (token !== scrollGenRef.current) return;
        setLockGate({ key: value, locked: false });
        // Recompute after leading pill settled — siblings' x shifted as index 0 shrank.
        const xNow = xOf.current[value];
        if (xNow == null || rowWidth <= 0) return;
        const metrics = scrollMetricsRef.current;
        const tabWidthNow = personTabScrollTabWidth(
          metrics.selectedTitleWidth,
          metrics.labelMax,
          metrics.hasGlyph,
          widthOf.current[value] ?? PERSON_TAB_ICON_HIT,
        );
        const contentNow = contentWidthRef.current > 0 ? contentWidthRef.current : rowWidth;
        const targetNow = personTabScrollX({
          tabX: xNow,
          tabWidth: tabWidthNow,
          rowWidth,
          contentWidth: contentNow,
          selectedIndex: safeSelected,
          prevIndex: safePrev,
        });
        if (!personTabScrollNeeded(scrollOffsetRef.current, targetNow)) return;
        scroller.current?.scrollTo({ x: targetNow, animated: !reduce });
      }, delay);
    } else {
      runScroll(!reduce);
    }
    scrolledValueRef.current = value;
    prevValueRef.current = value;
    return () => {
      if (deferTimer) clearTimeout(deferTimer);
      if (settleTimer) clearTimeout(settleTimer);
      if (unlockTimer) clearTimeout(unlockTimer);
    };
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
        showsHorizontalScrollIndicator={false}
        // Animating child widths + clipped subviews snaps leading labels on iOS.
        removeClippedSubviews={false}
        scrollEnabled={!scrollLocked}
        contentContainerStyle={styles.row}
        style={styles.scroller}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const x = event.nativeEvent.contentOffset.x;
          if (assertingScrollRef.current) {
            scrollOffsetRef.current = x;
            return;
          }
          if (scrollLocked) {
            const frozen = frozenOffsetRef.current;
            scrollOffsetRef.current = frozen;
            // contentSize thrash / bounce can drift offset and kill width morph.
            if (Math.abs(x - frozen) > 1) {
              assertingScrollRef.current = true;
              scroller.current?.scrollTo({ x: frozen, animated: false });
              requestAnimationFrame(() => {
                assertingScrollRef.current = false;
              });
            }
            return;
          }
          scrollOffsetRef.current = x;
        }}
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={(width) => {
          contentWidthRef.current = width;
        }}
      >
        {tabs.map((tab) => (
          <PersonTabPill
            key={tab.key}
            tab={tab}
            selected={tab.key === value}
            // Hold expand only for the selected enter-0 pill until scroll settles.
            morphArmed={tab.key === value ? morphArmed : true}
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
