import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GRADE_TERMS,
  gradeTermLabel,
  matchesGradeTermFilter,
  parseGradeTerm,
  weightSummary,
} from './marks.ts';

test('Counts toward is quarters, two semesters, and Year — not This year', () => {
  assert.deepEqual(
    GRADE_TERMS.map((row) => row.key),
    ['q1', 'q2', 'q3', 'q4', 's1', 's2', 'year'],
  );
  assert.equal(
    GRADE_TERMS.some((row) => /this year/i.test(row.label)),
    false,
  );
  assert.equal(gradeTermLabel('s1'), 'Semester 1');
  assert.equal(gradeTermLabel('s2'), 'Semester 2');
  assert.equal(gradeTermLabel('year'), 'Year');
});

test('legacy This year and Semester map onto Year and Semester 1', () => {
  assert.equal(parseGradeTerm('none'), 'year');
  assert.equal(parseGradeTerm(null), 'year');
  assert.equal(parseGradeTerm('semester'), 's1');
  assert.equal(parseGradeTerm('q2'), 'q2');
});

test('grade-book term filter All keeps every row', () => {
  const q1 = { term: 'q1' };
  assert.equal(matchesGradeTermFilter(q1, 'all'), true);
  assert.equal(matchesGradeTermFilter(q1, 'q1'), true);
  assert.equal(matchesGradeTermFilter(q1, 'q2'), false);
  assert.equal(matchesGradeTermFilter({ term: 'none' }, 'year'), true);
  assert.equal(matchesGradeTermFilter({ term: 'semester' }, 's1'), true);
  assert.equal(matchesGradeTermFilter({}, 'year'), true);
});

test('Semester 1 rolls up Q1 and Q2; Semester 2 rolls up Q3 and Q4', () => {
  assert.equal(matchesGradeTermFilter({ term: 'q1' }, 's1'), true);
  assert.equal(matchesGradeTermFilter({ term: 'q2' }, 's1'), true);
  assert.equal(matchesGradeTermFilter({ term: 's1' }, 's1'), true);
  assert.equal(matchesGradeTermFilter({ term: 'q3' }, 's1'), false);
  assert.equal(matchesGradeTermFilter({ term: 's2' }, 's1'), false);
  assert.equal(matchesGradeTermFilter({ term: 'year' }, 's1'), false);

  assert.equal(matchesGradeTermFilter({ term: 'q3' }, 's2'), true);
  assert.equal(matchesGradeTermFilter({ term: 'q4' }, 's2'), true);
  assert.equal(matchesGradeTermFilter({ term: 's2' }, 's2'), true);
  assert.equal(matchesGradeTermFilter({ term: 'q1' }, 's2'), false);
  assert.equal(matchesGradeTermFilter({ term: 's1' }, 's2'), false);
});

test('Year rolls up both semesters plus year-only work', () => {
  for (const term of ['q1', 'q2', 'q3', 'q4', 's1', 's2', 'year']) {
    assert.equal(matchesGradeTermFilter({ term }, 'year'), true, term);
  }
  assert.equal(matchesGradeTermFilter({ term: 'q1' }, 'q1'), true);
  assert.equal(matchesGradeTermFilter({ term: 's1' }, 'q1'), false);
  assert.equal(matchesGradeTermFilter({ term: 'year' }, 'q2'), false);
  assert.equal(matchesGradeTermFilter({ term: 'year' }, 's1'), false);
});

test('weight summary skips Year and names Semester 1', () => {
  assert.equal(weightSummary({ weight_band: 'major', term: 'year' }), 'Major');
  assert.equal(weightSummary({ weight_band: 'major', term: 's1' }), 'Major · Semester 1');
  assert.equal(weightSummary({ weight_band: 'none', term: 'none' }), '');
});
