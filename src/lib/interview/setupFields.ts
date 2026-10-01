/**
 * Gradebook setup field registry for the guided “Answer a few questions” flow,
 * plus the bridge that lands interview answers in the SAME saved settings the
 * document path produces (IngestProposal → applyProposalToSyllabusDraft /
 * mergeIntoSetupDraft → wizard draft → Save draft / Publish).
 *
 * The registry is keyed by the ingest path vocabulary (allowedPaths.ts) so a
 * new ingest field without a question fails setupCoverage.test.ts.
 */
import { applyProposalToSyllabusDraft, mergeIntoSetupDraft } from '../ingest/pathMapping.ts';
import type { IngestField, IngestProposal } from '../ingest/proposalTypes.ts';
import type { SyllabusWizardDraft } from '../../components/syllabus/wizardModel.ts';
import type { SetupDraft } from '../school/gradingPolicy.ts';
import type { FilledSlot, InterviewSession } from './types.ts';

export type FieldRequirement = 'required' | 'optional' | 'derived' | 'not_applicable';

export type SetupFieldSpec = {
  /** Ingest / SetupDraft path (allowedPaths.ts vocabulary). */
  path: string;
  label: string;
  requirement: FieldRequirement;
  /** Interview slot paths whose answers produce this field. */
  interview_paths: string[];
  note?: string;
};

export const SYLLABUS_SETUP_FIELDS: SetupFieldSpec[] = [
  { path: 'syllabus.title', label: 'Course title', requirement: 'optional', interview_paths: ['title'], note: 'Pre-filled from the class name, so usually skipped.' },
  { path: 'syllabus.engine', label: 'Grading engine', requirement: 'required', interview_paths: ['engine'] },
  { path: 'syllabus.within_category', label: 'Inside a category', requirement: 'required', interview_paths: ['within_category'], note: 'Weighted engines only; engine chips answer it too.' },
  { path: 'syllabus.categories', label: 'Categories & weights (+ drop lowest per category)', requirement: 'required', interview_paths: ['categories', 'drop_lowest'], note: 'Weighted engines; must total 100%.' },
  { path: 'syllabus.missing_rule', label: 'Missing work', requirement: 'required', interview_paths: ['missing_rule'] },
  { path: 'syllabus.late_rule', label: 'Late penalty', requirement: 'required', interview_paths: ['late_rule'] },
  { path: 'syllabus.extra_credit_method', label: 'Extra credit', requirement: 'required', interview_paths: ['extra_credit_method', 'extra_credit_allowed'] },
  { path: 'syllabus.ec_cap', label: 'Extra credit cap', requirement: 'optional', interview_paths: ['ec_cap'] },
  { path: 'syllabus.ceiling', label: 'Period ceiling', requirement: 'optional', interview_paths: ['ceiling'] },
  { path: 'syllabus.retake', label: 'Retakes / redos', requirement: 'required', interview_paths: ['retake'] },
  { path: 'syllabus.floor', label: 'Period floor (minimum grade)', requirement: 'optional', interview_paths: ['floor'] },
  { path: 'syllabus.rounding', label: 'Rounding', requirement: 'optional', interview_paths: ['rounding'] },
  { path: 'syllabus.empty_category', label: 'Empty category', requirement: 'optional', interview_paths: ['empty_category'] },
  { path: 'syllabus.term_structure', label: 'Term structure', requirement: 'optional', interview_paths: ['term_structure'] },
  { path: 'syllabus.book_mode', label: 'Gradebook reset mode', requirement: 'optional', interview_paths: ['book_mode'] },
  { path: 'syllabus.exam_weight', label: 'Exam weight', requirement: 'optional', interview_paths: ['exam_weight'], note: 'Hidden when the school locks the rollup.' },
  { path: 'syllabus.rollup_preset', label: 'Class rollup preset', requirement: 'optional', interview_paths: ['rollup_preset'], note: 'Hidden when the school locks the rollup.' },
  { path: 'syllabus.narrative', label: 'Other notes from document', requirement: 'not_applicable', interview_paths: [], note: 'Free-text leftovers from a document; nothing to ask and not saved by the mapper.' },
  { path: 'syllabus.assignment_max', label: 'Assignment max', requirement: 'not_applicable', interview_paths: [], note: 'No SyllabusWizardDraft field; the document mapper drops it too.' },
];

