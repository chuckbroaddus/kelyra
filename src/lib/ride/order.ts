/** Pure order helpers for tests (mirror SQL walk > order_fix > graph). */

export type OrderSlot = {
  parentId: string;
  studentIds: string[];
  kind: 'im_first' | 'check_in' | 'staff_place' | 'order_fix' | 'ahead_insert';
  positionXx?: number | null;
  occurredAt: string;
  aheadParentId?: string | null;
};

export function conflictFirst(slots: OrderSlot[]): boolean {
  return slots.filter((s) => s.kind === 'im_first').length > 1;
}

export function rankGraph(slots: OrderSlot[]): OrderSlot[] {
  const byParent = new Map<string, OrderSlot>();
  for (const s of [...slots].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) {
    byParent.set(s.parentId, s);
  }
  const latest = [...byParent.values()];
  return latest.sort((a, b) => {
    const aFirst = a.kind === 'im_first' ? 0 : 1;
    const bFirst = b.kind === 'im_first' ? 0 : 1;
    if (aFirst !== bFirst) return aFirst - bFirst;
    const ap = a.positionXx ?? 999999;
    const bp = b.positionXx ?? 999999;
    if (ap !== bp) return ap - bp;
    return a.occurredAt.localeCompare(b.occurredAt);
  });
}

export function staffWalkOrder(
  walks: Array<{ parentId: string | null; staffSeq: number; studentIds?: string[] }>,
): Array<{ parentId: string | null; staffSeq: number; studentIds: string[] }> {
  return [...walks]
    .filter((w) => w.staffSeq >= 1)
    .sort((a, b) => a.staffSeq - b.staffSeq)
    .map((w) => ({ parentId: w.parentId, staffSeq: w.staffSeq, studentIds: w.studentIds ?? [] }));
}
