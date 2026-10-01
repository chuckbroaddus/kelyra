/**
 * Pure batch / tray state for the multi-shot camera session.
 * Keeps ordered file URIs (not bitmaps). Cap matches AI grading-doc max.
 */

/** Keep in sync with MAX_GRADING_DOC_PAGES (ingest-grading-doc / capture pages). */
export const MULTI_SHOT_BATCH_CAP = 20;

export type MultiShot = {
  id: string;
  uri: string;
  mimeType: string;
};

export type AddShotResult = {
  shots: MultiShot[];
  added: boolean;
  atCap: boolean;
};

export type RemoveShotResult = {
  shots: MultiShot[];
  removed: MultiShot | null;
};

export function multiShotCap(max?: number): number {
  const n = Math.floor(max ?? MULTI_SHOT_BATCH_CAP);
  return Math.max(1, Math.min(MULTI_SHOT_BATCH_CAP, n));
}

export function canAddShot(count: number, max: number = MULTI_SHOT_BATCH_CAP): boolean {
  return Math.max(0, Math.floor(count)) < multiShotCap(max);
}

export function shutterDisabledMessage(count: number, max: number = MULTI_SHOT_BATCH_CAP): string | null {
  if (canAddShot(count, max)) return null;
  return `Limit is ${multiShotCap(max)} photos. Remove one or tap Done.`;
}

export function doneLabel(count: number): string {
  const n = Math.max(0, Math.floor(count));
  if (n <= 0) return 'Done';
  return n === 1 ? 'Done (1)' : `Done (${n})`;
}

export function makeShotId(index: number, now: number = Date.now()): string {
  return `shot-${now}-${index}`;
}

export function addShot(
  shots: MultiShot[],
  next: { uri: string; mimeType?: string | null; id?: string },
  max: number = MULTI_SHOT_BATCH_CAP,
): AddShotResult {
  const cap = multiShotCap(max);
  const current = Array.isArray(shots) ? shots : [];
  if (current.length >= cap) {
    return { shots: current, added: false, atCap: true };
  }
  if (!next?.uri || typeof next.uri !== 'string') {
    return { shots: current, added: false, atCap: current.length >= cap };
  }
  const shot: MultiShot = {
    id: next.id ?? makeShotId(current.length),
    uri: next.uri,
    mimeType: next.mimeType || 'image/jpeg',
  };
  const shotsNext = [...current, shot];
  return { shots: shotsNext, added: true, atCap: shotsNext.length >= cap };
}

export function removeShot(shots: MultiShot[], id: string): RemoveShotResult {
  const current = Array.isArray(shots) ? shots : [];
  const idx = current.findIndex((s) => s.id === id);
  if (idx < 0) return { shots: current, removed: null };
  const removed = current[idx]!;
  return { shots: [...current.slice(0, idx), ...current.slice(idx + 1)], removed };
}

export function orderedUris(shots: MultiShot[]): Array<{ uri: string; mimeType: string }> {
  return (shots ?? []).map((s) => ({ uri: s.uri, mimeType: s.mimeType || 'image/jpeg' }));
}
