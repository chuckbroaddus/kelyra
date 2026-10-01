/**
 * GB-12 Conversational setup interview — InterviewSession (FR-CHAT-11).
 * Pure types. Never publishes.
 */

export type InterviewWizard = 'school' | 'syllabus';

export type SlotSource = 'chip' | 'text' | 'ingest' | 'assumed' | 'ai';

export type FilledSlot = {
  value: unknown;
  source: SlotSource;
  confidence: number | null;
  evidence: string | null;
};

export type TranscriptRole = 'assistant' | 'user' | 'system';

export type TranscriptTurn = {
  role: TranscriptRole;
  text: string;
  node_id?: string | null;
  kind?: TurnKind | null;
  at: string;
};

export type TurnKind = 'slot_answer' | 'side_question' | 'navigation' | 'injection';

export type InterviewStatus = 'active' | 'confirm' | 'handed_off' | 'abandoned';

/** Reserved name InterviewSession (CONTRACT / FR-CHAT-11). */
export type InterviewSession = {
  id: string;
  wizard: InterviewWizard;
  draft_id: string | null;
  school_id: string | null;
  class_id: string | null;
  owner_id: string | null;
  /** Node ids already asked (may be re-asked after repair). */
  asked: string[];
  /** path → filled slot. Source of truth for skip logic. */
  filled: Record<string, FilledSlot>;
  /** Next primary question node, or 'S-Q10' / 'T-Q7' review, or null when handed off. */
  next_node: string | null;
  /** Pending node waiting for answer (side Q keeps this). */
  pending_node: string | null;
  failed_parses: Record<string, number>;
  /** Serializable SetupDraft (school) or SyllabusWizardDraft-like bag (syllabus). */
  draft: Record<string, unknown>;
  status: InterviewStatus;
  transcript: TranscriptTurn[];
  section_index: number;
  /** Seed draft (school defaults + locks) so “Start over” keeps them. */
  base_draft?: Record<string, unknown> | null;
  class_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionChip = {
  id: string;
  label: string;
  /** Slot writes when this chip is tapped. */
  slots?: Array<{ path: string; value: unknown }>;
  /** Special actions. */
  action?: 'not_sure' | 'photo' | 'open_form' | 'skip' | 'confirm' | 'start_over' | 'edit' | 'defaults_rest';
  /** For action 'edit': node id to re-ask from the review summary. */
  edit_node?: string;
};

export type InterviewSection =
  | 'level'
  | 'calendar'
  | 'credit'
  | 'scale'
  | 'gpa'
  | 'locks'
  | 'engine'
  | 'categories'
  | 'status'
  | 'extras'
  | 'math'
  | 'terms'
  | 'review';

export type QuestionNode = {
  id: string;
  section: InterviewSection;
  /** Slot paths this node primarily fills. */
  paths: string[];
  question: string;
  chips: QuestionChip[];
  help_key: string | null;
  /** Hide when predicate returns true given filled + draft. */
  hidden?: (ctx: GraphContext) => boolean;
  effects?: (ctx: GraphContext) => string | null;
  /** Optional nodes offer “use defaults for the rest” and never block review. */
  optional?: boolean;
  /** Dynamic chips (e.g. per-category drop choices). Falls back to `chips`. */
  chipsFor?: (ctx: GraphContext) => QuestionChip[];
  /** Deterministic free-text parser for this node's paths. */
  parse?: (text: string, ctx: GraphContext) => ExtractedSlot[];
  /** Reject an answer (e.g. weights not 100). Returns a re-ask message or null. */
  validate?: (slots: ExtractedSlot[], ctx: GraphContext) => string | null;
  /** Values used for “not sure / school default”. Defaults to current draft values. */
  defaults?: (ctx: GraphContext) => ExtractedSlot[];
  /** One-line summary for the review card (null hides the line). */
  summarize?: (ctx: GraphContext) => string | null;
  /** Short label for the review “Edit …” chip. */
  edit_label?: string;
};

export type GraphContext = {
  wizard: InterviewWizard;
  filled: Record<string, FilledSlot>;
  draft: Record<string, unknown>;
};

export type ExtractedSlot = {
  path: string;
  value: unknown;
  confidence?: number;
  evidence?: string | null;
};

export type ExtractionResult = {
  turn_kind: TurnKind;
  slots: ExtractedSlot[];
  side_topic_key?: string | null;
  navigation?: 'open_form' | 'start_over' | 'confirm' | 'photo' | null;
  restate?: string | null;
  raw_summary?: string | null;
};

export type ProgressSnapshot = {
  sections: Array<{ id: InterviewSection; label: string; state: 'done' | 'current' | 'todo' }>;
  current_section: InterviewSection;
  label: string;
};

export type NextQuestionResult = {
  node: QuestionNode | null;
  done: boolean;
  progress: ProgressSnapshot;
  opening?: string | null;
};
