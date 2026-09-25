/**
 * Shared 3D horizontal period wheel (drum). SlotPool N=7 (center ±3).
 * CAL-DRUM P1: fixed-plate leaves; RNGH Gesture.Pan; N=7 SlotPool.
 * CAL-DRUM P0: stable slot-${index} hosts; motionCompact leaves; opacity silhouette;
 * native+web TransformDriver = reanimated SharedValue + withSpring (no per-frame setState).
 * Soft MAX_FLING~48; inertial coast; short snap (|steps|≤3) freezes SlotPool; long coast recycles.
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
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
  visualShiftForSlotPool,
  type PeriodKind,
} from '@/lib/calendar/periodPager';
import { dayListDayNumber } from '@/lib/calendar/dayListRows';
import { CAL_P6_1A_FULL_BAND, CAL_P6_1A_ON_DRUM_CARVE_PX } from '@/lib/calendar/p6Laws';
import {
  WHEEL_HERO_HEIGHT,
  WHEEL_HERO_WIDTH,
  WHEEL_LOCAL_SAMPLE_SLOTS,
  WHEEL_MIN_HIT_PX,
  WHEEL_PERSPECTIVE,
  WHEEL_PERSPECTIVE_ORIGIN,
  WHEEL_REANIMATED_SPRING,
  WHEEL_SLOT_OFFSETS,
  WHEEL_STAGE_HEIGHT,
  slotIndexForOffset,
  stableSlotHostKey,
  snapPeriodPage,
  wheelContentModeFor,
  wheelOpacityForNorm,
  wheelRotateYDegForNorm,
  wheelRowLayout,
  wheelScaleForNorm,
} from '@/lib/calendar/periodWheel';
import type { MultidayCount } from '@/lib/calendar/multiday';
import { useDrumStackGestureGate } from '@/lib/calendar/drumStackGestures';
import { useReducedMotion } from '@/lib/ui/reducedMotion';
import { useTheme } from '@/lib/theme/ThemeProvider';

// CAL-P6-1A: carve must stay 0 on drum face (named law pin).
void CAL_P6_1A_FULL_BAND;
void CAL_P6_1A_ON_DRUM_CARVE_PX;
// CAL-P6-9A: drum LTR is period page only — never app-back (setSwipeRowStackGestures via useDrumStackGestureGate while finger on stage).


const IS_WEB = Platform.OS === 'web';
/** Web = full SoT; native = ~66% row height (CEO 2026-09-24). */
const ROW = wheelRowLayout(IS_WEB);

