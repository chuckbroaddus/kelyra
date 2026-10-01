/**
 * GB-12 question graphs — school S-Q* and syllabus T-Q* (SRS §5.13).
 */
import {
  isNotSure,
  parseCategories,
  parseDrops,
  parseEmptyCategory,
  parseEngine,
  parseExam,
  parseExtraCredit,
  parseFloor,
  parseLateRule,
  parseMissing,
  parseRetake,
  parseRounding,
  parseTerms,
  parseTitle,
  parseWithin,
  parseYearDates,
  weightSum,
} from './parseAnswers.ts';
import {
  calendarTemplateLabel,
  gpaModeLabel,
  rollupPresetLabel,
  scaleLabel,
  schoolLevelLabel,
} from '../grade/plainLabels.ts';
import type {
  ExtractedSlot,
  FilledSlot,
  QuestionChip,
  GraphContext,
  InterviewSection,
  InterviewWizard,
  QuestionNode,
} from './types.ts';

function has(filled: Record<string, FilledSlot>, path: string): boolean {
  return Object.prototype.hasOwnProperty.call(filled, path);
}

function filledValue<T>(filled: Record<string, FilledSlot>, path: string, fallback: T): T {
  const f = filled[path];
  return f == null ? fallback : (f.value as T);
}

function levelOf(ctx: GraphContext): string {
  return String(filledValue(ctx.filled, 'level', ctx.draft.level ?? 'high'));
}

function templateOf(ctx: GraphContext): string {
  return String(filledValue(ctx.filled, 'calendar.template', ''));
}

function creditUnit(ctx: GraphContext): string {
  const c = filledValue<{ unit?: string } | string>(ctx.filled, 'credit.policy', { unit: 'semester_0_5' });
  if (typeof c === 'string') return c;
  return String(c?.unit ?? 'semester_0_5');
}

function gpaMode(ctx: GraphContext): string {
  return String(filledValue(ctx.filled, 'gpa.mode', 'off'));
}

function engineOf(ctx: GraphContext): string {
  return String(filledValue(ctx.filled, 'engine', ctx.draft.engine ?? ''));
}


/** Filled value, else current draft value (syllabus bag keys / school SetupDraft fields). */
function valueOf(ctx: GraphContext, path: string): unknown {
  if (has(ctx.filled, path)) return ctx.filled[path]!.value;
  if (ctx.wizard === 'school') {
    const fields = (ctx.draft as { fields?: Record<string, { value: unknown }> }).fields ?? {};
    return fields[path]?.value;
  }
  return (ctx.draft as Record<string, unknown>)[path];
}

function isWeighted(ctx: GraphContext): boolean {
  const e = engineOf(ctx) || String((ctx.draft as Record<string, unknown>).engine ?? '');
  return e === 'weighted_points_inside' || e === 'weighted_percent_inside';
}

function lockedSyllabus(ctx: GraphContext, key: string): boolean {
  const locks = ((ctx.draft as Record<string, unknown>).locks ?? {}) as Record<string, unknown>;
  return locks[key] === true;
}

type Cat = { key: string; label: string; weight_percent: number; rules?: { drop_lowest_n?: number } };

function categoriesOf(ctx: GraphContext): Cat[] {
  const v = valueOf(ctx, 'categories');
  return Array.isArray(v) ? (v as Cat[]) : [];
}

const NS: QuestionChip = { id: 'ns', label: 'Not sure — use the usual choice', action: 'not_sure' };
const REST: QuestionChip = { id: 'rest', label: 'Use the usual choices for the rest', action: 'defaults_rest' };

