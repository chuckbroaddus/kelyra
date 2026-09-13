import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultCalendarPublished } from './visibility.ts';

test('default hide quiz/test/midterm/final', () => {
  for (const c of ['quiz', 'test', 'midterm', 'final', 'Quiz']) {
    assert.equal(defaultCalendarPublished(c), false);
  }
});

test('default publish homework/practice/lesson', () => {
  for (const c of ['homework', 'practice', 'lesson', '']) {
    assert.equal(defaultCalendarPublished(c), true);
  }
});
