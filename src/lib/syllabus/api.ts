import { requireSupabase } from '@/lib/supabase/client';
import { weightsTotalOk } from '@/lib/syllabus/extraCreditWeights';
import {
  computeSyllabusAverage,
  partitionMissingUpcoming,
  plainSyllabusRules,
  type AverageAssignment,
  type AverageCell,
  type CategoryRules,
  type SyllabusAverageResult,
  type SyllabusCategoryInput,
  type SyllabusPolicies,
} from '@/lib/grade/syllabusAverage';
import { GRADE_KINDS, type GradeKind } from '@/lib/grade/marks';
import {
  buildSyllabusVersionSnapshot,
  defaultSyllabusV2Fields,
  parseLateRule,
  parseSyllabusRetake,
  type BookMode,
  type ExtraCreditMethod,
  type MissingRule,
  type SyllabusEngine,
  type SyllabusRounding,
  type SyllabusV2Fields,
  type SyllabusVersionSnapshot,
  type WithinCategory,
} from '@/lib/syllabus/types';
import type { RetakeRule } from '@/lib/grade/engine/types';
import {
  buildSchoolLockPolicy,
  carryForwardLockedFields,
  parseLocks,
} from '@/lib/syllabus/locks';

export type SyllabusStatus = 'draft' | 'published' | 'archived';

export type {
  BookMode,
  ExtraCreditMethod,
  MissingRule,
  SyllabusEngine,
  SyllabusRounding,
  SyllabusV2Fields,
  SyllabusVersionSnapshot,
  WithinCategory,
};
export { buildSyllabusVersionSnapshot, defaultSyllabusV2Fields, parseLateRule };

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
  status: SyllabusStatus;
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
  late_rule: SyllabusV2Fields['late_rule'];
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

export type ClassSyllabusBundle = {
  exists: boolean;
  syllabus: ClassSyllabusDraft | null;
  categories: SyllabusCategoryDraft[];
};

export type PublishedFamilySyllabus = {
  ok: boolean;
  published: boolean;
  title?: string | null;
  calc_mode?: string;
  term_structure?: string;
  active_term?: string | null;
  categories?: Array<{
    key: string;
    label: string;
    weight_percent: number;
    sort_order: number;
    rules?: CategoryRules;
    drop_highest_n?: number;
    keep_highest_n?: number | null;
    droppable?: boolean;
    never_drop_flags?: string[];
    empty_policy?: 'renormalize' | 'zero' | null;
    min_grades_per_term?: number | null;
  }>;
  policies_public?: SyllabusPolicies;
  engine?: SyllabusEngine;
  within_category?: WithinCategory | null;
  book_mode?: BookMode;
  extra_credit_method?: ExtraCreditMethod;
  ec_cap?: number | null;
  late_rule?: SyllabusV2Fields['late_rule'];
  missing_rule?: MissingRule;
  rounding?: SyllabusRounding;
  floor?: number | null;
  ceiling?: number | null;
  exam_weight?: number | null;
  rollup_preset?: string | null;
  syllabus_version?: number;
  marking_period_scope?: string | null;
  reason?: string;
};

export type AverageExplainPayload = {
  ok: boolean;
  reason?: string;
  student_id?: string;
  class_id?: string;
  syllabus?: PublishedFamilySyllabus;
  assignments?: AverageAssignment[];
  cells?: Array<{
    assignment_id: string;
    approved_score: number | null;
    score_mark: string | null;
    status: string | null;
    approved_at: string | null;
    raw_points?: number | null;
    late_applied_at?: string | null;
    grade_status?: string | null;
  }>;
  engine_breakdown?: Record<string, unknown>;
};

const KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;

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

export function seedCategoriesFromGradeKinds(existingKeys: Set<string> = new Set()): SyllabusCategoryDraft[] {
  const used = new Set(existingKeys);
  return GRADE_KINDS.filter((row) => !used.has(row.key)).map((row, index) => {
    used.add(row.key);
    return emptyCategory(row.label, row.key, index);
  });
}

