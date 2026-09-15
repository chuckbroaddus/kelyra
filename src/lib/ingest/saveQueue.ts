/**
 * Per-key serial promise queue. Later tasks wait for earlier ones (success or fail).
 * Used so overlapping saveIngestSplit calls cannot interleave rollback vs commit.
 */

const chains = new Map<string, Promise<unknown>>();

export function enqueueExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(() => task());
  chains.set(key, next);
  // Clear the chain without creating an unhandled rejection on task failure.
  void next.then(
    () => {
      if (chains.get(key) === next) chains.delete(key);
    },
    () => {
      if (chains.get(key) === next) chains.delete(key);
    },
  );
  return next;
}

/** Rollback pre-RPC insert/park only when the versioned RPC did not commit. */
export function shouldRollbackSplitPersist(rpcSucceeded: boolean): boolean {
  return !rpcSucceeded;
}

/**
 * Coalesced save-chain step result.
 * Empty-pending steps must propagate priorOk — never upgrade a failed save to success
 * (Confirm must not mint on a stale split_draft_version).
 */
export function nextPersistChainOk(
  priorOk: boolean,
  hasPending: boolean,
  persistOk?: boolean,
): boolean {
  if (!hasPending) return priorOk !== false;
  return persistOk === true;
}
