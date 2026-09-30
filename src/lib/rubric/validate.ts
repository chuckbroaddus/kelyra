/**
 * Rubric validation + draft helpers.
 */
import type { Rubric, RubricIssue, RubricKind, RubricScoringMethod } from './types.ts';

export function hardErrors(issues: RubricIssue[]): RubricIssue[] {
  return issues.filter((i) => i.severity === 'error');
}

export function canPublish(rubric: Pick<Rubric, 'title' | 'kind' | 'scoring' | 'levels' | 'criteria' | 'cells'>): boolean {
  return hardErrors(validateRubric(rubric)).length === 0;
}

export function validateRubric(
  rubric: Pick<Rubric, 'title' | 'kind' | 'scoring' | 'levels' | 'criteria' | 'cells'>,
): RubricIssue[] {
  const issues: RubricIssue[] = [];
  if (!rubric.title?.trim()) {
    issues.push({ path: 'title', message: 'Title is required.', severity: 'error' });
  }
  const kind = rubric.kind;
  if (!['analytic', 'holistic', 'single_point', 'checklist'].includes(kind)) {
    issues.push({ path: 'kind', message: 'Unknown rubric kind.', severity: 'error' });
  }
  if (rubric.levels.length < 1) {
    issues.push({ path: 'levels', message: 'Add at least one level.', severity: 'error' });
  }
  if (kind === 'holistic') {
    if (rubric.criteria.length > 1) {
      issues.push({
        path: 'criteria',
        message: 'Holistic rubrics use one overall row.',
        severity: 'warn',
      });
    }
  } else if (rubric.criteria.length < 1) {
    issues.push({ path: 'criteria', message: 'Add at least one criterion.', severity: 'error' });
  }

  const method = rubric.scoring.method;
  if (kind === 'holistic' && method !== 'holistic_points' && method !== 'none') {
    issues.push({
      path: 'scoring.method',
      message: 'Holistic rubrics should use holistic_points.',
      severity: 'warn',
    });
  }
  if (method === 'weighted_criteria') {
    let w = 0;
    for (const c of rubric.criteria) {
      if (c.extra_credit) continue;
      w += c.weight_pct ?? 0;
      if (c.weight_pct == null) {
        issues.push({
          path: `criteria.${c.id}.weight_pct`,
          message: `${c.name || c.id}: weight required for weighted scoring.`,
          severity: 'error',
        });
      }
    }
    if (Math.abs(w - 100) > 0.01 && w > 0) {
      issues.push({
        path: 'criteria.weights',
        message: `Criterion weights sum to ${w}, expected 100.`,
        severity: 'error',
      });
    }
  }
  for (const c of rubric.criteria) {
    if (!c.name?.trim()) {
      issues.push({ path: `criteria.${c.id}.name`, message: 'Criterion needs a name.', severity: 'error' });
    }
    if (!(c.max_points >= 0) || !Number.isFinite(c.max_points)) {
      issues.push({
        path: `criteria.${c.id}.max_points`,
        message: 'max_points must be a non-negative number.',
        severity: 'error',
      });
    }
  }
  const levelIds = new Set(rubric.levels.map((l) => l.id));
  const critIds = new Set(rubric.criteria.map((c) => c.id));
  for (const cell of rubric.cells) {
    if (!levelIds.has(cell.level_id)) {
      issues.push({
        path: 'cells',
        message: `Cell references missing level ${cell.level_id}.`,
        severity: 'error',
      });
    }
    if (cell.criterion_id && !critIds.has(cell.criterion_id) && kind !== 'holistic') {
      issues.push({
        path: 'cells',
        message: `Cell references missing criterion ${cell.criterion_id}.`,
        severity: 'error',
      });
    }
  }
  return issues;
}

export function defaultMethodForKind(kind: RubricKind): RubricScoringMethod {
  if (kind === 'holistic') return 'holistic_points';
  if (kind === 'checklist') return 'sum_points';
  return 'sum_points';
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
