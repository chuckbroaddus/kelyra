# CAL-R3 implement — CEO send 2026-09-14 “Do Engineering”

**Launch `kelyra-qa-loop` only.** Do not implement in the Hermes parent. No ask_user_question. No git commit/merge/push. No live SQL apply (name files for devops-release).

## OBJECTIVE
Ship CAL-R3 hybrid lock: Apple Calendar iPhone **density + motion** on Kelyra Calendar **without** breaking hats, twins, assign≠publish, hidden quizzes, CE-A, Desk, Diary.

**Binding:** `notes/company/calendar-r3-pm-lock.md`  
**Intent:** `notes/company/calendar-r3-intent.md`  
**Motion:** `notes/company/calendar-r3-motion.md`  
**Delta:** `notes/company/calendar-r3-delta-vs-current.md`  
**Frames:** `notes/company/calendar-r3-iphone-frames/`

Dual IQG APPROVED (PM t_6cfc3988 + QAS t_0e246d9f). Parent t_b366690c stays parked.

## MUST SHIP (R3-C views + lean composer)
1. **Day:** hour gutter + all-day strip + timed blocks (`DayColumn.tsx` → timeline, not card list). Keep Hidden badge teacher.
2. **Week:** denser 7-col + all-day row + hours; **phone week** available (not tray).
3. **Year:** 2-col mini-months; dots ≤4 role tints; Today; not Desk home; **no Inbox**.
4. **Month:** grid and/or month+list hybrid.
5. **Multi-day:** pinch week↔~3–5 cols; **reduced-motion:** 3/5/7-day stepper (no pinch).
6. **Sheets:** spring present/dismiss; RM = fade/instant.
7. **Composer:** KEEP lean — title, DATE-P1 (± month skin only), all-day, kind/category, body, AI draft-then-Save, visibility caption, Calendar layer row ≤4 tints. **DROP** Reminder tab, Travel, URL, Attachments, Invitees. Omit Alert/Repeat unless editor already exists.
8. **LF-A chips stay primary.** Calendars sheet: keep Enable/Disable/Unsubscribe; tint dots; no Apple Inbox.
9. **CE-A hold:** drawer + quiet Desk link; **no 6th tray**; Desk Today/This week unchanged.

## NEVER
6th tray; Desk=year home; Diary/Reminders on Calendar; rainbow per-cal colors; `teaches_class` for family/hidden; twin mash; assign=publish; FullCalendar/Wix Agenda as product shell; EXPO_PUBLIC keys; invented View-stroke glyphs.

## SECURITY (copy)
CAL-S1-01–12 and CAL-S2-01–10 still law. Filters ≠ security. `p_seat` occupancy. Family published-only.

## ORDER (one loop, slices if needed)
A) Day timeline + week denser + sheet motion + composer polish  
B) Year + month  
C) Multi-day pinch + RM stepper  

All slices in this request. Prefer A+B+C green; if time-box, A then B then C — do not ship pinch without RM stepper.

## ACCEPTANCE
- Loop passed/escalated/complete
- Phone: year, month, day timeline, week, multi-day or RM stepper
- Lean composer; no Reminder tab
- Hidden/twins/CE-A/Desk intact
- Name SQL filenames if any
- No FullCalendar

## NEXT
CoS: SQL → devops-release; leftover P2/P3 sticky; QAS prove-out OBJECTIVE then QE. Hold git until Chuck ship.
