import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  type SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { radius, type } from '@/constants/theme';
import {
  ZOOM_DRILL_SPRING,
  abbreviateDrillLabel,
  type ZoomDrillDirection,
  type ZoomDrillKind,
  type ZoomSourceRect,
} from '@/lib/calendar/zoomDrill';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  kind: ZoomDrillKind;
  direction?: ZoomDrillDirection;
  source: ZoomSourceRect;
  dest: ZoomSourceRect;
  label: string;
  focusIndex?: number;
  onFinished: () => void;
};

type Plate = { x: number; y: number; width: number; height: number };

/**
 * Shared-element canvas drill (Apple Calendar feel):
 * - year-month: focus month + sibling plates share affine scale/translate so the
 *   year canvas expands and neighbors slide out with the scale.
 * - month-week: above / focus / below bands; rising week-body ghost.
 * - week-day: focus day plate + horizontal sibling columns; rising day ghost.
 * - direction `'out'`: same geometry, progress plays 1→0 (child → parent cell).
 *
 * Not a floating title flyer-card.
 */
export function CalendarZoomDrill({
  kind,
  direction = 'in',
  source,
  dest,
  label,
  focusIndex,
  onFinished,
}: Props) {
  const { colors } = useTheme();
  const progress = useSharedValue(direction === 'out' ? 1 : 0);
  const abbr = useMemo(() => abbreviateDrillLabel(label), [label]);
  const focusDest = useMemo(() => focusDestination(kind, dest), [kind, dest]);
  const siblings = useMemo(
    () => estimateSiblings(kind, source, dest),
    [kind, source, dest, focusIndex],
  );

  useEffect(() => {
    const target = direction === 'out' ? 0 : 1;
    progress.value = direction === 'out' ? 1 : 0;
    progress.value = withSpring(target, ZOOM_DRILL_SPRING, (finished) => {
      if (finished) runOnJS(onFinished)();
    });
  }, [progress, onFinished, direction]);

  const focusStyle = useAnimatedStyle(() => {
    const p = progress.value;
    if (kind === 'year-month') {
      return plateStyle(mapPlate(source, source, dest, p));
    }
    // month-week / week-day: shared element docks to top/leading strip.
    return plateStyle(lerpPlate(source, focusDest, p));
  });

  const aboveStyle = useAnimatedStyle(() => {
    const p = progress.value;
    if (kind !== 'month-week') return { opacity: 0 };
    const band = monthAboveBand(source, dest);
    if (!band) return { opacity: 0 };
    const y = band.y - p * (band.height + 24);
    return {
      ...plateStyle({ ...band, y }),
      opacity: 1 - p * 0.85,
    };
  });

  const belowStyle = useAnimatedStyle(() => {
    const p = progress.value;
    if (kind !== 'month-week') return { opacity: 0 };
    const band = monthBelowBand(source, dest);
    if (!band) return { opacity: 0 };
    const y = band.y + p * (band.height + dest.height * 0.35);
    return {
      ...plateStyle({ ...band, y }),
      opacity: 1 - p * 0.85,
    };
  });

  const risingBodyStyle = useAnimatedStyle(() => {
    const p = progress.value;
    if (kind === 'year-month') return { opacity: 0 };
    const topStrip = focusDest.height + (kind === 'week-day' ? 8 : 0);
    const body: Plate = {
      x: dest.x,
      y: dest.y + topStrip,
      width: dest.width,
      height: Math.max(0, dest.height - topStrip),
    };
    const y = body.y + (1 - p) * body.height * 0.45;
    return {
      position: 'absolute' as const,
      left: body.x,
      top: y,
      width: body.width,
      height: body.height,
      opacity: p * 0.92,
    };
  });

  const abbrStyle = useAnimatedStyle(() => ({
    opacity: kind === 'year-month' ? 1 - progress.value : 0,
  }));

  const fullLabelStyle = useAnimatedStyle(() => ({
    opacity: kind === 'year-month' ? progress.value : 1,
  }));

  const weekdayFadeStyle = useAnimatedStyle(() => ({
    opacity: kind === 'year-month' ? Math.max(0, progress.value - 0.45) / 0.55 : 0,
  }));

  const veilStyle = useAnimatedStyle(() => ({
    opacity: progress.value * (kind === 'year-month' ? 0.28 : 0.18),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
      <Reanimated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, veilStyle]}
      />

      {kind !== 'year-month' ? (
        <Reanimated.View
          style={[
            risingBodyStyle,
            {
              backgroundColor: colors.elevated,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: colors.line,
            },
          ]}
        />
      ) : null}

      {kind === 'month-week' ? (
        <>
          <Reanimated.View
            style={[
              aboveStyle,
              {
                backgroundColor: colors.elevated,
                borderRadius: radius.sm,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.line,
              },
            ]}
          />
          <Reanimated.View
            style={[
              belowStyle,
              {
                backgroundColor: colors.elevated,
                borderRadius: radius.sm,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.line,
              },
            ]}
          />
        </>
      ) : null}

      {siblings.map((sib, i) => (
        <SiblingPlate
          key={`sib-${i}`}
          kind={kind}
          plate={sib}
          source={source}
          dest={dest}
          progress={progress}
          elevated={colors.elevated}
          line={colors.line}
        />
      ))}

      <Reanimated.View
        style={[
          focusStyle,
          {
            backgroundColor: colors.elevated,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.line,
            overflow: 'hidden',
            paddingHorizontal: 10,
            paddingTop: 8,
          },
        ]}
      >
        {kind === 'year-month' ? (
          <View>
            <View style={styles.titleRow}>
              <Reanimated.View style={[styles.titleAbs, abbrStyle]}>
                <Text style={[styles.monthAbbr, { color: colors.brand }]} numberOfLines={1}>
                  {abbr}
                </Text>
              </Reanimated.View>
              <Reanimated.View style={[styles.titleAbs, fullLabelStyle]}>
                <Text style={[styles.monthFull, { color: colors.ink }]} numberOfLines={1}>
                  {label}
                </Text>
              </Reanimated.View>
            </View>
            <Reanimated.View style={[styles.weekdayRow, weekdayFadeStyle]}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Text key={`${d}-${i}`} style={[styles.wd, { color: colors.mute }]}>
                  {d}
                </Text>
              ))}
            </Reanimated.View>
            <Reanimated.View style={[styles.dotRow, weekdayFadeStyle]}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View
                  key={`dot-${i}`}
                  style={[
                    styles.dot,
                    { backgroundColor: i % 3 === 0 ? colors.brand : colors.line },
                  ]}
                />
              ))}
            </Reanimated.View>
          </View>
        ) : (
          <Text
            style={[
              kind === 'week-day' ? styles.dayLabel : styles.label,
              { color: kind === 'week-day' ? colors.brand : colors.ink },
            ]}
            numberOfLines={2}
          >
            {label}
          </Text>
        )}
      </Reanimated.View>
    </View>
  );
}