function slots(obj: Record<string, unknown> | null, conf = 0.9): ExtractedSlot[] {
  if (!obj) return [];
  return Object.entries(obj).map(([path, value]) => ({ path, value, confidence: conf, evidence: null }));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 2026-08-15 → “Aug 15, 2026” (no raw ISO dates on screen). */
function plainDate(v: unknown): string {
  const m = typeof v === 'string' ? v.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  if (!m) return v == null || v === '' ? 'not set' : String(v);
  return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${Number(m[3])}, ${m[1]}`;
}

/** “ · 70 passes” unless the scale name already says it. */
function passingSuffix(ctx: GraphContext): string {
  const id = String(valueOf(ctx, 'scale.default_id'));
  const pass = valueOf(ctx, 'scale.passing_pct');
  if (pass == null) return '';
  const name = SCALE_LABEL[id] ?? '';
  return name.includes(`${String(pass)} passes`) ? '' : ` · ${String(pass)} passes`;
}

function pct(n: unknown): string {
  return n == null ? '—' : `${Math.round(Number(n) * 1000) / 1000}%`;
}

export function describeLate(v: unknown): string {
  const r = (v ?? { type: 'none' }) as {
    type?: string;
    amount?: number;
    unit?: string;
    floor_pct?: number | null;
    hard_deadline_days?: number | null;
    grace_hours?: number;
  };
  const unit = r.unit === 'points' ? ' pts' : '%';
  let base =
    r.type === 'per_day'
      ? `${r.amount ?? 0}${unit} off per day`
      : r.type === 'per_hour'
        ? `${r.amount ?? 0}${unit} off per hour`
        : r.type === 'flat'
          ? `${r.amount ?? 0}${unit} off once`
          : r.hard_deadline_days === 0
            ? 'not accepted late'
            : 'no automatic penalty';
  if (r.floor_pct != null) base += `, no lower than ${r.floor_pct}%`;
  if (r.hard_deadline_days) base += `, accepted up to ${r.hard_deadline_days} days`;
  if (r.grace_hours) base += `, ${r.grace_hours}h grace`;
  return base;
}

export function describeRetake(v: unknown, cats: Array<{ key: string; label: string }> = []): string {
  if (!v) return 'no retakes';
  const r = v as { method?: string; attempts?: number; cap?: number | null; window_days?: number | null; eligible_category_ids?: string[] };
  const m = r.method === 'replace' ? 'new score replaces' : r.method === 'average' ? 'average of attempts' : 'keep the higher score';
  let s = `${r.attempts ?? 1} retake${(r.attempts ?? 1) > 1 ? 's' : ''}, ${m}`;
  if (r.cap != null) s += `, capped at ${r.cap}`;
  if (r.window_days != null) s += `, within ${r.window_days} days`;
  if (r.eligible_category_ids?.length) s += ` (${r.eligible_category_ids.map((k) => cats.find((c) => c.key === k)?.label ?? k).join(', ')})`;
  return s;
}

const ENGINE_LABEL: Record<string, string> = {
  total_points: 'Total points',
  weighted_points_inside: 'Weighted categories, bigger assignments count more',
  weighted_percent_inside: 'Weighted categories, every assignment counts the same',
  item_weights: 'Each assignment has its own weight',
  none: 'No overall grade',
};

const ROUNDING_WORDS: Record<string, string> = {
  nearest_whole: 'nearest whole number',
  half_up: '.5 always rounds up',
  truncate: 'drop the decimals',
  none: 'no rounding',
};

const REPEAT_WORDS: Record<string, string> = {
  include_both: 'both attempts count',
  replace: 'new grade replaces the old one',
  average: 'average of the attempts',
  forgive_d_f: 'new grade replaces a D or F',
};

const TERM_WORDS: Record<string, string> = {
  year: 'one school year',
  semesters: 'semesters',
  quarters: 'quarters',
  trimesters: 'trimesters',
  custom: 'six-weeks or other periods',
};

const LOCK_WORDS: Record<string, string> = {
  engine: 'how grades add up',
  categories: 'categories and weights',
  scale: 'letter scale',
  floor: 'lowest grade',
  late: 'late work',
  drop_lowest: 'drop lowest',
  retake: 'retakes',
  rollup: 'semester grade',
  missing: 'missing work',
  extra_credit: 'extra credit',
  rounding: 'rounding',
  assignment_max: 'assignment point limits',
  book_mode: 'fresh start each period',
};

export const SCHOOL_SECTIONS: InterviewSection[] = [
  'level', 'calendar', 'credit', 'scale', 'gpa', 'locks', 'review',
];

export const SYLLABUS_SECTIONS: InterviewSection[] = [
  'engine', 'categories', 'status', 'extras', 'math', 'terms', 'review',
];

export const SECTION_LABELS: Record<InterviewSection, string> = {
  level: 'School level',
  calendar: 'Grading periods',
  credit: 'Credit',
  scale: 'Letter grades',
  gpa: 'GPA',
  locks: 'Teacher limits',
  engine: 'How grades add up',
  categories: 'Categories',
  status: 'Missing & late',
  extras: 'Extras',
  math: 'Grade math',
  terms: 'Grading periods',
  review: 'Review',
};

const TEMPLATE_LABEL: Record<string, string> = {
  tx_six_weeks: 'six-weeks (6 report cards)',
  nine_weeks: 'nine-weeks (4 report cards)',
  trimester: 'trimesters',
  college_term: 'semesters only',
  semester: 'semesters',
  elementary_year_4: 'four report cards',
  elementary_year_6: 'six report cards (elementary)',
};

const SCALE_LABEL: Record<string, string> = {
  us_10: '10-point (90 = A)',
  texas_with_d: 'Texas, 70 passes, has a D',
  texas_no_d: 'Texas, 70 passes, no D',
  college_plus_minus: 'Plus/minus letters',
  seven_point: '7-point (93 = A)',
  esnu: 'E/S/N/U marks',
  pf: 'Pass/Fail',
};

export const SCHOOL_NODES: QuestionNode[] = [
  {
    id: 'S-Q1',
    section: 'level',
    paths: ['level'],
    question: 'What kind of school is this?',
    help_key: 'help.wizard.level',
    edit_label: 'school level',
    summarize: (ctx) => `School level: ${schoolLevelLabel(valueOf(ctx, 'level'))}`,
    chips: [
      { id: 'elementary', label: 'Elementary', slots: [{ path: 'level', value: 'elementary' }] },
      { id: 'middle', label: 'Middle', slots: [{ path: 'level', value: 'middle' }] },
      { id: 'high', label: 'High', slots: [{ path: 'level', value: 'high' }] },
      { id: 'college', label: 'College', slots: [{ path: 'level', value: 'college' }] },
      { id: 'mixed', label: 'Several levels', slots: [{ path: 'level', value: 'mixed' }] },
    ],
    parse: (t) => {
      const m = t.toLowerCase().match(/\b(elementary|middle|high|college|mixed|k-?12)\b/);
      if (!m) return [];
      return slots({ level: m[1] === 'k12' || m[1] === 'k-12' ? 'mixed' : m[1] });
    },
    defaults: () => slots({ level: 'high' }, 0.6),
  },
  {
    id: 'S-Q2',
    section: 'calendar',
    paths: ['calendar.template'],
    question: 'How often do report cards go home?',
    help_key: 'help.glyphs.6w',
    edit_label: 'report cards',
    summarize: (ctx) => `Report cards: ${TEMPLATE_LABEL[String(valueOf(ctx, 'calendar.template'))] ?? calendarTemplateLabel(valueOf(ctx, 'calendar.template'))}`,
    chips: [
      { id: '6w', label: 'Every 6 weeks', slots: [{ path: 'calendar.template', value: 'tx_six_weeks' }] },
      { id: '9w', label: 'Every 9 weeks', slots: [{ path: 'calendar.template', value: 'nine_weeks' }] },
      { id: 'tri', label: 'Trimesters', slots: [{ path: 'calendar.template', value: 'trimester' }] },
      { id: 'sem', label: 'Semesters only', slots: [{ path: 'calendar.template', value: 'college_term' }] },
      { id: 'year4', label: 'Elementary, 4 report cards', slots: [{ path: 'calendar.template', value: 'elementary_year_4' }] },
      { id: 'year6', label: 'Elementary, 6 report cards', slots: [{ path: 'calendar.template', value: 'elementary_year_6' }] },
      NS,
    ],
    effects: (ctx) => {
      const t = templateOf(ctx);
      if (t === 'tx_six_weeks') return 'Report cards will go home 6 times a year. Transcripts still show one grade for each semester.';
      if (t === 'nine_weeks') return 'Report cards will go home 4 times a year (quarters).';
      if (t === 'trimester') return 'Report cards will go home 3 times a year.';
      return null;
    },
  },
  {
    id: 'S-Q2b',
    section: 'calendar',
    paths: ['calendar.year_start', 'calendar.year_end'],
    question: 'First and last day of the school year? (e.g. “Aug 13 to May 28”)',
    help_key: 'help.wizard.dates',
    optional: true,
    edit_label: 'year dates',
    summarize: (ctx) => `School year: ${plainDate(valueOf(ctx, 'calendar.year_start'))} to ${plainDate(valueOf(ctx, 'calendar.year_end'))}`,
    chips: [
      { id: 'ns', label: 'Use Aug 15 – May 28 for now', action: 'not_sure' },
      REST,
    ],
    parse: (t) => {
      const d = parseYearDates(t);
      return d ? slots({ 'calendar.year_start': d.year_start, 'calendar.year_end': d.year_end }) : [];
    },
  },
  {
    id: 'S-Q3',
    section: 'credit',
    paths: ['credit.policy'],
    question: 'Do these classes earn high school credit?',
    help_key: 'help.year_link',
    hidden: (ctx) => levelOf(ctx) === 'elementary',
    edit_label: 'credit',
    summarize: (ctx) => {
      const c = valueOf(ctx, 'credit.policy') as { unit?: string; year_link?: boolean } | undefined;
      if (!c) return null;
      return `Credit: ${c.unit === 'none' ? 'none' : c.unit === 'year_1_0' ? '1 credit per year' : '½ credit per semester'}${c.year_link ? ' (year average can rescue a failed semester)' : ''}`;
    },
    chips: [
      {
        id: 'sem05',
        label: 'Yes, ½ credit per semester',
        slots: [{ path: 'credit.policy', value: { unit: 'semester_0_5', year_link: true, attendance_gate: true } }],
      },
      {
        id: 'year10',
        label: 'Yes, 1 credit per year',
        slots: [{ path: 'credit.policy', value: { unit: 'year_1_0', year_link: true, attendance_gate: true } }],
      },
      {
        id: 'none',
        label: 'No credit',
        slots: [{ path: 'credit.policy', value: { unit: 'none', year_link: false, attendance_gate: false } }],
      },
      NS,
    ],
    parse: (t) => {
      const s = t.toLowerCase();
      if (/no credit|don'?t award|not for credit/.test(s)) return slots({ 'credit.policy': { unit: 'none', year_link: false, attendance_gate: false } });
      if (/1(\.0)? (credit )?(per|a|each) year|full credit per year/.test(s)) return slots({ 'credit.policy': { unit: 'year_1_0', year_link: true, attendance_gate: true } });
      if (/0?\.5|half credit|per semester/.test(s)) return slots({ 'credit.policy': { unit: 'semester_0_5', year_link: !/no year|separately/.test(s), attendance_gate: !/no attendance/.test(s) } });
      return [];
    },
  },
  {
    id: 'S-Q4',
    section: 'credit',
    paths: ['rollup.preset'],
    question: 'How do the grading periods add up to a semester grade?',
    help_key: 'help.rollup.2_7',
    edit_label: 'semester grade',
    summarize: (ctx) => `Semester grade: ${rollupPresetLabel(valueOf(ctx, 'rollup.preset')) || '—'}`,
    hidden: (ctx) => {
      if (creditUnit(ctx) === 'none') return true;
      const t = templateOf(ctx);
      return t === 'elementary_year_4' || t === 'elementary_year_6' || t === '';
    },
    chips: [
      { id: '27', label: 'Three six-weeks + exam (Texas: 2/7 each, exam 1/7)', slots: [{ path: 'rollup.preset', value: '2/7+1/7' }] },
      { id: '404020', label: 'Two periods 40% each + exam 20%', slots: [{ path: 'rollup.preset', value: '40/40/20' }] },
      { id: '454510', label: 'Two periods 45% each + exam 10%', slots: [{ path: 'rollup.preset', value: '45/45/10' }] },
      { id: '8515', label: 'Periods 85% + exam 15%', slots: [{ path: 'rollup.preset', value: '85/15' }] },
      { id: '5050', label: 'Two periods 50% each, no exam', slots: [{ path: 'rollup.preset', value: '50/50' }] },
      { id: 'mean', label: 'Plain average of the periods', slots: [{ path: 'rollup.preset', value: 'year_mean' }] },
      NS,
    ],
    parse: (t) => {
      const m = t.match(/2\/7|40\s*\/\s*40\s*\/\s*20|45\s*\/\s*45\s*\/\s*10|85\s*\/\s*15|50\s*\/\s*50|3\/7/);
      if (m) {
        const k = m[0].replace(/\s/g, '');
        const preset = k === '2/7' ? '2/7+1/7' : k === '3/7' ? '3/7+3/7+1/7' : k;
        return slots({ 'rollup.preset': preset });
      }
      if (/average|mean/i.test(t)) return slots({ 'rollup.preset': 'year_mean' });
      return [];
    },
  },
  {
    id: 'S-Q5',
    section: 'credit',
    paths: ['credit.exam_exemption'],
    question: 'Can students with high averages skip the semester exam?',
    help_key: 'help.exam_exemption',
    optional: true,
    edit_label: 'skipping the exam',
    summarize: (ctx) => {
      const e = valueOf(ctx, 'credit.exam_exemption') as { enabled?: boolean; min_avg?: number | null; max_absences?: number | null } | undefined;
      if (!e) return null;
      return e.enabled ? `Skip the exam: ${e.min_avg ?? '—'}+ average and ${e.max_absences ?? '—'} or fewer absences` : 'Skip the exam: no, everyone takes it';
    },
    hidden: (ctx) => {
      const preset = String(filledValue(ctx.filled, 'rollup.preset', ''));
      if (preset === '50/50' || preset === 'year_mean' || preset === '25x4' || preset === '') return true;
      if (creditUnit(ctx) === 'none') return true;
      return false;
    },
    chips: [
      { id: 'no', label: 'No, everyone takes it', slots: [{ path: 'credit.exam_exemption', value: { enabled: false, min_avg: null, max_absences: null, renormalize: true } }] },
      { id: 'exempt', label: 'Yes, with 90+ and 3 or fewer absences', slots: [{ path: 'credit.exam_exemption', value: { enabled: true, min_avg: 90, max_absences: 3, renormalize: true } }] },
      { id: 'exempt80', label: 'Yes, with 80+ and 3 or fewer absences', slots: [{ path: 'credit.exam_exemption', value: { enabled: true, min_avg: 80, max_absences: 3, renormalize: true } }] },
      NS,
      REST,
    ],
    parse: (t) => {
      const s = t.toLowerCase();
      if (/no exempt|everyone takes|nobody is exempt/.test(s)) return slots({ 'credit.exam_exemption': { enabled: false, min_avg: null, max_absences: null, renormalize: true } });
      const avg = s.match(/(\d{2})\s*(?:\+|or (?:above|higher|better)|average|avg)/);
      if (/exempt/.test(s) || avg) {
        const abs = s.match(/(\d+)\s*(?:or fewer\s*)?absences?/);
        return slots({ 'credit.exam_exemption': { enabled: true, min_avg: avg ? Number(avg[1]) : 90, max_absences: abs ? Number(abs[1]) : null, renormalize: true } });
      }
      return [];
    },
    defaults: () => slots({ 'credit.exam_exemption': { enabled: false, min_avg: null, max_absences: null, renormalize: true } }, 0.6),
  },
  {
    id: 'S-Q6',
    section: 'scale',
    paths: ['scale.default_id', 'scale.passing_pct'],
    question: 'Which letter-grade scale do you use, and what is passing?',
    help_key: 'help.scale.tx70',
    edit_label: 'letter grades',
    summarize: (ctx) => `Letter grades: ${SCALE_LABEL[String(valueOf(ctx, 'scale.default_id'))] ?? scaleLabel(valueOf(ctx, 'scale.default_id'))} ${passingSuffix(ctx)}`,
    chips: [
      { id: '10pt', label: '10-point (90 is an A, 60 passes)', slots: [{ path: 'scale.default_id', value: 'us_10' }, { path: 'scale.passing_pct', value: 60 }] },
      { id: 'txd', label: 'Texas: 70 passes, has a D', slots: [{ path: 'scale.default_id', value: 'texas_with_d' }, { path: 'scale.passing_pct', value: 70 }] },
      { id: 'txnod', label: 'Texas: 70 passes, no D', slots: [{ path: 'scale.default_id', value: 'texas_no_d' }, { path: 'scale.passing_pct', value: 70 }] },
      { id: 'pm', label: 'Plus/minus letters (A-, B+)', slots: [{ path: 'scale.default_id', value: 'college_plus_minus' }, { path: 'scale.passing_pct', value: 60 }] },
      { id: '7pt', label: '7-point (93 is an A)', slots: [{ path: 'scale.default_id', value: 'seven_point' }, { path: 'scale.passing_pct', value: 70 }] },
      { id: 'esnu', label: 'E / S / N / U marks (elementary)', slots: [{ path: 'scale.default_id', value: 'esnu' }, { path: 'scale.passing_pct', value: 70 }] },
      NS,
    ],
  },
  {
    id: 'S-Q6b',
    section: 'scale',
    paths: ['scale.rounding'],
    question: 'Does 89.5 round up to 90 on report cards?',
    help_key: 'help.scale.tx70',
    optional: true,
    edit_label: 'rounding',
    summarize: (ctx) => `Rounding: ${ROUNDING_WORDS[String(valueOf(ctx, 'scale.rounding') ?? 'nearest_whole')] ?? 'nearest whole number'}`,
    chips: [
      { id: 'near', label: 'Yes, to the nearest whole number', slots: [{ path: 'scale.rounding', value: 'nearest_whole' }] },
      { id: 'half', label: 'Yes, .5 always up', slots: [{ path: 'scale.rounding', value: 'half_up' }] },
      { id: 'trunc', label: 'No, drop decimals', slots: [{ path: 'scale.rounding', value: 'truncate' }] },
      NS,
      REST,
    ],
    parse: (t) => {
      const r = parseRounding(t);
      if (!r) return [];
      return slots({ 'scale.rounding': r.rounding === 'none' ? 'truncate' : r.rounding });
    },
    defaults: () => slots({ 'scale.rounding': 'nearest_whole' }, 0.6),
  },
  {
    id: 'S-Q7',
    section: 'gpa',
    paths: ['gpa.mode'],
    question: 'Do you calculate GPA?',
    help_key: 'help.gpa.unweighted',
    hidden: (ctx) => creditUnit(ctx) === 'none' || levelOf(ctx) === 'elementary',
    edit_label: 'GPA',
    summarize: (ctx) => `GPA: ${gpaModeLabel(valueOf(ctx, 'gpa.mode') ?? 'off')}`,
    chips: [
      { id: 'off', label: 'No', slots: [{ path: 'gpa.mode', value: 'off' }] },
      { id: 'uw', label: 'Unweighted only', slots: [{ path: 'gpa.mode', value: 'unweighted' }] },
      { id: 'both', label: 'Unweighted and weighted', slots: [{ path: 'gpa.mode', value: 'unweighted_and_weighted' }] },
      { id: 'rank', label: 'Weighted, with class rank', slots: [{ path: 'gpa.mode', value: 'with_rank' }] },
      NS,
    ],
  },
  {
    id: 'S-Q8',
    section: 'gpa',
    paths: ['gpa.weighted_bonus', 'levels.ap_points'],
    question: 'Do Honors, AP, or Dual Credit classes get extra GPA points?',
    help_key: 'help.gpa.weighted',
    hidden: (ctx) => gpaMode(ctx) !== 'unweighted_and_weighted' && gpaMode(ctx) !== 'with_rank',
    edit_label: 'extra GPA points',
    summarize: (ctx) => {
      const b = valueOf(ctx, 'gpa.weighted_bonus');
      if (b == null) return null;
      return `Weighting: ${b === 'numeric_5' ? '5.0 chart' : b === 'numeric_6' ? '6.0 chart' : b === 'none' ? 'same as regular' : '+0.5 Honors / +1.0 AP'} (AP A = ${String(valueOf(ctx, 'levels.ap_points') ?? '—')})`;
    },
    chips: [
      { id: 'half', label: 'Usual: +0.5 Honors, +1.0 AP', slots: [{ path: 'gpa.weighted_bonus', value: 'default' }, { path: 'levels.ap_points', value: 5.0 }] },
      { id: 'num5', label: '5.0 chart (an A in AP is 5.0)', slots: [{ path: 'gpa.weighted_bonus', value: 'numeric_5' }, { path: 'levels.ap_points', value: 5.0 }] },
      { id: 'num6', label: '6.0 chart', slots: [{ path: 'gpa.weighted_bonus', value: 'numeric_6' }, { path: 'levels.ap_points', value: 6.0 }] },
      { id: 'same', label: 'Same as regular', slots: [{ path: 'gpa.weighted_bonus', value: 'none' }, { path: 'levels.ap_points', value: 4.0 }] },
      NS,
    ],
    defaults: () => slots({ 'gpa.weighted_bonus': 'default', 'levels.ap_points': 5.0 }, 0.6),
  },
  {
    id: 'S-Q9',
    section: 'gpa',
    paths: ['gpa.include'],
    question: 'Which classes are left out of GPA?',
    help_key: 'help.include_pe',
    hidden: (ctx) => gpaMode(ctx) === 'off' || gpaMode(ctx) === '',
    edit_label: 'classes left out of GPA',
    summarize: (ctx) => {
      const i = valueOf(ctx, 'gpa.include') as Record<string, boolean> | undefined;
      if (!i) return null;
      const out = Object.entries(i).filter(([, v]) => v === false).map(([k]) => k.replace(/_/g, ' '));
      return `Left out of GPA: ${out.length ? out.join(', ') : 'nothing'}`;
    },
    chips: [
      { id: 'pe', label: 'Leave out PE, pass/fail, office aide', slots: [{ path: 'gpa.include', value: { pe: false, athletics: false, pass_fail: false, aide: false, recovery: true } }] },
      { id: 'pf', label: 'Leave out pass/fail classes', slots: [{ path: 'gpa.include', value: { pe: true, athletics: true, pass_fail: false, aide: true, recovery: true } }] },
      { id: 'all', label: 'Leave out PE, pass/fail, office aide, credit recovery', slots: [{ path: 'gpa.include', value: { pe: false, athletics: false, pass_fail: false, aide: false, recovery: false } }] },
      { id: 'none', label: 'Include everything', slots: [{ path: 'gpa.include', value: { pe: true, athletics: true, pass_fail: true, aide: true, recovery: true } }] },
      NS,
    ],
    defaults: () => slots({ 'gpa.include': { pe: false, athletics: false, pass_fail: false, aide: false, recovery: true } }, 0.6),
  },
  {
    id: 'S-Q9b',
    section: 'gpa',
    paths: ['gpa.repeat'],
    question: 'When a student repeats a course, what counts in GPA?',
    help_key: 'help.gpa.profiles',
    optional: true,
    hidden: (ctx) => gpaMode(ctx) === 'off' || gpaMode(ctx) === '',
    edit_label: 'repeated courses',
    summarize: (ctx) => `Repeated course: ${REPEAT_WORDS[String(valueOf(ctx, 'gpa.repeat') ?? 'include_both')] ?? 'both attempts count'}`,
    chips: [
      { id: 'both', label: 'Both attempts count', slots: [{ path: 'gpa.repeat', value: 'include_both' }] },
      { id: 'replace', label: 'New grade replaces old', slots: [{ path: 'gpa.repeat', value: 'replace' }] },
      { id: 'avg', label: 'Average the attempts', slots: [{ path: 'gpa.repeat', value: 'average' }] },
      { id: 'forgive', label: 'New grade replaces a D or F only', slots: [{ path: 'gpa.repeat', value: 'forgive_d_f' }] },
      NS,
      REST,
    ],
    defaults: () => slots({ 'gpa.repeat': 'include_both' }, 0.6),
  },
  {
    id: 'S-Q11',
    section: 'locks',
    paths: ['locks.map'],
    question: 'Which class syllabus settings should teachers NOT be able to change?',
    help_key: 'help.wizard.locks',
    edit_label: 'what teachers can change',
    summarize: (ctx) => {
      const l = valueOf(ctx, 'locks.map') as Record<string, boolean> | undefined;
      if (!l) return null;
      const on = Object.entries(l).filter(([, v]) => v).map(([k]) => LOCK_WORDS[k] ?? k.replace(/_/g, ' '));
      return `Teachers can't change: ${on.length ? on.join(', ') : 'nothing'}`;
    },
    chips: [
      { id: 'default', label: 'Only the letter scale and semester grade', slots: [{ path: 'locks.map', value: { engine: false, categories: false, scale: true, floor: false, late: false, drop_lowest: false, retake: false, assignment_max: false, book_mode: false, rollup: true } }] },
      { id: 'policy', label: 'Also late work, lowest grade, retakes', slots: [{ path: 'locks.map', value: { engine: false, categories: false, scale: true, floor: true, late: true, drop_lowest: false, retake: true, assignment_max: false, book_mode: false, rollup: true } }] },
      { id: 'strict', label: 'Also categories and weights', slots: [{ path: 'locks.map', value: { engine: true, categories: true, scale: true, floor: true, late: true, drop_lowest: true, retake: true, assignment_max: true, book_mode: true, rollup: true } }] },
      { id: 'open', label: 'Teachers choose everything', slots: [{ path: 'locks.map', value: { engine: false, categories: false, scale: false, floor: false, late: false, drop_lowest: false, retake: false, assignment_max: false, book_mode: false, rollup: false } }] },
      NS,
    ],
    defaults: () => slots({ 'locks.map': { engine: false, categories: false, scale: true, floor: false, late: false, drop_lowest: false, retake: false, assignment_max: false, book_mode: false, rollup: true } }, 0.6),
  },
  {
    id: 'S-Q10',
    section: 'review',
    paths: [],
    question: 'Does this look right? Tap a line to change it, or put these answers into the form.',
    help_key: 'help.wizard.review',
    chips: [
      { id: 'open', label: 'Put these answers in the form', action: 'open_form' },
      { id: 'restart', label: 'Start over', action: 'start_over' },
    ],
  },
];

