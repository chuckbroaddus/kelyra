import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addCategory,
  applyAskImport,
  applySchoolPolicyDefaults,
  canFinishReview,
  clampDropLowest,
  createEmptyWizardDraft,
  draftFromBundle,
  dropLowestCategories,
  isFieldLocked,
  parentFacingParagraph,
  patchCategory,
  patchDraft,
  resolveWizardStep,
  setWizardStep,
  showExtraCreditCapField,
  showLateAmountFields,
  showMissingFloorField,
  soFarSummary,
  toEditorInput,
  validateWizard,
  visibleSteps,
  weightsOk,
} from './wizardModel.ts';
import { formatPct, runLivePreview } from './livePreview.ts';

test('empty draft defaults to weighted percent + 100% categories', () => {
  const d = createEmptyWizardDraft('class-1');
  assert.equal(d.engine, 'weighted_percent_inside');
  assert.equal(weightsOk(d), true);
  assert.ok(soFarSummary(d).includes('Weighted'));
  assert.deepEqual(visibleSteps(d).includes('categories'), true);
  assert.equal(visibleSteps(d).includes('within'), false);
  assert.equal(visibleSteps(d).length, 7);
});

test('total_points hides category steps', () => {
  let d = createEmptyWizardDraft('c');
  d = patchDraft(d, { engine: 'total_points' });
  assert.equal(visibleSteps(d).includes('categories'), false);
  assert.equal(weightsOk(d), true);
  assert.equal(canFinishReview(d), true);
});

test('conditional UI fields: floor / late amount / EC cap; drop clamp; publish gate', () => {
  let d = createEmptyWizardDraft('c');
  assert.equal(showMissingFloorField(d), false);
  d = patchDraft(d, { missing_rule: 'floor' });
  assert.equal(showMissingFloorField(d), true);

  assert.equal(showLateAmountFields(d), false);
  d = patchDraft(d, { late_rule: { type: 'per_day', amount: 5, unit: 'percent' } });
  assert.equal(showLateAmountFields(d), true);

  d = patchDraft(d, { extra_credit_method: 'A' });
  assert.equal(showExtraCreditCapField(d), false);
  d = patchDraft(d, { extra_credit_method: 'B' });
  assert.equal(showExtraCreditCapField(d), true);
  d = patchDraft(d, { extra_credit_method: 'C' });
  assert.equal(showExtraCreditCapField(d), true);

  assert.equal(clampDropLowest(9), 3);
  assert.equal(clampDropLowest(-1), 0);
  assert.equal(clampDropLowest(2.7), 2);
  assert.deepEqual(
    dropLowestCategories(d.categories).map((c) => c.key),
    d.categories.filter((c) => c.active).map((c) => c.key),
  );

  d = patchCategory(d, 'tests', { weight_percent: 40 });
  assert.equal(canFinishReview(d), false);
  d = patchCategory(d, 'tests', { weight_percent: 50 });
  assert.equal(canFinishReview(d), true);
});

test('legacy within step resolves to engine; setWizardStep remaps within', () => {
  let d = createEmptyWizardDraft('c');
  d = { ...d, step: 'within' };
  assert.equal(resolveWizardStep(d), 'engine');
  d = setWizardStep(d, 'within');
  assert.equal(d.step, 'engine');
});

test('weights must sum 100; EC method C only lets the extra-credit category go on top', () => {
  let d = createEmptyWizardDraft('c');
  d = patchCategory(d, 'tests', { weight_percent: 40 });
  assert.equal(weightsOk(d), false);
  assert.ok(validateWizard(d).some((i) => i.severity === 'error'));
  // Method C no longer skips the check: regular categories still have to total 100%.
  d = patchDraft(d, { extra_credit_method: 'C' });
  assert.equal(weightsOk(d), false);
  assert.equal(canFinishReview(d), false);
});

test('locked engine cannot change without force', () => {
  let d = createEmptyWizardDraft('c');
  d = applySchoolPolicyDefaults(d, {
    locks: {
      engine: true,
      categories: false,
      scale: true,
      floor: false,
      late: false,
      drop_lowest: false,
      book_mode: false,
      rollup: true,
    },
    engine: 'weighted_points_inside',
  });
  assert.equal(isFieldLocked(d, 'engine'), true);
  assert.equal(d.engine, 'weighted_points_inside');
  d = patchDraft(d, { engine: 'total_points' });
  assert.equal(d.engine, 'weighted_points_inside');
});

