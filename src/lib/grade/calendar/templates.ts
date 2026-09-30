import { midpointDate, splitDateRangeEvenly } from './dates.ts';
import { buildTermRollup } from './rollups.ts';
import type {
  GradingCalendar,
  MarkingPeriod,
  PeriodKind,
  PeriodModel,
  RollupPresetKey,
  TemplateKey,
  TemplateOptions,
  TermRollup,
} from './types.ts';

type PeriodDraft = {
  code: string;
  name: string;
  kind: PeriodKind;
  parent_code: string | null;
  sort_order: number;
};

function period(
  code: string,
  name: string,
  kind: PeriodKind,
  parent_id: string | null,
  sort_order: number,
  start_date: string | null = null,
  end_date: string | null = null,
): MarkingPeriod {
  return {
    id: code,
    code,
    name,
    kind,
    parent_id,
    start_date,
    end_date,
    sort_order,
  };
}

function applyDates(
  drafts: PeriodDraft[],
  year: { start: string; end: string } | null | undefined,
  withProgress: boolean,
): MarkingPeriod[] {
  const byCode = new Map<string, MarkingPeriod>();
  for (const d of drafts) {
    byCode.set(
      d.code,
      period(d.code, d.name, d.kind, d.parent_code, d.sort_order, null, null),
    );
  }

  if (!year) {
    return [...byCode.values()].sort((a, b) => a.sort_order - b.sort_order);
  }

  const yearNode = [...byCode.values()].find((p) => p.kind === 'year');
  if (yearNode) {
    yearNode.start_date = year.start;
    yearNode.end_date = year.end;
  }

  const assignRange = (
    nodes: MarkingPeriod[],
    range: { start: string; end: string },
  ) => {
    if (nodes.length === 0) return;
    const slices = splitDateRangeEvenly(range.start, range.end, nodes.length);
    nodes.forEach((node, i) => {
      node.start_date = slices[i]!.start;
      node.end_date = slices[i]!.end;
    });
  };

  const credit = [...byCode.values()]
    .filter((p) => p.kind === 'credit_term')
    .sort((a, b) => a.sort_order - b.sort_order);

  if (credit.length > 0) {
    assignRange(credit, year);
    for (const term of credit) {
      const mps = [...byCode.values()]
        .filter((p) => p.kind === 'marking_period' && p.parent_id === term.code)
        .sort((a, b) => a.sort_order - b.sort_order);
      if (term.start_date && term.end_date) {
        assignRange(mps, { start: term.start_date, end: term.end_date });
      }
      const exams = [...byCode.values()]
        .filter((p) => p.kind === 'exam' && p.parent_id === term.code)
        .sort((a, b) => a.sort_order - b.sort_order);
      for (const ex of exams) {
        ex.start_date = term.end_date;
        ex.end_date = term.end_date;
      }
    }
  } else {
    const mps = [...byCode.values()]
      .filter((p) => p.kind === 'marking_period')
      .sort((a, b) => a.sort_order - b.sort_order);
    assignRange(mps, year);
    const exams = [...byCode.values()]
      .filter((p) => p.kind === 'exam')
      .sort((a, b) => a.sort_order - b.sort_order);
    for (const ex of exams) {
      ex.start_date = year.end;
      ex.end_date = year.end;
    }
  }

  let periods = [...byCode.values()].sort((a, b) => a.sort_order - b.sort_order);

  if (withProgress) {
    const extras: MarkingPeriod[] = [];
    let sortBase = 10_000;
    for (const mp of periods.filter((p) => p.kind === 'marking_period')) {
      if (!mp.start_date || !mp.end_date) continue;
      const mid = midpointDate(mp.start_date, mp.end_date);
      extras.push(
        period(
          `${mp.code}-PR`,
          `${mp.name} progress`,
          'progress',
          mp.id,
          sortBase++,
          mid,
          mid,
        ),
      );
    }
    periods = [...periods, ...extras].sort((a, b) => a.sort_order - b.sort_order);
  }

  return periods;
}

