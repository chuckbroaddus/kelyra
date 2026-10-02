/**
 * Save draft → reload and publish round-trip pins (client model + SQL text).
 * No live DB; migration apply is devops-release (20261002120000 + prior 02110000).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  canFinishReview,
  canSaveDraft,
  createEmptyWizardDraft,
  draftFromBundle,
  patchCategory,
  patchDraft,
  toEditorInput,
} from '../../components/syllabus/wizardModel.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../..');
const MIGRATION = 'supabase/migrations/20261002120000_gb_syllabus_save_publish_fix.sql';

test('canSaveDraft allows incomplete weights; canFinishReview does not', () => {
  let d = createEmptyWizardDraft('c1');
  assert.equal(canSaveDraft(d), true);
  assert.equal(canFinishReview(d), true);
  d = patchCategory(d, 'tests', { weight_percent: 40 });
  assert.equal(canSaveDraft(d), true);
  assert.equal(canFinishReview(d), false);
  d = patchDraft(d, { syllabus_status: 'published' });
  assert.equal(canSaveDraft(d), false);
});

test('save→reload round-trip: toEditorInput fields survive draftFromBundle', () => {
  let d = createEmptyWizardDraft('c1');
  d = patchDraft(d, {
    title: 'Algebra draft',
    engine: 'weighted_points_inside',
    missing_rule: 'zero',
    book_mode: 'rolling_year',
    extra_credit_method: 'B',
    floor: 50,
    late_rule: { type: 'per_day', amount: 10, unit: 'percent' },
    retake: {
      eligible_category_ids: [],
      attempts: 2,
      method: 'higher_of',
      cap: 70,
      window_days: null,
    },
    publish_to_family: false,
  });
  d = patchCategory(d, 'tests', { weight_percent: 40, rules: { drop_lowest_n: 1 } });
  d = patchCategory(d, 'quizzes', { weight_percent: 30 });
  d = patchCategory(d, 'homework', { weight_percent: 30 });
  assert.equal(canFinishReview(d), true);

  const input = toEditorInput(d);
  const reloaded = draftFromBundle({
    classId: 'c1',
    syllabus: {
      class_id: 'c1',
      status: 'draft',
      title: input.title,
      calc_mode: 'category_weight',
      term_structure: input.term_structure,
      active_term: input.active_term,
      policies: input.policies,
      terms: [],
      source: input.source ?? 'manual',
      source_asset_id: null,
      ask_draft: null,
      publish_to_family: input.policies.publish_to_family !== false,
      published_at: null,
      row_version: 1,
      engine: input.engine!,
      within_category: input.within_category ?? null,
      book_mode: input.book_mode!,
      extra_credit_method: input.extra_credit_method!,
      ec_cap: input.ec_cap ?? null,
      late_rule: input.late_rule!,
      missing_rule: input.missing_rule!,
      rounding: input.rounding!,
      floor: input.floor ?? null,
      ceiling: input.ceiling ?? null,
      retake: input.retake ?? null,
      exam_weight: input.exam_weight ?? null,
      rollup_preset: input.rollup_preset ?? null,
      syllabus_version: 1,
      locks: input.locks ?? {},
      marking_period_scope: input.marking_period_scope ?? null,
    },
    categories: input.categories,
  });

  assert.equal(reloaded.title, 'Algebra draft');
  assert.equal(reloaded.engine, 'weighted_points_inside');
  assert.equal(reloaded.within_category, 'points_inside');
  assert.equal(reloaded.missing_rule, 'zero');
  assert.equal(reloaded.book_mode, 'rolling_year');
  assert.equal(reloaded.floor, 50);
  assert.equal(reloaded.late_rule.type, 'per_day');
  assert.equal(reloaded.retake?.method, 'higher_of');
  assert.equal(reloaded.retake?.cap, 70);
  assert.equal(reloaded.publish_to_family, false);
  assert.equal(reloaded.syllabus_status, 'draft');
  assert.equal(reloaded.categories.find((c) => c.key === 'tests')?.weight_percent, 40);
  assert.equal(reloaded.categories.find((c) => c.key === 'tests')?.rules.drop_lowest_n, 1);
  assert.equal(canFinishReview(reloaded), true);
});

test('publish round-trip: published bundle restores status + weights', () => {
  let d = createEmptyWizardDraft('c2');
  d = patchDraft(d, { title: 'Published bag', missing_rule: 'omit' });
  const input = toEditorInput(d);
  const reloaded = draftFromBundle({
    classId: 'c2',
    syllabus: {
      class_id: 'c2',
      status: 'published',
      title: input.title,
      calc_mode: 'category_weight',
      term_structure: input.term_structure,
      active_term: input.active_term,
      policies: input.policies,
      terms: [],
      source: 'manual',
      source_asset_id: null,
      ask_draft: null,
      publish_to_family: true,
      published_at: '2026-10-01T00:00:00Z',
      row_version: 2,
      engine: input.engine!,
      within_category: input.within_category ?? null,
      book_mode: input.book_mode!,
      extra_credit_method: input.extra_credit_method!,
      ec_cap: null,
      late_rule: input.late_rule!,
      missing_rule: input.missing_rule!,
      rounding: input.rounding!,
      floor: null,
      ceiling: null,
      retake: null,
      exam_weight: null,
      rollup_preset: null,
      syllabus_version: 2,
      locks: {},
      marking_period_scope: null,
    },
    categories: input.categories,
  });
  assert.equal(reloaded.syllabus_status, 'published');
  assert.equal(canSaveDraft(reloaded), false);
  assert.equal(canFinishReview(reloaded), true);
  assert.equal(reloaded.row_version, 2);
});

test('UI wires Save draft + Publish to RPCs with feedback', () => {
  const ui = fs.readFileSync(path.join(ROOT, 'src/app/class/[id]/syllabus.tsx'), 'utf8');
  const wiz = fs.readFileSync(path.join(ROOT, 'src/components/syllabus/SyllabusWizard.tsx'), 'utf8');
  assert.match(ui, /saveClassSyllabusDraft/);
  assert.match(ui, /publishClassSyllabus/);
  assert.match(ui, /canSaveDraft/);
  assert.match(ui, /plainSyllabusWriteError/);
  assert.match(ui, /Draft saved/);
  assert.match(ui, /Syllabus published/);
  assert.match(ui, /status=\{status\}/);
  assert.match(ui, /error=\{error\}/);
  assert.match(ui, /Array\.isArray\(idParam\)/);
  assert.match(wiz, /!canSaveDraft\(draft\)/);
  assert.match(wiz, /!canFinishReview\(draft\)/);
  assert.match(wiz, /status\?: string \| null/);
  assert.match(wiz, /error\?: string \| null/);
});

test('newest migration: save keeps retake; publish qualifies locals + retake + EC', () => {
  const sql = fs.readFileSync(path.join(ROOT, MIGRATION), 'utf8');
  const save = sql.slice(sql.indexOf('create or replace function public.save_class_syllabus_draft'));
  const saveBody = save.slice(0, save.indexOf('create or replace function public.publish_class_syllabus'));
  assert.match(saveBody, /retake = excluded\.retake/);
  assert.match(saveBody, /status = 'draft'/);
  assert.match(saveBody, /gb_assert_syllabus_locked_fields/);
  assert.doesNotMatch(saveBody, /title = title/);

  const publish = sql.slice(sql.indexOf('create or replace function public.publish_class_syllabus'));
  assert.match(publish, /title = publish_class_syllabus\.title/);
  assert.match(publish, /term_structure = publish_class_syllabus\.term_structure/);
  assert.match(publish, /retake = retake_val/);
  assert.match(publish, /weights_error := public\.syllabus_publish_weights_error/);
  assert.doesNotMatch(publish, /title = title,/);

  assert.match(sql, /grant execute on function public\.save_class_syllabus_draft/);
  assert.match(sql, /grant execute on function public\.publish_class_syllabus/);

  const later = fs
    .readdirSync(path.join(ROOT, 'supabase/migrations'))
    .filter((f) => f > path.basename(MIGRATION))
    .filter((f) =>
      /function public\.(save_class_syllabus_draft|publish_class_syllabus)\b/.test(
        fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8'),
      ),
    );
  assert.deepEqual(later, []);
});