export const SCHOOL_SETUP_FIELDS: SetupFieldSpec[] = [
  { path: 'level', label: 'School level', requirement: 'required', interview_paths: ['level'] },
  { path: 'calendar.template', label: 'Grading calendar', requirement: 'required', interview_paths: ['calendar.template'] },
  { path: 'calendar.year_start', label: 'School year start', requirement: 'optional', interview_paths: ['calendar.year_start'] },
  { path: 'calendar.year_end', label: 'School year end', requirement: 'optional', interview_paths: ['calendar.year_end'] },
  { path: 'calendar.model', label: 'Calendar model', requirement: 'derived', interview_paths: ['calendar.template', 'rollup.preset', 'calendar.year_start'], note: 'Built from template + dates + rollup.' },
  { path: 'calendar.period_model', label: 'Marking period model', requirement: 'derived', interview_paths: ['calendar.template'] },
  { path: 'credit.policy', label: 'Credit policy', requirement: 'required', interview_paths: ['credit.policy', 'credit.exam_exemption'] },
  { path: 'credit.unit', label: 'Credit unit', requirement: 'derived', interview_paths: ['credit.policy'] },
  { path: 'credit.year_link', label: 'Year average for credit', requirement: 'derived', interview_paths: ['credit.policy'] },
  { path: 'credit.attendance_gate', label: 'Attendance gate', requirement: 'derived', interview_paths: ['credit.policy'] },
  { path: 'credit.passing_threshold', label: 'Passing threshold', requirement: 'derived', interview_paths: ['scale.passing_pct'] },
  { path: 'rollup.preset', label: 'Semester rollup', requirement: 'required', interview_paths: ['rollup.preset'] },
  { path: 'rollup.custom_weights', label: 'Custom rollup weights', requirement: 'not_applicable', interview_paths: [], note: 'Custom weights are edited on the form.' },
  { path: 'rollup.exam_enabled', label: 'Semester exam in rollup', requirement: 'derived', interview_paths: ['rollup.preset'] },
  { path: 'scale.default_id', label: 'Default letter scale', requirement: 'required', interview_paths: ['scale.default_id'] },
  { path: 'scale.list', label: 'Letter scales', requirement: 'derived', interview_paths: ['scale.default_id', 'scale.passing_pct', 'scale.rounding'] },
  { path: 'scale.bands', label: 'Letter bands', requirement: 'derived', interview_paths: ['scale.default_id'], note: 'From the chosen scale template; custom bands on the form.' },
  { path: 'scale.passing_pct', label: 'Passing percent', requirement: 'required', interview_paths: ['scale.passing_pct'] },
  { path: 'scale.rounding', label: 'Rounding rule', requirement: 'optional', interview_paths: ['scale.rounding'] },
  { path: 'qp.tables', label: 'Quality-point chart', requirement: 'derived', interview_paths: ['gpa.weighted_bonus'] },
  { path: 'qp.method', label: 'Quality-point method', requirement: 'derived', interview_paths: ['gpa.weighted_bonus'] },
  { path: 'levels.list', label: 'Course levels', requirement: 'derived', interview_paths: ['gpa.weighted_bonus', 'levels.ap_points'] },
  { path: 'gpa.mode', label: 'GPA mode', requirement: 'required', interview_paths: ['gpa.mode'] },
  { path: 'gpa.profiles', label: 'GPA profiles', requirement: 'derived', interview_paths: ['gpa.mode', 'gpa.include', 'gpa.repeat'] },
  { path: 'gpa.include', label: 'What counts in GPA', requirement: 'required', interview_paths: ['gpa.include'] },
  { path: 'gpa.repeat', label: 'Repeat course rule', requirement: 'optional', interview_paths: ['gpa.repeat'] },
  { path: 'gpa.rank', label: 'Class rank GPA', requirement: 'optional', interview_paths: ['gpa.mode'], note: 'GPA chip “Weighted + class rank”.' },
  { path: 'locks.map', label: 'Teacher locks', requirement: 'required', interview_paths: ['locks.map'] },
  { path: 'school.notes', label: 'School notes', requirement: 'not_applicable', interview_paths: [], note: 'Free-text leftovers from a document.' },
];

export function setupFieldsFor(wizard: 'school' | 'syllabus'): SetupFieldSpec[] {
  return wizard === 'school' ? SCHOOL_SETUP_FIELDS : SYLLABUS_SETUP_FIELDS;
}

function confFor(f: FilledSlot | undefined): number {
  if (!f) return 0.9;
  return f.source === 'assumed' ? 0.6 : 1;
}

function field(path: string, value: unknown, confidence: number, quote: string): IngestField {
  return {
    path,
    value,
    confidence,
    evidence: { quote, page: null, region: 'interview' },
    status: confidence < 0.8 ? 'needs_review' : 'proposed',
    source_doc_id: null,
  };
}