export function activeWeightSum(categories: SyllabusCategoryDraft[]): number {
  return categories.filter((c) => c.active).reduce((sum, c) => sum + Number(c.weight_percent || 0), 0);
}

/**
 * Same rule as publish_class_syllabus: regular weights total 100%; with extra credit as its
 * own category (method C) only that category may push the total over 100%.
 */
export function weightsValidForPublish(
  categories: SyllabusCategoryDraft[],
  extraCreditMethod?: ExtraCreditMethod | null,
): boolean {
  const active = categories.filter((c) => c.active);
  if (!active.length) return false;
  if (active.some((c) => !c.label.trim() || !KEY_RE.test(c.key))) return false;
  const keys = new Set(active.map((c) => c.key));
  if (keys.size !== active.length) return false;
  return weightsTotalOk(categories, extraCreditMethod ?? null);
}

function asSyllabus(row: Record<string, unknown> | null | undefined, classId: string): ClassSyllabusDraft | null {
  if (!row) return null;
  const d = defaultSyllabusV2Fields();
  const engineRaw = String(row.engine ?? d.engine);
  const engine = (
    ['total_points', 'weighted_points_inside', 'weighted_percent_inside', 'item_weights', 'none'].includes(engineRaw)
      ? engineRaw
      : d.engine
  ) as SyllabusEngine;
  const bookRaw = String(row.book_mode ?? d.book_mode);
  const book_mode = (
    bookRaw === 'rolling_year' ? 'rolling_year' : 'reset_each_marking_period'
  ) as BookMode;
  const ecm = String(row.extra_credit_method ?? d.extra_credit_method);
  const extra_credit_method = (ecm === 'A' || ecm === 'C' ? ecm : 'B') as ExtraCreditMethod;
  const miss = String(row.missing_rule ?? d.missing_rule);
  const missing_rule = (miss === 'zero' || miss === 'floor' ? miss : 'omit') as MissingRule;
  const rnd = String(row.rounding ?? d.rounding);
  const rounding = (
    rnd === 'half_up' || rnd === 'truncate' || rnd === 'none' ? rnd : 'nearest_whole'
  ) as SyllabusRounding;
  const within = row.within_category == null ? null : String(row.within_category);
  return {
    id: String(row.id ?? ''),
    class_id: String(row.class_id ?? classId),
    status: (row.status as SyllabusStatus) || 'draft',
    title: (row.title as string | null) ?? null,
    calc_mode: String(row.calc_mode ?? 'category_weight'),
    term_structure: (row.term_structure as ClassSyllabusDraft['term_structure']) || 'year',
    active_term: (row.active_term as string | null) ?? null,
    policies: { ...defaultPolicies(), ...((row.policies as SyllabusPolicies) ?? {}) },
    terms: Array.isArray(row.terms) ? row.terms : [],
    source: (row.source as ClassSyllabusDraft['source']) || 'manual',
    source_asset_id: (row.source_asset_id as string | null) ?? null,
    ask_draft: (row.ask_draft as Record<string, unknown> | null) ?? null,
    publish_to_family: row.publish_to_family !== false,
    published_at: (row.published_at as string | null) ?? null,
    row_version: Number(row.row_version ?? 1),
    updated_at: row.updated_at as string | undefined,
    engine,
    within_category:
      within === 'points_inside' || within === 'percent_inside' ? within : null,
    book_mode,
    extra_credit_method,
    ec_cap: row.ec_cap == null ? null : Number(row.ec_cap),
    late_rule: parseLateRule(row.late_rule),
    missing_rule,
    rounding,
    floor: row.floor == null ? null : Number(row.floor),
    ceiling: row.ceiling == null ? null : Number(row.ceiling),
    retake: parseSyllabusRetake(row.retake),
    exam_weight: row.exam_weight == null ? null : Number(row.exam_weight),
    rollup_preset: (row.rollup_preset as string | null) ?? null,
    syllabus_version: Number(row.syllabus_version ?? 1),
    locks:
      row.locks && typeof row.locks === 'object' && !Array.isArray(row.locks)
        ? (row.locks as Record<string, unknown>)
        : {},
    marking_period_scope: (row.marking_period_scope as string | null) ?? null,
  };
}

