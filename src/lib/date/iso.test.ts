import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  cancelDateDraft,
  changeDateDraft,
  clearDateDraft,
  commitDateDraft,
  emptyDraft,
  openDateDraft,
} from './draft.ts';
import { claimDateHost, releaseDateHost, resetDateHost, activeDateHostId } from './host.ts';
import {
  addDaysISO,
  birthdayBounds,
  birthdayForSave,
  birthdayUnchanged,
  buildMonthGrid,
  coerceBirthdayISO,
  formatBirthdayMd,
  formatLocaleDate,
  parseLooseDate,
  rangeError,
  smartDefaultISO,
  toISODate,
  todayISO,
} from './iso.ts';

test('toISODate stores local YYYY-MM-DD without time', () => {
  const date = new Date(2017, 2, 14, 23, 45, 0);
  assert.equal(toISODate(date), '2017-03-14');
});

test('formatBirthdayMd strips year for parent read', () => {
  const md = formatBirthdayMd('2017-03-14', 'en-US');
  assert.ok(md);
  assert.match(md!, /Mar/);
  assert.match(md!, /14/);
  assert.doesNotMatch(md!, /2017/);
});

test('coerceBirthdayISO normalizes loose classifier values; birthdayForSave never silent-deletes', () => {
  const now = new Date(2026, 8, 10);
  assert.equal(coerceBirthdayISO('2017-03-14'), '2017-03-14');
  assert.equal(coerceBirthdayISO('Mar 14 2017'), '2017-03-14');
  assert.equal(coerceBirthdayISO('3/14/2017'), '2017-03-14');
  assert.equal(coerceBirthdayISO(''), null);
  assert.equal(coerceBirthdayISO('not a date'), null);

  assert.deepEqual(birthdayForSave('', now), { ok: true, value: null });
  assert.deepEqual(birthdayForSave('Mar 14 2017', now), { ok: true, value: '2017-03-14' });
  assert.deepEqual(birthdayForSave('2017-03-14', now), { ok: true, value: '2017-03-14' });
  const bad = birthdayForSave('sometime in spring', now);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /valid birthday/i);
});

test('birthdayForSave rejects out-of-range after coerce; in-range loose still ok', () => {
  const now = new Date(2026, 8, 10);
  const { min } = birthdayBounds(now);
  const tooOldLoose = birthdayForSave('Mar 14 1990', now);
  assert.equal(tooOldLoose.ok, false);
  if (!tooOldLoose.ok) {
    assert.match(tooOldLoose.error, /on or after/i);
    assert.equal(tooOldLoose.error, rangeError('1990-03-14', min, birthdayBounds(now).max));
  }
  const tooOldIso = birthdayForSave('1990-03-14', now);
  assert.equal(tooOldIso.ok, false);
  const inRange = birthdayForSave('3/14/2017', now);
  assert.deepEqual(inRange, { ok: true, value: '2017-03-14' });
});

test('birthdayForSave rejects too-young (today−1y / after max); no silent clamp', () => {
  const now = new Date(2026, 8, 10);
  const { min, max } = birthdayBounds(now);
  const tooYoung = birthdayForSave('2025-09-10', now);
  assert.equal(tooYoung.ok, false);
  if (!tooYoung.ok) {
    assert.match(tooYoung.error, /on or before/i);
    assert.equal(tooYoung.error, rangeError('2025-09-10', min, max));
  }
  const afterMax = birthdayForSave(addDaysISO(max, 1)!, now);
  assert.equal(afterMax.ok, false);
  if (!afterMax.ok) assert.match(afterMax.error, /on or before/i);
});

test('parseLooseDate accepts ISO, US numeric, and month name', () => {
  assert.equal(parseLooseDate('2017-03-14'), '2017-03-14');
  assert.equal(parseLooseDate('3/14/2017', 'en-US'), '2017-03-14');
  assert.equal(parseLooseDate('Mar 14 2017'), '2017-03-14');
  assert.equal(parseLooseDate('14 Mar 2017'), '2017-03-14');
  assert.equal(parseLooseDate('not a date'), null);
});

test('birthday bounds are today−22y … today−3y; out-of-range errors without clamp', () => {
  const now = new Date(2026, 8, 10);
  const { min, max } = birthdayBounds(now);
  assert.equal(min, '2004-09-10');
  assert.equal(max, '2023-09-10');
  assert.equal(rangeError('2000-01-01', min, max), `Pick a date on or after ${formatLocaleDate(min)}`);
  assert.equal(rangeError('2025-01-01', min, max), `Pick a date on or before ${formatLocaleDate(max)}`);
  assert.equal(rangeError('2016-05-01', min, max), null);
  // Caller must not write bad ISO — helper only reports error.
  assert.notEqual(rangeError('1999-01-01', min, max), null);
});