function baseCalendar(
  opts: TemplateOptions,
  name: string,
  level: GradingCalendar['level'],
  period_model: PeriodModel,
  drafts: PeriodDraft[],
  rollups: TermRollup[],
  glyph_scope: 'semester' | 'year' = 'semester',
  show_interims = false,
): GradingCalendar {
  const periods = applyDates(drafts, opts.year ?? null, Boolean(opts.progress_checkpoints));
  return {
    id: opts.id ?? `tmpl_${period_model}`,
    school_id: opts.school_id ?? null,
    name: opts.name ?? name,
    level,
    period_model,
    periods,
    rollups,
    show_interims_in_filter: show_interims || Boolean(opts.progress_checkpoints),
    glyph_scope,
  };
}

/** Texas secondary six-weeks: 6W1–6W3→S1, 6W4–6W6→S2, E1/E2, rollup 2/7+1/7. */
export function txSixWeeks(opts: TemplateOptions = {}): GradingCalendar {
  const drafts: PeriodDraft[] = [
    { code: 'Y1', name: 'Year', kind: 'year', parent_code: null, sort_order: 0 },
    { code: 'S1', name: 'Semester 1', kind: 'credit_term', parent_code: 'Y1', sort_order: 10 },
    { code: 'S2', name: 'Semester 2', kind: 'credit_term', parent_code: 'Y1', sort_order: 20 },
    { code: '6W1', name: 'Six weeks 1', kind: 'marking_period', parent_code: 'S1', sort_order: 11 },
    { code: '6W2', name: 'Six weeks 2', kind: 'marking_period', parent_code: 'S1', sort_order: 12 },
    { code: '6W3', name: 'Six weeks 3', kind: 'marking_period', parent_code: 'S1', sort_order: 13 },
    { code: 'E1', name: 'Semester 1 exam', kind: 'exam', parent_code: 'S1', sort_order: 14 },
    { code: '6W4', name: 'Six weeks 4', kind: 'marking_period', parent_code: 'S2', sort_order: 21 },
    { code: '6W5', name: 'Six weeks 5', kind: 'marking_period', parent_code: 'S2', sort_order: 22 },
    { code: '6W6', name: 'Six weeks 6', kind: 'marking_period', parent_code: 'S2', sort_order: 23 },
    { code: 'E2', name: 'Semester 2 exam', kind: 'exam', parent_code: 'S2', sort_order: 24 },
  ];
  const preset: RollupPresetKey = opts.rollup_preset ?? '2/7+1/7';
  const rollups: TermRollup[] = [
    buildTermRollup({
      term_id: 'S1',
      child_period_ids: ['6W1', '6W2', '6W3'],
      preset,
      exam_code: 'E1',
    }),
    buildTermRollup({
      term_id: 'S2',
      child_period_ids: ['6W4', '6W5', '6W6'],
      preset,
      exam_code: 'E2',
    }),
    buildTermRollup({
      term_id: 'Y1',
      child_period_ids: ['S1', 'S2'],
      preset: 'year_mean',
    }),
  ];
  return baseCalendar(opts, 'Texas six-weeks', 'high', 'six_weeks', drafts, rollups, 'semester');
}