function asCategory(row: Record<string, unknown>): SyllabusCategoryDraft {
  const rules = (row.rules as CategoryRules) ?? {};
  const flags = row.never_drop_flags;
  return {
    id: row.id ? String(row.id) : undefined,
    key: String(row.key ?? 'other'),
    label: String(row.label ?? 'Other'),
    weight_percent: Number(row.weight_percent ?? 0),
    sort_order: Number(row.sort_order ?? 0),
    active: row.active !== false,
    group: (row.group as SyllabusCategoryDraft['group']) ?? null,
    default_include_in_average: row.default_include_in_average === true,
    min_grades_per_term: row.min_grades_per_term == null ? null : Number(row.min_grades_per_term),
    rules: {
      drop_lowest_n: Number(rules.drop_lowest_n ?? 0),
      replace_lowest_with_makeup: {
        enabled: Boolean(rules.replace_lowest_with_makeup?.enabled),
        makeup_category_key: rules.replace_lowest_with_makeup?.makeup_category_key,
        cap_percent: rules.replace_lowest_with_makeup?.cap_percent ?? null,
        max_replacements: rules.replace_lowest_with_makeup?.max_replacements ?? 1,
      },
    },
    drop_highest_n: Math.max(0, Number(row.drop_highest_n ?? 0)),
    keep_highest_n: row.keep_highest_n == null ? null : Number(row.keep_highest_n),
    droppable: row.droppable !== false,
    never_drop_flags: Array.isArray(flags) ? flags.map(String) : [],
    empty_policy:
      row.empty_policy === 'renormalize' || row.empty_policy === 'zero'
        ? row.empty_policy
        : null,
  };
}

export async function getClassSyllabus(classId: string): Promise<ClassSyllabusBundle> {
  const { data, error } = await requireSupabase().rpc('get_class_syllabus', { p_class_id: classId });
  if (error) throw error;
  const payload = (data ?? {}) as Record<string, unknown>;
  if (!payload.exists) {
    return { exists: false, syllabus: null, categories: [] };
  }
  const syllabus = asSyllabus(payload.syllabus as Record<string, unknown>, classId);
  const categories = Array.isArray(payload.categories)
    ? (payload.categories as Record<string, unknown>[]).map(asCategory)
    : [];
  return { exists: true, syllabus, categories };
}

