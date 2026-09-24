import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, {
  type SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  ZOOM_DRILL_SPRING,
  type ZoomDrillDirection,
  type ZoomDrillKind,
  type ZoomSourceRect,
} from '@/lib/calendar/zoomDrill';
import {
  computeDayDockTranslateX,
  computeDrillTransform,
  computeWeekDockTranslateY,
} from '@/lib/calendar/zoomTransform';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  kind: ZoomDrillKind;
  direction?: ZoomDrillDirection;
  /** Host that receives the transform (window coords). */
  host: ZoomSourceRect;
  source: ZoomSourceRect;
  dest: ZoomSourceRect;
  /** Parent-owned progress (0→1 in, 1→0 out) — also drives sibling band fades. */
  progress: SharedValue<number>;
  onFinished: () => void;
  children: ReactNode;
};

/**
 * Live calendar drill (Apple Calendar style).
 * Transforms the REAL calendar host (YearGrid / MonthGrid / TeacherWeekGrid).
 * No blank sibling plates; soft veil only. Real numbers stay visible.
 *
 * Year→Month: affine scale+translate anchored on tapped month card (host TL origin).
 * Month→Week: translateY docks tapped week to body top.
 * Week→Day: translateX docks tapped day to leading edge.
 * direction `'out'`: progress plays 1→0 (expanded → identity).
 */
export function CalendarZoomDrill({
  kind,
  direction = 'in',
  host,
  source,
  dest,
  progress,
  onFinished,
  children,
}: Props) {
  const { colors } = useTheme();
  const hx = useSharedValue(host.x);
  const hy = useSharedValue(host.y);
  const hw = useSharedValue(host.width);
  const hh = useSharedValue(host.height);
  const sx = useSharedValue(source.x);
  const sy = useSharedValue(source.y);
  const sw = useSharedValue(source.width);
  const sh = useSharedValue(source.height);
  const dx = useSharedValue(dest.x);
  const dy = useSharedValue(dest.y);
  const dw = useSharedValue(dest.width);
  const dh = useSharedValue(dest.height);

  useEffect(() => {
    hx.value = host.x;
    hy.value = host.y;
    hw.value = host.width;
    hh.value = host.height;
    sx.value = source.x;
    sy.value = source.y;
    sw.value = source.width;
    sh.value = source.height;
    dx.value = dest.x;
    dy.value = dest.y;
    dw.value = dest.width;
    dh.value = dest.height;
  }, [host, source, dest, hx, hy, hw, hh, sx, sy, sw, sh, dx, dy, dw, dh]);

  useEffect(() => {
    const target = direction === 'out' ? 0 : 1;
    progress.value = direction === 'out' ? 1 : 0;
    progress.value = withSpring(target, ZOOM_DRILL_SPRING, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(onFinished)();
      }
    });
  }, [progress, onFinished, direction]);

  const liveStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const hostR = { x: hx.value, y: hy.value, width: hw.value, height: hh.value };
    const sourceR = { x: sx.value, y: sy.value, width: sw.value, height: sh.value };
    const destR = { x: dx.value, y: dy.value, width: dw.value, height: dh.value };

    if (kind === 'year-month') {
      const t = computeDrillTransform(hostR, sourceR, destR, p);
      return {
        transform: [
          { translateX: t.translateX },
          { translateY: t.translateY },
          { scaleX: t.scaleX },
          { scaleY: t.scaleY },
        ],
      };
    }
    if (kind === 'month-week') {
      const ty = computeWeekDockTranslateY(hostR, sourceR, destR, p);
      return {
        transform: [{ translateY: ty }],
      };
    }
    // week-day
    const tx = computeDayDockTranslateX(hostR, sourceR, destR, p);
    return {
      transform: [{ translateX: tx }],
    };
  });

  const veilStyle = useAnimatedStyle(() => ({
    opacity: progress.value * (kind === 'year-month' ? 0.22 : 0.12),
  }));

  return (
    <View style={styles.wrap} collapsable={false}>
      <Reanimated.View
        collapsable={false}
        style={[styles.live, liveStyle, { transformOrigin: '0% 0%' }]}
      >
        {children}
      </Reanimated.View>
      <Reanimated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, veilStyle]}
        accessibilityElementsHidden
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  live: {
    flexGrow: 1,
  },
});
