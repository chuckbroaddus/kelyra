/**
 * GB-18 school syllabus templates (FR-TPL-02) + seed catalog.
 * Pure data; DB table seeds these keys via migration.
 */
export type SyllabusTemplateCategory = {
  key: string;
  label: string;
  weight_percent: number;
  drop_lowest_n?: number;
  max_weight_hint?: number | null;
};

export type SyllabusTemplatePayload = {
  engine: string;
  within_category: 'points_inside' | 'percent_inside' | null;
  categories: SyllabusTemplateCategory[];
  late_rule: { type: string; amount?: number; unit?: string };
  missing_rule: 'zero' | 'floor' | 'omit';
  floor: number | null;
  book_mode: 'reset_each_marking_period' | 'rolling_year';
  extra_credit_method: 'A' | 'B' | 'C';
  retake: {
    enabled: boolean;
    cap_pct: number | null;
    method: 'replace' | 'higher_of' | 'average' | 'cap_at_N';
  } | null;
  scale_hint: string | null;
  notes: string | null;
};

export type SyllabusTemplateDef = {
  key: string;
  name: string;
  description: string;
  payload: SyllabusTemplatePayload;
};

/** FR-TPL-02 examples. */
export const SCHOOL_SYLLABUS_TEMPLATES: SyllabusTemplateDef[] = [
  {
    key: 'spring_isd_50_50',
    name: 'Spring ISD style 50/50 major-daily',
    description: 'Major grades 50%, daily 50%, equal-percent inside, no late decay by default.',
    payload: {
      engine: 'weighted_percent_inside',
      within_category: 'percent_inside',
      categories: [
        { key: 'major', label: 'Major', weight_percent: 50 },
        { key: 'daily', label: 'Daily', weight_percent: 50 },
      ],
      late_rule: { type: 'none' },
      missing_rule: 'zero',
      floor: null,
      book_mode: 'reset_each_marking_period',
      extra_credit_method: 'B',
      retake: null,
      scale_hint: 'texas_no_d',
      notes: 'Common Spring ISD secondary split.',
    },
  },
  {
    key: 'homework_cap_10',
    name: 'Homework ≤10%',
    description: 'Tests 60 / quizzes 30 / homework 10 with drop-1 on homework.',
    payload: {
      engine: 'weighted_percent_inside',
      within_category: 'percent_inside',
      categories: [
        { key: 'tests', label: 'Tests', weight_percent: 60 },
        { key: 'quizzes', label: 'Quizzes', weight_percent: 30 },
        {
          key: 'homework',
          label: 'Homework',
          weight_percent: 10,
          drop_lowest_n: 1,
          max_weight_hint: 10,
        },
      ],
      late_rule: { type: 'per_day', amount: 10, unit: 'percent' },
      missing_rule: 'omit',
      floor: null,
      book_mode: 'reset_each_marking_period',
      extra_credit_method: 'B',
      retake: null,
      scale_hint: 'us_10',
      notes: 'Homework weight capped at 10%.',
    },
  },
  {
    key: 'texas_70_retake_cap',
    name: 'Texas 70-pass + retake cap 70',
    description: 'Texas secondary defaults with retake scores capped at 70.',
    payload: {
      engine: 'weighted_percent_inside',
      within_category: 'percent_inside',
      categories: [
        { key: 'tests', label: 'Tests', weight_percent: 50 },
        { key: 'daily', label: 'Daily', weight_percent: 50 },
      ],
      late_rule: { type: 'none' },
      missing_rule: 'zero',
      floor: 50,
      book_mode: 'reset_each_marking_period',
      extra_credit_method: 'B',
      retake: { enabled: true, cap_pct: 70, method: 'cap_at_N' },
      scale_hint: 'texas_no_d',
      notes: 'Texas template default retake cap is 70 (FR-SYL-12).',
    },
  },
];

export function listSchoolSyllabusTemplates(): SyllabusTemplateDef[] {
  return SCHOOL_SYLLABUS_TEMPLATES.map((t) => ({
    ...t,
    payload: {
      ...t.payload,
      categories: t.payload.categories.map((c) => ({ ...c })),
      late_rule: { ...t.payload.late_rule },
      retake: t.payload.retake ? { ...t.payload.retake } : null,
    },
  }));
}

export function getSchoolSyllabusTemplate(key: string): SyllabusTemplateDef | null {
  return listSchoolSyllabusTemplates().find((t) => t.key === key) ?? null;
}

export function templateKeys(): string[] {
  return SCHOOL_SYLLABUS_TEMPLATES.map((t) => t.key);
}
