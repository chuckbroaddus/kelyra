/**
 * GB-08 Syllabus wizard pure model (T1–T8).
 * Owns draft shape + validation; publish goes through src/lib/syllabus/api.
 * Relative imports only so node:test can load this without path aliases.
 */
import type { LateRule, RetakeRule } from '../../lib/grade/engine/types.ts';
import type { CategoryRules, SyllabusPolicies } from '../../lib/grade/syllabusAverage.ts';
import type {
  BookMode,
  ExtraCreditMethod,
  MissingRule,
  SyllabusEngine,
  SyllabusRounding,
  WithinCategory,
} from '../../lib/syllabus/types.ts';
import { rollupPresetLabel } from '../../lib/grade/plainLabels.ts';
import {
  extraCreditOnTopSentence,
  isExtraCreditCategory,
  splitWeights,
  weightsTotalOk,
} from '../../lib/syllabus/extraCreditWeights.ts';

export type { BookMode, ExtraCreditMethod, MissingRule, SyllabusEngine, SyllabusRounding, WithinCategory };

export type SyllabusCategoryDraft = {
  id?: string;
  key: string;
  label: string;
  weight_percent: number;
  sort_order: number;
  active: boolean;
  group?: 'formative' | 'summative' | null;
  default_include_in_average: boolean;
  min_grades_per_term?: number | null;
  rules: CategoryRules;
  drop_highest_n?: number;
  keep_highest_n?: number | null;
  droppable?: boolean;
  never_drop_flags?: string[];
  empty_policy?: 'renormalize' | 'zero' | null;
};

export type ClassSyllabusDraft = {
  id?: string;
  class_id: string;
  status: 'draft' | 'published' | 'archived';
  title: string | null;
  calc_mode: 'category_weight' | string;
  term_structure: 'quarters' | 'semesters' | 'year' | 'custom';
  active_term: string | null;
  policies: SyllabusPolicies;
  terms: unknown[];
  source: 'manual' | 'ask_import' | 'copied';
  source_asset_id: string | null;
  ask_draft: Record<string, unknown> | null;
  publish_to_family: boolean;
  published_at: string | null;
  row_version: number;
  updated_at?: string;
  engine: SyllabusEngine;
  within_category: WithinCategory | null;
  book_mode: BookMode;
  extra_credit_method: ExtraCreditMethod;
  ec_cap: number | null;
  late_rule: LateRule;
  missing_rule: MissingRule;
  rounding: SyllabusRounding;
  floor: number | null;
  ceiling: number | null;
  /** null = retakes off (today). */
  retake: RetakeRule | null;
  exam_weight: number | null;
  rollup_preset: string | null;
  syllabus_version: number;
  locks: Record<string, unknown>;
  marking_period_scope: string | null;
};

const KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;

export function defaultPolicies(): SyllabusPolicies {
  return {
    extra_credit_allowed: false,
    late_penalty_mode: 'manual',
    makeup_window_days: null,
    redo_max_percent: null,
    min_floor_percent: null,
    rounding: 'nearest_whole',
    missing_as_zero: false,
    publish_to_family: true,
  };
}

export function emptyCategory(label: string, key: string, sort_order: number): SyllabusCategoryDraft {
  return {
    key,
    label,
    weight_percent: 0,
    sort_order,
    active: true,
    group: null,
    default_include_in_average: false,
    min_grades_per_term: null,
    rules: { drop_lowest_n: 0, replace_lowest_with_makeup: { enabled: false, max_replacements: 1 } },
    drop_highest_n: 0,
    keep_highest_n: null,
    droppable: true,
    never_drop_flags: [],
    empty_policy: null,
  };
}

