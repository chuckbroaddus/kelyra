/**
 * Imported category weights that don't total 100%: kept as written (never scaled),
 * flagged for review in plain words, and publish stays blocked in the form.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  canFinishReview,
  createEmptyWizardDraft,
  validateWizard,
  weightsOk,
  weightsTotalMessage,
} from '../../components/syllabus/wizardModel.ts';
import { categoryWeightIssue } from './normalizeFieldValues.ts';
import { parseIngestProposal } from './parseProposal.ts';
import { applyProposalToSyllabusDraft } from './pathMapping.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../..');

type Cat = { key?: string; label: string; weight_percent: number };

function doc(cats: Cat[], opts: { engine?: string; warnings?: unknown[] } = {}) {
  const fields: unknown[] = [
    {
      path: 'syllabus.categories',
      value: cats,
      confidence: 0.95,
      evidence: { quote: cats.map((c) => `${c.label} ${c.weight_percent}`).join('\n'), page: 1, region: null },
      status: 'proposed',
    },
  ];
  if (opts.engine) {
    fields.push({
      path: 'syllabus.engine',
      value: opts.engine,
      confidence: 0.9,
      evidence: { quote: 'Weights', page: 1, region: null },
      status: 'proposed',
    });
  }
  return parseIngestProposal(
    {
      source_id: 'doc-w',
      wizard: 'syllabus',
      kind: 'syllabus',
      document_kind_guess: 'syllabus_policy',
      overall_confidence: 0.9,
      fields,
      ambiguities: [],
      warnings: opts.warnings ?? [],
    },
    { expected_kind: 'syllabus' },
  );
}

const catsField = (p: ReturnType<typeof doc>) => p.fields.find((f) => f.path === 'syllabus.categories')!;
const weights = (v: unknown) => (v as Cat[]).map((c) => c.weight_percent);

test('S06 round 4 (recorded model output): 110% is kept, flagged in plain words, and publish is blocked', () => {
  const run = path.join(ROOT, 'notes/qa-fixtures/gradebook-ingest/runs/202610011122');
  for (const id of ['S06__clean', 'S06__photo']) {
    const rec = JSON.parse(fs.readFileSync(path.join(run, `${id}.json`), 'utf8')) as { json: { proposal?: unknown } };
    const p = parseIngestProposal(rec.json.proposal ?? rec.json, { expected_kind: 'syllabus' });
    const f = catsField(p);
    assert.equal(f.status, 'needs_review', id);
    assert.deepEqual(weights(f.value), [50, 40, 20], `${id}: never scaled`);
    assert.equal(f.note, 'Tests 50% + Quizzes 40% + Homework 20% = 110%. We kept the numbers as written.', id);
    const w = p.warnings.filter((x) => /110/.test(x.message));
    assert.deepEqual(
      w.map((x) => [x.code, x.message]),
      [['weights_total', 'These weights add up to 110%. Fix them so they total 100% before publishing.']],
      `${id}: model's "do not auto-fix" note replaced by one plain line`,
    );
    // Still accepted by default on the review card (needs_review at 0.95 confidence), so it reaches the form…
    assert.ok(f.confidence >= 0.5);
    const d = applyProposalToSyllabusDraft(createEmptyWizardDraft(), p);
    assert.deepEqual(d.categories.filter((c) => c.active).map((c) => c.weight_percent), [50, 40, 20], id);
    // …where Save and Publish stay blocked with the categories named and a link to the Categories step.
    assert.equal(weightsOk(d), false, id);
    assert.equal(canFinishReview(d), false, id);
    const issue = validateWizard(d).find((i) => i.path === 'categories.weight_percent')!;
    assert.equal(issue.severity, 'error');
    assert.equal(issue.step, 'categories');
    assert.equal(
      issue.message,
      'Your category weights add up to 110% (Tests 50% + Quizzes 40% + Homework 20%). Change them so they total 100% before you publish.',
    );
  }
});

test('the S06 source really says 110% (not a misread)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'notes/qa-fixtures/gradebook-ingest/S06/source.html'), 'utf8');
  const cells = [...html.matchAll(/<td>(Tests|Quizzes|Homework)<\/td><td>(\d+)<\/td>/g)].map((m) => Number(m[2]));
  assert.deepEqual(cells, [50, 40, 20]);
  assert.match(html, /Weights currently total 110% — do not auto-fix/);
});

test('weights that total 100% are left alone', () => {
  const p = doc([
    { label: 'Tests', weight_percent: 50 },
    { label: 'Quizzes', weight_percent: 30 },
    { label: 'Homework', weight_percent: 20 },
  ], { engine: 'weighted_percent_inside' });
  assert.equal(catsField(p).status, 'proposed');
  assert.equal(catsField(p).note, undefined);
  assert.equal(p.warnings.some((w) => w.code === 'weights_total'), false);
  assert.equal(canFinishReview(applyProposalToSyllabusDraft(createEmptyWizardDraft(), p)), true);
});

test('90% is flagged too, and a total-points syllabus is not', () => {
  const p = doc([
    { label: 'Tests', weight_percent: 40 },
    { label: 'Quizzes', weight_percent: 30 },
    { label: 'Homework', weight_percent: 20 },
  ]);
  assert.equal(catsField(p).status, 'needs_review');
  assert.deepEqual(weights(catsField(p).value), [40, 30, 20]);
  assert.ok(p.warnings.some((w) => w.message === 'These weights add up to 90%. Fix them so they total 100% before publishing.'));
  assert.equal(categoryWeightIssue([{ label: 'Tests', weight_percent: 400 }, { label: 'HW', weight_percent: 100 }], 'total_points'), null);
  assert.equal(categoryWeightIssue([{ label: 'Tests', weight_percent: 0 }], 'weighted_percent_inside'), null);
});

test('numbers that look like points get an honest points message, not a percent one', () => {
  const p = doc([
    { label: 'Tests', weight_percent: 400 },
    { label: 'Quizzes', weight_percent: 200 },
    { label: 'Homework', weight_percent: 100 },
  ], { engine: 'weighted_percent_inside' });
  assert.deepEqual(weights(catsField(p).value), [400, 200, 100]);
  assert.equal(catsField(p).note, 'Tests 400 + Quizzes 200 + Homework 100 = 700. We kept the numbers as written.');
  assert.ok(
    p.warnings.some((w) => w.code === 'weights_total' && /add up to 700, not 100%.*Total points/.test(w.message)),
  );
});

test('an Extra credit row that pushes the total over 100 is called out', () => {
  const issue = categoryWeightIssue(
    [
      { label: 'Tests', weight_percent: 60 },
      { label: 'Quizzes', weight_percent: 40 },
      { label: 'Extra credit', weight_percent: 10 },
    ],
    'weighted_percent_inside',
  )!;
  assert.equal(issue.kind, 'off');
  assert.match(issue.note, /Without Extra credit they total 100%\.$/);
});

test('fraction weights (0.5 / 0.3 / 0.2) still become percents and pass', () => {
  const p = doc([
    { label: 'Tests', weight_percent: 0.5 },
    { label: 'Quizzes', weight_percent: 0.3 },
    { label: 'Homework', weight_percent: 0.2 },
  ]);
  assert.deepEqual(weights(catsField(p).value), [50, 30, 20]);
  assert.equal(p.warnings.some((w) => w.code === 'weights_total'), false);
});

test('form message for one category stays short', () => {
  const d = createEmptyWizardDraft();
  const one = { ...d, categories: d.categories.map((c, i) => ({ ...c, active: i === 0, weight_percent: 80 })) };
  assert.match(weightsTotalMessage(one), /^Your category weights add up to 80%\. Change them/);
});
