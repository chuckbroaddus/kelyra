/**
 * Unit tests: school GB-02 calendar drives syllabus Periods & rounding.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildTemplate } from '../../lib/grade/calendar/templates.ts';
import {
  examWeightPercentFromPreset,
  schoolPeriodSplitFromCalendar,
  termStructureFromPeriodModel,
  termStructureFromTemplate,
} from './schoolPeriodSplit.ts';
import {
  createEmptyWizardDraft,
  draftFromBundle,
  patchDraft,
  toEditorInput,
  type ClassSyllabusDraft,
} from './wizardModel.ts';

test('termStructureFromPeriodModel maps GB-02 models onto DB enum', () => {
  assert.equal(termStructureFromPeriodModel('six_weeks'), 'custom');
  assert.equal(termStructureFromPeriodModel('nine_weeks'), 'quarters');
  assert.equal(termStructureFromPeriodModel('semester'), 'semesters');
  assert.equal(termStructureFromPeriodModel('year'), 'year');
  assert.equal(termStructureFromPeriodModel('trimester'), 'custom');
  assert.equal(termStructureFromTemplate('tx_six_weeks'), 'custom');
  assert.equal(termStructureFromTemplate('nine_weeks'), 'quarters');
  assert.equal(termStructureFromTemplate('semester'), 'semesters');
});

test('Spring Baptist / Texas six-weeks calendar → read-only split summary', () => {
  const cal = buildTemplate('tx_six_weeks', {
    school_id: 'sba',
    name: 'Spring Baptist Academy',
  });
  const split = schoolPeriodSplitFromCalendar(cal, 'tx_six_weeks');
  assert.ok(split);
  assert.equal(split!.term_structure, 'custom');
  assert.equal(split!.period_model, 'six_weeks');
  assert.match(split!.summary_label, /Six weeks \(6 periods\)/i);
  assert.equal(split!.period_names.length, 6);
  assert.equal(split!.period_names[0], '1st Six Weeks');
  assert.equal(split!.period_names[5], '6th Six Weeks');
  assert.equal(examWeightPercentFromPreset('2/7+1/7'), 14.3);
});

test('draftFromBundle overwrites stale Semesters pick with school six-weeks value', () => {
  const cal = buildTemplate('tx_six_weeks', { school_id: 'sba' });
  const syllabus: ClassSyllabusDraft = {
    class_id: 'c1',
    status: 'draft',
    title: 'Alg',
    calc_mode: 'category_weight',
    // Stale default the teacher never chose:
    term_structure: 'semesters',
    active_term: null,
    policies: { missing_as_zero: false, publish_to_family: true },
    terms: [],
    source: 'manual',
    source_asset_id: null,
    ask_draft: null,
    publish_to_family: true,
    published_at: null,
    row_version: 1,
    engine: 'weighted_percent_inside',
    within_category: 'percent_inside',
    book_mode: 'reset_each_marking_period',
    extra_credit_method: 'B',
    ec_cap: null,
    late_rule: { type: 'none' },
    missing_rule: 'omit',
    rounding: 'nearest_whole',
    floor: null,
    ceiling: null,
    retake: null,
    exam_weight: null,
    rollup_preset: null,
    syllabus_version: 1,
    locks: { rollup: true, scale: true },
    marking_period_scope: null,
  };
  const d = draftFromBundle({
    classId: 'c1',
    syllabus,
    categories: [],
    schoolPolicy: {
      locks: { rollup: true, scale: true },
      rollup_preset: '2/7+1/7',
      calendar: cal,
      calendar_template: 'tx_six_weeks',
    },
  });
  assert.equal(d.term_structure, 'custom');
  assert.ok(d.school_period_split);
  assert.match(d.school_period_split!.summary_label, /Six weeks/i);
  assert.equal(d.rollup_preset, '2/7+1/7');
  assert.equal(d.exam_weight, 14.3);
  // Teacher cannot flip the picker under school calendar.
  const blocked = patchDraft(d, { term_structure: 'semesters' });
  assert.equal(blocked.term_structure, 'custom');
  const input = toEditorInput(d);
  assert.equal(input.term_structure, 'custom');
  assert.equal(input.rollup_preset, '2/7+1/7');
  assert.equal(input.exam_weight, 14.3);
});

test('no school calendar keeps free picker defaults', () => {
  const d = createEmptyWizardDraft('c');
  assert.equal(d.school_period_split, null);
  assert.equal(d.term_structure, 'year');
  const next = patchDraft(d, { term_structure: 'semesters' });
  assert.equal(next.term_structure, 'semesters');
});
