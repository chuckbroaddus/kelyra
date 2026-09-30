import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isAllowedPath, SCHOOL_POLICY_PATHS, SYLLABUS_PATHS } from './allowedPaths.ts';
import { mergeProposalIntoDraft, acceptField } from './mergeProposal.ts';
import { extractJsonObject, lockedPathsFromMap, parseIngestProposal } from './parseProposal.ts';
import { applyProposalToSyllabusDraft, mergeIntoSetupDraft } from './pathMapping.ts';
import { buildSchoolPolicyIngestPrompt, buildSyllabusIngestPrompt } from './prompts.ts';
import { createEmptyWizardDraft } from '../../components/syllabus/wizardModel.ts';
import { createEmptyDraft } from '../school/gradingPolicy.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => fs.readFileSync(path.join(here, 'fixtures', name), 'utf8');

test('parser: good syllabus fixture keeps allowed paths and drops fake', () => {
  const raw = JSON.parse(fix('syllabus-good.json'));
  const p = parseIngestProposal(raw, { expected_kind: 'syllabus' });
  assert.equal(p.wizard, 'syllabus');
  assert.ok(p.fields.some((f) => f.path === 'syllabus.categories'));
  assert.ok(p.fields.some((f) => f.path === 'syllabus.late_rule'));
  assert.ok(!p.fields.some((f) => f.path === 'fake.invented'));
  assert.ok(p.warnings.some((w) => w.code === 'unknown_paths_dropped'));
  const eng = p.fields.find((f) => f.path === 'syllabus.engine');
  assert.equal(eng?.status, 'needs_review');
  assert.ok(eng && eng.confidence >= 0.5 && eng.confidence < 0.8);
  assert.ok(p.ambiguities.some((a) => a.code === 'within_category'));
});

test('parser: good school fixture maps calendar and gpa paths', () => {
  const raw = JSON.parse(fix('school-good.json'));
  const p = parseIngestProposal(raw, { expected_kind: 'school_policy' });
  assert.equal(p.wizard, 'school');
  assert.equal(p.kind, 'school_policy');
  for (const pathName of ['calendar.template', 'rollup.preset', 'credit.passing_threshold', 'gpa.mode']) {
    assert.ok(p.fields.some((f) => f.path === pathName), pathName);
  }
  assert.ok(p.fields.every((f) => isAllowedPath('school', f.path)));
});

test('parser: partial syllabus leaves engine unknown', () => {
  const raw = JSON.parse(fix('syllabus-partial.json'));
  const p = parseIngestProposal(raw, { expected_wizard: 'syllabus' });
  const eng = p.fields.find((f) => f.path === 'syllabus.engine');
  assert.ok(eng);
  assert.equal(eng!.status, 'unknown');
  assert.ok(eng!.confidence < 0.5);
  assert.ok(p.ambiguities.length >= 1);
});

test('parser: garbage text yields empty fields + block warning', () => {
  const text = fix('garbage.txt');
  const extracted = extractJsonObject(text);
  const p = parseIngestProposal(extracted ?? text, { expected_kind: 'syllabus', source_id: 'g' });
  assert.equal(p.fields.length, 0);
  assert.ok(p.warnings.some((w) => w.severity === 'block'));
});

// more tests patched below

test('parser: clamps confidence and derives status', () => {
  const p = parseIngestProposal({
    wizard: 'syllabus',
    fields: [
      { path: 'syllabus.title', value: 'X', confidence: 1.5 },
      { path: 'syllabus.floor', value: 50, confidence: -2 },
    ],
  });
  const t = p.fields.find((f) => f.path === 'syllabus.title');
  const fl = p.fields.find((f) => f.path === 'syllabus.floor');
  assert.equal(t?.confidence, 1);
  assert.equal(t?.status, 'proposed');
  assert.equal(fl?.confidence, 0);
  assert.equal(fl?.status, 'unknown');
});

