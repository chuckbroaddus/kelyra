/**
 * Map school GB-02 grading calendar → syllabus term_structure + teacher-facing copy.
 * DB term_structure stays quarters|semesters|year|custom; six-weeks etc. use custom + labels.
 */
import type { GradingCalendar, MarkingPeriod, PeriodModel, TemplateKey } from '../../lib/grade/calendar/types.ts';
import { weightsForPreset } from '../../lib/grade/calendar/rollups.ts';
import type { RollupPresetKey } from '../../lib/grade/calendar/types.ts';
import { calendarTemplateLabel } from '../../lib/grade/plainLabels.ts';

export type SyllabusTermStructure = 'quarters' | 'semesters' | 'year' | 'custom';

export type SchoolPeriodSplit = {
  /** Value stored on class_syllabi.term_structure. */
  term_structure: SyllabusTermStructure;
  /** e.g. "Six weeks (6 periods)" */
  summary_label: string;
  /** Marking-period names in calendar order (real school terms). */
  period_names: string[];
  period_model: PeriodModel | string;
  template: string | null;
};

const DEFAULT_MP_COUNT: Record<string, number> = {
  six_weeks: 6,
  nine_weeks: 4,
  trimester: 3,
  semester: 2,
  year: 1,
  college: 1,
  custom: 0,
};

/** DB enum from GB-02 period_model. */
export function termStructureFromPeriodModel(
  model: string | null | undefined,
): SyllabusTermStructure {
  switch (model) {
    case 'nine_weeks':
      return 'quarters';
    case 'semester':
      return 'semesters';
    case 'year':
      return 'year';
    case 'six_weeks':
    case 'trimester':
    case 'college':
    case 'custom':
      return 'custom';
    default:
      return 'year';
  }
}

/** DB enum from school calendar.template key when model is missing. */
export function termStructureFromTemplate(
  template: string | null | undefined,
): SyllabusTermStructure {
  switch (template) {
    case 'nine_weeks':
    case 'elementary_year_4':
      return 'quarters';
    case 'semester':
      return 'semesters';
    case 'tx_six_weeks':
    case 'elementary_year_6':
    case 'trimester':
    case 'college_term':
    case 'custom':
      return 'custom';
    default:
      return 'year';
  }
}

function periodModelFromTemplate(template: string | null | undefined): PeriodModel | string | null {
  switch (template) {
    case 'tx_six_weeks':
    case 'elementary_year_6':
      return 'six_weeks';
    case 'nine_weeks':
    case 'elementary_year_4':
      return 'nine_weeks';
    case 'trimester':
      return 'trimester';
    case 'college_term':
      return 'college';
    case 'semester':
      return 'semester';
    case 'custom':
      return 'custom';
    default:
      return null;
  }
}

function summaryForModel(model: string, count: number): string {
  const n = count > 0 ? count : DEFAULT_MP_COUNT[model] ?? 0;
  switch (model) {
    case 'six_weeks':
      return n > 0 ? `Six weeks (${n} periods)` : 'Six weeks';
    case 'nine_weeks':
      return n > 0 ? `Quarters (${n} periods)` : 'Quarters';
    case 'trimester':
      return n > 0 ? `Trimesters (${n} periods)` : 'Trimesters';
    case 'semester':
      return n > 0 ? `Semesters (${n} periods)` : 'Semesters';
    case 'year':
      return 'Full year';
    case 'college':
      return n > 0 ? `College terms (${n} periods)` : 'College terms';
    default:
      return n > 0 ? `Custom (${n} periods)` : 'Custom periods';
  }
}

function markingPeriodNames(periods: MarkingPeriod[] | undefined): string[] {
  if (!periods?.length) return [];
  return [...periods]
    .filter((p) => p.kind === 'marking_period')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => p.name);
}