function payloadFromEditor(input: {
  title: string | null;
  term_structure: ClassSyllabusDraft['term_structure'];
  active_term: string | null;
  policies: SyllabusPolicies;
  categories: SyllabusCategoryDraft[];
  source?: ClassSyllabusDraft['source'];
  terms?: unknown[];
  engine?: SyllabusEngine;
  within_category?: WithinCategory | null;
  book_mode?: BookMode;
  extra_credit_method?: ExtraCreditMethod;
  ec_cap?: number | null;
  late_rule?: SyllabusV2Fields['late_rule'];
  missing_rule?: MissingRule;
  rounding?: SyllabusRounding;
  floor?: number | null;
  ceiling?: number | null;
  retake?: RetakeRule | null;
  exam_weight?: number | null;
  rollup_preset?: string | null;
  locks?: Record<string, unknown>;
  marking_period_scope?: string | null;
  /** When set, locked scalars are forced to this snapshot (class row / school). */
  locked_baseline?: {
    engine?: SyllabusEngine | null;
    book_mode?: BookMode | null;
    floor?: number | null;
    late_rule?: SyllabusV2Fields['late_rule'] | null;
    retake?: RetakeRule | null;
    exam_weight?: number | null;
    rollup_preset?: string | null;
    categories?: SyllabusCategoryDraft[];
  } | null;
}) {
  const d = defaultSyllabusV2Fields();
  const locks = parseLocks(input.locks);
  const policy = buildSchoolLockPolicy({
    locks,
    values: {
      engine: input.locked_baseline?.engine ?? input.engine ?? null,
      book_mode: input.locked_baseline?.book_mode ?? input.book_mode ?? null,
      floor: input.locked_baseline?.floor ?? input.floor ?? null,
      late_rule: input.locked_baseline?.late_rule ?? input.late_rule ?? null,
      retake: input.locked_baseline?.retake ?? input.retake ?? null,
      exam_weight: input.locked_baseline?.exam_weight ?? input.exam_weight ?? null,
      rollup_preset: input.locked_baseline?.rollup_preset ?? input.rollup_preset ?? null,
      categories: input.locked_baseline?.categories ?? input.categories,
    },
  });
  const proposed = {
    engine: input.engine ?? d.engine,
    within_category: input.within_category ?? d.within_category,
    book_mode: input.book_mode ?? d.book_mode,
    extra_credit_method: input.extra_credit_method ?? d.extra_credit_method,
    ec_cap: input.ec_cap ?? null,
    late_rule: input.late_rule ?? d.late_rule,
    missing_rule: input.missing_rule ?? d.missing_rule,
    rounding: input.rounding ?? d.rounding,
    floor: input.floor ?? null,
    ceiling: input.ceiling ?? null,
    retake: input.retake ?? null,
    exam_weight: input.exam_weight ?? null,
    rollup_preset: input.rollup_preset ?? null,
    categories: input.categories,
  };
  const baseline = {
    engine: input.locked_baseline?.engine ?? input.engine ?? d.engine,
    book_mode: input.locked_baseline?.book_mode ?? input.book_mode ?? d.book_mode,
    floor: input.locked_baseline?.floor ?? input.floor ?? null,
    late_rule: input.locked_baseline?.late_rule ?? input.late_rule ?? d.late_rule,
    retake: input.locked_baseline?.retake ?? input.retake ?? null,
    exam_weight: input.locked_baseline?.exam_weight ?? input.exam_weight ?? null,
    rollup_preset: input.locked_baseline?.rollup_preset ?? input.rollup_preset ?? null,
    categories: input.locked_baseline?.categories ?? input.categories,
  };
  const carried = carryForwardLockedFields(proposed, baseline, policy);
  return {
    title: input.title,
    term_structure: input.term_structure,
    active_term: input.active_term,
    policies: {
      ...defaultPolicies(),
      ...input.policies,
      publish_to_family: input.policies.publish_to_family !== false,
    },
    terms: input.terms ?? [],
    source: input.source ?? 'manual',
    engine: carried.engine ?? d.engine,
    within_category: proposed.within_category,
    book_mode: (carried.book_mode as BookMode) ?? d.book_mode,
    extra_credit_method: proposed.extra_credit_method,
    ec_cap: proposed.ec_cap,
    late_rule: (carried.late_rule as SyllabusV2Fields['late_rule']) ?? d.late_rule,
    missing_rule: proposed.missing_rule,
    rounding: proposed.rounding,
    floor: (carried.floor as number | null) ?? null,
    ceiling: proposed.ceiling,
    retake: (carried.retake as RetakeRule | null) ?? null,
    exam_weight: (carried.exam_weight as number | null) ?? null,
    rollup_preset: (carried.rollup_preset as string | null) ?? null,
    locks: input.locks ?? {},
    marking_period_scope: input.marking_period_scope ?? null,
    categories: (Array.isArray(carried.categories) ? carried.categories : input.categories).map(
      (c, index) => ({
        key: c.key,
        label: c.label.trim(),
        weight_percent: Number(c.weight_percent),
        sort_order: c.sort_order ?? index,
        active: c.active !== false,
        group: c.group ?? null,
        default_include_in_average: c.default_include_in_average === true,
        min_grades_per_term: c.min_grades_per_term ?? null,
        rules: c.rules ?? {},
        drop_highest_n: Math.max(0, Number(c.drop_highest_n ?? 0)),
        keep_highest_n: c.keep_highest_n ?? null,
        droppable: c.droppable !== false,
        never_drop_flags: Array.isArray(c.never_drop_flags) ? c.never_drop_flags : [],
        empty_policy: c.empty_policy ?? null,
      }),
    ),
  };
}

