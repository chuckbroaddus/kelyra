/**
 * GB-09 PolicyView — pure plain-language view model from published school
 * grading policy + calendar, or a syllabus_versions snapshot (FR-VIEW-*).
 * snake_case for JSON round-trip. Does not hit the network.
 */
import { computePeriod } from './engine/index.ts';
import type {
  EngineAssignment,
  EngineCell,
  EngineSyllabus,
  LateRule,
} from './engine/types.ts';
import type { GradingCalendar, MarkingPeriod } from './calendar/types.ts';
import type { GradeScale } from './scale/scale.ts';
import { letterFor, roundPct } from './scale/scale.ts';

export type PolicyViewKind = 'school' | 'syllabus';
export type PolicyViewAudience = 'parent' | 'student' | 'teacher' | 'admin';

export type PolicyViewWeightRow = {
  key: string;
  label: string;
  weight_percent: number;
};

export type PolicyViewScaleBand = {
  letter: string;
  min_pct: number;
  max_pct: number;
  passing: boolean;
  descriptor?: string;
};

export type PolicyViewTable = {
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
};

export type PolicyViewWorkedExample = {
  student_name: string;
  period_label: string;
  scores: Array<{
    label: string;
    category: string;
    raw: number;
    max_points: number;
  }>;
  pct: number;
  letter: string | null;
  steps: string[];
};

export type PolicyViewSection = {
  id: string;
  title: string;
  body: string[];
  collapsed_default: boolean;
  audiences: PolicyViewAudience[];
};

export type PolicyViewModel = {
  kind: PolicyViewKind;
  ref_id: string;
  version: number;
  published_at: string | null;
  locale: string;
  title: string;
  subtitle: string | null;
  how_built_sentence: string;
  weights: PolicyViewWeightRow[];
  periods: Array<Pick<MarkingPeriod, 'id' | 'code' | 'name' | 'kind'>>;
  period_model: string | null;
  scale: {
    name: string;
    passing_pct: number;
    bands: PolicyViewScaleBand[];
  } | null;
  worked_example: PolicyViewWorkedExample | null;
  tables: PolicyViewTable[];
  sections: PolicyViewSection[];
  audience_packs: Record<PolicyViewAudience, string[]>;
};

const ALL_AUDIENCES: PolicyViewAudience[] = ['parent', 'student', 'teacher', 'admin'];
const STAFF_AUDIENCES: PolicyViewAudience[] = ['teacher', 'admin'];
const ADMIN_ONLY: PolicyViewAudience[] = ['admin'];

export type SchoolPolicyInput = {
  ref_id: string;
  version: number;
  published_at?: string | null;
  locale?: string;
  school_name?: string | null;
  payload: {
    level?: string;
    calendar?: GradingCalendar | null;
    calendar_template?: string | null;
    scales?: GradeScale[];
    default_scale_id?: string | null;
    quality_point_tables?: Array<{
      id: string;
      method: string;
      rows: Array<Record<string, unknown>>;
      a_plus_points?: number;
      unweighted_cap?: number;
    }>;
    course_levels?: Array<{ key: string; label: string; weighted_bonus: number }>;
    gpa_mode?: string;
    gpa_profiles?: Array<{ key: string; table_id: string; use_level_bonus: boolean }>;
    credit_policy?: { unit?: string; year_link?: boolean; attendance_gate?: boolean } | null;
    locks?: Record<string, boolean> | null;
    rollup_preset?: string | null;
  };
};

type SyllabusCategoryIn = {
  key: string;
  label: string;
  weight_percent: number;
  active?: boolean;
  rules?: { drop_lowest_n?: number };
  drop_highest_n?: number;
  keep_highest_n?: number | null;
};

export type SyllabusPolicyInput = {
  ref_id: string;
  version: number;
  published_at?: string | null;
  locale?: string;
  class_name?: string | null;
  title?: string | null;
  snapshot: {
    title?: string | null;
    engine?: string;
    within_category?: string | null;
    book_mode?: string;
    extra_credit_method?: string;
    ec_cap?: number | null;
    late_rule?: LateRule | null;
    missing_rule?: string;
    rounding?: string;
    floor?: number | null;
    ceiling?: number | null;
    policies?: Record<string, unknown> | null;
    categories?: SyllabusCategoryIn[];
  };
  calendar?: GradingCalendar | null;
  scale?: GradeScale | null;
};

function emptyPacks(): Record<PolicyViewAudience, string[]> {
  return { parent: [], student: [], teacher: [], admin: [] };
}

