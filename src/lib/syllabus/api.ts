import { requireSupabase } from '@/lib/supabase/client';
import {
  computeSyllabusAverage,
  plainSyllabusRules,
  type AverageAssignment,
  type AverageCell,
  type CategoryRules,
  type SyllabusAverageResult,
  type SyllabusCategoryInput,
  type SyllabusPolicies,
} from '@/lib/grade/syllabusAverage';
import { GRADE_KINDS, type GradeKind } from '@/lib/grade/marks';

export type SyllabusStatus = 'draft' | 'published' | 'archived';

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
};

export type ClassSyllabusDraft = {
  id?: string;
  class_id: string;
  status: SyllabusStatus;
  title: string | null;
  calc_mode: 'category_weight';
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
  }>;
  policies_public?: SyllabusPolicies;
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
  }>;
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

export function weightsValidForPublish(categories: SyllabusCategoryDraft[]): boolean {
  const active = categories.filter((c) => c.active);
  if (!active.length) return false;
  if (active.some((c) => !c.label.trim() || !KEY_RE.test(c.key))) return false;
  const keys = new Set(active.map((c) => c.key));
  if (keys.size !== active.length) return false;
  return Math.abs(activeWeightSum(categories) - 100) <= 0.01;
}

function asSyllabus(row: Record<string, unknown> | null | undefined, classId: string): ClassSyllabusDraft | null {
  if (!row) return null;
  return {
    id: String(row.id ?? ''),
    class_id: String(row.class_id ?? classId),
    status: (row.status as SyllabusStatus) || 'draft',
    title: (row.title as string | null) ?? null,
    calc_mode: 'category_weight',
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
  };
}

function asCategory(row: Record<string, unknown>): SyllabusCategoryDraft {
  const rules = (row.rules as CategoryRules) ?? {};
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
}) {
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
    categories: input.categories.map((c, index) => ({
      key: c.key,
      label: c.label.trim(),
      weight_percent: Number(c.weight_percent),
      sort_order: c.sort_order ?? index,
      active: c.active !== false,
      group: c.group ?? null,
      default_include_in_average: c.default_include_in_average === true,
      min_grades_per_term: c.min_grades_per_term ?? null,
      rules: c.rules ?? {},
    })),
  };
}

export async function saveClassSyllabusDraft(
  classId: string,
  input: {
    title: string | null;
    term_structure: ClassSyllabusDraft['term_structure'];
    active_term: string | null;
    policies: SyllabusPolicies;
    categories: SyllabusCategoryDraft[];
    source?: ClassSyllabusDraft['source'];
  },
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
  input: {
    title: string | null;
    term_structure: ClassSyllabusDraft['term_structure'];
    active_term: string | null;
    policies: SyllabusPolicies;
    categories: SyllabusCategoryDraft[];
    source?: ClassSyllabusDraft['source'];
  },
): Promise<void> {
  if (!weightsValidForPublish(input.categories)) {
    throw new Error('Active category weights must sum to 100% before publish.');
  }
  // Server deletes only the syllabus row's own source_asset_id after nulling it.
  // Never send a client-supplied asset id to delete.
  const { error } = await requireSupabase().rpc('publish_class_syllabus', {
    p_class_id: classId,
    p_payload: payloadFromEditor(input),
    p_row_version: rowVersion,
  });
  if (error) throw error;
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

function mapExplain(data: AverageExplainPayload, termFilter: string): {
  syllabus: PublishedFamilySyllabus;
  average: SyllabusAverageResult;
  ruleLines: string[];
} {
  const syllabus = (data.syllabus ?? { ok: true, published: false }) as PublishedFamilySyllabus;
  const assignments = (data.assignments ?? []) as AverageAssignment[];
  const cells: AverageCell[] = (data.cells ?? []).map((row) => ({
    assignmentId: row.assignment_id,
    approvedScore: row.approved_score,
    scoreMark:
      row.score_mark === 'pass' || row.score_mark === 'fail' ? row.score_mark : 'numeric',
    approvedAt: row.approved_at,
    status: row.status,
  }));

  const categories: SyllabusCategoryInput[] = (syllabus.categories ?? []).map((c) => ({
    key: c.key,
    label: c.label,
    weight_percent: Number(c.weight_percent),
    sort_order: c.sort_order,
    active: true,
    rules: c.rules,
  }));

  const average = computeSyllabusAverage(
    syllabus.published
      ? { status: 'published', categories, policies: syllabus.policies_public ?? null }
      : null,
    assignments,
    cells,
    { termFilter },
  );

  return {
    syllabus,
    average,
    ruleLines: syllabus.published
      ? plainSyllabusRules(categories, syllabus.policies_public)
      : [],
  };
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
  return mapExplain(payload, termFilter);
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
  return mapExplain(payload, termFilter);
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
