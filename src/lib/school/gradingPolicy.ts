/**
 * GB-07 School Grading and Reporting Policy — pure draft/payload/publish helpers.
 * SetupDraft fields keyed by path with value, source, confidence, evidence (CONTRACT).
 */
import type { GradingCalendar, RollupPresetKey, TemplateKey } from '../grade/calendar/types.ts';
import { buildTemplate, rollupWeightsValid } from '../grade/calendar/index.ts';
import type { GradeScale, GradeScaleBand } from '../grade/scale/scale.ts';
import { getScaleTemplate, makeScaleFromTemplate } from '../grade/scale/scale.ts';
import type { CourseLevel, GpaProfile, QualityPointTable } from '../grade/gpa/gpa.ts';
import {
  DEFAULT_COURSE_LEVELS,
  DEFAULT_QUALITY_TABLES,
  defaultGpaProfileSet,
  defaultInclude,
  courseLevelPickerOptions,
} from '../grade/gpa/gpa.ts';
import { DEFAULT_TRANSFER_LETTER_TO_PCT } from '../grade/posting/types.ts';

export { courseLevelPickerOptions };

export type FieldSource = 'user' | 'template' | 'default' | 'ai' | 'assumed';

export type SetupDraftField<T = unknown> = {
  value: T;
  source: FieldSource;
  confidence: number | null;
  evidence: string | null;
};

export type WizardStepId =
  | 'level'
  | 'calendar'
  | 'dates'
  | 'credit'
  | 'rollup'
  | 'scale'
  | 'quality_points'
  | 'course_levels'
  | 'gpa'
  | 'locks'
  | 'review';

export const WIZARD_STEPS: WizardStepId[] = [
  'level',
  'calendar',
  'dates',
  'credit',
  'rollup',
  'scale',
  'quality_points',
  'course_levels',
  'gpa',
  'locks',
  'review',
];

export type SchoolLevelChoice = 'elementary' | 'middle' | 'high' | 'college' | 'mixed';

export type CreditUnit = 'semester_0_5' | 'year_1_0' | 'none';

export type CreditPolicy = {
  unit: CreditUnit;
  year_link: boolean;
  attendance_gate: boolean;
  /**
   * FR-CR-06 exam exemption. Default enabled:false so existing schools unchanged.
   * Stored inside credit.policy draft field and payload.credit_policy.
   */
  exam_exemption?: {
    enabled: boolean;
    min_avg: number | null;
    max_absences: number | null;
    renormalize: boolean;
  };
};

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

export type GpaMode = 'off' | 'unweighted' | 'unweighted_and_weighted' | 'with_rank';

/** Quality-point method choice for the wizard (defaults to letter_map). */
export type QpMethodChoice = 'letter_map' | 'numeric_band' | 'percent_map';

/** Optional human reason shown on locked syllabus fields (FR-FORM-T01). */
export type SyllabusLockReasons = Partial<Record<keyof SyllabusLocks, string>>;

export type GradingPolicyPayload = {
  level: SchoolLevelChoice;
  calendar_template: TemplateKey | 'custom';
  calendar: GradingCalendar;
  year_start: string | null;
  year_end: string | null;
  credit_policy: CreditPolicy;
  /** FR-GPA-08 transfer letter→percent; default shipped map. */
  transfer_letter_to_pct: Record<string, number>;
  rollup_preset: RollupPresetKey | 'custom';
  scales: GradeScale[];
  default_scale_id: string;
  quality_point_tables: QualityPointTable[];
  course_levels: CourseLevel[];
  gpa_mode: GpaMode;
  gpa_profiles: GpaProfile[];
  locks: SyllabusLocks;
  /** Optional per-field lock reasons (GB-18). */
  lock_reasons: SyllabusLockReasons;
};

export type SetupDraft = {
  kind: 'school_grading_policy';
  school_id: string;
  current_step: WizardStepId;
  fields: Record<string, SetupDraftField>;
  updated_at: string;
};

export type ValidationIssue = {
  path: string;
  severity: 'error' | 'warning';
  message: string;
};

export type PublishPlan = {
  next_version: number;
  status: 'published';
  payload: GradingPolicyPayload;
  published_at_iso: string;
};

export type CalendarBindingPlan = {
  school_id: string;
  calendar_id: string;
  class_ids: string[];
};

