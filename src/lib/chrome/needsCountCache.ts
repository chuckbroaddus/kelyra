/** Teach Needs badge TTL snapshot keyed by classId (PERF-10..15). */

export const NEEDS_COUNT_TTL_MS = 12_000;

export type NeedsCountSnap = {
  classId: string;
  count: number;
  fetchedAt: number;
};

let snap: NeedsCountSnap | null = null;
let inflight: { classId: string; promise: Promise<number> } | null = null;
/** Bumped on invalidate so stale in-flight completions cannot write snap (QG-08 / PERF-11). */
let epoch = 0;

export function invalidateNeedsCountCache(): void {
  snap = null;
  inflight = null;
  epoch += 1;
}

/** Current invalidation epoch — callers (refreshBell) discard results when this moves. */
export function needsCountEpoch(): number {
  return epoch;
}

export function peekNeedsCountCache(): NeedsCountSnap | null {
  return snap;
}

export function needsCountCacheHit(classId: string, now = Date.now()): boolean {
  return Boolean(
    snap && snap.classId === classId && now - snap.fetchedAt < NEEDS_COUNT_TTL_MS,
  );
}

/** Read Needs count with TTL + same-tick inflight dedup (PERF-14). */
export async function readNeedsCountCached(
  classId: string,
  fetch: (id: string) => Promise<number>,
  opts?: { force?: boolean },
): Promise<number> {
  const now = Date.now();
  if (!opts?.force && snap && snap.classId === classId && now - snap.fetchedAt < NEEDS_COUNT_TTL_MS) {
    return snap.count;
  }
  if (!opts?.force && inflight && inflight.classId === classId) {
    return inflight.promise;
  }
  const startedEpoch = epoch;
  const promise = Promise.resolve()
    .then(() => fetch(classId))
    .then((count) => {
      if (startedEpoch !== epoch) {
        // Invalidated while in flight — do not poison snap for the next hop/mutation read.
        if (inflight?.promise === promise) inflight = null;
        return count;
      }
      snap = { classId, count, fetchedAt: Date.now() };
      if (inflight?.promise === promise) inflight = null;
      return count;
    })
    .catch((err) => {
      if (inflight?.promise === promise) inflight = null;
      throw err;
    });
  inflight = { classId, promise };
  return promise;
}
