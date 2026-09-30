/**
 * Thin loaders for GB-09 policy_views + fallbacks from published sources.
 */
import { requireSupabase } from '@/lib/supabase/client';
import type { GradingCalendar } from '@/lib/grade/calendar/types';
import type { GradeScale } from '@/lib/grade/scale/scale';
import {
  buildSchoolPolicyView,
  buildSyllabusPolicyView,
  type PolicyViewModel,
} from '@/lib/grade/policyView';
import type { SyllabusVersionSnapshot } from '@/lib/syllabus/types';

export type PolicyViewRow = {
  id: string;
  kind: 'school' | 'syllabus';
  ref_id: string;
  version: number;
  snapshot: Record<string, unknown>;
  rendered: PolicyViewModel | Record<string, unknown>;
  published_at: string | null;
};

export async function loadLatestPolicyView(args: {
  kind: 'school' | 'syllabus';
  refId: string;
}): Promise<PolicyViewRow | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('policy_views' as never)
    .select('*')
    .eq('kind', args.kind)
    .eq('ref_id', args.refId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as PolicyViewRow | null) ?? null;
}

export async function upsertPolicyViewRendered(args: {
  kind: 'school' | 'syllabus';
  refId: string;
  version: number;
  snapshot: Record<string, unknown>;
  rendered: PolicyViewModel;
  publishedAt?: string | null;
}): Promise<PolicyViewRow> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('upsert_policy_view' as never, {
    p_kind: args.kind,
    p_ref_id: args.refId,
    p_version: args.version,
    p_snapshot: args.snapshot,
    p_rendered: args.rendered,
    p_published_at: args.publishedAt ?? new Date().toISOString(),
  } as never);
  if (error) throw error;
  return data as PolicyViewRow;
}

function isPolicyViewModel(v: unknown): v is PolicyViewModel {
  return Boolean(v && typeof v === 'object' && 'how_built_sentence' in (v as object) && 'kind' in (v as object));
}

/** Prefer stored rendered; else build from snapshot/payload. */
export function resolvePolicyViewModel(args: {
  row?: PolicyViewRow | null;
  kind: 'school' | 'syllabus';
  refId: string;
  schoolName?: string | null;
  className?: string | null;
  payload?: Record<string, unknown> | null;
  syllabusSnapshot?: SyllabusVersionSnapshot | Record<string, unknown> | null;
  calendar?: GradingCalendar | null;
  scale?: GradeScale | null;
  version?: number;
  publishedAt?: string | null;
}): PolicyViewModel | null {
  if (args.row && isPolicyViewModel(args.row.rendered)) {
    return args.row.rendered;
  }

  if (args.kind === 'school') {
    const payload = (args.payload ?? args.row?.snapshot ?? null) as
      | Parameters<typeof buildSchoolPolicyView>[0]['payload']
      | null;
    if (!payload) return null;
    return buildSchoolPolicyView({
      ref_id: args.refId,
      version: args.version ?? args.row?.version ?? 1,
      published_at: args.publishedAt ?? args.row?.published_at ?? null,
      school_name: args.schoolName ?? null,
      payload: {
        ...payload,
        calendar: (payload.calendar as GradingCalendar | undefined) ?? args.calendar ?? null,
      },
    });
  }

  const snap = (args.syllabusSnapshot ?? args.row?.snapshot ?? null) as
    | SyllabusVersionSnapshot
    | Record<string, unknown>
    | null;
  if (!snap) return null;

  // syllabus_versions may wrap { syllabus, categories }
  const categories =
    Array.isArray((snap as { categories?: unknown }).categories)
      ? ((snap as { categories: unknown[] }).categories as SyllabusVersionSnapshot['categories'])
      : [];
  const inner =
    (snap as { syllabus?: Record<string, unknown> }).syllabus ??
    (snap as Record<string, unknown>);

  return buildSyllabusPolicyView({
    ref_id: args.refId,
    version:
      args.version ??
      args.row?.version ??
      Number((inner as { syllabus_version?: number }).syllabus_version) ??
      1,
    published_at: args.publishedAt ?? args.row?.published_at ?? null,
    class_name: args.className ?? null,
    title: (inner as { title?: string | null }).title ?? null,
    calendar: args.calendar ?? null,
    scale: args.scale ?? null,
    snapshot: {
      title: (inner as { title?: string | null }).title ?? null,
      engine: (inner as { engine?: string }).engine,
      within_category: (inner as { within_category?: string | null }).within_category ?? null,
      book_mode: (inner as { book_mode?: string }).book_mode,
      extra_credit_method: (inner as { extra_credit_method?: string }).extra_credit_method,
      ec_cap: (inner as { ec_cap?: number | null }).ec_cap ?? null,
      late_rule: (inner as { late_rule?: never }).late_rule ?? null,
      missing_rule: (inner as { missing_rule?: string }).missing_rule,
      rounding: (inner as { rounding?: string }).rounding,
      floor: (inner as { floor?: number | null }).floor ?? null,
      ceiling: (inner as { ceiling?: number | null }).ceiling ?? null,
      policies: (inner as { policies?: Record<string, unknown> }).policies ?? null,
      categories: categories.map((c) => ({
        key: String((c as { key: string }).key),
        label: String((c as { label: string }).label),
        weight_percent: Number((c as { weight_percent: number }).weight_percent),
        active: (c as { active?: boolean }).active !== false,
        rules: (c as { rules?: { drop_lowest_n?: number } }).rules,
        drop_highest_n: (c as { drop_highest_n?: number }).drop_highest_n,
        keep_highest_n: (c as { keep_highest_n?: number | null }).keep_highest_n ?? null,
      })),
    },
  });
}
