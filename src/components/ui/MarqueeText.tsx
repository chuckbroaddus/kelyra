import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Dimensions,
  Easing,
  I18nManager,
  Platform,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type MarqueeAlign = 'start' | 'center';

export type MarqueeScroll = {
  paused: boolean;
  scrollEpoch: number;
  /** Bumps on window rotate / resize so clips remasure and crawls restart. */
  layoutEpoch: number;
  scrollHandlers: Pick<
    ScrollViewProps,
    'onScroll' | 'onScrollBeginDrag' | 'onScrollEndDrag' | 'onMomentumScrollEnd'
  >;
};

const idleScroll: MarqueeScroll = {
  paused: false,
  scrollEpoch: 0,
  layoutEpoch: 0,
  scrollHandlers: {},
};

const MarqueeScrollContext = createContext<MarqueeScroll>(idleScroll);

export function marqueeMetrics(clipWidth: number, textWidth: number, speed = 30) {
  const overflowing = textWidth > clipWidth + 2;
  const distance = Math.max(0, textWidth - clipWidth);
  const duration = (distance / Math.max(1, speed)) * 1000;
  return { distance, duration, overflowing };
}

const nativeDriver = Platform.OS !== 'web';
const nowrap = Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as TextStyle) : null;

function measureCssText(text: string, face: TextStyle): number {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return 0;
  const size = typeof face.fontSize === 'number' ? face.fontSize : 11;
  const spacing = typeof face.letterSpacing === 'number' ? face.letterSpacing : 0;
  const family = typeof face.fontFamily === 'string' ? face.fontFamily : 'sans-serif';
  const weight = String(face.fontWeight ?? '600');
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${weight} ${size}px ${family}`;
      return ctx.measureText(text).width + spacing * Math.max(0, text.length - 1);
    }
  } catch {
    /* fall through */
  }
  const el = document.createElement('span');
  el.textContent = text;
  el.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;white-space:nowrap;max-width:none;width:max-content;font-size:${size}px;font-weight:${weight};letter-spacing:${spacing}px;font-family:${family}`;
  document.body.appendChild(el);
  const width = el.getBoundingClientRect().width;
  document.body.removeChild(el);
  return Number.isFinite(width) ? width : 0;
}

