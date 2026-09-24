import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { radius, type } from '@/constants/theme';
import {
  ZOOM_DRILL_MS,
  type ZoomDrillKind,
  type ZoomSourceRect,
} from '@/lib/calendar/zoomDrill';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  kind: ZoomDrillKind;
  source: ZoomSourceRect;
  dest: ZoomSourceRect;
  label: string;
  onFinished: () => void;
};

/**
 * CEO 2026-09-24 drill zoom:
 * - year-month: tapped month card expands to fill the calendar body
 * - month-week: week row lifts to the top; remainder slides down/off
 * - week-day: day header slides to the leading edge; other days slide off
 */
export function CalendarZoomDrill({ kind, source, dest, label, onFinished }: Props) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: ZOOM_DRILL_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onFinished)();
      },
    );
  }, [progress, onFinished]);

  const flyerStyle = useAnimatedStyle(() => {
    const p = progress.value;
    if (kind === 'year-month') {
      const x = source.x + (dest.x - source.x) * p;
      const y = source.y + (dest.y - source.y) * p;
      const w = source.width + (dest.width - source.width) * p;
      const h = source.height + (dest.height - source.height) * p;
      return {
        position: 'absolute' as const,
        left: x,
        top: y,
        width: w,
        height: h,
        opacity: 1,
      };
    }
    if (kind === 'month-week') {
      // Week strip → top of dest; keep full dest width.
      const x = dest.x;
      const y = source.y + (dest.y - source.y) * p;
      const w = dest.width;
      const h = source.height + (Math.min(56, dest.height * 0.12) - source.height) * p;
      return {
        position: 'absolute' as const,
        left: x,
        top: y,
        width: w,
        height: Math.max(44, h),
        opacity: 1,
      };
    }
    // week-day: day chip → leading top of dest
    const targetW = Math.min(72, dest.width * 0.22);
    const targetH = 48;
    const x = source.x + (dest.x - source.x) * p;
    const y = source.y + (dest.y + 8 - source.y) * p;
    const w = source.width + (targetW - source.width) * p;
    const h = source.height + (targetH - source.height) * p;
    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      width: w,
      height: h,
      opacity: 1,
    };
  });

  const veilStyle = useAnimatedStyle(() => ({
    opacity: progress.value * (kind === 'year-month' ? 0.55 : 0.35),
  }));

  const exitStyle = useAnimatedStyle(() => {
    const p = progress.value;
    if (kind === 'month-week') {
      return { opacity: 1 - p, transform: [{ translateY: p * 120 }] };
    }
    if (kind === 'week-day') {
      return { opacity: 1 - p, transform: [{ translateX: p * 80 }] };
    }
    return { opacity: 1 - p * 0.85 };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
      <Reanimated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.bg },
          veilStyle,
        ]}
      />
      {/* Ghost of departing surface */}
      <Reanimated.View
        style={[
          {
            position: 'absolute',
            left: source.x,
            top: source.y,
            width: source.width,
            height: kind === 'month-week' ? Math.max(source.height, 200) : source.height,
            backgroundColor: colors.elevated,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.line,
          },
          exitStyle,
        ]}
      />
      <Reanimated.View
        style={[
          flyerStyle,
          {
            backgroundColor: colors.elevated,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.line,
            padding: 12,
            justifyContent: kind === 'year-month' ? 'flex-start' : 'center',
            overflow: 'hidden',
          },
        ]}
      >
        <Text
          style={[
            kind === 'week-day' ? styles.dayLabel : styles.label,
            { color: kind === 'week-day' ? colors.brand : colors.ink },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...type.section, fontWeight: '700' },
  dayLabel: { ...type.title, fontSize: 22, fontWeight: '700' },
});
