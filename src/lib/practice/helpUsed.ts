/** GAUTH G5: Help-used counts — transparency meta, not keystroke surveillance. */

export type HelpUsedActionCounts = Partial<
  Record<'hint' | 'next_step' | 'isomorphic' | 'full_item' | 'check_work', number>
>;

/** Per practice item id → action counts. Never stores attempt text. */
export type HelpUsedMap = Record<string, HelpUsedActionCounts>;

export function parseHelpUsed(raw: unknown): HelpUsedMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: HelpUsedMap = {};
  for (const [itemId, counts] of Object.entries(raw as Record<string, unknown>)) {
    if (!itemId || !counts || typeof counts !== 'object' || Array.isArray(counts)) continue;
    const row: HelpUsedActionCounts = {};
    for (const [action, n] of Object.entries(counts as Record<string, unknown>)) {
      const value = typeof n === 'number' ? n : typeof n === 'string' ? Number(n) : NaN;
      if (!Number.isFinite(value) || value <= 0) continue;
      if (
        action === 'hint' ||
        action === 'next_step' ||
        action === 'isomorphic' ||
        action === 'full_item' ||
        action === 'check_work'
      ) {
        row[action] = Math.floor(value);
      }
    }
    if (Object.keys(row).length) out[itemId] = row;
  }
  return out;
}

export function itemHelpTotal(helpUsed: HelpUsedMap | null | undefined, itemId: string): number {
  const row = helpUsed?.[itemId];
  if (!row) return 0;
  return (Object.values(row) as number[]).reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);
}

export function totalHelpUsed(helpUsed: HelpUsedMap | null | undefined): number {
  if (!helpUsed) return 0;
  return Object.keys(helpUsed).reduce((sum, id) => sum + itemHelpTotal(helpUsed, id), 0);
}

/** Teacher row line under a question, e.g. "Help used 3". */
export function formatItemHelpUsed(
  helpUsed: HelpUsedMap | null | undefined,
  itemId: string,
): string | null {
  const n = itemHelpTotal(helpUsed, itemId);
  if (n <= 0) return null;
  return `Help used ${n}`;
}

/**
 * Compact practice-row summary, e.g. "Help used: 3 hints on Q2".
 * Prefers the item with the most hint turns; falls back to total turns.
 */
export function formatHelpUsedRowSummary(
  helpUsed: HelpUsedMap | null | undefined,
  itemIds: string[],
): string | null {
  const map = helpUsed ?? {};
  let bestId = '';
  let bestHints = 0;
  let bestIndex = -1;
  itemIds.forEach((id, index) => {
    const hints = map[id]?.hint ?? 0;
    if (hints > bestHints) {
      bestHints = hints;
      bestId = id;
      bestIndex = index;
    }
  });
  if (bestHints > 0 && bestIndex >= 0) {
    return `Help used: ${bestHints} hint${bestHints === 1 ? '' : 's'} on Q${bestIndex + 1}`;
  }
  const total = totalHelpUsed(map);
  if (total <= 0) return null;
  // Pick first item with any turns for Q# when no hints dominate.
  const firstWith = itemIds.findIndex((id) => itemHelpTotal(map, id) > 0);
  if (firstWith >= 0) {
    const n = itemHelpTotal(map, itemIds[firstWith]!);
    return `Help used: ${n} on Q${firstWith + 1}`;
  }
  return `Help used ${total}`;
}
