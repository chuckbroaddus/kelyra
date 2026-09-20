/**
 * 3-tile Rolodex period pager. Recycles prev/current/next on settle.
 * RM: tappable prev/next, no zoom anim. Leaf-fail → << label >> fallback.
 * Does not steal iOS edge-back (PERIOD_PAGER_EDGE_GUARD_PX).
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
  rolodexOpacityForOffset,
  rolodexScaleForOffset,
  snapPeriodPage,
  type PeriodKind,
  type PeriodTileModel,
  type PeriodWindow,
} from '@/lib/calendar/periodPager';
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
      // Parent rebuilds window; effect resets dragX + extras.
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
        friction: 9,
        tension: 80,
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
        },
        onPanResponderMove: (_e, g) => {
          dragX.setValue(g.dx);
        },
        onPanResponderRelease: (_e, g) => {
          const dir = snapPeriodPage(g.dx, pageWidthRef.current, g.vx * 1000);
          animateSnap(dir);
        },
        onPanResponderTerminate: () => {
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
            onPress={() => onShift(-1)}
            style={styles.rmSide}
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
            onPress={() => onShift(1)}
            style={styles.rmSide}
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
        accessibilityLabel={`Period pager ${window.current.centerCaption}`}
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
              // Offset of this tile's center from viewport center while parked + during drag.
              const parkedCenter = pageWidth * 1.5; // middle of 3-tile track at translate -pageWidth
              const relative = tileCenter - parkedCenter;
              const scale = dragX.interpolate({
                inputRange: [-pageWidth, 0, pageWidth],
                outputRange: [
                  rolodexScaleForOffset(relative - pageWidth, pageWidth),
                  rolodexScaleForOffset(relative, pageWidth),
                  rolodexScaleForOffset(relative + pageWidth, pageWidth),
                ],
                extrapolate: 'clamp',
              });
              const opacity = dragX.interpolate({
                inputRange: [-pageWidth, 0, pageWidth],
                outputRange: [
                  rolodexOpacityForOffset(relative - pageWidth, pageWidth),
                  rolodexOpacityForOffset(relative, pageWidth),
                  rolodexOpacityForOffset(relative + pageWidth, pageWidth),
                ],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={tile.key}
                  style={[
                    styles.tileSlot,
                    { width: pageWidth, opacity, transform: [{ scale }] },
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
                    <PeriodLeaf
                      tile={tile}
                      role={role}
                      showCenterExtras={false}
                      width={pageWidth}
                    />
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
    height: 88,
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