function SiblingPlate({
  kind,
  plate,
  source,
  dest,
  progress,
  elevated,
  line,
}: {
  kind: ZoomDrillKind;
  plate: Plate;
  source: ZoomSourceRect;
  dest: ZoomSourceRect;
  progress: SharedValue<number>;
  elevated: string;
  line: string;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    if (kind === 'year-month') {
      return {
        ...plateStyle(mapPlate(plate, source, dest, p)),
        opacity: 1 - p * 0.15,
      };
    }
    const away = plate.x + plate.width / 2 < source.x + source.width / 2 ? -1 : 1;
    const x = plate.x + away * p * (dest.width * 0.55 + plate.width);
    return {
      ...plateStyle({ ...plate, x }),
      opacity: 1 - p * 0.9,
    };
  });

  return (
    <Reanimated.View
      style={[
        style,
        {
          backgroundColor: elevated,
          borderRadius: radius.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: line,
        },
      ]}
    />
  );
}

function focusDestination(kind: ZoomDrillKind, dest: ZoomSourceRect): Plate {
  if (kind === 'month-week') {
    return {
      x: dest.x,
      y: dest.y,
      width: dest.width,
      height: Math.min(56, Math.max(44, dest.height * 0.12)),
    };
  }
  if (kind === 'week-day') {
    return {
      x: dest.x,
      y: dest.y + 8,
      width: Math.min(72, dest.width * 0.22),
      height: 48,
    };
  }
  return dest;
}

