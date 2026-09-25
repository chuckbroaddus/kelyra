import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildJournalAgendaGroups,
  buildLedgerAgendaGroups,
  dayChromeLayout,
  DAYCHROME_WEB_SPLIT_MIN,
  DIARY_EMPTY_DAY_COPY,
  DIARY_FILTER_MISS_COPY,
  DIARY_LEDGER_EMPTY_DAY_COPY,
  DIARY_PRESENCE_COUNT_CAP,
  DIARY_PRESENCE_HONESTY,
  DIARY_TWIN_FAIL_CLOSED,
  journalMonthContaining,
  ledgerPresenceCountByDay,
  ledgerPresenceMark,
  parentTwinsFailClosed,
  presenceCountByDay,
  presenceMark,
  shiftJournalSelectedDay,
} from './dayBrowse.ts';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('PR-BOTH presenceMark: none / dot / count / 9+ cap', () => {
  assert.deepEqual(presenceMark(0), { kind: 'none' });
  assert.deepEqual(presenceMark(-1), { kind: 'none' });
  assert.deepEqual(presenceMark(1), { kind: 'dot' });
  assert.deepEqual(presenceMark(2), { kind: 'count', label: '2' });
  assert.deepEqual(presenceMark(8), { kind: 'count', label: '8' });
  assert.deepEqual(presenceMark(DIARY_PRESENCE_COUNT_CAP), { kind: 'count', label: '9+' });
  assert.deepEqual(presenceMark(42), { kind: 'count', label: '9+' });
});

test('presenceCountByDay aggregates owner entry_date only', () => {
  const map = presenceCountByDay([
    { entry_date: '2026-09-17' },
    { entry_date: '2026-09-17' },
    { entry_date: '2026-09-15' },
    { entry_date: '' },
  ]);
  assert.equal(map.get('2026-09-17'), 2);
  assert.equal(map.get('2026-09-15'), 1);
  assert.equal(map.has(''), false);
});

test('buildJournalAgendaGroups always anchors selected day (empty card when zero)', () => {
  const rows = [
    { id: 'a', entry_date: '2026-09-16' },
    { id: 'b', entry_date: '2026-09-19' },
    { id: 'c', entry_date: '2026-09-16' },
  ];
  const emptySel = buildJournalAgendaGroups(rows, '2026-09-17', false);
  assert.equal(emptySel[0]?.day, '2026-09-17');
  assert.equal(emptySel[0]?.empty, true);
  assert.equal(emptySel[0]?.isSelected, true);
  assert.equal(emptySel[0]?.rows.length, 0);
  // Newest: remaining days newest→oldest after selected
  assert.deepEqual(
    emptySel.slice(1).map((g) => g.day),
    ['2026-09-19', '2026-09-16'],
  );

  const withSel = buildJournalAgendaGroups(
    [...rows, { id: 'd', entry_date: '2026-09-17' }],
    '2026-09-17',
    true,
  );
  assert.equal(withSel[0]?.empty, false);
  assert.equal(withSel[0]?.rows.length, 1);
  // Oldest: remaining days oldest→newest after selected
  assert.deepEqual(
    withSel.slice(1).map((g) => g.day),
    ['2026-09-16', '2026-09-19'],
  );
});

test('TWIN parentTwinsFailClosed when 2+ children and no focus', () => {
  assert.equal(parentTwinsFailClosed(2, null), true);
  assert.equal(parentTwinsFailClosed(2, undefined), true);
  assert.equal(parentTwinsFailClosed(2, ''), true);
  assert.equal(parentTwinsFailClosed(2, 'child-1'), false);
  assert.equal(parentTwinsFailClosed(1, null), false);
  assert.equal(parentTwinsFailClosed(0, null), false);
});

test('month nav clamps day-of-month; journalMonthContaining window', () => {
  assert.equal(shiftJournalSelectedDay('2026-01-31', 1), '2026-02-28');
  assert.equal(shiftJournalSelectedDay('2026-03-15', -1), '2026-02-15');
  const month = journalMonthContaining('2026-09-17');
  assert.equal(month.fromIso, '2026-09-01');
  assert.equal(month.toIso, '2026-09-30');
  assert.match(month.label, /2026/);
});

test('locked empty / twin / presence copy constants', () => {
  assert.equal(DIARY_EMPTY_DAY_COPY, 'No entries yet on this day.');
  assert.equal(DIARY_FILTER_MISS_COPY, 'No entries match these filters on this day.');
  assert.match(DIARY_TWIN_FAIL_CLOSED, /Twin streams never mix/);
  assert.match(DIARY_PRESENCE_HONESTY, /Presence marks never show other people/);
});

