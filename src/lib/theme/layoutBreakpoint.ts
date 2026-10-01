import type { LayoutBreakpoint } from './layoutTypes.ts';

/**
 * Phone form factor from the short side so a handset already in landscape still
 * counts as a phone (width alone would treat iPhone landscape as tablet at ≥720).
 * Matches `isNativePhone` shortest-side idea (platform checks stay there).
 */
export function isPhoneFormFactor(width: number, height: number): boolean {
  return Math.min(width, height) < 720;
}

/** Pure breakpoint for tests and `useLayout`. */
export function layoutBreakpoint(width: number, height: number): LayoutBreakpoint {
  if (!isPhoneFormFactor(width, height)) return 'tablet';
  return width >= height ? 'phone-landscape' : 'phone-portrait';
}
