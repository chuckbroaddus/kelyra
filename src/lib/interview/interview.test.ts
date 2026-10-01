import assert from 'node:assert/strict';
import test from 'node:test';

import {
  beginInterview,
  buildProgress,
  createSession,
  heuristicExtract,
  nextQuestion,
  parseExtractionResponse,
  processTurn,
} from './index.ts';

test('fixture model output fills three slots from mixed answer', () => {
  const fixture = {
    turn_kind: 'slot_answer',
    slots: [
      { path: 'calendar.template', value: 'tx_six_weeks', confidence: 0.95, evidence: 'six-weeks' },
      { path: 'scale.default_id', value: 'texas_no_d', confidence: 0.9, evidence: '70 is passing' },
      { path: 'scale.passing_pct', value: 70, confidence: 0.92, evidence: '70 is passing' },
      { path: 'gpa.mode', value: 'unweighted_and_weighted', confidence: 0.85, evidence: 'AP is 5.0' },
      { path: 'levels.ap_points', value: 5.0, confidence: 0.9, evidence: 'AP is 5.0' },
      { path: 'gpa.weighted_bonus', value: 'numeric_5', confidence: 0.85, evidence: 'AP is 5.0' },
    ],
    restate: 'Six-weeks calendar, 70 passing, AP A at 5.0 weighted.',
  };
  const parsed = parseExtractionResponse(fixture, 'school');
  assert.equal(parsed.slots.length >= 3, true);
  assert.ok(parsed.slots.some((s) => s.path === 'calendar.template' && s.value === 'tx_six_weeks'));
  assert.ok(parsed.slots.some((s) => s.path === 'scale.passing_pct' && s.value === 70));
  assert.ok(parsed.slots.some((s) => s.path === 'levels.ap_points' && s.value === 5));

  let session = createSession({ wizard: 'school', school_id: 'sch-1' });
  session = beginInterview(session).session;
  // level first — chip High so credit/gpa stay relevant
  let ext = heuristicExtract(session, 'High', 'high');
  let out = processTurn(session, 'High', ext, { chipId: 'high' });
  session = out.session;
  out = processTurn(session, 'six-weeks, 70 is passing, AP is 5.0', parsed);
  session = out.session;

  assert.equal(session.filled['calendar.template']?.value, 'tx_six_weeks');
  assert.equal(session.filled['scale.passing_pct']?.value, 70);
  assert.equal(session.filled['levels.ap_points']?.value, 5);
  // skip scale question — next should not be S-Q6
  const nq = nextQuestion(session);
  assert.notEqual(nq.node?.id, 'S-Q6');
  assert.notEqual(nq.node?.id, 'S-Q2');
  // credit or rollup or exam
  assert.ok(nq.node && ['S-Q2b', 'S-Q3', 'S-Q4', 'S-Q5', 'S-Q7', 'S-Q8', 'S-Q9', 'S-Q10'].includes(nq.node.id));
});

test('heuristic extract on example phrase fills three families', () => {
  const session = createSession({ wizard: 'school', school_id: 's' });
  const ext = heuristicExtract(session, 'six-weeks, 70 is passing, AP is 5.0');
  assert.ok(ext.slots.some((s) => s.path === 'calendar.template'));
  assert.ok(ext.slots.some((s) => s.path === 'scale.passing_pct'));
  assert.ok(ext.slots.some((s) => s.path === 'levels.ap_points'));
});

test('skip logic: filled calendar skips S-Q2', () => {
  let session = createSession({ wizard: 'school', school_id: 's' });
  session = beginInterview(session).session;
  let out = processTurn(session, 'High', heuristicExtract(session, 'High', 'high'), { chipId: 'high' });
  session = out.session;
  out = processTurn(
    session,
    'six weeks',
    heuristicExtract(session, 'six weeks'),
  );
  session = out.session;
  assert.equal(session.filled['calendar.template']?.value, 'tx_six_weeks');
  const nq = nextQuestion(session);
  assert.notEqual(nq.node?.id, 'S-Q2');
});

test('side question keeps pending place', () => {
  let session = createSession({ wizard: 'syllabus', class_id: 'c1' });
  session = beginInterview(session).session;
  assert.equal(session.pending_node, 'T-Q1');
  const before = session.pending_node;
  const filledBefore = { ...session.filled };
  const out = processTurn(session, 'What if I choose total points?', {
    turn_kind: 'side_question',
    slots: [],
    side_topic_key: 'help.engine.points',
  });
  assert.equal(out.session.pending_node, before);
  assert.deepEqual(out.session.filled, filledBefore);
  assert.match(out.assistant_text, /Still on:|100-point|points/i);
  assert.ok(out.chips.length >= 2);
});

test('progress math labels current section', () => {
  const session = createSession({ wizard: 'school', school_id: 's' });
  const nq = nextQuestion(session);
  assert.equal(nq.progress.current_section, 'level');
  assert.match(nq.progress.label, /School level/);
  const prog = buildProgress('school', nq.node, session.filled, session.draft);
  assert.equal(prog.sections[0]?.state, 'current');
  assert.ok(prog.sections.length >= 5);
});

test('total points hides category questions', () => {
  let session = createSession({ wizard: 'syllabus', class_id: 'c1' });
  session = beginInterview(session).session;
  const out = processTurn(session, 'Total points', heuristicExtract(session, 'Total points', 'points'), {
    chipId: 'points',
  });
  session = out.session;
  const nq = nextQuestion(session);
  assert.notEqual(nq.node?.id, 'T-Q2');
  assert.notEqual(nq.node?.id, 'T-Q3');
});