test('merge: user fields win; low confidence flagged; high fills', () => {
  const draft = {
    kind: 'syllabus' as const,
    fields: {
      'syllabus.title': { value: 'Mine', source: 'user' as const, confidence: 1, evidence: null },
      'syllabus.engine': { value: 'total_points', source: 'default' as const, confidence: 0.3, evidence: null },
    },
  };
  const proposal = parseIngestProposal(JSON.parse(fix('syllabus-good.json')));
  proposal.fields.push({
    path: 'syllabus.title',
    value: 'AI Title',
    confidence: 0.99,
    evidence: { quote: 't', page: 1, region: null },
    status: 'proposed',
    source_doc_id: 'x',
  });
  const result = mergeProposalIntoDraft(draft, proposal);
  assert.equal(result.draft.fields['syllabus.title']?.value, 'Mine');
  assert.ok(result.skipped_user.includes('syllabus.title'));
  assert.ok(result.applied.includes('syllabus.categories'));
  assert.ok(result.applied.includes('syllabus.late_rule'));
  assert.equal(result.draft.fields['syllabus.late_rule']?.source, 'ai');
  assert.ok(result.needs_review.includes('syllabus.engine'));
  assert.ok(result.skipped_low.includes('syllabus.within_category'));
});

test('merge: locked path is conflict and keeps value', () => {
  const draft = {
    kind: 'syllabus' as const,
    fields: {
      'syllabus.categories': {
        value: [{ key: 'hw', label: 'HW', weight_percent: 10 }],
        source: 'template' as const,
        confidence: 1,
        evidence: null,
      },
    },
  };
  const locked = lockedPathsFromMap({ categories: true });
  const proposal = parseIngestProposal(JSON.parse(fix('syllabus-good.json')), {
    locked_paths: locked,
  });
  const cat = proposal.fields.find((f) => f.path === 'syllabus.categories');
  assert.equal(cat?.status, 'conflict');
  const result = mergeProposalIntoDraft(draft, proposal, { locked_paths: locked });
  assert.ok(result.conflicts.includes('syllabus.categories'));
  assert.deepEqual(result.draft.fields['syllabus.categories']?.value, [
    { key: 'hw', label: 'HW', weight_percent: 10 },
  ]);
  assert.equal(result.draft.fields['syllabus.categories']?.status, 'conflict');
});

test('path mapping: syllabus good fixture fills wizard draft', () => {
  const proposal = parseIngestProposal(JSON.parse(fix('syllabus-good.json')));
  const draft = createEmptyWizardDraft('class-1');
  const next = applyProposalToSyllabusDraft(draft, proposal);
  assert.equal(next.categories.length, 3);
  assert.equal(next.categories.find((c) => c.key === 'homework')?.rules.drop_lowest_n, 1);
  assert.equal(next.late_rule.type, 'per_day');
  assert.equal(next.late_rule.amount, 10);
  assert.equal(next.engine, 'weighted_percent_inside');
});

test('path mapping: school fixture merges into SetupDraft', () => {
  const proposal = parseIngestProposal(JSON.parse(fix('school-good.json')), {
    expected_kind: 'school_policy',
  });
  const setup = createEmptyDraft('school-1', 'high');
  const { setup: next, result } = mergeIntoSetupDraft(setup, proposal);
  assert.ok(result.applied.includes('calendar.template'));
  assert.equal(next.fields['calendar.template']?.value, 'tx_six_weeks');
  assert.equal(next.fields['calendar.template']?.source, 'ai');
  assert.equal(next.fields['rollup.preset']?.value, '2/7+1/7');
  assert.equal(next.fields['gpa.mode']?.value, 'unweighted_and_weighted');
});

test('acceptField marks source user', () => {
  const d0 = {
    kind: 'syllabus' as const,
    fields: {
      'syllabus.title': {
        value: 'AI',
        source: 'ai' as const,
        confidence: 0.7,
        evidence: 'p.1',
        needs_review: true,
      },
    },
  };
  const d = acceptField(d0, 'syllabus.title', 'Final');
  assert.equal(d.fields['syllabus.title']?.source, 'user');
  assert.equal(d.fields['syllabus.title']?.value, 'Final');
  assert.equal(d.fields['syllabus.title']?.needs_review, false);
});

test('prompts mention allowed path lists', () => {
  const s = buildSyllabusIngestPrompt({ class_id: 'c1' });
  const p = buildSchoolPolicyIngestPrompt({ school_id: 's1' });
  assert.ok(s.includes('syllabus.engine'));
  assert.ok(p.includes('calendar.template'));
  for (const pathName of SYLLABUS_PATHS.slice(0, 3)) {
    assert.ok(s.includes(pathName), pathName);
  }
  for (const pathName of SCHOOL_POLICY_PATHS.slice(0, 3)) {
    assert.ok(p.includes(pathName), pathName);
  }
});
