/**
 * Normalize + prompt + UI mapping tests using baseline-shaped fixture JSON (no live AI).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createEmptyWizardDraft } from '../../components/syllabus/wizardModel.ts';
import { createEmptyDraft } from '../school/gradingPolicy.ts';
import {
  coerceCategories,
  coerceLateRule,
  mapCustomWeightsToPreset,
  normalizeProposalFields,
} from './normalizeFieldValues.ts';
import { parseIngestProposal } from './parseProposal.ts';
import { applyProposalToSyllabusDraft, mergeIntoSetupDraft } from './pathMapping.ts';
import {
  buildSchoolPolicyIngestPrompt,
  buildSchoolPolicyRetryPrompt,
  buildSyllabusIngestPrompt,
} from './prompts.ts';

const ev = (quote: string) => ({ quote, page: 1 as number | null, region: null as string | null });

test('coerceLateRule: string per-day and not_accepted', () => {
  assert.deepEqual(coerceLateRule('-10% per day'), {
    type: 'per_day',
    amount: 10,
    unit: 'percent',
  });
  assert.deepEqual(coerceLateRule('10% per day'), {
    type: 'per_day',
    amount: 10,
    unit: 'percent',
  });
  assert.deepEqual(coerceLateRule('not_accepted'), { type: 'none' });
  assert.deepEqual(coerceLateRule({ type: 'percent_per_day', percent: 10 }), {
    type: 'per_day',
    amount: 10,
    unit: 'percent',
  });
});

test('coerceCategories: name/weight aliases + fraction clamp + no 90 renormalize', () => {
  const named = coerceCategories([
    { name: 'Tests', weight: 50 },
    { name: 'Daily', weight: 50, drop_lowest: 1 },
  ]);
  assert.equal(named?.[0]?.label, 'Tests');
  assert.equal(named?.[0]?.weight_percent, 50);
  assert.equal(named?.[1]?.drop_lowest, 1);

  const frac = coerceCategories([
    { label: 'A', weight: 0.4 },
    { label: 'B', weight: 0.3 },
    { label: 'C', weight: 0.3 },
  ]);
  assert.equal(frac?.[0]?.weight_percent, 40);

  const sum90 = coerceCategories([
    { label: 'Essays', weight: 40 },
    { label: 'Quizzes', weight: 30 },
    { label: 'Homework', weight: 20 },
  ]);
  const sum = sum90!.reduce((s, c) => s + c.weight_percent, 0);
  assert.equal(sum, 90);
});

test('mapCustomWeightsToPreset: 2/7+1/7', () => {
  assert.equal(
    mapCustomWeightsToPreset({ periods: [2, 2, 2], exam: 1, denominator: 7 }),
    '2/7+1/7',
  );
});

test('baseline S01-shaped raw: late string + name/weight categories normalize', () => {
  const raw = {
    source_id: 'S01',
    wizard: 'syllabus',
    kind: 'syllabus',
    overall_confidence: 0.95,
    fields: [
      {
        path: 'syllabus.title',
        value: 'Algebra I — Course Syllabus',
        confidence: 1,
        evidence: ev('Algebra I — Course Syllabus'),
      },
      {
        path: 'syllabus.engine',
        value: 'weighted_percent_inside',
        confidence: 0.95,
        evidence: ev('Tests | 50%'),
      },
      {
        path: 'syllabus.categories',
        value: [
          { name: 'Tests', weight: 50 },
          { name: 'Daily', weight: 50, drop_lowest: 1 },
        ],
        confidence: 0.95,
        evidence: ev('Tests | 50%\nDaily | 50%'),
      },
      {
        path: 'syllabus.late_rule',
        value: '-10% per day',
        confidence: 1,
        evidence: ev('Late work: -10% per day.'),
      },
    ],
    ambiguities: [],
    warnings: [],
  };
  const p = parseIngestProposal(raw, { expected_kind: 'syllabus' });
  const late = p.fields.find((f) => f.path === 'syllabus.late_rule');
  assert.deepEqual(late?.value, { type: 'per_day', amount: 10, unit: 'percent' });
  const cats = p.fields.find((f) => f.path === 'syllabus.categories');
  assert.equal((cats?.value as { label: string }[])[0]?.label, 'Tests');
});

test('baseline S02: engine points + missing zero + late not_accepted', () => {
  const p = parseIngestProposal(
    {
      wizard: 'syllabus',
      fields: [
        {
          path: 'syllabus.engine',
          value: 'points',
          confidence: 1,
          evidence: ev('total points'),
        },
        {
          path: 'syllabus.late_rule',
          value: 'not_accepted',
          confidence: 1,
          evidence: ev('not accepted'),
        },
        {
          path: 'syllabus.missing_rule',
          value: 'zero',
          confidence: 1,
          evidence: ev('counts as zero'),
        },
      ],
    },
    { expected_kind: 'syllabus' },
  );
  assert.equal(p.fields.find((f) => f.path === 'syllabus.engine')?.value, 'total_points');
  assert.deepEqual(p.fields.find((f) => f.path === 'syllabus.late_rule')?.value, { type: 'none' });
  assert.equal(p.fields.find((f) => f.path === 'syllabus.missing_rule')?.value, 'zero');
});

test('H01-shaped custom_weights lifts to rollup.preset + period_model', () => {
  const p = parseIngestProposal(
    {
      wizard: 'school',
      kind: 'school_policy',
      fields: [
        {
          path: 'calendar.template',
          value: 'tx_six_weeks',
          confidence: 0.95,
          evidence: ev('six-week'),
        },
        {
          path: 'rollup.custom_weights',
          value: { periods: [2, 2, 2], exam: 1, denominator: 7 },
          confidence: 0.95,
          evidence: ev('2/7 and 1/7'),
        },
        {
          path: 'levels.list',
          value: ['On-level', 'Honors', 'AP'],
          confidence: 0.9,
          evidence: ev('AP A = 5.0'),
        },
      ],
    },
    { expected_kind: 'school_policy' },
  );
  assert.equal(p.fields.find((f) => f.path === 'rollup.preset')?.value, '2/7+1/7');
  assert.equal(p.fields.find((f) => f.path === 'calendar.period_model')?.value, 'six_weeks');
  assert.equal(p.fields.find((f) => f.path === 'gpa.mode')?.value, 'unweighted_and_weighted');
  assert.ok(!p.fields.some((f) => f.path === 'rollup.custom_weights' && f.value != null));
});

test('mixed document empties fields with block warning', () => {
  const p = parseIngestProposal(
    {
      wizard: 'syllabus',
      document_kind_guess: 'mixed',
      fields: [
        {
          path: 'syllabus.title',
          value: 'Math — Ms. A / English — Mr. B',
          confidence: 0.9,
          evidence: ev('Math / English'),
        },
        {
          path: 'syllabus.engine',
          value: 'weighted_percent_inside',
          confidence: 0.9,
          evidence: ev('weights'),
        },
      ],
    },
    { expected_kind: 'syllabus' },
  );
  assert.equal(p.fields.length, 0);
  assert.ok(p.warnings.some((w) => w.code === 'mixed_document' && w.severity === 'block'));
});

test('no-evidence filled field is dropped', () => {
  const p = normalizeProposalFields({
    source_id: 'x',
    wizard: 'syllabus',
    kind: 'syllabus',
    fields: [
      {
        path: 'syllabus.floor',
        value: 50,
        confidence: 0.9,
        evidence: { quote: '', page: null, region: null },
        status: 'proposed',
        source_doc_id: 'x',
      },
    ],
    ambiguities: [],
    warnings: [],
    document_kind_guess: null,
    overall_confidence: 0.9,
  });
  assert.equal(p.fields.length, 0);
  assert.ok(p.warnings.some((w) => w.code === 'dropped_no_evidence'));
});

test('UI mapping: normalized proposal fills wizard + review flags', () => {
  const proposal = parseIngestProposal({
    wizard: 'syllabus',
    fields: [
      {
        path: 'syllabus.engine',
        value: 'weighted_percent_inside',
        confidence: 0.7,
        evidence: ev('50/50'),
        status: 'needs_review',
      },
      {
        path: 'syllabus.categories',
        value: [
          { name: 'Tests', weight: 50 },
          { name: 'Daily', weight: 50 },
        ],
        confidence: 0.95,
        evidence: ev('Tests 50 Daily 50'),
      },
      {
        path: 'syllabus.late_rule',
        value: '10% per day',
        confidence: 0.95,
        evidence: ev('10% per day'),
      },
      {
        path: 'syllabus.floor',
        value: '50',
        confidence: 0.9,
        evidence: ev('floor 50'),
      },
    ],
  });
  const draft = createEmptyWizardDraft('class-1');
  const next = applyProposalToSyllabusDraft(draft, proposal);
  assert.equal(next.engine, 'weighted_percent_inside');
  assert.equal(next.categories.length, 2);
  assert.equal(next.late_rule.type, 'per_day');
  assert.equal(next.late_rule.amount, 10);
  assert.equal(next.floor, 50);
  const eng = proposal.fields.find((f) => f.path === 'syllabus.engine');
  assert.equal(eng?.status, 'needs_review');
  assert.ok((eng?.confidence ?? 1) < 0.8);
});

test('UI mapping: school proposal merges SetupDraft calendar+rollup', () => {
  const proposal = parseIngestProposal(
    {
      wizard: 'school',
      fields: [
        {
          path: 'calendar.template',
          value: 'tx_six_weeks',
          confidence: 0.95,
          evidence: ev('six-week'),
        },
        {
          path: 'rollup.preset',
          value: '2/7+1/7',
          confidence: 0.95,
          evidence: ev('2/7'),
        },
      ],
    },
    { expected_kind: 'school_policy' },
  );
  const setup = createEmptyDraft('school-1', 'high');
  const { setup: next, result } = mergeIntoSetupDraft(setup, proposal);
  assert.ok(result.applied.includes('calendar.template'));
  assert.equal(next.fields['calendar.template']?.value, 'tx_six_weeks');
  assert.equal(next.fields['rollup.preset']?.value, '2/7+1/7');
  assert.equal(next.fields['calendar.template']?.source, 'ai');
});

test('prompts include few-shot, mixed-doc, evidence, handwriting, rollup force', () => {
  const s = buildSyllabusIngestPrompt({ class_id: 'c1' });
  const p = buildSchoolPolicyIngestPrompt({ school_id: 's1' });
  const r = buildSchoolPolicyRetryPrompt({ school_id: 's1' });
  assert.ok(s.includes('late_rule MUST be an object'));
  assert.ok(s.includes('TWO syllabi') || s.includes('mixed'));
  assert.ok(s.includes('Handwritten') || s.includes('transcribe'));
  assert.ok(s.includes('evidence.quote'));
  assert.ok(p.includes('rollup.preset'));
  assert.ok(p.includes('2/7+1/7'));
  assert.ok(p.includes('ALWAYS emit calendar.template'));
  assert.ok(r.includes('STRICT RETRY'));
});

test('S06 sum110 categories keep 110 after normalize', () => {
  const p = parseIngestProposal({
    wizard: 'syllabus',
    fields: [
      {
        path: 'syllabus.categories',
        value: [
          { category: 'Tests', weight: 50 },
          { category: 'Quizzes', weight: 40 },
          { category: 'Homework', weight: 20 },
        ],
        confidence: 0.95,
        evidence: ev('50/40/20'),
      },
    ],
  });
  const cats = p.fields.find((f) => f.path === 'syllabus.categories')?.value as {
    weight_percent: number;
  }[];
  const sum = cats.reduce((s, c) => s + c.weight_percent, 0);
  assert.equal(sum, 110);
});