export const SYLLABUS_NODES: QuestionNode[] = [
  {
    id: 'T-Q1',
    section: 'engine',
    paths: ['engine'],
    question:
      'When you average grades, should a 100-point test count more than a 10-point quiz, or should every assignment in a category count the same?',
    help_key: 'help.engine',
    hidden: (ctx) => lockedSyllabus(ctx, 'engine'),
    edit_label: 'how the average works',
    summarize: (ctx) => `Average: ${ENGINE_LABEL[String(valueOf(ctx, 'engine'))] ?? String(valueOf(ctx, 'engine'))}`,
    chips: [
      { id: 'points', label: 'Total points', slots: [{ path: 'engine', value: 'total_points' }, { path: 'within_category', value: null }] },
      {
        id: 'wpoints',
        label: 'Weighted categories, points count',
        slots: [{ path: 'engine', value: 'weighted_points_inside' }, { path: 'within_category', value: 'points_inside' }],
      },
      {
        id: 'wpercent',
        label: 'Weighted categories, all equal',
        slots: [{ path: 'engine', value: 'weighted_percent_inside' }, { path: 'within_category', value: 'percent_inside' }],
      },
      { id: 'item', label: 'Each assignment has its own weight', slots: [{ path: 'engine', value: 'item_weights' }, { path: 'within_category', value: null }] },
      { id: 'none', label: 'No overall grade', slots: [{ path: 'engine', value: 'none' }, { path: 'within_category', value: null }] },
      NS,
    ],
    parse: (t) => slots(parseEngine(t)),
    defaults: (ctx) => {
      const e = String(valueOf(ctx, 'engine') ?? 'weighted_percent_inside');
      const within = e === 'weighted_points_inside' ? 'points_inside' : e === 'weighted_percent_inside' ? 'percent_inside' : null;
      return slots({ engine: e, within_category: within }, 0.6);
    },
  },
  {
    id: 'T-Q2',
    section: 'categories',
    paths: ['categories'],
    question: 'What are your grade categories, and how much does each one count? (e.g. “Tests 50, Quizzes 30, Homework 20”)',
    help_key: 'help.empty_category',
    edit_label: 'categories',
    hidden: (ctx) => !isWeighted(ctx) || lockedSyllabus(ctx, 'categories'),
    summarize: (ctx) => {
      if (!isWeighted(ctx)) return null;
      const cats = categoriesOf(ctx);
      return `Categories: ${cats.map((c) => `${c.label} ${pct(c.weight_percent)}`).join(' · ') || '—'}`;
    },
    chips: [
      {
        id: '5050',
        label: 'Major 50%, Daily 50%',
        slots: [{ path: 'categories', value: [
          { key: 'major', label: 'Major', weight_percent: 50 },
          { key: 'daily', label: 'Daily', weight_percent: 50 },
        ] }],
      },
      {
        id: '6040',
        label: 'Major 60%, Daily 40%',
        slots: [{ path: 'categories', value: [
          { key: 'major', label: 'Major', weight_percent: 60 },
          { key: 'daily', label: 'Daily', weight_percent: 40 },
        ] }],
      },
      {
        id: '404020',
        label: 'Tests 40%, Quizzes 40%, Homework 20%',
        slots: [{ path: 'categories', value: [
          { key: 'tests', label: 'Tests', weight_percent: 40 },
          { key: 'quizzes', label: 'Quizzes', weight_percent: 40 },
          { key: 'homework', label: 'Homework', weight_percent: 20 },
        ] }],
      },
      {
        id: 'tqh',
        label: 'Tests 50%, Quizzes 20%, Homework 30%',
        slots: [{ path: 'categories', value: [
          { key: 'tests', label: 'Tests', weight_percent: 50 },
          { key: 'quizzes', label: 'Quizzes', weight_percent: 20 },
          { key: 'homework', label: 'Homework', weight_percent: 30 },
        ] }],
      },
      NS,
    ],
    parse: (t) => {
      const cats = parseCategories(t);
      return cats ? slots({ categories: cats }) : [];
    },
    validate: (s) => {
      const c = s.find((x) => x.path === 'categories');
      if (!c || !Array.isArray(c.value)) return null;
      const sum = weightSum(c.value as Cat[]);
      if (Math.abs(sum - 100) > 0.01) {
        return `Those add up to ${sum}%, and weighted categories need 100%. What are the percents?`;
      }
      return null;
    },
  },
  {
    id: 'T-Q3',
    section: 'categories',
    paths: ['within_category'],
    question: 'Inside a category, should a 100-point test count more than a 20-point quiz?',
    help_key: 'help.engine.weighted_points',
    hidden: (ctx) => !isWeighted(ctx) || lockedSyllabus(ctx, 'engine'),
    chips: [
      { id: 'yes', label: 'Yes, points matter', slots: [{ path: 'within_category', value: 'points_inside' }, { path: 'engine', value: 'weighted_points_inside' }] },
      { id: 'no', label: 'No, each assignment is equal', slots: [{ path: 'within_category', value: 'percent_inside' }, { path: 'engine', value: 'weighted_percent_inside' }] },
      NS,
    ],
    parse: (t) => {
      const w = parseWithin(t);
      if (!w) return [];
      return slots({ ...w, engine: w.within_category === 'points_inside' ? 'weighted_points_inside' : 'weighted_percent_inside' });
    },
  },
  {
    id: 'T-Q4',
    section: 'categories',
    paths: ['drop_lowest'],
    question: 'Do you drop any low scores?',
    help_key: 'help.drop_lowest',
    hidden: (ctx) => !isWeighted(ctx) || lockedSyllabus(ctx, 'drop_lowest') || categoriesOf(ctx).length === 0,
    edit_label: 'drops',
    summarize: (ctx) => {
      if (!isWeighted(ctx)) return null;
      const d = (valueOf(ctx, 'drop_lowest') ?? {}) as Record<string, number>;
      const cats = categoriesOf(ctx);
      const parts = Object.entries(d).filter(([, n]) => n > 0).map(([k, n]) => `lowest ${n} in ${cats.find((c) => c.key === k)?.label ?? k}`);
      return `Drops: ${parts.length ? parts.join(', ') : 'none'}`;
    },
    chips: [],
    chipsFor: (ctx) => {
      const cats = categoriesOf(ctx);
      const out: QuestionChip[] = [{ id: 'nodrop', label: 'No drops', slots: [{ path: 'drop_lowest', value: {} }] }];
      cats.slice(0, 4).forEach((c) => {
        out.push({ id: `drop1_${c.key}`, label: `Drop the lowest ${c.label} grade`, slots: [{ path: 'drop_lowest', value: { [c.key]: 1 } }] });
      });
      if (cats.length > 1) {
        out.push({
          id: 'dropall',
          label: 'Drop 1 in every category',
          slots: [{ path: 'drop_lowest', value: Object.fromEntries(cats.map((c) => [c.key, 1])) }],
        });
      }
      out.push({ id: 'ns', label: 'Not sure — no drops for now', action: 'not_sure' });
      return out;
    },
    parse: (t, ctx) => {
      const d = parseDrops(t, categoriesOf(ctx));
      return d ? slots({ drop_lowest: d }) : [];
    },
    defaults: (ctx) => {
      const out: Record<string, number> = {};
      for (const c of categoriesOf(ctx)) {
        const n = Number(c.rules?.drop_lowest_n ?? 0);
        if (n > 0) out[c.key] = n;
      }
      return slots({ drop_lowest: out }, 0.6);
    },
  },
  {
    id: 'T-Q5',
    section: 'status',
    paths: ['missing_rule'],
    question: 'How should missing work count until it is turned in?',
    help_key: 'help.missing',
    edit_label: 'missing work',
    summarize: (ctx) => {
      const m = String(valueOf(ctx, 'missing_rule') ?? 'omit');
      return `Missing work: ${m === 'zero' ? 'counts as 0' : m === 'floor' ? `counts as ${String(valueOf(ctx, 'floor') ?? 'the floor')}` : "doesn't count until scored"}`;
    },
    chips: [
      { id: 'zero', label: 'Counts as 0', slots: [{ path: 'missing_rule', value: 'zero' }] },
      { id: 'floor', label: 'Counts as 50', slots: [{ path: 'missing_rule', value: 'floor' }, { path: 'floor', value: 50 }] },
      { id: 'omit', label: "Doesn't count", slots: [{ path: 'missing_rule', value: 'omit' }] },
      NS,
    ],
    parse: (t) => slots(parseMissing(t) as Record<string, unknown> | null),
  },
  {
    id: 'T-Q6',
    section: 'status',
    paths: ['late_rule'],
    question: 'How should late work be handled? (e.g. “10% a day, no lower than 50”, “not accepted after 3 days”)',
    help_key: 'help.late',
    hidden: (ctx) => lockedSyllabus(ctx, 'late'),
    edit_label: 'late work',
    summarize: (ctx) => `Late work: ${describeLate(valueOf(ctx, 'late_rule'))}`,
    chips: [
      { id: 'none', label: 'No automatic penalty', slots: [{ path: 'late_rule', value: { type: 'none' } }] },
      { id: 'notacc', label: 'Not accepted late', slots: [{ path: 'late_rule', value: { type: 'none', hard_deadline_days: 0 } }] },
      { id: 'flat', label: '10% off once', slots: [{ path: 'late_rule', value: { type: 'flat', amount: 10, unit: 'percent' } }] },
      { id: 'day', label: '10% a day, no lower than 50', slots: [{ path: 'late_rule', value: { type: 'per_day', amount: 10, unit: 'percent', floor_pct: 50 } }] },
      { id: 'pts', label: '5 points per day', slots: [{ path: 'late_rule', value: { type: 'per_day', amount: 5, unit: 'points' } }] },
      NS,
    ],
    parse: (t) => {
      const r = parseLateRule(t);
      return r ? slots({ late_rule: r }) : [];
    },
  },
  {
    id: 'T-Q7',
    section: 'extras',
    paths: ['extra_credit_method'],
    question: 'Do you give extra credit? How does it count?',
    help_key: 'help.retake_cap',
    edit_label: 'extra credit',
    summarize: (ctx) => {
      const m = String(valueOf(ctx, 'extra_credit_method') ?? 'B');
      const allowed = valueOf(ctx, 'extra_credit_allowed');
      const cap = valueOf(ctx, 'ec_cap');
      const ceil = valueOf(ctx, 'ceiling');
      if (m === 'A' && allowed === false) return 'Extra credit: none';
      const base = m === 'C' ? 'its own category' : m === 'A' ? 'boosts existing work' : 'adds bonus points';
      return `Extra credit: ${base}${cap != null ? `, capped at ${cap}%` : ''}${ceil != null ? `, average no higher than ${ceil}` : ''}`;
    },
    chips: [
      { id: 'none', label: 'No extra credit', slots: [
        { path: 'extra_credit_method', value: 'A' },
        { path: 'extra_credit_allowed', value: false },
        { path: 'ec_cap', value: null },
        { path: 'ceiling', value: null },
      ] },
      { id: 'b', label: 'Bonus points on top', slots: [{ path: 'extra_credit_method', value: 'B' }, { path: 'extra_credit_allowed', value: true }] },
      { id: 'c', label: 'Its own category', slots: [{ path: 'extra_credit_method', value: 'C' }, { path: 'extra_credit_allowed', value: true }] },
      NS,
    ],
    parse: (t) => slots(parseExtraCredit(t) as Record<string, unknown> | null),
  },
  {
    id: 'T-Q7b',
    section: 'extras',
    paths: ['ec_cap', 'ceiling'],
    question: 'Is there a limit on extra credit, or a highest average (like 100)?',
    help_key: 'help.retake_cap',
    optional: true,
    hidden: (ctx) => {
      const m = String(valueOf(ctx, 'extra_credit_method') ?? '');
      return !has(ctx.filled, 'extra_credit_method') || (m === 'A' && valueOf(ctx, 'extra_credit_allowed') === false);
    },
    chips: [
      { id: 'nocap', label: 'No cap', slots: [{ path: 'ec_cap', value: null }, { path: 'ceiling', value: null }] },
      { id: 'cap5', label: 'Up to 5% extra', slots: [{ path: 'ec_cap', value: 5 }, { path: 'ceiling', value: null }] },
      { id: 'cap100', label: "Average can't pass 100", slots: [{ path: 'ec_cap', value: null }, { path: 'ceiling', value: 100 }] },
      { id: 'both', label: 'Up to 5% extra, average no higher than 100', slots: [{ path: 'ec_cap', value: 5 }, { path: 'ceiling', value: 100 }] },
      NS,
      REST,
    ],
    parse: (t, ctx) => {
      const e = parseExtraCredit(t);
      if (!e || (e.ec_cap === undefined && e.ceiling === undefined)) return [];
      const out: Record<string, unknown> = {};
      if (e.ec_cap !== undefined) out.ec_cap = e.ec_cap;
      else if (!has(ctx.filled, 'ec_cap')) out.ec_cap = null;
      if (e.ceiling !== undefined) out.ceiling = e.ceiling;
      else if (!has(ctx.filled, 'ceiling')) out.ceiling = null;
      return slots(out);
    },
  },
  {
    id: 'T-Q8',
    section: 'extras',
    paths: ['retake'],
    question: 'Retakes or redos? (e.g. “tests only, keep the higher score, max 70”)',
    help_key: 'help.retake_cap',
    hidden: (ctx) => lockedSyllabus(ctx, 'retake'),
    edit_label: 'retakes',
    summarize: (ctx) => `Retakes: ${describeRetake(valueOf(ctx, 'retake'), categoriesOf(ctx))}`,
    chips: [
      { id: 'none', label: 'No retakes', slots: [{ path: 'retake', value: null }] },
      { id: 'higher', label: 'Keep the higher score', slots: [{ path: 'retake', value: { eligible_category_ids: [], attempts: 1, method: 'higher_of', cap: null, window_days: null } }] },
      { id: 'replace', label: 'New score replaces', slots: [{ path: 'retake', value: { eligible_category_ids: [], attempts: 1, method: 'replace', cap: null, window_days: null } }] },
      { id: 'cap70', label: 'Higher score, max 70', slots: [{ path: 'retake', value: { eligible_category_ids: [], attempts: 1, method: 'higher_of', cap: 70, window_days: null } }] },
      NS,
    ],
    parse: (t, ctx) => slots(parseRetake(t, categoriesOf(ctx)) as Record<string, unknown> | null),
  },
  {
    id: 'T-Q9',
    section: 'math',
    paths: ['floor'],
    question: 'What is the lowest grade you will post for a grading period?',
    help_key: 'help.missing',
    optional: true,
    hidden: (ctx) => lockedSyllabus(ctx, 'floor'),
    edit_label: 'lowest grade',
    summarize: (ctx) => `Lowest period grade: ${valueOf(ctx, 'floor') == null ? 'no minimum' : String(valueOf(ctx, 'floor'))}`,
    chips: [
      { id: 'none', label: 'No minimum', slots: [{ path: 'floor', value: null }] },
      { id: '50', label: '50', slots: [{ path: 'floor', value: 50 }] },
      { id: '60', label: '60', slots: [{ path: 'floor', value: 60 }] },
      NS,
      REST,
    ],
    parse: (t) => slots(parseFloor(t)),
  },
  {
    id: 'T-Q10',
    section: 'math',
    paths: ['rounding'],
    question: 'How should averages round? (Is 89.5 a 90 or an 89?)',
    help_key: 'help.scale.tx70',
    optional: true,
    edit_label: 'rounding',
    summarize: (ctx) => `Rounding: ${ROUNDING_WORDS[String(valueOf(ctx, 'rounding') ?? 'nearest_whole')] ?? 'nearest whole number'}`,
    chips: [
      { id: 'near', label: 'Nearest whole (90)', slots: [{ path: 'rounding', value: 'nearest_whole' }] },
      { id: 'half', label: '.5 always up (90)', slots: [{ path: 'rounding', value: 'half_up' }] },
      { id: 'trunc', label: 'Drop decimals (89)', slots: [{ path: 'rounding', value: 'truncate' }] },
      { id: 'none', label: 'No rounding (89.5)', slots: [{ path: 'rounding', value: 'none' }] },
      NS,
      REST,
    ],
    parse: (t) => slots(parseRounding(t)),
  },
  {
    id: 'T-Q11',
    section: 'terms',
    paths: ['term_structure', 'book_mode'],
    question: 'How is the year split, and does each grading period start fresh?',
    help_key: 'help.reset_period',
    optional: true,
    hidden: (ctx) => lockedSyllabus(ctx, 'book_mode') && has(ctx.filled, 'term_structure'),
    edit_label: 'grading periods',
    summarize: (ctx) =>
      `Grading periods: ${TERM_WORDS[String(valueOf(ctx, 'term_structure') ?? 'year')] ?? 'one school year'} · ${valueOf(ctx, 'book_mode') === 'rolling_year' ? 'one running grade all year' : 'fresh start each period'}`,
    chips: [
      { id: 'q', label: 'Quarters, fresh start each', slots: [{ path: 'term_structure', value: 'quarters' }, { path: 'book_mode', value: 'reset_each_marking_period' }] },
      { id: 's', label: 'Semesters, fresh start each', slots: [{ path: 'term_structure', value: 'semesters' }, { path: 'book_mode', value: 'reset_each_marking_period' }] },
      { id: '6w', label: 'Six-weeks, fresh start each', slots: [{ path: 'term_structure', value: 'custom' }, { path: 'book_mode', value: 'reset_each_marking_period' }] },
      { id: 'y', label: 'One running grade all year', slots: [{ path: 'term_structure', value: 'year' }, { path: 'book_mode', value: 'rolling_year' }] },
      NS,
      REST,
    ],
    parse: (t) => slots(parseTerms(t) as Record<string, unknown> | null),
  },
  {
    id: 'T-Q12',
    section: 'terms',
    paths: ['exam_weight', 'rollup_preset'],
    question: 'Is there a semester exam, and how much does it count?',
    help_key: 'help.exam_term',
    optional: true,
    hidden: (ctx) => lockedSyllabus(ctx, 'rollup'),
    edit_label: 'semester exam',
    summarize: (ctx) => {
      const w = valueOf(ctx, 'exam_weight');
      const p = valueOf(ctx, 'rollup_preset');
      return `Semester exam: ${w == null ? 'none, or your school sets it' : `counts ${w}%`}${p ? ` (${rollupPresetLabel(p)})` : ''}`;
    },
    chips: [
      { id: 'none', label: 'No semester exam', slots: [{ path: 'exam_weight', value: null }, { path: 'rollup_preset', value: '50/50' }] },
      { id: '10', label: 'Exam 10%', slots: [{ path: 'exam_weight', value: 10 }, { path: 'rollup_preset', value: '45/45/10' }] },
      { id: '15', label: 'Exam 15%', slots: [{ path: 'exam_weight', value: 15 }, { path: 'rollup_preset', value: '85/15' }] },
      { id: '20', label: 'Exam 20%', slots: [{ path: 'exam_weight', value: 20 }, { path: 'rollup_preset', value: '40/40/20' }] },
      NS,
      REST,
    ],
    parse: (t) => slots(parseExam(t)),
  },
  {
    id: 'T-Q13',
    section: 'math',
    paths: ['empty_category'],
    question: 'If a category has no grades yet, should it be left out (other weights scale up) or count as zero?',
    help_key: 'help.empty_category',
    optional: true,
    hidden: (ctx) => !isWeighted(ctx),
    edit_label: 'categories with no grades',
    summarize: (ctx) =>
      isWeighted(ctx)
        ? `Category with no grades yet: ${valueOf(ctx, 'empty_category') === 'zero' ? 'counts as zero' : 'left out until graded'}`
        : null,
    chips: [
      { id: 'renorm', label: 'Leave it out', slots: [{ path: 'empty_category', value: 'renormalize' }] },
      { id: 'zero', label: 'Counts as zero', slots: [{ path: 'empty_category', value: 'zero' }] },
      NS,
      REST,
    ],
    parse: (t) => slots(parseEmptyCategory(t)),
  },
  {
    id: 'T-Q14',
    section: 'terms',
    paths: ['title'],
    question: 'What should the syllabus be called?',
    help_key: 'help.engine',
    optional: true,
    edit_label: 'syllabus name',
    summarize: (ctx) => `Syllabus name: ${String(valueOf(ctx, 'title') || '—')}`,
    chips: [{ id: 'ns', label: 'Use the class name', action: 'not_sure' }, REST],
    parse: (t) => (isNotSure(t) ? [] : slots(parseTitle(t))),
  },
  {
    id: 'T-Q15',
    section: 'review',
    paths: [],
    question: 'Does this look right? Tap a line to change it, or put these answers into the form.',
    help_key: 'help.engine.weighted_points',
    chips: [
      { id: 'open', label: 'Put these answers in the form', action: 'open_form' },
      { id: 'restart', label: 'Start over', action: 'start_over' },
    ],
  },
];