function pushSection(
  sections: PolicyViewSection[],
  packs: Record<PolicyViewAudience, string[]>,
  section: PolicyViewSection,
) {
  sections.push(section);
  for (const a of section.audiences) {
    packs[a].push(section.id);
  }
}

function activeWeights(cats: SyllabusCategoryIn[] | undefined): PolicyViewWeightRow[] {
  return (cats ?? [])
    .filter((c) => c.active !== false)
    .map((c) => ({
      key: c.key,
      label: c.label,
      weight_percent: Number(c.weight_percent) || 0,
    }));
}

function weightSentence(weights: PolicyViewWeightRow[], periodNoun: string): string {
  if (!weights.length) {
    return `This ${periodNoun} grade follows the school grading rules.`;
  }
  const parts = weights.map((w) => `${w.label} are ${w.weight_percent}%`);
  if (parts.length === 1) return `${parts[0]} of the ${periodNoun} grade.`;
  if (parts.length === 2) {
    return `${parts[0]} of the ${periodNoun} grade. ${parts[1]}.`;
  }
  const last = parts[parts.length - 1]!;
  return `${parts.slice(0, -1).join('. ')}. ${last} of the ${periodNoun} grade.`;
}

function periodNoun(model: string | null | undefined): string {
  if (model === 'six_weeks') return 'six-weeks';
  if (model === 'nine_weeks') return 'nine-weeks';
  if (model === 'trimester') return 'trimester';
  if (model === 'college') return 'term';
  return 'term';
}

function pickScale(
  scales: GradeScale[] | undefined,
  defaultId: string | null | undefined,
): GradeScale | null {
  if (!scales?.length) return null;
  if (defaultId) {
    const hit = scales.find((s) => s.id === defaultId);
    if (hit) return hit;
  }
  return scales[0] ?? null;
}

function scaleBands(scale: GradeScale): PolicyViewScaleBand[] {
  return scale.bands.map((b) => ({
    letter: b.letter,
    min_pct: b.min_pct,
    max_pct: b.max_pct,
    passing: b.passing,
    descriptor: b.descriptor,
  }));
}

function missingCopy(rule: string | undefined, floor: number | null | undefined): string {
  if (rule === 'zero') return 'A missing assignment counts as 0.';
  if (rule === 'floor') {
    const f = floor != null ? floor : 50;
    return `A missing assignment uses a floor of ${f}%.`;
  }
  return 'A missing assignment is left out of the average until it is scored.';
}

function lateCopy(rule: LateRule | null | undefined): string {
  if (!rule || rule.type === 'none') return 'Late work is handled case by case.';
  const unit = rule.unit === 'points' ? 'points' : 'percent';
  const amount = rule.amount ?? 0;
  if (rule.type === 'flat') return `Late work loses ${amount} ${unit} once.`;
  if (rule.type === 'per_day') return `Late work loses ${amount} ${unit} per day.`;
  if (rule.type === 'per_hour') return `Late work loses ${amount} ${unit} per hour.`;
  return 'Late work is handled case by case.';
}

function enginePlainName(engine: string | undefined): string {
  if (engine === 'total_points') return 'total points';
  if (engine === 'weighted_points_inside') return 'weighted categories with points inside each';
  if (engine === 'weighted_percent_inside') return 'weighted categories with percents inside each';
  if (engine === 'item_weights') return 'per-assignment weights';
  return 'the class grade formula';
}

