/**
 * Teacher-facing labels for every ingest path + common enum values.
 * Raw keys stay available for debug/details only.
 */
import { SCHOOL_POLICY_PATHS, SYLLABUS_PATHS } from './allowedPaths.ts';

/** Every path the extractor may emit must have a plain label. */
export const INGEST_FIELD_LABELS: Record<string, string> = {
  level: 'School level',
  'calendar.template': 'Grading calendar',
  'calendar.year_start': 'School year start',
  'calendar.year_end': 'School year end',
  'calendar.model': 'Grading calendar details',
  'calendar.period_model': 'Grading period length',
  'credit.policy': 'Credit policy',
  'credit.unit': 'Credit unit',
  'credit.year_link': 'Year average for credit',
  'credit.attendance_gate': 'Attendance needed for credit',
  'credit.passing_threshold': 'Passing grade',
  'rollup.preset': 'Semester grade formula',
  'rollup.custom_weights': 'Custom semester grade weights',
  'rollup.exam_enabled': 'Semester exam counts in semester grade',
  'scale.default_id': 'Default letter scale',
  'scale.list': 'Letter scales',
  'scale.bands': 'Letter grade ranges',
  'scale.passing_pct': 'Passing percent',
  'scale.rounding': 'Rounding rule',
  'qp.tables': 'GPA points chart',
  'qp.method': 'How GPA points are given',
  'levels.list': 'Course levels',
  'gpa.mode': 'GPA',
  'gpa.profiles': 'GPA types',
  'gpa.include': 'What counts in GPA',
  'gpa.repeat': 'Repeat course rule',
  'gpa.rank': 'Class rank GPA',
  'locks.map': 'What teachers can change',
  'school.notes': 'School notes',
  'syllabus.title': 'Course title',
  'syllabus.engine': 'How grades add up',
  'syllabus.within_category': 'Inside a category',
  'syllabus.categories': 'Grade categories',
  'syllabus.late_rule': 'Late penalty',
  'syllabus.missing_rule': 'Missing work',
  'syllabus.extra_credit_method': 'How extra credit works',
  'syllabus.ec_cap': 'Most extra credit allowed',
  'syllabus.floor': 'Lowest grade allowed',
  'syllabus.ceiling': 'Highest grade allowed',
  'syllabus.book_mode': 'Fresh start each grading period',
  'syllabus.exam_weight': 'Exam weight',
  'syllabus.rollup_preset': 'Semester grade formula',
  'syllabus.rounding': 'Rounding',
  'syllabus.empty_category': 'Category with no grades yet',
  'syllabus.narrative': 'Other notes from document',
  'syllabus.term_structure': 'How the year is split',
  'syllabus.retake': 'Retakes',
  'syllabus.assignment_max': 'Most points per assignment',
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  'calendar.template': {
    tx_six_weeks: 'Six-week grading periods (Texas)',
    nine_weeks: 'Nine-week grading periods (quarters)',
    trimester: 'Trimesters',
    college_term: 'College terms',
    elementary_year_4: 'Elementary, 4 report cards a year',
    elementary_year_6: 'Elementary, 6 report cards a year',
    semester: 'Semesters',
  },
  'calendar.period_model': {
    six_weeks: 'Six weeks',
    nine_weeks: 'Nine weeks',
    trimester: 'Trimester',
    semester: 'Semester',
    year: 'Year',
    college: 'College',
    custom: 'Custom',
  },
  'syllabus.engine': {
    total_points: 'Total points',
    weighted_points_inside: 'Weighted categories, points count',
    weighted_percent_inside: 'Weighted categories, every assignment equal',
    item_weights: 'Each assignment has its own weight',
    none: 'No overall grade',
  },
  'syllabus.within_category': {
    points_inside: 'Bigger assignments count more',
    percent_inside: 'Every assignment counts the same',
  },
  'syllabus.missing_rule': {
    zero: 'Count as zero',
    floor: 'Counts as the lowest grade allowed',
    omit: "Doesn't count until it's turned in",
  },
  'syllabus.extra_credit_method': {
    A: 'Raises or replaces a score',
    B: 'Adds bonus points',
    C: 'Has its own category',
  },
  'syllabus.book_mode': {
    reset_each_marking_period: 'Start fresh each grading period',
    rolling_year: 'Keep one running average all year',
  },
  'qp.method': {
    letter_map: 'By letter grade',
    numeric_band: 'By percent range',
    percent_map: 'By exact percent',
  },
  'gpa.mode': {
    off: 'No GPA',
    unweighted: 'Unweighted GPA only',
    unweighted_and_weighted: 'Unweighted and weighted GPA',
  },
  'rollup.preset': {
    '2/7+1/7': 'Three six-weeks count 2/7 each, exam counts 1/7',
    '40/40/20': 'Two grading periods 40% each, exam 20%',
    '45/45/10': 'Two grading periods 45% each, exam 10%',
    '3/7+3/7+1/7': 'Two grading periods 3/7 each, exam 1/7',
    '85/15': 'Grading periods 85%, exam 15%',
    '25x4': 'Four quarters, 25% each',
    '50/50': 'Two grading periods, 50% each, no exam',
    year_mean: 'Plain average of all grading periods',
  },
};

