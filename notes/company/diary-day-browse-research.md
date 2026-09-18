# Diary Day-Browse Research (DIARY-R1)

**Date:** 2026-09-17  
**Author:** research-feedback (Kelyra)  
**Status:** Complete for handoff to ui-ux-designer  
**Citations:** src/app/diary.tsx, src/app/calendar.tsx, src/components/calendar/*, src/lib/diary/*, src/lib/chrome/trayTabs.ts, notes/company/diary-ledger-research.md, notes/company/calendar-r3-delta-vs-current.md, INTENT_QUALITY_GATE.md (IQG skip for research)

## Executive Summary
Diary currently uses plain text date-range filters (From/To YYYY-MM-DD TextFields + Apply) for journal entries grouped by `entry_date`. Calendar uses rich visual chrome (MonthGrid, DayColumn, MultiDayStepper, YearGrid, AgendaList, tint dots, view chips for Agenda/Day/Week/Days/Month/Year). CEO direction: Diary day-browse should reuse the *kinds* of visual elements for picking/scrolling days (same look/feel for navigation) while keeping Diary and Calendar as fully separate products/functions (no events, no layers, no composer merge). Research inspects current code; produces Keep/Add/Change/Drop candidates only. No design lock, no code, no staffing.

## 1. Hats / chrome entry
- **Teacher:** Diary accessible via tray (per trayTabs.ts + prior SETTINGS research); day-browse chrome lives inside Diary screen (replaces or augments current journal filters). Dual-hat teacher/parent uses signed-in chrome only (diarySeatForChrome resolves to 'teacher' or 'parent').
- **Staff (office):** Hamburger menu Diary (no tray slot); day-browse inside Diary.
- **Parent:** Hamburger Diary; supports multi-child chips (multiChild logic in diary.tsx); day-browse scoped to focused child.
- **Student:** None (canOpenDiary false; seat null).
- **Where day-browse lives:** Inside the Journal segment of Diary (primary); Ledger segment keeps current list+range filters (no visual day chrome). Per-hat seat gates entry but browse UI is shared post-auth.

## 2. Current vs Calendar primitives

| Calendar browse element | Current Diary equivalent | Transfer as browse chrome? | Calendar-function only (keep out of Diary) |
|-------------------------|--------------------------|----------------------------|-------------------------------------------|
| MonthGrid / YearGrid | None (text dates) | Yes: visual month/year picker for jump-to-day | No |
| DayColumn | None | Yes: single-day detail view for entries on that day | No |
| MultiDayStepper / Days view | None | Yes: pager/stepper for scrolling consecutive days of journal entries | No |
| AgendaList | List grouped by entry_date | Yes: day-grouped agenda of entries (adapt for journal) | No |
| TeacherWeekGrid | None | Yes: week overview with entry counts/dots | No |
| View chips (Agenda/Day/Week/Days/Month/Year) | None (always list) | Yes: switch between day-browse modes inside Journal | No |
| Tint dots (dayTintSeeds, roleTint) | None | Partial: entry-presence dots (not event tints; owner-only) | Event/layer tints, CalendarsSheet, category chips, unsubscribe |
| EventComposer / CalendarsSheet | Composer is Diary-internal (createDiaryEntry) | No | Yes: all event creation, layers, dues, hidden quizzes, sports |
| Stepper + range shift (shiftDay, multidayRangeContaining) | diaryFilterDate + manual text | Yes: reuse date-range logic kinds for visual | No |

**Summary:** Browse chrome kinds (grids, steppers, day columns, agenda grouping, presence dots) transfer as Diary day-browse. All event/layer/composer/sheet functions stay Calendar-only. No merging.

## 3. Journal vs Ledger
CEO asked specifically about diary *entries* (private, rich media, owner-only, STT, photos per diary-ledger-research.md). Recommend:
- **Day-browse: Journal-only** (primary surface for visual day navigation of entries).
- **Ledger:** Keep current list + range filters + family chips (immutable event log; not "browse" like journal; no visual grids/steppers).
- Never merge Ledger with Calendar (explicit non-goal). Ledger stays Diary-internal.

## 4. Lifecycle
- **Pick a day:** Visual grid (month/year) or stepper → sets focused day; list shows entries for that day (or range).
- **Change day:** Tap adjacent in MultiDayStepper / DayColumn / grid cell.
- **Scroll multi-day:** MultiDayStepper or swipe/pager on Days view; loads entries across consecutive days.
- **Empty day:** Placeholder ("No entries yet") + quick-create affordance (still Diary composer).
- **Jump to today:** "Today" button (like calendar today anchor).
- **Reverse/cancel filters:** Clear button on date range / view; resets to default newest-first or current day.
- **Create/edit/delete:** Remain exclusively on Diary (createDiaryEntry etc.); no Calendar + path. Composer stays in Diary.

## 5. Multiplicity
- **2+ children:** Parent hat shows child chips (existing multiChild logic); day-browse scoped per focusedChildId (never mixes twins).
- **Teacher class/student chips:** Keep separate from day chrome (student pointer is soft filter on journal entries; day chrome is orthogonal date navigation).
- **Phone vs web:** Phone: bottom-sheet or compact grids; web: full sidebar grids + main list. Responsive via existing Screen/layout.

## 6. Non-goals (explicit)
- No Calendar events on Diary.
- No Diary body on Calendar.
- No 6th tray.
- No FullCalendar/Wix.
- No Reminders product.
- No merging routes.
- No Office-visible journal.
- No student Diary.
- Ask NL stays t_cecf2af0.

## 7. Competitors / analog
Private journals with calendar-strip / day-pager:
- **Day One:** Prominent calendar strip + day pager for private dated journal entries; visual day navigation without any shared "events".
- **Apple Journal:** Day-based navigation and suggestions; private, owner-only; no school calendar merge.
Evidence for "same look, different function": visual day-browsing chrome is familiar and low-friction for dated personal content; school Calendar remains the shared events/layers surface. Supports CEO intent without product merge.

## 8. Risks
- **FERPA/owner-only:** Already enforced (privacy.ts, diary.security.test.ts, owner-only RLS); day-browse must not leak via shared tint dots.
- **Tint dots leaking existence:** Do not reuse event/role tints; use neutral presence dots or entry-count only (owner-only).
- **Reusing Calendar components vs forking look:** Risk of accidental function bleed; recommend forking visual primitives or thin adapters (researcher does not decide).
- **DATE-P1 overlap:** DATE-P1 shipped for composer dates; day-browse chrome is new navigation layer (no conflict if kept separate).
- **Twin law / multi-child:** Must preserve fail-closed empty state.

## Keep / Add / Change / Drop Candidates

| Area | Candidate | Action | Rationale |
|------|-----------|--------|-----------|
| Date entry | Text From/To fields | Change | Replace/augment with visual MonthGrid + DayColumn for pick |
| List view | Flat list | Change | Add AgendaList / DayColumn grouping for day-browse |
| Navigation | None | Add | MultiDayStepper, view chips (Days/Week/Month), Today jump |
| Dots | None | Add | Neutral entry-presence dots (Journal only) |
| Ledger | Current range | Keep | No visual day-browse chrome |
| Event functions | All Calendar | Drop | Never bring into Diary |
| Student chips | Existing | Keep | Orthogonal to day chrome |
| Composer | Diary-internal | Keep | Stays in Diary |

**RECOMMENDED NEXT ACTION:** CoS staffs ui-ux-designer (not parented onto IQG parent). Then PM ∥ QA Supervisor. No Eng until dual stamp.
