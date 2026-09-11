/**
 * Hide-on-scroll brain (§9.2). Pure step so CollapsingPageChrome / tray / Feed dock
 * share one decision path — including collapse-reflow when viewport grows.
 */

export type HideOnScrollState = {
  lastY: number;
  acc: number;
  lastDir: 1 | -1 | 0;
  lastLayoutH: number;
  visible: boolean;
};

export type HideOnScrollInput = {
  y: number;
  maxY: number;
  layoutH: number;
  /** Native scroll velocity.y when present (pt/ms). */
  vy: number;
};

export type HideOnScrollResult = {
  state: HideOnScrollState;
  /** null = keep current visibility */
  show: boolean | null;
};

const TOP = 8;
const HIDE_ACC = 12;
const SHOW_ACC = -8;
const FLICK = 1.2;
const END_SLACK = 16;
/** Near-end suppress only when the list is long enough that maxY−16 is not “everywhere”. */
const END_GUARD_MIN_MAX_Y = 64;
const LAYOUT_GROW = 4;

function nearContentEnd(y: number, maxY: number): boolean {
  return maxY >= END_GUARD_MIN_MAX_Y && y >= maxY - END_SLACK;
}

export function createHideOnScrollState(visible = true): HideOnScrollState {
  return { lastY: 0, acc: 0, lastDir: 0, lastLayoutH: 0, visible };
}

export function stepHideOnScroll(
  prev: HideOnScrollState,
  input: HideOnScrollInput,
): HideOnScrollResult {
  let { lastY, acc, lastDir, lastLayoutH, visible } = prev;
  const { y, maxY, layoutH, vy } = input;

  // Viewport grew (ClassTabs / composer dock / FlushBody gap collapsed). Clamp
  // tracking into the new range so stale lastY cannot poison dy, and so a large
  // y > maxY from reflow is not mistaken for end rubber-band forever.
  if (lastLayoutH > 0 && layoutH > lastLayoutH + LAYOUT_GROW) {
    lastY = Math.min(lastY, maxY);
    acc = 0;
    lastDir = 0;
    lastLayoutH = layoutH;
    if (y > maxY) {
      return { state: { lastY: maxY, acc, lastDir, lastLayoutH, visible }, show: null };
    }
  } else {
    lastLayoutH = layoutH;
  }

  // iOS rubber-band past the end looks like swipe-down; ignore only true end bounce.
  if (y > maxY) {
    return {
      state: { lastY: maxY, acc: 0, lastDir: 0, lastLayoutH, visible },
      show: null,
    };
  }

  if (y < TOP) {
    return {
      state: { lastY: y, acc: 0, lastDir, lastLayoutH, visible: true },
      show: visible ? null : true,
    };
  }

  const dy = y - lastY;
  lastY = y;

  if (vy > FLICK) {
    return {
      state: { lastY, acc: 0, lastDir, lastLayoutH, visible: false },
      show: visible ? false : null,
    };
  }
  if (vy < -FLICK) {
    if (nearContentEnd(y, maxY)) {
      return { state: { lastY, acc: 0, lastDir, lastLayoutH, visible }, show: null };
    }
    return {
      state: { lastY, acc: 0, lastDir, lastLayoutH, visible: true },
      show: visible ? null : true,
    };
  }

  const dir: 1 | -1 | 0 = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  if (dir !== 0 && dir !== lastDir) {
    acc = 0;
    lastDir = dir;
  }
  acc += dy;

  if (acc > HIDE_ACC && visible) {
    return {
      state: { lastY, acc: 0, lastDir, lastLayoutH, visible: false },
      show: false,
    };
  }
  if (acc < SHOW_ACC && !visible) {
    if (nearContentEnd(y, maxY)) {
      return { state: { lastY, acc: 0, lastDir, lastLayoutH, visible }, show: null };
    }
    return {
      state: { lastY, acc: 0, lastDir, lastLayoutH, visible: true },
      show: true,
    };
  }

  return { state: { lastY, acc, lastDir, lastLayoutH, visible }, show: null };
}

/**
 * After collapse reclaims space, fill ScrollViews often sit at y≈0 with chrome
 * hidden and nothing left to scroll. A new drag at the top is the swipe-down
 * restore intent (§9.6) when bounce/overscroll events never fire (web/Android).
 */
export function revealFromTopDrag(visible: boolean, y: number): boolean {
  return !visible && y < TOP;
}