export function nodesFor(wizard: InterviewWizard): QuestionNode[] {
  return wizard === 'school' ? SCHOOL_NODES : SYLLABUS_NODES;
}

export function sectionsFor(wizard: InterviewWizard): InterviewSection[] {
  return wizard === 'school' ? SCHOOL_SECTIONS : SYLLABUS_SECTIONS;
}

export function reviewNodeId(wizard: InterviewWizard): string {
  return wizard === 'school' ? 'S-Q10' : 'T-Q15';
}

export function getNode(wizard: InterviewWizard, id: string): QuestionNode | null {
  return nodesFor(wizard).find((n) => n.id === id) ?? null;
}

export function nodePathsFilled(node: QuestionNode, filled: Record<string, FilledSlot>): boolean {
  if (node.paths.length === 0) return false;
  return node.paths.every((p) => has(filled, p));
}

export function isNodeRelevant(node: QuestionNode, ctx: GraphContext): boolean {
  if (node.hidden && node.hidden(ctx)) return false;
  return true;
}

/** Chips for a node in context (dynamic when chipsFor is set). Review adds “Edit …” chips. */
export function chipsOf(node: QuestionNode | null, ctx: GraphContext): QuestionChip[] {
  if (!node) return [];
  const base = node.chipsFor ? node.chipsFor(ctx) : node.chips;
  if (node.id !== reviewNodeId(ctx.wizard)) return base;
  const edits: QuestionChip[] = nodesFor(ctx.wizard)
    .filter((n) => n.edit_label && n.paths.length && isNodeRelevant(n, ctx) && n.paths.some((p) => has(ctx.filled, p)))
    .filter((n) => !n.paths.every((p) => ctx.filled[p]?.evidence === 'school lock'))
    .map((n) => ({ id: `edit:${n.id}`, label: `Edit ${n.edit_label}`, action: 'edit' as const, edit_node: n.id }));
  return [...base.slice(0, 1), ...edits, ...base.slice(1)];
}

/** Values for “not sure / school default”: node defaults, else current draft values. */
export function defaultSlotsFor(node: QuestionNode, ctx: GraphContext): ExtractedSlot[] {
  if (node.defaults) {
    const d = node.defaults(ctx);
    if (d.length) return d.map((s) => ({ ...s, confidence: 0.6, evidence: s.evidence ?? 'school default' }));
  }
  return node.paths.map((p) => ({
    path: p,
    value: p === 'extra_credit_method' ? (valueOf(ctx, p) ?? 'B') : (valueOf(ctx, p) ?? null),
    confidence: 0.6,
    evidence: 'school default',
  }));
}

// helpers exported for applySlots / tests
export { levelOf, templateOf, creditUnit, gpaMode, engineOf, filledValue, has, valueOf, categoriesOf, isWeighted };