// --- skeleton continues below via patches ---
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

export const DEFAULT_LOCK_REASON_COPY: Record<keyof SyllabusLocks, string> = {
  engine: 'School grading policy locks the calculation engine.',
  categories: 'School grading policy locks category structure or weights.',
  scale: 'Letter scale is set by the school grading policy.',
  floor: 'Period floor is set by the school grading policy.',
  late: 'Late penalty rule is set by the school grading policy.',
  drop_lowest: 'Drop-lowest policy is set by the school.',
  retake: 'Retake rules are set by the school grading policy.',
  assignment_max: 'Assignment max points policy is set by the school.',
  book_mode: 'Book reset mode is set by the school calendar policy.',
  rollup: 'Term rollup / exam weight is set by the school calendar.',
};

export const STEP_LABELS: Record<WizardStepId, string> = {
  level: 'School level',
  calendar: 'Calendar',
  dates: 'Dates & periods',
  credit: 'Credit policy',
  rollup: 'Term rollup',
  scale: 'Grade scale',
  quality_points: 'Quality points',
  course_levels: 'Course levels',
  gpa: 'GPA profiles',
  locks: 'Teacher locks',
  review: 'Review & publish',
};

export const STEP_HELP_KEYS: Record<WizardStepId, string> = {
  level: 'help.wizard.level',
  calendar: 'help.glyphs.6w',
  dates: 'help.wizard.dates',
  credit: 'help.exam_exemption',
  rollup: 'help.rollup.2_7',
  scale: 'help.scale.tx70',
  quality_points: 'help.gpa.numeric_table',
  course_levels: 'help.gpa.course_level',
  gpa: 'help.gpa.profiles',
  locks: 'help.wizard.locks',
  review: 'help.wizard.review',
};

function field<T>(
  value: T,
  source: FieldSource = 'default',
  confidence: number | null = 1,
  evidence: string | null = null,
): SetupDraftField<T> {
  return { value, source, confidence, evidence };
}

export function getFieldValue<T>(draft: SetupDraft, path: string, fallback: T): T {
  const f = draft.fields[path];
  if (!f) return fallback;
  return f.value as T;
}

export function setField<T>(
  draft: SetupDraft,
  path: string,
  value: T,
  source: FieldSource = 'user',
): SetupDraft {
  return {
    ...draft,
    fields: {
      ...draft.fields,
      [path]: field(value, source, source === 'user' ? 1 : 0.8, null),
    },
    updated_at: new Date().toISOString(),
  };
}

export function defaultTemplateForLevel(level: SchoolLevelChoice): TemplateKey {
  if (level === 'elementary') return 'elementary_year_4';
  if (level === 'college') return 'college_term';
  if (level === 'middle') return 'nine_weeks';
  return 'tx_six_weeks';
}

export function defaultScaleKeyForLevel(level: SchoolLevelChoice): string {
  if (level === 'elementary') return 'esnu';
  if (level === 'college') return 'college_plus_minus';
  if (level === 'high' || level === 'mixed') return 'texas_no_d';
  return 'us_10';
}

export function defaultGpaModeForLevel(level: SchoolLevelChoice): GpaMode {
  if (level === 'elementary') return 'off';
  if (level === 'college') return 'unweighted';
  if (level === 'high' || level === 'mixed') return 'unweighted_and_weighted';
  return 'unweighted';
}

export function defaultCreditForLevel(level: SchoolLevelChoice): CreditPolicy {
  const exam_exemption = {
    enabled: false,
    min_avg: null as number | null,
    max_absences: null as number | null,
    renormalize: true,
  };
  if (level === 'elementary') {
    return { unit: 'none', year_link: false, attendance_gate: false, exam_exemption };
  }
  if (level === 'college') {
    return { unit: 'semester_0_5', year_link: false, attendance_gate: false, exam_exemption };
  }
  return { unit: 'semester_0_5', year_link: true, attendance_gate: true, exam_exemption };
}

export function defaultRollupForTemplate(template: TemplateKey | 'custom'): RollupPresetKey {
  if (template === 'tx_six_weeks') return '2/7+1/7';
  if (template === 'nine_weeks') return '40/40/20';
  if (template === 'trimester') return 'year_mean';
  if (template === 'college_term') return 'year_mean';
  if (template === 'elementary_year_4') return '25x4';
  if (template === 'elementary_year_6') return 'year_mean';
  if (template === 'semester') return '50/50';
  return '50/50';
}

