import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('R4 L-C: phone default Year in viewPrefs', () => {
  const prefs = read('src/lib/calendar/viewPrefs.ts');
  assert.match(prefs, /deviceClass === 'phone'\) return 'year'/);
  assert.doesNotMatch(prefs, /deviceClass === 'phone'\) return 'agenda'/);
});

test('R4 L-C: Year→Month→Day zoom + hierarchical back (no RTL-only gesture)', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /zoomTo\(/);
  assert.match(screen, /zoomUp\(/);
  assert.match(screen, /setPushedBackHandler/);
  assert.match(screen, /canZoomUp/);
  assert.doesNotMatch(screen, /RTL.?only|I18nManager\.isRTL/);
});

test('R4 chrome: chip row Year · Month · Week · Day only (no Days / Agenda chips)', () => {
  const screen = read('src/app/calendar.tsx');
  const m = screen.match(/const VIEW_CHIPS[\s\S]*?\];/);
  assert.ok(m, 'VIEW_CHIPS block missing');
  const block = m![0];
  assert.match(block, /id: 'year'/);
  assert.match(block, /id: 'month'/);
  assert.match(block, /id: 'week'/);
  assert.match(block, /id: 'day'/);
  assert.doesNotMatch(block, /id: 'agenda'/);
  assert.doesNotMatch(block, /id: 'multiday'|label: 'Days'/);
  // Order: Year before Month before Week before Day
  const yi = block.indexOf("id: 'year'");
  const mi = block.indexOf("id: 'month'");
  const wi = block.indexOf("id: 'week'");
  const di = block.indexOf("id: 'day'");
  assert.ok(yi < mi && mi < wi && wi < di, 'VIEW_CHIPS order must be Year·Month·Week·Day');
});

test('R4 C-B: quiet view chips; LF-A category chips stay primary', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /VIEW_CHIPS[\s\S]*quiet/);
  assert.match(screen, /CATEGORY_CHIPS/);
  const catIdx = screen.indexOf('CATEGORY_CHIPS.map');
  assert.ok(catIdx > 0);
  const catBlock = screen.slice(catIdx, catIdx + 400);
  assert.doesNotMatch(catBlock, /\bquiet\b/);
});

test('R4 chrome: header trio gear · search · plus (LTR)', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /headerTrio/);
  const trioStart = screen.indexOf('styles.headerTrio');
  assert.ok(trioStart > 0);
  const trio = screen.slice(trioStart, trioStart + 900);
  const settings = trio.indexOf('name="settings"');
  const search = trio.indexOf('name="search"');
  const plus = trio.indexOf('name="plus"');
  assert.ok(settings >= 0 && search >= 0 && plus >= 0, 'header icons missing');
  assert.ok(settings < search && search < plus, 'header order must be gear · search · plus');
  assert.match(screen, /ViewCustomizeSheet/);
  assert.match(screen, /monthMode/);
  assert.match(screen, /dayMode/);
  assert.match(screen, /visibleItems/);
  assert.match(screen, /seat-visible/);
});

test('R4 C-B: Month Compact|List only; Day Single|List in gear (Agenda not chip)', () => {
  const sheet = read('src/components/calendar/ViewCustomizeSheet.tsx');
  assert.match(sheet, /Compact/);
  assert.match(sheet, /Single Day/);
  assert.doesNotMatch(sheet, /label=["']Stacked["']|label=["']Details["']/);
  assert.match(sheet, /Day List stays here/);
  const screen = read('src/app/calendar.tsx');
  const chips = screen.match(/const VIEW_CHIPS[\s\S]*?\];/)![0];
  assert.doesNotMatch(chips, /id: 'agenda'/);
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
