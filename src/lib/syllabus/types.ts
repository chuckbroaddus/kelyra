/**
 * Syllabus v2 types + pure helpers (GB-05 / CONTRACT Engine + SRS §5.4 / §6.5).
 * snake_case for SQL/JSON round-trip.
 */

import type { Engine, LateRule } from '@/lib/grade/engine/types';
import type { CategoryRules, SyllabusPolicies } from '@/lib/grade/syllabusAverage';

export type SyllabusEngine = Engine;

export type BookMode = 'reset_each_marking_period' | 'rolling_year';
export type ExtraCreditMethod = 'A' | 'B' | 'C';
export type MissingRule = 'zero' | 'floor' | 'omit';
export type WithinCategory = 'points_inside' | 'percent_inside';
export type SyllabusRounding = 'nearest_whole' | 'half_up' | 'truncate' | 'none';

/** Defaults reproduce today's AVG v1 behaviour. */
export function defaultSyllabusV2Fields() {
  return {
    engine: 'weighted_percent_inside' as SyllabusEngine,
    within_category: 'percent_inside' as WithinCategory | null,
    book_mode: 'reset_each_marking_period' as BookMode,
    extra_credit_method: 'B' as ExtraCreditMethod,
    ec_cap: null as number | null,
    late_rule: { type: 'none' } as LateRule,
    missing_rule: 'omit' as MissingRule,
    rounding: 'nearest_whole' as SyllabusRounding,
    floor: null as number | null,
    ceiling: null as number | null,
    exam_weight: null as number | null,
    rollup_preset: null as string | null,
    syllabus_version: 1,
    locks: {} as Record<string, unknown>,
    marking_period_scope: null as string | null,
    /** FR-SYL-17 conduct scale id; null = off (default). */
    conduct_scale_id: null as string | null,
  };
}

export type SyllabusV2Fields = ReturnType<typeof defaultSyllabusV2Fields>;

export type SyllabusCategoryV2Extras = {
  drop_highest_n?: number;
  keep_highest_n?: number | null;
  droppable?: boolean;
  never_drop_flags?: string[];
  empty_policy?: 'renormalize' | 'zero' | null;
};

export type SyllabusVersionSnapshot = {
  version: number;
  title: string | null;
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
  exam_weight: number | null;
  rollup_preset: string | null;
  locks: Record<string, unknown>;
  marking_period_scope: string | null;
  policies: SyllabusPolicies;
  categories: Array<{
    key: string;
    label: string;
    weight_percent: number;
    sort_order: number;
    active: boolean;
    rules: CategoryRules;
    drop_highest_n: number;
    keep_highest_n: number | null;
    droppable: boolean;
    never_drop_flags: string[];
    empty_policy: 'renormalize' | 'zero' | null;
    min_grades_per_term: number | null;
  }>;
};

/** Pure FR-SYL-20 snapshot used on publish (client + tests). */
export function buildSyllabusVersionSnapshot(input: {
  version: number;
  title?: string | null;
  v2?: Partial<SyllabusV2Fields>;
  policies?: SyllabusPolicies | null;
  categories: Array<{
    key: string;
    label: string;
    weight_percent: number;
    sort_order?: number;
    active?: boolean;
    rules?: CategoryRules;
    drop_highest_n?: number;
    keep_highest_n?: number | null;
    droppable?: boolean;
    never_drop_flags?: string[] | null;
    empty_policy?: 'renormalize' | 'zero' | null;
    min_grades_per_term?: number | null;
  }>;
}): SyllabusVersionSnapshot {
  const d = defaultSyllabusV2Fields();
  const v2 = { ...d, ...(input.v2 ?? {}) };
  return {
    version: Math.max(1, Math.floor(Number(input.version) || 1)),
    title: input.title ?? null,
    engine: v2.engine,
    within_category: v2.within_category,
    book_mode: v2.book_mode,
    extra_credit_method: v2.extra_credit_method,
    ec_cap: v2.ec_cap,
    late_rule: v2.late_rule ?? { type: 'none' },
    missing_rule: v2.missing_rule,
    rounding: v2.rounding,
    floor: v2.floor,
    ceiling: v2.ceiling,
    exam_weight: v2.exam_weight,
    rollup_preset: v2.rollup_preset,
    locks: v2.locks ?? {},
    marking_period_scope: v2.marking_period_scope,
    policies: { ...(input.policies ?? {}) },
    categories: input.categories.map((c, i) => ({
      key: c.key,
      label: c.label,
      weight_percent: Number(c.weight_percent),
      sort_order: c.sort_order ?? i,
      active: c.active !== false,
      rules: c.rules ?? {},
      drop_highest_n: Math.max(0, Number(c.drop_highest_n ?? 0)),
      keep_highest_n: c.keep_highest_n == null ? null : Number(c.keep_highest_n),
      droppable: c.droppable !== false,
      never_drop_flags: Array.isArray(c.never_drop_flags) ? [...c.never_drop_flags] : [],
      empty_policy: c.empty_policy ?? null,
      min_grades_per_term: c.min_grades_per_term == null ? null : Number(c.min_grades_per_term),
    })),
  };
}

export function parseLateRule(raw: unknown): LateRule {
  if (!raw || typeof raw !== 'object') return { type: 'none' };
  const o = raw as Record<string, unknown>;
  const type = o.type;
  if (type === 'flat' || type === 'per_day' || type === 'per_hour' || type === 'none') {
    return {
      type,
      amount: o.amount == null ? undefined : Number(o.amount),
      unit: o.unit === 'points' || o.unit === 'percent' ? o.unit : undefined,
      floor_pct: o.floor_pct == null ? null : Number(o.floor_pct),
      hard_deadline_days: o.hard_deadline_days == null ? null : Number(o.hard_deadline_days),
      grace_hours: o.grace_hours == null ? undefined : Number(o.grace_hours),
    };
  }
  return { type: 'none' };
}
