import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { formatCalendarDisplayDate } from './displayDate.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('CR-CalTabs: chip row replaced by PersonTabs Year·Month·Week·Day', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /VIEW_TABS/);
  assert.match(screen, /<PersonTabs/);
  assert.doesNotMatch(screen, /VIEW_CHIPS/);
  assert.doesNotMatch(screen, /ChipRow compact[\s\S]{0,80}VIEW_/);
  const tabs = screen.match(/const VIEW_TABS[\s\S]*?\];/)![0];
  assert.match(tabs, /key: 'year'/);
  assert.match(tabs, /key: 'month'/);
  assert.match(tabs, /key: 'week'/);
  assert.match(tabs, /key: 'day'/);
  assert.match(tabs, /icon: 'calYear'/);
  assert.match(tabs, /icon: 'calMonth'/);
  assert.match(tabs, /icon: 'calWeek'/);
  assert.match(tabs, /icon: 'calDay'/);
  assert.doesNotMatch(tabs, /key: 'agenda'|key: 'multiday'/);
  const yi = tabs.indexOf("key: 'year'");
  const mi = tabs.indexOf("key: 'month'");
  const wi = tabs.indexOf("key: 'week'");
  const di = tabs.indexOf("key: 'day'");
  assert.ok(yi < mi && mi < wi && wi < di, 'VIEW_TABS order must be Year·Month·Week·Day');
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
  assert.match(screen, /motionPack=["']cm-linear["']/);
});

test('CR-CalTabs: date helper Month Name DD, YYYY; ISO not SoT for display', () => {
  const label = formatCalendarDisplayDate('2026-09-19', 'en-US');
  assert.equal(label, 'September 19, 2026');
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /formatCalendarDisplayDate/);
  // Day toolbar shows helper, not raw ISO as the visible label.
  assert.match(screen, /formatCalendarDisplayDate\(dayRange\.day\)/);
  assert.doesNotMatch(screen, /styles\.rangeLabel[\s\S]{0,80}\{dayRange\.day\}/);
  const helper = read('src/lib/calendar/displayDate.ts');
  assert.match(helper, /Month Name DD, YYYY|month: 'long'/);
  assert.match(helper, /never persist|ISO/);
});

test('CR-CalTabs: << >> nav labels with a11y Previous/Next', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /label=["']<<["']/);
  assert.match(screen, /label=["']>>["']/);
  assert.match(screen, /accessibilityLabel=["']Previous["']/);
  assert.match(screen, /accessibilityLabel=["']Next["']/);
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
  assert.match(sheet, /Agenda/);
  assert.match(sheet, /Days/);
  assert.match(sheet, /CATEGORY_CHIPS/);
  assert.match(sheet, /onJumpAgenda|onJumpDays/);
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

test('CR-CalTabs: no Ghost Up; no §32.2 / PersonTabs default flip in docs', () => {
  const screen = read('src/app/calendar.tsx');
  assert.doesNotMatch(screen, /styles\.upRow|upRow:/);
  assert.match(screen, /PersonTabs opt-in|\/calendar only|no §32\.2/);
  assert.doesNotMatch(screen, /FloatingTabTray|trayCalendar|restoreHamburgerCalendar/);
});
