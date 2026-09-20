/**
 * Shared 3D horizontal period wheel (drum). Recycles prev/current/next on settle.
 * rotateY + scale + dim; snap center; tap side → center; momentum + spring.
 * RM: no tilt — keep scale/fade/snap + tappable sides.
 * Touch-only. Leaf-fail → << label >> fallback.
 * Does not steal iOS edge-back (PERIOD_PAGER_EDGE_GUARD_PX).
 * SoT: notes/company/calendar-3d-wheel-*.md (Mac-local at implement; curves in periodWheel.ts).
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
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';

import { PeriodLeaf } from '@/components/calendar/PeriodLeaf';
import { GhostButton } from '@/components/ui/Button';
import {
  PERIOD_PAGER_EDGE_GUARD_PX,
  buildPeriodWindow,
  type PeriodKind,
  type PeriodTileModel,
  type PeriodWindow,
} from '@/lib/calendar/periodPager';
import {
  WHEEL_PERSPECTIVE,
  WHEEL_SPRING,
  snapPeriodPage,
  wheelOpacityForNorm,
  wheelRotateYDegForNorm,
  wheelScaleForNorm,
} from '@/lib/calendar/periodWheel';
import type { MultidayCount } from '@/lib/calendar/multiday';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

type Props = {
  kind: PeriodKind;
  /** Year number string or ISO anchor. */
  anchor: string;
  dayCount?: MultidayCount;
  onShift: (direction: -1 | 1) => void;
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