type SyllabusEditorInput = {
  title: string | null;
  term_structure: ClassSyllabusDraft['term_structure'];
  active_term: string | null;
  policies: SyllabusPolicies;
  categories: SyllabusCategoryDraft[];
  source?: ClassSyllabusDraft['source'];
  engine?: SyllabusEngine;
  within_category?: WithinCategory | null;
  book_mode?: BookMode;
  extra_credit_method?: ExtraCreditMethod;
  ec_cap?: number | null;
  late_rule?: SyllabusV2Fields['late_rule'];
  missing_rule?: MissingRule;
  rounding?: SyllabusRounding;
  floor?: number | null;
  ceiling?: number | null;
  retake?: RetakeRule | null;
  exam_weight?: number | null;
  rollup_preset?: string | null;
  locks?: Record<string, unknown>;
  marking_period_scope?: string | null;
};

export async function saveClassSyllabusDraft(
  classId: string,
  input: SyllabusEditorInput,
): Promise<void> {
  const { error } = await requireSupabase().rpc('save_class_syllabus_draft', {
    p_class_id: classId,
    p_payload: payloadFromEditor(input),
  });
  if (error) throw error;
}

export async function publishClassSyllabus(
  classId: string,
  rowVersion: number,
  input: SyllabusEditorInput,
): Promise<SyllabusVersionSnapshot> {
  if (!weightsValidForPublish(input.categories, input.extra_credit_method)) {
    throw new Error(
      input.extra_credit_method === 'C'
        ? 'Regular category weights must add up to 100% before publish. Extra credit is added on top.'
        : 'Active category weights must sum to 100% before publish.',
    );
  }
  const payload = payloadFromEditor(input);
  // Pure snapshot for callers/tests; server also inserts syllabus_versions.
  const snapshot = buildSyllabusVersionSnapshot({
    version: 0, // filled after read if needed; client uses next on local preview
    title: input.title,
    policies: input.policies,
    categories: input.categories,
    v2: {
      engine: payload.engine as SyllabusEngine,
      within_category: payload.within_category as WithinCategory | null,
      book_mode: payload.book_mode as BookMode,
      extra_credit_method: payload.extra_credit_method as ExtraCreditMethod,
      ec_cap: payload.ec_cap as number | null,
      late_rule: payload.late_rule as SyllabusV2Fields['late_rule'],
      missing_rule: payload.missing_rule as MissingRule,
      rounding: payload.rounding as SyllabusRounding,
      floor: payload.floor as number | null,
      ceiling: payload.ceiling as number | null,
      retake: (payload.retake as RetakeRule | null) ?? null,
      exam_weight: payload.exam_weight as number | null,
      rollup_preset: payload.rollup_preset as string | null,
      locks: payload.locks as Record<string, unknown>,
      marking_period_scope: payload.marking_period_scope as string | null,
    },
  });
  const { error } = await requireSupabase().rpc('publish_class_syllabus', {
    p_class_id: classId,
    p_payload: payload,
    p_row_version: rowVersion,
  });
  if (error) throw error;
  return snapshot;
}

export async function unpublishClassSyllabus(classId: string, rowVersion: number): Promise<void> {
  const { error } = await requireSupabase().rpc('unpublish_class_syllabus', {
    p_class_id: classId,
    p_row_version: rowVersion,
  });
  if (error) throw error;
}

export async function upsertSyllabusAskDraft(
  classId: string,
  draft: Record<string, unknown>,
  sourceAssetId?: string | null,
): Promise<void> {
  const { error } = await requireSupabase().rpc('upsert_syllabus_ask_draft', {
    p_class_id: classId,
    p_draft: draft,
    p_source_asset_id: sourceAssetId ?? null,
  });
  if (error) throw error;
}

export async function discardSyllabusAskDraft(classId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('discard_syllabus_ask_draft', {
    p_class_id: classId,
  });
  if (error) throw error;
}