export function defaultGpaProfiles(mode: GpaMode, tableId: string = 'tx-4'): GpaProfile[] {
  // Preserve legacy keys unweighted|weighted for existing drafts; rank uses rank_6.
  if (mode === 'off') return [];
  if (mode === 'with_rank') {
    return defaultGpaProfileSet({ mode: 'with_rank', letterTableId: tableId });
  }
  const base: GpaProfile = {
    key: 'unweighted',
    table_id: tableId,
    use_level_bonus: false,
    include: defaultInclude({ local_credit: false }),
    repeat: 'include_both',
  };
  if (mode === 'unweighted') return [base];
  return [
    base,
    {
      ...base,
      key: 'weighted',
      use_level_bonus: true,
      include: defaultInclude({ pe: false, athletics: false, local_credit: false }),
    },
  ];
}

/** Map wizard QP method chip → tables list (keeps letter tables; adds tx-6 when numeric). */
export function qualityTablesForMethod(method: QpMethodChoice): QualityPointTable[] {
  const letter = Object.values(DEFAULT_QUALITY_TABLES)
    .filter((t) => t.method === 'letter_map')
    .map((t) => ({
      ...t,
      rows: t.rows.map((r) => ({ ...r, points_by_level: { ...r.points_by_level } })),
    }));
  if (method === 'letter_map') return letter;
  const numeric = DEFAULT_QUALITY_TABLES['tx-6-numeric']!;
  return [
    ...letter,
    {
      ...numeric,
      rows: numeric.rows.map((r) => ({ ...r, points_by_level: { ...r.points_by_level } })),
    },
  ];
}

export function makeCalendar(input: {
  school_id: string;
  level: SchoolLevelChoice;
  template: TemplateKey;
  year_start?: string | null;
  year_end?: string | null;
  rollup_preset?: RollupPresetKey;
}): GradingCalendar {
  const year =
    input.year_start && input.year_end
      ? { start: input.year_start, end: input.year_end }
      : null;
  const cal = buildTemplate(input.template, {
    id: `cal-${input.template}`,
    school_id: input.school_id,
    name: `${input.template} calendar`,
    year,
    rollup_preset: input.rollup_preset ?? defaultRollupForTemplate(input.template),
  });
  const calLevel = input.level === 'mixed' ? 'high' : input.level;
  return { ...cal, level: calLevel, school_id: input.school_id };
}

export function createEmptyDraft(school_id: string, level: SchoolLevelChoice = 'high'): SetupDraft {
  const template = defaultTemplateForLevel(level);
  const year_start = `${new Date().getFullYear()}-08-15`;
  const year_end = `${new Date().getFullYear() + 1}-05-28`;
  const scaleKey = defaultScaleKeyForLevel(level);
  const scale = makeScaleFromTemplate(scaleKey);
  const gpaMode = defaultGpaModeForLevel(level);
  const credit = defaultCreditForLevel(level);
  const calendar = makeCalendar({
    school_id,
    level,
    template,
    year_start,
    year_end,
  });
  const qp = Object.values(DEFAULT_QUALITY_TABLES).map((t) => ({
    ...t,
    rows: t.rows.map((r) => ({ ...r, points_by_level: { ...r.points_by_level } })),
  }));
  const qpTableId = scale.kind === 'percent' && scale.bands.some((b) => b.letter.includes('+') || b.letter.includes('-'))
    ? 'standard-4'
    : 'tx-4';

  const fields: Record<string, SetupDraftField> = {
    level: field(level, 'default'),
    'calendar.template': field(template, 'template'),
    'calendar.year_start': field(year_start, 'default'),
    'calendar.year_end': field(year_end, 'default'),
    'calendar.model': field(calendar, 'template'),
    'credit.policy': field(credit, 'default'),
    'credit.transfer_letter_to_pct': field({ ...DEFAULT_TRANSFER_LETTER_TO_PCT }, 'default'),
    'rollup.preset': field(defaultRollupForTemplate(template), 'template'),
    'scale.default_id': field(scale.id, 'template'),
    'scale.list': field([scale], 'template'),
    'qp.tables': field(qp, 'template'),
    'qp.method': field('letter_map' as QpMethodChoice, 'default'),
    'levels.list': field(DEFAULT_COURSE_LEVELS.map((l) => ({ ...l })), 'template'),
    'gpa.mode': field(gpaMode, 'default'),
    'gpa.profiles': field(defaultGpaProfiles(gpaMode, qpTableId), 'default'),
    'gpa.repeat': field('include_both' as const, 'default'),
    'locks.map': field({ ...DEFAULT_LOCKS }, 'default'),
    'locks.reasons': field({} as SyllabusLockReasons, 'default'),
  };

  return {
    kind: 'school_grading_policy',
    school_id,
    current_step: 'level',
    fields,
    updated_at: new Date().toISOString(),
  };
}

