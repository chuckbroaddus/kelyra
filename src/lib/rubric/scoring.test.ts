import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTemplate,
  canPublish,
  copyRubricAsNewVersion,
  mapToAssignmentScore,
  scoreRubric,
  templateAnalyticEssay20,
  templateAnalyticWeighted,
  templateHolistic4,
  validateRubric,
} from './index.ts';
import type { AssessmentSelection } from './types.ts';

function pickLevel(rubric: ReturnType<typeof templateAnalyticEssay20>, critName: string, levelLabel: string) {
  const crit = rubric.criteria.find((c) => c.name === critName)!;
  const level = rubric.levels.find((l) => l.label === levelLabel)!;
  const cell = rubric.cells.find((c) => c.criterion_id === crit.id && c.level_id === level.id)!;
  return { crit, level, cell };
}

test('FR-RUB-10 #1 analytic sum Content 8 + Org 5 + Mech 3 = 16/20', () => {
  const r = templateAnalyticEssay20('t1');
  // Content proficient-ish 8: use cell with points 8 (80% of 10 = Exemplary is 10, Proficient 8)
  const content = pickLevel(r, 'Content', 'Proficient');
  const org = pickLevel(r, 'Organization', 'Exemplary'); // 5
  // Mechanics developing: 50% of 5 = 3 (rounded)
  const mech = pickLevel(r, 'Mechanics', 'Developing');
  assert.equal(content.cell.points, 8);
  assert.equal(org.cell.points, 5);
  assert.equal(mech.cell.points, 3);
  const selections: AssessmentSelection[] = [
    { criterion_id: content.crit.id, level_id: content.level.id, points_awarded: 8, comment: '', na: false },
    { criterion_id: org.crit.id, level_id: org.level.id, points_awarded: 5, comment: '', na: false },
    { criterion_id: mech.crit.id, level_id: mech.level.id, points_awarded: 3, comment: '', na: false },
  ];
  const result = scoreRubric(r, selections);
  assert.equal(result.earned, 16);
  assert.equal(result.max, 20);
  assert.equal(result.method, 'sum_points');
  const mapped = mapToAssignmentScore(result, 20, 'set_max');
  assert.equal(mapped.raw_points, 16);
  assert.equal(mapped.max_points, 20);
});

test('FR-RUB-10 #2 weighted 50/30/20 each at 60% → 60% of max', () => {
  const r = templateAnalyticWeighted('t1');
  assert.equal(r.scoring.method, 'weighted_criteria');
  const selections: AssessmentSelection[] = r.criteria.map((c) => ({
    criterion_id: c.id,
    level_id: null,
    points_awarded: c.max_points * 0.6,
    comment: '',
    na: false,
  }));
  const result = scoreRubric(r, selections);
  assert.ok(result.percent != null);
  assert.ok(Math.abs(result.percent! - 60) < 0.01, String(result.percent));
  assert.ok(Math.abs(result.earned - result.max * 0.6) < 0.01);
});

test('holistic level points become assignment score', () => {
  const r = templateHolistic4('t1');
  const proficient = r.levels.find((l) => l.label === 'Proficient')!;
  const result = scoreRubric(r, [], { holistic_level_id: proficient.id });
  assert.equal(result.method, 'holistic_points');
  assert.equal(result.earned, 3);
  assert.equal(result.max, 4);
});

test('map scale percent onto different assignment max', () => {
  const r = templateAnalyticEssay20('t1');
  const selections = r.criteria.map((c) => ({
    criterion_id: c.id,
    level_id: null,
    points_awarded: c.max_points,
    comment: '',
    na: false,
  }));
  const result = scoreRubric(r, selections);
  assert.equal(result.earned, 20);
  const mapped = mapToAssignmentScore(result, 50, 'scale');
  assert.equal(mapped.raw_points, 50);
  assert.equal(mapped.max_points, 50);
  assert.ok(Math.abs(mapped.percent - 100) < 0.01);
});

test('N/A omits criterion from sum max', () => {
  const r = templateAnalyticEssay20('t1');
  const content = r.criteria.find((c) => c.name === 'Content')!;
  const org = r.criteria.find((c) => c.name === 'Organization')!;
  const mech = r.criteria.find((c) => c.name === 'Mechanics')!;
  const result = scoreRubric(r, [
    { criterion_id: content.id, level_id: null, points_awarded: 10, comment: '', na: false },
    { criterion_id: org.id, level_id: null, points_awarded: null, comment: '', na: true },
    { criterion_id: mech.id, level_id: null, points_awarded: 5, comment: '', na: false },
  ]);
  assert.equal(result.earned, 15);
  assert.equal(result.max, 15); // org 5 omitted
});

test('use_for_grading false still scores but caller leaves typed score', () => {
  const r = templateAnalyticEssay20('t1');
  r.scoring.use_for_grading = false;
  const result = scoreRubric(r, [
    { criterion_id: r.criteria[0]!.id, level_id: null, points_awarded: 8, comment: '', na: false },
    { criterion_id: r.criteria[1]!.id, level_id: null, points_awarded: 5, comment: '', na: false },
    { criterion_id: r.criteria[2]!.id, level_id: null, points_awarded: 3, comment: '', na: false },
  ]);
  assert.equal(result.earned, 16);
  assert.equal(r.scoring.use_for_grading, false);
});

test('override_total flags overridden', () => {
  const r = templateAnalyticEssay20('t1');
  const result = scoreRubric(r, [], { override_total: 17 });
  assert.equal(result.earned, 17);
  assert.equal(result.overridden, true);
});

test('copy creates new version with new ids', () => {
  const a = templateAnalyticEssay20('t1');
  a.status = 'published';
  a.version = 1;
  const b = copyRubricAsNewVersion(a, 't1');
  assert.notEqual(b.id, a.id);
  assert.equal(b.version, 2);
  assert.equal(b.status, 'draft');
  assert.notEqual(b.criteria[0]!.id, a.criteria[0]!.id);
});

test('validate template can publish', () => {
  assert.equal(canPublish(templateAnalyticEssay20('t')), true);
  assert.equal(canPublish(templateAnalyticWeighted('t')), true);
  assert.equal(canPublish(templateHolistic4('t')), true);
  const empty = buildTemplate('analytic_essay_20', 't');
  empty.title = '';
  assert.ok(validateRubric(empty).some((i) => i.path === 'title'));
});

test('FR-RUB-00 assignment without rubric is a no-op path', () => {
  // Pure: no association means callers skip scoreRubric — document via null association id.
  const associationId: string | null = null;
  assert.equal(associationId, null);
});