function WebMarquee({
  text,
  layout,
  type,
  align,
  delay,
  endDelay,
  fadeDuration,
  blankDelay,
  paused,
  parentPaused,
  accessibilityLabel,
  accessible,
}: {
  text: string;
  layout: TextStyle;
  type: TextStyle;
  align: MarqueeAlign;
  delay: number;
  endDelay: number;
  fadeDuration: number;
  blankDelay: number;
  paused: boolean;
  parentPaused: boolean;
  accessibilityLabel?: string;
  accessible: boolean;
}) {
  const { layoutEpoch } = useMarqueeScroll();
  const [measuredClip, setMeasuredClip] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [shift, setShift] = useState(0);
  const [ink, setInk] = useState(1);
  const clipFromStyle = typeof layout.width === 'number' ? layout.width : 0;
  const clipWidth = measuredClip || clipFromStyle;

  useEffect(() => {
    setMeasuredClip(0);
    setShift(0);
    setInk(1);
  }, [layoutEpoch]);

  useLayoutEffect(() => {
    const width = measureCssText(text, type);
    if (width > 0) setTextWidth(width);
  }, [text, type]);
  const { distance, overflowing } = marqueeMetrics(clipWidth, textWidth);
  const canRun = overflowing && !paused && !parentPaused && clipWidth > 0 && textWidth > 0;
  const rtl = I18nManager.isRTL;
  const lineHeight = typeof type.lineHeight === 'number' ? type.lineHeight : undefined;

  useEffect(() => {
    if (!canRun) {
      setShift(0);
      setInk(1);
      return;
    }
    let live = true;
    let raf = 0;
    let phase: 'holdStart' | 'crawl' | 'holdEnd' | 'fadeOut' | 'blank' | 'fadeIn' = 'holdStart';
    let started = performance.now();
    const sign = rtl ? 1 : -1;

    const frame = (now: number) => {
      if (!live) return;
      const elapsed = now - started;
      if (phase === 'holdStart') {
        setShift(0);
        setInk(1);
        if (elapsed >= delay) {
          phase = 'crawl';
          started = now;
        }
      } else if (phase === 'crawl') {
        const traveled = Math.min(distance, (elapsed / 1000) * 30);
        setShift(sign * traveled);
        if (traveled >= distance) {
          phase = 'holdEnd';
          started = now;
        }
      } else if (phase === 'holdEnd') {
        setShift(sign * distance);
        setInk(1);
        if (elapsed >= endDelay) {
          phase = 'fadeOut';
          started = now;
        }
      } else if (phase === 'fadeOut') {
        setInk(Math.max(0, 1 - elapsed / fadeDuration));
        if (elapsed >= fadeDuration) {
          setShift(0);
          phase = 'blank';
          started = now;
        }
      } else if (phase === 'blank') {
        setShift(0);
        setInk(0);
        if (elapsed >= blankDelay) {
          phase = 'fadeIn';
          started = now;
        }
      } else {
        setShift(0);
        setInk(Math.min(1, elapsed / fadeDuration));
        if (elapsed >= fadeDuration) {
          phase = 'holdStart';
          started = now;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, [blankDelay, canRun, delay, distance, endDelay, fadeDuration, layoutEpoch, rtl]);

  const spoken = accessibilityLabel ?? text;

  return (
    <View
      collapsable={false}
      pointerEvents="box-only"
      accessible={accessible}
      accessibilityRole={accessible ? 'text' : undefined}
      accessibilityLabel={accessible ? spoken : undefined}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0) setMeasuredClip((current) => (Math.abs(current - width) < 0.5 ? current : width));
      }}
      style={[layout as ViewStyle, styles.clip, { height: lineHeight }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.track,
          {
            alignSelf: overflowing ? 'flex-start' : align === 'center' ? 'center' : 'flex-start',
            width: overflowing ? textWidth : undefined,
            opacity: ink,
            transform: [{ translateX: shift }],
          },
        ]}
      >
        <Text
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no"
          style={[type, styles.tick, overflowing ? { width: textWidth } : null]}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

export function MarqueeScrollProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [scrollEpoch, setScrollEpoch] = useState(0);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coalesce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignorePauseUntil = useRef(0);

  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current);
      if (coalesce.current) clearTimeout(coalesce.current);
    },
    [],
  );

  useEffect(() => {
    const onChange = () => {
      ignorePauseUntil.current = Date.now() + 500;
      setPaused(false);
      setLayoutEpoch((value) => value + 1);
    };
    const sub = Dimensions.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const bumpEpoch = () => {
    if (coalesce.current) return;
    coalesce.current = setTimeout(() => {
      coalesce.current = null;
      setScrollEpoch((value) => value + 1);
    }, 50);
  };

  const endPan = () => {
    bumpEpoch();
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => setPaused(false), 300);
  };

  const scrollHandlers = useMemo<MarqueeScroll['scrollHandlers']>(
    () => ({
      onScrollBeginDrag: () => {
        if (Date.now() < ignorePauseUntil.current) return;
        if (settle.current) clearTimeout(settle.current);
        if (Platform.OS === 'web') {
          // Wheel / trackpad on web often never sends endDrag, which would
          // freeze every marquee for the rest of the session.
          settle.current = setTimeout(() => setPaused(false), 220);
          return;
        }
        setPaused(true);
      },
      onScrollEndDrag: endPan,
      onMomentumScrollEnd: endPan,
    }),
    [],
  );

  const value = useMemo(
    () => ({ paused, scrollEpoch, layoutEpoch, scrollHandlers }),
    [paused, scrollEpoch, layoutEpoch, scrollHandlers],
  );

  return <MarqueeScrollContext.Provider value={value}>{children}</MarqueeScrollContext.Provider>;
}