export function applyLevelDefaults(draft: SetupDraft, level: SchoolLevelChoice): SetupDraft {
  let next = setField(draft, 'level', level, 'user');
  const template = defaultTemplateForLevel(level);
  const yearStart = getFieldValue<string>(next, 'calendar.year_start', `${new Date().getFullYear()}-08-15`);
  const yearEnd = getFieldValue<string>(next, 'calendar.year_end', `${new Date().getFullYear() + 1}-05-28`);
  const calendar = makeCalendar({
    school_id: draft.school_id,
    level,
    template,
    year_start: yearStart,
    year_end: yearEnd,
  });
  const scaleKey = defaultScaleKeyForLevel(level);
  const scale = makeScaleFromTemplate(scaleKey);
  const gpaMode = defaultGpaModeForLevel(level);
  const qpTableId = scale.bands.some((b) => /[+\-]/.test(b.letter)) ? 'standard-4' : 'tx-4';
  next = setField(next, 'calendar.template', template, 'template');
  next = setField(next, 'calendar.model', calendar, 'template');
  next = setField(next, 'credit.policy', defaultCreditForLevel(level), 'default');
  next = setField(next, 'rollup.preset', defaultRollupForTemplate(template), 'template');
  next = setField(next, 'scale.default_id', scale.id, 'template');
  next = setField(next, 'scale.list', [scale], 'template');
  next = setField(next, 'gpa.mode', gpaMode, 'default');
  next = setField(next, 'gpa.profiles', defaultGpaProfiles(gpaMode, qpTableId), 'default');
  return next;
}

export function applyTemplateNotSure(draft: SetupDraft): SetupDraft {
  const level = getFieldValue<SchoolLevelChoice>(draft, 'level', 'high');
  return applyLevelDefaults(draft, level);
}

export function draftToPayload(draft: SetupDraft): GradingPolicyPayload {
  const level = getFieldValue<SchoolLevelChoice>(draft, 'level', 'high');
  const template = getFieldValue<TemplateKey | 'custom'>(draft, 'calendar.template', defaultTemplateForLevel(level));
  const calendar = getFieldValue<GradingCalendar>(
    draft,
    'calendar.model',
    makeCalendar({
      school_id: draft.school_id,
      level,
      template: template === 'custom' ? 'tx_six_weeks' : template,
    }),
  );
  const scales = getFieldValue<GradeScale[]>(draft, 'scale.list', [makeScaleFromTemplate(defaultScaleKeyForLevel(level))]);
  const gpaMode = getFieldValue<GpaMode>(draft, 'gpa.mode', defaultGpaModeForLevel(level));
  return {
    level,
    calendar_template: template,
    calendar,
    year_start: getFieldValue<string | null>(draft, 'calendar.year_start', null),
    year_end: getFieldValue<string | null>(draft, 'calendar.year_end', null),
    credit_policy: getFieldValue<CreditPolicy>(draft, 'credit.policy', defaultCreditForLevel(level)),
    transfer_letter_to_pct: getFieldValue<Record<string, number>>(
      draft,
      'credit.transfer_letter_to_pct',
      { ...DEFAULT_TRANSFER_LETTER_TO_PCT },
    ),
    rollup_preset: getFieldValue<RollupPresetKey | 'custom'>(
      draft,
      'rollup.preset',
      defaultRollupForTemplate(template === 'custom' ? 'tx_six_weeks' : template),
    ),
    scales,
    default_scale_id: getFieldValue<string>(draft, 'scale.default_id', scales[0]?.id ?? 'us_10'),
    quality_point_tables: getFieldValue<QualityPointTable[]>(
      draft,
      'qp.tables',
      Object.values(DEFAULT_QUALITY_TABLES),
    ),
    course_levels: getFieldValue<CourseLevel[]>(draft, 'levels.list', DEFAULT_COURSE_LEVELS),
    gpa_mode: gpaMode,
    gpa_profiles: getFieldValue<GpaProfile[]>(draft, 'gpa.profiles', defaultGpaProfiles(gpaMode)),
    locks: getFieldValue<SyllabusLocks>(draft, 'locks.map', DEFAULT_LOCKS),
    lock_reasons: getFieldValue<SyllabusLockReasons>(draft, 'locks.reasons', {}),
  };
}

