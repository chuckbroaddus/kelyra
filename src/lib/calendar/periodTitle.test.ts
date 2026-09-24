import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MORPH_DAY_INSERT_END,
  periodTitleMarqueeMs,
  periodTitleNeedsMarquee,
  dayPeriodTitleSegments,
  formatDayPeriodTitle,
  formatMonthYearTitle,
  formatMorphTitleAtProgress,
  joinDayPeriodTitle,
  joinMonthYearTitle,
  morphDayInsertProgress,
  morphWeekdayLetterCount,
} from './periodTitle.ts';
import { monthContaining } from './month.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('formatMonthYearTitle → long month + year (matches Month label)', () => {
  assert.equal(formatMonthYearTitle(2026, 1, 'en-US'), 'February 2026');
  assert.equal(formatMonthYearTitle(2026, 8, 'en-US'), 'September 2026');
  assert.equal(formatMonthYearTitle(2026, 12, 'en-US'), '');
  // Same string Month/Week already show via monthContaining (default locale).
  assert.equal(formatMonthYearTitle(2026, 1), monthContaining('2026-02-04').label);
});

test('formatDayPeriodTitle → "February 4, 2026, Wednesday"', () => {
  assert.equal(formatDayPeriodTitle('2026-02-04', 'en-US'), 'February 4, 2026, Wednesday');
  assert.equal(formatDayPeriodTitle('2026-09-24', 'en-US'), 'September 24, 2026, Thursday');
  assert.equal(formatDayPeriodTitle('bogus', 'en-US'), 'bogus');
});

test('dayPeriodTitleSegments → { month, dayPart, year, weekday }', () => {
  const seg = dayPeriodTitleSegments('2026-02-04', 'en-US');
  assert.deepEqual(seg, { month: 'February', dayPart: '4,', year: '2026', weekday: 'Wednesday' });
  assert.equal(joinMonthYearTitle(seg!), 'February 2026');
  assert.equal(joinDayPeriodTitle(seg!), 'February 4, 2026, Wednesday');
  assert.equal(dayPeriodTitleSegments('2026-13-01'), null);
});

test('morph: day insert first, then weekday letter-by-letter', () => {
  assert.equal(morphDayInsertProgress(0), 0);
  assert.equal(morphDayInsertProgress(MORPH_DAY_INSERT_END / 2), 0.5);
  assert.equal(morphDayInsertProgress(MORPH_DAY_INSERT_END), 1);
  assert.equal(morphDayInsertProgress(1), 1);

  const len = 'Wednesday'.length;
  assert.equal(morphWeekdayLetterCount(0, len), 0);
  assert.equal(morphWeekdayLetterCount(MORPH_DAY_INSERT_END, len), 0);
  assert.equal(morphWeekdayLetterCount(MORPH_DAY_INSERT_END + 0.001, len), 1);
  assert.equal(morphWeekdayLetterCount(1, len), len);
  // Monotonic, one letter at a time.
  let prev = 0;
  for (let i = 0; i <= 100; i += 1) {
    const n = morphWeekdayLetterCount(i / 100, len);
    assert.ok(n >= prev && n - prev <= 1, `letters jumped at ${i}`);
    prev = n;
  }
});

test('formatMorphTitleAtProgress: month word fixed; year after inserted day; weekday rolls', () => {
  const seg = dayPeriodTitleSegments('2026-02-04', 'en-US')!;
  assert.equal(formatMorphTitleAtProgress(seg, 0), 'February 2026');
  assert.equal(formatMorphTitleAtProgress(seg, MORPH_DAY_INSERT_END), 'February 4, 2026');
  const firstLetter = formatMorphTitleAtProgress(seg, MORPH_DAY_INSERT_END + 0.01);
  assert.equal(firstLetter, 'February 4, 2026, W');
  assert.equal(formatMorphTitleAtProgress(seg, 1), 'February 4, 2026, Wednesday');
  for (let i = 0; i <= 20; i += 1) {
    const s = formatMorphTitleAtProgress(seg, i / 20);
    assert.ok(s.startsWith('February '), s);
    assert.match(s, /2026/);
  }
});

test('CalendarPeriodTitle: fixed 22pt ink header + reduceMotion snap', () => {
  const comp = read('src/components/calendar/CalendarPeriodTitle.tsx');
  assert.match(comp, /fontSize:\s*22/);
  assert.match(comp, /colors\.ink/);
  assert.match(comp, /accessibilityRole="header"/);
  assert.match(comp, /reduceMotion/);
  assert.match(comp, /morphDayInsertProgress/);
  assert.match(comp, /morphWeekdayLetterCount/);
  assert.doesNotMatch(comp, /colors\.brand\b/);
});

test('periodTitle: worklet helper clamp01 is declared before its worklet callers (Reanimated no-hoist)', () => {
  const src = readFileSync(new URL('./periodTitle.ts', import.meta.url), 'utf8');
  const decl = src.indexOf('function clamp01(');
  const firstUse = src.indexOf('clamp01(progress)');
  assert.ok(decl >= 0 && firstUse >= 0 && decl < firstUse);
});

test('periodTitle marquee: only on real overflow; slow readable duration', () => {
  assert.equal(periodTitleNeedsMarquee(300, 320), false);
  assert.equal(periodTitleNeedsMarquee(321, 320), false);
  assert.equal(periodTitleNeedsMarquee(360, 320), true);
  assert.equal(periodTitleNeedsMarquee(360, 0), false);
  assert.equal(periodTitleMarqueeMs(0), 0);
  assert.equal(periodTitleMarqueeMs(5), 600);
  assert.ok(periodTitleMarqueeMs(72) >= 1900);
});

test('CalendarPeriodTitle: marquee after morph settles; off under Reduce Motion', () => {
  const comp = read('src/components/calendar/CalendarPeriodTitle.tsx');
  assert.match(comp, /withRepeat/);
  assert.match(comp, /periodTitleNeedsMarquee/);
  assert.match(comp, /reduceMotion \|\| !settled/);
  assert.match(comp, /cancelAnimation\(marqueeX\)/);
});
