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
