/**
 * Simulated teacher / office conversations for the guided setup flow.
 * Used by simulatedConversations.test.ts (local heuristic extractor) and by
 * scripts/sim-setup-interview-llm.ts (dev `setup-interview` edge model).
 */
import { createEmptyWizardDraft, toEditorInput, type SyllabusWizardDraft } from '../../components/syllabus/wizardModel.ts';
import { createEmptyDraft, draftToPayload, type GradingPolicyPayload } from '../school/gradingPolicy.ts';
import { createSession } from './applySlots.ts';
import { heuristicExtract } from './extract.ts';
import { chipsOf, getNode } from './graph.ts';
import { applyInterviewToSetupDraft, applyInterviewToSyllabusDraft } from './setupFields.ts';
import { beginInterview, processTurn, type TurnOutput } from './turn.ts';
import type { ExtractionResult, InterviewSession, InterviewWizard } from './types.ts';

export type SimTurn = {
  /** Expected pending question id before this turn (asserts the flow order). */
  at?: string;
  chip?: string;
  text?: string;
};

export type SimConversation = {
  name: string;
  wizard: InterviewWizard;
  class_name?: string;
  /** Seed draft (e.g. school locks) for the syllabus wizard. */
  seed?: (d: SyllabusWizardDraft) => SyllabusWizardDraft;
  turns: SimTurn[];
  /** Subset of toEditorInput(...) (syllabus) or draftToPayload(...) (school). */
  expect: Record<string, unknown>;
  /** Extra checks on the saved object. Return error strings. */
  check?: (saved: Record<string, unknown>) => string[];
};

export type Extractor = (session: InterviewSession, text: string) => Promise<ExtractionResult> | ExtractionResult;

export const localExtractor: Extractor = (session, text) => heuristicExtract(session, text);

export type SimResult = {
  name: string;
  session: InterviewSession;
  transcript: string[];
  saved: Record<string, unknown>;
  errors: string[];
  last: TurnOutput;
};

