import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MORPH_DAY_INSERT_END,
  MORPH_MONTH_TRIM_END,
  dayPeriodTitleSegments,
  formatDayPeriodTitle,
  formatMonthYearTitle,
  formatMorphTitleAtProgress,
  joinDayPeriodTitle,
  joinMonthYearTitle,
  monthTrimParts,
  morphCommaVisible,
  morphDayInsertProgress,
  morphMonthText,
  morphMonthTrimProgress,
  morphWeekdayLetterCount,
  morphWeekdayRevealProgress,
  spokenDayPeriodTitle,
  withAbbrevPeriod,
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

test('formatDayPeriodTitle → "Feb. 4, 2026, Wed." (periods on abbreviations only)', () => {
  assert.equal(formatDayPeriodTitle('2026-02-04', 'en-US'), 'Feb. 4, 2026, Wed.');
  assert.equal(formatDayPeriodTitle('2026-09-24', 'en-US'), 'Sep. 24, 2026, Thu.');
  assert.equal(formatDayPeriodTitle('2026-05-06', 'en-US'), 'May 6, 2026, Wed.');
  assert.equal(formatDayPeriodTitle('bogus', 'en-US'), 'bogus');
  assert.equal(withAbbrevPeriod('Feb', 'February'), 'Feb.');
  assert.equal(withAbbrevPeriod('May', 'May'), 'May');
  assert.equal(withAbbrevPeriod('févr.', 'février'), 'févr.');
});

test('dayPeriodTitleSegments → long + abbreviated month/weekday; spoken label stays full', () => {
  const seg = dayPeriodTitleSegments('2026-02-04', 'en-US');
  assert.deepEqual(seg, {
    month: 'February',
    monthShort: 'Feb.',
    dayPart: '4,',
    year: '2026',
    weekday: 'Wed.',
    weekdayLong: 'Wednesday',
  });
  assert.equal(joinMonthYearTitle(seg!), 'February 2026');
  assert.equal(joinDayPeriodTitle(seg!), 'Feb. 4, 2026, Wed.');
  assert.equal(spokenDayPeriodTitle(seg!), 'February 4, 2026, Wednesday');
  assert.equal(dayPeriodTitleSegments('2026-13-01'), null);
});

test('monthTrimParts: Feb stays, ruary clips, period lands; null for non-prefix', () => {
  const seg = dayPeriodTitleSegments('2026-02-04', 'en-US')!;
  assert.deepEqual(monthTrimParts(seg), { stem: 'Feb', tail: 'ruary', dot: '.' });
  const may = dayPeriodTitleSegments('2026-05-06', 'en-US')!;
  assert.deepEqual(monthTrimParts(may), { stem: 'May', tail: '', dot: '' });
  assert.equal(monthTrimParts({ month: 'Juillet', monthShort: 'juil.' }), null);
});

test('morph phases run one after another: shrink, then day insert, then comma + weekday', () => {
  const T = MORPH_MONTH_TRIM_END;
  const D = MORPH_DAY_INSERT_END;
  // Phase 1 only moves the month.
  assert.equal(morphMonthTrimProgress(0), 0);
  assert.equal(morphMonthTrimProgress(T), 1);
  assert.equal(morphDayInsertProgress(T), 0);
  assert.equal(morphCommaVisible(T), false);
  // Phase 2 only moves the day slot.
  assert.ok(Math.abs(morphDayInsertProgress((T + D) / 2) - 0.5) < 1e-9);
  assert.equal(morphDayInsertProgress(D), 1);
  assert.equal(morphCommaVisible(D), false);
  assert.equal(morphWeekdayRevealProgress(D), 0);
  // Phase 3: comma at once, weekday slides.
  assert.equal(morphCommaVisible(D + 0.001), true);
  assert.ok(morphWeekdayRevealProgress(D + 0.001) < 0.01);
  assert.equal(morphWeekdayRevealProgress(1), 1);
  // Each phase is monotonic.
  let a = 0, b = 0, c = 0;
  for (let i = 0; i <= 100; i += 1) {
    const p = i / 100;
    const [na, nb, nc] = [morphMonthTrimProgress(p), morphDayInsertProgress(p), morphWeekdayRevealProgress(p)];
    assert.ok(na >= a && nb >= b && nc >= c, `non-monotonic at ${i}`);
    [a, b, c] = [na, nb, nc];
  }
  const len = 'Wed.'.length;
  assert.equal(morphWeekdayLetterCount(D, len), 0);
  assert.equal(morphWeekdayLetterCount(1, len), len);
});

