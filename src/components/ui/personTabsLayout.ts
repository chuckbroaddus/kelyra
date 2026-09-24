/** 22 glyph (icon or teacher avatar). */
export const PERSON_TAB_GLYPH = 22;
/** Gap between glyph and selected label. */
export const PERSON_TAB_GAP = 8;
export const PERSON_TAB_HIT_PAD_X = 11;
/** End pad on the tab scroller so the pill is not flush to the row edge. */
export const PERSON_TAB_ROW_PAD_END = 8;
/** Several tabs: selected label is at most half the measured row (default rows). */
export const PERSON_TAB_MULTI_LABEL_FRACTION = 0.5;
/** Collapsed icon-only hit (matches PersonTabs styles.hit minWidth). */
export const PERSON_TAB_ICON_HIT = 44;
/** Gap between pills in the PersonTabs row (styles.row.gap). */
export const PERSON_TAB_ROW_GAP = 4;

/**
 * `visibilityReserve` — **product default** (CEO FoM lock 2026-09-17): hug painted
 * title; marquee ceiling reserves collapsed 44-hits so min(3,n) stay on-screen;
 * 2-tab rows keep both visible. Extra row space shows more tabs.
 * `fraction` — legacy half-row cap (opt-out only; do not use for destination rows).
 */
export type PersonTabLabelPolicy = 'fraction' | 'visibilityReserve';

/**
 * Morph easing pack (PersonTabs). Default `cm-linear` = Easing.linear both ways
 * (FoM CM-Linear lock — every destination row, all hats). Documented opt-out
 * `current` = cubic out grow / cubic in shrink — do not use on destination rows.
 */
export type PersonTabMotionPack = 'current' | 'cm-linear';

/** Resolve expand easing kind for grow (selected) / shrink (!selected). */
export function personTabExpandEasingKind(
  selected: boolean,
  motionPack: PersonTabMotionPack = 'cm-linear',
): 'linear' | 'cubic-out' | 'cubic-in' {
  if (motionPack === 'cm-linear') return 'linear';
  return selected ? 'cubic-out' : 'cubic-in';
}

/** Title slot left after hit padding, row end pad, and the 22 glyph when the row has one. */
export function personTabAvailableTitleWidth(rowWidth: number, glyph = true): number {
  const chrome =
    (glyph ? PERSON_TAB_GLYPH + PERSON_TAB_GAP : 0) + PERSON_TAB_HIT_PAD_X * 2 + PERSON_TAB_ROW_PAD_END;
  return Math.max(0, Math.floor(rowWidth - chrome));
}

/**
 * Max width of the selected title. One tab may use the leftover row after the
 * glyph (or after pad when the row is labels only). Several tabs default to
 * visibilityReserve (FoM hug + ≥3 visible); pass `fraction` only for legacy half-row.
 */
export function personTabLabelMax(
  rowWidth: number,
  tabCount: number,
  glyph = true,
  policy: PersonTabLabelPolicy = 'visibilityReserve',
): number {
  const available = personTabAvailableTitleWidth(rowWidth, glyph);
  if (tabCount <= 1) return available;
  if (policy === 'visibilityReserve') {
    // Keep min(3, tabCount) tabs on-screen without relying on scroll for those.
    const minVisible = Math.min(3, tabCount);
    const others = minVisible - 1;
    const othersWidth = others * PERSON_TAB_ICON_HIT + others * PERSON_TAB_ROW_GAP;
    const selectedChrome =
      PERSON_TAB_HIT_PAD_X * 2 + (glyph ? PERSON_TAB_GLYPH + PERSON_TAB_GAP : 0);
    const maxSelected = Math.max(
      PERSON_TAB_ICON_HIT,
      rowWidth - PERSON_TAB_ROW_PAD_END - othersWidth,
    );
    const labelFromReserve = Math.max(0, Math.floor(maxSelected - selectedChrome));
    return Math.min(available, labelFromReserve);
  }
  return Math.min(available, Math.floor(rowWidth * PERSON_TAB_MULTI_LABEL_FRACTION));
}

/** Title slot is the lesser of the painted title and the max for this row. */
export function personTabTitleSlot(titleWidth: number, labelMax: number): number {
  if (titleWidth <= 0 || labelMax <= 0) return 0;
  return Math.min(titleWidth, labelMax);
}

/**
 * True only when painted title exceeds the marquee ceiling (labelMax).
 * Hug-fit titles (paint ≤ ceiling) must never marquee — occupancy ceiling alone
 * is not overflow. Matches personTabTitleSlot: slot === paint when it fits.
 */
export function personTabTitleNeedsMarquee(titleWidth: number, labelMax: number): boolean {
  if (titleWidth <= 0 || labelMax <= 0) return false;
  return titleWidth > labelMax;
}

export function personTabSelectedMaxWidth(labelMax: number, glyph = true): number {
  return PERSON_TAB_HIT_PAD_X * 2 + (glyph ? PERSON_TAB_GLYPH + PERSON_TAB_GAP : 0) + labelMax;
}

export function personTabRowHasGlyph(tabs: ReadonlyArray<{ icon?: unknown; photoUrl?: string | null; photoName?: string | null }>): boolean {
  return tabs.some((tab) => Boolean(tab.icon || tab.photoUrl || tab.photoName));
}

/** Teacher avatars only when every tab in the row is a class. Feeds, All, People extras use icons. */
export function personTabRowUsesTeacherFaces(kinds: readonly string[]): boolean {
  return kinds.length > 0 && kinds.every((kind) => kind === 'class');
}

