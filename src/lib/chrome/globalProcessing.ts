import { useEffect, useSyncExternalStore } from 'react';

/**
 * Session-global processing refcount (Soft chrome SoT).
 * chromeKWorking = globalProcessingCount > 0.
 * §4.1 jobs must pair begin/end; §4.2 must not call begin.
 */

type Listener = () => void;

let count = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function getGlobalProcessingCount(): number {
  return count;
}

export function beginGlobalProcessing(): void {
  count += 1;
  emit();
}

export function endGlobalProcessing(): void {
  count = Math.max(0, count - 1);
  emit();
}

/** Test / verify helper — do not use from product screens. */
export function __resetGlobalProcessingForTests(): void {
  count = 0;
  emit();
}

export function subscribeGlobalProcessing(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useGlobalProcessingCount(): number {
  return useSyncExternalStore(
    subscribeGlobalProcessing,
    getGlobalProcessingCount,
    getGlobalProcessingCount,
  );
}

/** Brand K chrome working when any §4.1 job is live. */
export function useChromeKWorking(): boolean {
  return useGlobalProcessingCount() > 0;
}

/**
 * Job-owner hook: while `active`, holds one refcount slot.
 * Unmount / flip to false always ends (no leak).
 */
export function useGlobalProcessingActive(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    beginGlobalProcessing();
    return () => {
      endGlobalProcessing();
    };
  }, [active]);
}
