/**
 * Rubric templates + copy helpers (FR-RUB-05 library).
 */
import { defaultMethodForKind, newId } from './validate.ts';
import type { Rubric, RubricKind, RubricLevel, RubricCriterion, RubricCellDef } from './types.ts';

const FOUR: Array<{ label: string; rank: number; pts: number }> = [
  { label: 'Exemplary', rank: 4, pts: 4 },
  { label: 'Proficient', rank: 3, pts: 3 },
  { label: 'Developing', rank: 2, pts: 2 },
  { label: 'Beginning', rank: 1, pts: 1 },
];

function levelsFromFour(): RubricLevel[] {
  return FOUR.map((l) => ({
    id: newId('lvl'),
    label: l.label,
    rank: l.rank,
    default_points: l.pts,
  }));
}

export type TemplateKey = 'analytic_essay_20' | 'analytic_weighted' | 'holistic_4';

export function createEmptyRubric(ownerId: string, kind: RubricKind = 'analytic'): Rubric {
  const levels = levelsFromFour();
  const criteria: RubricCriterion[] =
    kind === 'holistic'
      ? [
          {
            id: newId('crit'),
            name: 'Overall',
            description: '',
            max_points: 4,
            weight_pct: null,
            extra_credit: false,
            na_allowed: false,
          },
        ]
      : [];
  return {
    id: newId('rub'),
    owner_id: ownerId,
    school_id: null,
    class_id: null,
    scope: 'user',
    title: '',
    kind,
    scoring: {
      method: defaultMethodForKind(kind),
      use_for_grading: true,
      hide_score_from_family: false,
    },
    levels,
    criteria,
    cells: [],
    version: 1,
    status: 'draft',
    published_at: null,
  };
}

export function templateAnalyticEssay20(ownerId: string): Rubric {
  const levels = levelsFromFour();
  const mk = (name: string, max: number): RubricCriterion => ({
    id: newId('crit'),
    name,
    description: '',
    max_points: max,
    weight_pct: null,
    extra_credit: false,
    na_allowed: true,
  });
  const criteria = [mk('Content', 10), mk('Organization', 5), mk('Mechanics', 5)];
  const cells: RubricCellDef[] = [];
  for (const c of criteria) {
    const pts = [c.max_points, Math.round(c.max_points * 0.8), Math.round(c.max_points * 0.5), 0];
    levels.forEach((lvl, i) => {
      cells.push({
        criterion_id: c.id,
        level_id: lvl.id,
        descriptor: `${c.name} — ${lvl.label}`,
        points: pts[i]!,
        range_min: null,
        range_max: null,
      });
    });
  }
  return {
    ...createEmptyRubric(ownerId, 'analytic'),
    title: 'Essay (Content / Org / Mechanics)',
    levels,
    criteria,
    cells,
    scoring: {
      method: 'sum_points',
      use_for_grading: true,
      hide_score_from_family: false,
    },
  };
}

/** FR-RUB-10 #2: weighted 50/30/20. */
export function templateAnalyticWeighted(ownerId: string): Rubric {
  const base = templateAnalyticEssay20(ownerId);
  const weights = [50, 30, 20];
  const criteria = base.criteria.map((c, i) => ({
    ...c,
    max_points: 10,
    weight_pct: weights[i] ?? 0,
  }));
  const cells: RubricCellDef[] = [];
  for (const c of criteria) {
    const pts = [10, 8, 5, 0];
    base.levels.forEach((lvl, i) => {
      cells.push({
        criterion_id: c.id,
        level_id: lvl.id,
        descriptor: `${c.name} — ${lvl.label}`,
        points: pts[i]!,
        range_min: null,
        range_max: null,
      });
    });
  }
  return {
    ...base,
    title: 'Weighted criteria (50/30/20)',
    criteria,
    cells,
    scoring: {
      method: 'weighted_criteria',
      use_for_grading: true,
      hide_score_from_family: false,
    },
  };
}

export function templateHolistic4(ownerId: string): Rubric {
  const levels = levelsFromFour().map((l, i) => ({
    ...l,
    default_points: [4, 3, 2, 1][i],
  }));
  const crit: RubricCriterion = {
    id: newId('crit'),
    name: 'Overall quality',
    description: '',
    max_points: 4,
    weight_pct: null,
    extra_credit: false,
    na_allowed: false,
  };
  const cells: RubricCellDef[] = levels.map((lvl, i) => ({
    criterion_id: crit.id,
    level_id: lvl.id,
    descriptor: lvl.label,
    points: [4, 3, 2, 1][i]!,
    range_min: null,
    range_max: null,
  }));
  return {
    ...createEmptyRubric(ownerId, 'holistic'),
    title: 'Holistic 4-point',
    levels,
    criteria: [crit],
    cells,
    scoring: {
      method: 'holistic_points',
      use_for_grading: true,
      hide_score_from_family: false,
    },
  };
}

export function buildTemplate(key: TemplateKey, ownerId: string): Rubric {
  if (key === 'analytic_weighted') return templateAnalyticWeighted(ownerId);
  if (key === 'holistic_4') return templateHolistic4(ownerId);
  return templateAnalyticEssay20(ownerId);
}

/** Deep copy as a new draft version (library edit after scores). */
export function copyRubricAsNewVersion(source: Rubric, ownerId?: string): Rubric {
  const idMap = new Map<string, string>();
  const mapId = (old: string, prefix: string) => {
    const n = newId(prefix);
    idMap.set(old, n);
    return n;
  };
  const levels = source.levels.map((l) => ({ ...l, id: mapId(l.id, 'lvl') }));
  const criteria = source.criteria.map((c) => ({ ...c, id: mapId(c.id, 'crit') }));
  const cells = source.cells.map((cell) => ({
    ...cell,
    criterion_id: idMap.get(cell.criterion_id) ?? cell.criterion_id,
    level_id: idMap.get(cell.level_id) ?? cell.level_id,
  }));
  return {
    ...source,
    id: newId('rub'),
    owner_id: ownerId ?? source.owner_id,
    title: source.title,
    levels,
    criteria,
    cells,
    version: (source.version ?? 1) + 1,
    status: 'draft',
    published_at: null,
  };
}

export function snapshotRubric(rubric: Rubric): Rubric {
  return JSON.parse(JSON.stringify(rubric)) as Rubric;
}
