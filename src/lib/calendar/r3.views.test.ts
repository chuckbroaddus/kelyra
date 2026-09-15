import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../../', import.meta.url);
function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

test('CAL-R3 screen wires VW-R3-C views + phone week + multiday stepper', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /YearGrid/);
  assert.match(screen, /MonthGrid/);
  assert.match(screen, /DayColumn/);
  assert.match(screen, /TeacherWeekGrid/);
  assert.match(screen, /MultiDayStepper/);
  assert.match(screen, /AgendaList/);
  assert.match(screen, /activeView/);
  assert.match(screen, /'year'/);
  assert.match(screen, /'month'/);
  assert.match(screen, /'multiday'/);
  assert.match(screen, /'week'/);
  assert.match(screen, /allowPinch/);
  assert.match(screen, /useReducedMotion/);
  assert.match(screen, /defaultViewFor/);
  // Multi-day Today anchors on today ISO — not week Sunday (omits Wed–Sat for 3/5).
  assert.match(screen, /multidayTodayAnchor/);
  assert.match(screen, /activeView === 'multiday'[\s\S]*multidayTodayAnchor|multidayTodayAnchor\(today\)/);
  assert.doesNotMatch(screen, /from ['"]@fullcalendar|from ['"]fullcalendar|from ['"]react-big-calendar/);
  assert.doesNotMatch(screen, /label=["']Inbox["']|accessibilityLabel=["']Inbox["']/);
});

test('CAL-27 DayColumn is hour-gutter timeline not card-only list', () => {
  const day = read('src/components/calendar/DayColumn.tsx');
  assert.match(day, /hour gutter|HOUR_HEIGHT|timelineHours/);
  assert.match(day, /All-day/);
  assert.match(day, /layoutTimedBlocks/);
  assert.match(day, /Hidden/);
  assert.doesNotMatch(day, /card list only/);
});

test('CAL-28/29 Week denser + pinch gated by allowPinch; stepper essential', () => {
  const week = read('src/components/calendar/TeacherWeekGrid.tsx');
  assert.match(week, /allDayRow|All-day/);
  assert.match(week, /allowPinch/);
  assert.match(week, /nextCountFromPinch/);
  const stepper = read('src/components/calendar/MultiDayStepper.tsx');
  assert.match(stepper, /MULTIDAY_COUNTS/);
  assert.match(stepper, /3/);
  assert.match(stepper, /5/);
  assert.match(stepper, /7/);
});

test('CAL-30 lean composer: no Reminder/Travel/URL/Attachments/Invitees/Alert/Repeat UI', () => {
  const composer = read('src/components/calendar/EventComposer.tsx');
  assert.match(composer, /CAL-30|lean/);
  assert.match(composer, /Who can see this/);
  assert.match(composer, /REVIEW_DRAFT_BANNER|Review draft/);
  assert.match(composer, /Calendar/);
  assert.match(composer, /roleTint/);
  // Controls absent (comments may mention banned fields).
  assert.doesNotMatch(composer, /label=["']Reminder["']|label=["']Travel/);
  assert.doesNotMatch(composer, /label=["']Invitees["']|label=["']Attachments["']/);
  assert.doesNotMatch(composer, /label=["']Alert["']|label=["']Repeat["']|label=["']URL["']/);
  assert.doesNotMatch(composer, /accessibilityLabel=["']Reminder["']/);
});

test('CAL-25 Year spine: 2-col + role dots; no publish-queue control', () => {
  const year = read('src/components/calendar/YearGrid.tsx');
  assert.match(year, /2-col|rows\.push/);
  assert.match(year, /roleTintColor/);
  assert.doesNotMatch(year, /label=["']Inbox["']|accessibilityLabel=["']Inbox["']/);
});

test('CAL-34 Calendars sheet tint dots; Unsubscribe ≠ Delete; no publish-queue control', () => {
  const sheet = read('src/components/calendar/CalendarsSheet.tsx');
  assert.match(sheet, /tintDot|roleTintColor/);
  assert.match(sheet, /Unsubscribe/);
  assert.match(sheet, /Enable|Disable|On|Off/);
  assert.doesNotMatch(sheet, /label=["']Inbox["']|accessibilityLabel=["']Inbox["']/);
  assert.doesNotMatch(sheet, />Delete</);
  assert.match(sheet, /useReducedMotion|Animated\.spring/);
});