/** Build read-only split summary from a live or payload calendar. */
export function schoolPeriodSplitFromCalendar(
  calendar: Pick<GradingCalendar, 'period_model' | 'periods'> | null | undefined,
  template?: string | null,
): SchoolPeriodSplit | null {
  if (!calendar && !template) return null;
  const model =
    calendar?.period_model ?? periodModelFromTemplate(template) ?? 'custom';
  const names = markingPeriodNames(calendar?.periods);
  const count = names.length || DEFAULT_MP_COUNT[model] || 0;
  let summary = summaryForModel(String(model), count);
  // Prefer friendly template label when model is generic custom.
  if (template && (model === 'custom' || !calendar?.period_model)) {
    const tLabel = calendarTemplateLabel(template);
    if (tLabel && tLabel !== String(template)) {
      summary =
        count > 0 && !/period/i.test(tLabel) ? `${tLabel} (${count} periods)` : tLabel;
    }
  }
  return {
    term_structure: calendar?.period_model
      ? termStructureFromPeriodModel(calendar.period_model)
      : termStructureFromTemplate(template),
    summary_label: summary,
    period_names: names,
    period_model: model,
    template: template ?? null,
  };
}

const PRESET_CHILD_COUNT: Record<string, number> = {
  '2/7+1/7': 3,
  '40/40/20': 2,
  '45/45/10': 2,
  '3/7+3/7+1/7': 2,
  '25x4': 4,
  '50/50': 2,
  '85/15': 2,
  year_mean: 2,
};

/**
 * Exam weight as a percent (e.g. 14.3 for 1/7) from school rollup preset.
 * null when preset has no exam or is unknown/custom.
 */
export function examWeightPercentFromPreset(preset: string | null | undefined): number | null {
  if (!preset || preset === 'custom' || preset === 'year_mean' || preset === '50/50') return null;
  const childCount = PRESET_CHILD_COUNT[preset] ?? 2;
  try {
    const w = weightsForPreset(preset as RollupPresetKey, childCount);
    if (!w.exam_enabled) return null;
    return Math.round(w.exam_weight * 1000) / 10;
  } catch {
    return null;
  }
}

/** One-decimal percent string from a 0–1 weight (14.3%, 40%, …). */
export function formatWeightPercent(weight: number): string {
  if (!Number.isFinite(weight)) return '';
  const p = Math.round(weight * 1000) / 10;
  const body = Number.isInteger(p) ? String(p) : String(p);
  return `${body}%`;
}

/**
 * Prefer a clean seventh fraction when the weight is n/7; otherwise percent only.
 * e.g. 2/7 → "2/7 (28.6%)", 0.4 → "40%"
 */
export function formatWeightWithOptionalFraction(weight: number): string {
  if (!Number.isFinite(weight) || weight < 0) return '';
  const pct = formatWeightPercent(weight);
  for (let n = 1; n <= 6; n += 1) {
    if (Math.abs(weight - n / 7) < 1e-9) return `${n}/7 (${pct})`;
  }
  return pct;
}

/** Singular unit name for “Each {unit} …” copy, from GB-02 model or preset shape. */
export function rollupPeriodUnitLabel(input: {
  period_model?: string | null;
  child_count: number;
  preset?: string | null;
}): string {
  const model = input.period_model ?? '';
  switch (model) {
    case 'six_weeks':
      return 'six-weeks';
    case 'nine_weeks':
      return 'quarter';
    case 'trimester':
      return 'trimester';
    case 'semester':
      return 'semester';
    case 'year':
      return 'year';
    case 'college':
      return 'term';
    default:
      break;
  }
  if (input.preset === '2/7+1/7' || input.child_count === 3) return 'six-weeks';
  if (input.preset === '25x4' || input.child_count === 4) return 'quarter';
  if (input.child_count === 1) return 'grading period';
  return 'grading period';
}

export type RollupFormulaDisplayOpts = {
  /** GB-02 period_model when known (six_weeks, nine_weeks, …). */
  period_model?: string | null;
  /** Override child count; defaults from preset table. */
  child_count?: number | null;
};