/** Scale bands must cover 0–100 without gaps/overlap (percent scales). */
export function validateScaleBands(bands: GradeScaleBand[], kind: 'percent' | 'mark'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (kind === 'mark') {
    if (bands.length === 0) {
      issues.push({ path: 'scales.bands', severity: 'error', message: 'Mark scale needs at least one letter.' });
    }
    return issues;
  }
  if (bands.length === 0) {
    issues.push({ path: 'scales.bands', severity: 'error', message: 'Scale needs at least one band.' });
    return issues;
  }
  const sorted = [...bands].sort((a, b) => a.min_pct - b.min_pct);
  const EPS = 0.0001;
  if (sorted[0]!.min_pct > EPS) {
    issues.push({
      path: 'scales.bands',
      severity: 'error',
      message: `Scale must start at 0 (got min ${sorted[0]!.min_pct}).`,
    });
  }
  const last = sorted[sorted.length - 1]!;
  if (last.max_pct < 100 - EPS) {
    issues.push({
      path: 'scales.bands',
      severity: 'error',
      message: `Scale must reach 100 (got max ${last.max_pct}).`,
    });
  }
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    if (b.min_pct > b.max_pct + EPS) {
      issues.push({
        path: `scales.bands.${b.letter}`,
        severity: 'error',
        message: `Band ${b.letter}: min ${b.min_pct} > max ${b.max_pct}.`,
      });
    }
    if (i > 0) {
      const prev = sorted[i - 1]!;
      const gap = b.min_pct - prev.max_pct;
      // Adjacent bands: max of lower may be 89.9999 and next min 90 — OK.
      // Overlap if next.min < prev.max; gap if next.min > prev.max + 1-ish.
      if (b.min_pct < prev.max_pct - EPS) {
        issues.push({
          path: 'scales.bands',
          severity: 'error',
          message: `Bands ${prev.letter} and ${b.letter} overlap.`,
        });
      } else if (gap > 1 + EPS) {
        issues.push({
          path: 'scales.bands',
          severity: 'error',
          message: `Gap between ${prev.letter} and ${b.letter} (${prev.max_pct} → ${b.min_pct}).`,
        });
      }
    }
  }
  return issues;
}

export function validateQualityPoints(
  tables: QualityPointTable[],
  scales: GradeScale[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (tables.length === 0) {
    issues.push({ path: 'qp.tables', severity: 'error', message: 'At least one quality-point table is required when GPA is on.' });
    return issues;
  }
  for (const scale of scales) {
    if (scale.kind !== 'percent') continue;
    const letters = new Set(scale.bands.map((b) => b.letter));
    for (const table of tables) {
      if (table.method !== 'letter_map') continue;
      for (const letter of letters) {
        const row = table.rows.find((r) => r.letter === letter);
        if (!row) {
          issues.push({
            path: `qp.${table.id}.${letter}`,
            severity: 'error',
            message: `Letter ${letter} on scale ${scale.id} has no quality points in ${table.id}.`,
          });
        }
      }
    }
  }
  return issues;
}

export function validatePolicyPayload(payload: GradingPolicyPayload): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const rollup of payload.calendar.rollups) {
    if (!rollupWeightsValid(rollup.components)) {
      issues.push({
        path: `calendar.rollups.${rollup.term_id}`,
        severity: 'error',
        message: `Rollup for ${rollup.term_id} weights must sum to 1.`,
      });
    }
  }
  if (payload.scales.length === 0) {
    issues.push({ path: 'scales', severity: 'error', message: 'At least one grade scale is required.' });
  }
  for (const scale of payload.scales) {
    issues.push(...validateScaleBands(scale.bands, scale.kind).map((i) => ({
      ...i,
      path: i.path.replace('scales.', `scales.${scale.id}.`),
    })));
  }
  if (payload.gpa_mode !== 'off') {
    issues.push(...validateQualityPoints(payload.quality_point_tables, payload.scales));
    if (payload.gpa_profiles.length === 0) {
      issues.push({ path: 'gpa.profiles', severity: 'error', message: 'GPA is on but no profiles are defined.' });
    }
    if (payload.course_levels.length === 0) {
      issues.push({ path: 'levels', severity: 'error', message: 'GPA is on but course levels are empty.' });
    }
  }
  if (payload.credit_policy.unit === 'none' && payload.gpa_mode !== 'off') {
    issues.push({
      path: 'credit.policy',
      severity: 'warning',
      message: 'Credit is none but GPA is enabled — typical for elementary only.',
    });
  }
  return issues;
}