/** Fixed Alex example — numbers stored on the snapshot (FR-VIEW-14). */
export function buildWorkedExample(args: {
  weights: PolicyViewWeightRow[];
  engine?: string;
  scale?: GradeScale | null;
  period_label?: string;
}): PolicyViewWorkedExample | null {
  const weights = args.weights.filter((w) => w.weight_percent > 0);
  if (weights.length < 1) return null;

  const engine =
    args.engine === 'total_points' ||
    args.engine === 'weighted_points_inside' ||
    args.engine === 'weighted_percent_inside' ||
    args.engine === 'item_weights' ||
    args.engine === 'none'
      ? args.engine
      : 'weighted_percent_inside';

  // Prefer two categories when present (FR-VIEW-04 worked example).
  const top = weights.slice(0, Math.min(2, weights.length));
  const cats = top.map((w) => ({
    key: w.key,
    label: w.label,
    weight: w.weight_percent,
    include: true as const,
  }));

  const scores: PolicyViewWorkedExample['scores'] = [];
  const assignments: EngineAssignment[] = [];
  const cells: EngineCell[] = [];

  // Deterministic sample scores (percent-friendly max 100).
  const sampleRaws = [92, 78, 85];
  let si = 0;
  for (const c of cats) {
    const id = `ex_${c.key}`;
    const raw = sampleRaws[si % sampleRaws.length]!;
    si += 1;
    assignments.push({
      id,
      category: c.key,
      period_id: 'P1',
      max_points: 100,
      count_toward_final: true,
      extra_credit: false,
      can_exceed_max: false,
      item_factor: 1,
      droppable: true,
    });
    cells.push({ assignment_id: id, raw, status: 'graded' });
    scores.push({
      label: `${c.label} sample`,
      category: c.label,
      raw,
      max_points: 100,
    });
  }

  const syllabus: EngineSyllabus = {
    engine,
    categories: cats,
    missing: 'omit',
    late: { type: 'none' },
    extra_credit: { method: 'B' },
    empty_category: 'renormalize',
    book_mode: 'reset_each_marking_period',
    rounding: 'nearest_whole',
    decimals: 0,
  };

  const result = computePeriod(syllabus, assignments, cells, 'P1');
  const pctRaw = result.pct;
  if (pctRaw == null || !Number.isFinite(pctRaw)) return null;
  const pct = roundPct(pctRaw, 'nearest_whole', 0);
  const letter = args.scale ? letterFor(args.scale, pct) : null;

  const steps = scores.map(
    (s) => `${s.label}: ${s.raw}/${s.max_points}`,
  );
  steps.push(
    `Category weights: ${cats.map((c) => `${c.label} ${c.weight}%`).join(', ')}.`,
  );
  steps.push(
    letter
      ? `Engine result ${pct}% → letter ${letter}.`
      : `Engine result ${pct}%.`,
  );

  return {
    student_name: 'Alex',
    period_label: args.period_label ?? 'this term',
    scores,
    pct,
    letter,
    steps,
  };
}

function qpTable(
  tables: SchoolPolicyInput['payload']['quality_point_tables'],
): PolicyViewTable | null {
  const t = tables?.[0];
  if (!t?.rows?.length) return null;
  const levelKeys = new Set<string>();
  for (const row of t.rows) {
    const by = (row.points_by_level ?? {}) as Record<string, number>;
    Object.keys(by).forEach((k) => levelKeys.add(k));
  }
  const levels = [...levelKeys];
  const columns = ['Letter / band', ...levels.map((k) => k)];
  const rows = t.rows.map((row) => {
    const letter = typeof row.letter === 'string' ? row.letter : '';
    const min = row.min_pct != null ? String(row.min_pct) : '';
    const max = row.max_pct != null ? String(row.max_pct) : '';
    const band = letter || (min || max ? `${min}–${max}` : '—');
    const by = (row.points_by_level ?? {}) as Record<string, number>;
    return [band, ...levels.map((k) => (by[k] != null ? String(by[k]) : '—'))];
  });
  return {
    id: 'qp',
    title: 'Quality points',
    columns,
    rows,
  };
}

function scaleTable(scale: GradeScale): PolicyViewTable {
  return {
    id: 'scale',
    title: `Letter scale · ${scale.name}`,
    columns: ['Letter', 'Min %', 'Max %', 'Passing'],
    rows: scale.bands.map((b) => [
      b.letter,
      String(b.min_pct),
      String(Math.round(b.max_pct * 1000) / 1000),
      b.passing ? 'yes' : 'no',
    ]),
  };
}

function weightTable(weights: PolicyViewWeightRow[]): PolicyViewTable {
  return {
    id: 'weights',
    title: 'Category weights',
    columns: ['Category', 'Weight %'],
    rows: weights.map((w) => [w.label, String(w.weight_percent)]),
  };
}