function tileAt(window: PeriodWindow, role: 'prev' | 'current' | 'next'): PeriodTileModel {
  if (role === 'prev') return window.prev;
  if (role === 'next') return window.next;
  return window.current;
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
  const [pageWidth, setPageWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const [showCenterExtras, setShowCenterExtras] = useState(true);
  const dragX = useRef(new Animated.Value(0)).current;
  const settling = useRef(false);
  const pageWidthRef = useRef(0);
  const velocityRef = useRef(0);

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
    (dir: -1 | 1) => {
      settling.current = true;
      setShowCenterExtras(false);
      onShift(dir);
    },
    [onShift],
  );

  const animateSnap = useCallback(
    (dir: -1 | 0 | 1) => {
      const width = pageWidthRef.current || 1;
      const toValue = dir === 0 ? 0 : dir === 1 ? -width : width;
      Animated.spring(dragX, {
        toValue,
        useNativeDriver: true,
        friction: WHEEL_SPRING.friction,
        tension: WHEEL_SPRING.tension,
        velocity: velocityRef.current,
      }).start(({ finished }) => {
        if (!finished) return;
        if (dir === 0) {
          setShowCenterExtras(true);
          settling.current = false;
          return;
        }
        dragX.setValue(0);
        finishShift(dir);
      });
    },
    [dragX, finishShift],
  );

  const tapSide = useCallback(
    (dir: -1 | 1) => {
      if (settling.current) return;
      if (reduceMotion) {
        onShift(dir);
        return;
      }
      velocityRef.current = dir === 1 ? -1.4 : 1.4;
      animateSnap(dir);
    },
    [animateSnap, onShift, reduceMotion],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (e: GestureResponderEvent, g: PanResponderGestureState) => {
          if (reduceMotion || settling.current || failed) return false;
          if (e.nativeEvent.pageX < PERIOD_PAGER_EDGE_GUARD_PX) return false;
          return Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
        },
        onMoveShouldSetPanResponderCapture: (e, g) => {
          if (reduceMotion || settling.current || failed) return false;
          if (e.nativeEvent.pageX < PERIOD_PAGER_EDGE_GUARD_PX) return false;
          return Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
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
          const dir = snapPeriodPage(g.dx, pageWidthRef.current, g.vx * 1000);
          animateSnap(dir);
        },
        onPanResponderTerminate: () => {
          velocityRef.current = 0;
          animateSnap(0);
        },
      }),
    [animateSnap, dragX, failed, reduceMotion],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w / 3 - pageWidth) > 1) {
      const tile = w / 3;
      pageWidthRef.current = tile;
      setPageWidth(tile);
    }
  };

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

  if (reduceMotion) {
    return (
      <PeriodLeafBoundary onFail={onFail}>
        <View style={styles.toolbar} onLayout={onLayout}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityPrevLabel}
            onPress={() => tapSide(-1)}
            style={[
              styles.rmSide,
              {
                opacity: wheelOpacityForNorm(-1),
                transform: [{ scale: wheelScaleForNorm(-1) }],
              },
            ]}
          >
            <PeriodLeaf
              tile={window.prev}
              role="prev"
              showCenterExtras={false}
              width={pageWidth || 100}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to today"
            onPress={onJumpToday}
            style={styles.rmCenter}
          >
            <PeriodLeaf
              tile={window.current}
              role="current"
              showCenterExtras
              width={pageWidth || 120}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityNextLabel}
            onPress={() => tapSide(1)}
            style={[
              styles.rmSide,
              {
                opacity: wheelOpacityForNorm(1),
                transform: [{ scale: wheelScaleForNorm(1) }],
              },
            ]}
          >
            <PeriodLeaf
              tile={window.next}
              role="next"
              showCenterExtras={false}
              width={pageWidth || 100}
            />
          </Pressable>
        </View>
      </PeriodLeafBoundary>
    );
  }

  const roles = ['prev', 'current', 'next'] as const;
  const baseX = pageWidth > 0 ? -pageWidth : 0;

  return (
    <PeriodLeafBoundary onFail={onFail}>
      <View
        style={styles.viewport}
        onLayout={onLayout}
        accessibilityLabel={`Period wheel ${window.current.centerCaption}`}
        {...pan.panHandlers}
      >
        {pageWidth > 0 ? (
          <Animated.View
            style={[
              styles.track,
              {
                width: pageWidth * 3,
                marginLeft: baseX,
                transform: [{ translateX: dragX }],
              },
            ]}
          >
            {roles.map((role, index) => {
              const tile = tileAt(window, role);
              const tileCenter = index * pageWidth + pageWidth / 2;
              const parkedCenter = pageWidth * 1.5;
              const relative = tileCenter - parkedCenter; // -pageWidth | 0 | +pageWidth
              const norms = [-pageWidth, 0, pageWidth].map((d) => (relative + d) / pageWidth);
              const scale = dragX.interpolate({
                inputRange: [-pageWidth, 0, pageWidth],
                outputRange: norms.map(wheelScaleForNorm),
                extrapolate: 'clamp',
              });
              const opacity = dragX.interpolate({
                inputRange: [-pageWidth, 0, pageWidth],
                outputRange: norms.map(wheelOpacityForNorm),
                extrapolate: 'clamp',
              });
              const rotateY = dragX.interpolate({
                inputRange: [-pageWidth, 0, pageWidth],
                outputRange: norms.map((t) => `${wheelRotateYDegForNorm(t)}deg`),
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={tile.key}
                  style={[
                    styles.tileSlot,
                    {
                      width: pageWidth,
                      opacity,
                      transform: [
                        { perspective: WHEEL_PERSPECTIVE },
                        { rotateY },
                        { scale },
                      ],
                    },
                  ]}
                >
                  {role === 'current' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Go to today"
                      onPress={onJumpToday}
                    >
                      <PeriodLeaf
                        tile={tile}
                        role={role}
                        showCenterExtras={showCenterExtras}
                        width={pageWidth}
                      />
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        role === 'prev' ? accessibilityPrevLabel : accessibilityNextLabel
                      }
                      onPress={() => tapSide(role === 'prev' ? -1 : 1)}
                    >
                      <PeriodLeaf
                        tile={tile}
                        role={role}
                        showCenterExtras={false}
                        width={pageWidth}
                      />
                    </Pressable>
                  )}
                </Animated.View>
              );
            })}
          </Animated.View>
        ) : (
          <View style={styles.toolbar}>
            <PeriodLeaf tile={window.current} role="current" showCenterExtras width={120} />
          </View>
        )}
      </View>
    </PeriodLeafBoundary>
  );
}

const styles = StyleSheet.create({
  viewport: {
    height: 96,
    marginTop: 8,
    marginBottom: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileSlot: {
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
  rmSide: {
    flex: 1,
    alignItems: 'center',
  },
  rmCenter: {
    flex: 1.2,
    alignItems: 'center',
  },
});
