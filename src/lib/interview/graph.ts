/**
 * GB-12 question graphs — school S-Q* and syllabus T-Q* (SRS §5.13).
 */
import type {
  FilledSlot,
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

export const SCHOOL_SECTIONS: InterviewSection[] = [
  'level', 'calendar', 'credit', 'scale', 'gpa', 'locks', 'review',
];

export const SYLLABUS_SECTIONS: InterviewSection[] = [
  'engine', 'categories', 'status', 'extras', 'review',
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
  review: 'Review',
};

export const SCHOOL_NODES: QuestionNode[] = [
  {
    id: 'S-Q1',
    section: 'level',
    paths: ['level'],
    question: 'What kind of school is this?',
    help_key: 'help.wizard.level',
    chips: [
      { id: 'elementary', label: 'Elementary', slots: [{ path: 'level', value: 'elementary' }] },
      { id: 'middle', label: 'Middle', slots: [{ path: 'level', value: 'middle' }] },
      { id: 'high', label: 'High', slots: [{ path: 'level', value: 'high' }] },
      { id: 'college', label: 'College', slots: [{ path: 'level', value: 'college' }] },
      { id: 'mixed', label: 'Several levels', slots: [{ path: 'level', value: 'mixed' }] },
    ],
  },
  {
    id: 'S-Q2',
    section: 'calendar',
    paths: ['calendar.template'],
    question: 'How often is an official grade posted?',
    help_key: 'help.glyphs.6w',
    chips: [
      { id: '6w', label: 'Every 6 weeks', slots: [{ path: 'calendar.template', value: 'tx_six_weeks' }] },
      { id: '9w', label: 'Every 9 weeks', slots: [{ path: 'calendar.template', value: 'nine_weeks' }] },
      { id: 'tri', label: 'Trimesters', slots: [{ path: 'calendar.template', value: 'trimester' }] },
      { id: 'sem', label: 'Semesters only', slots: [{ path: 'calendar.template', value: 'college_term' }] },
      { id: 'year4', label: 'Once a year (4 reports)', slots: [{ path: 'calendar.template', value: 'elementary_year_4' }] },
      { id: 'ns', label: "I'm not sure", action: 'not_sure' },
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
    id: 'S-Q3',
    section: 'credit',
    paths: ['credit.policy'],
    question: 'Do these classes earn high school credit?',
    help_key: 'help.year_link',
    hidden: (ctx) => levelOf(ctx) === 'elementary',
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
      { id: 'ns', label: "I'm not sure", action: 'not_sure' },
    ],
  },
  {
    id: 'S-Q4',
    section: 'credit',
    paths: ['rollup.preset'],
    question: 'How do the grading periods add up to a semester grade?',
    help_key: 'help.rollup.2_7',
    hidden: (ctx) => {
      if (creditUnit(ctx) === 'none') return true;
      const t = templateOf(ctx);
      return t === 'elementary_year_4' || t === 'elementary_year_6' || t === '';
    },
    chips: [
      { id: '27', label: 'Three six-weeks + exam (Texas: 2/7 each, exam 1/7)', slots: [{ path: 'rollup.preset', value: '2/7+1/7' }] },
      { id: '404020', label: 'Two periods 40% each + exam 20%', slots: [{ path: 'rollup.preset', value: '40/40/20' }] },
      { id: '5050', label: 'Two periods 50% each, no exam', slots: [{ path: 'rollup.preset', value: '50/50' }] },
      { id: 'mean', label: 'Plain average of the periods', slots: [{ path: 'rollup.preset', value: 'year_mean' }] },
      { id: 'ns', label: "I'm not sure", action: 'not_sure' },
    ],
  },
  {
    id: 'S-Q5',
    section: 'credit',
    paths: ['exam.separate'],
    question: 'Is there a separate semester exam?',
    help_key: 'help.exam_term',
    hidden: (ctx) => {
      const preset = String(filledValue(ctx.filled, 'rollup.preset', ''));
      if (preset === '50/50' || preset === 'year_mean' || preset === '25x4') return true;
      if (creditUnit(ctx) === 'none') return true;
      return false;
    },
    chips: [
      { id: 'yes', label: 'Yes', slots: [{ path: 'exam.separate', value: true }] },
      { id: 'no', label: 'No', slots: [{ path: 'exam.separate', value: false }] },
      { id: 'exempt', label: 'Yes, but high averages can skip it', slots: [{ path: 'exam.separate', value: 'exempt_high' }] },
    ],
  },
  {
    id: 'S-Q6',
    section: 'scale',
    paths: ['scale.default_id', 'scale.passing_pct'],
    question: 'What is an A, and what is passing?',
    help_key: 'help.scale.tx70',
    chips: [
      {
        id: '10pt',
        label: '10-point (90 is an A, 60 passes)',
        slots: [
          { path: 'scale.default_id', value: 'us_10' },
          { path: 'scale.passing_pct', value: 60 },
        ],
      },
      {
        id: 'txd',
        label: 'Texas: 70 passes, has a D',
        slots: [
          { path: 'scale.default_id', value: 'texas_with_d' },
          { path: 'scale.passing_pct', value: 70 },
        ],
      },
      {
        id: 'txnod',
        label: 'Texas: 70 passes, no D',
        slots: [
          { path: 'scale.default_id', value: 'texas_no_d' },
          { path: 'scale.passing_pct', value: 70 },
        ],
      },
      {
        id: 'pm',
        label: 'Plus/minus letters (A-, B+)',
        slots: [
          { path: 'scale.default_id', value: 'college_plus_minus' },
          { path: 'scale.passing_pct', value: 60 },
        ],
      },
      { id: 'ns', label: "I'm not sure", action: 'not_sure' },
    ],
  },
  {
    id: 'S-Q7',
    section: 'gpa',
    paths: ['gpa.mode'],
    question: 'Do you calculate GPA?',
    help_key: 'help.gpa.unweighted',
    hidden: (ctx) => creditUnit(ctx) === 'none' || levelOf(ctx) === 'elementary',
    chips: [
      { id: 'off', label: 'No', slots: [{ path: 'gpa.mode', value: 'off' }] },
      { id: 'uw', label: 'Unweighted only', slots: [{ path: 'gpa.mode', value: 'unweighted' }] },
      { id: 'both', label: 'Unweighted + weighted', slots: [{ path: 'gpa.mode', value: 'unweighted_and_weighted' }] },
      { id: 'ns', label: "I'm not sure", action: 'not_sure' },
    ],
  },
  {
    id: 'S-Q8',
    section: 'gpa',
    paths: ['gpa.weighted_bonus', 'levels.ap_points'],
    question: 'Extra points for Honors / AP / Dual Credit?',
    help_key: 'help.gpa.weighted',
    hidden: (ctx) => gpaMode(ctx) !== 'unweighted_and_weighted',
    chips: [
      {
        id: 'half',
        label: 'Usual: +0.5 Honors, +1.0 AP',
        slots: [
          { path: 'gpa.weighted_bonus', value: 'default' },
          { path: 'levels.ap_points', value: 5.0 },
        ],
      },
      {
        id: 'num5',
        label: '5.0 chart (an A in AP is 5.0)',
        slots: [
          { path: 'gpa.weighted_bonus', value: 'numeric_5' },
          { path: 'levels.ap_points', value: 5.0 },
        ],
      },
      {
        id: 'num6',
        label: '6.0 chart',
        slots: [
          { path: 'gpa.weighted_bonus', value: 'numeric_6' },
          { path: 'levels.ap_points', value: 6.0 },
        ],
      },
      {
        id: 'same',
        label: 'Same as regular',
        slots: [
          { path: 'gpa.weighted_bonus', value: 'none' },
          { path: 'levels.ap_points', value: 4.0 },
        ],
      },
    ],
  },
  {
    id: 'S-Q9',
    section: 'gpa',
    paths: ['gpa.exclude'],
    question: 'What stays out of GPA?',
    help_key: 'help.include_pe',
    hidden: (ctx) => gpaMode(ctx) === 'off' || gpaMode(ctx) === '',
    chips: [
      {
        id: 'pe',
        label: 'Leave out PE',
        slots: [{ path: 'gpa.exclude', value: { pe: true, pass_fail: true, aide: true, recovery: false } }],
      },
      {
        id: 'pf',
        label: 'Leave out pass/fail classes',
        slots: [{ path: 'gpa.exclude', value: { pe: false, pass_fail: true, aide: false, recovery: false } }],
      },
      {
        id: 'all',
        label: 'Leave out PE, pass/fail, office aide, credit recovery',
        slots: [{ path: 'gpa.exclude', value: { pe: true, pass_fail: true, aide: true, recovery: true } }],
      },
      {
        id: 'none',
        label: 'Include everything',
        slots: [{ path: 'gpa.exclude', value: { pe: false, pass_fail: false, aide: false, recovery: false } }],
      },
    ],
  },
  {
    id: 'S-Q10',
    section: 'review',
    paths: [],
    question: 'Want to open the full form to check everything and publish?',
    help_key: 'help.wizard.review',
    chips: [
      { id: 'open', label: 'Open the form', action: 'open_form' },
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
    chips: [
      { id: 'points', label: 'Total points', slots: [{ path: 'engine', value: 'total_points' }] },
      {
        id: 'wpoints',
        label: 'Weighted categories, points count',
        slots: [{ path: 'engine', value: 'weighted_points_inside' }],
      },
      {
        id: 'wpercent',
        label: 'Weighted categories, all equal',
        slots: [{ path: 'engine', value: 'weighted_percent_inside' }],
      },
      { id: 'ns', label: "I'm not sure", action: 'not_sure' },
    ],
  },
  {
    id: 'T-Q2',
    section: 'categories',
    paths: ['categories'],
    question: 'What are your grade categories, and how much does each one count?',
    help_key: 'help.empty_category',
    hidden: (ctx) => {
      const e = engineOf(ctx);
      return e === 'total_points' || e === 'item_weights' || e === 'none';
    },
    chips: [
      {
        id: '5050',
        label: 'Major 50%, Daily 50%',
        slots: [
          {
            path: 'categories',
            value: [
              { key: 'major', label: 'Major', weight_percent: 50 },
              { key: 'daily', label: 'Daily', weight_percent: 50 },
            ],
          },
        ],
      },
      {
        id: '404020',
        label: 'Tests 40%, Quizzes 40%, Homework 20%',
        slots: [
          {
            path: 'categories',
            value: [
              { key: 'tests', label: 'Tests', weight_percent: 40 },
              { key: 'quizzes', label: 'Quizzes', weight_percent: 40 },
              { key: 'homework', label: 'Homework', weight_percent: 20 },
            ],
          },
        ],
      },
      {
        id: 'tqh',
        label: 'Tests 50%, Quizzes 20%, Homework 30%',
        slots: [
          {
            path: 'categories',
            value: [
              { key: 'tests', label: 'Tests', weight_percent: 50 },
              { key: 'quizzes', label: 'Quizzes', weight_percent: 20 },
              { key: 'homework', label: 'Homework', weight_percent: 30 },
            ],
          },
        ],
      },
      { id: 'ns', label: "I'm not sure", action: 'not_sure' },
    ],
  },
  {
    id: 'T-Q3',
    section: 'categories',
    paths: ['within_category'],
    question: 'Inside a category, should a 100-point test count more than a 20-point quiz?',
    help_key: 'help.engine.weighted_points',
    hidden: (ctx) => {
      const e = engineOf(ctx);
      return e === 'total_points' || e === 'item_weights' || e === 'none' || e === '';
    },
    chips: [
      {
        id: 'yes',
        label: 'Yes, points matter',
        slots: [
          { path: 'within_category', value: 'points_inside' },
          { path: 'engine', value: 'weighted_points_inside' },
        ],
      },
      {
        id: 'no',
        label: 'No, each assignment is equal',
        slots: [
          { path: 'within_category', value: 'percent_inside' },
          { path: 'engine', value: 'weighted_percent_inside' },
        ],
      },
      { id: 'ns', label: "I'm not sure", action: 'not_sure' },
    ],
  },
  {
    id: 'T-Q4',
    section: 'status',
    paths: ['missing_rule'],
    question: 'How should missing work count?',
    help_key: 'help.missing',
    chips: [
      { id: 'zero', label: 'Counts as 0', slots: [{ path: 'missing_rule', value: 'zero' }] },
      { id: 'floor', label: 'Counts as 50', slots: [{ path: 'missing_rule', value: 'floor_50' }] },
      { id: 'omit', label: "Doesn't count", slots: [{ path: 'missing_rule', value: 'omit' }] },
    ],
  },
  {
    id: 'T-Q5',
    section: 'status',
    paths: ['late_rule'],
    question: 'How should late work be handled?',
    help_key: 'help.late',
    chips: [
      { id: 'none', label: 'No automatic penalty', slots: [{ path: 'late_rule', value: { type: 'none' } }] },
      {
        id: 'flat',
        label: 'Take off the same amount once',
        slots: [{ path: 'late_rule', value: { type: 'flat_percent', percent: 10 } }],
      },
      {
        id: 'day',
        label: 'Take off a percent each day',
        slots: [{ path: 'late_rule', value: { type: 'percent_per_day', percent: 10, max_percent: 50 } }],
      },
      { id: 'ns', label: "I'm not sure", action: 'not_sure' },
    ],
  },
  {
    id: 'T-Q6',
    section: 'extras',
    paths: ['drop_lowest', 'extra_credit', 'retakes'],
    question: 'Drop lowest? Extra credit? Retakes?',
    help_key: 'help.drop_lowest',
    chips: [
      {
        id: 'none',
        label: 'None of these',
        slots: [
          { path: 'drop_lowest', value: 0 },
          { path: 'extra_credit', value: false },
          { path: 'retakes', value: false },
        ],
      },
      {
        id: 'drop',
        label: 'Drop lowest only',
        slots: [
          { path: 'drop_lowest', value: 1 },
          { path: 'extra_credit', value: false },
          { path: 'retakes', value: false },
        ],
      },
      {
        id: 'ec',
        label: 'Extra credit on',
        slots: [
          { path: 'drop_lowest', value: 0 },
          { path: 'extra_credit', value: true },
          { path: 'retakes', value: false },
        ],
      },
      {
        id: 'all',
        label: 'Drop lowest, extra credit, and retakes',
        slots: [
          { path: 'drop_lowest', value: 1 },
          { path: 'extra_credit', value: true },
          { path: 'retakes', value: true },
        ],
      },
    ],
  },
  {
    id: 'T-Q7',
    section: 'review',
    paths: [],
    question: 'Want to open the full form to check the sample students and publish?',
    help_key: 'help.engine.weighted_points',
    chips: [
      { id: 'open', label: 'Open the form', action: 'open_form' },
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

// helpers exported for applySlots / tests
export { levelOf, templateOf, creditUnit, gpaMode, engineOf, filledValue, has };
