/**
 * In-memory hand-off from Capture syllabus Import → Syllabus screen (same JS runtime).
 * Consumed once on focus.
 */
import type { IngestProposal } from '@/lib/ingest/proposalTypes';

const store = new Map<string, { proposal: IngestProposal; at: number }>();

export function putSyllabusIngestHandoff(classId: string, proposal: IngestProposal): void {
  store.set(classId, { proposal, at: Date.now() });
}

/** Returns and clears the pending proposal (ignores entries older than 30 min). */
export function takeSyllabusIngestHandoff(classId: string): IngestProposal | null {
  const hit = store.get(classId);
  store.delete(classId);
  if (!hit) return null;
  if (Date.now() - hit.at > 30 * 60 * 1000) return null;
  return hit.proposal;
}
