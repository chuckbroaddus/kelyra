/**
 * Plain, teacher-facing labels for gradebook setup values.
 *
 * Stored ids/enum values (tx_six_weeks, semester_0_5, 2/7+1/7, lock keys, slot paths…)
 * never change; this module only maps them to words a teacher would use at display time.
 * No imports so node:test and edge-adjacent code can load it directly.
 */

function pick(map: Record<string, string>, value: unknown, fallback?: string): string {
  const key = value == null ? '' : String(value);
  if (map[key]) return map[key]!;
  if (fallback != null) return fallback;
  return humanize(key);
}

/** Last-resort: "nine_weeks" -> "Nine weeks". */
export function humanize(raw: string): string {
  const s = raw.replace(/[_.]+/g, ' ').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const SCHOOL_LEVEL_LABELS: Record<string, string> = {
  elementary: 'Elementary school',
  middle: 'Middle school',
  high: 'High school',
  college: 'College',
  mixed: 'Several levels',
};
export const schoolLevelLabel = (v: unknown) => pick(SCHOOL_LEVEL_LABELS, v);

export const CALENDAR_TEMPLATE_LABELS: Record<string, string> = {
  tx_six_weeks: 'Six-week grading periods (Texas)',
  nine_weeks: 'Nine-week grading periods (quarters)',
  trimester: 'Trimesters',
  college_term: 'College terms',
  elementary_year_4: 'Elementary, 4 report cards a year',
  elementary_year_6: 'Elementary, 6 report cards a year',
  semester: 'Semesters',
};
export const calendarTemplateLabel = (v: unknown) => pick(CALENDAR_TEMPLATE_LABELS, v);

/** Calendar names are stored as `${template} calendar`; show the friendly template instead. */
export function calendarNameLabel(name: unknown): string {
  const s = name == null ? '' : String(name);
  const m = /^(.+) calendar$/.exec(s);
  if (m && CALENDAR_TEMPLATE_LABELS[m[1]!]) return CALENDAR_TEMPLATE_LABELS[m[1]!]!;
  return s;
}

export const ROLLUP_PRESET_LABELS: Record<string, string> = {
  '2/7+1/7': 'Three six-weeks count 2/7 each, exam counts 1/7',
  '40/40/20': 'Two grading periods 40% each, exam 20%',
  '45/45/10': 'Two grading periods 45% each, exam 10%',
  '3/7+3/7+1/7': 'Two grading periods 3/7 each, exam 1/7',
  '85/15': 'Grading periods 85%, exam 15%',
  '25x4': 'Four quarters, 25% each',
  '50/50': 'Two grading periods, 50% each, no exam',
  year_mean: 'Plain average of all grading periods',
};
export const rollupPresetLabel = (v: unknown) => pick(ROLLUP_PRESET_LABELS, v, v == null ? '' : String(v));

export const CREDIT_UNIT_LABELS: Record<string, string> = {
  semester_0_5: '½ credit per semester',
  year_1_0: '1 credit per year',
  none: 'No credit',
};
export const creditUnitLabel = (v: unknown) => pick(CREDIT_UNIT_LABELS, v);

export const GPA_MODE_LABELS: Record<string, string> = {
  off: 'No GPA',
  unweighted: 'Unweighted GPA only',
  unweighted_and_weighted: 'Unweighted and weighted GPA',
  with_rank: 'Unweighted, weighted, and class-rank GPA',
};
export const gpaModeLabel = (v: unknown) => pick(GPA_MODE_LABELS, v);

export const SCALE_LABELS: Record<string, string> = {
  us_10: '10-point scale (90 = A)',
  texas_with_d: 'Texas scale with D',
  texas_no_d: 'Texas scale, no D',
  college_plus_minus: 'Plus/minus letters',
  seven_point: '7-point scale',
  esnu: 'E / S / N / U marks',
  pf: 'Pass / Fail',
  su: 'Satisfactory / Unsatisfactory',
  crnc: 'Credit / No credit',
};
export const scaleLabel = (v: unknown, fallbackName?: string) => pick(SCALE_LABELS, v, fallbackName);

export const LOCK_FIELD_LABELS: Record<string, string> = {
  engine: 'How the average is figured',
  categories: 'Categories and weights',
  scale: 'Letter grade scale',
  floor: 'Lowest grade allowed',
  late: 'Late work penalty',
  drop_lowest: 'Dropping lowest scores',
  retake: 'Retakes',
  assignment_max: 'Most points per assignment',
  book_mode: 'Gradebook starts fresh each grading period',
  rollup: 'Semester grade formula and exam weight',
};
export const lockFieldLabel = (v: unknown) => pick(LOCK_FIELD_LABELS, v);

export const QP_METHOD_LABELS: Record<string, string> = {
  letter_map: 'By letter grade',
  numeric_band: 'By percent range (6.0 chart)',
  percent_map: 'By exact percent',
};
export const qpMethodLabel = (v: unknown) => pick(QP_METHOD_LABELS, v);

export const MISSING_RULE_LABELS: Record<string, string> = {
  omit: "Doesn't count until it's turned in",
  zero: 'Counts as 0',
  floor: 'Counts as the lowest grade allowed',
  floor_50: 'Counts as 50',
};
export const missingRuleLabel = (v: unknown) => pick(MISSING_RULE_LABELS, v);

export const LATE_TYPE_LABELS: Record<string, string> = {
  none: 'No automatic late penalty',
  flat: 'One-time late penalty',
  flat_percent: 'One-time late penalty',
  per_day: 'Penalty for each day late',
  percent_per_day: 'Penalty for each day late',
  per_hour: 'Penalty for each hour late',
};
export const lateTypeLabel = (v: unknown) => pick(LATE_TYPE_LABELS, v);

export const EXTRA_CREDIT_METHOD_LABELS: Record<string, string> = {
  A: 'Raises or replaces a score',
  B: 'Adds bonus points',
  C: 'Has its own category',
};
export const extraCreditMethodLabel = (v: unknown) => pick(EXTRA_CREDIT_METHOD_LABELS, v);

export const BOOK_MODE_LABELS: Record<string, string> = {
  reset_each_marking_period: 'Start fresh each grading period',
  rolling_year: 'Keep one running average all year',
};
export const bookModeLabel = (v: unknown) => pick(BOOK_MODE_LABELS, v);

export const ENGINE_LABELS: Record<string, string> = {
  total_points: 'Total points',
  weighted_points_inside: 'Weighted categories, points count',
  weighted_percent_inside: 'Weighted categories, every assignment equal',
  item_weights: 'Each assignment has its own weight',
  none: 'No overall grade',
};
export const engineLabel = (v: unknown) => pick(ENGINE_LABELS, v);

export const SYLLABUS_STATUS_LABELS: Record<string, string> = {
  none: 'Not set up yet',
  draft: 'Draft (not used for grades yet)',
  published: 'Published',
  archived: 'Archived',
};
export const syllabusStatusLabel = (v: unknown) => pick(SYLLABUS_STATUS_LABELS, v);

/** Setup-chat answer paths -> words for "Got it" / "So far" lines. */
export const INTERVIEW_SLOT_LABELS: Record<string, string> = {
  level: 'School level',
  'calendar.template': 'Grading periods',
  'credit.policy': 'Credit',
  'rollup.preset': 'Semester grade',
  'exam.separate': 'Semester exam',
  'scale.default_id': 'Letter scale',
  'scale.passing_pct': 'Passing grade',
  'gpa.mode': 'GPA',
  'gpa.weighted_bonus': 'Extra GPA points',
  'levels.ap_points': 'AP A is worth',
  'gpa.exclude': 'Left out of GPA',
  engine: 'Average',
  categories: 'Categories',
  within_category: 'Inside a category',
  missing_rule: 'Missing work',
  late_rule: 'Late work',
  drop_lowest: 'Drop lowest',
  extra_credit: 'Extra credit',
  retakes: 'Retakes',
};
export const interviewSlotLabel = (path: string) => pick(INTERVIEW_SLOT_LABELS, path);

const WEIGHTED_BONUS_LABELS: Record<string, string> = {
  default: '+0.5 Honors, +1.0 AP',
  numeric_5: '5.0 chart',
  numeric_6: '6.0 chart',
  none: 'Same as regular',
};

const WITHIN_LABELS: Record<string, string> = {
  points_inside: 'Bigger assignments count more',
  percent_inside: 'Every assignment counts the same',
};

/** Friendly text for one setup answer value. */
export function interviewSlotValue(path: string, value: unknown): string {
  if (value == null) return '—';
  switch (path) {
    case 'level':
      return schoolLevelLabel(value);
    case 'calendar.template':
      return calendarTemplateLabel(value);
    case 'credit.policy': {
      const unit = typeof value === 'object' ? (value as { unit?: string }).unit : value;
      return creditUnitLabel(unit);
    }
    case 'rollup.preset':
      return rollupPresetLabel(value);
    case 'exam.separate':
      return value === true ? 'Yes' : value === false ? 'No' : value === 'exempt_high' ? 'Yes, high averages can skip it' : String(value);
    case 'scale.default_id':
      return scaleLabel(value);
    case 'scale.passing_pct':
      return `${value}`;
    case 'gpa.mode':
      return gpaModeLabel(value);
    case 'gpa.weighted_bonus':
      return pick(WEIGHTED_BONUS_LABELS, value);
    case 'levels.ap_points':
      return `${value} points`;
    case 'gpa.exclude': {
      if (typeof value !== 'object') return String(value);
      const o = value as Record<string, boolean>;
      const names: string[] = [];
      if (o.pe) names.push('PE');
      if (o.pass_fail) names.push('pass/fail classes');
      if (o.aide) names.push('office aide');
      if (o.recovery) names.push('credit recovery');
      return names.length ? names.join(', ') : 'Nothing';
    }
    case 'engine':
      return engineLabel(value);
    case 'within_category':
      return pick(WITHIN_LABELS, value);
    case 'missing_rule':
      return missingRuleLabel(value);
    case 'late_rule': {
      const t = typeof value === 'object' ? (value as { type?: string }).type : value;
      return lateTypeLabel(t ?? 'none');
    }
    case 'categories': {
      if (!Array.isArray(value)) return String(value);
      return value
        .map((c) => {
          const r = c as { label?: string; weight_percent?: number };
          return `${r.label ?? '?'} ${r.weight_percent ?? 0}%`;
        })
        .join(', ');
    }
    case 'drop_lowest':
      return Number(value) > 0 ? `Lowest ${value}` : 'None';
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return humanize(value);
  if (typeof value === 'number') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** "School level: High school" style line for one answer. */
export function interviewSlotLine(path: string, value: unknown): string {
  return `${interviewSlotLabel(path)}: ${interviewSlotValue(path, value)}`;
}

/** Ingest field status shown next to each found setting. */
export const INGEST_STATUS_LABELS: Record<string, string> = {
  proposed: 'Found',
  needs_review: 'Please check',
  unknown: 'Not sure',
  conflict: 'Document disagrees with itself',
};
export const ingestStatusLabel = (v: unknown) => pick(INGEST_STATUS_LABELS, v);

/** How sure the reader is, in words (instead of a percent). */
export function ingestConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'Clearly stated';
  if (confidence >= 0.5) return 'Probably right';
  return 'Unclear';
}

export const INGEST_DECISION_LABELS: Record<string, string> = {
  accept: 'Will use this',
  reject: "Won't use this",
  edit: 'Editing',
};

/**
 * Our own canned ingest notices rewritten for teachers. Returns null when the notice is
 * a behind-the-scenes note a teacher does not need. Unknown codes pass through unchanged.
 */
export function plainIngestNotice(code: string, message: string): string | null {
  switch (code) {
    case 'unknown_paths_dropped':
      return 'Some parts of the document did not match any setting here, so they were left out.';
    case 'dropped_no_evidence':
      return null;
    case 'school_core_retry':
    case 'handwriting_retry':
      return null;
    case 'unmapped_missing_rule':
      return 'We could not tell how missing work is graded. Please choose it yourself.';
    case 'within_category':
      return 'The document does not say whether bigger assignments count more inside a category. Please choose.';
    case 'mixed_document_review':
      return 'This page may cover more than one topic. Check each setting carefully. If two policies are on one page, take a photo of each one separately.';
    case 'mixed_document':
      return message.startsWith('Separate')
        ? 'Take a separate photo of each document and try again.'
        : 'This looks like two documents on one page. Take a separate photo of each syllabus or handbook page.';
    default:
      return message;
  }
}

/** Help-topic "affects" tags in words. */
export const HELP_AFFECT_WORDS: Record<string, string> = {
  live_grade: 'the grade students see now',
  report_card: 'report cards',
  progress_report: 'progress reports',
  transcript: 'transcripts',
  unweighted_gpa: 'unweighted GPA',
  weighted_gpa: 'weighted GPA',
  credit: 'credit',
  eligibility: 'eligibility (like for sports)',
  letter: 'letter grades',
};