export function hardErrors(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((i) => i.severity === 'error');
}

export function canPublish(payload: GradingPolicyPayload): boolean {
  return hardErrors(validatePolicyPayload(payload)).length === 0;
}

/** Pure publish: bump version, mark published. */
export function planPublish(
  payload: GradingPolicyPayload,
  currentMaxVersion: number | null,
  nowIso: string = new Date().toISOString(),
): PublishPlan {
  if (!canPublish(payload)) {
    throw new Error('Cannot publish: validation errors remain.');
  }
  const next = (currentMaxVersion ?? 0) + 1;
  return {
    next_version: next,
    status: 'published',
    payload,
    published_at_iso: nowIso,
  };
}

/** Classes of this school get grading_calendar_id bound. */
export function planCalendarBinding(input: {
  school_id: string;
  calendar_id: string;
  class_ids: string[];
}): CalendarBindingPlan {
  if (!input.school_id) throw new Error('school_id required');
  if (!input.calendar_id) throw new Error('calendar_id required');
  return {
    school_id: input.school_id,
    calendar_id: input.calendar_id,
    class_ids: [...new Set(input.class_ids.filter(Boolean))],
  };
}

export function soFarSummary(draft: SetupDraft): string {
  const level = getFieldValue<SchoolLevelChoice>(draft, 'level', 'high');
  const template = getFieldValue<string>(draft, 'calendar.template', 'tx_six_weeks');
  const credit = getFieldValue<CreditPolicy>(draft, 'credit.policy', defaultCreditForLevel(level));
  const scaleId = getFieldValue<string>(draft, 'scale.default_id', 'texas_no_d');
  const gpa = getFieldValue<GpaMode>(draft, 'gpa.mode', 'off');
  const scale = getScaleTemplate(scaleId);
  const pass = scale?.passing_pct ?? 70;
  return `${level} · ${template} · credit ${credit.unit} · ${scaleId} · pass ${pass} · GPA ${gpa}`;
}

export function rebuildCalendarFromDraft(draft: SetupDraft): SetupDraft {
  const level = getFieldValue<SchoolLevelChoice>(draft, 'level', 'high');
  const template = getFieldValue<TemplateKey | 'custom'>(draft, 'calendar.template', 'tx_six_weeks');
  if (template === 'custom') return draft;
  const yearStart = getFieldValue<string | null>(draft, 'calendar.year_start', null);
  const yearEnd = getFieldValue<string | null>(draft, 'calendar.year_end', null);
  const preset = getFieldValue<RollupPresetKey | 'custom'>(draft, 'rollup.preset', defaultRollupForTemplate(template));
  const calendar = makeCalendar({
    school_id: draft.school_id,
    level,
    template,
    year_start: yearStart,
    year_end: yearEnd,
    rollup_preset: preset === 'custom' ? undefined : preset,
  });
  return setField(draft, 'calendar.model', calendar, 'template');
}

/** Serialize draft payload row for grading_policies.payload jsonb. */
export function payloadForDb(payload: GradingPolicyPayload): Record<string, unknown> {
  return {
    level: payload.level,
    calendar_template: payload.calendar_template,
    calendar: payload.calendar,
    year_start: payload.year_start,
    year_end: payload.year_end,
    credit_policy: payload.credit_policy,
    rollup_preset: payload.rollup_preset,
    scales: payload.scales,
    default_scale_id: payload.default_scale_id,
    quality_point_tables: payload.quality_point_tables,
    course_levels: payload.course_levels,
    gpa_mode: payload.gpa_mode,
    gpa_profiles: payload.gpa_profiles,
    locks: payload.locks,
    lock_reasons: payload.lock_reasons ?? {},
  };
}