/** National secondary nine-weeks: Q1–Q4, S1/S2, default 40/40/20. */
export function nineWeeks(opts: TemplateOptions = {}): GradingCalendar {
  const drafts: PeriodDraft[] = [
    { code: 'Y1', name: 'Year', kind: 'year', parent_code: null, sort_order: 0 },
    { code: 'S1', name: 'Semester 1', kind: 'credit_term', parent_code: 'Y1', sort_order: 10 },
    { code: 'S2', name: 'Semester 2', kind: 'credit_term', parent_code: 'Y1', sort_order: 20 },
    { code: 'Q1', name: 'Quarter 1', kind: 'marking_period', parent_code: 'S1', sort_order: 11 },
    { code: 'Q2', name: 'Quarter 2', kind: 'marking_period', parent_code: 'S1', sort_order: 12 },
    { code: 'E1', name: 'Semester 1 exam', kind: 'exam', parent_code: 'S1', sort_order: 13 },
    { code: 'Q3', name: 'Quarter 3', kind: 'marking_period', parent_code: 'S2', sort_order: 21 },
    { code: 'Q4', name: 'Quarter 4', kind: 'marking_period', parent_code: 'S2', sort_order: 22 },
    { code: 'E2', name: 'Semester 2 exam', kind: 'exam', parent_code: 'S2', sort_order: 23 },
  ];
  const preset: RollupPresetKey = opts.rollup_preset ?? '40/40/20';
  const rollups: TermRollup[] = [
    buildTermRollup({
      term_id: 'S1',
      child_period_ids: ['Q1', 'Q2'],
      preset,
      exam_code: 'E1',
    }),
    buildTermRollup({
      term_id: 'S2',
      child_period_ids: ['Q3', 'Q4'],
      preset,
      exam_code: 'E2',
    }),
    buildTermRollup({
      term_id: 'Y1',
      child_period_ids: ['S1', 'S2'],
      preset: 'year_mean',
    }),
  ];
  return baseCalendar(opts, 'Nine-weeks', 'high', 'nine_weeks', drafts, rollups, 'semester');
}

/** Three trimesters → one year. */
export function trimester(opts: TemplateOptions = {}): GradingCalendar {
  const drafts: PeriodDraft[] = [
    { code: 'Y1', name: 'Year', kind: 'year', parent_code: null, sort_order: 0 },
    { code: 'T1', name: 'Trimester 1', kind: 'credit_term', parent_code: 'Y1', sort_order: 10 },
    { code: 'T2', name: 'Trimester 2', kind: 'credit_term', parent_code: 'Y1', sort_order: 20 },
    { code: 'T3', name: 'Trimester 3', kind: 'credit_term', parent_code: 'Y1', sort_order: 30 },
  ];
  const rollups: TermRollup[] = [
    buildTermRollup({
      term_id: 'Y1',
      child_period_ids: ['T1', 'T2', 'T3'],
      preset: opts.rollup_preset ?? 'year_mean',
    }),
  ];
  return baseCalendar(opts, 'Trimester', 'middle', 'trimester', drafts, rollups, 'year');
}

/** College single term (one credit term under year). */
export function collegeTerm(opts: TemplateOptions = {}): GradingCalendar {
  const drafts: PeriodDraft[] = [
    { code: 'Y1', name: 'Academic year', kind: 'year', parent_code: null, sort_order: 0 },
    { code: 'T1', name: 'Term', kind: 'credit_term', parent_code: 'Y1', sort_order: 10 },
  ];
  const rollups: TermRollup[] = [
    buildTermRollup({
      term_id: 'Y1',
      child_period_ids: ['T1'],
      preset: 'year_mean',
    }),
  ];
  return baseCalendar(opts, 'College term', 'college', 'college', drafts, rollups, 'year');
}

function elementaryYear(reports: 4 | 6, opts: TemplateOptions): GradingCalendar {
  const drafts: PeriodDraft[] = [
    { code: 'Y1', name: 'Year', kind: 'year', parent_code: null, sort_order: 0 },
  ];
  for (let i = 1; i <= reports; i++) {
    drafts.push({
      code: `R${i}`,
      name: `Report ${i}`,
      kind: 'marking_period',
      parent_code: 'Y1',
      sort_order: i,
    });
  }
  const childIds = Array.from({ length: reports }, (_, i) => `R${i + 1}`);
  const rollups: TermRollup[] = [
    buildTermRollup({
      term_id: 'Y1',
      child_period_ids: childIds,
      preset: opts.rollup_preset ?? (reports === 4 ? '25x4' : 'year_mean'),
    }),
  ];
  return baseCalendar(
    opts,
    reports === 4 ? 'Elementary year (4 reports)' : 'Elementary year (6 reports)',
    'elementary',
    'year',
    drafts,
    rollups,
    'year',
  );
}

export function elementaryYear4(opts: TemplateOptions = {}): GradingCalendar {
  return elementaryYear(4, opts);
}

export function elementaryYear6(opts: TemplateOptions = {}): GradingCalendar {
  return elementaryYear(6, opts);
}

