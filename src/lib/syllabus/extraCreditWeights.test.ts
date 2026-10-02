/**
 * Extra credit as its own category may push published weights over 100%:
 * shared TS rule, the syllabus form, the client publish check, and the SQL migration text.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  addCategory,
  canFinishReview,
  createEmptyWizardDraft,
  parentFacingParagraph,
  patchDraft,
  soFarSummary,
  validateWizard,
  weightsOk,
  type SyllabusWizardDraft,
} from '../../components/syllabus/wizardModel.ts';
import {
  extraCreditOnTopSentence,
  isExtraCreditCategory,
  splitWeights,
  weightsTotalOk,
} from './extraCreditWeights.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../..');
const EC_HELPERS = 'supabase/migrations/20261002100000_gb_syllabus_ec_over_100.sql';
// Newest publish_class_syllabus (qualified locals + retake) must still call the EC weight helper.
const MIGRATION = 'supabase/migrations/20261002120000_gb_syllabus_save_publish_fix.sql';

const cat = (label: string, w: number, key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_')) => ({
  key,
  label,
  weight_percent: w,
  active: true,
});

function draftWith(cats: Array<[string, number]>, method: 'A' | 'B' | 'C'): SyllabusWizardDraft {
  let d = createEmptyWizardDraft('c');
  d = { ...d, categories: [] };
  for (const [label, w] of cats) d = addCategory(d, { label, weight_percent: w });
  return patchDraft(d, { extra_credit_method: method });
}

test('which category is the extra-credit one', () => {
  for (const c of [
    { key: 'extra_credit', label: 'Extra credit' },
    { key: 'other', label: 'Extra-credit projects' },
    { key: 'bonus', label: 'Points' },
    { key: 'bonus_pts', label: 'x' },
    { key: 'zz', label: 'Bonus points' },
    { key: 'special', label: 'Special', rules: { extra_credit: true } },
  ]) {
    assert.equal(isExtraCreditCategory(c), true, JSON.stringify(c));
  }
  for (const c of [
    { key: 'tests', label: 'Tests' },
    { key: 'bonusy', label: 'Bonuses' },
    { key: 'my_extra_credit', label: 'My extra credit' },
    { key: 'ec', label: 'EC' },
  ]) {
    assert.equal(isExtraCreditCategory(c), false, JSON.stringify(c));
  }
});

test('rule: regular categories total exactly 100%; only method C lets extra credit go on top', () => {
  const onTop = [cat('Tests', 60), cat('Quizzes', 40), cat('Extra credit', 10)];
  assert.equal(weightsTotalOk(onTop, 'C'), true);
  assert.equal(weightsTotalOk(onTop, 'B'), false);
  assert.equal(weightsTotalOk(onTop, 'A'), false);
  assert.deepEqual(splitWeights(onTop, 'C'), {
    total: 110,
    regular: 100,
    extraCredit: 10,
    regularCount: 2,
    extraCreditLabels: ['Extra credit'],
  });
  // Regular categories off → still blocked, even with method C.
  assert.equal(weightsTotalOk([cat('Tests', 50), cat('Quizzes', 40), cat('Extra credit', 10)], 'C'), false);
  assert.equal(weightsTotalOk([cat('Tests', 60), cat('Quizzes', 50)], 'C'), false);
  // A non-extra-credit category can't be the overage.
  assert.equal(weightsTotalOk([cat('Tests', 60), cat('Quizzes', 40), cat('Projects', 10)], 'C'), false);
  // Extra credit alone is not a syllabus.
  assert.equal(weightsTotalOk([cat('Extra credit', 100)], 'C'), false);
  // Inactive categories don't count.
  assert.equal(weightsTotalOk([cat('Tests', 100), { ...cat('Quizzes', 30), active: false }], 'B'), true);
  assert.equal(extraCreditOnTopSentence(onTop, 'C'), 'Extra credit adds up to 10% on top of 100%.');
  assert.equal(extraCreditOnTopSentence(onTop, 'B'), null);
  assert.equal(extraCreditOnTopSentence([cat('Tests', 100)], 'C'), null);
});

test('form: method C with Extra credit 10% on top can publish and Review says so in plain words', () => {
  const d = draftWith([['Tests', 60], ['Quizzes', 40], ['Extra credit', 10]], 'C');
  assert.equal(weightsOk(d), true);
  assert.equal(canFinishReview(d), true);
  assert.equal(validateWizard(d).some((i) => i.path === 'categories.weight_percent'), false);
  const para = parentFacingParagraph(d);
  assert.match(para, /Extra credit has its own category\.\nExtra credit adds up to 10% on top of 100%\./);
  assert.match(soFarSummary(d), /3 categories adding to 100% \+ 10% extra credit/);
});

test('form: method C still blocks when the regular categories are off', () => {
  const d = draftWith([['Tests', 50], ['Quizzes', 40], ['Extra credit', 10]], 'C');
  assert.equal(canFinishReview(d), false);
  const issue = validateWizard(d).find((i) => i.path === 'categories.weight_percent')!;
  assert.equal(
    issue.message,
    'Your regular category weights add up to 90% (Tests 50% + Quizzes 40%). Change them so they total 100% before you publish. Extra credit (10%) is added on top.',
  );
  assert.equal(issue.step, 'categories');
});

test('form: Extra credit on top with method B is blocked and points to the extra-credit choice', () => {
  const d = draftWith([['Tests', 60], ['Quizzes', 40], ['Extra credit', 10]], 'B');
  assert.equal(canFinishReview(d), false);
  const issue = validateWizard(d).find((i) => i.path === 'categories.weight_percent')!;
  assert.match(issue.message, /^Your category weights add up to 110% \(Tests 60% \+ Quizzes 40% \+ Extra credit 10%\)\. To count Extra credit on top of 100%, choose “Extra credit has its own category”/);
});

test('migration: publish uses the extra-credit-aware weight rule (not applied here; goes to Hermes)', () => {
  const sql = fs.readFileSync(path.join(ROOT, MIGRATION), 'utf8');
  const helpers = fs.readFileSync(path.join(ROOT, EC_HELPERS), 'utf8');
  const publish = sql.slice(sql.indexOf('create or replace function public.publish_class_syllabus'));
  assert.match(publish, /weights_error := public\.syllabus_publish_weights_error\(row\.id, row\.extra_credit_method\);/);
  assert.doesNotMatch(publish, /if abs\(weight_sum - 100\) > 0\.01 then raise exception/);
  assert.match(publish, /syllabus version conflict/);
  assert.match(publish, /not public\.class_teacher_of\(p_class_id\)/);
  assert.match(publish, /gb_assert_syllabus_locked_fields/);
  const fn = helpers.slice(helpers.indexOf('create or replace function public.syllabus_publish_weights_error'));
  assert.match(fn, /if p_extra_credit_method = 'C' then/);
  assert.match(fn, /abs\(\(total - ec_total\) - 100\) > 0\.01/);
  assert.match(fn, /if abs\(total - 100\) > 0\.01 then return 'active weights must sum to 100'/);
  // Same key/label patterns as isExtraCreditCategory().
  assert.match(helpers, /~ '\^\(extra_\?credit\|bonus\)\(_\|\$\)'/);
  assert.match(helpers, /~\* '\^\[\[:space:\]\]\*\(extra\[\[:space:\]_-\]\*credit\|bonus\)\\M'/);
  assert.match(helpers, /\(p_rules->>'extra_credit'\) = 'true'/);
  // Newest migration redefining publish_class_syllabus, so it wins on apply.
  const later = fs
    .readdirSync(path.join(ROOT, 'supabase/migrations'))
    .filter((f) => f > path.basename(MIGRATION))
    .filter((f) => /function public\.publish_class_syllabus\b/.test(fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8')));
  assert.deepEqual(later, []);
});
