/**
 * Client helper for GB-11 ingest-grading-doc edge function.
 */
import { invokeAi } from '@/lib/ai/invoke';
import { parseIngestProposal } from '@/lib/ingest/parseProposal';
import type { IngestProposal } from '@/lib/ingest/proposalTypes';

export type IngestGradingDocRequest = {
  kind: 'syllabus' | 'school_policy';
  class_id?: string;
  school_id?: string;
  storage_paths?: string[];
  image_urls?: string[];
  source_id?: string;
};

export type IngestGradingDocResponse = {
  ok?: boolean;
  job_id?: string | null;
  proposal?: IngestProposal;
  error?: string;
};

export async function invokeIngestGradingDoc(
  req: IngestGradingDocRequest,
): Promise<{ job_id: string | null; proposal: IngestProposal }> {
  const raw = await invokeAi<IngestGradingDocResponse>('ingest-grading-doc', {
    kind: req.kind,
    class_id: req.class_id,
    classId: req.class_id,
    school_id: req.school_id,
    schoolId: req.school_id,
    storage_paths: req.storage_paths ?? [],
    image_urls: req.image_urls ?? [],
    source_id: req.source_id,
  });
  if (raw.error && !raw.proposal) {
    throw new Error(String(raw.error));
  }
  const proposal = parseIngestProposal(raw.proposal ?? raw, {
    expected_kind: req.kind,
    source_id: req.source_id,
  });
  return { job_id: raw.job_id ?? null, proposal };
}