export function useMarqueeScroll(): MarqueeScroll {
  return useContext(MarqueeScrollContext);
}

const LAYOUT_KEYS = new Set([
  'width',
  'height',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'alignSelf',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'position',
  'left',
  'right',
  'top',
  'bottom',
]);

const DROP_KEYS = new Set(['textAlign', 'numberOfLines', 'ellipsizeMode']);

function splitStyle(style?: StyleProp<TextStyle>): { layout: TextStyle; type: TextStyle } {
  const flat = StyleSheet.flatten(style) ?? {};
  const layout: TextStyle = {};
  const type: TextStyle = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value == null || DROP_KEYS.has(key)) continue;
    if (LAYOUT_KEYS.has(key)) (layout as Record<string, unknown>)[key] = value;
    else (type as Record<string, unknown>)[key] = value;
  }
  return { layout, type };
}

function NativeMarquee({
  text,
  layout,
  type,
  align,
  delay,
  endDelay,
  fadeDuration,
  blankDelay,
  paused,
  parentPaused,
  accessibilityLabel,
  accessible,
  fadeColor,
}: {
  text: string;
  layout: TextStyle;
  type: TextStyle;
  align: MarqueeAlign;
  delay: number;
  endDelay: number;
  fadeDuration: number;
  blankDelay: number;
  paused: boolean;
  parentPaused: boolean;
  accessibilityLabel?: string;
  accessible: boolean;
  fadeColor?: string;
}) {
  const { scrollEpoch, layoutEpoch } = useMarqueeScroll();
  const clipRef = useRef<View>(null);
  const measureRef = useRef<Text>(null);
  const offset = useRef(new Animated.Value(0)).current;
  const ink = useRef(new Animated.Value(1)).current;
  const [clipWidth, setClipWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [visible, setVisible] = useState(true);
  const [layoutReady, setLayoutReady] = useState(true);
  const [reduce, setReduce] = useState(false);
  const [reader, setReader] = useState(false);
  const [appActive, setAppActive] = useState(true);

  const { distance, duration, overflowing } = marqueeMetrics(clipWidth, textWidth);
  const frozen = paused || parentPaused || reduce || reader || !visible || !appActive;
  const canRun = overflowing && !frozen && layoutReady && clipWidth > 0 && textWidth > 0;
  const rtl = I18nManager.isRTL;

  const takeClip = (width: number) => {
    if (width <= 0) return;
    setClipWidth((current) => (Math.abs(current - width) < 0.5 ? current : width));
  };
  const takeText = (width: number) => {
    if (width <= 0) return;
    setTextWidth((current) => (Math.abs(current - width) < 0.5 ? current : width));
  };

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (live) setReduce(value);
    });
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (live) setReader(value);
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    const voice = AccessibilityInfo.addEventListener('screenReaderChanged', setReader);
    const app = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => {
      live = false;
      motion.remove();
      voice.remove();
      app.remove();
    };
  }, []);

  useEffect(() => {
    setLayoutReady(false);
    setVisible(true);
    offset.stopAnimation();
    ink.stopAnimation();
    offset.setValue(0);
    ink.setValue(1);
    const node = clipRef.current;
    if (!node) {
      setLayoutReady(true);
      return;
    }
    node.measure((_x, _y, width) => {
      if (width > 0) takeClip(width);
      setLayoutReady(true);
    });
  }, [layoutEpoch]);

  useEffect(() => {
    setVisible(true);
    let live = true;
    const node = clipRef.current;
    if (!node) return;
    const handle = setTimeout(() => {
      node.measureInWindow((x, y, width, height) => {
        if (!live) return;
        if (width <= 1 || height <= 1) return;
        const win = Dimensions.get('window');
        if (win.width < 2 || win.height < 2) return;
        const slop = 24;
        setVisible(x + width > -slop && y + height > -slop && x < win.width + slop && y < win.height + slop);
      });
    }, 360);
    return () => {
      live = false;
      clearTimeout(handle);
    };
  }, [scrollEpoch, layoutEpoch, clipWidth, textWidth, text]);

  useEffect(() => {
    offset.stopAnimation();
    ink.stopAnimation();
    offset.setValue(0);
    ink.setValue(1);
    if (!canRun) return;
    let live = true;
    const to = rtl ? distance : -distance;
    const fade = (value: number) =>
      Animated.timing(ink, {
        toValue: value,
        duration: fadeDuration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      });
    const restore = () => {
      ink.stopAnimation();
      ink.setValue(1);
      offset.stopAnimation();
      offset.setValue(0);
    };
    const run = () => {
      if (!live) return;
      ink.setValue(1);
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(offset, {
          toValue: to,
          duration,
          easing: Easing.linear,
          useNativeDriver: nativeDriver,
        }),
        Animated.delay(endDelay),
        fade(0),
      ]).start(({ finished }) => {
        if (!live || !finished) {
          restore();
          return;
        }
        offset.setValue(0);
        Animated.sequence([Animated.delay(blankDelay), fade(1)]).start(({ finished: shown }) => {
          if (!live || !shown) {
            restore();
            return;
          }
          run();
        });
      });
    };
    run();
    return () => {
      live = false;
      restore();
    };
  }, [blankDelay, canRun, delay, distance, duration, endDelay, fadeDuration, ink, offset, rtl, text]);

  const edge = Math.min(12, Math.max(0, distance / 2 - 0.5));
  const leadOpacity =
    edge >= 4
      ? offset.interpolate({
          inputRange: rtl
            ? [0, edge, distance - edge, distance]
            : [-distance, -(distance - edge), -edge, 0],
          outputRange: [0, 1, 1, 0],
          extrapolate: 'clamp',
        })
      : 0;
  const trailOpacity =
    edge >= 4
      ? offset.interpolate({
          inputRange: rtl ? [0, distance - edge, distance] : [-distance, -(distance - edge), 0],
          outputRange: rtl ? [1, 1, 0] : [0, 1, 1],
          extrapolate: 'clamp',
        })
      : 0;

  const spoken = accessibilityLabel ?? text;
  const alignItems = overflowing ? 'flex-start' : align === 'center' ? 'center' : 'flex-start';
  const lineHeight = typeof type.lineHeight === 'number' ? type.lineHeight : undefined;
  const runWidth = overflowing && textWidth > 0 ? textWidth : undefined;

  return (
    <View
      ref={clipRef}
      collapsable={false}
      pointerEvents="box-only"
      accessible={accessible}
      accessibilityRole={accessible ? 'text' : undefined}
      accessibilityLabel={accessible ? spoken : undefined}
      onLayout={(event) => takeClip(event.nativeEvent.layout.width)}
      style={layout as ViewStyle}
    >
      <View pointerEvents="none" style={styles.measureBox} accessibilityElementsHidden>
        <Text
          ref={measureRef}
          accessible={false}
          importantForAccessibility="no"
          key={layoutEpoch}
          numberOfLines={Platform.OS === 'web' ? undefined : 1}
          ellipsizeMode={Platform.OS === 'web' ? undefined : 'clip'}
          onTextLayout={
            Platform.OS === 'web'
              ? undefined
              : (event) => {
                  const line = event.nativeEvent.lines[0];
                  if (line?.width) takeText(line.width);
                }
          }
          style={[type, styles.measureText]}
        >
          {text}
        </Text>
      </View>
      <View style={[styles.clip, { alignItems, height: lineHeight }]}>
        <Animated.View key={`ink-${layoutEpoch}`} pointerEvents="none" style={[styles.ink, { opacity: ink }]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.track, runWidth ? { width: runWidth } : null, { transform: [{ translateX: offset }] }]}
          >
            <Text
              pointerEvents="none"
              accessible={false}
              importantForAccessibility="no"
              numberOfLines={1}
              ellipsizeMode="clip"
              style={[type, styles.tick, runWidth ? { width: runWidth } : null]}
            >
              {text}
            </Text>
          </Animated.View>
          {overflowing && fadeColor && edge >= 4 ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.fade,
                  rtl ? styles.fadeEnd : styles.fadeStart,
                  { flexDirection: rtl ? 'row-reverse' : 'row', opacity: leadOpacity },
                ]}
              >
                <View style={[styles.slab, { backgroundColor: fadeColor, opacity: 1 }]} />
                <View style={[styles.slab, { backgroundColor: fadeColor, opacity: 0.55 }]} />
                <View style={[styles.slab, { backgroundColor: fadeColor, opacity: 0.25 }]} />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.fade,
                  rtl ? styles.fadeStart : styles.fadeEnd,
                  { flexDirection: rtl ? 'row-reverse' : 'row', opacity: trailOpacity },
                ]}
              >
                <View style={[styles.slab, { backgroundColor: fadeColor, opacity: 0.25 }]} />
                <View style={[styles.slab, { backgroundColor: fadeColor, opacity: 0.55 }]} />
                <View style={[styles.slab, { backgroundColor: fadeColor, opacity: 1 }]} />
              </Animated.View>
            </>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

