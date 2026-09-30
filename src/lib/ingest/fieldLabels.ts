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
  'calendar.model': 'Calendar model',
  'calendar.period_model': 'Marking period model',
  'credit.policy': 'Credit policy',
  'credit.unit': 'Credit unit',
  'credit.year_link': 'Year average for credit',
  'credit.attendance_gate': 'Attendance gate for credit',
  'credit.passing_threshold': 'Passing threshold',
  'rollup.preset': 'Semester / year rollup',
  'rollup.custom_weights': 'Custom rollup weights',
  'rollup.exam_enabled': 'Semester exam in rollup',
  'scale.default_id': 'Default letter scale',
  'scale.list': 'Letter scales',
  'scale.bands': 'Letter bands',
  'scale.passing_pct': 'Passing percent',
  'scale.rounding': 'Rounding rule',
  'qp.tables': 'Quality-point chart',
  'qp.method': 'Quality-point method',
  'levels.list': 'Course levels',
  'gpa.mode': 'GPA mode',
  'gpa.profiles': 'GPA profiles',
  'gpa.include': 'What counts in GPA',
  'gpa.repeat': 'Repeat course rule',
  'gpa.rank': 'Class rank GPA',
  'locks.map': 'Teacher locks',
  'school.notes': 'School notes',
  'syllabus.title': 'Course title',
  'syllabus.engine': 'Grading engine',
  'syllabus.within_category': 'Inside a category',
  'syllabus.categories': 'Grade categories',
  'syllabus.late_rule': 'Late penalty',
  'syllabus.missing_rule': 'Missing work',
  'syllabus.extra_credit_method': 'Extra credit method',
  'syllabus.ec_cap': 'Extra credit cap',
  'syllabus.floor': 'Period floor',
  'syllabus.ceiling': 'Period ceiling',
  'syllabus.book_mode': 'Gradebook mode',
  'syllabus.exam_weight': 'Exam weight',
  'syllabus.rollup_preset': 'Class rollup preset',
  'syllabus.rounding': 'Rounding',
  'syllabus.empty_category': 'Empty category',
  'syllabus.narrative': 'Other notes from document',
  'syllabus.term_structure': 'Term structure',
  'syllabus.retake': 'Retakes',
  'syllabus.assignment_max': 'Assignment max',
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  'calendar.template': {
    tx_six_weeks: 'Texas six weeks',
    nine_weeks: 'Nine weeks',
    trimester: 'Trimester',
    college_term: 'College term',
    elementary_year_4: 'Elementary (4 periods)',
    elementary_year_6: 'Elementary (6 periods)',
    semester: 'Semester',
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
    weighted_points_inside: 'Weighted, points inside',
    weighted_percent_inside: 'Weighted, equal percent',
    item_weights: 'Item weights',
    none: 'No overall grade',
  },
  'syllabus.within_category': {
    points_inside: 'Add points inside the category',
    percent_inside: 'Average percents inside the category',
  },
  'syllabus.missing_rule': {
    zero: 'Count as zero',
    floor: 'Use a floor',
    omit: 'Omit from average',
  },
  'syllabus.extra_credit_method': {
    A: 'Method A',
    B: 'Method B',
    C: 'Method C',
  },
  'syllabus.book_mode': {
    reset_each_marking_period: 'Reset each marking period',
    rolling_year: 'Rolling year',
  },
  'qp.method': {
    letter_map: 'Letter map',
    numeric_band: 'Numeric percent bands',
    percent_map: 'Percent map',
  },
  'gpa.mode': {
    off: 'Off',
    unweighted: 'Unweighted only',
    unweighted_and_weighted: 'Unweighted and weighted',
  },
  'rollup.preset': {
    '2/7+1/7': '2/7 + 1/7 (six-weeks + exam)',
    '40/40/20': '40 / 40 / 20',
    '45/45/10': '45 / 45 / 10',
    '3/7+3/7+1/7': '3/7 + 3/7 + 1/7',
    '85/15': '85 / 15',
    '25x4': '25 × 4',
    '50/50': '50 / 50',
    year_mean: 'Simple year mean',
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
    if (o.type === 'floor') return o.floor != null ? `Floor of ${o.floor}` : 'Use a floor';
    if (o.type === 'zero') return 'Count as zero';
    if (o.type === 'omit') return 'Omit from average';
  }
  if (path === 'syllabus.late_rule' && typeof value === 'object') {
    const o = value as { type?: string; amount?: number; unit?: string };
    if (o.type === 'none') return 'No late work / not accepted';
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
    return `${value.length} quality-point band${value.length === 1 ? '' : 's'}`;
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
