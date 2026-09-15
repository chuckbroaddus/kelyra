/**
 * I5: mid-run fail with ≥1 rasterized page → partial (retry remainder).
 * Hard fail with 0 pages → failed (abandon / re-upload).
 */
export function batchFailStatus(pagesDone: number): 'partial' | 'failed' {
  return pagesDone >= 1 ? 'partial' : 'failed';
}

/**
 * Resolve pages_done for failBatch: never wipe known progress with 0 when
 * in-memory, batch.pages_done, or DB rasterized rows say otherwise.
 */
export function resolveFailPagesDone(opts: {
  inMemoryCount: number;
  batchPagesDone?: number | null;
  rasterizedCount: number;
}): number {
  return Math.max(
    opts.inMemoryCount,
    opts.batchPagesDone ?? 0,
    opts.rasterizedCount,
  );
}

/** Packets kept after replaceDraftPackets delete: only capture_id set (minted). */
export function packetsKeptAfterReplaceDelete(
  rows: { ordinal: number; capture_id: string | null; status: string }[],
): { ordinal: number; capture_id: string; status: string }[] {
  return rows
    .filter((r) => r.capture_id != null)
    .map((r) => ({
      ordinal: r.ordinal,
      capture_id: r.capture_id as string,
      status: r.status,
    }));
}

/** True when planned draft ordinals do not collide with kept (minted) ordinals. */
export function draftOrdinalsConflict(
  keptOrdinals: number[],
  plannedOrdinals: number[],
): boolean {
  const used = new Set(keptOrdinals);
  for (const o of plannedOrdinals) {
    if (used.has(o)) return true;
    used.add(o);
  }
  return false;
}

/** Draft packets to insert after minted ones: skip covered pages; ordinals after max minted. */
export function planDraftPacketsAfterMinted(
  packets: { ordinal: number; pageIds: string[]; blank: boolean }[],
  minted: { ordinal: number; pageIds: string[] }[],
): { ordinal: number; pageIds: string[]; blank: boolean }[] {
  const covered = new Set<string>();
  let maxOrdinal = 0;
  for (const m of minted) {
    maxOrdinal = Math.max(maxOrdinal, m.ordinal);
    for (const id of m.pageIds) covered.add(id);
  }
  const out: { ordinal: number; pageIds: string[]; blank: boolean }[] = [];
  for (const p of packets) {
    const pageIds = p.pageIds.filter((id) => !covered.has(id));
    if (pageIds.length === 0) continue;
    out.push({
      ordinal: maxOrdinal + out.length + 1,
      pageIds,
      blank: p.blank,
    });
  }
  return out;
}