type Sb = {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (row: unknown) => any;
    upsert: (row: unknown, opts?: unknown) => any;
    delete: () => any;
  };
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
};

/** Optional runtime client inject for tests. */
let clientFactory: (() => Sb) | null = null;

export function _setGradingPolicyClientForTests(factory: (() => Sb) | null): void {
  clientFactory = factory;
}

async function sb(): Promise<Sb> {
  if (clientFactory) return clientFactory();
  const { requireSupabase } = await import('../supabase/client.ts');
  return requireSupabase() as unknown as Sb;
}

export type PolicyRow = {
  id: string;
  school_id: string;
  version: number;
  status: 'draft' | 'published';
  payload: GradingPolicyPayload | Record<string, unknown>;
  published_at: string | null;
  created_by: string | null;
};

export async function loadLatestDraft(school_id: string): Promise<PolicyRow | null> {
  const client = await sb();
  const { data, error } = await client
    .from('grading_policies')
    .select('*')
    .eq('school_id', school_id)
    .eq('status', 'draft')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Could not load draft policy');
  return data as PolicyRow | null;
}

export async function loadLatestPublished(school_id: string): Promise<PolicyRow | null> {
  const client = await sb();
  const { data, error } = await client
    .from('grading_policies')
    .select('*')
    .eq('school_id', school_id)
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Could not load published policy');
  return data as PolicyRow | null;
}

export async function maxPolicyVersion(school_id: string): Promise<number | null> {
  const client = await sb();
  const { data, error } = await client
    .from('grading_policies')
    .select('version')
    .eq('school_id', school_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Could not read policy versions');
  return data?.version ?? null;
}

export async function saveDraftPayload(
  school_id: string,
  payload: GradingPolicyPayload,
  existingDraftId?: string | null,
): Promise<PolicyRow> {
  const client = await sb();
  const user = (await client.auth.getUser()).data.user;
  const body = {
    school_id,
    status: 'draft' as const,
    payload: payloadForDb(payload),
    published_at: null,
    created_by: user?.id ?? null,
  };
  if (existingDraftId) {
    const { data, error } = await client
      .from('grading_policies')
      .update(body)
      .eq('id', existingDraftId)
      .select('*')
      .single();
    if (error) throw new Error(error.message || 'Could not update draft');
    return data as PolicyRow;
  }
  const ver = (await maxPolicyVersion(school_id)) ?? 0;
  const { data, error } = await client
    .from('grading_policies')
    .insert({ ...body, version: ver + 1 })
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'Could not save draft');
  return data as PolicyRow;
}

