/** Single modal host: opening one DateInput closes another. */

type Closer = () => void;

let activeId: string | null = null;
const closers = new Map<string, Closer>();

export function claimDateHost(id: string, close: Closer): void {
  if (activeId && activeId !== id) {
    const prior = closers.get(activeId);
    prior?.();
  }
  closers.set(id, close);
  activeId = id;
}

export function releaseDateHost(id: string): void {
  closers.delete(id);
  if (activeId === id) activeId = null;
}

export function activeDateHostId(): string | null {
  return activeId;
}

/** Test helper — reset host registry. */
export function resetDateHost(): void {
  activeId = null;
  closers.clear();
}
