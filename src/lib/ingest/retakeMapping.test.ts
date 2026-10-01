/**
 * Document upload → syllabus.retake → form draft (same RetakeRule shape the interview writes).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createEmptyWizardDraft, parentFacingParagraph, type SyllabusWizardDraft } from '../../components/syllabus/wizardModel.ts';
import { labelForIngestValue } from './fieldLabels.ts';
import { coerceRetake, retakeTextConflicts } from './normalizeFieldValues.ts';
import { parseIngestProposal } from './parseProposal.ts';
import { applyProposalToSyllabusDraft, asRetake } from './pathMapping.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../..');

type RawField = { path: string; value: unknown; quote: string; confidence?: number; status?: string };

function doc(fields: RawField[]) {
  return parseIngestProposal(
    {
      source_id: 'doc-1',
      wizard: 'syllabus',
      kind: 'syllabus',
      document_kind_guess: 'syllabus_policy',
      overall_confidence: 0.9,
      fields: fields.map((f) => ({
        path: f.path,
        value: f.value,
        confidence: f.confidence ?? 0.9,
        evidence: { quote: f.quote, page: 1, region: null },
        status: f.status ?? 'proposed',
      })),
      ambiguities: [],
      warnings: [],
    },
    { expected_kind: 'syllabus' },
  );
}

const CATS: RawField = {
  path: 'syllabus.categories',
  value: [
    { key: 'tests', label: 'Tests', weight_percent: 50 },
    { key: 'quizzes', label: 'Quizzes', weight_percent: 30 },
    { key: 'homework', label: 'Homework', weight_percent: 20 },
  ],
  quote: 'Tests 50% Quizzes 30% Homework 20%',
};

function base(): SyllabusWizardDraft {
  return createEmptyWizardDraft('class-1');
}

test('document with retakes: count, keep-higher, cap and categories land on the form draft', () => {
  const p = doc([
    { path: 'syllabus.retake', value: { method: 'keep_highest', attempts: 2, cap: 70, window_days: 5, categories: ['Test'] }, quote: 'Two retakes on tests within 5 days; highest score kept, capped at 70' },
    CATS, // categories after retake on purpose: retake names map onto the final categories
  ]);
  const d = applyProposalToSyllabusDraft(base(), p);
  assert.deepEqual(d.retake, { eligible_category_ids: ['tests'], attempts: 2, method: 'higher_of', cap: 70, window_days: 5 });
  assert.match(parentFacingParagraph(d), /Retakes: 2 retakes on Tests; the higher score counts, up to 70%\. Retakes must be done within 5 days\./);
});

test('document with retakes as plain text: replace / average / cap parse', () => {
  assert.deepEqual(coerceRetake('Retakes: new score replaces the old one (one attempt).'), {
    eligible_category_ids: [], attempts: 1, method: 'replace', cap: null, window_days: null,
  });
  assert.deepEqual(coerceRetake('highest score kept; retake score capped at 70'), {
    eligible_category_ids: [], attempts: 1, method: 'higher_of', cap: 70, window_days: null,
  });
  assert.equal(coerceRetake('the two scores are averaged')?.method, 'average');
  assert.equal(coerceRetake('No retakes.'), null);
  const d = applyProposalToSyllabusDraft(base(), doc([CATS, { path: 'syllabus.retake', value: 'Retake score replaces the old score', quote: 'replaces' }]));
  assert.equal(d.retake?.method, 'replace');
});

test('document without retakes leaves the form value alone', () => {
  const start = { ...base(), retake: { eligible_category_ids: [], attempts: 1, method: 'higher_of' as const, cap: null, window_days: null } };
  const d = applyProposalToSyllabusDraft(start, doc([CATS, { path: 'syllabus.floor', value: 50, quote: 'floor 50' }]));
  assert.deepEqual(d.retake, start.retake);
  const d2 = applyProposalToSyllabusDraft(base(), doc([CATS]));
  assert.equal(d2.retake, null);
});

test('document that says “No retakes” turns retakes off (kept as an answer, not dropped)', () => {
  const start = { ...base(), retake: { eligible_category_ids: [], attempts: 1, method: 'replace' as const, cap: null, window_days: null } };
  const p = doc([CATS, { path: 'syllabus.retake', value: 'No retakes', quote: 'No retakes are offered.' }]);
  const f = p.fields.find((x) => x.path === 'syllabus.retake');
  assert.ok(f, 'explicit no-retakes field survives normalization');
  assert.equal(f!.value, null);
  assert.equal(labelForIngestValue('syllabus.retake', f!.value), 'No retakes');
  assert.equal(applyProposalToSyllabusDraft(start, p).retake, null);
});

test('conflicting retake text is flagged for the teacher and never guessed', () => {
  assert.equal(retakeTextConflicts('The retake replaces the old score. We keep the higher score.'), true);
  assert.equal(retakeTextConflicts('highest score kept; capped at 70'), false);
  const p = doc([
    CATS,
    {
      path: 'syllabus.retake',
      value: { method: 'replace', attempts: 1 },
      quote: 'The retake replaces the old score. Students keep the higher score of the two.',
    },
  ]);
  const f = p.fields.find((x) => x.path === 'syllabus.retake')!;
  assert.equal(f.status, 'conflict');
  assert.ok(p.ambiguities.some((a) => a.code === 'retake_method'));
  const start = base();
  assert.equal(applyProposalToSyllabusDraft(start, p).retake, null);
  // Two clean fields that disagree also leave the form alone.
  const two = doc([
    CATS,
    { path: 'syllabus.retake', value: { method: 'replace' }, quote: 'retake replaces' },
    { path: 'syllabus.retake', value: { method: 'higher_of', cap: 70 }, quote: 'capped at 70' },
  ]);
  assert.equal(applyProposalToSyllabusDraft(start, two).retake, null);
  assert.equal(asRetake('replaces the old score but keep the higher'), 'conflict');
});

test('school-locked retakes are not overwritten by a document', () => {
  const start = base();
  const locked = { ...start, locks: { ...start.locks, retake: true } };
  const d = applyProposalToSyllabusDraft(locked, doc([CATS, { path: 'syllabus.retake', value: { method: 'replace' }, quote: 'replaces' }]));
  assert.equal(d.retake, null);
});

test('form review says drops in plain words', () => {
  const d = applyProposalToSyllabusDraft(base(), doc([{ ...CATS, value: [
    { key: 'tests', label: 'Tests', weight_percent: 50 },
    { key: 'quizzes', label: 'Quizzes', weight_percent: 30, drop_lowest: 1 },
    { key: 'homework', label: 'Homework', weight_percent: 20, drop_lowest: 2 },
  ] }]));
  const text = parentFacingParagraph({ ...d, engine: 'weighted_percent_inside' });
  assert.match(text, /Drops the lowest 1 quiz and the lowest 2 homework\./);
  assert.doesNotMatch(text, /drops \d/);
  assert.match(text, /No retakes\./);
});

test('gradebook round 4 corpus (S06, S08): recorded model output now reaches the form', () => {
  const run = path.join(ROOT, 'notes/qa-fixtures/gradebook-ingest/runs/202610011122');
  const want: Record<string, { method: string; cap: number | null }> = {
    S06__clean: { method: 'higher_of', cap: 70 },
    S06__photo: { method: 'higher_of', cap: 70 },
    S08__clean: { method: 'replace', cap: null },
    S08__photo: { method: 'replace', cap: null },
  };
  for (const [id, exp] of Object.entries(want)) {
    const rec = JSON.parse(fs.readFileSync(path.join(run, `${id}.json`), 'utf8')) as { json: { proposal?: unknown } };
    const proposal = parseIngestProposal(rec.json.proposal ?? rec.json, { expected_kind: 'syllabus' });
    const d = applyProposalToSyllabusDraft(base(), proposal);
    assert.equal(d.retake?.method, exp.method, id);
    assert.equal(d.retake?.cap, exp.cap, id);
  }
});

test('edge function copies match the app copies (prompt + normalizer)', () => {
  const pairs = [
    ['src/lib/ingest/normalizeFieldValues.ts', 'supabase/functions/_shared/ingestNormalize.ts', 15],
    ['src/lib/ingest/prompts.ts', 'supabase/functions/_shared/ingestPrompts.ts', 12],
  ] as const;
  for (const [a, b, skip] of pairs) {
    const body = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8').split('\n').slice(skip).join('\n');
    assert.equal(body(a), body(b), `${a} and ${b} drifted`);
  }
});
