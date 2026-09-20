import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  formatCalendarDisplayDate,
  formatCalendarMonthYear,
  formatCalendarNumericDate,
  formatCalendarNumericRange,
} from './displayDate.ts';
import { clearFilters, categoriesForChips } from './filters.ts';
import { multidayRangeContaining } from './multiday.ts';
import { weekdayShort } from './week.ts';
import type { CalendarLayer } from './types.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('CAL-R5-01: static /calendar title in titles.ts (first paint; not effect-only)', () => {
  const titles = read('src/lib/chrome/titles.ts');
  assert.match(titles, /pathname === '\/calendar'|pathname\.startsWith\('\/calendar\/'\)/);
  assert.match(titles, /Calendar/);
  assert.match(titles, /\/diary/);
  assert.match(titles, /Diary/);
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /usePushedTitle\(['"]Calendar['"]\)/);
});

test('CAL-R5-02: YearGrid has no bold yearTitle under chevron row', () => {
  const year = read('src/components/calendar/YearGrid.tsx');
  assert.doesNotMatch(year, /yearTitle/);
  assert.match(year, /accessibilityLabel=\{`Year \$\{year\}`\}/);
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /activeView === 'year'/);
  assert.match(screen, /\{year\}/);
});

test('CAL-R5-03: Month chevron is Month, Year (no day)', () => {
  const label = formatCalendarMonthYear('2026-09-20', 'en-US');
  assert.equal(label, 'September 2026');
  const dayForm = formatCalendarDisplayDate('2026-09-20', 'en-US');
  assert.equal(dayForm, 'September 20, 2026');
  assert.notEqual(label, dayForm);
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /formatCalendarMonthYear\(monthAnchor\)/);
  assert.doesNotMatch(screen, /formatCalendarDisplayDate\(monthAnchor\)/);
});

test('CAL-R5-04: Week 3→TUE WED THU; 5→MON–FRI; 7 full week', () => {
  const wed = '2026-09-16';
  const three = multidayRangeContaining(3, wed);
  assert.deepEqual(
    three.days.map((d) => weekdayShort(d, 'en-US').toUpperCase()),
    ['TUE', 'WED', 'THU'],
  );
  const five = multidayRangeContaining(5, wed);
  assert.deepEqual(
    five.days.map((d) => weekdayShort(d, 'en-US').toUpperCase()),
    ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  );
  const seven = multidayRangeContaining(7, wed);
  assert.equal(seven.days.length, 7);
  assert.equal(seven.fromIso, '2026-09-13');
  const grid = read('src/components/calendar/TeacherWeekGrid.tsx');
  assert.match(grid, /weekdayShort\(day\)\.toUpperCase\(\)/);
});

test('CAL-R5-05: Week range MM/DD/YYYY – MM/DD/YYYY', () => {
  assert.equal(formatCalendarNumericDate('2026-09-14'), '09/14/2026');
  assert.equal(
    formatCalendarNumericRange('2026-09-14', '2026-09-20'),
    '09/14/2026 – 09/20/2026',
  );
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /formatCalendarNumericRange\(weekRange/);
  assert.match(screen, /formatCalendarNumericRange\(multiRange/);
});

test('CAL-R5-06/07/10: gear DROP JUMP + academic preset row + helper footer', () => {
  const sheet = read('src/components/calendar/ViewCustomizeSheet.tsx');
  assert.doesNotMatch(sheet, />Jump</);
  assert.doesNotMatch(sheet, /onJumpAgenda|onJumpDays/);
  assert.doesNotMatch(sheet, /FILTER_PRESETS/);
  assert.doesNotMatch(sheet, /All academic|School only|My sports|label=["']Reset["']/);
  assert.doesNotMatch(sheet, /Day List stays here/);
  assert.match(sheet, /CATEGORY_CHIPS/);
  assert.match(sheet, /Clear filters/);
  assert.match(sheet, /Calendars/);
  assert.match(sheet, /Compact/);
  assert.match(sheet, /Single Day/);
});

test('CAL-R5-08: Clear Filters → none selected (categories unfiltered)', () => {
  const layers: CalendarLayer[] = [
    {
      id: 'c',
      kind: 'class',
      name: 'Class',
      roleTint: 'academic',
      classId: 'x',
      defaultEnabled: true,
      isReadOnly: false,
      canUnsubscribe: false,
    },
  ];
  const cleared = clearFilters(layers);
  assert.deepEqual(cleared.categoryChipIds, []);
  assert.equal(categoriesForChips([]), null);
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /clearFilters\(/);
  assert.doesNotMatch(screen, /onPreset\(['"]reset['"]\)|applyPreset\(['"]reset['"]\)/);
});

test('CAL-R5-09: Calendars Done pops to Settings (stack; Settings stays open)', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /customizeOpen && !calendarsOpen/);
  assert.match(screen, /onOpenCalendars=\{\(\) => setCalendarsOpen\(true\)\}/);
  // Calendars sheet after Settings so it stacks on top; Done only clears calendarsOpen.
  const customizeIdx = screen.indexOf('<ViewCustomizeSheet');
  const calendarsIdx = screen.lastIndexOf('<CalendarsSheet');
  assert.ok(customizeIdx > 0 && calendarsIdx > customizeIdx, 'Calendars must render after Settings');
  const sheet = read('src/components/calendar/ViewCustomizeSheet.tsx');
  assert.doesNotMatch(sheet, /onOpenCalendars\(\);\s*onClose\(\)/);
});

test('CAL-R5-11: Day List continuous multi-day; no date chevron; density A headers', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /dayMode !== 'list'/);
  assert.match(screen, /dayListRange\.days/);
  assert.match(screen, /includeEmptyDays/);
  assert.match(screen, /agendaRangeFrom\(dayAnchor, 14\)/);
  const list = read('src/components/calendar/AgendaList.tsx');
  assert.match(list, /includeEmptyDays/);
  assert.match(list, /No events/);
});

test('CAL-R5-12: header→tabs gap tight (pageChromeHosted + calendar contextReserve 0)', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /<Screen pageChromeHosted>/);
  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(chrome, /pathname === '\/calendar'/);
  assert.match(chrome, /CAL-R5-12/);
});