export function MarqueeText({
  text,
  style,
  align = 'start',
  delay = 1200,
  endDelay = 800,
  fadeDuration = 520,
  blankDelay = 80,
  paused = false,
  accessibilityLabel,
  accessible = false,
  fadeColor,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  align?: MarqueeAlign;
  delay?: number;
  endDelay?: number;
  fadeDuration?: number;
  blankDelay?: number;
  paused?: boolean;
  accessibilityLabel?: string;
  accessible?: boolean;
  fadeColor?: string;
}) {
  const ctx = useMarqueeScroll();
  const { layout, type } = useMemo(() => splitStyle(style), [style]);
  if (Platform.OS === 'web') {
    return (
      <WebMarquee
        text={text}
        layout={layout}
        type={type}
        align={align}
        delay={delay}
        endDelay={endDelay}
        fadeDuration={fadeDuration}
        blankDelay={blankDelay}
        paused={paused}
        parentPaused={ctx.paused}
        accessibilityLabel={accessibilityLabel}
        accessible={accessible}
      />
    );
  }
  return (
    <NativeMarquee
      text={text}
      layout={layout}
      type={type}
      align={align}
      delay={delay}
      endDelay={endDelay}
      fadeDuration={fadeDuration}
      blankDelay={blankDelay}
      paused={paused}
      parentPaused={ctx.paused}
      accessibilityLabel={accessibilityLabel}
      accessible={accessible}
      fadeColor={fadeColor}
    />
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    width: '100%',
    flexDirection: 'row',
  },
  ink: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  measureBox: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    ...(Platform.OS === 'web' ? null : { width: 4000 }),
  },
  measureText: {
    flexShrink: 0,
    ...nowrap,
    ...(Platform.OS === 'web'
      ? ({ width: 'max-content', maxWidth: 'none' } as unknown as TextStyle)
      : null),
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  tick: {
    flexShrink: 0,
    ...nowrap,
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 12,
  },
  fadeStart: {
    left: 0,
  },
  fadeEnd: {
    right: 0,
  },
  slab: {
    width: 4,
    height: '100%',
  },
});

export function composeMarqueeScroll(
  handlers: MarqueeScroll['scrollHandlers'],
  extra?: Partial<MarqueeScroll['scrollHandlers']>,
) {
  return {
    onScrollBeginDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      extra?.onScrollBeginDrag?.(event);
      handlers.onScrollBeginDrag?.(event);
    },
    onScrollEndDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      extra?.onScrollEndDrag?.(event);
      handlers.onScrollEndDrag?.(event);
    },
    onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      extra?.onMomentumScrollEnd?.(event);
      handlers.onMomentumScrollEnd?.(event);
    },
  };
}
