/**
 * GB-08 live preview: sample roster through engine v2 computePeriod.
 */
import {
  computePeriod,
  type EngineAssignment,
  type EngineCell,
  type EngineSyllabus,
  type PeriodResult,
} from '../../lib/grade/engine/index.ts';
import type { SyllabusWizardDraft } from './wizardModel.ts';
import { isWeightedEngine } from './wizardModel.ts';

export type SampleStudentId = 'alex' | 'blake' | 'casey';

export type SampleStudentPreview = {
  id: SampleStudentId;
  name: string;
  note: string;
  pct: number | null;
  result: PeriodResult;
};

export type LivePreviewResult = {
  period_id: string;
  syllabus: EngineSyllabus;
  assignments: EngineAssignment[];
  students: SampleStudentPreview[];
};

const PERIOD = 'P1';

function draftToEngineSyllabus(draft: SyllabusWizardDraft): EngineSyllabus {
  const engine = draft.engine === 'none' ? 'weighted_percent_inside' : draft.engine;
  const cats = draft.categories
    .filter((c) => c.active)
    .map((c) => ({
      key: c.key,
      label: c.label,
      weight: Number(c.weight_percent) || 0,
      include: true,
      min_grades: c.min_grades_per_term ?? undefined,
      drop_lowest: Number(c.rules?.drop_lowest_n ?? 0) || undefined,
      drop_highest: Number(c.drop_highest_n ?? 0) || undefined,
      keep_highest: c.keep_highest_n == null ? undefined : Number(c.keep_highest_n),
      never_drop_flags: c.never_drop_flags,
    }));
  // total_points / item_weights still need at least one include bucket
  const categories =
    cats.length > 0
      ? cats
      : [{ key: 'work', label: 'Work', weight: 100, include: true as const }];

  let resolvedEngine = engine;
  if (draft.within_category === 'points_inside' && isWeightedEngine(draft.engine)) {
    resolvedEngine = 'weighted_points_inside';
  } else if (draft.within_category === 'percent_inside' && isWeightedEngine(draft.engine)) {
    resolvedEngine = 'weighted_percent_inside';
  }

  return {
    engine: draft.engine === 'none' ? 'none' : resolvedEngine,
    categories,
    missing: draft.missing_rule,
    missing_floor_pct: draft.floor ?? undefined,
    late: draft.late_rule ?? { type: 'none' },
    extra_credit: {
      method: draft.extra_credit_method,
      cap_pct: draft.ec_cap,
    },
    period_floor_pct: draft.floor,
    ceiling_pct: draft.ceiling,
    empty_category: draft.empty_category,
    book_mode: draft.book_mode,
    rounding: draft.rounding,
    decimals: 1,
  };
}

/** Fixed sample assignments so teacher sees effect of each choice. */
export function sampleAssignments(draft: SyllabusWizardDraft): EngineAssignment[] {
  const keys = draft.categories.filter((c) => c.active).map((c) => c.key);
  const tests = keys.includes('tests') ? 'tests' : keys[0] ?? 'work';
  const quizzes = keys.includes('quizzes') ? 'quizzes' : keys[1] ?? tests;
  const hw = keys.includes('homework') ? 'homework' : keys[2] ?? tests;

  const base = (partial: Partial<EngineAssignment> & Pick<EngineAssignment, 'id' | 'category' | 'max_points'>): EngineAssignment => ({
    period_id: PERIOD,
    due_at: '2026-09-10T17:00:00.000Z',
    count_toward_final: true,
    extra_credit: false,
    can_exceed_max: false,
    item_factor: 1,
    droppable: true,
    item_weight_pct: null,
    ...partial,
  });

  return [
    base({ id: 't1', category: tests, max_points: 100, flags: ['major'] }),
    base({ id: 't2', category: tests, max_points: 50 }),
    base({ id: 'q1', category: quizzes, max_points: 10 }),
    base({ id: 'q2', category: quizzes, max_points: 20 }),
    base({ id: 'h1', category: hw, max_points: 10 }),
    base({ id: 'h2', category: hw, max_points: 10 }),
    base({
      id: 'ec1',
      category: tests,
      max_points: 10,
      extra_credit: true,
      can_exceed_max: true,
      count_toward_final: true,
      droppable: false,
    }),
  ];
}

function cell(
  assignment_id: string,
  raw: number | null,
  status: EngineCell['status'] = 'graded',
  extra: Partial<EngineCell> = {},
): EngineCell {
  return { assignment_id, raw, status, ...extra };
}

/** Three students: solid, missing+late, excused+EC skip (FR-FORM-T8). */
export function sampleCells(): Record<SampleStudentId, { name: string; note: string; cells: EngineCell[] }> {
  return {
    alex: {
      name: 'Alex (solid)',
      note: 'All work in; one late quiz.',
      cells: [
        cell('t1', 88),
        cell('t2', 40),
        cell('q1', 9),
        cell('q2', 16, 'late', { submitted_at: '2026-09-12T17:00:00.000Z' }),
        cell('h1', 10),
        cell('h2', 9),
        cell('ec1', 5),
      ],
    },
    blake: {
      name: 'Blake (missing)',
      note: 'Missing homework + low test.',
      cells: [
        cell('t1', 62),
        cell('t2', 30),
        cell('q1', 7),
        cell('q2', 12),
        cell('h1', null, 'missing'),
        cell('h2', 8),
        cell('ec1', null, 'ungraded'),
      ],
    },
    casey: {
      name: 'Casey (excused)',
      note: 'Excused test; skipped EC.',
      cells: [
        cell('t1', null, 'excused'),
        cell('t2', 45),
        cell('q1', 10),
        cell('q2', 18),
        cell('h1', 10),
        cell('h2', 10),
        cell('ec1', null, 'ungraded'),
      ],
    },
  };
}

export function runLivePreview(draft: SyllabusWizardDraft): LivePreviewResult {
  const syllabus = draftToEngineSyllabus(draft);
  const assignments = sampleAssignments(draft);
  const roster = sampleCells();
  const students: SampleStudentPreview[] = (Object.keys(roster) as SampleStudentId[]).map((id) => {
    const row = roster[id]!;
    const result = computePeriod(syllabus, assignments, row.cells, PERIOD);
    return {
      id,
      name: row.name,
      note: row.note,
      pct: result.pct,
      result,
    };
  });
  return { period_id: PERIOD, syllabus, assignments, students };
}

export function formatPct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return 'NG';
  return `${Math.round(pct * 10) / 10}%`;
}
