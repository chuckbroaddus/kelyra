import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('R4 L-C: phone and web default Year in viewPrefs (all seats)', () => {
  const prefs = read('src/lib/calendar/viewPrefs.ts');
  assert.match(prefs, /return 'year'/);
  assert.doesNotMatch(prefs, /seat === 'teacher'\) return 'week'/);
  assert.doesNotMatch(prefs, /seat === 'office'\) return 'month'/);
  assert.doesNotMatch(prefs, /return 'agenda'/);
  assert.match(prefs, /CAL_VIEW_PREFS_VERSION = 3/);
});

test('R4 L-C: Year→Month→Day zoom + hierarchical back (no RTL-only gesture)', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /zoomTo\(/);
  assert.match(screen, /zoomUp\(/);
  assert.match(screen, /setPushedBackHandler/);
  assert.match(screen, /canZoomUp/);
  assert.doesNotMatch(screen, /RTL.?only|I18nManager\.isRTL/);
});

test('R4 chrome: PersonTabs Year · Month · Week · Day only (no Days / Agenda tabs)', () => {
  const screen = read('src/app/calendar.tsx');
  const m = screen.match(/const VIEW_TABS[\s\S]*?\];/);
  assert.ok(m, 'VIEW_TABS block missing');
  const block = m![0];
  assert.match(block, /key: 'year'/);
  assert.match(block, /key: 'month'/);
  assert.match(block, /key: 'week'/);
  assert.match(block, /key: 'day'/);
  assert.doesNotMatch(block, /key: 'agenda'/);
  assert.doesNotMatch(block, /key: 'multiday'|label: 'Days'/);
  // Order: Year before Month before Week before Day
  const yi = block.indexOf("key: 'year'");
  const mi = block.indexOf("key: 'month'");
  const wi = block.indexOf("key: 'week'");
  const di = block.indexOf("key: 'day'");
  assert.ok(yi < mi && mi < wi && wi < di, 'VIEW_TABS order must be Year·Month·Week·Day');
});

test('R4 C-B: LF-A Show chips live under gear (not quiet-chip canvas row)', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /<PersonTabs/);
  const sheet = read('src/components/calendar/ViewCustomizeSheet.tsx');
  assert.match(sheet, /CATEGORY_CHIPS/);
  const catIdx = sheet.indexOf('CATEGORY_CHIPS.map');
  assert.ok(catIdx > 0);
  const catBlock = sheet.slice(catIdx, catIdx + 400);
  assert.doesNotMatch(catBlock, /\bquiet\b/);
});

test('R4 chrome: CR-CalTabs cluster + · search · gear (LTR) on PersonTabs row', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /chromeCluster/);
  const clusterStart = screen.indexOf('styles.chromeCluster');
  assert.ok(clusterStart > 0);
  const cluster = screen.slice(clusterStart, clusterStart + 900);
  const plus = cluster.indexOf('name="plus"');
  const search = cluster.indexOf('name="search"');
  const settings = cluster.indexOf('name="settings"');
  assert.ok(plus >= 0 && search >= 0 && settings >= 0, 'header icons missing');
  assert.ok(plus < search && search < settings, 'header order must be + · search · gear');
  assert.match(screen, /ViewCustomizeSheet/);
  assert.match(screen, /monthMode/);
  assert.match(screen, /dayMode/);
  assert.match(screen, /visibleItems/);
  assert.match(screen, /seat-visible/);
});

test('R4 C-B: Month Compact|List only; Day Single|List in gear (Agenda not tab)', () => {
  const sheet = read('src/components/calendar/ViewCustomizeSheet.tsx');
  assert.match(sheet, /Compact/);
  assert.match(sheet, /Single Day/);
  assert.doesNotMatch(sheet, /label=["']Stacked["']|label=["']Details["']/);
  // CAL-R5-10: helper footer copy dropped — modes remain labeled without essay.
  assert.doesNotMatch(sheet, /Day List stays here/);
  const screen = read('src/app/calendar.tsx');
  const tabs = screen.match(/const VIEW_TABS[\s\S]*?\];/)![0];
  assert.doesNotMatch(tabs, /key: 'agenda'/);
  const month = read('src/components/calendar/MonthGrid.tsx');
  assert.match(month, /mode === 'list'|mode = 'compact'/);
});

test('R4 Year→Month: prefs hydrate once; MonthGrid mounts without loaded flicker', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /viewPrefsHydratedKeyRef/);
  assert.match(screen, /viewPrefsHydratedKeyRef\.current !== prefsKey/);
  assert.match(
    screen,
    /\(loaded \|\| activeView === 'month' \|\| activeView === 'year' \|\| activeView === 'day'\)/,
  );
  assert.match(screen, /Keep prior paint/);
  assert.doesNotMatch(
    screen,
    /if \(!prefsReady \|\| !viewPrefsReady\) \{\s*setLoaded\(false\);/,
  );
});

