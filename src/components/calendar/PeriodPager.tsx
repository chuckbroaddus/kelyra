/**
 * Shared 3D horizontal period wheel (drum). SlotPool N=9 (center ±4).
 * P0: silhouette during fling; full Set B center+neighbors post-snap;
 * Native TransformDriver = reanimated 4.5.1 worklets; Web = CSS + will-change.
 * SoT geometry: perspective 920 · pitch 78 · hero 108×126 · rotateY = clamp(d,-3,3)*-14.
 * Composite: translateX(d*P) · rotateY(ry) · scale(s) (+ opacity). No translateZ.
 * RM: drop rotateY; keep scale, opacity, snap, taps, hierarchy.
 * CAL-P6-1A: full-band stage claim (LTR+RTL); commit on snap only.
 */
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type ViewStyle,
} from 'react-native';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { PeriodLeaf, type PeriodLeafRole } from '@/components/calendar/PeriodLeaf';
import { GhostButton } from '@/components/ui/Button';
import {
  buildPeriodWindow,
  type PeriodKind,
} from '@/lib/calendar/periodPager';
import { CAL_P6_1A_FULL_BAND, CAL_P6_1A_ON_DRUM_CARVE_PX } from '@/lib/calendar/p6Laws';
import {
  WHEEL_HERO_HEIGHT,
  WHEEL_HERO_WIDTH,
  WHEEL_MAX_FLING_SLOTS,
  WHEEL_PERSPECTIVE,
  WHEEL_PITCH,
  WHEEL_REANIMATED_SPRING,
  WHEEL_SLOT_OFFSETS,
  WHEEL_STAGE_HEIGHT,
  slotIndexForOffset,
  slotPoolKey,
  snapPeriodPage,
  wheelContentModeFor,
  wheelOpacityForNorm,
  wheelRotateYDegForNorm,
  wheelScaleForNorm,
} from '@/lib/calendar/periodWheel';
import type { MultidayCount } from '@/lib/calendar/multiday';
import { useReducedMotion } from '@/lib/ui/reducedMotion';
import { useTheme } from '@/lib/theme/ThemeProvider';

// CAL-P6-1A: carve must stay 0 on drum face (named law pin).
void CAL_P6_1A_FULL_BAND;
void CAL_P6_1A_ON_DRUM_CARVE_PX;

const IS_WEB = Platform.OS === 'web';

type Props = {
  kind: PeriodKind;
  /** Year number string or ISO anchor. */
  anchor: string;
  dayCount?: MultidayCount;
  /** Signed slot steps (−4…+4). */
  onShift: (steps: number) => void;
  onJumpToday: () => void;
  accessibilityPrevLabel?: string;
  accessibilityNextLabel?: string;
};

type BoundaryState = { failed: boolean };

class PeriodLeafBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  BoundaryState
> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    this.props.onFail();
  }

  render(): ReactNode {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function FallbackToolbar({
  label,
  onPrev,
  onNext,
  onJumpToday,
  accessibilityPrevLabel,
  accessibilityNextLabel,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onJumpToday: () => void;
  accessibilityPrevLabel: string;
  accessibilityNextLabel: string;
}) {
  return (
    <View style={styles.toolbar}>
      <GhostButton label="<<" accessibilityLabel={accessibilityPrevLabel} onPress={onPrev} />
      <Pressable
        onPress={onJumpToday}
        accessibilityRole="button"
        accessibilityLabel="Go to today"
        style={styles.fallbackCenter}
      >
        <Text style={styles.fallbackLabel}>{label}</Text>
      </Pressable>
      <GhostButton label=">>" accessibilityLabel={accessibilityNextLabel} onPress={onNext} />
    </View>
  );
}

function roleForOffset(offset: number): PeriodLeafRole {
  if (offset <= -4) return 'prev4';
  if (offset === -3) return 'prev3';
  if (offset === -2) return 'prev2';
  if (offset === -1) return 'prev';
  if (offset === 1) return 'next';
  if (offset === 2) return 'next2';
  if (offset === 3) return 'next3';
  if (offset >= 4) return 'next4';
  return 'current';
}

/** Sample interpolate ranges for a parked slot over dragX ∈ [−maxP … +maxP]. */
function makeNormSamples(parked: number, pitch: number) {
  const input: number[] = [];
  const scales: number[] = [];
  const opacities: number[] = [];
  const rotateYs: number[] = [];
  const xs: number[] = [];
  for (let steps = -WHEEL_MAX_FLING_SLOTS; steps <= WHEEL_MAX_FLING_SLOTS; steps += 1) {
    const drag = steps * pitch;
    const d = parked + drag / pitch;
    input.push(drag);
    scales.push(wheelScaleForNorm(d));
    opacities.push(wheelOpacityForNorm(d));
    rotateYs.push(wheelRotateYDegForNorm(d));
    xs.push(d * pitch);
  }
  return { input, scales, opacities, rotateYs, xs };
}

function lerpSamples(samples: ReturnType<typeof makeNormSamples>, dragPx: number) {
  const { input, scales, opacities, rotateYs, xs } = samples;
  if (dragPx <= input[0]!) {
    return {
      scale: scales[0]!,
      opacity: opacities[0]!,
      rotateYDeg: rotateYs[0]!,
      translateX: xs[0]!,
    };
  }
  const last = input.length - 1;
  if (dragPx >= input[last]!) {
    return {
      scale: scales[last]!,
      opacity: opacities[last]!,
      rotateYDeg: rotateYs[last]!,
      translateX: xs[last]!,
    };
  }
  let i = 0;
  while (i < last && input[i + 1]! < dragPx) i += 1;
  const a = input[i]!;
  const b = input[i + 1]!;
  const t = b === a ? 0 : (dragPx - a) / (b - a);
  const mix = (lo: number, hi: number) => lo + (hi - lo) * t;
  return {
    scale: mix(scales[i]!, scales[i + 1]!),
    opacity: mix(opacities[i]!, opacities[i + 1]!),
    rotateYDeg: mix(rotateYs[i]!, rotateYs[i + 1]!),
    translateX: mix(xs[i]!, xs[i + 1]!),
  };
}

type SlotMotionProps = {
  parked: number;
  pitch: number;
  dragShared: SharedValue<number>;
  reduceMotion: boolean;
  children: ReactNode;
};

/** Native: reanimated worklet TransformDriver (rotateY/scale/translateX — no translateZ). */
function NativeSlotMotion({
  parked,
  pitch,
  dragShared,
  reduceMotion,
  children,
}: SlotMotionProps) {
  const samples = useMemo(() => makeNormSamples(parked, pitch), [parked, pitch]);
  const style = useAnimatedStyle(() => {
    'worklet';
    const dragPx = dragShared.value;
    // Inline lerp (worklet-safe; no JS helpers).
    const input = samples.input;
    const last = input.length - 1;
    let i = 0;
    if (dragPx <= input[0]!) i = 0;
    else if (dragPx >= input[last]!) i = last - 1;
    else {
      while (i < last && input[i + 1]! < dragPx) i += 1;
    }
    const a = input[i]!;
    const b = input[Math.min(i + 1, last)]!;
    const t = b === a ? 0 : Math.min(1, Math.max(0, (dragPx - a) / (b - a)));
    const mix = (lo: number, hi: number) => lo + (hi - lo) * t;
    const j = Math.min(i + 1, last);
    const scale = mix(samples.scales[i]!, samples.scales[j]!);
    const opacity = mix(samples.opacities[i]!, samples.opacities[j]!);
    const rotateYDeg = mix(samples.rotateYs[i]!, samples.rotateYs[j]!);
    const translateX = mix(samples.xs[i]!, samples.xs[j]!);
    if (reduceMotion) {
      return {
        opacity,
        zIndex: 100 - Math.abs(parked) * 10,
        transform: [{ scale }],
      };
    }
    return {
      opacity,
      zIndex: 100 - Math.abs(parked) * 10,
      transform: [
        { perspective: WHEEL_PERSPECTIVE },
        { translateX },
        { rotateY: `${rotateYDeg}deg` },
        { scale },
      ],
    };
  }, [samples, parked, reduceMotion]);

  return <Reanimated.View style={[styles.tileSlot, style]}>{children}</Reanimated.View>;
}

/** Web: CSS transform + will-change (not RN Animated / not JS Animated during fling). */
function WebSlotMotion({
  parked,
  pitch,
  dragPx,
  reduceMotion,
  children,
}: {
  parked: number;
  pitch: number;
  dragPx: number;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  const samples = useMemo(() => makeNormSamples(parked, pitch), [parked, pitch]);
  const sample = lerpSamples(samples, dragPx);
  const transform = reduceMotion
    ? [{ scale: sample.scale }]
    : [
        { perspective: WHEEL_PERSPECTIVE },
        { translateX: sample.translateX },
        { rotateY: `${sample.rotateYDeg}deg` },
        { scale: sample.scale },
      ];
  const style = {
    opacity: sample.opacity,
    zIndex: 100 - Math.abs(parked) * 10,
    transform,
    // Web CSS compositor hint — not applied as RN className.
    ...(IS_WEB ? ({ willChange: 'transform' } as ViewStyle) : null),
  } as ViewStyle;
  return <View style={[styles.tileSlot, style]}>{children}</View>;
}

export function PeriodPager({
  kind,
  anchor,
  dayCount = 3,
  onShift,
  onJumpToday,
  accessibilityPrevLabel = 'Previous',
  accessibilityNextLabel = 'Next',
}: Props) {
  const reduceMotion = useReducedMotion();
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const [showCenterExtras, setShowCenterExtras] = useState(true);
  const [flinging, setFlinging] = useState(false);
  /** Web drag px (CSS path). Native uses dragShared. */
  const [webDragPx, setWebDragPx] = useState(0);
  const dragShared = useSharedValue(0);
  const settling = useRef(false);
  const velocityRef = useRef(0);
  const pitch = WHEEL_PITCH;

  const window = useMemo(
    () => buildPeriodWindow({ kind, anchor, dayCount }),
    [kind, anchor, dayCount],
  );

  // Layout effect: extras paint with the rebound SlotPool window.
  useLayoutEffect(() => {
    dragShared.value = 0;
    setWebDragPx(0);
    setShowCenterExtras(true);
    setFlinging(false);
    settling.current = false;
  }, [anchor, kind, dayCount, dragShared]);

  const onFail = useCallback(() => setFailed(true), []);

  const finishShift = useCallback(
    (steps: number) => {
      settling.current = true;
      onShift(steps);
    },
    [onShift],
  );

  const onSpringRest = useCallback(
    (steps: number) => {
      setShowCenterExtras(true);
      setFlinging(false);
      if (steps === 0) {
        settling.current = false;
        return;
      }
      dragShared.value = 0;
      setWebDragPx(0);
      finishShift(steps);
    },
    [dragShared, finishShift],
  );

  const animateSnap = useCallback(
    (steps: number) => {
      const toValue = steps === 0 ? 0 : -steps * pitch;
      if (IS_WEB || reduceMotion) {
        // Web / RM: settle via immediate commit (no RN Animated fling path).
        setWebDragPx(toValue);
        // Microtask → extras within <100ms of snap intent.
        Promise.resolve().then(() => onSpringRest(steps));
        return;
      }
      dragShared.value = withSpring(
        toValue,
        {
          damping: WHEEL_REANIMATED_SPRING.damping,
          stiffness: WHEEL_REANIMATED_SPRING.stiffness,
          mass: WHEEL_REANIMATED_SPRING.mass,
          velocity: velocityRef.current,
        },
        (finished) => {
          'worklet';
          if (!finished) return;
          runOnJS(onSpringRest)(steps);
        },
      );
    },
    [dragShared, onSpringRest, pitch, reduceMotion],
  );

  const tapSide = useCallback(
    (steps: number) => {
      if (settling.current || steps === 0) return;
      if (reduceMotion) {
        onShift(steps);
        return;
      }
      setFlinging(true);
      setShowCenterExtras(false);
      velocityRef.current = steps > 0 ? -1.4 : 1.4;
      animateSnap(steps);
    },
    [animateSnap, onShift, reduceMotion],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        // CAL-P6-1A-01: contact begun inside stage band → horizontal pan pages period.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
          if (reduceMotion || settling.current || failed) return false;
          return Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
        },
        onMoveShouldSetPanResponderCapture: (_e, g) => {
          if (reduceMotion || settling.current || failed) return false;
          return Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          setShowCenterExtras(false);
          setFlinging(true);
          velocityRef.current = 0;
          if (!IS_WEB) {
            // cancel spring by freezing shared value
            dragShared.value = dragShared.value;
          }
        },
        onPanResponderMove: (_e, g) => {
          velocityRef.current = g.vx;
          if (IS_WEB) {
            setWebDragPx(g.dx);
          } else {
            dragShared.value = g.dx;
          }
        },
        onPanResponderRelease: (_e, g) => {
          velocityRef.current = g.vx;
          // CAL-P6-1A-07: period commits on snap complete only.
          const steps = snapPeriodPage(g.dx, pitch, g.vx * 1000);
          animateSnap(steps);
        },
        onPanResponderTerminate: () => {
          velocityRef.current = 0;
          animateSnap(0);
        },
      }),
    [animateSnap, dragShared, failed, pitch, reduceMotion],
  );

  if (failed) {
    return (
      <FallbackToolbar
        label={window.current.fallbackLabel}
        onPrev={() => onShift(-1)}
        onNext={() => onShift(1)}
        onJumpToday={onJumpToday}
        accessibilityPrevLabel={accessibilityPrevLabel}
        accessibilityNextLabel={accessibilityNextLabel}
      />
    );
  }

  const plateStyle = [
    styles.stage,
    {
      backgroundColor: colors.elevated,
      borderColor: colors.line,
    },
  ];

  const renderSlot = (parked: number, slotIndex: number) => {
    const tile = window.slots[slotIndex];
    if (!tile) return null;
    const role = roleForOffset(parked);
    const isCenter = parked === 0;
    const contentMode = wheelContentModeFor({ parkedOffset: parked, flinging });
    const leaf = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isCenter
            ? 'Go to today'
            : parked < 0
              ? accessibilityPrevLabel
              : accessibilityNextLabel
        }
        onPress={() => (isCenter ? onJumpToday() : tapSide(parked))}
        style={styles.hitTarget}
      >
        <PeriodLeaf
          tile={tile}
          role={role}
          showCenterExtras={isCenter && showCenterExtras}
          contentMode={contentMode}
          width={WHEEL_HERO_WIDTH}
        />
      </Pressable>
    );
    const poolKey = slotPoolKey(kind, slotIndex);
    if (reduceMotion) {
      return (
        <Pressable
          key={poolKey}
          accessibilityRole="button"
          accessibilityLabel={
            isCenter
              ? 'Go to today'
              : parked < 0
                ? accessibilityPrevLabel
                : accessibilityNextLabel
          }
          onPress={() => (isCenter ? onJumpToday() : tapSide(parked))}
          style={[
            styles.rmHit,
            {
              opacity: wheelOpacityForNorm(parked),
              transform: [{ scale: wheelScaleForNorm(parked) }],
              zIndex: 10 - Math.abs(parked),
            },
          ]}
        >
          <PeriodLeaf
            tile={tile}
            role={role}
            showCenterExtras={isCenter}
            contentMode={wheelContentModeFor({ parkedOffset: parked, flinging: false })}
            width={WHEEL_HERO_WIDTH}
          />
        </Pressable>
      );
    }
    if (IS_WEB) {
      return (
        <WebSlotMotion
          key={poolKey}
          parked={parked}
          pitch={pitch}
          dragPx={webDragPx}
          reduceMotion={false}
        >
          {leaf}
        </WebSlotMotion>
      );
    }
    return (
      <NativeSlotMotion
        key={poolKey}
        parked={parked}
        pitch={pitch}
        dragShared={dragShared}
        reduceMotion={false}
      >
        {leaf}
      </NativeSlotMotion>
    );
  };

  if (reduceMotion) {
    return (
      <PeriodLeafBoundary onFail={onFail}>
        <View style={plateStyle}>
          <View style={styles.rmRow}>
            {WHEEL_SLOT_OFFSETS.map((offset) => {
              const idx = slotIndexForOffset(offset);
              return renderSlot(offset, idx);
            })}
          </View>
        </View>
      </PeriodLeafBoundary>
    );
  }

  return (
    <PeriodLeafBoundary onFail={onFail}>
      <View
        style={plateStyle}
        accessibilityLabel={`Period wheel ${window.current.centerCaption}`}
        {...pan.panHandlers}
      >
        <View style={styles.track}>
          {WHEEL_SLOT_OFFSETS.map((parked) => {
            const idx = slotIndexForOffset(parked);
            return renderSlot(parked, idx);
          })}
        </View>
      </View>
    </PeriodLeafBoundary>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: WHEEL_STAGE_HEIGHT,
    marginTop: 8,
    marginBottom: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  track: {
    height: WHEEL_STAGE_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSlot: {
    position: 'absolute',
    width: WHEEL_HERO_WIDTH,
    height: WHEEL_HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitTarget: {
    minWidth: 56,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
    gap: 8,
  },
  fallbackCenter: {
    flex: 1,
    alignItems: 'center',
  },
  fallbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  rmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: WHEEL_STAGE_HEIGHT,
    gap: 0,
  },
  rmHit: {
    minWidth: 56,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -8,
  },
});
