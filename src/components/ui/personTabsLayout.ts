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
 * `fraction` — legacy half-row cap (default; inbox / Settings / student / diary / people).
 * `visibilityReserve` — hug painted title but reserve collapsed hits so ≥3 tabs
 * stay on-screen (CEO 9); 2-tab rows keep both visible (CEO 7). Opt-in: ClassTabs + DeskSpanTabs.
 */
export type PersonTabLabelPolicy = 'fraction' | 'visibilityReserve';

/** Title slot left after hit padding, row end pad, and the 22 glyph when the row has one. */
export function personTabAvailableTitleWidth(rowWidth: number, glyph = true): number {
  const chrome =
    (glyph ? PERSON_TAB_GLYPH + PERSON_TAB_GAP : 0) + PERSON_TAB_HIT_PAD_X * 2 + PERSON_TAB_ROW_PAD_END;
  return Math.max(0, Math.floor(rowWidth - chrome));
}

/**
 * Max width of the selected title. One tab may use the leftover row after the
 * glyph (or after pad when the row is labels only). Several tabs default to half
 * the row; visibilityReserve opts into CEO hug + min-visible reserve.
 */
export function personTabLabelMax(
  rowWidth: number,
  tabCount: number,
  glyph = true,
  policy: PersonTabLabelPolicy = 'fraction',
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