/**
 * Teacher-facing semester formula from the live preset weights — not a hardcoded slogan.
 * Examples:
 *   2/7+1/7 → "Each six-weeks 2/7 (28.6%), exam 1/7 (14.3%)"
 *   40/40/20 → "Each grading period 40%, exam 20%"
 *   50/50 → "Each grading period 50%"
 *   year_mean → "Equal average of all grading periods"
 */
export function formatRollupFormulaDisplay(
  preset: string | null | undefined,
  opts: RollupFormulaDisplayOpts = {},
): string {
  if (preset == null || String(preset).trim() === '') return '';
  const key = String(preset).trim();
  if (key === 'custom') return 'Custom weights';

  const childCount =
    opts.child_count != null && opts.child_count > 0
      ? opts.child_count
      : PRESET_CHILD_COUNT[key] ?? 2;

  try {
    const w = weightsForPreset(key as RollupPresetKey, childCount);
    const unit = rollupPeriodUnitLabel({
      period_model: opts.period_model,
      child_count: childCount,
      preset: key,
    });

    if (key === 'year_mean') {
      return childCount === 1
        ? 'Single grading period (100%)'
        : 'Equal average of all grading periods';
    }

    const first = w.child_weights[0] ?? 0;
    const equalChildren = w.child_weights.every((x) => Math.abs(x - first) < 1e-9);

    if (equalChildren && w.child_weights.length > 0) {
      // 85/15: children share 85% equally — call that out so “each” is not read as 85%.
      if (key === '85/15' && w.exam_enabled) {
        return `Grading periods share ${formatWeightPercent(1 - w.exam_weight)} equally (${childCount} × ${formatWeightPercent(first)}), exam ${formatWeightPercent(w.exam_weight)}`;
      }
      const each = formatWeightWithOptionalFraction(first);
      if (w.exam_enabled && w.exam_weight > 0) {
        return `Each ${unit} ${each}, exam ${formatWeightWithOptionalFraction(w.exam_weight)}`;
      }
      if (childCount === 1) return `${unit[0]!.toUpperCase()}${unit.slice(1)} ${each}`;
      return `Each ${unit} ${each}`;
    }

    // Unequal children (rare / future custom presets): list each weight.
    const parts = w.child_weights.map((wt, i) => `${unit} ${i + 1} ${formatWeightWithOptionalFraction(wt)}`);
    if (w.exam_enabled && w.exam_weight > 0) {
      parts.push(`exam ${formatWeightWithOptionalFraction(w.exam_weight)}`);
    }
    return parts.join(', ');
  } catch {
    // Unknown key — fall back to raw preset so the field is never blank when set.
    return key;
  }
}

/** Display exam weight with a % sign; empty when unset. Strips a trailing % if already present. */
export function formatExamWeightDisplay(examWeight: number | string | null | undefined): string {
  if (examWeight == null || examWeight === '') return '';
  if (typeof examWeight === 'string') {
    const t = examWeight.trim();
    if (!t) return '';
    if (/%\s*$/.test(t)) return t.endsWith('%') ? t : `${t}%`;
    const n = Number(t.replace(/%/g, ''));
    if (!Number.isFinite(n)) return t;
    return `${n}%`;
  }
  if (!Number.isFinite(examWeight)) return '';
  return `${examWeight}%`;
}

/** Parse teacher-typed exam weight; accepts "14.3" or "14.3%". */
export function parseExamWeightInput(text: string): number | null {
  const t = text.trim().replace(/%/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Template keys that imply a fixed school period structure (not teacher-pickable). */
export function isSchoolDefinedTemplate(template: string | null | undefined): boolean {
  if (!template || template === 'custom') return false;
  const known: TemplateKey[] = [
    'tx_six_weeks',
    'nine_weeks',
    'trimester',
    'college_term',
    'elementary_year_4',
    'elementary_year_6',
    'semester',
  ];
  return (known as string[]).includes(template);
}
