/**
 * Horizontal scroll sync for StickyTable (header ↔ body).
 *
 * Root cause of header flicker: a short unlock timer + bidirectional scrollTo
 * let the follower become the driver after lagging programmatic onScroll events,
 * so head and body fought each other (rapid back-and-forth).
 *
 * Rules:
 * - Only the active driver may issue follow scrollTo.
 * - Driver is claimed on begin-drag (or first real move) and held until that
 *   same scroller ends drag/momentum — never unlocked by a short timeout.
 * - Skip no-op / sub-pixel jitter follow calls (scrollTo still ticks native).
 */

export type StickyHDriver = 'none' | 'head' | 'body';

/** Sub-pixel / rubber-band noise that must not reverse-drive the pair. */
export const STICKY_H_SCROLL_EPSILON = 0.5;

export function stickyHScrollCanDrive(driving: StickyHDriver, who: 'head' | 'body'): boolean {
  return driving === 'none' || driving === who;
}

export function stickyHScrollNeedsFollow(
  lastSyncedX: number,
  nextX: number,
  epsilon: number = STICKY_H_SCROLL_EPSILON,
): boolean {
  return Math.abs(nextX - lastSyncedX) > epsilon;
}

export type StickyHScrollDecision =
  | { action: 'ignore' }
  | { action: 'follow'; nextDriving: 'head' | 'body'; nextLastX: number };

/**
 * Pure decision for one horizontal onScroll tick.
 * Caller applies scrollTo only when action === 'follow'.
 */
export function decideStickyHScroll(input: {
  driving: StickyHDriver;
  who: 'head' | 'body';
  x: number;
  lastSyncedX: number;
  epsilon?: number;
}): StickyHScrollDecision {
  if (!stickyHScrollCanDrive(input.driving, input.who)) {
    return { action: 'ignore' };
  }
  if (!stickyHScrollNeedsFollow(input.lastSyncedX, input.x, input.epsilon)) {
    return { action: 'ignore' };
  }
  return { action: 'follow', nextDriving: input.who, nextLastX: input.x };
}

/** Claim driver on finger-down so the peer cannot reverse-drive mid-gesture. */
export function stickyHScrollBeginDrag(
  _driving: StickyHDriver,
  who: 'head' | 'body',
): 'head' | 'body' {
  return who;
}

/** Release only when the active driver finishes; peer end events are no-ops. */
export function stickyHScrollRelease(
  driving: StickyHDriver,
  who: 'head' | 'body',
): StickyHDriver {
  return driving === who ? 'none' : driving;
}