test('R4: no tray chrome / no hamburger Calendar restore war', () => {
  const screen = read('src/app/calendar.tsx');
  assert.doesNotMatch(screen, /FloatingTabTray|trayCalendar|restoreHamburgerCalendar/);
});

test('R4 Year→Month empty: MonthGrid mounts; filter-empty copy does not replace grid', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /areFiltersNarrowed/);
  assert.match(screen, /Nothing matches these filters/);
  assert.match(screen, /Clear filters/);
  // Mount gate must not suppress grids when filteredEmpty (empty month still paints).
  const mountMarker = 'Month/Year/Day mount even when';
  const mountIdx = screen.indexOf(mountMarker);
  assert.ok(mountIdx > 0, 'mount comment missing');
  const mountBlock = screen.slice(mountIdx, mountIdx + 400);
  assert.doesNotMatch(mountBlock, /!filteredEmpty/);
  assert.match(
    mountBlock,
    /\(loaded \|\| activeView === 'month' \|\| activeView === 'year' \|\| activeView === 'day'\)/,
  );
  assert.match(screen, /activeView === 'month' \? \([\s\S]*?<MonthGrid/);
  // Year tap → zoomTo month still present
  assert.match(screen, /onPressMonth[\s\S]*?zoomTo\('month'\)/);
});

test('R4 Year card: no per-day zoom; entire card → Month only', () => {
  const year = read('src/components/calendar/YearGrid.tsx');
  assert.doesNotMatch(year, /onPressDay/);
  assert.match(year, /onPressMonth/);
  // Nested day Pressables removed (card Pressable only).
  assert.equal((year.match(/<Pressable/g) || []).length, 1);
  const screen = read('src/app/calendar.tsx');
  // Scope to YearGrid JSX — Week onPressDay (CAL-P6-3A) must not false-trigger.
  const yearJsx = screen.match(/<YearGrid[\s\S]*?\/>/);
  assert.ok(yearJsx, 'YearGrid JSX missing');
  assert.doesNotMatch(yearJsx[0], /onPressDay/);
  assert.match(yearJsx[0], /onPressMonth/);
});

test('R4: no GhostButton Up row (Year/Month label) above VIEW_TABS', () => {
  const screen = read('src/app/calendar.tsx');
  assert.doesNotMatch(screen, /styles\.upRow|upRow:/);
  assert.doesNotMatch(
    screen,
    /GhostButton[\s\S]{0,120}label=\{[\s\S]{0,80}'Year'[\s\S]{0,80}'Month'/,
  );
  // Platform hierarchical back still wired
  assert.match(screen, /canZoomUp/);
  assert.match(screen, /setPushedBackHandler/);
  assert.match(screen, /zoomUp/);
});

test('R4 Year mobile: last week padded to 7 equal flex cells', () => {
  const year = read('src/components/calendar/YearGrid.tsx');
  assert.match(year, /7 - week\.length|length >= 7/);
  assert.match(year, /minWidth:\s*0/);
  assert.match(year, /overflow:\s*['"]hidden['"]/);
  assert.match(year, /flexWrap:\s*['"]nowrap['"]/);
});

test('R4 Year iPhone: two-digit dayNum does not wrap (numberOfLines=1)', () => {
  const year = read('src/components/calendar/YearGrid.tsx');
  // dayNum Text must stay single-line on ~390 native 2-col (30/31 ≠ stacked digits).
  assert.match(year, /numberOfLines=\{1\}/);
  assert.match(year, /allowFontScaling=\{false\}/);
  assert.match(year, /dayNum:[\s\S]*?fontSize:\s*9/);
  assert.match(year, /dayNum:[\s\S]*?paddingHorizontal:\s*0/);
  // Still one card Pressable — no nested day buttons.
  assert.equal((year.match(/<Pressable/g) || []).length, 1);
});
