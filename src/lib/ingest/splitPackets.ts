/**
 * Pure Split Review (SR-A) packet edits. Confirm ≠ Approve; no student_id.
 */

export type SplitPacketDraft = {
  id: string;
  ordinal: number;
  page_ids: string[];
  blank: boolean;
};

export type SplitFocus = {
  packetIndex: number;
  /** Index within the focused packet's page_ids. */
  pageIndex: number;
};

/** Non-blank packets with at least one page — Confirm eligibility. */
export function eligiblePacketCount(packets: SplitPacketDraft[]): number {
  return packets.filter((p) => !p.blank && p.page_ids.length > 0).length;
}

export function canConfirmSplit(input: {
  packets: SplitPacketDraft[];
  busy?: boolean;
  versionConflict?: boolean;
}): boolean {
  if (input.busy || input.versionConflict) return false;
  return eligiblePacketCount(input.packets) > 0;
}

export function renumberPackets(packets: SplitPacketDraft[]): SplitPacketDraft[] {
  return packets.map((p, i) => ({ ...p, ordinal: i + 1 }));
}

/** S — split focused packet so the focused page starts a new packet. */
export function splitAtFocus(
  packets: SplitPacketDraft[],
  focus: SplitFocus,
  newPacketId: string,
): SplitPacketDraft[] {
  const pkt = packets[focus.packetIndex];
  if (!pkt) return packets;
  if (focus.pageIndex <= 0 || focus.pageIndex >= pkt.page_ids.length) return packets;

  const leftIds = pkt.page_ids.slice(0, focus.pageIndex);
  const rightIds = pkt.page_ids.slice(focus.pageIndex);
  const left: SplitPacketDraft = { ...pkt, page_ids: leftIds, blank: false };
  const right: SplitPacketDraft = {
    id: newPacketId,
    ordinal: pkt.ordinal + 1,
    page_ids: rightIds,
    blank: false,
  };
  const next = [
    ...packets.slice(0, focus.packetIndex),
    left,
    right,
    ...packets.slice(focus.packetIndex + 1),
  ];
  return renumberPackets(next);
}

/** M — merge focused packet into the previous packet (pages append). */
export function mergeWithPrevious(
  packets: SplitPacketDraft[],
  packetIndex: number,
): SplitPacketDraft[] {
  if (packetIndex <= 0 || packetIndex >= packets.length) return packets;
  const prev = packets[packetIndex - 1]!;
  const cur = packets[packetIndex]!;
  const merged: SplitPacketDraft = {
    ...prev,
    page_ids: [...prev.page_ids, ...cur.page_ids],
    blank: false,
  };
  const next = [
    ...packets.slice(0, packetIndex - 1),
    merged,
    ...packets.slice(packetIndex + 1),
  ];
  return renumberPackets(next);
}

/** B — toggle blank on the focused packet. */
export function togglePacketBlank(
  packets: SplitPacketDraft[],
  packetIndex: number,
): SplitPacketDraft[] {
  if (packetIndex < 0 || packetIndex >= packets.length) return packets;
  return packets.map((p, i) => (i === packetIndex ? { ...p, blank: !p.blank } : p));
}

export function movePacket(
  packets: SplitPacketDraft[],
  packetIndex: number,
  direction: -1 | 1,
): SplitPacketDraft[] {
  const target = packetIndex + direction;
  if (packetIndex < 0 || packetIndex >= packets.length) return packets;
  if (target < 0 || target >= packets.length) return packets;
  const next = packets.slice();
  const tmp = next[packetIndex]!;
  next[packetIndex] = next[target]!;
  next[target] = tmp;
  return renumberPackets(next);
}

export function packetsForRpc(packets: SplitPacketDraft[]): Array<{
  id: string;
  ordinal: number;
  page_ids: string[];
  blank: boolean;
}> {
  return packets.map((p) => ({
    id: p.id,
    ordinal: p.ordinal,
    page_ids: p.page_ids,
    blank: p.blank,
  }));
}

/** High band so parked ordinals never collide with dense 1..N during live update-only RPC. */
export const INGEST_PACKET_ORDINAL_PARK = 1_000_000;

export type ServerPacketRow = {
  id: string;
  ordinal: number;
  capture_id: string | null;
  status: string;
};

export type SplitPersistInsert = {
  id: string;
  /** Non-colliding ordinal for pre-RPC insert (not the final dense ordinal). */
  tempOrdinal: number;
  page_ids: string[];
  blank: boolean;
};

export type SplitPersistPlan = {
  toInsert: SplitPersistInsert[];
  /** Draft server rows absent locally — delete ONLY after save_ingest_split succeeds. */
  toDeleteAfter: string[];
  /** Prior ordinals for restore if RPC fails after parking. */
  priorOrdinals: Array<{ id: string; ordinal: number }>;
  /** Ids to park (server drafts kept or replaced + new inserts), stable order. */
  parkIds: string[];
  parkBase: number;
  rpcPackets: ReturnType<typeof packetsForRpc>;
};

/**
 * Persist plan for live update-only save_ingest_split:
 * insert (temp ordinals) → park ordinals → RPC → delete removed.
 * Never delete before RPC (Merge must not orphan pages on confirm_conflict).
 */
export function planSaveIngestSplit(
  local: SplitPacketDraft[],
  server: ServerPacketRow[],
): SplitPersistPlan {
  const localIds = new Set(local.map((p) => p.id));
  const serverIds = new Set(server.map((r) => r.id));
  const maxOrdinal = server.reduce((m, r) => Math.max(m, r.ordinal), 0);

  const newcomers = local.filter((p) => !serverIds.has(p.id));
  const toInsert: SplitPersistInsert[] = newcomers.map((p, i) => ({
    id: p.id,
    tempOrdinal: maxOrdinal + 1 + i,
    page_ids: p.page_ids,
    blank: p.blank,
  }));

  const toDeleteAfter = server
    .filter((r) => !localIds.has(r.id) && r.capture_id == null && r.status === 'draft')
    .map((r) => r.id);

  const priorOrdinals = server.map((r) => ({ id: r.id, ordinal: r.ordinal }));

  const keptServerIds = server
    .filter((r) => localIds.has(r.id))
    .map((r) => r.id);
  const parkIds = [...keptServerIds, ...toInsert.map((row) => row.id)];
  // Next free park band: above any leftover park ordinals from a failed restore,
  // and at least one past INGEST_PACKET_ORDINAL_PARK.
  const parkBase = Math.max(maxOrdinal, INGEST_PACKET_ORDINAL_PARK) + 1;

  return {
    toInsert,
    toDeleteAfter,
    priorOrdinals,
    parkIds,
    parkBase,
    rpcPackets: packetsForRpc(local),
  };
}

/** Roster check-off: expected packet count ≈ roster size (pages already chunked by N). */
export function rosterCheckOff(input: {
  eligiblePackets: number;
  rosterCount: number;
  pagesPerStudent: number;
}): { label: string; expected: number; match: boolean } {
  const expected = Math.max(0, input.rosterCount);
  const match = expected === 0 ? input.eligiblePackets > 0 : input.eligiblePackets === expected;
  const label =
    expected > 0
      ? `${input.eligiblePackets} packets · roster ${expected}` +
        (input.pagesPerStudent > 1 ? ` · ${input.pagesPerStudent} pp` : '')
      : `${input.eligiblePackets} packets`;
  return { label, expected, match };
}