/**
 * Stable pill width endpoints for the expand interpolate (collapsed ↔ hugged).
 * Do **not** substitute live onLayout width into this range mid-morph — that
 * jumps the interpolate output and snaps the label shut. First-tab (x=0) morph
 * is especially sensitive because the leading pill reflows every sibling and
 * used to re-trigger scrollTo(0) via contentSize setState.
 */
export function personTabPillWidthRange(
  titleWidth: number,
  labelMax: number,
  glyph = true,
): { collapsed: number; expanded: number; slot: number } {
  const slot = labelMax > 0 ? personTabTitleSlot(titleWidth, labelMax) : 0;
  const collapsed = PERSON_TAB_ICON_HIT;
  const expanded = Math.max(collapsed, personTabSelectedMaxWidth(slot, glyph));
  return { collapsed, expanded, slot };
}

/**
 * Tab width for personTabScrollX at selection time. Prefer the hugged expanded
 * size so scroll targets stay fixed for the morph duration — live onLayout
 * widths grow/shrink every frame and must not re-drive scroll (first-index snap).
 */
export function personTabScrollTabWidth(
  titleWidth: number,
  labelMax: number,
  glyph = true,
  fallbackWidth = PERSON_TAB_ICON_HIT,
): number {
  if (titleWidth > 0 && labelMax > 0) {
    return personTabPillWidthRange(titleWidth, labelMax, glyph).expanded;
  }
  return Math.max(PERSON_TAB_ICON_HIT, fallbackWidth);
}


/**
 * Whether a programmatic scroll is worth issuing. No-op scrollTo (especially
 * scrollTo(0) while already at 0) still ticks UIScrollView on iOS and cancels
 * in-flight JS-driven width morphs on the leading pill.
 */
export function personTabScrollNeeded(
  currentX: number,
  targetX: number,
  epsilon = 1,
): boolean {
  return Math.abs(currentX - targetX) > epsilon;
}

/**
 * Settle delay after an instant scroll before arming leading-pill expand.
 * Enter-0 scroll + concurrent width morph still snaps on Expo Go iOS; wait
 * one frame pair (~32ms) so UIScrollView finishes the jump first.
 */
export const PERSON_TAB_SCROLL_SETTLE_MS = 32;

/**
 * Scroll policy when the leading pill (index 0) is morphing.
 * - `scroll-then-morph`: enter index 0 — instant scroll first (if needed), then
 *   arm width expand after settle. Never concurrent scroll + leading morph.
 * - `defer`: leave index 0 — wait until morph ends before scrolling away.
 * - `animated`: mid-row only; concurrent scroll + width morph is fine.
 */
export function personTabScrollMotion(
  selectedIndex: number,
  prevIndex: number | null,
): 'scroll-then-morph' | 'defer' | 'animated' {
  if (selectedIndex <= 0) return 'scroll-then-morph';
  if (prevIndex === 0) return 'defer';
  return 'animated';
}

/**
 * True when a selection change involves the leading pill (enter or leave index 0).
 * Callers lock UIScrollView for the morph window so contentSize thrash cannot
 * cancel the JS-driven width timing on Expo Go iOS.
 */
export function personTabNeedsLeadingScrollLock(
  selectedIndex: number,
  prevIndex: number | null,
): boolean {
  return selectedIndex <= 0 || prevIndex === 0;
}

/** Lock duration for leading-pill morph (0 when reduce-motion). */
export function personTabLeadingScrollLockMs(
  reduceMotion: boolean,
  morphMs: number,
  settleMs = 0,
): number {
  if (reduceMotion) return 0;
  return Math.max(0, morphMs) + Math.max(0, settleMs);
}

/**
 * Scroll offset so the selected tab sits in a readable middle band — never
 * left-pinned (except tab 0) and never with the selected glyph clipped off the left.
 * 3-tab viewport feel: center selected. 4-tab: direction-aware center pair.
 */
export function personTabScrollX(input: {
  tabX: number;
  tabWidth: number;
  rowWidth: number;
  contentWidth: number;
  selectedIndex: number;
  prevIndex: number | null;
  collapsedWidth?: number;
}): number {
  const {
    tabX,
    tabWidth,
    rowWidth,
    contentWidth,
    selectedIndex,
    prevIndex,
    collapsedWidth = PERSON_TAB_ICON_HIT,
  } = input;
  if (rowWidth <= 0) return 0;
  const maxScroll = Math.max(0, contentWidth - rowWidth);
  if (selectedIndex <= 0) return 0;

  const tabCenter = tabX + tabWidth / 2;
  let ideal = tabCenter - rowWidth / 2;

  // ~how many collapsed hits fit beside a hugged selected in this row
  const neighborRoom = Math.max(0, rowWidth - tabWidth);
  const neighborsFit = Math.floor(neighborRoom / (collapsedWidth + PERSON_TAB_ROW_GAP));
  const movingRight = prevIndex != null && selectedIndex > prevIndex;
  const movingLeft = prevIndex != null && selectedIndex < prevIndex;

  if (neighborsFit >= 3) {
    // 4+ visible: direction-aware — selected is left-center (moved right) or right-center (moved left)
    const pairShift = (collapsedWidth + PERSON_TAB_ROW_GAP) / 2;
    if (movingRight) ideal -= pairShift;
    else if (movingLeft) ideal += pairShift;
  }
  // else 3-visible or fewer: pure center (ideal already)

  // Never clip selected glyph off the left (or right).
  const minX = tabX + tabWidth - rowWidth; // selected right edge at viewport right
  const maxX = tabX; // selected left edge at viewport left
  let x = ideal;
  if (x > maxX) x = maxX;
  if (x < minX) x = minX;
  if (x < 0) x = 0;
  if (x > maxScroll) x = maxScroll;
  return x;
}

