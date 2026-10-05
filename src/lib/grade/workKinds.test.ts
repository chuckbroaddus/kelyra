import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checklistPercent,
  formatScoreMark,
  numericScoreForAverage,
  parseScoreInput,
  SCORE_SCHEMES,
} from './marks.ts';
import {
  WORK_KINDS,
  christianWorkKindPresets,
  defaultIncludeInAverageForWorkKind,
  defaultScoreSchemeForWorkKind,
  mapWorkKindToSyllabusCategory,
  parseSpokenWorkKind,
  parseWorkKind,
  seedSyllabusCategoriesFromWorkKinds,
  workKindLabel,
} from './workKinds.ts';

test('work kinds include Christian presets and process kinds', () => {
  const keys = WORK_KINDS.map((row) => row.key);
  assert.ok(keys.includes('memory_verse'));
  assert.ok(keys.includes('bible_quiz'));
  assert.ok(keys.includes('pop_quiz'));
  assert.ok(keys.includes('participation'));
  assert.ok(keys.includes('behavior'));
  assert.ok(keys.includes('effort'));
  assert.equal(christianWorkKindPresets().length, 2);
  assert.equal(workKindLabel('memory_verse'), 'Memory verse');
});

test('process kinds default average off; academic on', () => {
  assert.equal(defaultIncludeInAverageForWorkKind('participation'), false);
  assert.equal(defaultIncludeInAverageForWorkKind('behavior'), false);
  assert.equal(defaultIncludeInAverageForWorkKind('effort'), false);
  assert.equal(defaultIncludeInAverageForWorkKind('homework'), true);
  assert.equal(defaultScoreSchemeForWorkKind('behavior'), 'esnu');
  assert.equal(defaultScoreSchemeForWorkKind('memory_verse'), 'complete_incomplete');
});

test('map work kind onto syllabus category', () => {
  const cats = [
    { key: 'daily', label: 'Daily work', active: true },
    { key: 'quizzes', label: 'Quizzes', active: true },
    { key: 'tests', label: 'Tests', active: true },
  ];
  assert.equal(mapWorkKindToSyllabusCategory('quiz', cats), 'quizzes');
  assert.equal(mapWorkKindToSyllabusCategory('pop_quiz', cats), 'quizzes');
  assert.equal(mapWorkKindToSyllabusCategory('test', cats), 'tests');
  assert.equal(mapWorkKindToSyllabusCategory('homework', cats), 'daily');
});

test('spoken work kind parser', () => {
  assert.equal(parseSpokenWorkKind('memory verse for Friday'), 'memory_verse');
  assert.equal(parseSpokenWorkKind('pop quiz chapter 3'), 'pop_quiz');
  assert.equal(parseSpokenWorkKind('Bible quiz'), 'bible_quiz');
  assert.equal(parseWorkKind('midterm'), 'exam');
  assert.equal(parseWorkKind('memorization'), 'memory_verse');
});

test('score schemes include complete, esnu, checklist', () => {
  const keys = SCORE_SCHEMES.map((row) => row.key);
  assert.ok(keys.includes('complete_incomplete'));
  assert.ok(keys.includes('esnu'));
  assert.ok(keys.includes('checklist'));
});

test('numericScoreForAverage maps complete/ESNU; pass/fail stay out', () => {
  assert.equal(numericScoreForAverage('pass', null), null);
  assert.equal(numericScoreForAverage('fail', null), null);
  assert.equal(numericScoreForAverage('complete', null), 100);
  assert.equal(numericScoreForAverage('incomplete', null), 0);
  assert.equal(numericScoreForAverage('E', null), 100);
  assert.equal(numericScoreForAverage('S', null), 85);
  assert.equal(numericScoreForAverage('N', null), 70);
  assert.equal(numericScoreForAverage('U', null), 50);
  assert.equal(numericScoreForAverage('checklist', 80), 80);
  assert.equal(numericScoreForAverage('numeric', 92), 92);
});

test('formatScoreMark labels non-numeric marks', () => {
  assert.equal(formatScoreMark('complete', null), 'Complete');
  assert.equal(formatScoreMark('incomplete', null), 'Incomplete');
  assert.equal(formatScoreMark('E', null), 'E');
  assert.equal(formatScoreMark('checklist', 75), '75% skills');
});

test('parseScoreInput accepts complete and ESNU', () => {
  assert.equal(parseScoreInput('complete').mark, 'complete');
  assert.equal(parseScoreInput('inc').mark, 'incomplete');
  assert.equal(parseScoreInput('E').mark, 'E');
  assert.equal(parseScoreInput('satisfactory').mark, 'S');
});

test('checklistPercent averages met skills', () => {
  const skills = [
    { id: 'a', label: 'Count' },
    { id: 'b', label: 'Write' },
    { id: 'c', label: 'Share' },
  ];
  assert.equal(
    checklistPercent(skills, { a: 'met', b: 'not_met', c: 'E' }),
    Math.round((2 / 3) * 1000) / 10,
  );
  assert.equal(checklistPercent(skills, {}), null);
});

test('seed categories collapse shared buckets', () => {
  const seeds = seedSyllabusCategoriesFromWorkKinds();
  assert.ok(seeds.some((s) => s.key === 'memory_verse'));
  assert.ok(seeds.some((s) => s.key === 'quiz' && s.suggested_work_kinds.includes('pop_quiz')));
  const participation = seeds.find((s) => s.key === 'participation');
  assert.equal(participation?.default_include_in_average, false);
});