test('due smart default is tomorrow; chips write the same ISO helpers', () => {
  const now = new Date(2026, 8, 10);
  const tomorrow = smartDefaultISO('due', now);
  assert.equal(tomorrow, '2026-09-11');
  assert.equal(addDaysISO(todayISO(now), 1), tomorrow);
  assert.equal(addDaysISO(todayISO(now), 7), '2026-09-17');
});

test('Cancel restores prior committed; Clear writes null', () => {
  let state = emptyDraft('2017-03-14');
  state = openDateDraft(state, '2016-09-10');
  assert.equal(state.draft, '2017-03-14');
  state = changeDateDraft(state, '2018-01-01');
  assert.equal(state.committed, '2017-03-14');
  state = cancelDateDraft(state);
  assert.equal(state.open, false);
  assert.equal(state.committed, '2017-03-14');
  assert.equal(state.draft, '2017-03-14');

  state = openDateDraft(state, '2016-09-10');
  state = changeDateDraft(state, '2015-06-01');
  state = commitDateDraft(state);
  assert.equal(state.committed, '2015-06-01');

  state = clearDateDraft(state);
  assert.equal(state.committed, null);
  assert.equal(state.draft, null);
  assert.equal(state.open, false);
});

test('empty open uses smart default in draft only until commit', () => {
  let state = emptyDraft(null);
  state = openDateDraft(state, '2016-09-10');
  assert.equal(state.committed, null);
  assert.equal(state.draft, '2016-09-10');
  state = cancelDateDraft(state);
  assert.equal(state.committed, null);
});

test('single modal host: opening B closes A', () => {
  resetDateHost();
  const closed: string[] = [];
  claimDateHost('a', () => closed.push('a'));
  assert.equal(activeDateHostId(), 'a');
  claimDateHost('b', () => closed.push('b'));
  assert.deepEqual(closed, ['a']);
  assert.equal(activeDateHostId(), 'b');
  releaseDateHost('b');
  assert.equal(activeDateHostId(), null);
  resetDateHost();
});

test('formatLocaleDate never returns raw ISO as primary display', () => {
  const shown = formatLocaleDate('2017-03-14', 'en-US');
  assert.ok(shown);
  assert.notEqual(shown, '2017-03-14');
  assert.match(shown!, /2017/);
  assert.match(shown!, /14/);
});

test('month grid weekStartsOn Sunday puts Sunday first', () => {
  // 2026-09-01 is Tuesday; with Sunday start, pad = 2.
  const grid = buildMonthGrid(2026, 8, 0);
  assert.equal(grid[0]![0], null);
  assert.equal(grid[0]![1], null);
  assert.equal(grid[0]![2]?.day, 1);
  assert.equal(grid[0]![2]?.iso, '2026-09-01');
});

test('birthdayUnchanged treats matching raw/ISO as unchanged for name-only save', () => {
  assert.equal(birthdayUnchanged('2017-03-14', '2017-03-14'), true);
  assert.equal(birthdayUnchanged('Mar 14 2017', '2017-03-14'), true);
  assert.equal(birthdayUnchanged('', ''), true);
  assert.equal(birthdayUnchanged('', null), true);
  assert.equal(birthdayUnchanged('', '2017-03-14'), false);
  assert.equal(birthdayUnchanged('2018-01-01', '2017-03-14'), false);
});

test('Ask update_student routes birthday through birthdayForSave before patch', () => {
  const ask = readFileSync(resolve('src/lib/ai/askTools.ts'), 'utf8');
  const toolStart = ask.indexOf('update_student: {');
  const toolEnd = ask.indexOf('create_class:', toolStart);
  assert.ok(toolStart > 0 && toolEnd > toolStart);
  const tool = ask.slice(toolStart, toolEnd);
  assert.match(tool, /birthdayForSave/);
  const guard = tool.indexOf('birthdayForSave(');
  const patch = tool.indexOf("patchStudentMetadata(next, key, result.value)");
  assert.ok(guard > 0 && patch > guard, 'birthdayForSave must guard before patchStudentMetadata');
  assert.match(tool, /if \(!result\.ok\) return \{ error: result\.error \}/);
});
