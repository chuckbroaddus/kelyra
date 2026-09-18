import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildJournalAgendaGroups,
  DIARY_EMPTY_DAY_COPY,
  DIARY_PRESENCE_COUNT_CAP,
  DIARY_PRESENCE_HONESTY,
  DIARY_TWIN_FAIL_CLOSED,
  journalMonthContaining,
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
  assert.match(DIARY_TWIN_FAIL_CLOSED, /Twin streams never mix/);
  assert.match(DIARY_PRESENCE_HONESTY, /Presence marks never show other people/);
});

test('DB-B UI: JournalMonthGrid + RG-DROP; no CalendarItem on Journal path', () => {
  const screen = read('src/app/diary.tsx');
  const grid = read('src/components/diary/JournalMonthGrid.tsx');
  const helpers = read('src/lib/diary/dayBrowse.ts');

  assert.match(screen, /JournalMonthGrid/);
  assert.match(screen, /selectedDay/);
  assert.match(screen, /DIARY_EMPTY_DAY_COPY/);
  assert.match(screen, /DIARY_TWIN_FAIL_CLOSED/);
  assert.match(screen, /presenceByDay/);
  assert.match(screen, /openNew\(draft\)|openNew\(\)/);
  assert.match(screen, /setEntryDate\(prefill\?\.entry_date \?\? selectedDay\)/);
  assert.match(screen, /journalMonthContaining\(selectedDay\)/);
  assert.match(screen, /from:\s*month\.fromIso/);
  assert.match(screen, /to:\s*month\.toIso/);

  // RG-DROP: no primary Journal From/To state or Apply on Journal path
  assert.doesNotMatch(screen, /journalFrom|setJournalFrom|journalTo|setJournalTo/);
  assert.doesNotMatch(screen, /diaryFilterDate\(journalFrom\)/);
  // Ledger keeps From/To + Apply
  assert.match(screen, /ledgerFrom/);
  assert.match(screen, /label=\"Apply filters\"/);
  assert.match(screen, /label=\"From date \(YYYY-MM-DD\)\"/);

  // FW-FORK: no Calendar module imports on Journal path (comments may name the ban)
  for (const src of [screen, grid, helpers]) {
    assert.doesNotMatch(src, /from ['\"]@\/components\/calendar/);
    assert.doesNotMatch(src, /from ['\"]@\/lib\/calendar/);
    assert.doesNotMatch(src, /import\s*\{[^}]*\bCalendarItem\b/);
    assert.doesNotMatch(src, /import\s*\{[^}]*\broleTint\b/);
    assert.doesNotMatch(src, /import\s*\{[^}]*\bDayColumn\b/);
    assert.doesNotMatch(src, /import\s*\{[^}]*\bCalendarsSheet\b/);
    assert.doesNotMatch(src, /import\s*\{[^}]*\bEventComposer\b/);
    assert.doesNotMatch(src, /import\s+AgendaList\b/);
  }

  // No DB-C view chips
  assert.doesNotMatch(screen, /label=\"Days\"|label=\"Week\"|label=\"Year\"/);
  assert.match(grid, /accessibilityLabel=\"Today\"/);
  assert.match(grid, /Previous month/);
  assert.match(grid, /presenceMark/);
});

test('SEAT: student closed; Ledger has no JournalMonthGrid', () => {
  const screen = read('src/app/diary.tsx');
  assert.match(screen, /Student seat has no Diary/);
  assert.match(screen, /canOpenDiary/);
  // Month grid only under journal segment
  const journalBlockStart = screen.indexOf("segment === 'journal' && !failClosedEmpty");
  assert.ok(journalBlockStart > 0);
  const journalBlock = screen.slice(journalBlockStart, screen.indexOf("segment === 'ledger' ?", journalBlockStart));
  assert.match(journalBlock, /JournalMonthGrid/);
  const ledgerStart = screen.indexOf("segment === 'ledger' ?");
  const ledgerFilters = screen.slice(ledgerStart, ledgerStart + 2500);
  assert.doesNotMatch(ledgerFilters, /JournalMonthGrid/);
});
