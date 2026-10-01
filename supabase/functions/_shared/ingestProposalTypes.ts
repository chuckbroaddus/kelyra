/**
 * GB-11 AI ingest v2 — IngestProposal (CONTRACT + SRS FR-AI-04).
 * Pure types only. snake_case for JSON round-trip.
 */

export type IngestWizard = 'school' | 'syllabus';

export type IngestFieldStatus = 'proposed' | 'needs_review' | 'unknown' | 'conflict';

export type IngestEvidence = {
  quote: string;
  page: number | null;
  region: string | null;
};

export type IngestField = {
  path: string;
  value: unknown;
  confidence: number;
  evidence: IngestEvidence;
  status: IngestFieldStatus;
  source_doc_id: string | null;
  /** Plain-language reason this field needs a look (e.g. weights that don't total 100%). */
  note?: string;
};

export type IngestAmbiguity = {
  code: string;
  message: string;
  paths: string[];
  choices?: string[];
};

export type IngestWarning = {
  code: string;
  message: string;
  severity: 'info' | 'warn' | 'block';
};

/** FR-AI-04 extractor output — proposal, never a save/publish. */
export type IngestProposal = {
  source_id: string;
  wizard: IngestWizard;
  kind: 'syllabus' | 'school_policy';
  fields: IngestField[];
  ambiguities: IngestAmbiguity[];
  warnings: IngestWarning[];
  document_kind_guess: string | null;
  overall_confidence: number;
};

export type FieldSource = 'user' | 'template' | 'default' | 'ai' | 'assumed' | 'ingest';

export type DraftField<T = unknown> = {
  value: T;
  source: FieldSource;
  confidence: number | null;
  evidence: string | null;
  needs_review?: boolean;
  status?: IngestFieldStatus;
};

/** Path-keyed draft shared by school SetupDraft and syllabus path map. */
export type IngestableDraft = {
  kind: 'school_grading_policy' | 'syllabus';
  fields: Record<string, DraftField>;
};

export type MergeOptions = {
  /** Confidence below this stays empty / unknown (FR-AI-07). Default 0.5 */
  min_fill_confidence?: number;
  /** Confidence below this is needs_review when filled. Default 0.8 */
  high_confidence?: number;
  /** Paths locked by school policy — conflict, keep locked value. */
  locked_paths?: string[];
  /** When true, overwrite source==='user' fields (user confirmed replace). */
  replace_user_edits?: boolean;
};

export type MergeResult = {
  draft: IngestableDraft;
  applied: string[];
  skipped_user: string[];
  skipped_low: string[];
  conflicts: string[];
  needs_review: string[];
};