test('ask import lands categories + missing policy', () => {
  let d = createEmptyWizardDraft('c');
  d = applyAskImport(d, {
    title: 'Photo syllabus',
    term_structure: 'semesters',
    active_term: 's1',
    policies: { missing_as_zero: true, publish_to_family: true },
    categories: [
      {
        key: 'tests',
        label: 'Tests',
        weight_percent: 60,
        sort_order: 0,
        active: true,
        default_include_in_average: true,
        rules: { drop_lowest_n: 1 },
      },
      {
        key: 'daily',
        label: 'Daily',
        weight_percent: 40,
        sort_order: 1,
        active: true,
        default_include_in_average: true,
        rules: { drop_lowest_n: 0 },
      },
    ],
  });
  assert.equal(d.title, 'Photo syllabus');
  assert.equal(d.missing_rule, 'zero');
  assert.equal(d.categories.length, 2);
  assert.equal(d.source, 'ask_import');
  assert.equal(weightsOk(d), true);
});

test('toEditorInput carries v2 fields for publish API', () => {
  let d = createEmptyWizardDraft('c');
  d = patchDraft(d, {
    engine: 'weighted_points_inside',
    extra_credit_method: 'B',
    missing_rule: 'zero',
    book_mode: 'rolling_year',
    late_rule: { type: 'flat', amount: 10, unit: 'percent' },
  });
  const input = toEditorInput(d);
  assert.equal(input.engine, 'weighted_points_inside');
  assert.equal(input.within_category, 'points_inside');
  assert.equal(input.book_mode, 'rolling_year');
  assert.equal(input.missing_rule, 'zero');
  assert.equal(input.policies.missing_as_zero, true);
  assert.equal(input.late_rule.type, 'flat');
});

test('parent paragraph is generated from structured fields', () => {
  const d = createEmptyWizardDraft('c');
  const p = parentFacingParagraph(d);
  assert.match(p, /How the average is calculated/);
  assert.match(p, /Categories:/);
  assert.match(p, /Excused/);
});

test('live preview returns 3 sample students; missing rule moves Blake', () => {
  const d = createEmptyWizardDraft('c');
  const preview = runLivePreview(d);
  assert.equal(preview.students.length, 3);
  for (const s of preview.students) {
    assert.ok(s.name.length > 0);
    if (s.pct != null) assert.ok(Number.isFinite(s.pct));
    assert.ok(formatPct(s.pct).length >= 2);
  }
  const asZero = runLivePreview(patchDraft(d, { missing_rule: 'zero' }));
  const asOmit = runLivePreview(patchDraft(d, { missing_rule: 'omit' }));
  const blakeZero = asZero.students.find((s) => s.id === 'blake')!.pct;
  const blakeOmit = asOmit.students.find((s) => s.id === 'blake')!.pct;
  assert.ok(blakeZero != null && blakeOmit != null);
  assert.ok((blakeOmit as number) >= (blakeZero as number));
});

test('addCategory respects lock', () => {
  let d = createEmptyWizardDraft('c');
  d = applySchoolPolicyDefaults(d, {
    locks: {
      engine: false,
      categories: true,
      scale: true,
      floor: false,
      late: false,
      drop_lowest: false,
      book_mode: false,
      rollup: true,
    },
  });
  const before = d.categories.length;
  d = addCategory(d, { label: 'Labs' });
  assert.equal(d.categories.length, before);
});

test('draftFromBundle restores published syllabus', () => {
  const d = draftFromBundle({
    classId: 'c1',
    syllabus: {
      class_id: 'c1',
      status: 'published',
      title: 'Alg 1',
      calc_mode: 'category_weight',
      term_structure: 'quarters',
      active_term: 'q1',
      policies: { missing_as_zero: false, publish_to_family: true },
      terms: [],
      source: 'manual',
      source_asset_id: null,
      ask_draft: null,
      publish_to_family: true,
      published_at: '2026-09-01',
      row_version: 3,
      engine: 'total_points',
      within_category: null,
      book_mode: 'reset_each_marking_period',
      extra_credit_method: 'B',
      ec_cap: null,
      late_rule: { type: 'none' },
      missing_rule: 'omit',
      rounding: 'nearest_whole',
      floor: null,
      ceiling: null,
      exam_weight: null,
      rollup_preset: null,
      syllabus_version: 2,
      locks: {},
      marking_period_scope: null,
    },
    categories: [],
  });
  assert.equal(d.engine, 'total_points');
  assert.equal(d.syllabus_status, 'published');
  assert.equal(d.row_version, 3);
  assert.equal(d.title, 'Alg 1');
});
