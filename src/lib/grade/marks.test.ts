import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GRADE_TERMS,
  defaultGradeTermForDate,
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

test('defaultGradeTermForDate maps calendar dates onto the current nine-week quarter', () => {
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

  assert.equal(defaultGradeTermForDate(d(2025, 9, 15)), 'q1'); // mid-Sep
  assert.equal(defaultGradeTermForDate(d(2025, 11, 15)), 'q2'); // mid-Nov
  assert.equal(defaultGradeTermForDate(d(2025, 12, 28)), 'q2'); // Christmas break → still q2
  assert.equal(defaultGradeTermForDate(d(2026, 1, 5)), 'q2'); // before Jan 12 restart
  assert.equal(defaultGradeTermForDate(d(2026, 1, 15)), 'q3'); // second week of January
  assert.equal(defaultGradeTermForDate(d(2026, 4, 10)), 'q4'); // Apr
  assert.equal(defaultGradeTermForDate(d(2026, 7, 4)), 'q4'); // summer → q4 until Aug 14
  assert.equal(defaultGradeTermForDate(d(2026, 8, 14)), 'q4');
  assert.equal(defaultGradeTermForDate(d(2026, 8, 15)), 'q1');
  assert.equal(defaultGradeTermForDate(d(2025, 10, 16)), 'q1');
  assert.equal(defaultGradeTermForDate(d(2025, 10, 17)), 'q2');
  assert.equal(defaultGradeTermForDate(d(2026, 3, 12)), 'q3');
  assert.equal(defaultGradeTermForDate(d(2026, 3, 13)), 'q4');
});