test('morphMonthText: February → Febru → Feb → Feb.; non-prefix swaps at midpoint', () => {
  const seg = dayPeriodTitleSegments('2026-02-04', 'en-US')!;
  assert.equal(morphMonthText(seg, 0), 'February');
  assert.equal(morphMonthText(seg, 0.4), 'Februa');
  assert.equal(morphMonthText(seg, 0.6), 'Febru');
  assert.equal(morphMonthText(seg, 0.99), 'Feb');
  assert.equal(morphMonthText(seg, 1), 'Feb.');
  const odd = { ...seg, month: 'Juillet', monthShort: 'juil.' };
  assert.equal(morphMonthText(odd, 0.3), 'Juillet');
  assert.equal(morphMonthText(odd, 0.6), 'juil.');
});

test('formatMorphTitleAtProgress: February 2026 → Feb. 4, 2026, Wed.', () => {
  const seg = dayPeriodTitleSegments('2026-02-04', 'en-US')!;
  assert.equal(formatMorphTitleAtProgress(seg, 0), 'February 2026');
  assert.equal(formatMorphTitleAtProgress(seg, MORPH_MONTH_TRIM_END), 'Feb. 2026');
  assert.equal(formatMorphTitleAtProgress(seg, MORPH_DAY_INSERT_END), 'Feb. 4, 2026');
  assert.match(formatMorphTitleAtProgress(seg, MORPH_DAY_INSERT_END + 0.05), /^Feb\. 4, 2026, W/);
  assert.equal(formatMorphTitleAtProgress(seg, 1), 'Feb. 4, 2026, Wed.');
  for (let i = 0; i <= 20; i += 1) {
    const s = formatMorphTitleAtProgress(seg, i / 20);
    assert.ok(s.startsWith('Feb'), s);
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
  assert.match(comp, /morphMonthTrimProgress/);
  assert.match(comp, /morphWeekdayRevealProgress/);
  assert.match(comp, /morphCommaVisible/);
  assert.match(comp, /Easing\.linear/);
  assert.match(comp, /accessibilityLabel=\{a11yLabel\}/);
  assert.match(comp, /<MarqueeText text=\{visibleTitle\}/);
  assert.doesNotMatch(comp, /colors\.brand\b/);
});

test('periodTitle: worklet helper clamp01 is declared before its worklet callers (Reanimated no-hoist)', () => {
  const src = readFileSync(new URL('./periodTitle.ts', import.meta.url), 'utf8');
  const decl = src.indexOf('function clamp01(');
  const firstUse = src.indexOf('clamp01(progress)');
  assert.ok(decl >= 0 && firstUse >= 0 && decl < firstUse);
  for (const helper of ['easeInOutCubic', 'phaseProgress']) {
    const d = src.indexOf(`function ${helper}(`);
    const u = src.indexOf(`${helper}(`, d + helper.length + 10);
    assert.ok(d >= 0 && u > d, `${helper} declared before use`);
  }
});

test('CalendarPeriodTitle: uses the app-standard MarqueeText (§30), not a bespoke loop', () => {
  const comp = read('src/components/calendar/CalendarPeriodTitle.tsx');
  assert.match(comp, /from '@\/components\/ui\/MarqueeText'/);
  assert.match(comp, /<MarqueeText[^>]*fadeColor=\{colors\.bg\}/);
  assert.match(comp, /settled( \|\| !seg)? \?/);
  assert.doesNotMatch(comp, /withRepeat|marqueeX|PERIOD_TITLE_MARQUEE/);
  const lib = read('src/lib/calendar/periodTitle.ts');
  assert.doesNotMatch(lib, /PERIOD_TITLE_MARQUEE|periodTitleNeedsMarquee|periodTitleMarqueeMs/);
});

test('Sticky weekday row: Month↔Week share one Sun…Sat row outside CalendarZoomDrill', () => {
  const row = read('src/components/calendar/CalendarWeekdayRow.tsx');
  assert.match(row, /weekdayLabels\(0, undefined, 'short'\)/);
  assert.match(row, /fadeProgress/);
  const cal = read('src/app/calendar.tsx');
  const title = cal.indexOf('{renderStickyTitle()}');
  const wd = cal.indexOf('{renderStickyWeekdays()}');
  const drill = cal.indexOf('<CalendarZoomDrill');
  assert.ok(title >= 0 && wd > title && drill > wd, 'weekday row sits under the title, outside the drill');
  assert.match(cal, /hideWeekdays\n/);
  assert.match(cal, /hideWeekdayLabels=\{activeView === 'week'\}/);
  assert.match(read('src/components/calendar/MonthGrid.tsx'), /hideWeekdays \? null/);
  assert.match(read('src/components/calendar/TeacherWeekGrid.tsx'), /hideWeekdayLabels \? null/);
});
