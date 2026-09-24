import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { formatCalendarDisplayDate } from './displayDate.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('CR-CalTabs: Y/M/W/D tabs replaced by `<` + Today nav row', () => {
  const screen = read('src/app/calendar.tsx');
  assert.doesNotMatch(screen, /VIEW_TABS|<PersonTabs/);
  assert.doesNotMatch(screen, /VIEW_CHIPS/);
  assert.match(screen, /styles\.navRow/);
  assert.match(screen, /label=["']<["']/);
  assert.match(screen, /label=["']Today["']/);
  assert.match(screen, /jumpToday/);
  assert.match(screen, /zoomUp/);
});

test('CR-CalTabs: one-row cluster LTR + · search · gear', () => {
  const screen = read('src/app/calendar.tsx');
  assert.doesNotMatch(screen, /styles\.headerTrio|headerTrio:/);
  assert.match(screen, /chromeCluster/);
  const clusterStart = screen.indexOf('styles.chromeCluster');
  assert.ok(clusterStart > 0);
  const cluster = screen.slice(clusterStart, clusterStart + 900);
  const plus = cluster.indexOf('name="plus"');
  const search = cluster.indexOf('name="search"');
  const settings = cluster.indexOf('name="settings"');
  assert.ok(plus >= 0 && search >= 0 && settings >= 0, 'cluster icons missing');
  assert.ok(plus < search && search < settings, 'cluster order must be + · search · gear');
});

test('CR-CalTabs: Day Single still Month Name DD, YYYY; ISO not SoT for display', () => {
  const label = formatCalendarDisplayDate('2026-09-19', 'en-US');
  assert.equal(label, 'September 19, 2026');
  // Period pager leaf uses displayDate helpers (not raw ISO as SoT).
  const pager = read('src/lib/calendar/periodPager.ts');
  assert.match(pager, /formatCalendarDisplayDate/);
  assert.match(pager, /dayTile|kind === 'day'/);
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /PeriodPager/);
  assert.doesNotMatch(screen, /styles\.rangeLabel[\s\S]{0,80}\{dayRange\.day\}/);
  const helper = read('src/lib/calendar/displayDate.ts');
  assert.match(helper, /Month Name DD, YYYY|month: 'long'/);
  assert.match(helper, /never persist|ISO/);
  // CAL-R5-03/05: Month + week range formatters live alongside Day Single helper.
  assert.match(helper, /formatCalendarMonthYear/);
  assert.match(helper, /formatCalendarNumericRange/);
});

test('CR-CalTabs: << >> nav labels with a11y Previous/Next', () => {
  // Rolodex replaces chrome << >>; leaf-fail fallback keeps << >> + a11y Previous/Next.
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /label=["']<<["']/);
  assert.match(pager, /label=["']>>["']/);
  assert.match(pager, /accessibilityPrevLabel/);
  assert.match(pager, /accessibilityNextLabel/);
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /PeriodPager/);
  assert.match(screen, /accessibilityPrevLabel/);
  assert.match(screen, /accessibilityNextLabel=["']Next["']|accessibilityNextLabel=\{/);
  assert.doesNotMatch(screen, /GhostButton[\s\S]{0,40}label=["']Previous["']/);
  assert.doesNotMatch(screen, /GhostButton[\s\S]{0,40}label=["']Next["']/);
});

test('CR-CalTabs: no Hidden-quizzes teacher blurb; gear owns Show/Calendars/Clear', () => {
  const screen = read('src/app/calendar.tsx');
  assert.doesNotMatch(screen, /Hidden quizzes and tests show/);
  assert.doesNotMatch(screen, /Hidden quizzes and tests/);
  assert.doesNotMatch(screen, /styles\.filterBlock|filterBlock:/);
  // Canvas no longer hosts always-on Show / Calendars chips.
  assert.doesNotMatch(screen, /<Chip label=["']Calendars["']/);
  assert.doesNotMatch(screen, />Show</);
  const sheet = read('src/components/calendar/ViewCustomizeSheet.tsx');
  assert.match(sheet, />Show</);
  assert.match(sheet, /Calendars/);
  assert.match(sheet, /Clear filters/);
  assert.match(sheet, /CATEGORY_CHIPS/);
  // CAL-R5-06: JUMP Agenda/Days section dropped from gear (supersedes CR JUMP chrome).
  assert.doesNotMatch(sheet, />Jump</);
  assert.doesNotMatch(sheet, /onJumpAgenda|onJumpDays/);
  assert.doesNotMatch(sheet, /label=["']Agenda["']/);
  assert.doesNotMatch(sheet, /label=["']Days["']/);
});

test('CR-CalTabs: icons via build-icons; ≠ Desk today / diary', () => {
  const icons = read('scripts/build-icons.mjs');
  assert.match(icons, /calYear:/);
  assert.match(icons, /calMonth:/);
  assert.match(icons, /calWeek:/);
  assert.match(icons, /calDay:/);
  assert.match(icons, /two columns of three|2 cols|for \(const cy of \[11\.2/);
  const yearBlock = icons.slice(icons.indexOf('calYear:'), icons.indexOf('calMonth:'));
  assert.match(yearBlock, /circle\(p, 9\.2/);
  assert.match(yearBlock, /circle\(p, 14\.8/);
  assert.doesNotMatch(yearBlock, /RECIPES\.today|today\(/);
  const monthBlock = icons.slice(icons.indexOf('calMonth:'), icons.indexOf('calWeek:'));
  assert.doesNotMatch(monthBlock, /line\(p, 8\.2, 4\.2|binding rings/);
  const name = read('src/components/ui/Icon.tsx');
  assert.match(name, /'calYear'/);
  assert.match(name, /'calMonth'/);
  assert.match(name, /'calWeek'/);
  assert.match(name, /'calDay'/);
  const assets = read('src/components/ui/iconAssets.ts');
  assert.match(assets, /calYear/);
  assert.match(assets, /calMonth/);
  assert.match(assets, /calWeek/);
  assert.match(assets, /calDay/);
});

test('CR-CalTabs: no Ghost Up strip; no tray Calendar restore war', () => {
  const screen = read('src/app/calendar.tsx');
  assert.doesNotMatch(screen, /styles\.upRow|upRow:/);
  assert.doesNotMatch(screen, /FloatingTabTray|trayCalendar|restoreHamburgerCalendar/);
  assert.match(screen, /label=["']<["']/);
  assert.match(screen, /label=["']Today["']/);
});
