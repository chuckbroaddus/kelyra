/**
 * Shared 3D horizontal period wheel (drum). SlotPool N=9 (center ±4).
 * P0: fling ±4 from origin stay full; beyond → silhouette blur-out until onSpringRest.
 * Soft MAX_FLING~48; inertial coast; short snap (|steps|≤4) freezes SlotPool; long coast recycles for silhouettes.
 * Native TransformDriver = reanimated 4.5.1 worklets; Web = CSS + will-change.
 * SoT geometry: perspective 920 · origin 50% 45% on host · pitch 78 · hero 108×126 · rotateY = clamp(d,-3,3)*-14.
 * Composite: host perspective · translateX(d*P) · rotateY(ry) · scale(s) (+ opacity). No translateZ.
 * RM: drop rotateY/perspective; keep 1:1 drag, scale, opacity, short snap, taps, hierarchy.
 * CAL-P6-1A: full-band stage claim on start (LTR+RTL, beats iOS left-edge pop); commit on snap only.
 * CAL-3DW-08: side hits live outside scale so screen hit ≥56×56 at |d|=2.
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
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { PeriodLeaf, type PeriodLeafRole } from '@/components/calendar/PeriodLeaf';
import { GhostButton } from '@/components/ui/Button';
import {
  absorbInterruptShift,
  buildPeriodWindow,
  commitShiftFromVisual,
  periodDistance,
  residualFromTotalDrag,
  shiftPeriodAnchor,
  shouldFreezeSlotPoolDuringSnap,
  shouldIgnoreSpringRest,
  transformDragForSlotMotion,
  visualShiftForSlotPool,
  type PeriodKind,
} from '@/lib/calendar/periodPager';
import { CAL_P6_1A_FULL_BAND, CAL_P6_1A_ON_DRUM_CARVE_PX } from '@/lib/calendar/p6Laws';
import {
  WHEEL_HERO_HEIGHT,
  WHEEL_HERO_WIDTH,
  WHEEL_LOCAL_SAMPLE_SLOTS,
  WHEEL_MIN_HIT_PX,
  WHEEL_PERSPECTIVE,
  WHEEL_PERSPECTIVE_ORIGIN,
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
// CAL-P6-9A: drum LTR is period page only — never app-back.


const IS_WEB = Platform.OS === 'web';

type Props = {
  kind: PeriodKind;
  /** Year number string or ISO anchor. */
  anchor: string;
  dayCount?: MultidayCount;
  /** Signed slot steps (soft-capped by WHEEL_MAX_FLING_SLOTS; may be 30+). */
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
  for (let steps = -WHEEL_LOCAL_SAMPLE_SLOTS; steps <= WHEEL_LOCAL_SAMPLE_SLOTS; steps += 1) {
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

type SlotHitProps = {
  accessibilityLabel: string;
  onPress: () => void;
};

type SlotMotionProps = {
  parked: number;
  pitch: number;
  dragShared: SharedValue<number>;
  /** 1 while programmed snap/coast runs — absolute drag, no residual wrap. */
  snapFreezeShared: SharedValue<number>;
  reduceMotion: boolean;
  hit: SlotHitProps;
  children: ReactNode;
};

/** Shared sample eval for native slot motion (worklet-safe helpers inlined below). */
function NativeSlotMotion({
  parked,
  pitch,
  dragShared,
  snapFreezeShared,
  reduceMotion,
  hit,
  children,
}: SlotMotionProps) {
  const samples = useMemo(() => makeNormSamples(parked, pitch), [parked, pitch]);
  // Outer: translateX + opacity only — hit targets stay unscaled (CAL-3DW-08).
  const outerStyle = useAnimatedStyle(() => {
    'worklet';
    const totalDrag = dragShared.value;
    const P = pitch > 0 ? pitch : 1;
    const freeze = snapFreezeShared.value === 1;
    let dragPx: number;
    if (freeze) {
      dragPx = totalDrag;
    } else {
      const shift = Math.trunc(-totalDrag / P);
      dragPx = totalDrag + shift * P;
    }
    let opacity: number;
    let translateX: number;
    if (freeze && Math.abs(dragPx) > P * 5) {
      const d = parked + dragPx / P;
      const a = Math.abs(d);
      opacity = Math.min(1, Math.max(0.22, 1 - 0.24 * a - 0.03 * d * d));
      translateX = d * P;
    } else {
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
      opacity = mix(samples.opacities[i]!, samples.opacities[j]!);
      translateX = mix(samples.xs[i]!, samples.xs[j]!);
    }
    return {
      opacity,
      zIndex: 100 - Math.abs(parked) * 10,
      transform: [{ translateX }],
    };
  }, [samples, parked, pitch, snapFreezeShared]);

  // Inner visual: scale (+ rotateY unless RM). Perspective lives on host (CAL-3DW perspective-origin).
  const innerStyle = useAnimatedStyle(() => {
    'worklet';
    const totalDrag = dragShared.value;
    const P = pitch > 0 ? pitch : 1;
    const freeze = snapFreezeShared.value === 1;
    let dragPx: number;
    if (freeze) {
      dragPx = totalDrag;
    } else {
      const shift = Math.trunc(-totalDrag / P);
      dragPx = totalDrag + shift * P;
    }
    let scale: number;
    let rotateYDeg: number;
    if (freeze && Math.abs(dragPx) > P * 5) {
      const d = parked + dragPx / P;
      const a = Math.abs(d);
      scale = Math.min(1, Math.max(0.46, 1 - 0.22 * a - 0.02 * d * d));
      const c = d < -3 ? -3 : d > 3 ? 3 : d;
      rotateYDeg = c === 0 ? 0 : c * -14;
    } else {
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
      scale = mix(samples.scales[i]!, samples.scales[j]!);
      rotateYDeg = mix(samples.rotateYs[i]!, samples.rotateYs[j]!);
    }
    if (reduceMotion) {
      return { transform: [{ scale }] };
    }
    return {
      transform: [{ rotateY: `${rotateYDeg}deg` }, { scale }],
    };
  }, [samples, parked, pitch, reduceMotion, snapFreezeShared]);

  return (
    <Reanimated.View style={[styles.tileSlot, outerStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hit.accessibilityLabel}
        onPress={hit.onPress}
        style={styles.hitTarget}
      >
        <Reanimated.View style={innerStyle} pointerEvents="none">
          {children}
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

/** Web: CSS transform + will-change (not RN Animated / not JS Animated during fling). */
function WebSlotMotion({
  parked,
  pitch,
  dragPx,
  freezeSlotPool,
  reduceMotion,
  hit,
  children,
}: {
  parked: number;
  pitch: number;
  dragPx: number;
  freezeSlotPool: boolean;
  reduceMotion: boolean;
  hit: SlotHitProps;
  children: ReactNode;
}) {
  const samples = useMemo(() => makeNormSamples(parked, pitch), [parked, pitch]);
  const localDrag = transformDragForSlotMotion({
    totalDrag: dragPx,
    pitch,
    freezeSlotPool,
  });
  const sample = lerpSamples(samples, localDrag);
  // Outer translate only — hits stay ≥56×56 screen px (CAL-3DW-08).
  const outerStyle = {
    opacity: sample.opacity,
    zIndex: 100 - Math.abs(parked) * 10,
    transform: [{ translateX: sample.translateX }],
    ...(IS_WEB ? ({ willChange: 'transform' } as ViewStyle) : null),
  } as ViewStyle;
  // Inner visual: scale (+ rotateY unless RM). Host owns perspective + origin.
  const innerStyle = {
    transform: reduceMotion
      ? [{ scale: sample.scale }]
      : [{ rotateY: `${sample.rotateYDeg}deg` }, { scale: sample.scale }],
  } as ViewStyle;
  return (
    <View style={[styles.tileSlot, outerStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hit.accessibilityLabel}
        onPress={hit.onPress}
        style={styles.hitTarget}
      >
        <View style={innerStyle} pointerEvents="none">
          {children}
        </View>
      </Pressable>
    </View>
  );
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
  /** Anchor captured on pan grant / fling start — ±4 clear window origin. */
  const [flingOriginAnchor, setFlingOriginAnchor] = useState<string | null>(null);
  /** Integer SlotPool rebound during long fling (flyby count ↔ committed advance). */
  const [visualShift, setVisualShiftState] = useState(0);
  /** Always mirrors latest visualShift for settle commit (avoids stale predicted steps). */
  const visualShiftRef = useRef(0);
  const updateVisualShift = useCallback((shift: number) => {
    visualShiftRef.current = shift;
    setVisualShiftState(shift);
  }, []);
  /** Web drag px (CSS path). Native uses dragShared. */
  const [webDragPx, setWebDragPx] = useState(0);
  const dragShared = useSharedValue(0);
  /** 1 during programmed snap/coast — freezes SlotPool + absolute transforms. */
  const snapFreezeShared = useSharedValue(0);
  const snapFreezeRef = useRef(false);
  /** React mirror of snap freeze for WebSlotMotion (refs alone do not re-render). */
  const [slotPoolFrozen, setSlotPoolFrozen] = useState(false);
  /** Absolute steps the in-flight snap will commit on rest (intended targetSteps). */
  const pendingSnapStepsRef = useRef(0);
  /**
   * Progress folded in when a gesture interrupts an in-flight snap/coast.
   * Applied in the window build with visualShift; committed on next successful rest.
   * Never call onShift mid-gesture — parent anchor layout effect would wipe the new drag.
   */
  const [absorbedShift, setAbsorbedShiftState] = useState(0);
  const absorbedShiftRef = useRef(0);
  const updateAbsorbedShift = useCallback((steps: number) => {
    absorbedShiftRef.current = steps;
    setAbsorbedShiftState(steps);
  }, []);
  /** Bumped on interrupt / each animateSnap so late cancelled withSpring rests no-op. */
  const snapGenerationRef = useRef(0);
  /** True while a programmed snap/coast spring (or web microtask rest) is outstanding. */
  const snapActiveRef = useRef(false);
  /** Mirrors latest total drag px (web state + native shared) for residual rebase on release. */
  const dragPxRef = useRef(0);
  const settling = useRef(false);
  /** PanResponder vx is px/ms; Reanimated spring velocity expects px/s. */
  const velocityRef = useRef(0);
  const pitch = WHEEL_PITCH;
  /** Stage width for start-claim micro-tap slot pick (CAL-P6-1A). */
  const stageWidthRef = useRef(390);

  const window = useMemo(
    () =>
      buildPeriodWindow({
        kind,
        anchor: shiftPeriodAnchor(kind, anchor, absorbedShift + visualShift, dayCount),
        dayCount,
      }),
    [kind, anchor, dayCount, absorbedShift, visualShift],
  );

  // Layout effect: extras paint with the rebound SlotPool window after parent commits.
  useLayoutEffect(() => {
    dragShared.value = 0;
    dragPxRef.current = 0;
    snapFreezeShared.value = 0;
    snapFreezeRef.current = false;
    setSlotPoolFrozen(false);
    pendingSnapStepsRef.current = 0;
    updateAbsorbedShift(0);
    snapActiveRef.current = false;
    setWebDragPx(0);
    updateVisualShift(0);
    setShowCenterExtras(true);
    setFlinging(false);
    setFlingOriginAnchor(null);
    settling.current = false;
  }, [anchor, kind, dayCount, dragShared, snapFreezeShared, updateAbsorbedShift, updateVisualShift]);

  // Native: rebound period keys as total drag / pitch crosses integers (trunc, not round).
  // Skip while programmed snap/coast freezes SlotPool (no mid-spring content recycle).
  useAnimatedReaction(
    () => Math.trunc(-dragShared.value / pitch),
    (shift, prev) => {
      'worklet';
      if (snapFreezeShared.value === 1) return;
      if (shift !== prev) {
        runOnJS(updateVisualShift)(shift);
      }
    },
    [pitch, snapFreezeShared, updateVisualShift],
  );

  const onFail = useCallback(() => setFailed(true), []);

  const finishShift = useCallback(
    (steps: number) => {
      settling.current = true;
      onShift(steps);
    },
    [onShift],
  );

  /**
   * Fold in-flight snap/coast progress into absorbedShift without calling onShift.
   * Parent layout effect on anchor would wipe a mid-gesture drag if we committed now.
   */
  const absorbInFlightSnap = useCallback(() => {
    const inFlight =
      pendingSnapStepsRef.current !== 0 ||
      visualShiftRef.current !== 0 ||
      snapFreezeRef.current ||
      snapActiveRef.current;
    if (!inFlight) return;
    // Invalidate any late onSpringRest from the cancelled withSpring.
    snapGenerationRef.current += 1;
    snapActiveRef.current = false;
    const owed = absorbInterruptShift({
      pendingSteps: pendingSnapStepsRef.current,
      visualShift: visualShiftRef.current,
    });
    if (owed !== 0) {
      updateAbsorbedShift(absorbedShiftRef.current + owed);
    }
    pendingSnapStepsRef.current = 0;
    updateVisualShift(0);
    snapFreezeShared.value = 0;
    snapFreezeRef.current = false;
    setSlotPoolFrozen(false);
    dragPxRef.current = 0;
    dragShared.value = 0;
    setWebDragPx(0);
  }, [dragShared, snapFreezeShared, updateAbsorbedShift, updateVisualShift]);

  const onSpringRest = useCallback((callbackGeneration: number) => {
    // End of spring/coast: drop silhouette, show full center ledger.
    // Generation mismatch → cancelled spring after interrupt absorb; no-op.
    if (
      shouldIgnoreSpringRest({
        activeGeneration: snapGenerationRef.current,
        callbackGeneration,
      })
    ) {
      return;
    }
    snapActiveRef.current = false;
    // Short snap may freeze SlotPool at release-time liveShift (or 0 for taps);
    // long coast kept recycling. Commit pending + any absorbed interrupt progress.
    setShowCenterExtras(true);
    setFlinging(false);
    setFlingOriginAnchor(null);
    snapFreezeShared.value = 0;
    snapFreezeRef.current = false;
    setSlotPoolFrozen(false);
    const pending = pendingSnapStepsRef.current;
    const absorbed = absorbedShiftRef.current;
    pendingSnapStepsRef.current = 0;
    updateAbsorbedShift(0);
    const commit = commitShiftFromVisual(pending + absorbed);
    // Snap drag to integer pitch matching the steps we commit.
    const snapped = -commit * pitch;
    dragShared.value = snapped;
    setWebDragPx(snapped);
    if (commit === 0) {
      settling.current = false;
      updateVisualShift(0);
      dragShared.value = 0;
      setWebDragPx(0);
      return;
    }
    // visualShift / absorbedShift reset in layout effect when parent anchor updates.
    finishShift(commit);
  }, [dragShared, finishShift, pitch, snapFreezeShared, updateAbsorbedShift, updateVisualShift]);

  const animateSnap = useCallback(
    (targetSteps: number, releaseDragPx?: number) => {
      const liveShift = visualShiftRef.current;
      const absSteps = Math.abs(targetSteps);
      // Freeze ONLY short programmed snaps (|steps|≤4). Long coasts keep recycling
      // so ContentPolicy silhouettes beyond ±4 can mount.
      const freeze = shouldFreezeSlotPoolDuringSnap(true, absSteps);
      pendingSnapStepsRef.current = targetSteps;
      snapFreezeRef.current = freeze;
      snapFreezeShared.value = freeze ? 1 : 0;
      setSlotPoolFrozen(freeze);

      const currentDrag =
        typeof releaseDragPx === 'number' ? releaseDragPx : dragPxRef.current;

      let toValue: number;
      if (freeze) {
        // Keep SlotPool at release-time liveShift — never flash content back to origin
        // when the user already recycled (liveShift ≠ 0).
        updateVisualShift(
          visualShiftForSlotPool({
            freezeSlotPool: true,
            liveShift,
            frozenShift: liveShift,
          }),
        );
        if (liveShift === 0) {
          // Pure tap from rest: absolute spring 0 → −steps·P with freeze-at-0.
          toValue = targetSteps === 0 ? 0 : -targetSteps * pitch;
          dragPxRef.current = 0;
          if (!IS_WEB) dragShared.value = 0;
          else setWebDragPx(0);
        } else {
          // Rebase into residual (−P,P], spring residual → 0 (window stays at liveShift).
          const { localDrag } = residualFromTotalDrag(currentDrag, pitch);
          toValue = 0;
          dragPxRef.current = localDrag;
          if (!IS_WEB) dragShared.value = localDrag;
          else setWebDragPx(localDrag);
        }
      } else {
        // Long coast: absolute spring to −targetSteps·P; reaction keeps updating
        // visualShift so distant tiles silhouette. Flinging stays true until rest.
        toValue = targetSteps === 0 ? 0 : -targetSteps * pitch;
      }

      // Keep flinging===true (silhouettes) for the entire spring/coast.
      // onSpringRest flips flinging false + showCenterExtras + onShift(pending+absorbed).
      snapGenerationRef.current += 1;
      const springGeneration = snapGenerationRef.current;
      snapActiveRef.current = true;
      // Web: no reanimated spring. Native RM still springs (scale-only; no rotateY).
      if (IS_WEB) {
        setWebDragPx(toValue);
        dragPxRef.current = toValue;
        Promise.resolve().then(() => onSpringRest(springGeneration));
        return;
      }
      dragShared.value = withSpring(
        toValue,
        {
          damping: WHEEL_REANIMATED_SPRING.damping,
          stiffness: WHEEL_REANIMATED_SPRING.stiffness,
          mass: WHEEL_REANIMATED_SPRING.mass,
          // velocityRef is already px/s (PanResponder vx * 1000).
          velocity: velocityRef.current,
        },
        (finished) => {
          'worklet';
          if (!finished) return;
          runOnJS(onSpringRest)(springGeneration);
        },
      );
    },
    [dragShared, onSpringRest, pitch, snapFreezeShared, updateVisualShift],
  );

  const tapSide = useCallback(
    (steps: number) => {
      if (settling.current || steps === 0) return;
      // Absorb any in-flight snap before programming a new one (no mid-gesture onShift).
      // RM keeps short snap (drop rotateY only) — still 1:1 path via animateSnap.
      absorbInFlightSnap();
      setFlinging(true);
      setFlingOriginAnchor(anchor);
      setShowCenterExtras(false);
      // px/s nudge so spring coasts toward the tapped neighbor.
      velocityRef.current = steps > 0 ? -1400 : 1400;
      animateSnap(steps);
    },
    [absorbInFlightSnap, anchor, animateSnap],
  );

  const tapAtStageX = useCallback(
    (locationX: number) => {
      const width = stageWidthRef.current || 390;
      const x = locationX - width / 2;
      let nearest = 0;
      let best = Math.abs(x);
      for (const offset of WHEEL_SLOT_OFFSETS) {
        const dist = Math.abs(x - offset * pitch);
        if (dist < best) {
          best = dist;
          nearest = offset;
        }
      }
      if (nearest === 0) onJumpToday();
      else tapSide(nearest);
    },
    [onJumpToday, pitch, tapSide],
  );

    const pan = useMemo(
    () =>
      PanResponder.create({
        // CAL-P6-1A-01: full-band start claim (LTR+RTL) so leftmost drum pixels page, not iOS pop.
        // Move-claim alone loses the left-edge race (t_80d16cbc).
        onStartShouldSetPanResponder: () => !settling.current && !failed,
        onStartShouldSetPanResponderCapture: () => !settling.current && !failed,
        onMoveShouldSetPanResponder: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
          // RM keeps 1:1 drag (t_b9051be5) — only settle/fail gate.
          if (settling.current || failed) return false;
          return Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
        },
        onMoveShouldSetPanResponderCapture: (_e, g) => {
          if (settling.current || failed) return false;
          return Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          setShowCenterExtras(false);
          setFlinging(true);
          setFlingOriginAnchor(anchor);
          velocityRef.current = 0;
          // Interrupt absorb: fold pending/visual into absorbedShift (do NOT drop,
          // do NOT onShift — parent anchor reset would wipe this new drag).
          const hadInFlight =
            pendingSnapStepsRef.current !== 0 ||
            visualShiftRef.current !== 0 ||
            snapFreezeRef.current ||
            snapActiveRef.current;
          absorbInFlightSnap();
          if (!hadInFlight && !IS_WEB) {
            // No snap in flight: cancel any residual spring by freezing the shared value.
            dragShared.value = dragShared.value;
          }
        },
        onPanResponderMove: (_e, g) => {
          // PanResponder vx is px/ms → store px/s for withSpring.
          velocityRef.current = g.vx * 1000;
          dragPxRef.current = g.dx;
          if (IS_WEB) {
            setWebDragPx(g.dx);
            updateVisualShift(residualFromTotalDrag(g.dx, pitch).shift);
          } else {
            dragShared.value = g.dx;
          }
        },
        onPanResponderRelease: (_e, g) => {
          velocityRef.current = g.vx * 1000;
          dragPxRef.current = g.dx;
          // Micro-move after start-claim → tile tap (Pressable blocked by 1A start claim).
          if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) {
            setFlinging(false);
            setShowCenterExtras(true);
            setFlingOriginAnchor(null);
            tapAtStageX(_e.nativeEvent.locationX);
            return;
          }
          // CAL-P6-1A-07: period commits on snap complete only.
          // targetSteps drives coast destination; onSpringRest commits pending steps.
          const targetSteps = snapPeriodPage(g.dx, pitch, g.vx * 1000);
          animateSnap(targetSteps, g.dx);
        },
        onPanResponderTerminate: () => {
          velocityRef.current = 0;
          animateSnap(0, dragPxRef.current);
        },
      }),
    [absorbInFlightSnap, animateSnap, anchor, dragShared, failed, pitch, tapAtStageX, updateVisualShift],
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
    const distanceFromOrigin =
      flinging && flingOriginAnchor != null
        ? periodDistance(kind, flingOriginAnchor, tile.anchor, dayCount)
        : 0;
    const contentMode = wheelContentModeFor({
      parkedOffset: parked,
      flinging,
      distanceFromOrigin,
    });
    const hit = {
      accessibilityLabel: isCenter
        ? 'Go to today'
        : parked < 0
          ? accessibilityPrevLabel
          : accessibilityNextLabel,
      onPress: () => (isCenter ? onJumpToday() : tapSide(parked)),
    };
    const visual = (
      <PeriodLeaf
        tile={tile}
        role={role}
        showCenterExtras={isCenter && showCenterExtras}
        contentMode={contentMode}
        width={WHEEL_HERO_WIDTH}
      />
    );
    const poolKey = slotPoolKey(tile.key, slotIndex);
    if (IS_WEB) {
      return (
        <WebSlotMotion
          key={poolKey}
          parked={parked}
          pitch={pitch}
          dragPx={webDragPx}
          freezeSlotPool={slotPoolFrozen}
          reduceMotion={reduceMotion}
          hit={hit}
        >
          {visual}
        </WebSlotMotion>
      );
    }
    return (
      <NativeSlotMotion
        key={poolKey}
        parked={parked}
        pitch={pitch}
        dragShared={dragShared}
        snapFreezeShared={snapFreezeShared}
        reduceMotion={reduceMotion}
        hit={hit}
      >
        {visual}
      </NativeSlotMotion>
    );
  };

  // Host owns perspective + 50% 45% origin (CAL-3DW Spec §2.1 / t_15feb999).
  const hostPerspectiveStyle = (
    IS_WEB
      ? ({
          perspective: WHEEL_PERSPECTIVE,
          // RN Web CSS perspective-origin / transform-origin.
          perspectiveOrigin: WHEEL_PERSPECTIVE_ORIGIN,
          transformOrigin: WHEEL_PERSPECTIVE_ORIGIN,
        } as unknown as ViewStyle)
      : ({
          transformOrigin: WHEEL_PERSPECTIVE_ORIGIN,
        } as ViewStyle)
  );

  return (
    <PeriodLeafBoundary onFail={onFail}>
      <View
        style={[plateStyle, hostPerspectiveStyle]}
        accessibilityLabel={`Period wheel ${window.current.centerCaption}`}
        onLayout={(e) => {
          stageWidthRef.current = e.nativeEvent.layout.width;
        }}
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
    // Unscaled screen space (outside rotateY/scale) — CAL-3DW-08 / t_1a0f176c.
    minWidth: WHEEL_MIN_HIT_PX,
    minHeight: WHEEL_MIN_HIT_PX,
    width: WHEEL_HERO_WIDTH,
    height: WHEEL_HERO_HEIGHT,
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
});