/** Affine map a plate as if the canvas scales/translates source → dest. */
function mapPlate(
  plate: Plate,
  source: ZoomSourceRect,
  dest: ZoomSourceRect,
  p: number,
): Plate {
  const scaleX = source.width > 0 ? dest.width / source.width : 1;
  const scaleY = source.height > 0 ? dest.height / source.height : 1;
  const sx = 1 + (scaleX - 1) * p;
  const sy = 1 + (scaleY - 1) * p;
  const originX = source.x + (dest.x - source.x) * p;
  const originY = source.y + (dest.y - source.y) * p;
  return {
    x: originX + (plate.x - source.x) * sx,
    y: originY + (plate.y - source.y) * sy,
    width: plate.width * sx,
    height: plate.height * sy,
  };
}

function lerpPlate(a: Plate, b: Plate, p: number): Plate {
  return {
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
    width: a.width + (b.width - a.width) * p,
    height: a.height + (b.height - a.height) * p,
  };
}

function plateStyle(plate: Plate) {
  return {
    position: 'absolute' as const,
    left: plate.x,
    top: plate.y,
    width: Math.max(1, plate.width),
    height: Math.max(1, plate.height),
  };
}

function monthAboveBand(source: ZoomSourceRect, dest: ZoomSourceRect): Plate | null {
  const height = source.y - dest.y;
  if (!(height > 8)) return null;
  return { x: dest.x, y: dest.y, width: dest.width, height };
}

function monthBelowBand(source: ZoomSourceRect, dest: ZoomSourceRect): Plate | null {
  const top = source.y + source.height;
  const bottom = dest.y + dest.height;
  const height = bottom - top;
  if (!(height > 8)) return null;
  return { x: dest.x, y: top, width: dest.width, height };
}

function estimateSiblings(
  kind: ZoomDrillKind,
  source: ZoomSourceRect,
  dest: ZoomSourceRect,
): Plate[] {
  if (kind === 'month-week') return [];
  if (kind === 'year-month') {
    const gap = 8;
    const w = source.width;
    const h = source.height;
    const candidates = [
      { x: source.x - w - gap, y: source.y },
      { x: source.x + w + gap, y: source.y },
      { x: source.x - w - gap, y: source.y - h - gap },
      { x: source.x + w + gap, y: source.y - h - gap },
      { x: source.x - w - gap, y: source.y + h + gap },
      { x: source.x + w + gap, y: source.y + h + gap },
      { x: source.x, y: source.y - h - gap },
      { x: source.x, y: source.y + h + gap },
    ];
    const pad = Math.max(dest.width, dest.height);
    return candidates
      .map((c) => ({ x: c.x, y: c.y, width: w, height: h }))
      .filter(
        (c) =>
          c.x + c.width > dest.x - pad &&
          c.x < dest.x + dest.width + pad &&
          c.y + c.height > dest.y - pad &&
          c.y < dest.y + dest.height + pad,
      );
  }
  const colW = Math.max(source.width, 36);
  const cols: Plate[] = [];
  let x = dest.x;
  const maxX = dest.x + dest.width;
  while (x + colW * 0.4 < maxX) {
    const center = x + colW / 2;
    const focusCenter = source.x + source.width / 2;
    if (Math.abs(center - focusCenter) > colW * 0.35) {
      cols.push({ x, y: source.y, width: colW, height: source.height });
    }
    x += colW;
  }
  return cols;
}

const styles = StyleSheet.create({
  titleRow: {
    height: 28,
    marginBottom: 6,
    justifyContent: 'center',
  },
  titleAbs: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  monthAbbr: { ...type.section, fontWeight: '700', fontSize: 13 },
  monthFull: { ...type.title, fontWeight: '700', fontSize: 22 },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  wd: { ...type.meta, fontSize: 11, width: 18, textAlign: 'center' },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginTop: 4,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  label: { ...type.section, fontWeight: '700' },
  dayLabel: { ...type.title, fontSize: 22, fontWeight: '700' },
});
