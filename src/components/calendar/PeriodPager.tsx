/**
 * Shared 3D horizontal period wheel (drum). SlotPool N=7 (center ±3).
 * CAL-DRUM P1: fixed-plate leaves; RNGH Gesture.Pan; N=7 SlotPool.
 * CAL-DRUM P0: stable slot-${index} hosts; motionCompact leaves; opacity silhouette;
 * native+web TransformDriver = reanimated SharedValue (no per-frame setState).
 * CAL-DRUM-TRACK: the pan runs on the UI thread (finger 1:1, no JS hop per frame).
 * Every card is placed by its own absolute period index (drumSlotNorm) and lives
 * on ring host drumRingSlot(index), so a value rides one card across the drum —
 * never relabeled in place. The JS window only decides which 7 values are mounted.
 * Fling = momentum coast (drumCoastPlan); slow release = spring. Soft MAX_FLING~48.
 * SoT geometry: perspective 920 · origin 50% 45% on host · pitch 78 · hero 108×126 · rotateY = clamp(d,-3,3)*-14.
 * Composite: host perspective · translateX(d*P) · rotateY(ry) · scale(s) (+ opacity). No translateZ.
 * RM: drop rotateY/perspective; keep 1:1 drag, scale, opacity, short snap, taps, hierarchy.
 * CAL-P6-1A: full-band stage claim on start (LTR+RTL, beats iOS left-edge pop); commit on snap only.
 * CAL-3DW-08: side hits live outside scale so screen hit ≥56×56 at |d|=2.
 * CAL-DRUM-PH (variant C): a fast flick (> ~8 periods/s) turns every card into the
 * placeholder card (pre-blurred blob + shimmer, no live blur); under ~6/s the cards
 * focus back in center first. UI-thread speed driver — DrumPlaceholder.tsx.
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
  Easing,
  cancelAnimation,
  runOnJS,
  runOnUI,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  DrumFocusProvider,
  useDrumPlaceholderDriver,
} from '@/components/calendar/DrumPlaceholder';
import { PeriodLeaf, type PeriodLeafRole } from '@/components/calendar/PeriodLeaf';
import { GhostButton } from '@/components/ui/Button';
import {
  buildPeriodWindow,
  drumCoastPlan,
  drumFollowFrame,
  drumNearestSteps,
  drumRingSlot,
  drumSnapSteps,
  drumSlotNorm,
  periodIndex,
  shiftPeriodAnchor,
  shouldIgnoreSpringRest,
  type PeriodKind,
  type PeriodTileModel,
} from '@/lib/calendar/periodPager';
import { CAL_P6_1A_FULL_BAND, CAL_P6_1A_ON_DRUM_CARVE_PX } from '@/lib/calendar/p6Laws';
import {
  WHEEL_FLING_DECEL,
  WHEEL_HERO_HEIGHT,
  WHEEL_HERO_WIDTH,
  WHEEL_MAX_FLING_SLOTS,
  WHEEL_MIN_HIT_PX,
  WHEEL_PERSPECTIVE,
  WHEEL_PERSPECTIVE_ORIGIN,
  WHEEL_REANIMATED_SPRING,
  WHEEL_SLOT_OFFSETS,
  WHEEL_STAGE_HEIGHT,
  slotIndexForOffset,
  stableSlotHostKey,
  wheelContentModeFor,
  wheelRowLayout,
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

type SlotHitProps = {
  accessibilityLabel: string;
  onPress: () => void;
};

type SlotMotionProps = {
  /** Absolute period index of the value this host shows (CAL-DRUM-TRACK). */
  index: number;
  pitch: number;
  dragShared: SharedValue<number>;
  /** Absolute period index at stage center while dragShared is 0. */
  centerShared: SharedValue<number>;
  reduceMotion: boolean;
  hit: SlotHitProps;
  children: ReactNode;
};

/**
 * One drum card. Position comes only from its own absolute index and the
 * UI-thread drum position, so the value it shows moves with it — the window
 * re-render never yanks a card back or relabels the one under the finger.
 */