export async function loadPublishedClassSyllabus(classId: string): Promise<PublishedFamilySyllabus> {
  const { data, error } = await requireSupabase().rpc('published_class_syllabus', {
    p_class_id: classId,
  });
  if (error) throw error;
  return (data ?? { ok: false }) as PublishedFamilySyllabus;
}

function mapExplain(
  data: AverageExplainPayload,
  termFilter: string,
  workStatusCells: AverageCell[] = [],
): {
  syllabus: PublishedFamilySyllabus;
  average: SyllabusAverageResult;
  ruleLines: string[];
  assignments: AverageAssignment[];
  cells: AverageCell[];
  missing: ReturnType<typeof partitionMissingUpcoming>['missing'];
  upcoming: ReturnType<typeof partitionMissingUpcoming>['upcoming'];
} {
  const syllabus = (data.syllabus ?? { ok: true, published: false }) as PublishedFamilySyllabus;
  const assignments = (data.assignments ?? []).map((row) => {
    const r = row as AverageAssignment & Record<string, unknown>;
    return {
      ...r,
      id: String(r.id),
      title: String(r.title ?? ''),
      category: String(r.category ?? ''),
      max_points: r.max_points == null ? null : Number(r.max_points),
      item_weight: r.item_weight == null ? null : Number(r.item_weight),
      extra_credit: r.extra_credit === true,
      droppable: r.droppable !== false,
      marking_period_id: r.marking_period_id == null ? null : String(r.marking_period_id),
    } as AverageAssignment;
  });
  const approvedCells: AverageCell[] = (data.cells ?? []).map((row) => ({
    assignmentId: row.assignment_id,
    approvedScore: row.approved_score,
    scoreMark:
      row.score_mark === 'pass' || row.score_mark === 'fail' ? row.score_mark : 'numeric',
    approvedAt: row.approved_at,
    status: row.status,
    rawPoints: row.raw_points == null ? null : Number(row.raw_points),
    lateAppliedAt: row.late_applied_at ?? null,
    gradeStatus: row.grade_status ?? null,
  }));

  const categories: SyllabusCategoryInput[] = (syllabus.categories ?? []).map((c) => ({
    key: c.key,
    label: c.label,
    weight_percent: Number(c.weight_percent),
    sort_order: c.sort_order,
    active: true,
    rules: c.rules,
    drop_highest_n: c.drop_highest_n,
    keep_highest_n: c.keep_highest_n,
    droppable: c.droppable,
    never_drop_flags: c.never_drop_flags,
    empty_policy: c.empty_policy,
    min_grades_per_term: c.min_grades_per_term,
  }));

  // Average stays approved-only (computeSyllabusAverage / cellApproved).
  const average = computeSyllabusAverage(
    syllabus.published
      ? {
          status: 'published',
          categories,
          policies: syllabus.policies_public ?? null,
          engine: syllabus.engine,
          within_category: syllabus.within_category,
          book_mode: syllabus.book_mode,
          extra_credit_method: syllabus.extra_credit_method,
          ec_cap: syllabus.ec_cap,
          late_rule: syllabus.late_rule,
          missing_rule: syllabus.missing_rule,
          rounding: syllabus.rounding,
          floor: syllabus.floor,
          ceiling: syllabus.ceiling,
          exam_weight: syllabus.exam_weight,
          rollup_preset: syllabus.rollup_preset,
          syllabus_version: syllabus.syllabus_version,
          marking_period_scope: syllabus.marking_period_scope,
        }
      : null,
    assignments,
    approvedCells,
    { termFilter },
  );

  // P-M1: merge family work statuses so Assigned / In progress / Turned in are not Missing.
  // Explain RPCs historically returned only approved_at cells; enrich from gradebook until SQL lands.
  const cells = mergeAverageCellsForMissing(approvedCells, workStatusCells);
  const { missing, upcoming } = partitionMissingUpcoming(assignments, cells);

  return {
    syllabus,
    average,
    ruleLines: syllabus.published
      ? plainSyllabusRules(categories, syllabus.policies_public, {
          engine: syllabus.engine ?? null,
          late_rule: syllabus.late_rule ?? null,
          extra_credit_method: syllabus.extra_credit_method ?? null,
          rollup_preset: syllabus.rollup_preset ?? null,
          exam_weight: syllabus.exam_weight ?? null,
          book_mode: syllabus.book_mode ?? null,
          scale_label: null,
        })
      : [],
    assignments,
    cells,
    missing,
    upcoming,
  };
}

