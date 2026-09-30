import type { EngineSyllabus } from './types.ts';

/** Keep ≥4 decimal places of precision for intermediate storage (NFR-01). */
export function storePrecision(n: number): number {
  if (!Number.isFinite(n)) return n;
  // 10 dp keeps fixture equality (1e-9) while still bounding float noise.
  return Math.round(n * 1e10) / 1e10;
}

export function roundPct(
  value: number,
  rounding: EngineSyllabus['rounding'],
  decimals = 0,
): number {
  if (!Number.isFinite(value) || rounding === 'none') return value;
  const places = Math.max(0, decimals);
  const factor = 10 ** places;
  const scaled = value * factor;
  if (rounding === 'truncate') {
    return (scaled < 0 ? Math.ceil(scaled) : Math.floor(scaled)) / factor;
  }
  if (rounding === 'half_up') {
    // half away from zero toward +∞ for positive grades
    const floor = Math.floor(scaled);
    const frac = scaled - floor;
    if (frac >= 0.5) return (floor + 1) / factor;
    return floor / factor;
  }
  // nearest_whole (banker's? no — standard half-up via Math.round for positives)
  return Math.round(scaled) / factor;
}