type Props = {
  kind: PeriodKind;
  /** Year number string or ISO anchor. */
  anchor: string;
  dayCount?: MultidayCount;
  /** Signed slot steps (soft-capped by WHEEL_MAX_FLING_SLOTS; may be 30+). */
  onShift: (steps: number) => void;
  onJumpToday: () => void;
  /**
   * CAL-DRUM-FOLLOW: continuous day position (days since epoch + fraction
   * through that day's section) from Day List scroll. When set (kind 'day'),
   * the drum turns with the list both ways; drum pan/snap always wins.
   */
  followPosition?: SharedValue<number> | null;
  /**
   * CAL-LIST-FOLLOW: while the drum owns the motion (drag, coast, tap snap) the
   * pager writes its continuous day position here every frame so the list can
   * scroll live; NaN when idle.
   */
  drivePosition?: SharedValue<number> | null;
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
  if (offset <= -3) return 'prev3';
  if (offset === -2) return 'prev2';
  if (offset === -1) return 'prev';
  if (offset === 1) return 'next';
  if (offset === 2) return 'next2';
  if (offset >= 3) return 'next3';
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
    <Reanimated.View style={[styles.tileSlot, { width: ROW.heroWidth, height: ROW.heroHeight }, outerStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hit.accessibilityLabel}
        onPress={hit.onPress}
        style={[styles.hitTarget, { width: ROW.heroWidth, height: ROW.heroHeight }]}
      >
        <Reanimated.View style={innerStyle} pointerEvents="none">
          {children}
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

export function PeriodPager({
  kind,
  anchor,
  dayCount = 3,
  onShift,
  onJumpToday,
  followPosition = null,
  drivePosition = null,
  accessibilityPrevLabel = 'Previous',
  accessibilityNextLabel = 'Next',
}: Props) {
  const reduceMotion = useReducedMotion();
  const { colors } = useTheme();
  const { hold: holdStackGestures, release: releaseStackGestures } = useDrumStackGestureGate();
  const [failed, setFailed] = useState(false);
  const [showCenterExtras, setShowCenterExtras] = useState(true);
  const [flinging, setFlinging] = useState(false);
  /** Anchor captured on pan grant / fling start — ±3 clear window origin. */
  const [flingOriginAnchor, setFlingOriginAnchor] = useState<string | null>(null);
  /** Integer SlotPool rebound during long fling (flyby count ↔ committed advance). */
  const [visualShift, setVisualShiftState] = useState(0);
  /** Always mirrors latest visualShift for settle commit (avoids stale predicted steps). */
  const visualShiftRef = useRef(0);
  const updateVisualShift = useCallback((shift: number) => {
    visualShiftRef.current = shift;
    setVisualShiftState(shift);
  }, []);
  /** Drag px SharedValue — native + web Reanimated (CAL-DRUM P0 N5/N6). */
  const dragShared = useSharedValue(0);
  /** 1 during programmed snap/coast — freezes SlotPool + absolute transforms. */
  const snapFreezeShared = useSharedValue(0);
  // CAL-DRUM-FOLLOW: anchor day number + follow gate.
  // followBlock 2 = drum pan/snap owns dragShared; 1 = wait until list is
  // within half a day of the anchor (after a jump); 0 = follow the list.
  const anchorPosShared = useSharedValue(kind === 'day' ? dayListDayNumber(anchor) : 0);
  const followBlockShared = useSharedValue(0);
  const snapFreezeRef = useRef(false);
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
  /** Visual drag at pan grant — move adds g.dx so mid-spring interrupt continues (t_72512eeb). */
  const grantDragBaseRef = useRef(0);
  const settling = useRef(false);
  /** RNGH velocityX is already px/s (Reanimated spring velocity). */
  const velocityRef = useRef(0);
  const pitch = ROW.pitch;
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
    pendingSnapStepsRef.current = 0;
    updateAbsorbedShift(0);
    snapActiveRef.current = false;
    updateVisualShift(0);
    setShowCenterExtras(true);
    setFlinging(false);
    setFlingOriginAnchor(null);
    settling.current = false;
    anchorPosShared.value = kind === 'day' ? dayListDayNumber(anchor) : 0;
    if (followBlockShared.value !== 0) followBlockShared.value = 1;
  }, [anchor, kind, dayCount, dragShared, snapFreezeShared, updateAbsorbedShift, updateVisualShift, anchorPosShared, followBlockShared]);

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

  // CAL-DRUM-FOLLOW: drum turns with Day List scroll (forward and back).
  useAnimatedReaction(
    () => {
      if (!followPosition) return null;
      return [followPosition.value - anchorPosShared.value, followBlockShared.value];
    },
    (next) => {
      'worklet';
      if (next == null) return;
      const delta = next[0];
      const block = next[1];
      if (block === 2) return;
      if (block === 1) {
        if (Math.abs(delta) >= 0.5) return;
        followBlockShared.value = 0;
      }
      const clamped = Math.max(-2, Math.min(2, delta));
      dragShared.value = -clamped * pitch;
    },
    [followPosition, pitch],
  );

  // CAL-LIST-FOLLOW: never leave the list thinking the drum still drives.
  useEffect(
    () => () => {
      if (drivePosition) drivePosition.value = Number.NaN;
    },
    [drivePosition],
  );

  // CAL-LIST-FOLLOW: publish drum position while the drum drives (block 2).
  useAnimatedReaction(
    () => {
      if (!drivePosition) return null;
      return followBlockShared.value === 2
        ? anchorPosShared.value - dragShared.value / pitch
        : NaN;
    },
    (pos) => {
      'worklet';
      if (pos == null || !drivePosition) return;
      if (Number.isNaN(pos) && Number.isNaN(drivePosition.value)) return;
      drivePosition.value = pos;
    },
    [drivePosition, pitch],
  );

  const onFail = useCallback(() => setFailed(true), []);

  // Failed leaf → FallbackToolbar (no drum). Drop any held stack-gesture gate.
  useEffect(() => {
    if (failed) releaseStackGestures();
  }, [failed, releaseStackGestures]);

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
    dragPxRef.current = 0;
    dragShared.value = 0;
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
    const pending = pendingSnapStepsRef.current;
    const absorbed = absorbedShiftRef.current;
    pendingSnapStepsRef.current = 0;
    updateAbsorbedShift(0);
    const commit = commitShiftFromVisual(pending + absorbed);
    // Snap drag to integer pitch matching the steps we commit.
    const snapped = -commit * pitch;
    dragShared.value = snapped;
    dragPxRef.current = snapped;
    if (commit === 0) {
      settling.current = false;
      updateVisualShift(0);
      dragShared.value = 0;
      dragPxRef.current = 0;
      followBlockShared.value = 0;
      return;
    }
    followBlockShared.value = 1;
    // visualShift / absorbedShift reset in layout effect when parent anchor updates.
    finishShift(commit);
  }, [dragShared, finishShift, pitch, snapFreezeShared, updateAbsorbedShift, updateVisualShift]);

  const animateSnap = useCallback(
    (targetSteps: number, releaseDragPx?: number) => {
      const liveShift = visualShiftRef.current;
      const absSteps = Math.abs(targetSteps);
      // Freeze ONLY short programmed snaps (|steps|≤3). Long coasts keep recycling
      // so ContentPolicy silhouettes beyond ±3 can mount.
      const freeze = shouldFreezeSlotPoolDuringSnap(true, absSteps);
      pendingSnapStepsRef.current = targetSteps;
      followBlockShared.value = 2;
      snapFreezeRef.current = freeze;
      snapFreezeShared.value = freeze ? 1 : 0;

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
          dragShared.value = 0;
        } else {
          // Rebase into residual (−P,P], spring residual → 0 (window stays at liveShift).
          const { localDrag } = residualFromTotalDrag(currentDrag, pitch);
          toValue = 0;
          dragPxRef.current = localDrag;
          dragShared.value = localDrag;
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
      // Native + web: Reanimated withSpring (CAL-DRUM P0 N5/N6 — no microtask jump).
      dragShared.value = withSpring(
        toValue,
        {
          damping: WHEEL_REANIMATED_SPRING.damping,
          stiffness: WHEEL_REANIMATED_SPRING.stiffness,
          mass: WHEEL_REANIMATED_SPRING.mass,
          // velocityRef is already px/s (RNGH velocityX).
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

  const onPanBegin = useCallback(() => {
    if (settling.current || failed) return;
    followBlockShared.value = 2;
    // CAL-P6-9A: disable interactive pop for the drum gesture lifetime.
    holdStackGestures();
    setShowCenterExtras(false);
    setFlinging(true);
    setFlingOriginAnchor(anchor);
    velocityRef.current = 0;
    // Capture visible drag BEFORE interrupt absorb so move can rebase (AC-M05 / t_72512eeb).
    const visualBefore = dragShared.value;
    // Interrupt absorb: fold pending/visual into absorbedShift (do NOT drop,
    // do NOT onShift — parent anchor reset would wipe this new drag).
    const hadInFlight =
      pendingSnapStepsRef.current !== 0 ||
      visualShiftRef.current !== 0 ||
      snapFreezeRef.current ||
      snapActiveRef.current;
    absorbInFlightSnap();
    // After absorb, residual is 0; continue from captured visual + gesture delta.
    // CAL-DRUM-FOLLOW: list may have parked the drum mid-turn — grab it there.
    grantDragBaseRef.current = hadInFlight || followPosition ? visualBefore : 0;
    dragShared.value = grantDragBaseRef.current;
    dragPxRef.current = grantDragBaseRef.current;
  }, [absorbInFlightSnap, anchor, dragShared, failed, followPosition, holdStackGestures]);

  const onPanUpdate = useCallback(
    (translationX: number, velocityX: number) => {
      // RNGH velocityX is already px/s.
      velocityRef.current = velocityX;
      const next = grantDragBaseRef.current + translationX;
      dragPxRef.current = next;
      // SharedValue path only — no per-frame React setState (CAL-DRUM P0 N5).
      dragShared.value = next;
    },
    [dragShared],
  );

  const onPanEnd = useCallback(
    (
      translationX: number,
      translationY: number,
      velocityX: number,
      stageX: number,
      success: boolean,
    ) => {
      // Finger up — restore stack pop (spring may continue; pop only races while down).
      releaseStackGestures();
      if (!success) {
        velocityRef.current = 0;
        animateSnap(0, dragPxRef.current);
        return;
      }
      velocityRef.current = velocityX;
      const next = grantDragBaseRef.current + translationX;
      dragPxRef.current = next;
      // Micro-move after start-claim → tile tap (Pressable blocked by 1A start claim).
      if (Math.abs(translationX) < 8 && Math.abs(translationY) < 8) {
        setFlinging(false);
        setShowCenterExtras(true);
        setFlingOriginAnchor(null);
        // Tap: release the pan block; a side tap re-blocks via animateSnap.
        followBlockShared.value = 1;
        tapAtStageX(stageX);
        return;
      }
      // CAL-P6-1A-07: period commits on snap complete only.
      // targetSteps drives coast destination; onSpringRest commits pending steps.
      const targetSteps = snapPeriodPage(next, pitch, velocityX);
      animateSnap(targetSteps, next);
    },
    [animateSnap, pitch, releaseStackGestures, tapAtStageX],
  );

  const onPanTerminate = useCallback(() => {
    // Cancel/interrupt without a successful end — release gate + settle residual.
    releaseStackGestures();
    velocityRef.current = 0;
    animateSnap(0, dragPxRef.current);
  }, [animateSnap, releaseStackGestures]);

  // CAL-P6-1A-01: full-band start claim (LTR+RTL) so leftmost drum pixels page, not iOS pop.
  // manualActivation + onTouchesDown activate — Move-claim alone loses the left-edge race (t_80d16cbc).
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .minPointers(1)
        // Prior move thresholds (dx>6, |dx|>|dy|*1.2) — fail vertical scrolls before pan locks.
        .activeOffsetX([-6, 6])
        .failOffsetY([-12, 12])
        .enabled(!failed)
        .onTouchesDown((_e, stateManager) => {
          'worklet';
          stateManager.activate();
        })
        .onBegin(() => {
          'worklet';
          runOnJS(onPanBegin)();
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(onPanUpdate)(e.translationX, e.velocityX);
        })
        .onEnd((e, success) => {
          'worklet';
          // success=false → treat as terminate (do not also fire onFinalize terminate).
          runOnJS(onPanEnd)(e.translationX, e.translationY, e.velocityX, e.x, success);
        })
        .onFinalize((_e, _success) => {
          'worklet';
          // Belt-and-suspenders: gate release if end skipped (rare cancel paths).
          runOnJS(releaseStackGestures)();
        }),
    [failed, onPanBegin, onPanEnd, onPanUpdate, releaseStackGestures],
  );

  // Keep terminate helper for cancel parity / source-contract tests (wired via onPanEnd !success).
  void onPanTerminate;


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
      height: ROW.stageHeight,
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
      // CAL-DRUM-FOLLOW: list can park the drum mid-turn, pulling ±2 beside
      // center — keep it full (not the gray silhouette).
      fullRadius: followPosition ? 2 : undefined,
    });
    const hit = {
      accessibilityLabel: isCenter
        ? 'Go to today'
        : parked < 0
          ? accessibilityPrevLabel
          : accessibilityNextLabel,
      onPress: () => (isCenter ? onJumpToday() : tapSide(parked)),
    };
    const leaf = (
      <PeriodLeaf
        tile={tile}
        role={role}
        showCenterExtras={isCenter && showCenterExtras}
        motionCompact={flinging || !showCenterExtras}
        contentMode={contentMode}
        width={WHEEL_HERO_WIDTH}
      />
    );
    // Native: scale SoT leaf into the compact row box (chrome stays proportional).
    const visual =
      ROW.scale === 1 ? (
        leaf
      ) : (
        <View
          style={{
            width: ROW.heroWidth,
            height: ROW.heroHeight,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: WHEEL_HERO_WIDTH,
              height: WHEEL_HERO_HEIGHT,
              transform: [{ scale: ROW.scale }],
            }}
          >
            {leaf}
          </View>
        </View>
      );
    // Stable host key by slot index — rewrite tile props on recycle, never remount mid-fling.
    const hostKey = stableSlotHostKey(slotIndex);
    return (
      <NativeSlotMotion
        key={hostKey}
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
          willChange: 'transform',
        } as unknown as ViewStyle)
      : ({
          transformOrigin: WHEEL_PERSPECTIVE_ORIGIN,
        } as ViewStyle)
  );

  return (
    <PeriodLeafBoundary onFail={onFail}>
      <GestureDetector gesture={panGesture}>
        <View
          style={[plateStyle, hostPerspectiveStyle]}
          accessibilityLabel={`Period wheel ${window.current.centerCaption}`}
          onLayout={(e) => {
            stageWidthRef.current = e.nativeEvent.layout.width;
          }}
          onTouchStart={holdStackGestures}
          onTouchEnd={releaseStackGestures}
          onTouchCancel={releaseStackGestures}
        >
          <View style={[styles.track, { height: ROW.stageHeight }]}>
            {WHEEL_SLOT_OFFSETS.map((parked) => {
              const idx = slotIndexForOffset(parked);
              return renderSlot(parked, idx);
            })}
          </View>
        </View>
      </GestureDetector>
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