/** Merge approved explain cells with family work-status cells (status wins from work when absent). */
export function mergeAverageCellsForMissing(
  approvedCells: AverageCell[],
  workStatusCells: AverageCell[],
): AverageCell[] {
  const byId = new Map<string, AverageCell>();
  for (const cell of workStatusCells) {
    if (!cell.assignmentId) continue;
    byId.set(cell.assignmentId, {
      assignmentId: cell.assignmentId,
      approvedScore: null,
      status: cell.status ?? null,
      approvedAt: null,
      excused: cell.excused,
    });
  }
  for (const cell of approvedCells) {
    const prev = byId.get(cell.assignmentId);
    byId.set(cell.assignmentId, prev ? { ...prev, ...cell } : cell);
  }
  return [...byId.values()];
}

type FamilyGradebookStatusRow = {
  class_id?: string;
  assignment_id?: string;
  status?: string | null;
};

/** Own/child submission statuses for P-M1 (live family_student_gradebook — no new SQL). */
async function loadWorkStatusCellsForClass(
  classId: string,
  studentId: string,
): Promise<AverageCell[]> {
  if (!classId || !studentId) return [];
  const { data, error } = await requireSupabase().rpc('family_student_gradebook', {
    p_student_id: studentId,
  });
  if (error || !Array.isArray(data)) return [];
  const cells: AverageCell[] = [];
  for (const row of data as FamilyGradebookStatusRow[]) {
    if (String(row.class_id ?? '') !== classId) continue;
    const assignmentId = String(row.assignment_id ?? '');
    if (!assignmentId) continue;
    cells.push({
      assignmentId,
      approvedScore: null,
      status: row.status ?? null,
      approvedAt: null,
    });
  }
  return cells;
}

export async function loadStudentClassAverageExplain(
  classId: string,
  termFilter: string = 'all',
) {
  const { data, error } = await requireSupabase().rpc('student_class_average_explain', {
    p_class_id: classId,
  });
  if (error) throw error;
  const payload = (data ?? { ok: false }) as AverageExplainPayload;
  if (!payload.ok) throw new Error(payload.reason || 'Could not load average');
  const studentId = String(payload.student_id ?? '');
  const workStatusCells = studentId
    ? await loadWorkStatusCellsForClass(classId, studentId).catch(() => [])
    : [];
  return mapExplain(payload, termFilter, workStatusCells);
}

export async function loadParentClassAverageExplain(
  classId: string,
  studentId: string,
  termFilter: string = 'all',
) {
  const { data, error } = await requireSupabase().rpc('parent_class_average_explain', {
    p_class_id: classId,
    p_student_id: studentId,
  });
  if (error) throw error;
  const payload = (data ?? { ok: false }) as AverageExplainPayload;
  if (!payload.ok) throw new Error(payload.reason || 'Could not load average');
  const workStatusCells = await loadWorkStatusCellsForClass(classId, studentId).catch(() => []);
  return mapExplain(payload, termFilter, workStatusCells);
}