test('DIARY-CAL UI: Day drum + Day List replace month grid (CEO 2026-09-24)', () => {
  const screen = read('src/app/diary.tsx');
  const helpers = read('src/lib/diary/dayBrowse.ts');

  // Month grid + helper copy gone from the screen; Calendar Day drum + Day List instead.
  assert.doesNotMatch(screen, /JournalMonthGrid/);
  assert.doesNotMatch(screen, /DIARY_PRESENCE_HONESTY/);
  assert.doesNotMatch(screen, /\{DIARY_FERPA_NOTE\}<\/Text>/);
  assert.match(screen, /<PeriodPager\s+kind="day"/);
  assert.match(screen, /<DayListPane<DiaryEntryRow>/);
  assert.match(screen, /<DayListPane<LedgerEventRow>/);
  assert.match(screen, /renderItem=\{renderJournalItem\}/);
  assert.match(screen, /renderItem=\{renderLedgerItem\}/);
  assert.match(screen, /onTopDayChange=\{setSelectedDay\}/);
  assert.match(screen, /drivePosition=\{listDrive\}/);
  assert.match(screen, /DIARY_TWIN_FAIL_CLOSED/);
  assert.match(screen, /openNew\(draft\)/);
  assert.match(screen, /setEntryDate\(prefill\?\.entry_date \?\? selectedDay\)/);

  // RG-DROP: no primary Journal From/To state
  assert.doesNotMatch(screen, /journalFrom|setJournalFrom|journalTo|setJournalTo/);
  // Ledger From/To move to Settings; Done applies (no Apply filters tap).
  assert.match(screen, /ledgerFrom/);
  assert.doesNotMatch(screen, /Apply filters/);
  assert.match(screen, /onDone=\{applySettings\}/);
  const sheet = read('src/components/diary/DiarySettingsSheet.tsx');
  assert.match(sheet, /label=\"From date \(YYYY-MM-DD\)\"/);
  assert.match(sheet, /label="Done"/);
  assert.doesNotMatch(sheet, /Apply filters/);

  // Journal rows stay DiaryEntryRow (no CalendarItem / EventComposer on the Journal path).
  for (const src of [screen, helpers]) {
    assert.doesNotMatch(src, /import\s*\{[^}]*\bCalendarItem\b/);
    assert.doesNotMatch(src, /import\s*\{[^}]*\broleTint\b/);
    assert.doesNotMatch(src, /import\s*\{[^}]*\bCalendarsSheet\b/);
    assert.doesNotMatch(src, /import\s*\{[^}]*\bEventComposer\b/);
  }
  assert.doesNotMatch(screen, /label=\"Days\"|label=\"Week\"|label=\"Year\"/);
});

test('SEAT: student closed; ST-A tray IA unchanged (no fifth tray invent)', () => {
  const screen = read('src/app/diary.tsx');
  assert.match(screen, /Student seat has no Diary/);
  assert.match(screen, /canOpenDiary/);
});

test('DIARY-CAL chrome: tabs pinned on top, then Today · + search gear, then drum', () => {
  assert.equal(DAYCHROME_WEB_SPLIT_MIN, 720);
  assert.equal(dayChromeLayout(390), 'phone-stack');
  assert.equal(dayChromeLayout(1280), 'web-split');

  const screen = read('src/app/diary.tsx');
  const pinStart = screen.indexOf('const pinnedChrome');
  const pin = screen.slice(pinStart, screen.indexOf('return (', pinStart));
  const tabsAt = pin.indexOf('<PersonTabs');
  const todayAt = pin.indexOf('label="Today"');
  const drumAt = pin.indexOf('<PeriodPager');
  assert.ok(tabsAt >= 0 && tabsAt < todayAt && todayAt < drumAt);
  assert.match(pin, /name="plus"/);
  assert.match(pin, /name="search"/);
  assert.match(pin, /name="settings"/);
  assert.match(screen, /pin=\{pinnedChrome\}/);
  // Tab row stays put: Diary lists never collapse the app header / top gap on scroll.
  assert.equal(screen.split('collapseChrome={false}').length - 1, 2);
  assert.match(read('src/components/calendar/DayListPane.tsx'), /collapseChrome && !drivingRef\.current/);
  // Body search field gone; magnifier toggles a local-match input.
  assert.doesNotMatch(screen, /label="Search"/);
  assert.match(screen, /query=\{searchQuery\}/);
  // Shared selectedDay kept across tab switch (single state)
  assert.match(screen, /const \[selectedDay, setSelectedDay\]/);
  assert.equal(screen.split('setSelectedDay').length > 2, true);
});

test('follow-active-tab: Journal PR-BOTH dots; Ledger tick ≠ journal dot', () => {
  assert.deepEqual(presenceMark(1), { kind: 'dot' });
  assert.deepEqual(ledgerPresenceMark(1), { kind: 'tick' });
  assert.notEqual(presenceMark(1).kind, ledgerPresenceMark(1).kind);
  assert.deepEqual(ledgerPresenceMark(0), { kind: 'none' });
  assert.deepEqual(ledgerPresenceMark(3), { kind: 'count', label: '3' });
  assert.deepEqual(ledgerPresenceMark(9), { kind: 'count', label: '9+' });

  const map = ledgerPresenceCountByDay([
    { created_at: '2026-09-17T15:00:00.000Z' },
    { created_at: '2026-09-17T18:00:00.000Z' },
    { created_at: '2026-09-15T08:00:00.000Z' },
    { created_at: 'bad' },
  ]);
  assert.equal(map.get('2026-09-17'), 2);
  assert.equal(map.get('2026-09-15'), 1);

  const grid = read('src/components/diary/JournalMonthGrid.tsx');
  assert.match(grid, /presenceMode/);
  assert.match(grid, /ledgerPresenceMark/);
  assert.match(grid, /styles\.tick/);
  assert.doesNotMatch(grid, /from ['"]@\/lib\/calendar\/roleTint|import\s*\{[^}]*\broleTint\b/);
});

test('ledger day filter helpers; + and swipe Delete are Journal-only', () => {
  const rows = [
    { id: 'a', created_at: '2026-09-16T10:00:00.000Z' },
    { id: 'b', created_at: '2026-09-19T10:00:00.000Z' },
    { id: 'c', created_at: '2026-09-16T12:00:00.000Z' },
  ];
  const emptySel = buildLedgerAgendaGroups(rows, '2026-09-17', false);
  assert.equal(emptySel[0]?.day, '2026-09-17');
  assert.equal(emptySel[0]?.empty, true);
  assert.deepEqual(
    emptySel.slice(1).map((g) => g.day),
    ['2026-09-19', '2026-09-16'],
  );
  assert.equal(DIARY_LEDGER_EMPTY_DAY_COPY, 'No ledger actions on this day.');

  const screen = read('src/app/diary.tsx');
  // No New entry button; + (Journal tab only) opens the composer.
  assert.doesNotMatch(screen, /<PrimaryButton label="New entry"/);
  assert.match(screen, /segment === 'journal' && !failClosedEmpty \? \(/);
  // DIARY-SWIPE: Delete is a right-to-left swipe action on Journal rows, not a button.
  assert.doesNotMatch(screen, /<GhostButton label="Delete"/);
  const journalRow = screen.slice(
    screen.indexOf('const renderJournalItem'),
    screen.indexOf('const renderLedgerItem'),
  );
  assert.match(journalRow, /<SwipeActionCard/);
  assert.match(journalRow, /label: 'Delete'/);
  const ledgerRow = screen.slice(screen.indexOf('const renderLedgerItem'), screen.indexOf('const pinnedChrome'));
  assert.doesNotMatch(ledgerRow, /Delete|SwipeActionCard/);
  // Teacher pointer never in month cells
  const grid = read('src/components/diary/JournalMonthGrid.tsx');
  assert.doesNotMatch(grid, /pointer|Student pointer|journalStudentId/);
});

test('DIARY-GEAR: Settings has Common / Journal / Ledger sections', () => {
  const sheet = read('src/components/diary/DiarySettingsSheet.tsx');
  const common = sheet.indexOf("'Common'");
  const journal = sheet.indexOf("'Journal'");
  const ledger = sheet.indexOf("'Ledger'");
  assert.ok(common > 0 && common < journal && journal < ledger, 'section order');
  assert.ok(sheet.indexOf('Export CSV') > ledger, 'CSV under Ledger');
  assert.ok(sheet.indexOf('label="Tag"') > journal && sheet.indexOf('label="Tag"') < ledger);
  assert.ok(sheet.indexOf('label="Newest"') > common && sheet.indexOf('label="Newest"') < journal);
  // Cancel in the title row (discards); Done at the bottom (applies).
  const cancelAt = sheet.indexOf('label="Cancel"');
  const doneAt = sheet.indexOf('<PrimaryButton label="Done"');
  assert.ok(cancelAt > 0 && cancelAt < common, 'Cancel in title row');
  assert.ok(doneAt > sheet.indexOf('</ScrollView>'), 'Done below the scroll body');
  assert.match(sheet, /onRequestClose=\{onCancel\}/);
  const screen = read('src/app/diary.tsx');
  assert.match(screen, /onCancel=\{cancelSettings\}/);
  assert.match(screen, /settingsSnapRef/);
});

test('diary glyph: locked C3 closed cover + spine + bottom forked ribbon (no table)', () => {
  const icons = read('scripts/build-icons.mjs');
  const start = icons.indexOf('diary: (p) =>');
  assert.ok(start > 0);
  const recipe = icons.slice(start, icons.indexOf('\n  calendar:', start));
  // C3: closed cover rect + vertical spine + forked ribbon out the bottom
  assert.match(recipe, /roundRect\(p, 5\.2, 2\.8, 13\.6, 15\.6, 1\.4/);
  assert.match(recipe, /line\(p, 8\.8, 2\.8, 8\.8, 18\.4/);
  assert.match(recipe, /line\(p, 15\.2, 18\.2, 15\.2, 21\.6/);
  assert.match(recipe, /line\(p, 14\.3, 21\.4, 15\.2, 23\.0/);
  assert.match(recipe, /line\(p, 15\.2, 23\.0, 16\.1, 21\.4/);
  // No open spread / table oval
  assert.doesNotMatch(recipe, /poly\(/);
  assert.doesNotMatch(recipe, /table|open book|lying on a table/i);
});
