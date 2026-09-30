import type { EngineAssignment, ItemBreakdown } from './types.ts';

export type Working = {
  assignment: EngineAssignment;
  earned: number;
  possible: number;
  pct: number;
  droppable: boolean;
  flags: string[];
  extra_credit: boolean;
  role: ItemBreakdown['role'];
  note?: string;
};

export function isNeverDrop(w: Working, neverFlags: string[] | undefined): boolean {
  if (!w.droppable) return true;
  if (!neverFlags?.length) return false;
  return neverFlags.some((f) => (w.flags ?? []).includes(f));
}

export function applyDrops(
  items: Working[],
  cat: {
    drop_lowest?: number;
    drop_highest?: number;
    keep_highest?: number;
    never_drop_flags?: string[];
  },
): Working[] {
  const pool = items.filter((i) => i.role === 'counted' && !i.extra_credit);
  const locked = pool.filter((i) => isNeverDrop(i, cat.never_drop_flags));
  let flexible = pool.filter((i) => !isNeverDrop(i, cat.never_drop_flags));

  const keepH = cat.keep_highest;
  if (keepH != null && keepH > 0 && flexible.length > keepH) {
    flexible.sort((a, b) => b.pct - a.pct);
    for (const d of flexible.slice(keepH)) {
      d.role = 'dropped';
      d.note = 'Dropped (keep-highest)';
    }
    flexible = flexible.slice(0, keepH);
  }

  const dropL = Math.max(0, cat.drop_lowest ?? 0);
  if (dropL > 0 && flexible.length > dropL) {
    flexible.sort((a, b) => a.pct - b.pct);
    for (const d of flexible.slice(0, dropL)) {
      d.role = 'dropped';
      d.note = d.note ?? 'Dropped as lowest';
    }
    flexible = flexible.slice(dropL);
  }

  const dropH = Math.max(0, cat.drop_highest ?? 0);
  if (dropH > 0 && flexible.length > dropH) {
    flexible.sort((a, b) => b.pct - a.pct);
    for (const d of flexible.slice(0, dropH)) {
      d.role = 'dropped';
      d.note = d.note ?? 'Dropped as highest';
    }
    flexible = flexible.slice(dropH);
  }

  const keptIds = new Set([...locked, ...flexible].map((i) => i.assignment.id));
  return items.map((i) => {
    if (i.role !== 'counted' || i.extra_credit) return i;
    if (keptIds.has(i.assignment.id)) return i;
    return { ...i, role: 'dropped' as const, note: i.note ?? 'Dropped' };
  });
}
