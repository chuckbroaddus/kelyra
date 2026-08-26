/** 22 glyph (icon or teacher avatar). */
export const PERSON_TAB_GLYPH = 22;
/** Gap between glyph and selected label. */
export const PERSON_TAB_GAP = 8;
export const PERSON_TAB_HIT_PAD_X = 11;
/** End pad on the tab scroller so the pill is not flush to the row edge. */
export const PERSON_TAB_ROW_PAD_END = 8;
/** Several tabs: selected label is at most half the measured row. */
export const PERSON_TAB_MULTI_LABEL_FRACTION = 0.5;

/** Title slot left after hit padding, row end pad, and the 22 glyph when the row has one. */
export function personTabAvailableTitleWidth(rowWidth: number, glyph = true): number {
  const chrome =
    (glyph ? PERSON_TAB_GLYPH + PERSON_TAB_GAP : 0) + PERSON_TAB_HIT_PAD_X * 2 + PERSON_TAB_ROW_PAD_END;
  return Math.max(0, Math.floor(rowWidth - chrome));
}

/**
 * Max width of the selected title. One tab may use the leftover row after the
 * glyph (or after pad when the row is labels only). Several tabs stay at half
 * the row so the other hits still fit.
 */
export function personTabLabelMax(rowWidth: number, tabCount: number, glyph = true): number {
  const available = personTabAvailableTitleWidth(rowWidth, glyph);
  if (tabCount <= 1) return available;
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
