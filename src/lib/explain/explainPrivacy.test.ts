import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExplainPrompt,
  redactExplainDraft,
} from '../../../supabase/functions/_shared/explainPrivacy.ts';

const E09_STEPS = [
  'Look at the Partner Warm-up sheet for Taylor Kim and Jamie Ortiz.',
  'Taylor calculates 6 times 7 equals 42.',
  'Jamie calculates 8 times 9 equals 72.',
  "Together, they add Taylor's product (42) and Jamie's product (72).",
  '42 plus 72 equals 114.',
];

test('E09 shape: strips surnames and classmate first names; keeps Taylor, warm, partner', () => {
  const draft = redactExplainDraft(
    {
      schema_version: 1,
      capture_id: 'cap-1',
      source: 'freeform',
      steps: E09_STEPS,
      reteach: 'Review multi-digit addition with Taylor Kim and Jamie Ortiz.',
    },
    { studentName: 'Taylor Kim', otherStudentNames: ['Jamie Ortiz'] },
  );

  const blob = [...draft.steps, draft.reteach ?? ''].join('\n');
  assert.doesNotMatch(blob, /\bKim\b/i);
  assert.doesNotMatch(blob, /\bOrtiz\b/i);
  assert.doesNotMatch(blob, /\bJamie\b/i);
  assert.match(blob, /\bTaylor\b/);
  assert.match(blob, /warm/i);
  assert.match(blob, /partner/i);
  assert.match(blob, /a classmate/i);
  assert.equal(draft.capture_id, 'cap-1');
  assert.equal(draft.schema_version, 1);
  assert.equal(draft.source, 'freeform');
  assert.ok(draft.steps.length >= 1);
});

test('empty roster still removes Kim from Taylor Kim', () => {
  const draft = redactExplainDraft(
    {
      schema_version: 1,
      capture_id: 'cap-2',
      source: 'freeform',
      steps: ['Look at the sheet for Taylor Kim.'],
      reteach: 'Coach Taylor Kim on the warm partner steps.',
    },
    { studentName: 'Taylor Kim', otherStudentNames: [] },
  );
  const blob = [...draft.steps, draft.reteach ?? ''].join('\n');
  assert.doesNotMatch(blob, /\bKim\b/i);
  assert.match(blob, /\bTaylor\b/);
  assert.match(blob, /warm/i);
  assert.match(blob, /partner/i);
});

test('subject and topic words survive the guard', () => {
  const steps = [
    'Open the Science Checkpoint page.',
    'Name the states of matter.',
    'Connect science, hypothesis, cell, and energy words on the page.',
  ];
  const reteach = 'Reteach science hypothesis cell energy and states of matter.';
  const draft = redactExplainDraft(
    {
      schema_version: 1,
      capture_id: 'cap-3',
      source: 'freeform',
      steps,
      reteach,
    },
    { studentName: 'Jordan Chen', otherStudentNames: ['Alex Rivera'] },
  );
  assert.deepEqual(draft.steps, steps);
  assert.equal(draft.reteach, reteach);
});

test('reteach is redacted, not only steps', () => {
  const draft = redactExplainDraft(
    {
      schema_version: 1,
      capture_id: 'cap-4',
      source: 'keyed',
      steps: ['Taylor multiplies correctly.'],
      reteach: 'Ask Taylor Kim to check Jamie Ortiz addition.',
    },
    { studentName: 'Taylor Kim', otherStudentNames: ['Jamie Ortiz'] },
  );
  assert.doesNotMatch(draft.reteach ?? '', /\bKim\b/i);
  assert.doesNotMatch(draft.reteach ?? '', /\bJamie\b/i);
  assert.doesNotMatch(draft.reteach ?? '', /\bOrtiz\b/i);
  assert.match(draft.reteach ?? '', /a classmate/i);
  assert.match(draft.reteach ?? '', /\bTaylor\b/);
});

test('instructional Ask Taylor keeps the bound first name; classmate spacing preserved', () => {
  const draft = redactExplainDraft(
    {
      schema_version: 1,
      capture_id: 'cap-4b',
      source: 'freeform',
      steps: [
        'Ask Taylor Kim and Jamie Ortiz.',
        'Jamie calculates 8 times 9 equals 72.',
      ],
      reteach: null,
    },
    { studentName: 'Taylor Kim', otherStudentNames: ['Jamie Ortiz'] },
  );
  assert.match(draft.steps[0] ?? '', /\bTaylor\b/);
  assert.doesNotMatch(draft.steps[0] ?? '', /\bKim\b|\bJamie\b|\bOrtiz\b/i);
  assert.match(draft.steps[1] ?? '', /^a classmate calculates/);
});

test('buildExplainPrompt includes privacy, subject-anchor, and assignment_title', () => {
  const prompt = buildExplainPrompt({
    captureId: 'cap-5',
    studentBound: true,
    studentFirstName: 'Taylor',
    keyed: false,
    assignment_title: 'Science Checkpoint',
    assignment_unit: 'Matter',
    assignment_section: '3.1',
  });
  assert.match(prompt, /first names only/i);
  assert.match(prompt, /surname|family name/i);
  assert.match(prompt, /classmate/i);
  assert.match(prompt, /subject|assignment topic|page heading/i);
  assert.match(prompt, /assignment_title=Science Checkpoint/);
  assert.match(prompt, /assignment_unit=Matter/);
  assert.match(prompt, /assignment_section=3\.1/);
  assert.match(prompt, /student_first_name=Taylor/);
  assert.match(prompt, /schema_version/);
  assert.doesNotMatch(prompt, /Jamie Ortiz|Kim\b/);
});

test('heuristic strips First Last even without studentName', () => {
  const draft = redactExplainDraft(
    {
      schema_version: 1,
      capture_id: 'cap-6',
      source: 'freeform',
      steps: ['Taylor Kim finished early.'],
      reteach: null,
    },
    {},
  );
  assert.doesNotMatch(draft.steps.join(' '), /\bKim\b/);
  assert.match(draft.steps.join(' '), /\bTaylor\b/);
});