export function labelForIngestPath(path: string): string {
  if (INGEST_FIELD_LABELS[path]) return INGEST_FIELD_LABELS[path];
  const leaf = path.split('.').pop() ?? path;
  return leaf.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function labelForIngestValue(path: string, value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const map = VALUE_LABELS[path];
    if (map?.[value]) return map[value];
    if (map?.[value.toLowerCase()]) return map[value.toLowerCase()];
    return value;
  }
  if (path === 'syllabus.missing_rule' && typeof value === 'object') {
    const o = value as { type?: string; floor?: number };
    if (o.type === 'floor') return o.floor != null ? `Counts as ${o.floor}` : 'Counts as the lowest grade allowed';
    if (o.type === 'zero') return 'Count as zero';
    if (o.type === 'omit') return "Doesn't count until it's turned in";
  }
  if (path === 'syllabus.late_rule' && typeof value === 'object') {
    const o = value as { type?: string; amount?: number; unit?: string };
    if (o.type === 'none') return 'No automatic late penalty';
    if (o.type === 'per_day') return `−${o.amount ?? '?'} ${o.unit ?? 'percent'} per day`;
    if (o.type === 'per_hour') return `−${o.amount ?? '?'} ${o.unit ?? 'percent'} per hour`;
    if (o.type === 'flat') return `Flat −${o.amount ?? '?'} ${o.unit ?? 'percent'}`;
  }
  if (path === 'syllabus.categories' && Array.isArray(value)) {
    return value
      .map((row) => {
        if (!row || typeof row !== 'object') return String(row);
        const r = row as { label?: string; weight_percent?: number };
        return `${r.label ?? '?'}: ${r.weight_percent ?? 0}%`;
      })
      .join(' · ');
  }
  if (path === 'levels.list' && Array.isArray(value)) {
    return value
      .map((row) => {
        if (typeof row === 'string') return row;
        if (!row || typeof row !== 'object') return String(row);
        const r = row as { label?: string; key?: string; weighted_bonus?: number };
        const bonus =
          r.weighted_bonus != null && r.weighted_bonus !== 0
            ? ` (${r.weighted_bonus > 0 ? '+' : ''}${r.weighted_bonus})`
            : '';
        return `${r.label ?? r.key ?? '?'}${bonus}`;
      })
      .join(' · ');
  }
  if (path === 'qp.tables' && Array.isArray(value)) {
    return `GPA points for ${value.length} grade range${value.length === 1 ? '' : 's'}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function allIngestEmitPaths(): string[] {
  return [...SCHOOL_POLICY_PATHS, ...SYLLABUS_PATHS];
}

export function pathsMissingLabels(): string[] {
  return allIngestEmitPaths().filter((p) => !INGEST_FIELD_LABELS[p]);
}
