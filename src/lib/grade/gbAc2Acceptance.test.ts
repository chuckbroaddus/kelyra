/**
 * GB-AC2 — SRS §11 UI-lane acceptance pins (items 9–10, 14–23).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { getBundledHelpTopic } from '../help/helpTopics.ts';
import { plainSyllabusRules } from './syllabusAverage.ts';
import {
  applyTemplateNotSure,
  createEmptyDraft,
  draftToPayload,
  getFieldValue,
} from '../school/gradingPolicy.ts';
import {
  canFinishReview,
  createEmptyWizardDraft,
  isFieldLocked,
  patchDraft,
  visibleSteps,
  weightsOk,
} from '../../components/syllabus/wizardModel.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('§11.10 parent syllabus summary lists engine/weights/scale/late/drop/EC/semester', () => {
  const lines = plainSyllabusRules(
    [
      { key: 'tests', label: 'Tests', weight_percent: 50, rules: { drop_lowest_n: 1 } },
      { key: 'daily', label: 'Daily', weight_percent: 50 },
    ],
    { missing_as_zero: false, extra_credit_allowed: true },
    {
      engine: 'weighted_percent_inside',
      late_rule: { type: 'per_day', amount: 10, unit: 'percent' },
      extra_credit_method: 'B',
      rollup_preset: '2/7+1/7',
      exam_weight: 1 / 7,
      book_mode: 'reset_each_marking_period',
      scale_label: 'Texas 70-pass',
    },
  );
  const blob = lines.join('\n');
  assert.match(blob, /Engine:/i);
  assert.match(blob, /Letter scale:/i);
  assert.match(blob, /Late work:/i);
  assert.match(blob, /Drop-lowest:/i);
  assert.match(blob, /Extra credit:/i);
  assert.match(blob, /Semester is computed/i);
  const summary = read('src/components/ui/FamilySyllabusSummary.tsx');
  assert.match(summary, /weight_percent/);
  assert.match(summary, /ruleLines/);
});

test('§11.9 locked late is read-only in teacher wizard UI', () => {
  const body = read('src/components/syllabus/WizardStepBody.tsx');
  assert.match(body, /lateLocked/);
  assert.match(body, /disabled=\{lateLocked\}/);
  assert.match(body, /editable=\{!lateLocked\}/);
  assert.match(body, /LockNote draft=\{draft\} field="late"/);
  let d = createEmptyWizardDraft('c1');
  d = patchDraft(
    d,
    {
      locks: { ...d.locks, late: true },
      late_rule: { type: 'per_day', amount: 10, unit: 'percent' },
    },
    { force: true },
  );
  assert.equal(isFieldLocked(d, 'late'), true);
  d = patchDraft(d, { late_rule: { type: 'none' } });
  assert.equal(d.late_rule.type, 'per_day');
});

test('§11.14 six-weeks dates = marking periods only; rollup chips include 2/7', () => {
  const draft = applyTemplateNotSure(createEmptyDraft('school-1', 'high'));
  const payload = draftToPayload(draft);
  assert.equal(getFieldValue(draft, 'calendar.template', ''), 'tx_six_weeks');
  const mps = payload.calendar.periods.filter((p) => p.kind === 'marking_period');
  assert.equal(mps.length, 6);
  assert.equal(payload.rollup_preset, '2/7+1/7');
  const ui = read('src/app/school/grading-policy/index.tsx');
  assert.match(ui, /kind === 'marking_period'/);
  assert.match(ui, /2\/7\+1\/7/);
});

test('§11.15 total points hides weights; weighted blocks Save until 100%', () => {
  let d = createEmptyWizardDraft('c1');
  d = patchDraft(d, { engine: 'total_points' });
  assert.ok(!visibleSteps(d).includes('categories'));
  assert.equal(weightsOk(d), true);
  d = patchDraft(d, { engine: 'weighted_percent_inside' });
  d = patchDraft(d, {
    categories: d.categories.map((c, i) => (i === 0 ? { ...c, weight_percent: 40 } : c)),
  });
  assert.equal(weightsOk(d), false);
  assert.equal(canFinishReview(d), false);
  const wiz = read('src/components/syllabus/SyllabusWizard.tsx');
  assert.match(wiz, /!canFinishReview\(draft\)/);
  const screen = read('src/app/class/[id]/syllabus.tsx');
  assert.match(screen, /Fix category weights/);
});

test('§11.16 Help on Excused shows 98/120 vs 98/130', () => {
  const t = getBundledHelpTopic('help.excused');
  assert.ok(t);
  assert.match(t!.example ?? '', /98\/120/);
  assert.match(t!.example ?? '', /98\/130/);
  assert.match(t!.meaning, /earned and possible/i);
  const body = read('src/components/syllabus/WizardStepBody.tsx');
  assert.match(body, /Help on Excused/);
  assert.match(body, /help\.excused/);
});

test('§11.17 I\'m not sure → Texas 6-week editable', () => {
  const draft = applyTemplateNotSure(createEmptyDraft('s', 'high'));
  assert.equal(getFieldValue(draft, 'calendar.template', ''), 'tx_six_weeks');
  const ui = read('src/app/school/grading-policy/index.tsx');
  assert.match(ui, /I'm not sure — apply recommended/);
  assert.match(ui, /applyTemplateNotSure/);
  assert.match(ui, /setField\(draft, 'calendar\.template'/);
});

test('§11.18 narrow help opens as FormSheet', () => {
  const ui = read('src/app/school/grading-policy/index.tsx');
  assert.match(ui, /FormSheet/);
  assert.match(ui, /narrow/);
  assert.match(ui, /width <= 400/);
});

test('§11.21 hamburger School + published grading policy hub', () => {
  const ham = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(ham, /label="School"/);
  assert.match(ham, /go\('\/school\/view'\)/);
  assert.match(ham, /Grading and Reporting Policy/);
  const view = read('src/app/school/view/index.tsx');
  assert.match(view, /Grading and Reporting Policy/);
  assert.match(view, /\.eq\('status', 'published'\)/);
});

test('§11.22 FamilyRubricReadOnly only when association exists', () => {
  const fr = read('src/components/rubric/FamilyRubricReadOnly.tsx');
  assert.match(fr, /if \(!rubric\) return null/);
  assert.match(fr, /Rubric/);
});

test('§11.23 AI rubric proposal confirms before gradebook write', () => {
  const api = read('src/lib/rubric/aiProposalApi.ts');
  assert.match(api, /Confirm AI proposal/);
  assert.match(api, /saveRubricAssessment/);
  assert.match(api, /AI never posts alone/);
  const card = read('src/components/rubric/AiProposalCard.tsx');
  assert.match(card, /confirmAiGradeProposal/);
  assert.match(card, /Confirm/);
});