export async function publishPolicy(
  school_id: string,
  payload: GradingPolicyPayload,
): Promise<{ policy: PolicyRow; plan: PublishPlan; binding: CalendarBindingPlan | null }> {
  if (!canPublish(payload)) {
    throw new Error('Cannot publish: fix validation errors first.');
  }
  const client = await sb();
  const user = (await client.auth.getUser()).data.user;
  const maxVer = await maxPolicyVersion(school_id);
  const plan = planPublish(payload, maxVer);

  // Persist calendar tree
  const cal = payload.calendar;
  const { data: calRow, error: calErr } = await client
    .from('grading_calendars')
    .insert({
      school_id,
      name: cal.name,
      level: cal.level,
      period_model: cal.period_model,
      rollups: cal.rollups,
      show_interims_in_filter: cal.show_interims_in_filter,
      glyph_scope: cal.glyph_scope,
      year_start: payload.year_start,
      year_end: payload.year_end,
    })
    .select('*')
    .single();
  if (calErr) throw new Error(calErr.message || 'Could not save calendar');
  const calendarId = (calRow as { id: string }).id;

  // periods: insert parents first (year → credit_term → mp/exam)
  const idMap = new Map<string, string>();
  const ordered = [...cal.periods].sort((a, b) => a.sort_order - b.sort_order);
  // topological: null parent first, then by depth
  const remaining = [...ordered];
  while (remaining.length) {
    const ready = remaining.filter(
      (p) => p.parent_id == null || idMap.has(p.parent_id) || p.parent_id === p.code,
    );
    const batch = ready.length ? ready : [remaining[0]!];
    for (const p of batch) {
      const parentUuid =
        p.parent_id == null ? null : idMap.get(p.parent_id) ?? null;
      const { data: mp, error: mpErr } = await client
        .from('marking_periods')
        .insert({
          calendar_id: calendarId,
          code: p.code,
          name: p.name,
          kind: p.kind,
          parent_id: parentUuid,
          start_date: p.start_date,
          end_date: p.end_date,
          sort_order: p.sort_order,
        })
        .select('id, code')
        .single();
      if (mpErr) throw new Error(mpErr.message || `Could not save period ${p.code}`);
      idMap.set(p.code, (mp as { id: string }).id);
      idMap.set(p.id, (mp as { id: string }).id);
      const idx = remaining.indexOf(p);
      if (idx >= 0) remaining.splice(idx, 1);
    }
  }

  const { data: policy, error: polErr } = await client
    .from('grading_policies')
    .insert({
      school_id,
      version: plan.next_version,
      status: 'published',
      payload: {
        ...payloadForDb(payload),
        calendar_id: calendarId,
      },
      published_at: plan.published_at_iso,
      created_by: user?.id ?? null,
    })
    .select('*')
    .single();
  if (polErr) throw new Error(polErr.message || 'Could not publish policy');

  // Bind all school classes the admin can write (classes have no school_id column;
  // RLS scopes office writes via teacher/school membership).
  const { data: classes, error: clsErr } = await client.from('classes').select('id');
  if (clsErr) throw new Error(clsErr.message || 'Could not list classes for binding');
  const classIds = ((classes as Array<{ id: string }> | null) ?? []).map((c) => c.id);
  const binding = planCalendarBinding({
    school_id,
    calendar_id: calendarId,
    class_ids: classIds,
  });
  if (binding.class_ids.length > 0) {
    const { error: bindErr } = await client
      .from('classes')
      .update({ grading_calendar_id: calendarId })
      .in('id', binding.class_ids);
    if (bindErr) throw new Error(bindErr.message || 'Could not bind calendar to classes');
  }

  return { policy: policy as PolicyRow, plan, binding };
}

export function draftFromStoredPayload(
  school_id: string,
  payload: GradingPolicyPayload | Record<string, unknown>,
  step: WizardStepId = 'review',
): SetupDraft {
  const p = payload as GradingPolicyPayload;
  const draft = createEmptyDraft(school_id, p.level ?? 'high');
  let next = draft;
  if (p.level) next = setField(next, 'level', p.level, 'user');
  if (p.calendar_template) next = setField(next, 'calendar.template', p.calendar_template, 'user');
  if (p.calendar) next = setField(next, 'calendar.model', p.calendar, 'user');
  if (p.year_start !== undefined) next = setField(next, 'calendar.year_start', p.year_start, 'user');
  if (p.year_end !== undefined) next = setField(next, 'calendar.year_end', p.year_end, 'user');
  if (p.credit_policy) next = setField(next, 'credit.policy', p.credit_policy, 'user');
  if (p.transfer_letter_to_pct) {
    next = setField(next, 'credit.transfer_letter_to_pct', p.transfer_letter_to_pct, 'user');
  }
  if (p.rollup_preset) next = setField(next, 'rollup.preset', p.rollup_preset, 'user');
  if (p.scales) next = setField(next, 'scale.list', p.scales, 'user');
  if (p.default_scale_id) next = setField(next, 'scale.default_id', p.default_scale_id, 'user');
  if (p.quality_point_tables) next = setField(next, 'qp.tables', p.quality_point_tables, 'user');
  if (p.course_levels) next = setField(next, 'levels.list', p.course_levels, 'user');
  if (p.gpa_mode) next = setField(next, 'gpa.mode', p.gpa_mode, 'user');
  if (p.gpa_profiles) next = setField(next, 'gpa.profiles', p.gpa_profiles, 'user');
  if (p.locks) next = setField(next, 'locks.map', p.locks, 'user');
  if (p.lock_reasons) next = setField(next, 'locks.reasons', p.lock_reasons, 'user');
  return { ...next, current_step: step };
}

