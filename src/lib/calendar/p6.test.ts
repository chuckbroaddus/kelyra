/**
 * CAL-P6 acceptance pins — Chuck send 1A · 3A · 4A · 5C · 6B · 8A · 9A · 10B.
 * Required: 1A start-on-drum, 5C list+drum, 4A empty hours, 10B slot create.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  calendarSessionKey,
  loadCalendarSession,
  saveCalendarSession,
} from './calendarSession.ts';
import {
  CAL_DAY_LIST_COMMIT_OVERSCROLL_PX,
  dayListCommitDir,
} from './dayListBoundary.ts';
import {
  CAL_P6_6B_COMMIT_OVERSCROLL_PX,
  monthListCommitDir,
} from './monthListBoundary.ts';
import {
  CAL_P6_1A_FULL_BAND,
  CAL_P6_1A_ON_DRUM_CARVE_PX,
  CAL_P6_3A_HIERARCHY,
  CAL_P6_4A_ALWAYS_HOURS,
  CAL_P6_5C_LIST_ANCHOR,
  CAL_P6_6B_SOFT_BOUNDARY,
  CAL_P6_8A_PIN_DRUM,
  CAL_P6_9A_STACK_RESTORE,
  CAL_P6_10B_SLOT_CREATE,
  CAL_P6_STANCES,
} from './p6Laws.ts';
import { PERIOD_PAGER_EDGE_GUARD_PX, showsPeriodPager } from './periodPager.ts';
import { slotCreateDraft } from './slotCreate.ts';
import { timelineHours, TIMELINE_END_HOUR, TIMELINE_START_HOUR } from './timeline.ts';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('CAL-P6 named laws + locked stances exported', () => {
  assert.deepEqual([...CAL_P6_STANCES], ['1A', '3A', '4A', '5C', '6B', '8A', '9A', '10B']);
  assert.equal(CAL_P6_1A_FULL_BAND, 'CAL-P6-1A');
  assert.equal(CAL_P6_3A_HIERARCHY, 'CAL-P6-3A');
  assert.equal(CAL_P6_4A_ALWAYS_HOURS, 'CAL-P6-4A');
  assert.equal(CAL_P6_5C_LIST_ANCHOR, 'CAL-P6-5C');
  assert.equal(CAL_P6_6B_SOFT_BOUNDARY, 'CAL-P6-6B');
  assert.equal(CAL_P6_8A_PIN_DRUM, 'CAL-P6-8A');
  assert.equal(CAL_P6_9A_STACK_RESTORE, 'CAL-P6-9A');
  assert.equal(CAL_P6_10B_SLOT_CREATE, 'CAL-P6-10B');
});

test('CAL-P6-1A: full-band drum — carve 0; start-on-drum pages; no pageX left guard', () => {
  assert.equal(CAL_P6_1A_ON_DRUM_CARVE_PX, 0);
  assert.equal(PERIOD_PAGER_EDGE_GUARD_PX, 0);
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /CAL-P6-1A|CAL_P6_1A/);
  assert.doesNotMatch(pager, /pageX\s*<\s*PERIOD_PAGER_EDGE_GUARD_PX/);
  assert.doesNotMatch(pager, /pageX\s*<\s*20|pageX\s*<\s*24/);
  assert.match(pager, /Gesture\.Pan\(\)|activeOffsetX|manualActivation/);
  assert.match(pager, /commits on snap|CAL-P6-1A-07/);
  // LTR+RTL both page via shared snap (no direction carve-out).
  assert.match(pager, /snapPeriodPage/);
  assert.match(pager, /GestureDetector|manualActivation\(true\)/);
});

test('CAL-P6-5C: Day List mounts drum; soft day-page lockstep with header', () => {
  assert.equal(showsPeriodPager('day', 'list'), true);

  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /DayListPane/);
  assert.match(screen, /dayListMode/);
  assert.match(screen, /onCommitAdjacentDay/);
  assert.match(screen, /applyDayListDrumShift/);
  assert.match(screen, /scroll=\{!monthListMode && !dayListMode\}/);
  assert.match(screen, /CAL-P6-5C|CAL_P6_5C_LIST_ANCHOR/);
  // Drum + soft commit both write dayAnchor (header + PeriodPager SoT).
  assert.match(screen, /setDayAnchor\(\(prev\) => shiftDay\(prev/);

  const pane = read('src/components/calendar/DayListPane.tsx');
  assert.match(pane, /formatCalendarDisplayDate/);
  assert.match(pane, /dayListCommitDir/);
  assert.match(pane, /onCommitAdjacentDay/);
  assert.match(pane, /chrome\?\.onScroll\(event\)/);
  assert.match(pane, /hideDayHeadings/);
});

test('CAL-P6-5C behavioral: day list soft edge commits adjacent day', () => {
  assert.equal(
    dayListCommitDir({
      overscrollPx: -CAL_DAY_LIST_COMMIT_OVERSCROLL_PX,
      y: -60,
      maxY: 400,
    }),
    -1,
  );
  assert.equal(
    dayListCommitDir({
      overscrollPx: CAL_DAY_LIST_COMMIT_OVERSCROLL_PX,
      y: 460,
      maxY: 400,
    }),
    1,
  );
  assert.equal(
    dayListCommitDir({ overscrollPx: 0, y: 10, maxY: 400, velocityY: 0 }),
    0,
  );
});


test('CAL-P6-4A: Single Day always mounts full hour gutter/track', () => {
  const hours = timelineHours();
  assert.ok(hours.length > 0);
  assert.equal(hours[0], TIMELINE_START_HOUR);
  assert.equal(hours[hours.length - 1], TIMELINE_END_HOUR);

  const day = read('src/components/calendar/DayColumn.tsx');
  assert.match(day, /CAL-P6-4A|CAL_P6_4A_ALWAYS_HOURS/);
  assert.match(day, /timelineHours\(\)/);
  assert.match(day, /styles\.gutter/);
  assert.match(day, /styles\.hourSlot|hourSlot/);
  // Empty cue must not replace hours — hours map still present.
  assert.match(day, /Nothing on this day/);
  assert.match(day, /hours\.map/);
  const emptyCueIdx = day.indexOf('Nothing on this day');
  const hoursMapIdx = day.indexOf('hours.map');
  assert.ok(hoursMapIdx > emptyCueIdx, 'hour gutter must still mount after empty cue');
});

test('CAL-P6-10B: empty hour slot → Add Event prefill; no confirm sheet', () => {
  const draft = slotCreateDraft('2026-09-20', 9);
  assert.equal(draft.title, '');
  assert.equal(draft.startDate, '2026-09-20');
  assert.equal(draft.endDate, '2026-09-20');
  assert.equal(draft.allDay, false);
  assert.equal(draft.startTime, '09:00');
  assert.equal(draft.endTime, '10:00');

  const day = read('src/components/calendar/DayColumn.tsx');
  assert.match(day, /onPressSlot/);
  assert.match(day, /pressedHour|brandSoft/);
  assert.match(day, /CAL-P6-10B|CAL_P6_10B/);

  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /slotCreateDraft/);
  assert.match(screen, /onPressSlot/);
  assert.doesNotMatch(
    screen,
    /onPressSlot[\s\S]{0,200}CalendarConfirm|confirm.*slot|slot.*confirm/i,
  );
});

test('CAL-P6-8A: drum pinned; PersonTabs collapse with tray', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /collapse=\{collapsingChrome\}/);
  assert.match(screen, /pin=\{pinnedChrome\}/);
  assert.match(screen, /<PersonTabs/);
  assert.match(screen, /PeriodPager/);
  // PersonTabs live in collapse band; PeriodPager in pin band.
  const collapseIdx = screen.indexOf('const collapsingChrome');
  const pinIdx = screen.indexOf('const pinnedChrome');
  assert.ok(collapseIdx > 0 && pinIdx > collapseIdx);
  const collapseBlock = screen.slice(collapseIdx, pinIdx);
  const pinBlock = screen.slice(pinIdx, screen.indexOf('return (', pinIdx));
  assert.match(collapseBlock, /<PersonTabs/);
  assert.doesNotMatch(collapseBlock, /<PeriodPager/);
  assert.match(pinBlock, /<PeriodPager/);
  assert.doesNotMatch(pinBlock, /<PersonTabs/);

  const screenUi = read('src/components/ui/Screen.tsx');
  assert.match(screenUi, /pin\?:/);
  assert.match(screenUi, /CAL-P6-8A|pinBand/);
  // Month List scroll={!monthListMode && !dayListMode} must still feed chrome.onScroll (8A hide/show).
  const month = read('src/components/calendar/MonthGrid.tsx');
  assert.match(month, /chrome\?\.onScroll\(event\)/);
  assert.match(month, /chrome\?\.onScrollBeginDrag\(event\)/);
});

test('CAL-P6-3A: tap-down + pinch/`<` climb; no Ghost above tabs', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /hierarchyPinch|pinch-out|scale > 1\.25/);
  assert.match(screen, /showClimbControl/);
  assert.match(screen, /label=["']<["']/);
  assert.match(screen, /onZoomWeek/);
  assert.match(screen, /onPressDay/);
  assert.doesNotMatch(screen, /styles\.upRow|upRow:/);
  assert.doesNotMatch(
    screen,
    /GhostButton[\s\S]{0,80}label=\{[\s\S]{0,40}'Year'/,
  );
});

test('CAL-P6-6B: Month List soft boundary commit wired + bounded scroller', () => {
  const month = read('src/components/calendar/MonthGrid.tsx');
  assert.match(month, /CAL-P6-6B|CAL_P6_6B|monthListCommitDir/);
  assert.match(month, /onCommitAdjacentMonth/);
  assert.match(month, /listScroller|listWrap/);
  assert.match(month, /flex:\s*1/);
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /onCommitAdjacentMonth/);
  assert.match(screen, /shiftMonth\(monthRange\.fromIso, dir\)/);
  assert.match(screen, /scroll=\{!monthListMode && !dayListMode\}/);
  assert.match(screen, /monthListHost/);
  // CAL-P6-8A: list scroller forwards into chrome hide/show while Screen scroll is off.
  assert.match(month, /useOptionalChrome|chrome\?\.onScroll/);
  assert.match(month, /onScrollBeginDrag/);

  // Rubber-band overscroll commits.
  assert.equal(
    monthListCommitDir({
      overscrollPx: -CAL_P6_6B_COMMIT_OVERSCROLL_PX,
      y: -60,
      maxY: 400,
    }),
    -1,
  );
  assert.equal(
    monthListCommitDir({
      overscrollPx: CAL_P6_6B_COMMIT_OVERSCROLL_PX,
      y: 460,
      maxY: 400,
    }),
    1,
  );
  // Undershoot rubber does not commit.
  assert.equal(monthListCommitDir({ overscrollPx: -20, y: -20, maxY: 400 }), 0);
  // Clamped platforms: match hideOnScroll vy signs (neg at top → prev; pos at bottom → next).
  assert.equal(
    monthListCommitDir({ overscrollPx: 0, y: 0, maxY: 400, velocityY: -1.2 }),
    -1,
  );
  assert.equal(
    monthListCommitDir({ overscrollPx: 0, y: 400, maxY: 400, velocityY: 1.2 }),
    1,
  );
  // Wrong-direction flings at edges must not commit.
  assert.equal(monthListCommitDir({ overscrollPx: 0, y: 0, maxY: 400, velocityY: 1.2 }), 0);
  assert.equal(monthListCommitDir({ overscrollPx: 0, y: 400, maxY: 400, velocityY: -1.2 }), 0);
});

test('CAL-P6-9A: session anchors restore; drum LTR ≠ app back', () => {
  const key = calendarSessionKey('p1', 'teacher', null);
  saveCalendarSession(key, {
    activeView: 'day',
    dayMode: 'list',
    monthMode: 'compact',
    dayCount: 5,
    dayAnchor: '2026-09-20',
    gridAnchor: '2026-09-14',
    monthAnchor: '2026-09-01',
    yearAnchor: 2026,
    agendaAnchor: '2026-09-20',
    monthSelectedDay: null,
    zoomStack: ['month'],
  });
  const loaded = loadCalendarSession(key);
  assert.ok(loaded);
  assert.equal(loaded!.dayAnchor, '2026-09-20');
  assert.equal(loaded!.dayMode, 'list');
  assert.deepEqual(loaded!.zoomStack, ['month']);

  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /saveCalendarSession|loadCalendarSession/);
  const pager = read('src/components/calendar/PeriodPager.tsx');
  assert.match(pager, /CAL-P6-9A|never app-back|period page only/);
});

test('CAL-P6 item 7 KEEP: two-digit dayNum single-line on Year/Month/PeriodLeaf', () => {
  const year = read('src/components/calendar/YearGrid.tsx');
  assert.match(year, /numberOfLines=\{1\}/);
  assert.match(year, /allowFontScaling=\{false\}/);
  assert.match(year, /paddingHorizontal:\s*0/);
  const month = read('src/components/calendar/MonthGrid.tsx');
  assert.match(month, /numberOfLines=\{1\}/);
  assert.match(month, /allowFontScaling=\{false\}/);
  const leaf = read('src/components/calendar/PeriodLeaf.tsx');
  assert.match(leaf, /numberOfLines=\{1\}/);
  assert.match(leaf, /allowFontScaling=\{false\}/);
  assert.match(leaf, /paddingHorizontal:\s*0/);
});


test('CAL-P6-10B slotCreateDraft source is slot_create not ai_nl (t_60463b4d)', () => {
  const create = read('src/lib/calendar/slotCreate.ts');
  const ask = read('src/lib/calendar/askDraft.ts');
  assert.match(ask, /'ai_nl' \| 'slot_create'/);
  assert.match(create, /source:\s*'slot_create'/);
  assert.doesNotMatch(create, /source:\s*'ai_nl'/);
});
