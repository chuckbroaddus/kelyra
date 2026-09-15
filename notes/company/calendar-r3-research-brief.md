# CAL-R3 Research brief — Apple Calendar iPhone video → Kelyra delta

**Date:** 2026-09-14  
**CEO:** Chuck. Screen recording of UI he likes on iPhone. Wants Kelyra Calendar to keep **current Kelyra functionality** AND match this video’s **functionality + UI/UX as closely as possible** (year, week, day, multi-day, new-event UI, animations/transitions).  
**Do not implement. No kelyra-qa-loop. No SQL. No git. No Engineering.**

## Video (required)
Source: iPhone Screen Recording 2026-09-14 ~13:17, 124s, 1126×2436, dark mode.  
Frames copied for you (2s sampling, labeled):

`notes/company/calendar-r3-iphone-frames/`

| File | ~time | CoS pre-ID (verify; do not rubber-stamp) |
|---|---|---|
| t000s-year.jpg | 0s | Apple Calendar **year** — 2-column mini-months, 2026–2027, Today + calendars + inbox |
| t010s-month-list.jpg | 10s | **Month** header + compact week strip + **list** of days below |
| t022s-day.jpg | 22s | **Day** timeline, all-day strip, timed blocks, hour gutter |
| t030s-week.jpg | 30s | **Week** 7-column timeline (Sun–Sat), all-day row, hour labels |
| t034s-multiday.jpg | 34s | **Multi-day** ~4 day columns (pinch/zoom from week) |
| t042s-calendars-list.jpg | 42s | **Calendars** sheet: Google account, SportsYou subscribe, US Holidays, Show All |
| t054s-new-event.jpg | 54s | **New Event** sheet: Event \| Reminder, All-day, Starts/Ends, Travel, Repeat, Calendar, Invitees, Alert, Attachments, URL, Notes |
| t062s-new-event-date.jpg | 62s | Inline **month grid** date picker in composer (DATE-P1 analog) |
| t070s-calendar-picker.jpg | 70s | Calendar **color picker** (Home/Work/Family + Gmail calendars) |

SportsYou “Calendar” overlay in some frames is a **notification**, not the app. App = **Apple Calendar**.

## Current Kelyra (read; inventory)
- Lock: `notes/company/calendar-r2-pm-lock.md` VW-A agenda phone / week web; CE-A drawer; no year; no 6th tray
- Code: `src/app/calendar.tsx`, `src/components/calendar/*` (AgendaList, DayColumn, TeacherWeekGrid, EventComposer, CalendarsSheet)
- Product laws stay: hats, twins, assign≠publish, hidden quizzes, sports opt-in, Calendar≠Diary, Desk not replaced

## Deliverables
1. `notes/company/calendar-r3-video-benchmark.md` — shot-by-shot of the recording: views, chrome, gestures, motion, create-event. Cite frames. Identify iOS Calendar version behaviors (year, week, day, custom multi-day).
2. `notes/company/calendar-r3-kelyra-current.md` — what Kelyra Calendar **actually ships now** (views, composer, layers, motion). Code-backed, not R2 lock only.
3. `notes/company/calendar-r3-gaps.md` — matrix: Apple video | Kelyra now | Gap (missing / different / keep-Kelyra-only). Include year, week, day, multi-day, new-event, calendars list, animations.
4. Handoff for designer: what must be **emulated** vs **adapted** (Kelyra hats, chips, hidden publish, no Reminders product unless mapped).

## Constraints
Research only. Do not design option packs. Do not pick. Do not staff Eng. Incremental writes.

## Acceptance
Three files on disk. Usable by ui-ux-designer without re-watching 124s if they have the frames.

## Next
CoS staffs `ui-ux-designer` for option packs + **exact delta vs current** (Chuck must approve before Eng).
