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

test('R4 C-B: quiet view chips; LF-A category chips stay primary', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /VIEW_CHIPS[\s\S]*quiet/);
  assert.match(screen, /CATEGORY_CHIPS/);
  const catIdx = screen.indexOf('CATEGORY_CHIPS.map');
  assert.ok(catIdx > 0);
  const catBlock = screen.slice(catIdx, catIdx + 400);
  assert.doesNotMatch(catBlock, /\bquiet\b/);
});

test('R4 C-B: header trio + search seat-visible + view customizer modes', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /headerTrio/);
  assert.match(screen, /name=\"plus\"|name='plus'/);
  assert.match(screen, /name=\"search\"|name='search'/);
  assert.match(screen, /ViewCustomizeSheet/);
  assert.match(screen, /monthMode/);
  assert.match(screen, /dayMode/);
  assert.match(screen, /visibleItems/);
  assert.match(screen, /seat-visible/);
});

test('R4 C-B: Month Compact|List only; Day Single|List; Agenda chip remains', () => {
  const sheet = read('src/components/calendar/ViewCustomizeSheet.tsx');
  assert.match(sheet, /Compact/);
  assert.match(sheet, /Single Day/);
  assert.doesNotMatch(sheet, /label=[\"']Stacked[\"']|label=[\"']Details[\"']/);
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /id: 'agenda'/);
  const month = read('src/components/calendar/MonthGrid.tsx');
  assert.match(month, /mode === 'list'|mode = 'compact'/);
});

test('R4: no tray chrome / no hamburger Calendar restore war', () => {
  const screen = read('src/app/calendar.tsx');
  assert.doesNotMatch(screen, /FloatingTabTray|trayCalendar|restoreHamburgerCalendar/);
});
