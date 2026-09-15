import { buildMonthGrid, partsFromISO, todayISO } from '../date/iso.ts';
import type { CalendarItem } from './types.ts';
import { dayRoleTints } from './timeline.ts';
import type { RoleTintId } from './roleTint.ts';

export type YearMonthCell = {
  day: number;
  iso: string;
  isToday: boolean;
  tints: RoleTintId[];
} | null;

export type YearMonthBlock = {
  year: number;
  monthIndex0: number;
  monthLabel: string;
  weeks: YearMonthCell[][];
};

/** 12 mini-months for a year (Sunday-start grids). */
export function yearMonthBlocks(
  year: number,
  items: CalendarItem[],
  now = new Date(),
  locale?: string,
): YearMonthBlock[] {
  const today = todayISO(now);
  const blocks: YearMonthBlock[] = [];
  for (let m = 0; m < 12; m += 1) {
    const grid = buildMonthGrid(year, m, 0);
    const labelDate = new Date(year, m, 1, 12, 0, 0, 0);
    const monthLabel = labelDate.toLocaleDateString(locale, { month: 'long' });
    const weeks: YearMonthCell[][] = grid.map((row) =>
      row.map((cell) => {
        if (!cell) return null;
        return {
          day: cell.day,
          iso: cell.iso,
          isToday: cell.iso === today,
          tints: dayRoleTints(items, cell.iso, 4),
        };
      }),
    );
    blocks.push({ year, monthIndex0: m, monthLabel, weeks });
  }
  return blocks;
}

export function yearContaining(anchorIso?: string | null, now = new Date()): number {
  if (anchorIso) {
    const parts = partsFromISO(anchorIso);
    if (parts) return parts.year;
  }
  return now.getFullYear();
}

/** Inclusive ISO bounds for listing items across a calendar year. */
export function yearRpcBounds(year: number): { fromIso: string; toIso: string } {
  return {
    fromIso: `${year}-01-01`,
    toIso: `${year}-12-31`,
  };
}