export function slugCategoryKey(label: string, used: Set<string>): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  let key = KEY_RE.test(base) ? base : 'other';
  if (!key) key = 'other';
  if (!KEY_RE.test(key)) key = 'other';
  let n = 2;
  let candidate = key;
  while (used.has(candidate)) {
    const suffix = `_${n}`;
    candidate = `${key.slice(0, Math.max(1, 32 - suffix.length))}${suffix}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

export function activeWeightSum(categories: SyllabusCategoryDraft[]): number {
  return categories.filter((c) => c.active).reduce((sum, c) => sum + Number(c.weight_percent || 0), 0);
}

export type WizardStepId =
  | 'engine'
  | 'categories'
  | 'within'
  | 'drops'
  | 'status_late'
  | 'extra_credit'
  | 'book_rollup'
  | 'review';

/**
 * Setup chrome tabs (7). `within` stays a type for old drafts / deep links only —
 * its rule lives on the two Weighted engine radios (no separate tab).
 */
export const WIZARD_STEPS: WizardStepId[] = [
  'engine',
  'categories',
  'drops',
  'status_late',
  'extra_credit',
  'book_rollup',
  'review',
];

export const STEP_LABELS: Record<WizardStepId, string> = {
  engine: 'How grades add up',
  categories: 'Categories',
  within: 'Inside a category',
  drops: 'Drop lowest',
  status_late: 'Missing & late',
  extra_credit: 'Extra credit & retakes',
  book_rollup: 'Periods & rounding',
  review: 'Review & publish',
};

/**
 * Icons for PersonTabs on the syllabus setup row (shared IconName strings).
 * Dedicated syllabus* glyphs from notes/company/syllabus-tab-glyphs (t_804eee4c).
 */
export const STEP_ICONS: Record<WizardStepId, string> = {
  engine: 'syllabusEngine',
  categories: 'syllabusCategories',
  within: 'syllabusWithin',
  drops: 'syllabusDrops',
  status_late: 'syllabusStatusLate',
  extra_credit: 'syllabusExtraCredit',
  book_rollup: 'syllabusBookRollup',
  review: 'syllabusReview',
};

export const STEP_HELP_KEYS: Record<WizardStepId, string> = {
  engine: 'help.engine.weighted_points',
  categories: 'help.empty_category',
  within: 'help.engine.weighted_percent',
  drops: 'help.drop_lowest',
  status_late: 'help.missing',
  extra_credit: 'help.retake_cap',
  book_rollup: 'help.reset_period',
  review: 'help.engine.weighted_points',
};

/** Drop-lowest UI range (0–3). Values outside clamp when set via the stepper. */
export const DROP_LOWEST_OPTIONS = [0, 1, 2, 3] as const;

export function clampDropLowest(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, Math.trunc(n)));
}

/** Late amount / unit fields — same rule as the existing late form. */
export function showLateAmountFields(draft: { late_rule: LateRule }): boolean {
  return draft.late_rule.type !== 'none';
}

/**
 * Extra-credit cap field. Cap still stores for any method; the redraw only
 * surfaces the field for methods B and C (adds points / own category).
 */
export function showExtraCreditCapField(draft: { extra_credit_method: ExtraCreditMethod }): boolean {
  return draft.extra_credit_method === 'B' || draft.extra_credit_method === 'C';
}

/**
 * Floor field for missing = “lowest grade allowed”. Period floor still lives on
 * the Drop lowest step (unchanged); this gates the extra prompt on Missing & late.
 */
export function showMissingFloorField(draft: { missing_rule: MissingRule }): boolean {
  return draft.missing_rule === 'floor';
}

/** Categories shown on the drop-lowest stepper (active only — same as before). */
export function dropLowestCategories(categories: SyllabusCategoryDraft[]): SyllabusCategoryDraft[] {
  return categories.filter((c) => c.active);
}

/** School lock flags (aligned with src/lib/syllabus/locks.ts + GB-07). */
export type SyllabusLocks = {
  engine: boolean;
  categories: boolean;
  scale: boolean;
  floor: boolean;
  late: boolean;
  drop_lowest: boolean;
  retake: boolean;
  assignment_max: boolean;
  book_mode: boolean;
  rollup: boolean;
};

export const DEFAULT_LOCKS: SyllabusLocks = {
  engine: false,
  categories: false,
  scale: true,
  floor: false,
  late: false,
  drop_lowest: false,
  retake: false,
  assignment_max: false,
  book_mode: false,
  rollup: true,
};

export const LOCK_REASONS: Record<keyof SyllabusLocks, string> = {
  engine: 'Your school sets how the average is figured.',
  categories: 'Your school sets the categories and their weights.',
  scale: 'Your school sets the letter grade scale.',
  floor: 'Your school sets the lowest grade allowed.',
  late: 'Your school sets the late work penalty.',
  drop_lowest: 'Your school sets whether low scores are dropped.',
  retake: 'Your school sets the retake rules.',
  assignment_max: 'Your school sets the most points an assignment can be worth.',
  book_mode: 'Your school sets whether grades start fresh each grading period.',
  rollup: 'Your school sets how grading periods and the exam make the semester grade.',
};

export type EngineOption = {
  id: SyllabusEngine;
  label: string;
  plain: string;
  needsCategories: boolean;
  needsWithin: boolean;
};

export const ENGINE_OPTIONS: EngineOption[] = [
  {
    id: 'total_points',
    label: 'Total points',
    plain: 'Every point counts the same. A 100-point test outweighs a 10-point quiz.',
    needsCategories: false,
    needsWithin: false,
  },
  {
    id: 'weighted_points_inside',
    label: 'Weighted, points count',
    plain: 'Categories have weights. Inside one, a 100-point test counts more than a 20-point quiz.',
    needsCategories: true,
    needsWithin: true,
  },
  {
    id: 'weighted_percent_inside',
    label: 'Weighted, all equal',
    plain: 'Categories have weights. Inside one, every assignment counts the same. 80/100 and 16/20 are both 80%.',
    needsCategories: true,
    needsWithin: true,
  },
  {
    id: 'item_weights',
    label: 'Each assignment weighted',
    plain: 'You give each assignment its own weight. Categories are just labels.',
    needsCategories: false,
    needsWithin: false,
  },
  {
    id: 'none',
    label: 'No overall grade',
    plain: 'Keep scores without figuring an overall average for the grading period.',
    needsCategories: false,
    needsWithin: false,
  },
];

export type SyllabusWizardDraft = {
  class_id: string;
  step: WizardStepId;
  title: string;
  term_structure: ClassSyllabusDraft['term_structure'];
  active_term: string | null;
  policies: SyllabusPolicies;
  categories: SyllabusCategoryDraft[];
  engine: SyllabusEngine;
  within_category: WithinCategory | null;
  book_mode: BookMode;
  extra_credit_method: ExtraCreditMethod;
  ec_cap: number | null;
  late_rule: LateRule;
  missing_rule: MissingRule;
  rounding: SyllabusRounding;
  floor: number | null;
  ceiling: number | null;
  retake: RetakeRule | null;
  exam_weight: number | null;
  rollup_preset: string | null;
  locks: SyllabusLocks;
  lock_reasons: Partial<Record<keyof SyllabusLocks, string>>;
  marking_period_scope: string | null;
  empty_category: 'renormalize' | 'zero';
  source: ClassSyllabusDraft['source'];
  row_version: number;
  syllabus_status: ClassSyllabusDraft['status'] | 'none';
  publish_to_family: boolean;
};

export type WizardIssue = {
  path: string;
  severity: 'error' | 'warning';
  message: string;
  step?: WizardStepId;
};

export function isWeightedEngine(engine: SyllabusEngine): boolean {
  return engine === 'weighted_points_inside' || engine === 'weighted_percent_inside';
}

export function engineOption(id: SyllabusEngine): EngineOption {
  return ENGINE_OPTIONS.find((o) => o.id === id) ?? ENGINE_OPTIONS[2]!;
}

export function defaultCategories(): SyllabusCategoryDraft[] {
  return [
    { ...emptyCategory('Tests', 'tests', 0), weight_percent: 50, default_include_in_average: true },
    { ...emptyCategory('Quizzes', 'quizzes', 1), weight_percent: 20, default_include_in_average: true },
    { ...emptyCategory('Homework', 'homework', 2), weight_percent: 30, default_include_in_average: true },
  ];
}

export function createEmptyWizardDraft(classId: string): SyllabusWizardDraft {
  return {
    class_id: classId,
    step: 'engine',
    title: '',
    term_structure: 'year',
    active_term: null,
    policies: defaultPolicies(),
    categories: defaultCategories(),
    engine: 'weighted_percent_inside',
    within_category: 'percent_inside',
    book_mode: 'reset_each_marking_period',
    extra_credit_method: 'B',
    ec_cap: null,
    late_rule: { type: 'none' },
    missing_rule: 'omit',
    rounding: 'nearest_whole',
    floor: null,
    ceiling: null,
    retake: null,
    exam_weight: null,
    rollup_preset: null,
    locks: { ...DEFAULT_LOCKS },
    lock_reasons: {},
    marking_period_scope: null,
    empty_category: 'renormalize',
    source: 'manual',
    row_version: 1,
    syllabus_status: 'none',
    publish_to_family: true,
  };
}

export function parseLocks(raw: unknown): SyllabusLocks {
  const base = { ...DEFAULT_LOCKS };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  (Object.keys(base) as Array<keyof SyllabusLocks>).forEach((k) => {
    if (typeof o[k] === 'boolean') base[k] = o[k] as boolean;
  });
  return base;
}

export function applySchoolPolicyDefaults(
  draft: SyllabusWizardDraft,
  policy: {
    locks?: Partial<SyllabusLocks> | null;
    lock_reasons?: Partial<Record<keyof SyllabusLocks, string>> | null;
    rollup_preset?: string | null;
    exam_weight?: number | null;
    book_mode?: BookMode | null;
    floor?: number | null;
    late_rule?: LateRule | null;
    missing_rule?: MissingRule | null;
    engine?: SyllabusEngine | null;
    extra_credit_method?: ExtraCreditMethod | null;
  } | null,
): SyllabusWizardDraft {
  if (!policy) return draft;
  const locks = parseLocks({ ...DEFAULT_LOCKS, ...(policy.locks ?? {}) });
  const next: SyllabusWizardDraft = {
    ...draft,
    locks,
    lock_reasons: {},
  };
  (Object.keys(locks) as Array<keyof SyllabusLocks>).forEach((k) => {
    if (locks[k]) {
      next.lock_reasons[k] = policy.lock_reasons?.[k] ?? LOCK_REASONS[k];
    }
  });
  // Locked values from school win when provided (including when class row is still empty).
  if (locks.rollup) {
    if (policy.rollup_preset != null) next.rollup_preset = policy.rollup_preset;
    if (policy.exam_weight !== undefined && policy.exam_weight !== null) {
      next.exam_weight = policy.exam_weight;
    }
  } else {
    if (policy.rollup_preset != null) next.rollup_preset = policy.rollup_preset;
    if (policy.exam_weight != null) next.exam_weight = policy.exam_weight;
  }
  if (locks.book_mode && policy.book_mode) next.book_mode = policy.book_mode;
  else if (!locks.book_mode && policy.book_mode) next.book_mode = policy.book_mode;
  if (locks.floor && policy.floor != null) next.floor = policy.floor;
  else if (!locks.floor && policy.floor != null) next.floor = policy.floor;
  if (locks.late && policy.late_rule) next.late_rule = policy.late_rule;
  else if (!locks.late && policy.late_rule) next.late_rule = policy.late_rule;
  if (policy.missing_rule) next.missing_rule = policy.missing_rule;
  if (locks.engine && policy.engine) next.engine = policy.engine;
  else if (!locks.engine && policy.engine) next.engine = policy.engine;
  if (policy.extra_credit_method) next.extra_credit_method = policy.extra_credit_method;
  return next;
}

/**
 * After merging class row + school policy, re-assert locked scalars so a null class
 * column cannot wipe the school rollup/exam (or other locked) value on load or save.
 */
export function applyLockedFieldValues(
  draft: SyllabusWizardDraft,
  schoolPolicy?: Parameters<typeof applySchoolPolicyDefaults>[1],
): SyllabusWizardDraft {
  const locks = draft.locks;
  let next = draft;
  if (locks.rollup) {
    const schoolPreset = schoolPolicy?.rollup_preset;
    const schoolExam = schoolPolicy?.exam_weight;
    next = {
      ...next,
      rollup_preset: next.rollup_preset ?? schoolPreset ?? null,
      exam_weight: next.exam_weight ?? schoolExam ?? null,
    };
  }
  if (locks.engine && schoolPolicy?.engine) {
    next = { ...next, engine: next.engine || schoolPolicy.engine };
  }
  if (locks.book_mode && schoolPolicy?.book_mode) {
    next = { ...next, book_mode: next.book_mode || schoolPolicy.book_mode };
  }
  if (locks.floor && next.floor == null && schoolPolicy?.floor != null) {
    next = { ...next, floor: schoolPolicy.floor };
  }
  if (locks.late && schoolPolicy?.late_rule && (!next.late_rule || next.late_rule.type === 'none')) {
    // only fill when class still has the default "none" and school provided a rule
    if (!draft.late_rule || draft.late_rule.type === 'none') {
      next = { ...next, late_rule: schoolPolicy.late_rule };
    }
  }
  return next;
}

export function draftFromBundle(input: {
  classId: string;
  syllabus: ClassSyllabusDraft | null;
  categories: SyllabusCategoryDraft[];
  schoolPolicy?: Parameters<typeof applySchoolPolicyDefaults>[1];
}): SyllabusWizardDraft {
  const base = createEmptyWizardDraft(input.classId);
  const withPolicy = applySchoolPolicyDefaults(base, input.schoolPolicy ?? null);
  if (!input.syllabus) {
    if (input.categories.length) withPolicy.categories = input.categories;
    return applyLockedFieldValues(withPolicy, input.schoolPolicy ?? null);
  }
  const s = input.syllabus;
  const locks = parseLocks({ ...withPolicy.locks, ...(s.locks ?? {}) });
  const merged: SyllabusWizardDraft = {
    ...withPolicy,
    title: s.title ?? '',
    term_structure: s.term_structure,
    active_term: s.active_term,
    policies: { ...defaultPolicies(), ...s.policies },
    categories: input.categories.length ? input.categories : withPolicy.categories,
    engine: s.engine,
    within_category: s.within_category,
    book_mode: s.book_mode,
    extra_credit_method: s.extra_credit_method,
    ec_cap: s.ec_cap,
    late_rule: s.late_rule ?? { type: 'none' },
    missing_rule: s.missing_rule,
    rounding: s.rounding,
    floor: s.floor,
    ceiling: s.ceiling,
    retake: s.retake ?? null,
    // Prefer stored; locked nulls fall back to school in applyLockedFieldValues.
    exam_weight: s.exam_weight,
    rollup_preset: s.rollup_preset,
    locks,
    lock_reasons: Object.fromEntries(
      (Object.keys(locks) as Array<keyof SyllabusLocks>)
        .filter((k) => locks[k])
        .map((k) => [
          k,
          withPolicy.lock_reasons[k] ?? input.schoolPolicy?.lock_reasons?.[k] ?? LOCK_REASONS[k],
        ]),
    ),
    marking_period_scope: s.marking_period_scope,
    empty_category:
      input.categories.find((c) => c.empty_policy === 'zero')?.empty_policy === 'zero'
        ? 'zero'
        : 'renormalize',
    source: s.source,
    row_version: s.row_version,
    syllabus_status: s.status,
    publish_to_family: s.policies?.publish_to_family !== false && s.publish_to_family !== false,
  };
  return applyLockedFieldValues(merged, input.schoolPolicy ?? null);
}

export function applyAskImport(
  draft: SyllabusWizardDraft,
  applied: {
    title: string | null;
    term_structure: ClassSyllabusDraft['term_structure'];
    active_term: string | null;
    policies: SyllabusPolicies;
    categories: SyllabusCategoryDraft[];
  },
): SyllabusWizardDraft {
  const next = { ...draft, source: 'ask_import' as const };
  if (applied.title) next.title = applied.title;
  next.term_structure = applied.term_structure;
  next.active_term = applied.active_term;
  next.policies = { ...draft.policies, ...applied.policies };
  if (applied.categories.length) next.categories = applied.categories;
  if (applied.policies.missing_as_zero === true) next.missing_rule = 'zero';
  if (applied.policies.min_floor_percent != null) {
    next.floor = Number(applied.policies.min_floor_percent);
  }
  if (applied.policies.rounding) {
    const r = String(applied.policies.rounding);
    if (r === 'nearest_whole' || r === 'half_up' || r === 'truncate' || r === 'none') {
      next.rounding = r;
    }
  }
  return next;
}

export function setWizardStep(draft: SyllabusWizardDraft, step: WizardStepId): SyllabusWizardDraft {
  const next = step === 'within' ? 'engine' : step;
  return { ...draft, step: next };
}

export function visibleSteps(draft: SyllabusWizardDraft): WizardStepId[] {
  const opt = engineOption(draft.engine);
  return WIZARD_STEPS.filter((id) => {
    if (id === 'within') return false;
    if (id === 'categories') return opt.needsCategories;
    return true;
  });
}

/** Resolve a draft.step that may be legacy `within` or hidden for the engine. */
export function resolveWizardStep(draft: SyllabusWizardDraft): WizardStepId {
  const steps = visibleSteps(draft);
  if (draft.step === 'within') return steps.includes('engine') ? 'engine' : steps[0]!;
  if (steps.includes(draft.step)) return draft.step;
  return steps[0]!;
}

export function soFarSummary(draft: SyllabusWizardDraft): string {
  const eng = engineOption(draft.engine).label;
  const split = splitWeights(draft.categories, draft.extra_credit_method);
  const cats = isWeightedEngine(draft.engine)
    ? `${draft.categories.filter((c) => c.active).length} categories adding to ${split.regular}%${
        split.extraCredit > 0 ? ` + ${split.extraCredit}% extra credit` : ''
      }`
    : 'no category weights';
  const miss =
    draft.missing_rule === 'zero'
      ? 'missing work counts as 0'
      : draft.missing_rule === 'floor'
        ? 'missing work gets the lowest grade allowed'
        : "missing work doesn't count yet";
  const ec =
    draft.extra_credit_method === 'A'
      ? 'extra credit raises a score'
      : draft.extra_credit_method === 'C'
        ? 'extra credit has its own category'
        : 'extra credit adds bonus points';
  const book = draft.book_mode === 'rolling_year' ? 'one average all year' : 'fresh start each grading period';
  return `${eng} · ${cats} · ${ec} · ${miss} · ${book}`;
}

export function isFieldLocked(draft: SyllabusWizardDraft, field: keyof SyllabusLocks): boolean {
  return draft.locks[field] === true;
}

export function patchDraft(
  draft: SyllabusWizardDraft,
  partial: Partial<SyllabusWizardDraft>,
  opts?: { force?: boolean },
): SyllabusWizardDraft {
  const next = { ...draft, ...partial };
  if (!opts?.force) {
    if (isFieldLocked(draft, 'engine') && partial.engine !== undefined) next.engine = draft.engine;
    if (isFieldLocked(draft, 'categories') && partial.categories !== undefined) {
      next.categories = draft.categories;
    }
    if (isFieldLocked(draft, 'late') && partial.late_rule !== undefined) next.late_rule = draft.late_rule;
    if (isFieldLocked(draft, 'floor') && partial.floor !== undefined) next.floor = draft.floor;
    if (isFieldLocked(draft, 'drop_lowest') && partial.categories !== undefined) {
      // keep drop_lowest_n from locked cats
      next.categories = draft.categories;
    }
    if (isFieldLocked(draft, 'book_mode') && partial.book_mode !== undefined) {
      next.book_mode = draft.book_mode;
    }
    // scale has no teacher-editable draft field; lock is display-only here
    if (
      isFieldLocked(draft, 'rollup') &&
      (partial.rollup_preset !== undefined || partial.exam_weight !== undefined)
    ) {
      next.rollup_preset = draft.rollup_preset;
      next.exam_weight = draft.exam_weight;
    }
    // Generic lock keys for GB-15 fields (retake / assignment_max) if present on draft bag.
    if (isFieldLocked(draft, 'retake') && (partial as Record<string, unknown>).retake !== undefined) {
      (next as Record<string, unknown>).retake = (draft as Record<string, unknown>).retake;
    }
    if (
      isFieldLocked(draft, 'assignment_max') &&
      (partial as Record<string, unknown>).assignment_max !== undefined
    ) {
      (next as Record<string, unknown>).assignment_max = (draft as Record<string, unknown>).assignment_max;
    }
  }
  // Keep within_category aligned with engine choice when unlocked.
  if (partial.engine && !isFieldLocked(draft, 'engine')) {
    if (partial.engine === 'weighted_points_inside') next.within_category = 'points_inside';
    else if (partial.engine === 'weighted_percent_inside') next.within_category = 'percent_inside';
  }
  if (partial.within_category === 'points_inside' && next.engine === 'weighted_percent_inside') {
    next.engine = 'weighted_points_inside';
  }
  if (partial.within_category === 'percent_inside' && next.engine === 'weighted_points_inside') {
    next.engine = 'weighted_percent_inside';
  }
  // Mirror policies for legacy consumers.
  next.policies = {
    ...next.policies,
    missing_as_zero: next.missing_rule === 'zero',
    min_floor_percent: next.floor,
    rounding: next.rounding === 'none' ? 'nearest_whole' : (next.rounding as SyllabusPolicies['rounding']),
    extra_credit_allowed: next.extra_credit_method !== 'A' || next.policies.extra_credit_allowed === true
      ? next.extra_credit_method !== 'A'
        ? true
        : next.policies.extra_credit_allowed
      : false,
    publish_to_family: next.publish_to_family,
  };
  if (next.extra_credit_method === 'B' || next.extra_credit_method === 'C') {
    next.policies = { ...next.policies, extra_credit_allowed: true };
  }
  return next;
}

export function patchCategory(
  draft: SyllabusWizardDraft,
  key: string,
  partial: Partial<SyllabusCategoryDraft>,
): SyllabusWizardDraft {
  if (isFieldLocked(draft, 'categories')) return draft;
  if (isFieldLocked(draft, 'drop_lowest') && partial.rules) {
    partial = {
      ...partial,
      rules: {
        ...partial.rules,
        drop_lowest_n:
          draft.categories.find((c) => c.key === key)?.rules.drop_lowest_n ??
          partial.rules.drop_lowest_n,
      },
    };
  }
  return {
    ...draft,
    categories: draft.categories.map((c) => (c.key === key ? { ...c, ...partial } : c)),
  };
}

export function addCategory(
  draft: SyllabusWizardDraft,
  seed?: { key?: string; label?: string; weight_percent?: number },
): SyllabusWizardDraft {
  if (isFieldLocked(draft, 'categories')) return draft;
  const used = new Set(draft.categories.map((c) => c.key));
  const label = seed?.label || 'Other';
  const key =
    seed?.key && !used.has(seed.key) ? seed.key : slugCategoryKey(label, used);
  const row = {
    ...emptyCategory(label, key, draft.categories.length),
    weight_percent: seed?.weight_percent ?? 0,
    default_include_in_average: true,
    empty_policy: draft.empty_category,
  };
  return { ...draft, categories: [...draft.categories, row] };
}

export function removeCategory(draft: SyllabusWizardDraft, key: string): SyllabusWizardDraft {
  if (isFieldLocked(draft, 'categories')) return draft;
  return { ...draft, categories: draft.categories.filter((c) => c.key !== key) };
}

export function setEmptyCategoryPolicy(
  draft: SyllabusWizardDraft,
  policy: 'renormalize' | 'zero',
): SyllabusWizardDraft {
  return {
    ...draft,
    empty_category: policy,
    categories: draft.categories.map((c) => ({ ...c, empty_policy: policy })),
  };
}

/**
 * FR-FORM-T02: regular weights total 100±0.01 (non-weighted engines skip this).
 * With extra credit as its own category (method C), only that category may push the
 * total over 100%. Same rule as the client publish check and the publish RPC.
 */
export function weightsOk(draft: SyllabusWizardDraft): boolean {
  if (!isWeightedEngine(draft.engine)) return true;
  const active = draft.categories.filter((c) => c.active);
  if (!active.length) return false;
  if (active.some((c) => !c.label.trim())) return false;
  return weightsTotalOk(draft.categories, draft.extra_credit_method);
}

const pct = (n: number) => `${Math.round(Number(n || 0) * 1000) / 1000}%`;

/** Plain words for a weight total that isn't 100%, naming each active category. */
export function weightsTotalMessage(draft: SyllabusWizardDraft, sum = activeWeightSum(draft.categories)): string {
  const total = Math.round(sum * 1000) / 1000;
  const active = draft.categories.filter((c) => c.active);
  const name = (c: SyllabusCategoryDraft) => c.label.trim() || 'Unnamed';
  const split = splitWeights(draft.categories, draft.extra_credit_method);
  if (split.extraCredit > 0) {
    const regular = active.filter((c) => !isExtraCreditCategory(c));
    const parts = regular.map((c) => `${name(c)} ${pct(c.weight_percent)}`).join(' + ');
    const detail = regular.length > 1 ? ` (${parts})` : '';
    return `Your regular category weights add up to ${split.regular}%${detail}. Change them so they total 100% before you publish. Extra credit (${split.extraCredit}%) is added on top.`;
  }
  const parts = active.map((c) => `${name(c)} ${pct(c.weight_percent)}`).join(' + ');
  const detail = active.length > 1 ? ` (${parts})` : '';
  const ec = active.filter((c) => isExtraCreditCategory(c));
  const ecSum = ec.reduce((s2, c) => s2 + Number(c.weight_percent || 0), 0);
  if (ec.length && Math.abs(total - ecSum - 100) <= 0.01) {
    return `Your category weights add up to ${total}%${detail}. To count ${ec.map(name).join(' and ')} on top of 100%, choose “Extra credit has its own category” on the Extra credit & retakes step. Otherwise change the weights so they total 100% before you publish.`;
  }
  return `Your category weights add up to ${total}%${detail}. Change them so they total 100% before you publish.`;
}

export function validateWizard(draft: SyllabusWizardDraft): WizardIssue[] {
  const issues: WizardIssue[] = [];
  if (!draft.engine) {
    issues.push({ path: 'engine', severity: 'error', message: 'Choose how grades add up.', step: 'engine' });
  }
  if (isWeightedEngine(draft.engine)) {
    const sum = activeWeightSum(draft.categories);
    if (!weightsOk(draft)) {
      issues.push({
        path: 'categories.weight_percent',
        severity: 'error',
        message: weightsTotalMessage(draft, sum),
        step: 'categories',
      });
    }
    if (draft.categories.filter((c) => c.active).length === 0) {
      issues.push({
        path: 'categories',
        severity: 'error',
        message: 'Add at least one category.',
        step: 'categories',
      });
    }
  }
  if (draft.late_rule.type !== 'none' && (draft.late_rule.amount == null || Number(draft.late_rule.amount) < 0)) {
    issues.push({
      path: 'late_rule.amount',
      severity: 'error',
      message: 'Enter a late penalty of 0 or more.',
      step: 'status_late',
    });
  }
  if (draft.missing_rule === 'floor' && (draft.floor == null || draft.floor < 0)) {
    issues.push({
      path: 'floor',
      severity: 'warning',
      message: 'You chose to give missing work the lowest grade allowed. Set that lowest grade on the Drop lowest step.',
      step: 'status_late',
    });
  }
  if (draft.engine === 'none') {
    issues.push({
      path: 'engine',
      severity: 'warning',
      message: 'No overall grade: averages will show NG (no grade).',
      step: 'engine',
    });
  }
  return issues;
}

export function hardErrors(issues: WizardIssue[]): WizardIssue[] {
  return issues.filter((i) => i.severity === 'error');
}

export function canFinishReview(draft: SyllabusWizardDraft): boolean {
  return hardErrors(validateWizard(draft)).length === 0;
}

/**
 * AVG T-S7 / teacher-ui §7.1: Save draft is lenient — incomplete weights are a
 * warning, not a block. Publish still uses canFinishReview (strict sum = 100%).
 * Only block empty labels on active weighted categories (server rejects those).
 */
export function canSaveDraft(draft: SyllabusWizardDraft): boolean {
  if (draft.syllabus_status === 'published') return false;
  if (!isWeightedEngine(draft.engine)) return true;
  return !draft.categories.some((c) => c.active && !c.label.trim());
}

/**
 * Build the save/publish editor bag. Locked scalars are carried from the draft as-is
 * (load path already merged school + stored). Optional `baseline` forces locked keys
 * back to a prior stored snapshot when the teacher never edited them.
 */
export function toEditorInput(
  draft: SyllabusWizardDraft,
  baseline?: {
    engine?: SyllabusEngine | null;
    book_mode?: BookMode | null;
    floor?: number | null;
    late_rule?: LateRule | null;
    retake?: RetakeRule | null;
    exam_weight?: number | null;
    rollup_preset?: string | null;
    categories?: SyllabusCategoryDraft[];
  } | null,
) {
  const cats = draft.categories.map((c, i) => ({
    ...c,
    sort_order: c.sort_order ?? i,
    empty_policy: c.empty_policy ?? draft.empty_category,
  }));
  // Local import-free carry-forward: when locked, prefer baseline then draft.
  const pick = <T,>(locked: boolean, base: T | undefined, cur: T): T => {
    if (!locked) return cur;
    if (base !== undefined) return base;
    return cur;
  };
  const engine = pick(isFieldLocked(draft, 'engine'), baseline?.engine ?? undefined, draft.engine);
  const book_mode = pick(
    isFieldLocked(draft, 'book_mode'),
    baseline?.book_mode ?? undefined,
    draft.book_mode,
  );
  const floor = pick(isFieldLocked(draft, 'floor'), baseline?.floor ?? undefined, draft.floor);
  const late_rule = pick(
    isFieldLocked(draft, 'late'),
    baseline?.late_rule ?? undefined,
    draft.late_rule,
  );
  const retake = pick(isFieldLocked(draft, 'retake'), baseline?.retake ?? undefined, draft.retake);
  const exam_weight = pick(
    isFieldLocked(draft, 'rollup'),
    baseline?.exam_weight ?? undefined,
    draft.exam_weight,
  );
  const rollup_preset = pick(
    isFieldLocked(draft, 'rollup'),
    baseline?.rollup_preset ?? undefined,
    draft.rollup_preset,
  );
  const categories = pick(
    isFieldLocked(draft, 'categories'),
    baseline?.categories ?? undefined,
    cats,
  );
  return {
    title: draft.title.trim() || null,
    term_structure: draft.term_structure,
    active_term: draft.active_term,
    policies: {
      ...draft.policies,
      missing_as_zero: draft.missing_rule === 'zero',
      min_floor_percent: floor,
      publish_to_family: draft.publish_to_family,
      extra_credit_allowed: draft.extra_credit_method !== 'A' ? true : Boolean(draft.policies.extra_credit_allowed),
    },
    categories,
    source: draft.source,
    engine,
    within_category:
      engine === 'weighted_points_inside'
        ? ('points_inside' as WithinCategory)
        : engine === 'weighted_percent_inside'
          ? ('percent_inside' as WithinCategory)
          : draft.within_category,
    book_mode,
    extra_credit_method: draft.extra_credit_method,
    ec_cap: draft.ec_cap,
    late_rule,
    missing_rule: draft.missing_rule,
    rounding: draft.rounding,
    floor,
    ceiling: draft.ceiling,
    retake,
    exam_weight,
    rollup_preset,
    locks: draft.locks as unknown as Record<string, unknown>,
    marking_period_scope: draft.marking_period_scope,
  };
}

/** “Quizzes” → “quiz”, “Homework” → “homework” (for “Drops the lowest 1 quiz”). */
export function singularLabel(label: string): string {
  const t = label.trim().toLowerCase();
  if (t.endsWith('zzes')) return t.slice(0, -3);
  if (t.endsWith('ies')) return `${t.slice(0, -3)}y`;
  if (/(ches|shes|xes|sses)$/.test(t)) return t.slice(0, -2);
  if (t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
  return t;
}

/** Plain retake sentence for the Review step and families. */
export function retakeSentence(draft: SyllabusWizardDraft): string {
  const r = draft.retake;
  if (!r) return 'No retakes.';
  const n = Math.max(1, Number(r.attempts ?? 1));
  const cats = (r.eligible_category_ids ?? []).map(
    (k) => draft.categories.find((c) => c.key === k)?.label ?? k,
  );
  const on = cats.length ? ` on ${cats.join(', ')}` : '';
  const how =
    r.method === 'replace'
      ? 'the new score replaces the old one'
      : r.method === 'average'
        ? 'the scores are averaged'
        : 'the higher score counts';
  const cap = r.cap != null ? `, up to ${r.cap}%` : '';
  const win = r.window_days != null ? ` Retakes must be done within ${r.window_days} days.` : '';
  return `Retakes: ${n === 1 ? 'one retake' : `${n} retakes`}${on}; ${how}${cap}.${win}`;
}

export function parentFacingParagraph(draft: SyllabusWizardDraft): string {
  const eng = engineOption(draft.engine);
  const lines: string[] = [];
  lines.push(draft.title.trim() || 'Class grading policy');
  lines.push('');
  lines.push(`How the average is calculated: ${eng.plain}`);
  if (isWeightedEngine(draft.engine)) {
    const parts = draft.categories
      .filter((c) => c.active)
      .map((c) => `${c.label} ${Math.round(Number(c.weight_percent) * 1000) / 1000}%`);
    lines.push(`Categories: ${parts.join(', ') || 'none'}.`);
    const drops = draft.categories
      .filter((c) => c.active && Number(c.rules?.drop_lowest_n ?? 0) > 0)
      .map((c) => {
        const n = Number(c.rules.drop_lowest_n);
        return `${n} ${n === 1 ? singularLabel(c.label) : c.label.toLowerCase()}`;
      });
    if (drops.length) lines.push(`Drops the lowest ${drops.join(' and the lowest ')}.`);
  }
  const miss =
    draft.missing_rule === 'zero'
      ? 'Missing work counts as zero.'
      : draft.missing_rule === 'floor'
        ? `Missing work gets the lowest grade allowed${draft.floor != null ? ` (${draft.floor}%)` : ''}.`
        : "Missing work doesn't count until it is graded.";
  lines.push(miss);
  lines.push('Excused work is never a zero.');
  if (draft.late_rule.type === 'none') lines.push('Late penalties are applied by the teacher when needed.');
  else {
    const amt = `${draft.late_rule.amount ?? ''}${draft.late_rule.unit === 'points' ? ' points' : '%'}`;
    const when =
      draft.late_rule.type === 'per_day' ? ' for each day late' : draft.late_rule.type === 'per_hour' ? ' for each hour late' : '';
    lines.push(`Late work loses ${amt}${when}.`);
  }
  if (draft.extra_credit_method === 'B') {
    lines.push('Extra credit adds to earned points without penalizing students who skip it.');
  } else if (draft.extra_credit_method === 'C') {
    lines.push('Extra credit has its own category.');
    const onTop = extraCreditOnTopSentence(draft.categories, draft.extra_credit_method);
    if (onTop) lines.push(onTop);
  } else {
    lines.push('Extra credit can raise or replace a score on existing work.');
  }
  lines.push(retakeSentence(draft));
  lines.push(
    draft.book_mode === 'rolling_year'
      ? 'Scores roll across the year.'
      : 'Grades start fresh each grading period; the grading periods are then combined into the semester grade.',
  );
  if (draft.rollup_preset) lines.push(`Semester grade: ${rollupPresetLabel(draft.rollup_preset)}.`);
  if (draft.exam_weight != null) lines.push(`Exam weight: ${draft.exam_weight}.`);
  return lines.join('\n');
}