/** School Grading and Reporting Policy → PolicyViewModel. */
export function buildSchoolPolicyView(input: SchoolPolicyInput): PolicyViewModel {
  const cal = input.payload.calendar ?? null;
  const model = cal?.period_model ?? null;
  const noun = periodNoun(model);
  const scale = pickScale(input.payload.scales, input.payload.default_scale_id);
  const periods = (cal?.periods ?? [])
    .filter((p) => p.kind === 'marking_period' || p.kind === 'credit_term' || p.kind === 'year')
    .map((p) => ({ id: p.id, code: p.code, name: p.name, kind: p.kind }));

  const packs = emptyPacks();
  const sections: PolicyViewSection[] = [];
  const tables: PolicyViewTable[] = [];

  if (scale) tables.push(scaleTable(scale));
  const qp = qpTable(input.payload.quality_point_tables);
  if (qp) tables.push(qp);

  const how =
    scale != null
      ? `Report cards use the ${scale.name} scale. ${scale.passing_pct} is passing. Grades post by ${noun}.`
      : `School grading rules set the calendar, passing mark, and how terms roll up.`;

  pushSection(sections, packs, {
    id: 'missing_late',
    title: 'Missing, excused, late',
    body: [
      'Class syllabi set missing and late rules within school locks.',
      'Excused work is left out of the average.',
    ],
    collapsed_default: true,
    audiences: ALL_AUDIENCES,
  });

  pushSection(sections, packs, {
    id: 'rollup',
    title: 'How a period becomes a transcript line',
    body: [
      input.payload.rollup_preset
        ? `Term rollup preset: ${input.payload.rollup_preset}.`
        : 'Marking periods roll into credit terms per the school calendar.',
      input.payload.credit_policy?.unit === 'semester_0_5'
        ? 'Credit unit: 0.5 per semester.'
        : input.payload.credit_policy?.unit === 'year_1_0'
          ? 'Credit unit: 1.0 per year.'
          : 'Credit rules follow the school policy.',
      input.payload.credit_policy?.year_link
        ? 'Year-link credit may apply when both semesters are stored.'
        : 'Semesters store independently unless the school enables year-link.',
    ],
    collapsed_default: true,
    audiences: ALL_AUDIENCES,
  });

  if (input.payload.gpa_mode && input.payload.gpa_mode !== 'off') {
    pushSection(sections, packs, {
      id: 'gpa',
      title: 'GPA',
      body: [
        input.payload.gpa_mode === 'unweighted_and_weighted'
          ? 'The school reports unweighted and weighted GPA.'
          : 'The school reports unweighted GPA.',
        'GPA uses stored transcript rows, never a mean of term GPAs.',
      ],
      collapsed_default: true,
      audiences: [...STAFF_AUDIENCES, 'parent', 'student'],
    });
  }

  pushSection(sections, packs, {
    id: 'how_book',
    title: 'How the book calculates',
    body: [
      'Teachers publish a class syllabus for category weights and late rules.',
      'School locks may freeze scale, rollup, or engine choices.',
    ],
    collapsed_default: true,
    audiences: STAFF_AUDIENCES,
  });

  if (input.payload.locks) {
    const locked = Object.entries(input.payload.locks)
      .filter(([, v]) => v)
      .map(([k]) => k);
    pushSection(sections, packs, {
      id: 'locks',
      title: 'Teacher locks',
      body: locked.length
        ? locked.map((k) => `Locked: ${k.replace(/_/g, ' ')}.`)
        : ['No teacher locks are set.'],
      collapsed_default: true,
      audiences: ADMIN_ONLY,
    });
  }

  pushSection(sections, packs, {
    id: 'not_this',
    title: 'What this is not',
    body: [
      'This page is the school grading contract, not a class syllabus.',
      'PE or pass/fail courses may appear on the transcript under separate rules.',
      'Live assignment scores do not change this published view.',
    ],
    collapsed_default: true,
    audiences: ALL_AUDIENCES,
  });

  // Above-the-fold section ids for packs
  for (const a of ALL_AUDIENCES) {
    packs[a] = ['how', 'periods', 'scale', 'example', ...packs[a]];
  }

  return {
    kind: 'school',
    ref_id: input.ref_id,
    version: Math.max(1, Math.floor(Number(input.version) || 1)),
    published_at: input.published_at ?? null,
    locale: input.locale ?? 'en-US',
    title: 'Grading and Reporting Policy',
    subtitle: input.school_name ?? null,
    how_built_sentence: how,
    weights: [],
    periods,
    period_model: model,
    scale: scale
      ? { name: scale.name, passing_pct: scale.passing_pct, bands: scaleBands(scale) }
      : null,
    worked_example: null,
    tables,
    sections,
    audience_packs: packs,
  };
}