/** Paths the document mapper (applyProposalToSyllabusDraft) understands. */
const MAPPER_SYLLABUS_KEYS = [
  'title',
  'engine',
  'within_category',
  'late_rule',
  'missing_rule',
  'extra_credit_method',
  'ec_cap',
  'floor',
  'ceiling',
  'book_mode',
  'exam_weight',
  'rollup_preset',
  'rounding',
  'empty_category',
  'term_structure',
] as const;

function answered(session: InterviewSession, path: string): FilledSlot | null {
  const f = session.filled[path];
  if (!f || f.evidence === 'school lock') return null;
  return f;
}

/** Interview answers as an IngestProposal (same shape the document extractor returns). */
export function interviewToSyllabusProposal(session: InterviewSession): IngestProposal {
  const fields: IngestField[] = [];
  const bag = session.draft as unknown as SyllabusWizardDraft;
  for (const key of MAPPER_SYLLABUS_KEYS) {
    const f = answered(session, key);
    if (!f) continue;
    fields.push(field(`syllabus.${key}`, f.value, confFor(f), `Interview: ${key}`));
  }
  const catF = answered(session, 'categories');
  const dropF = answered(session, 'drop_lowest');
  if (catF || dropF) {
    const cats = (bag.categories ?? []).map((c) => ({
      key: c.key,
      label: c.label,
      weight_percent: c.weight_percent,
      sort_order: c.sort_order,
      drop_lowest: Number(c.rules?.drop_lowest_n ?? 0),
      min_grades_per_term: c.min_grades_per_term ?? null,
      empty_policy: c.empty_policy ?? undefined,
    }));
    fields.push(field('syllabus.categories', cats, Math.min(confFor(catF ?? undefined), confFor(dropF ?? undefined)), 'Interview: categories'));
  }
  const retF = answered(session, 'retake');
  if (retF) fields.push(field('syllabus.retake', retF.value, confFor(retF), 'Interview: retake'));
  return {
    source_id: `interview:${session.id}`,
    wizard: 'syllabus',
    kind: 'syllabus',
    fields,
    ambiguities: [],
    warnings: [],
    document_kind_guess: 'interview',
    overall_confidence: 1,
  };
}

/**
 * Land interview answers on the class's wizard draft exactly like the document
 * path does (applyProposalToSyllabusDraft), then the fields that mapper does
 * not carry yet (retake, extra-credit on/off).
 */
export function applyInterviewToSyllabusDraft(
  target: SyllabusWizardDraft,
  session: InterviewSession,
): SyllabusWizardDraft {
  const proposal = interviewToSyllabusProposal(session);
  let next = applyProposalToSyllabusDraft(target, proposal);
  const retF = answered(session, 'retake');
  if (retF && target.locks.retake !== true) {
    next = { ...next, retake: (retF.value ?? null) as SyllabusWizardDraft['retake'] };
  }
  const ecAllowed = answered(session, 'extra_credit_allowed');
  if (ecAllowed) {
    next = { ...next, policies: { ...next.policies, extra_credit_allowed: ecAllowed.value === true } };
  }
  const empty = answered(session, 'empty_category');
  if (empty) {
    next = { ...next, categories: next.categories.map((c) => ({ ...c, empty_policy: next.empty_category })) };
  }
  return next;
}

/** School: every SetupDraft field the interview changed, as an IngestProposal. */
export function interviewToSchoolProposal(session: InterviewSession, target: SetupDraft): IngestProposal {
  const src = session.draft as unknown as SetupDraft;
  const fields: IngestField[] = [];
  for (const [path, f] of Object.entries(src.fields ?? {})) {
    const before = target.fields[path]?.value;
    if (JSON.stringify(before) === JSON.stringify(f.value)) continue;
    const slot = session.filled[path];
    const conf = slot ? confFor(slot) : 0.9;
    fields.push(field(path, f.value, conf, `Interview: ${path}`));
  }
  return {
    source_id: `interview:${session.id}`,
    wizard: 'school',
    kind: 'school_policy',
    fields,
    ambiguities: [],
    warnings: [],
    document_kind_guess: 'interview',
    overall_confidence: 1,
  };
}

/** Land school interview answers via the same mergeIntoSetupDraft the document path uses. */
export function applyInterviewToSetupDraft(target: SetupDraft, session: InterviewSession): SetupDraft {
  const proposal = interviewToSchoolProposal(session, target);
  return mergeIntoSetupDraft(target, proposal, { replace_user_edits: true }).setup;
}
