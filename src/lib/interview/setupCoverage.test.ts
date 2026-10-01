/**
 * Coverage guard for the guided “Answer a few questions” setup flow.
 * Fails when a required/optional gradebook setup field has no question,
 * when a chip writes a non-canonical value, or when “not sure” dead-ends.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { SCHOOL_POLICY_PATHS, SYLLABUS_PATHS } from '../ingest/allowedPaths.ts';
import { createEmptyWizardDraft, toEditorInput } from '../../components/syllabus/wizardModel.ts';
import {
  applyInterviewToSyllabusDraft,
  beginInterview,
  chipsOf,
  createSession,
  heuristicExtract,
  legalPaths,
  mergeExtractions,
  normalizeSlot,
  parseExtractionResponse,
  nextQuestion,
  nodesFor,
  parseCategories,
  parseDrops,
  parseExam,
  parseExtraCredit,
  parseLateRule,
  parseMissing,
  parseRetake,
  parseYearDates,
  processTurn,
  reviewNodeId,
  setupFieldsFor,
  type InterviewSession,
  type InterviewWizard,
} from './index.ts';

function questionPaths(wizard: InterviewWizard): Set<string> {
  const out = new Set<string>();
  for (const n of nodesFor(wizard)) {
    n.paths.forEach((p) => out.add(p));
    n.chips.forEach((c) => c.slots?.forEach((s) => out.add(s.path)));
  }
  return out;
}

for (const wizard of ['syllabus', 'school'] as const) {
  test(`${wizard}: every ingest setup path is registered in the coverage registry`, () => {
    const ingest = wizard === 'school' ? SCHOOL_POLICY_PATHS : SYLLABUS_PATHS;
    const reg = new Set(setupFieldsFor(wizard).map((f) => f.path));
    const missing = ingest.filter((p) => !reg.has(p));
    assert.deepEqual(missing, [], `add these to ${wizard.toUpperCase()}_SETUP_FIELDS: ${missing.join(', ')}`);
  });

  test(`${wizard}: every required and optional setup field has a question`, () => {
    const qp = questionPaths(wizard);
    const gaps: string[] = [];
    for (const f of setupFieldsFor(wizard)) {
      if (f.requirement === 'not_applicable') continue;
      assert.ok(f.interview_paths.length > 0, `${f.path} has no interview_paths`);
      for (const ip of f.interview_paths) if (!qp.has(ip)) gaps.push(`${f.path} ← ${ip}`);
    }
    assert.deepEqual(gaps, [], `no question fills: ${gaps.join('; ')}`);
  });

  test(`${wizard}: every question path and chip slot is a legal extraction path`, () => {
    const legal = new Set(legalPaths(wizard));
    for (const p of questionPaths(wizard)) assert.ok(legal.has(p), `${p} not in legalPaths(${wizard})`);
  });

  test(`${wizard}: every non-review question offers “not sure”, and not-sure fills all its paths`, () => {
    let session = beginInterview(createSession({ wizard, class_id: 'c1', school_id: 's1' })).session;
    const seen = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      const nq = nextQuestion(session);
      if (nq.done) break;
      const node = nq.node!;
      assert.ok(!seen.has(node.id), `${node.id} asked twice after not-sure (dead loop)`);
      seen.add(node.id);
      const chips = chipsOf(node, { wizard, filled: session.filled, draft: session.draft });
      if (node.id !== 'S-Q1') assert.ok(chips.some((c) => c.action === 'not_sure'), `${node.id} lacks a not-sure chip`);
      const chip = chips.find((c) => c.action === 'not_sure') ?? chips[0]!;
      const out = processTurn(session, chip.label, heuristicExtract(session, '', chip.id), { chipId: chip.id });
      session = out.session;
      for (const p of node.paths) assert.ok(p in session.filled, `${node.id} not-sure left ${p} empty`);
    }
    assert.equal(nextQuestion(session).node?.id, reviewNodeId(wizard));
    assert.equal(session.status, 'confirm');
  });
}

test('syllabus: every chip writes values the saved syllabus accepts', () => {
  const engines = ['total_points', 'weighted_points_inside', 'weighted_percent_inside', 'item_weights', 'none'];
  for (const node of nodesFor('syllabus')) {
    const base = createSession({ wizard: 'syllabus', class_id: 'c1' });
    const chips = chipsOf(node, { wizard: 'syllabus', filled: base.filled, draft: base.draft });
    for (const chip of chips) {
      if (!chip.slots?.length) continue;
      let s: InterviewSession = { ...base, pending_node: node.id };
      s = processTurn(s, chip.label, heuristicExtract(s, '', chip.id), { chipId: chip.id }).session;
      const saved = toEditorInput(applyInterviewToSyllabusDraft(createEmptyWizardDraft('c1'), s));
      assert.ok(engines.includes(saved.engine), `${node.id}/${chip.id} engine ${saved.engine}`);
      assert.ok(['none', 'flat', 'per_day', 'per_hour'].includes(saved.late_rule.type), `${node.id}/${chip.id} late ${JSON.stringify(saved.late_rule)}`);
      assert.ok(['zero', 'floor', 'omit'].includes(saved.missing_rule));
      assert.ok(['A', 'B', 'C'].includes(saved.extra_credit_method), `${node.id}/${chip.id} ec ${saved.extra_credit_method}`);
      assert.ok(saved.retake === null || ['replace', 'higher_of', 'average'].includes(saved.retake.method));
      assert.ok(['reset_each_marking_period', 'rolling_year'].includes(saved.book_mode));
    }
  }
});

test('parse: categories from free text', () => {
  assert.deepEqual(parseCategories('Tests 50, Quizzes 30, Homework 20')?.map((c) => [c.key, c.weight_percent]), [
    ['tests', 50],
    ['quizzes', 30],
    ['homework', 20],
  ]);
  assert.deepEqual(parseCategories('60% major grades, 40% daily work')?.map((c) => [c.label, c.weight_percent]), [
    ['Major grades', 60],
    ['Daily work', 40],
  ]);
  assert.deepEqual(parseCategories('Labs: 25, Projects - 25 and Exams 50')?.map((c) => c.weight_percent), [25, 25, 50]);
});

test('parse: late rules map to engine LateRule', () => {
  assert.deepEqual(parseLateRule('10% a day, no lower than 50'), { type: 'per_day', amount: 10, unit: 'percent', floor_pct: 50 });
  assert.deepEqual(parseLateRule('5 points per day'), { type: 'per_day', amount: 5, unit: 'points' });
  assert.deepEqual(parseLateRule('late work loses 20%'), { type: 'flat', amount: 20, unit: 'percent' });
  assert.deepEqual(parseLateRule('not accepted late'), { type: 'none', hard_deadline_days: 0 });
  assert.deepEqual(parseLateRule('10% off per day, accepted up to 3 days'), { type: 'per_day', amount: 10, unit: 'percent', hard_deadline_days: 3 });
  assert.deepEqual(parseLateRule('no penalty'), { type: 'none' });
  assert.equal(parseLateRule('hello'), null);
});

test('parse: missing, extra credit, retake, drops, exam, dates', () => {
  assert.deepEqual(parseMissing('missing counts as 50'), { missing_rule: 'floor', floor: 50 });
  assert.deepEqual(parseMissing('zero'), { missing_rule: 'zero' });
  assert.deepEqual(parseMissing("it doesn't count"), { missing_rule: 'omit' });
  assert.deepEqual(parseExtraCredit('no extra credit'), { extra_credit_method: 'A', extra_credit_allowed: false, ec_cap: null });
  assert.deepEqual(parseExtraCredit('bonus points capped at 5%'), { extra_credit_method: 'B', extra_credit_allowed: true, ec_cap: 5 });
  assert.deepEqual(parseExtraCredit("average can't go over 100"), { ceiling: 100 });
  const cats = [
    { key: 'tests', label: 'Tests' },
    { key: 'quizzes', label: 'Quizzes' },
  ];
  assert.deepEqual(parseRetake('tests only, keep the higher score, max 70, within 5 days', cats), {
    retake: { eligible_category_ids: ['tests'], attempts: 1, method: 'higher_of', cap: 70, window_days: 5 },
  });
  assert.deepEqual(parseRetake('no retakes'), { retake: null });
  assert.deepEqual(parseDrops('drop the lowest quiz', cats), { quizzes: 1 });
  assert.deepEqual(parseDrops('drop 2 in every category', cats), { tests: 2, quizzes: 2 });
  assert.deepEqual(parseDrops('no drops', cats), {});
  assert.deepEqual(parseExam('exam counts 20%'), { exam_weight: 20, rollup_preset: '40/40/20' });
  assert.deepEqual(parseExam('no final exam'), { exam_weight: null, rollup_preset: '50/50' });
  assert.deepEqual(parseYearDates('Aug 13 to May 28', new Date('2026-07-01T12:00:00Z')), { year_start: '2026-08-13', year_end: '2027-05-28' });
});

test('LLM merge: contradictions reconciled, pending parser wins, not-sure survives odd turn kinds', () => {
  let s = beginInterview(createSession({ wizard: 'syllabus', class_id: 'c1' })).session;
  const contradict = parseExtractionResponse(
    { turn_kind: 'slot_answer', slots: [{ path: 'engine', value: 'weighted_points_inside' }, { path: 'within_category', value: 'percent_inside' }] },
    'syllabus',
  );
  const m1 = mergeExtractions(s, 'weighted, each assignment counts the same', contradict);
  assert.equal(m1.slots.find((x) => x.path === 'engine')?.value, 'weighted_percent_inside');
  // Model says “points inside” for a plain “each assignment counts the same” answer: the pending parser wins on the coupled path.
  const flipped = parseExtractionResponse(
    { turn_kind: 'slot_answer', slots: [{ path: 'engine', value: 'weighted_points_inside' }, { path: 'within_category', value: 'points_inside' }] },
    'syllabus',
  );
  const m1b = mergeExtractions(s, 'Weighted categories, each assignment counts the same inside a category', flipped);
  assert.equal(m1b.slots.find((x) => x.path === 'engine')?.value, 'weighted_percent_inside');
  assert.equal(m1b.slots.find((x) => x.path === 'within_category')?.value, 'percent_inside');
  s = { ...s, pending_node: 'T-Q7' };
  const ecNull = parseExtractionResponse(
    { turn_kind: 'slot_answer', slots: [{ path: 'extra_credit_allowed', value: false }, { path: 'extra_credit_method', value: null }] },
    'syllabus',
  );
  const m2 = mergeExtractions(s, 'no extra credit', ecNull);
  assert.equal(m2.slots.find((x) => x.path === 'extra_credit_method')?.value, 'A');
  s = { ...s, pending_node: 'T-Q5' };
  const m3 = mergeExtractions(s, 'missing counts as 50', parseExtractionResponse({ slots: [{ path: 'missing_rule', value: 'floor' }] }, 'syllabus'));
  assert.equal(m3.slots.find((x) => x.path === 'floor')?.value, 50);
  s = { ...s, pending_node: 'T-Q4' };
  const out = processTurn(s, 'no idea honestly', { turn_kind: 'navigation', slots: [], navigation: null });
  assert.ok('drop_lowest' in out.session.filled);
  // Model calls gibberish a “side question”: still counts as a miss, so two misses default + advance.
  s = { ...s, pending_node: 'T-Q5' };
  const side = parseExtractionResponse({ turn_kind: 'side_question', slots: [] }, 'syllabus');
  assert.equal(mergeExtractions(s, 'purple monkey', side).turn_kind, 'slot_answer');
  assert.equal(mergeExtractions(s, 'what if I use 0 instead?', side).turn_kind, 'side_question');
  const t1 = processTurn(s, 'purple monkey', mergeExtractions(s, 'purple monkey', side)).session;
  const t2 = processTurn(t1, 'banana', mergeExtractions(t1, 'banana', side)).session;
  assert.ok('missing_rule' in t2.filled);
  assert.notEqual(t2.pending_node, 'T-Q5');
});

test('normalizeSlot maps legacy / model shapes onto canonical draft values', () => {
  assert.deepEqual(normalizeSlot('late_rule', { type: 'flat_percent', percent: 10 })?.value, { type: 'flat', unit: 'percent', amount: 10 });
  assert.deepEqual(normalizeSlot('late_rule', '10% per day')?.value, { type: 'per_day', amount: 10, unit: 'percent' });
  assert.equal(normalizeSlot('missing_rule', 'floor_50')?.value, 'floor');
  assert.equal(normalizeSlot('extra_credit_method', 'b')?.value, 'B');
  assert.equal(normalizeSlot('floor', '55')?.value, 55);
});