/** Class syllabus snapshot → PolicyViewModel. */
export function buildSyllabusPolicyView(input: SyllabusPolicyInput): PolicyViewModel {
  const snap = input.snapshot;
  const weights = activeWeights(snap.categories);
  const model = input.calendar?.period_model ?? null;
  const noun = periodNoun(model);
  const scale = input.scale ?? null;
  const periods = (input.calendar?.periods ?? [])
    .filter((p) => p.kind === 'marking_period' || p.kind === 'credit_term' || p.kind === 'year')
    .map((p) => ({ id: p.id, code: p.code, name: p.name, kind: p.kind }));

  const packs = emptyPacks();
  const sections: PolicyViewSection[] = [];
  const tables: PolicyViewTable[] = [];
  if (weights.length) tables.push(weightTable(weights));
  if (scale) tables.push(scaleTable(scale));

  const how = weightSentence(weights, noun);
  const example = buildWorkedExample({
    weights,
    engine: snap.engine,
    scale,
    period_label: noun,
  });

  const floorPct =
    snap.floor ??
    (typeof snap.policies?.min_floor_percent === 'number'
      ? (snap.policies.min_floor_percent as number)
      : null);
  const missingRule =
    snap.missing_rule ??
    (snap.policies?.missing_as_zero === true ? 'zero' : 'omit');

  pushSection(sections, packs, {
    id: 'missing_late',
    title: 'Missing, excused, late',
    body: [
      missingCopy(String(missingRule), floorPct),
      lateCopy(snap.late_rule),
      'Excused work is left out of the average.',
    ],
    collapsed_default: true,
    audiences: ALL_AUDIENCES,
  });

  const dropLines: string[] = [];
  for (const c of snap.categories ?? []) {
    const n = c.rules?.drop_lowest_n ?? 0;
    if (n > 0) dropLines.push(`${c.label}: drop lowest ${n}.`);
    if ((c.drop_highest_n ?? 0) > 0) {
      dropLines.push(`${c.label}: drop highest ${c.drop_highest_n}.`);
    }
  }
  pushSection(sections, packs, {
    id: 'ec_drops',
    title: 'Extra credit, drops, retakes',
    body: [
      snap.extra_credit_method
        ? `Extra credit method ${snap.extra_credit_method}${
            snap.ec_cap != null ? ` (cap ${snap.ec_cap}%)` : ''
          }.`
        : 'Extra credit follows the class rules.',
      ...(dropLines.length ? dropLines : ['No automatic drops are configured.']),
    ],
    collapsed_default: true,
    audiences: ALL_AUDIENCES,
  });

  pushSection(sections, packs, {
    id: 'rollup',
    title: 'How this period becomes a semester / transcript line',
    body: [
      snap.book_mode === 'rolling_year'
        ? 'The grade book rolls across the year.'
        : 'The grade book resets each marking period.',
      'Posted period grades freeze on the report card; transcript rows come from credit terms.',
    ],
    collapsed_default: true,
    audiences: ALL_AUDIENCES,
  });

  pushSection(sections, packs, {
    id: 'how_book',
    title: 'How the book calculates',
    body: [
      `Engine: ${enginePlainName(snap.engine)}.`,
      snap.within_category
        ? `Inside each category: ${snap.within_category.replace(/_/g, ' ')}.`
        : 'Inside each category: percent or points per the engine.',
      'Empty categories renormalize unless the syllabus says otherwise.',
    ],
    collapsed_default: true,
    audiences: STAFF_AUDIENCES,
  });

  pushSection(sections, packs, {
    id: 'not_this',
    title: 'What this is not',
    body: [
      'An exam is its own component when the calendar enables it — it is not stuffed into Tests.',
      'School GPA rules live under School → Grading and Reporting Policy.',
      'Changing a live score does not rewrite this published syllabus view.',
    ],
    collapsed_default: true,
    audiences: ALL_AUDIENCES,
  });

  for (const a of ALL_AUDIENCES) {
    packs[a] = ['how', 'periods', 'scale', 'example', ...packs[a]];
  }

  const title =
    input.title ??
    snap.title ??
    (input.class_name ? `${input.class_name} syllabus` : 'Class syllabus');

  return {
    kind: 'syllabus',
    ref_id: input.ref_id,
    version: Math.max(1, Math.floor(Number(input.version) || 1)),
    published_at: input.published_at ?? null,
    locale: input.locale ?? 'en-US',
    title,
    subtitle: input.class_name ?? null,
    how_built_sentence: how,
    weights,
    periods,
    period_model: model,
    scale: scale
      ? { name: scale.name, passing_pct: scale.passing_pct, bands: scaleBands(scale) }
      : null,
    worked_example: example,
    tables,
    sections,
    audience_packs: packs,
  };
}

/** Filter sections for an audience pack (same snapshot). */
export function sectionsForAudience(
  model: PolicyViewModel,
  audience: PolicyViewAudience,
): PolicyViewSection[] {
  const allow = new Set(model.audience_packs[audience] ?? []);
  return model.sections.filter((s) => allow.has(s.id) || s.audiences.includes(audience));
}


