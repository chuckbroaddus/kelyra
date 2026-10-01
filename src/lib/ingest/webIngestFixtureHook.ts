/**
 * Web QA hook: fixture inject into Start-from-document ingest.
 * CDP may call:
 *   window.__kelyraIngestFromUri(uri, mimeType)          — one page (compat)
 *   window.__kelyraIngestFromUris([{uri, mimeType}, …]) — multi-page, order kept
 */
import { useLayoutEffect } from 'react';

export type IngestPageInput = { uri: string; mimeType: string };

export type IngestFromPagesFn = (pages: IngestPageInput[]) => void | Promise<void>;

/** Legacy single-page signature still used by older proof scripts. */
export type IngestFromUriFn = (uri: string, mimeType: string) => void | Promise<void>;

declare global {
  interface Window {
    __kelyraIngestFromUri?: IngestFromUriFn;
    __kelyraIngestFromUris?: (pages: IngestPageInput[]) => void | Promise<void>;
    __kelyraIngestReady?: boolean;
    __kelyraIngestKind?: 'syllabus' | 'school_policy';
  }
}

function installHook(kind: 'syllabus' | 'school_policy', run: IngestFromPagesFn) {
  if (typeof window === 'undefined') return;
  window.__kelyraIngestFromUris = (pages: IngestPageInput[]) => run(Array.isArray(pages) ? pages : []);
  window.__kelyraIngestFromUri = (uri: string, mimeType: string) =>
    run([{ uri, mimeType: mimeType || 'image/jpeg' }]);
  window.__kelyraIngestKind = kind;
  window.__kelyraIngestReady = true;
}

/** Register active screen ingest runner for browser fixture injection. */
export function useWebIngestFixtureHook(
  kind: 'syllabus' | 'school_policy',
  run: IngestFromPagesFn | null | undefined,
): void {
  // useLayoutEffect so CDP can see the hook before paint settle waits finish
  useLayoutEffect(() => {
    if (!run) return;
    installHook(kind, run);
    // Do not clear on cleanup — StrictMode remounts would drop the hook mid-drive.
  }, [kind, run]);

  // Also assign during render on web so SSR→client still exposes the API ASAP
  if (run) installHook(kind, run);
}
