/**
 * Live calendar drill zoom math (Apple Calendar style).
 * Transforms are relative to a measured host; progress 0 = identity, 1 = source→dest.
 * `'worklet'` so Reanimated UI-thread styles can call these safely.
 */

export type ZoomRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DrillTransform = {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
};

function clamp01(p: number): number {
  'worklet';
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return p;
}

/**
 * Affine transform so window-space `source` maps onto `dest` as progress goes 0→1.
 * Coordinates are converted to host-local. Progress 0 → identity.
 *
 * Prefer uniform scale from width (`uniform: true`, default) so day digits do not
 * squash. Translate keeps the source top-left interpolating toward dest top-left
 * when the transform is applied with origin at the host top-left.
 *
 * Algebra (uniform): at progress p,
 *   scale = 1 + (Dw/Sw - 1) * p
 *   translateX = (dx - sx * (Dw/Sw)) * p
 * ⇒ source TL x' = sx*scale + translateX = sx + p*(dx - sx)  (linear to dest)
 */
export function computeDrillTransform(
  host: ZoomRect,
  source: ZoomRect,
  dest: ZoomRect,
  progress: number,
  opts?: { uniform?: boolean },
): DrillTransform {
  'worklet';
  const p = clamp01(progress);
  if (p === 0) {
    return { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 };
  }
  const uniform = opts?.uniform !== false;

  const sx = source.x - host.x;
  const sy = source.y - host.y;
  const dx = dest.x - host.x;
  const dy = dest.y - host.y;

  const scaleXT = source.width > 0 ? dest.width / source.width : 1;
  const scaleYT = source.height > 0 ? dest.height / source.height : 1;
  const scaleX = 1 + (scaleXT - 1) * p;
  const scaleY = uniform ? scaleX : 1 + (scaleYT - 1) * p;

  const translateX = (dx - sx * scaleXT) * p;
  const translateY = (dy - sy * (uniform ? scaleXT : scaleYT)) * p;

  return { scaleX, scaleY, translateX, translateY };
}

/** Month→Week: translate so the tapped week row docks to the body top. */
export function computeWeekDockTranslateY(
  host: ZoomRect,
  source: ZoomRect,
  dest: ZoomRect,
  progress: number,
): number {
  'worklet';
  const p = clamp01(progress);
  if (p === 0) return 0;
  const localSy = source.y - host.y;
  const localDy = dest.y - host.y;
  return (localDy - localSy) * p;
}

/** Week→Day: translate so the tapped day column docks to the body leading edge. */
export function computeDayDockTranslateX(
  host: ZoomRect,
  source: ZoomRect,
  dest: ZoomRect,
  progress: number,
): number {
  'worklet';
  const p = clamp01(progress);
  if (p === 0) return 0;
  const localSx = source.x - host.x;
  const localDx = dest.x - host.x;
  return (localDx - localSx) * p;
}

/**
 * Opacity for a non-focus sibling band/column during live drill.
 * Focus stays 1; neighbors fade toward ~0.08 at progress 1.
 */
export function siblingBandOpacity(progress: number, isFocus: boolean): number {
  'worklet';
  if (isFocus) return 1;
  return 1 - clamp01(progress) * 0.92;
}
