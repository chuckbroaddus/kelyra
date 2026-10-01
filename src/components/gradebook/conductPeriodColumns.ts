/**
 * Conduct tab period columns (GB UI).
 * Single filter → one column; All → each marking period labeled, never a combined total.
 */
import {
  glyphsForCalendar,
  sixWeeksLabel,
  type GradingCalendar as GlyphCalendar,
} from '../ui/periodGlyphs.ts';
import { GRADE_TERM_FILTERS } from '../../lib/grade/marks.ts';
import type { GradingCalendar } from '../../lib/grade/calendar/types.ts';
import { periodFilterLabel } from './periodScope.ts';

export type ConductPeriodColumn = {
  /** Chip / storage period_key (matches GradeTermTabs value). */
  key: string;
  label: string;
};

const LEGACY_MARKING_KEYS = new Set(['q1', 'q2', 'q3', 'q4']);

function isAllFilter(filterId: string): boolean {
  const key = String(filterId ?? '')
    .trim()
    .toLowerCase();
  return !key || key === 'all';
}

/**
 * Columns to render on the Conduct tab for the current period chip.
 * - One selected period → that period only.
 * - All → every marking period (not semester/year rollups), each labeled.
 */
export function conductPeriodColumns(
  filterId: string,
  calendar: GradingCalendar | GlyphCalendar | null | undefined,
): ConductPeriodColumn[] {
  if (!isAllFilter(filterId)) {
    const key = String(filterId).trim();
    return [{ key, label: periodFilterLabel(key, calendar as GradingCalendar | null | undefined) }];
  }

  if (calendar && Array.isArray(calendar.periods) && calendar.periods.length > 0) {
    const fromGlyphs = glyphsForCalendar(calendar as GlyphCalendar)
      .filter((g) => g.id !== 'all' && g.kind === 'marking_period')
      .map((g) => ({
        key: g.id,
        label: sixWeeksLabel(g.id) ?? g.label,
      }));
    if (fromGlyphs.length > 0) return fromGlyphs;

    // Calendar present but glyphs omitted marking_period kinds (odd custom): use periods table.
    return [...calendar.periods]
      .filter((p) => p.kind === 'marking_period')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => {
        const code = String(p.code ?? '').trim();
        const key = code ? code.toLowerCase() : p.id;
        return {
          key,
          label: sixWeeksLabel(code || key) ?? p.name ?? (code || key),
        };
      });
  }

  // No calendar: legacy quarter chips only (conduct is per marking period).
  return GRADE_TERM_FILTERS.filter((t) => LEGACY_MARKING_KEYS.has(t.key)).map((t) => ({
    key: t.key,
    label: t.label,
  }));
}
