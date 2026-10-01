/**
 * Web QA hook: fixture inject into Start-from-document ingest.
 * CDP calls window.__kelyraIngestFromUri(uri, mimeType).
 */
import { useLayoutEffect } from 'react';

export type IngestFromUriFn = (uri: string, mimeType: string) => void | Promise<void>;

declare global {
  interface Window {
    __kelyraIngestFromUri?: IngestFromUriFn;
    __kelyraIngestReady?: boolean;
    __kelyraIngestKind?: 'syllabus' | 'school_policy';
  }
}

/** Register active screen ingest runner for browser fixture injection. */
export function useWebIngestFixtureHook(
  kind: 'syllabus' | 'school_policy',
  run: IngestFromUriFn | null | undefined,
): void {
  // useLayoutEffect so CDP can see the hook before paint settle waits finish
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!run) return;
    window.__kelyraIngestFromUri = (uri: string, mimeType: string) => run(uri, mimeType);
    window.__kelyraIngestKind = kind;
    window.__kelyraIngestReady = true;
    // Do not clear on cleanup — StrictMode remounts would drop the hook mid-drive.
  }, [kind, run]);

  // Also assign during render on web so SSR→client still exposes the API ASAP
  if (typeof window !== 'undefined' && run) {
    window.__kelyraIngestFromUri = (uri: string, mimeType: string) => run(uri, mimeType);
    window.__kelyraIngestKind = kind;
    window.__kelyraIngestReady = true;
  }
}