function NativeSlotMotion({
  index,
  pitch,
  dragShared,
  centerShared,
  reduceMotion,
  hit,
  children,
}: SlotMotionProps) {
  // Outer: translateX + opacity only — hit targets stay unscaled (CAL-3DW-08).
  const outerStyle = useAnimatedStyle(() => {
    'worklet';
    const totalDrag = dragShared.value;
    const dragPx = totalDrag;
    const P = pitch > 0 ? pitch : 1;
    const d = drumSlotNorm(index, centerShared.value, dragPx, P);
    const a = Math.abs(d);
    // Hosts the window has not rebound yet sit off-stage — hide, never mislabel.
    const opacity = a > 4.5 ? 0 : Math.min(1, Math.max(0.22, 1 - 0.24 * a - 0.03 * d * d));
    return {
      opacity,
      zIndex: 100 - Math.round(a * 10),
      transform: [{ translateX: d * P }],
    };
  }, [index, pitch]);

  // Inner visual: scale (+ rotateY unless RM). Perspective lives on host (CAL-3DW perspective-origin).
  const innerStyle = useAnimatedStyle(() => {
    'worklet';
    const P = pitch > 0 ? pitch : 1;
    const d = drumSlotNorm(index, centerShared.value, dragShared.value, P);
    const a = Math.abs(d);
    const scale = Math.min(1, Math.max(0.46, 1 - 0.22 * a - 0.02 * d * d));
    if (reduceMotion) {
      return { transform: [{ scale }] };
    }
    const c = d < -3 ? -3 : d > 3 ? 3 : d;
    const rotateYDeg = c === 0 ? 0 : c * -14;
    return {
      transform: [{ rotateY: `${rotateYDeg}deg` }, { scale }],
    };
  }, [index, pitch, reduceMotion]);

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

const TILE_CACHE_MAX = 96;

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
  /** Absolute index centered at pan grant / tap — ±3 clear window origin. */
  const [flingOriginIndex, setFlingOriginIndex] = useState<number | null>(null);
  const pitch = ROW.pitch;

  /** Absolute period index of the parent anchor. */
  const anchorIndex = useMemo(() => periodIndex(kind, anchor, dayCount), [kind, anchor, dayCount]);
  const anchorIndexRef = useRef(anchorIndex);
  anchorIndexRef.current = anchorIndex;

  /**
   * Absolute index nearest the stage center (UI thread → JS). The JS window only
   * picks which 7 values are mounted around it; it never positions a card.
   */
  const [windowCenter, setWindowCenter] = useState(anchorIndex);
  const windowCenterRef = useRef(anchorIndex);
  const frameKey = `${kind}:${dayCount}:${anchorIndex}`;
  const [seenFrameKey, setSeenFrameKey] = useState(frameKey);
  if (seenFrameKey !== frameKey) {
    // Parent anchor moved (our commit, Today, list report): recentre in this render.
    setSeenFrameKey(frameKey);
    // CAL-LIST-DRIVES-DRUM: a list top-day report trails the UI-thread center by
    // under a day; keep the window the list already drove there (no relabel).
    const listReport =
      followPosition != null && Math.abs(anchorIndex - windowCenterRef.current) <= 1;
    if (!listReport) {
      windowCenterRef.current = anchorIndex;
      setWindowCenter(anchorIndex);
    }
  }
  const updateWindowCenter = useCallback((center: number) => {
    if (windowCenterRef.current === center) return;
    windowCenterRef.current = center;
    setWindowCenter(center);
  }, []);

  /** Drag px SharedValue — native + web Reanimated (CAL-DRUM P0 N5/N6). */
  const dragShared = useSharedValue(0);
  /**
   * Absolute period index at stage center while dragShared is 0 (day kind =
   * day number, so CAL-DRUM-FOLLOW / CAL-LIST-FOLLOW positions line up).
   * Visual center = anchorPosShared - dragShared / pitch.
   */
  const anchorPosShared = useSharedValue(anchorIndex);
  // followBlock 2 = drum pan/snap owns dragShared; 1 = wait until list is
  // within half a day of the anchor (after a jump); 0 = follow the list.
  const followBlockShared = useSharedValue(0);
  /** Drag at pan grant (UI thread) — move adds translationX (t_72512eeb). */
  const grantDragShared = useSharedValue(0);
  /** 1 while a finger owns the drum (UI thread). */
  const panLiveShared = useSharedValue(0);
  /** Bumped (UI thread) on each snap start / grab / parent jump so stale rests no-op. */
  const snapGenerationShared = useSharedValue(0);
  /** 1 while a programmed snap/coast runs (UI thread). */
  const inFlightShared = useSharedValue(0);
  /** 1 when the current finger caught a moving drum (micro-move release settles). */
  const grabbedInFlightShared = useSharedValue(0);
  /** Latest onShift without re-binding gesture worklets on every parent render. */
  const onShiftRef = useRef(onShift);
  onShiftRef.current = onShift;
  const panningRef = useRef(false);
  /**
   * Last pan touch (ms). The pan owns taps (onPanTap); on web the card's Pressable
   * also fires on mouse-up — and since cards now ride the finger, the press is
   * never cancelled, so it would re-target the snap. Presses inside a pan no-op.
   */
  const panTouchAtRef = useRef(0);
  /** Stage width for start-claim micro-tap slot pick (CAL-P6-1A). */
  const stageWidthRef = useRef(390);

  // Same value → same tile object, so memo'd leaves skip re-render on rebound.
  const tileCacheRef = useRef(new Map<string, PeriodTileModel>());
  const window = useMemo(() => {
    const built = buildPeriodWindow({
      kind,
      anchor: shiftPeriodAnchor(kind, anchor, windowCenter - anchorIndex, dayCount),
      dayCount,
    });
    const cache = tileCacheRef.current;
    const slots = built.slots.map((tile) => {
      const cacheKey = `${kind}:${dayCount}:${tile.anchor}`;
      const hit = cache.get(cacheKey);
      if (hit) return hit;
      cache.set(cacheKey, tile);
      if (cache.size > TILE_CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      return tile;
    });
    return { ...built, slots, current: slots[slotIndexForOffset(0)] ?? built.current };
  }, [kind, anchor, anchorIndex, dayCount, windowCenter]);

  // Parent anchor commit: rebase the UI frame in one UI step (no jump, no relabel).
  useLayoutEffect(() => {
    if (!panningRef.current) {
      setShowCenterExtras(true);
      setFlinging(false);
      setFlingOriginIndex(null);
    }
    const P = pitch;
    const follow = followPosition;
    runOnUI((pos: number) => {
      'worklet';
      if (panLiveShared.value === 1) {
        // Finger on the drum: keep the card under it — shift the frame only.
        const shift = (pos - anchorPosShared.value) * P;
        anchorPosShared.value = pos;
        dragShared.value = dragShared.value + shift;
        grantDragShared.value = grantDragShared.value + shift;
        return;
      }
      if (follow && followBlockShared.value === 0 && inFlightShared.value === 0) {
        // CAL-LIST-DRIVES-DRUM: the list owns the drum. A top-day report (JS, may
        // trail a fast flick) must not move it; re-derive the frame from the list.
        const frame = drumFollowFrame(follow.value, P);
        if (frame.length === 2) {
          anchorPosShared.value = frame[0]!;
          dragShared.value = frame[1]!;
        }
        runOnJS(updateWindowCenter)(Math.round(anchorPosShared.value - dragShared.value / P));
        return;
      }
      cancelAnimation(dragShared);
      snapGenerationShared.value += 1;
      inFlightShared.value = 0;
      anchorPosShared.value = pos;
      dragShared.value = 0;
      if (followBlockShared.value !== 0) followBlockShared.value = 1;
      runOnJS(updateWindowCenter)(Math.round(anchorPosShared.value - dragShared.value / P));
    })(anchorIndex);
  }, [
    anchorIndex,
    kind,
    dayCount,
    pitch,
    followPosition,
    dragShared,
    anchorPosShared,
    followBlockShared,
    grantDragShared,
    inFlightShared,
    panLiveShared,
    snapGenerationShared,
    updateWindowCenter,
  ]);

  // Window rebound: which values are mounted follows the UI-thread center.
  useAnimatedReaction(
    () => Math.round(anchorPosShared.value - dragShared.value / pitch),
    (center, prev) => {
      'worklet';
      if (center !== prev) {
        runOnJS(updateWindowCenter)(center);
      }
    },
    [pitch, updateWindowCenter],
  );

  // CAL-DRUM-FOLLOW / CAL-LIST-DRIVES-DRUM: the Day List scroll drives the drum on
  // the UI thread. followPosition = fractional day (interpolated between day-section
  // header offsets); each frame rebases anchorPos to the nearest day and puts the
  // remainder in drag, so every card slides with the list and keeps its value.
  // Feedback guard: block 2 = drum drives the list (drivePosition) — ignore follow;
  // the list in turn writes follow only while drivePosition is NaN.
  useAnimatedReaction(
    () => {
      if (!followPosition) return null;
      return [followPosition.value, followBlockShared.value];
    },
    (next) => {
      'worklet';
      if (next == null) return;
      const pos = next[0];
      const block = next[1];
      if (block === 2 || panLiveShared.value === 1 || inFlightShared.value === 1) return;
      if (block === 1) {
        // Drum just committed a day: wait until the list has landed on it.
        if (!(Math.abs(pos - anchorPosShared.value) < 0.5)) return;
        followBlockShared.value = 0;
      }
      const frame = drumFollowFrame(pos, pitch);
      if (frame.length !== 2) return;
      anchorPosShared.value = frame[0]!;
      dragShared.value = frame[1]!;
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

  // CAL-DRUM-PH: drum speed → placeholder / center-first focus (UI thread).
  const placeholderDriver = useDrumPlaceholderDriver({
    anchorPos: anchorPosShared,
    drag: dragShared,
    pitch,
    reduceMotion,
  });

  const onFail = useCallback(() => setFailed(true), []);

  // Failed leaf → FallbackToolbar (no drum). Drop any held stack-gesture gate.
  useEffect(() => {
    if (failed) releaseStackGestures();
  }, [failed, releaseStackGestures]);

  const onSpringRest = useCallback(
    (springGeneration: number, restIndex: number) => {
      // Generation mismatch → snap superseded by a grab / parent jump; no-op.
      // Self-healing: the next rest commits restIndex − anchor, whatever was skipped.
      if (
        shouldIgnoreSpringRest({
          activeGeneration: snapGenerationShared.value,
          callbackGeneration: springGeneration,
        })
      ) {
        return;
      }
      setShowCenterExtras(true);
      setFlinging(false);
      setFlingOriginIndex(null);
      // CAL-P6-1A-07: period commits on snap complete only — the value that landed.
      const commit = restIndex - anchorIndexRef.current;
      if (commit === 0) {
        followBlockShared.value = 0;
        return;
      }
      followBlockShared.value = 1;
      onShiftRef.current(commit);
    },
    [followBlockShared, snapGenerationShared],
  );

  /**
   * UI-thread snap / coast to `targetSteps` slots from the drag-zero frame
   * (toValue −steps·P). coastMs > 0 → momentum coast (quad ease-out whose opening
   * speed is the release speed); else spring. Rest folds the landed drag into
   * anchorPosShared in the same UI step (no jump, no relabel), then commits.
   */
  const animateSnap = useCallback(
    (targetSteps: number, velocityX: number, coastMs: number) => {
      'worklet';
      followBlockShared.value = 2;
      inFlightShared.value = 1;
      snapGenerationShared.value += 1;
      const springGeneration = snapGenerationShared.value;
      const P = pitch;
      const toValue = targetSteps === 0 ? 0 : -targetSteps * P;
      const onDone = (finished?: boolean) => {
        'worklet';
        if (!finished) return;
        const restIndex = Math.round(anchorPosShared.value - dragShared.value / P);
        anchorPosShared.value = restIndex;
        dragShared.value = 0;
        inFlightShared.value = 0;
        runOnJS(onSpringRest)(springGeneration, restIndex);
      };
      dragShared.value =
        coastMs > 0
          ? withTiming(toValue, { duration: coastMs, easing: Easing.out(Easing.quad) }, onDone)
          : withSpring(
              toValue,
              {
                damping: WHEEL_REANIMATED_SPRING.damping,
                stiffness: WHEEL_REANIMATED_SPRING.stiffness,
                mass: WHEEL_REANIMATED_SPRING.mass,
                // RNGH velocityX is already px/s.
                velocity: velocityX,
              },
              onDone,
            );
    },
    [anchorPosShared, dragShared, followBlockShared, inFlightShared, onSpringRest, pitch, snapGenerationShared],
  );

  const tapSide = useCallback(
    (steps: number) => {
      if (steps === 0) return;
      // Steps from the card nearest center now (drum may be follow-parked mid-turn).
      const base = drumNearestSteps(dragShared.value, pitch);
      setFlinging(true);
      setFlingOriginIndex(windowCenterRef.current);
      setShowCenterExtras(false);
      // px/s nudge so the spring heads toward the tapped neighbor.
      runOnUI(animateSnap)(base + steps, steps > 0 ? -1400 : 1400, 0);
    },
    [animateSnap, dragShared, pitch],
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

  /** JS side of pan grant — the UI worklet already grabbed the drum where it is. */
  const onPanBegin = useCallback(() => {
    panningRef.current = true;
    panTouchAtRef.current = Date.now();
    // CAL-P6-9A: disable interactive pop for the drum gesture lifetime.
    holdStackGestures();
    setShowCenterExtras(false);
    setFlinging(true);
    setFlingOriginIndex(windowCenterRef.current);
  }, [holdStackGestures]);

  /** JS side of finger-up — the coast already started on the UI thread. */
  const onPanRelease = useCallback(() => {
    panningRef.current = false;
    panTouchAtRef.current = Date.now();
    // Finger up — restore stack pop (coast may continue; pop only races while down).
    releaseStackGestures();
  }, [releaseStackGestures]);

  /** Micro-move after start-claim → tile tap (Pressable blocked by 1A start claim). */
  const onPanTap = useCallback(
    (stageX: number) => {
      onPanRelease();
      setFlinging(false);
      setShowCenterExtras(true);
      setFlingOriginIndex(null);
      // Tap: release the pan block; a side tap re-blocks via animateSnap.
      followBlockShared.value = 1;
      tapAtStageX(stageX);
    },
    [followBlockShared, onPanRelease, tapAtStageX],
  );

  // CAL-P6-1A-01: full-band start claim (LTR+RTL) so leftmost drum pixels page, not iOS pop.
  // manualActivation + onTouchesDown activate — Move-claim alone loses the left-edge race (t_80d16cbc).
  // CAL-DRUM-TRACK: begin/update/end run on the UI thread — the drum tracks the finger
  // 1:1 and the fling coasts with no JS round trip, even while the Day List is busy.
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
          // Grab the drum where it is (mid-coast, or parked mid-turn by the list).
          cancelAnimation(dragShared);
          grantDragShared.value = dragShared.value;
          grabbedInFlightShared.value = inFlightShared.value;
          inFlightShared.value = 0;
          // Any rest still queued for JS belongs to the snap we just caught.
          snapGenerationShared.value += 1;
          panLiveShared.value = 1;
          followBlockShared.value = 2;
          runOnJS(onPanBegin)();
        })
        .onUpdate((e) => {
          'worklet';
          if (panLiveShared.value !== 1) return;
          // SharedValue on the UI thread only — no JS hop per frame (CAL-DRUM P0 N5).
          dragShared.value = grantDragShared.value + e.translationX;
        })
        .onEnd((e, success) => {
          'worklet';
          panLiveShared.value = 0;
          const releaseDragPx = grantDragShared.value + e.translationX;
          dragShared.value = releaseDragPx;
          if (!success) {
            animateSnap(drumNearestSteps(releaseDragPx, pitch), 0, 0);
            runOnJS(onPanRelease)();
            return;
          }
          if (Math.abs(e.translationX) < 8 && Math.abs(e.translationY) < 8) {
            if (grabbedInFlightShared.value === 1) {
              // Caught a spinning drum: settle on the nearest card, don't page.
              animateSnap(drumNearestSteps(releaseDragPx, pitch), 0, 0);
              runOnJS(onPanRelease)();
              return;
            }
            runOnJS(onPanTap)(e.x);
            return;
          }
          // Fling coasts with momentum; slow release springs (snapPeriodPage law).
          const steps = drumSnapSteps(
            releaseDragPx,
            pitch,
            e.velocityX,
            0.28,
            600,
            WHEEL_MAX_FLING_SLOTS,
            WHEEL_FLING_DECEL,
          );
          const plan = drumCoastPlan({ releaseDragPx, velocityX: e.velocityX, pitch, steps });
          animateSnap(steps, e.velocityX, plan.mode === 'coast' ? plan.durationMs : 0);
          runOnJS(onPanRelease)();
        })
        .onFinalize(() => {
          'worklet';
          if (panLiveShared.value === 1) {
            // Cancelled before onEnd — settle instead of leaving the drum mid-turn.
            panLiveShared.value = 0;
            animateSnap(drumNearestSteps(dragShared.value, pitch), 0, 0);
            runOnJS(onPanRelease)();
          }
          // Belt-and-suspenders: gate release if end skipped (rare cancel paths).
          runOnJS(releaseStackGestures)();
        }),
    [
      animateSnap,
      dragShared,
      failed,
      followBlockShared,
      grabbedInFlightShared,
      grantDragShared,
      inFlightShared,
      onPanBegin,
      onPanRelease,
      onPanTap,
      panLiveShared,
      pitch,
      releaseStackGestures,
      snapGenerationShared,
    ],
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
      height: ROW.stageHeight,
      backgroundColor: colors.elevated,
      borderColor: colors.line,
    },
  ];

  const renderSlot = (parked: number) => {
    const slotIndex = slotIndexForOffset(parked);
    const tile = window.slots[slotIndex];
    if (!tile) return null;
    /** Absolute index of this value — the card's position comes from it alone. */
    const index = windowCenter + parked;
    /** Ring host: this value keeps the same card while it stays mounted. */
    const ringSlot = drumRingSlot(index);
    const role = roleForOffset(parked);
    const isCenter = parked === 0;
    const distanceFromOrigin =
      flinging && flingOriginIndex != null ? index - flingOriginIndex : 0;
    const contentMode = wheelContentModeFor({
      parkedOffset: parked,
      flinging,
      distanceFromOrigin,
      // CAL-DRUM-PH: the speed-driven placeholder card replaces the old fling dim,
      // so every card stays full while flinging (rest policy still dims far cards).
      clearRadius: Number.POSITIVE_INFINITY,
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
      // VoiceOver / keyboard activation only — touches go through the pan (onPanTap).
      onPress: () => {
        if (panningRef.current || Date.now() - panTouchAtRef.current < 600) return;
        if (isCenter) onJumpToday();
        else tapSide(parked);
      },
    };
    const leaf = (
      <DrumFocusProvider driver={placeholderDriver} index={index}>
        <PeriodLeaf
          tile={tile}
          role={role}
          showCenterExtras={isCenter && showCenterExtras}
          motionCompact={flinging || !showCenterExtras}
          contentMode={contentMode}
          width={WHEEL_HERO_WIDTH}
        />
      </DrumFocusProvider>
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
    // Stable ring host key — never remount mid-fling; a value never hops hosts.
    const hostKey = stableSlotHostKey(ringSlot);
    return {
      ringSlot,
      node: (
        <NativeSlotMotion
          key={hostKey}
          index={index}
          pitch={pitch}
          dragShared={dragShared}
          centerShared={anchorPosShared}
          reduceMotion={reduceMotion}
          hit={hit}
        >
          {visual}
        </NativeSlotMotion>
      ),
    };
  };

  // Children in ring order so hosts never reorder as the window rebounds.
  const hosts: ReactNode[] = new Array(WHEEL_SLOT_OFFSETS.length).fill(null);
  for (const parked of WHEEL_SLOT_OFFSETS) {
    const slot = renderSlot(parked);
    if (slot) hosts[slot.ringSlot] = slot.node;
  }

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
          <View style={[styles.track, { height: ROW.stageHeight }]}>{hosts}</View>
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
