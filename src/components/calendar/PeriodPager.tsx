/**
 * Shared 3D horizontal period wheel (drum). Five-slot rest window (center ±2).
 * SoT geometry: perspective 920 · pitch 78 · hero 108×126 · rotateY = clamp(d,-3,3)*-14.
 * Composite: translateX(d*P) · rotateY(ry) · scale(s) (+ opacity).
 * No Z-axis translation in RN style.transform — Fabric processTransform rejects it (even 0).
 * RM: drop rotateY; keep scale, opacity, snap, taps, hierarchy.
 * Fail closed → << label >>. Touch-only.
 * CAL-P6-1A: full-band stage claim (LTR+RTL); commit on snap only; no on-drum carve.
 * CAL-P6-9A: on-drum LTR is period page only — never app-back / route-pop.
 */
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type ViewStyle,
} from 'react-native';

import { PeriodLeaf } from '@/components/calendar/PeriodLeaf';
import { GhostButton } from '@/components/ui/Button';
import {
  buildPeriodWindow,
  type PeriodKind,
  type PeriodTileModel,
} from '@/lib/calendar/periodPager';
import { CAL_P6_1A_FULL_BAND, CAL_P6_1A_ON_DRUM_CARVE_PX } from '@/lib/calendar/p6Laws';
import {
  WHEEL_HERO_HEIGHT,
  WHEEL_HERO_WIDTH,
  WHEEL_MAX_FLING_SLOTS,
  WHEEL_PERSPECTIVE,
  WHEEL_PITCH,
  WHEEL_SLOT_OFFSETS,
  WHEEL_SPRING,
  WHEEL_STAGE_HEIGHT,
  snapPeriodPage,
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

type Props = {
  kind: PeriodKind;
  /** Year number string or ISO anchor. */
  anchor: string;
  dayCount?: MultidayCount;
  /** Signed slot steps (−3…+3). */
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

type SlotRole = 'prev2' | 'prev' | 'current' | 'next' | 'next2';

function roleForOffset(offset: number): SlotRole {
  if (offset === -2) return 'prev2';
  if (offset === -1) return 'prev';
  if (offset === 1) return 'next';
  if (offset === 2) return 'next2';
  return 'current';
}

/** Sample interpolate ranges for a parked slot over dragX ∈ [−3P … +3P]. */
function makeNormSamples(parked: number, pitch: number) {
  const input: number[] = [];
  const scales: number[] = [];
  const opacities: number[] = [];
  const rotateYs: string[] = [];
  const xs: number[] = [];
  for (let steps = -WHEEL_MAX_FLING_SLOTS; steps <= WHEEL_MAX_FLING_SLOTS; steps += 1) {
    const drag = steps * pitch; // dragX sample (content follows finger)
    const d = parked + drag / pitch;
    input.push(drag);
    scales.push(wheelScaleForNorm(d));
    opacities.push(wheelOpacityForNorm(d));
    rotateYs.push(`${wheelRotateYDegForNorm(d)}deg`);
    xs.push(d * pitch);
  }
  return { input, scales, opacities, rotateYs, xs };
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
  const dragX = useRef(new Animated.Value(0)).current;
  const settling = useRef(false);
  const velocityRef = useRef(0);
  const pitch = WHEEL_PITCH;

  const window = useMemo(
    () => buildPeriodWindow({ kind, anchor, dayCount }),
    [kind, anchor, dayCount],
  );

  useEffect(() => {
    dragX.setValue(0);
    setShowCenterExtras(true);
    settling.current = false;
  }, [anchor, kind, dayCount, dragX]);

  const onFail = useCallback(() => setFailed(true), []);

  const finishShift = useCallback(
    (steps: number) => {
      settling.current = true;
      setShowCenterExtras(false);
      onShift(steps);
    },
    [onShift],
  );

  const animateSnap = useCallback(
    (steps: number) => {
      // Bring slot `steps` to center: content follows finger → dragX = -steps * P
      const toValue = steps === 0 ? 0 : -steps * pitch;
      Animated.spring(dragX, {
        toValue,
        useNativeDriver: true,
        friction: WHEEL_SPRING.friction,
        tension: WHEEL_SPRING.tension,
        velocity: velocityRef.current,
      }).start(({ finished }) => {
        if (!finished) return;
        if (steps === 0) {
          setShowCenterExtras(true);
          settling.current = false;
          return;
        }
        dragX.setValue(0);
        finishShift(steps);
      });
    },
    [dragX, finishShift, pitch],
  );

  const tapSide = useCallback(
    (steps: number) => {
      if (settling.current || steps === 0) return;
      if (reduceMotion) {
        onShift(steps);
        return;
      }
      velocityRef.current = steps > 0 ? -1.4 : 1.4;
      animateSnap(steps);
    },
    [animateSnap, onShift, reduceMotion],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        // CAL-P6-1A-01: contact begun inside stage band → horizontal pan pages period.
        // No on-drum left carve (CAL-P6-1A-03 / CAL_P6_1A_ON_DRUM_CARVE_PX = 0).
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
          dragX.stopAnimation();
          velocityRef.current = 0;
        },
        onPanResponderMove: (_e, g) => {
          dragX.setValue(g.dx);
          velocityRef.current = g.vx;
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
    [animateSnap, dragX, failed, pitch, reduceMotion],
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

  if (reduceMotion) {
    return (
      <PeriodLeafBoundary onFail={onFail}>
        <View style={plateStyle}>
          <View style={styles.rmRow}>
            {WHEEL_SLOT_OFFSETS.map((offset) => {
              const idx = offset + 2;
              const tile = window.slots[idx]!;
              const role = roleForOffset(offset);
              const isCenter = offset === 0;
              return (
                <Pressable
                  key={tile.key}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isCenter
                      ? 'Go to today'
                      : offset < 0
                        ? accessibilityPrevLabel
                        : accessibilityNextLabel
                  }
                  onPress={() => (isCenter ? onJumpToday() : tapSide(offset))}
                  style={[
                    styles.rmHit,
                    {
                      opacity: wheelOpacityForNorm(offset),
                      transform: [{ scale: wheelScaleForNorm(offset) }],
                      zIndex: 10 - Math.abs(offset),
                    },
                  ]}
                >
                  <PeriodLeaf
                    tile={tile}
                    role={role}
                    showCenterExtras={isCenter}
                    width={WHEEL_HERO_WIDTH}
                  />
                </Pressable>
              );
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
            const idx = parked + 2;
            const tile: PeriodTileModel = window.slots[idx]!;
            const role = roleForOffset(parked);
            const samples = makeNormSamples(parked, pitch);
            const scale = dragX.interpolate({
              inputRange: samples.input,
              outputRange: samples.scales,
              extrapolate: 'clamp',
            });
            const opacity = dragX.interpolate({
              inputRange: samples.input,
              outputRange: samples.opacities,
              extrapolate: 'clamp',
            });
            const rotateY = dragX.interpolate({
              inputRange: samples.input,
              outputRange: samples.rotateYs,
              extrapolate: 'clamp',
            });
            const translateX = dragX.interpolate({
              inputRange: samples.input,
              outputRange: samples.xs,
              extrapolate: 'clamp',
            });
            const isCenter = parked === 0;
            // Fabric processTransform rejects Z translation (even 0) — keep rotateY/scale/translateX only.
            const tileMotion = {
              opacity,
              zIndex: 100 - Math.abs(parked) * 10,
              transform: [
                { perspective: WHEEL_PERSPECTIVE },
                { translateX },
                { rotateY },
                { scale },
              ],
            } as unknown as ViewStyle;
            return (
              <Animated.View key={tile.key} style={[styles.tileSlot, tileMotion]}>
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
                    width={WHEEL_HERO_WIDTH}
                  />
                </Pressable>
              </Animated.View>
            );
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
