import assert from 'node:assert/strict';
import test from 'node:test';

import { computePeriod } from './engine/index.ts';
import type { EngineAssignment, EngineCell, EngineSyllabus } from './engine/types.ts';
import { buildTemplate } from './calendar/index.ts';
import { makeScaleFromTemplate } from './scale/scale.ts';
import {
  buildSchoolPolicyView,
  buildSyllabusPolicyView,
  buildWorkedExample,
  sectionsForAudience,
} from './policyView.ts';

test('syllabus policyView: weight table + 50/50 sentence', () => {
  const cal = buildTemplate('tx_six_weeks', {
    id: 'cal1',
    school_id: 'sch1',
    name: 'HS',
  });
  const scale = makeScaleFromTemplate('texas_no_d', { id: 'scl1' });
  const model = buildSyllabusPolicyView({
    ref_id: 'class1',
    version: 3,
    published_at: '2026-09-30T12:00:00.000Z',
    class_name: 'Algebra I',
    calendar: cal,
    scale,
    snapshot: {
      title: 'Algebra I',
      engine: 'weighted_percent_inside',
      missing_rule: 'zero',
      late_rule: { type: 'per_day', amount: 10, unit: 'percent' },
      categories: [
        { key: 'tests', label: 'Tests', weight_percent: 50, active: true },
        { key: 'hw', label: 'Homework', weight_percent: 50, active: true },
      ],
    },
  });

  assert.equal(model.kind, 'syllabus');
  assert.equal(model.version, 3);
  assert.match(model.how_built_sentence, /Tests are 50%/);
  assert.match(model.how_built_sentence, /Homework are 50%/);

  const wt = model.tables.find((t) => t.id === 'weights');
  assert.ok(wt);
  assert.deepEqual(wt!.rows, [
    ['Tests', '50'],
    ['Homework', '50'],
  ]);

  const sc = model.tables.find((t) => t.id === 'scale');
  assert.ok(sc);
  assert.ok(sc!.rows.some((r) => r[0] === 'A' && r[1] === '90'));
  assert.equal(model.scale?.passing_pct, 70);

  const missing = model.sections.find((s) => s.id === 'missing_late');
  assert.ok(missing?.body.some((l) => /counts as 0/.test(l)));
  assert.ok(missing?.body.some((l) => /10 percent per day/.test(l)));
});

test('worked example numbers match engine v2', () => {
  const scale = makeScaleFromTemplate('us_10', { id: 's1' });
  const weights = [
    { key: 'tests', label: 'Tests', weight_percent: 50 },
    { key: 'hw', label: 'Homework', weight_percent: 50 },
  ];
  const ex = buildWorkedExample({
    weights,
    engine: 'weighted_percent_inside',
    scale,
    period_label: 'six-weeks',
  });
  assert.ok(ex);
  assert.equal(ex!.student_name, 'Alex');
  assert.equal(ex!.scores.length, 2);

  const cats = weights.map((w) => ({
    key: w.key,
    label: w.label,
    weight: w.weight_percent,
    include: true as const,
  }));
  const assignments: EngineAssignment[] = ex!.scores.map((s, i) => ({
    id: `ex_${weights[i]!.key}`,
    category: weights[i]!.key,
    period_id: 'P1',
    max_points: s.max_points,
    count_toward_final: true,
    extra_credit: false,
    can_exceed_max: false,
    item_factor: 1,
    droppable: true,
  }));
  const cells: EngineCell[] = ex!.scores.map((s, i) => ({
    assignment_id: `ex_${weights[i]!.key}`,
    raw: s.raw,
    status: 'graded',
  }));
  const syllabus: EngineSyllabus = {
    engine: 'weighted_percent_inside',
    categories: cats,
    missing: 'omit',
    late: { type: 'none' },
    extra_credit: { method: 'B' },
    empty_category: 'renormalize',
    book_mode: 'reset_each_marking_period',
    rounding: 'nearest_whole',
    decimals: 0,
  };
  const r = computePeriod(syllabus, assignments, cells, 'P1');
  assert.equal(r.pct, ex!.pct);
  assert.ok(ex!.letter);
});

test('school policyView: scale + periods + audience packs', () => {
  const cal = buildTemplate('nine_weeks', {
    id: 'cal2',
    school_id: 'sch2',
    name: 'MS',
  });
  const scale = makeScaleFromTemplate('us_10', { id: 'def' });
  const model = buildSchoolPolicyView({
    ref_id: 'sch2',
    version: 1,
    published_at: '2026-09-01T00:00:00.000Z',
    school_name: 'Demo MS',
    payload: {
      level: 'middle',
      calendar: cal,
      scales: [scale],
      default_scale_id: 'def',
      gpa_mode: 'unweighted',
      rollup_preset: '40/40/20',
      credit_policy: { unit: 'semester_0_5', year_link: false, attendance_gate: false },
      locks: { scale: true, rollup: true, engine: false },
      quality_point_tables: [
        {
          id: 'qp1',
          method: 'letter_map',
          rows: [
            { letter: 'A', points_by_level: { regular: 4, honors: 4.5 } },
            { letter: 'B', points_by_level: { regular: 3, honors: 3.5 } },
          ],
        },
      ],
    },
  });

  assert.equal(model.kind, 'school');
  assert.ok(model.periods.length > 0);
  assert.equal(model.scale?.passing_pct, 60);
  assert.ok(model.tables.some((t) => t.id === 'scale'));
  assert.ok(model.tables.some((t) => t.id === 'qp'));
  assert.ok(model.audience_packs.parent.includes('how'));
  assert.ok(model.audience_packs.admin.includes('locks'));
  const parentSecs = sectionsForAudience(model, 'parent');
  assert.ok(!parentSecs.some((s) => s.id === 'locks'));
  const adminSecs = sectionsForAudience(model, 'admin');
  assert.ok(adminSecs.some((s) => s.id === 'locks'));
  assert.match(model.how_built_sentence, /60 is passing/);
});