function subsetErrors(prefix: string, expected: unknown, actual: unknown): string[] {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if (!actual || typeof actual !== 'object') return [`${prefix}: expected object, got ${JSON.stringify(actual)}`];
    return Object.entries(expected as Record<string, unknown>).flatMap(([k, v]) =>
      subsetErrors(prefix ? `${prefix}.${k}` : k, v, (actual as Record<string, unknown>)[k]),
    );
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      return [`${prefix}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
    }
    return expected.flatMap((v, i) => subsetErrors(`${prefix}[${i}]`, v, actual[i]));
  }
  return Object.is(expected, actual) || (expected === null && actual === undefined)
    ? []
    : [`${prefix}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
}

export async function runConversation(conv: SimConversation, extractor: Extractor = localExtractor): Promise<SimResult> {
  const seedDraft =
    conv.wizard === 'syllabus'
      ? (conv.seed ? conv.seed(createEmptyWizardDraft('class-sim')) : createEmptyWizardDraft('class-sim'))
      : null;
  let out = beginInterview(
    createSession({
      wizard: conv.wizard,
      class_id: 'class-sim',
      school_id: 'school-sim',
      existing_draft: seedDraft as unknown as Record<string, unknown> | null,
      class_name: conv.class_name ?? null,
    }),
  );
  const errors: string[] = [];
  const transcript: string[] = [`ASK: ${out.assistant_text}`];
  let handed = false;
  for (const [i, turn] of conv.turns.entries()) {
    const s = out.session;
    if (turn.at && s.pending_node !== turn.at) {
      errors.push(`turn ${i + 1}: expected question ${turn.at}, was ${s.pending_node}`);
    }
    if (turn.chip) {
      const node = s.pending_node ? getNode(s.wizard, s.pending_node) : null;
      const chip = chipsOf(node, { wizard: s.wizard, filled: s.filled, draft: s.draft }).find((c) => c.id === turn.chip);
      if (!chip) {
        errors.push(`turn ${i + 1}: chip ${turn.chip} not offered on ${s.pending_node}`);
        continue;
      }
      transcript.push(`TEACHER [chip]: ${chip.label}`);
      out = processTurn(s, chip.label, heuristicExtract(s, '', chip.id), { chipId: chip.id });
    } else {
      const text = turn.text ?? '';
      transcript.push(`TEACHER: ${text}`);
      const ext = await extractor(s, text);
      out = processTurn(s, text, ext);
    }
    transcript.push(`ASK: ${out.assistant_text}`);
    if (out.handoff === 'wizard_review') handed = true;
  }
  if (!handed) errors.push('conversation never reached “Put these answers in the form”');
  let saved: Record<string, unknown>;
  if (conv.wizard === 'syllabus') {
    const target = seedDraft!;
    saved = toEditorInput(applyInterviewToSyllabusDraft(target, out.session)) as unknown as Record<string, unknown>;
  } else {
    const target = createEmptyDraft('school-sim', 'high');
    saved = draftToPayload(applyInterviewToSetupDraft(target, out.session)) as unknown as Record<string, unknown>;
  }
  errors.push(...subsetErrors('', conv.expect, saved));
  if (conv.check) errors.push(...conv.check(saved));
  return { name: conv.name, session: out.session, transcript, saved, errors, last: out };
}

const cat = (key: string, label: string, weight_percent: number, drop = 0) => ({
  key,
  label,
  weight_percent,
  active: true,
  rules: { drop_lowest_n: drop },
});

export const SIM_CONVERSATIONS: SimConversation[] = [
  {
    name: 'A · simple total-points class',
    wizard: 'syllabus',
    class_name: 'Biology 1 · P3',
    turns: [
      { at: 'T-Q1', text: 'I just add up total points' },
      { at: 'T-Q5', text: 'missing work is a zero' },
      { at: 'T-Q6', chip: 'none' },
      { at: 'T-Q7', text: 'no extra credit' },
      { at: 'T-Q8', text: 'no retakes' },
      { at: 'T-Q9', chip: 'rest' },
      { at: 'T-Q15', chip: 'open' },
    ],
    expect: {
      engine: 'total_points',
      title: 'Biology 1 · P3',
      missing_rule: 'zero',
      late_rule: { type: 'none' },
      extra_credit_method: 'A',
      policies: { extra_credit_allowed: false, missing_as_zero: true },
      retake: null,
      floor: null,
      rounding: 'nearest_whole',
      book_mode: 'reset_each_marking_period',
    },
  },
  {
    name: 'B · weighted categories, late per day, drop lowest, retakes, edit at summary',
    wizard: 'syllabus',
    class_name: 'Algebra I',
    turns: [
      { at: 'T-Q1', text: 'Weighted categories, each assignment counts the same inside a category' },
      { at: 'T-Q2', text: 'Tests 50, Quizzes 30, Homework 30' },
      { at: 'T-Q2', text: 'Tests 50, Quizzes 30, Homework 20' },
      { at: 'T-Q4', text: 'drop the lowest quiz' },
      { at: 'T-Q5', text: 'missing counts as 50' },
      { at: 'T-Q6', text: '10% a day, no lower than 50' },
      { at: 'T-Q7', text: 'bonus points, capped at 5%' },
      { at: 'T-Q7b', text: "the average can't go over 100" },
      { at: 'T-Q8', text: 'tests only, keep the higher score, max 70, within 5 days' },
      { at: 'T-Q10', text: 'round .5 up' },
      { at: 'T-Q11', text: 'quarters, fresh start each quarter' },
      { at: 'T-Q13', chip: 'renorm' },
      { at: 'T-Q15', chip: 'edit:T-Q6' },
      { at: 'T-Q6', text: '5 points per day, accepted up to 3 days' },
      { at: 'T-Q15', chip: 'open' },
    ],
    expect: {
      engine: 'weighted_percent_inside',
      within_category: 'percent_inside',
      title: 'Algebra I',
      categories: [cat('tests', 'Tests', 50), cat('quizzes', 'Quizzes', 30, 1), cat('homework', 'Homework', 20)],
      missing_rule: 'floor',
      floor: 50,
      late_rule: { type: 'per_day', amount: 5, unit: 'points', hard_deadline_days: 3 },
      extra_credit_method: 'B',
      ec_cap: 5,
      ceiling: 100,
      retake: { eligible_category_ids: ['tests'], attempts: 1, method: 'higher_of', cap: 70, window_days: 5 },
      rounding: 'half_up',
      term_structure: 'quarters',
      book_mode: 'reset_each_marking_period',
      policies: { extra_credit_allowed: true, min_floor_percent: 50 },
    },
  },
  {
    name: 'C · “not sure” teacher with a school-locked late rule',
    wizard: 'syllabus',
    class_name: 'World History',
    seed: (d) => ({
      ...d,
      locks: { ...d.locks, late: true },
      late_rule: { type: 'per_day', amount: 10, unit: 'percent', floor_pct: 50 },
    }),
    turns: [
      { at: 'T-Q1', text: "I'm not sure" },
      { at: 'T-Q2', chip: 'ns' },
      { at: 'T-Q4', text: 'no idea honestly' },
      { at: 'T-Q5', text: 'purple monkey' },
      { at: 'T-Q5', text: 'banana' },
      { at: 'T-Q7', text: 'not sure, use the school default' },
      { at: 'T-Q7b', chip: 'ns' },
      { at: 'T-Q8', text: 'dunno' },
      { at: 'T-Q9', chip: 'ns' },
      { at: 'T-Q10', chip: 'rest' },
      { at: 'T-Q15', chip: 'open' },
    ],
    expect: {
      engine: 'weighted_percent_inside',
      within_category: 'percent_inside',
      title: 'World History',
      categories: [cat('tests', 'Tests', 50), cat('quizzes', 'Quizzes', 20), cat('homework', 'Homework', 30)],
      missing_rule: 'omit',
      late_rule: { type: 'per_day', amount: 10, unit: 'percent', floor_pct: 50 },
      extra_credit_method: 'B',
      retake: null,
      floor: null,
      rounding: 'nearest_whole',
      book_mode: 'reset_each_marking_period',
    },
  },
  {
    name: 'D · office admin school grading policy',
    wizard: 'school',
    turns: [
      { at: 'S-Q1', chip: 'high' },
      { at: 'S-Q2', text: 'six-weeks, 70 is passing, AP is 5.0' },
      { at: 'S-Q2b', text: 'Aug 12 2026 to May 27 2027' },
      { at: 'S-Q3', chip: 'sem05' },
      { at: 'S-Q4', chip: '27' },
      { at: 'S-Q5', text: 'exempt with an 90 average and 3 or fewer absences' },
      { at: 'S-Q6b', chip: 'half' },
      { at: 'S-Q9', chip: 'pe' },
      { at: 'S-Q9b', chip: 'replace' },
      { at: 'S-Q11', chip: 'policy' },
      { at: 'S-Q10', chip: 'open' },
    ],
    expect: {
      level: 'high',
      calendar_template: 'tx_six_weeks',
      year_start: '2026-08-12',
      year_end: '2027-05-27',
      rollup_preset: '2/7+1/7',
      default_scale_id: 'texas_no_d',
      credit_policy: { unit: 'semester_0_5', year_link: true, attendance_gate: true, exam_exemption: { enabled: true, min_avg: 90, max_absences: 3 } },
      gpa_mode: 'unweighted_and_weighted',
      locks: { scale: true, rollup: true, late: true, floor: true, retake: true, categories: false },
    },
    check: (saved) => {
      const p = saved as unknown as GradingPolicyPayload;
      const errs: string[] = [];
      const sc = p.scales.find((x) => x.id === p.default_scale_id);
      if (sc?.passing_pct !== 70) errs.push(`scale passing_pct ${sc?.passing_pct}`);
      if (sc?.rounding !== 'half_up') errs.push(`scale rounding ${sc?.rounding}`);
      if (!p.quality_point_tables.some((t) => t.method === 'numeric_band')) errs.push('numeric 5.0 chart not in quality_point_tables');
      if (!p.gpa_profiles.length || p.gpa_profiles.some((g) => g.include.pe !== false || g.repeat !== 'replace')) {
        errs.push(`gpa profiles include/repeat ${JSON.stringify(p.gpa_profiles.map((g) => [g.key, g.include.pe, g.repeat]))}`);
      }
      return errs;
    },
  },
];
