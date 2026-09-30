/**
 * GB-10 breakdown view-model from engine v2 PeriodResult (NFR-08).
 * Pure — no React.
 */
import type {
  CategoryResult,
  EngineSyllabus,
  ItemBreakdown,
  PeriodResult,
} from '../../lib/grade/engine/types.ts';

export type BreakdownItemVM = {
  assignment_id: string;
  title: string;
  role: ItemBreakdown['role'];
  earned: number | null;
  possible: number | null;
  pct: number | null;
  note?: string;
};

export type BreakdownCategoryVM = {
  key: string;
  label: string;
  pct: number | null;
  /** Declared syllabus weight (0–100 style or 0–1 — we store as percent points). */
  weight_percent: number;
  /** Engine weight_used after renormalize (0–1). */
  weight_used: number;
  /** Contribution to overall: pct * weight_used. */
  contribution: number | null;
  earned: number | null;
  possible: number | null;
  drops: number;
  excused: number;
  late_adjustments: number;
  ec_items: number;
  items: BreakdownItemVM[];
};

export type BreakdownVM = {
  period_id: string;
  overall_pct: number | null;
  overall_unrounded_note: string | null;
  categories: BreakdownCategoryVM[];
  renormalized: boolean;
  ec_added: number;
  floor_applied: boolean;
  blocked_by_incomplete: boolean;
  rounding: string;
  rounding_step: string;
};

export type TitleLookup = (assignmentId: string) => string;
export type CategoryLabelLookup = (key: string) => string;

function sumEarnedPossible(items: ItemBreakdown[]): {
  earned: number | null;
  possible: number | null;
} {
  let earned = 0;
  let possible = 0;
  let any = false;
  for (const it of items) {
    if (it.role !== 'counted' && it.role !== 'ec') continue;
    if (it.earned == null && it.possible == null) continue;
    any = true;
    earned += it.earned ?? 0;
    possible += it.possible ?? 0;
  }
  if (!any) return { earned: null, possible: null };
  return { earned, possible };
}

function mapItem(it: ItemBreakdown, titleOf: TitleLookup): BreakdownItemVM {
  return {
    assignment_id: it.assignment_id,
    title: titleOf(it.assignment_id),
    role: it.role,
    earned: it.earned,
    possible: it.possible,
    pct: it.pct,
    note: it.note,
  };
}

function categoryVM(
  cat: CategoryResult,
  declaredWeight: number,
  labelOf: CategoryLabelLookup,
  titleOf: TitleLookup,
): BreakdownCategoryVM {
  const items = cat.items.map((it) => mapItem(it, titleOf));
  const { earned, possible } = sumEarnedPossible(cat.items);
  const drops = cat.items.filter((i) => i.role === 'dropped').length;
  const excused = cat.items.filter(
    (i) => i.role === 'omitted' && /excus/i.test(i.note ?? ''),
  ).length;
  const late_adjustments = cat.items.filter((i) => /late/i.test(i.note ?? '')).length;
  const ec_items = cat.items.filter((i) => i.role === 'ec').length;
  const contribution =
    cat.pct != null && cat.weight_used > 0
      ? Math.round(cat.pct * cat.weight_used * 10000) / 10000
      : cat.pct == null
        ? null
        : 0;

  return {
    key: cat.key,
    label: labelOf(cat.key) || cat.key,
    pct: cat.pct,
    weight_percent: declaredWeight,
    weight_used: cat.weight_used,
    contribution,
    earned,
    possible,
    drops,
    excused,
    late_adjustments,
    ec_items,
    items,
  };
}

/**
 * Build a teacher/family-facing breakdown from computePeriod output.
 */
export function buildBreakdownVM(
  result: PeriodResult,
  syllabus: Pick<EngineSyllabus, 'categories' | 'rounding' | 'decimals'>,
  opts?: {
    titleOf?: TitleLookup;
    labelOf?: CategoryLabelLookup;
  },
): BreakdownVM {
  const titleOf = opts?.titleOf ?? ((id: string) => id);
  const labelOf =
    opts?.labelOf ??
    ((key: string) => syllabus.categories.find((c) => c.key === key)?.label ?? key);

  const weightByKey = new Map(
    syllabus.categories.map((c) => [c.key, c.weight > 1 ? c.weight : c.weight * 100]),
  );

  const categories = result.categories.map((cat) =>
    categoryVM(cat, weightByKey.get(cat.key) ?? 0, labelOf, titleOf),
  );

  const rounding = syllabus.rounding ?? 'none';
  const decimals = syllabus.decimals ?? 0;
  const rounding_step =
    rounding === 'none'
      ? 'No final rounding'
      : `Rounded (${rounding}${decimals ? `, ${decimals} dp` : ''}) → ${
          result.pct == null ? '—' : `${result.pct}%`
        }`;

  const notes: string[] = [];
  if (result.renormalized) notes.push('Empty categories renormalized');
  if (result.ec_added) notes.push(`Extra credit +${result.ec_added}`);
  if (result.floor_applied) notes.push('Period floor applied');
  if (result.blocked_by_incomplete) notes.push('Blocked by incomplete');

  return {
    period_id: result.period_id,
    overall_pct: result.pct,
    overall_unrounded_note: notes.length ? notes.join(' · ') : null,
    categories,
    renormalized: result.renormalized,
    ec_added: result.ec_added,
    floor_applied: result.floor_applied,
    blocked_by_incomplete: result.blocked_by_incomplete,
    rounding,
    rounding_step,
  };
}