export async function listParentChildClasses(
  studentId: string,
): Promise<Array<{ classId: string; className: string }>> {
  const { data, error } = await requireSupabase().rpc('parent_child_classes', {
    p_student_id: studentId,
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => ({
    classId: String((row as { class_id?: string }).class_id ?? ''),
    className: String((row as { class_name?: string }).class_name ?? 'Class'),
  })).filter((row) => row.classId);
}

export function categoryOptionsForAssign(
  categories: SyllabusCategoryDraft[],
): Array<{ key: string; label: string; weight_percent: number; default_include_in_average: boolean }> {
  return categories
    .filter((c) => c.active)
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
    .map((c) => ({
      key: c.key,
      label: c.label,
      weight_percent: c.weight_percent,
      default_include_in_average: c.default_include_in_average,
    }));
}

export function isGradeKindKey(key: string): key is GradeKind {
  return GRADE_KINDS.some((row) => row.key === key);
}

/** Apply selected Ask draft fields into editor categories/policies (status stays draft). */
export function applyAskDraftToEditor(draft: Record<string, unknown>): {
  title: string | null;
  term_structure: ClassSyllabusDraft['term_structure'];
  active_term: string | null;
  policies: SyllabusPolicies;
  categories: SyllabusCategoryDraft[];
  documentKind: string;
  warnings: Array<{ code?: string; message?: string }>;
} {
  const documentKind = String(draft.document_kind ?? 'unknown');
  const warnings = Array.isArray(draft.warnings) ? (draft.warnings as Array<{ code?: string; message?: string }>) : [];
  const titleField = draft.title as { value?: string; selected?: boolean } | string | undefined;
  const title =
    typeof titleField === 'string'
      ? titleField
      : titleField?.selected === false
        ? null
        : titleField?.value?.trim() || null;

  const termField = draft.term_structure as { value?: string; selected?: boolean } | undefined;
  const term_structure = (
    termField?.selected === false
      ? 'year'
      : ['quarters', 'semesters', 'year', 'custom'].includes(String(termField?.value))
        ? termField?.value
        : 'year'
  ) as ClassSyllabusDraft['term_structure'];

  const activeField = draft.active_term as { value?: string; selected?: boolean } | undefined;
  const active_term =
    activeField?.selected === false ? null : (activeField?.value as string | null) ?? null;

  const policiesRaw = (draft.policies ?? {}) as Record<string, { value?: unknown; selected?: boolean }>;
  const policies = defaultPolicies();
  for (const key of Object.keys(policies) as Array<keyof SyllabusPolicies>) {
    const field = policiesRaw[key];
    if (!field || field.selected === false) continue;
    (policies as Record<string, unknown>)[key] = field.value as never;
  }
  policies.missing_as_zero = policies.missing_as_zero === true;
  policies.publish_to_family = policies.publish_to_family !== false;

  const used = new Set<string>();
  const categories: SyllabusCategoryDraft[] = [];
  const rawCats = Array.isArray(draft.categories) ? draft.categories : [];
  rawCats.forEach((raw, index) => {
    const row = raw as Record<string, unknown>;
    const selected =
      (row.weight_percent as { selected?: boolean } | undefined)?.selected !== false &&
      (row.label as { selected?: boolean } | undefined)?.selected !== false;
    if (!selected) return;
    // Rubric criteria must never become weights — skip if kind is rubric-only.
    if (documentKind === 'rubric') return;
    const labelVal =
      typeof row.label === 'string'
        ? row.label
        : String((row.label as { value?: string } | undefined)?.value ?? '').trim();
    if (!labelVal) return;
    const keyVal =
      typeof row.key === 'string'
        ? row.key
        : String((row.key as { value?: string } | undefined)?.value ?? '').trim();
    const key = KEY_RE.test(keyVal) ? keyVal : slugCategoryKey(labelVal, used);
    if (!used.has(key)) used.add(key);
    const weight =
      typeof row.weight_percent === 'number'
        ? row.weight_percent
        : Number((row.weight_percent as { value?: number } | undefined)?.value ?? 0);
    const defaultIncludeField = row.default_include_in_average as { value?: boolean } | boolean | undefined;
    const defaultInclude =
      typeof defaultIncludeField === 'boolean'
        ? defaultIncludeField
        : defaultIncludeField?.value === true;
    categories.push({
      key,
      label: labelVal,
      weight_percent: Number.isFinite(weight) ? weight : 0,
      sort_order: index,
      active: true,
      group: null,
      default_include_in_average: defaultInclude === true, // never quiz shortcut
      min_grades_per_term: null,
      rules: { drop_lowest_n: 0, replace_lowest_with_makeup: { enabled: false, max_replacements: 1 } },
    });
  });

  return { title, term_structure, active_term, policies, categories, documentKind, warnings };
}