/** Two semesters with no child marking periods (FR-CAL-01 semester model). */
export function semesterOnly(opts: TemplateOptions = {}): GradingCalendar {
  const drafts: PeriodDraft[] = [
    { code: 'Y1', name: 'Year', kind: 'year', parent_code: null, sort_order: 0 },
    { code: 'S1', name: 'Semester 1', kind: 'credit_term', parent_code: 'Y1', sort_order: 10 },
    { code: 'S2', name: 'Semester 2', kind: 'credit_term', parent_code: 'Y1', sort_order: 20 },
  ];
  const rollups: TermRollup[] = [
    buildTermRollup({
      term_id: 'Y1',
      child_period_ids: ['S1', 'S2'],
      preset: opts.rollup_preset ?? '50/50',
    }),
  ];
  return baseCalendar(opts, 'Semester (no quarters)', 'high', 'semester', drafts, rollups, 'semester');
}

/**
 * FR-FORM-S03 custom grain: N official marking periods, `perTerm` per credit term.
 * Proposes P1…Pn and S1…Sk (k = N / perTerm). Typical: S1, S2.
 */
export function custom(n: number, perTerm: number, opts: TemplateOptions = {}): GradingCalendar {
  if (!Number.isInteger(n) || n < 1) throw new Error(`n must be positive integer, got ${n}`);
  if (!Number.isInteger(perTerm) || perTerm < 1) {
    throw new Error(`perTerm must be positive integer, got ${perTerm}`);
  }
  if (n % perTerm !== 0) {
    throw new Error(`n (${n}) must be divisible by perTerm (${perTerm})`);
  }
  const termCount = n / perTerm;
  const drafts: PeriodDraft[] = [
    { code: 'Y1', name: 'Year', kind: 'year', parent_code: null, sort_order: 0 },
  ];
  const termCodes: string[] = [];
  for (let t = 1; t <= termCount; t++) {
    const code = `S${t}`;
    termCodes.push(code);
    drafts.push({
      code,
      name: termCount === 2 ? `Semester ${t}` : `Term ${t}`,
      kind: 'credit_term',
      parent_code: 'Y1',
      sort_order: t * 100,
    });
  }
  let p = 1;
  for (let t = 0; t < termCount; t++) {
    const termCode = termCodes[t]!;
    for (let j = 0; j < perTerm; j++) {
      drafts.push({
        code: `P${p}`,
        name: `Period ${p}`,
        kind: 'marking_period',
        parent_code: termCode,
        sort_order: (t + 1) * 100 + j + 1,
      });
      p += 1;
    }
  }

  const rollups: TermRollup[] = [];
  for (let t = 0; t < termCount; t++) {
    const termCode = termCodes[t]!;
    const childIds: string[] = [];
    for (let j = 0; j < perTerm; j++) {
      childIds.push(`P${t * perTerm + j + 1}`);
    }
    rollups.push(
      buildTermRollup({
        term_id: termCode,
        child_period_ids: childIds,
        preset: 'year_mean',
      }),
    );
  }
  if (termCount >= 1) {
    rollups.push(
      buildTermRollup({
        term_id: 'Y1',
        child_period_ids: termCodes,
        preset: termCount === 2 ? '50/50' : 'year_mean',
      }),
    );
  }

  return baseCalendar(
    opts,
    `Custom ${n}×${perTerm}`,
    'high',
    'custom',
    drafts,
    rollups,
    termCount === 2 ? 'semester' : 'year',
  );
}

export const TEMPLATE_BUILDERS: Record<
  TemplateKey,
  (opts?: TemplateOptions) => GradingCalendar
> = {
  tx_six_weeks: txSixWeeks,
  nine_weeks: nineWeeks,
  trimester,
  college_term: collegeTerm,
  elementary_year_4: elementaryYear4,
  elementary_year_6: elementaryYear6,
  semester: semesterOnly,
};

export function buildTemplate(key: TemplateKey, opts: TemplateOptions = {}): GradingCalendar {
  return TEMPLATE_BUILDERS[key](opts);
}
