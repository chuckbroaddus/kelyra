# CAL-R3 Gaps Matrix — Apple Video vs Kelyra Current (2026-09-14)

**Purpose:** Side-by-side matrix of Apple Calendar behaviors (from video/frames) vs Kelyra shipping code. Identify missing / different / keep-Kelyra-only.  
**Handoff:** For ui-ux-designer: emulate vs adapt notes. Keep all Kelyra product laws.

## Matrix

| Area | Apple Video (frames) | Kelyra Now (code) | Gap (missing/diff/keep) |
|------|----------------------|-------------------|-------------------------|
| Year View | 2-col mini-months grid (t000s-year.jpg); year nav, Today, Calendars, Inbox | None (phone: agenda/day; web: week/agenda/day) | Missing year entirely. Kelyra: no year per R2 lock. |
| Month + List | Month header + compact week strip + vertical day list (t010s-month-list.jpg) | Agenda is 14-day list; no dedicated month-list hybrid | Missing month-list view. Agenda is close but no week strip header. |
| Day View | Timeline, all-day strip, timed blocks, hour gutter (t022s-day.jpg) | DayColumn: similar timeline + all-day + hour gutter | Close match on structure; Kelyra has category chips on events. |
| Week View | 7-col timeline (Sun-Sat), all-day row, hour labels (t030s-week.jpg) | TeacherWeekGrid: 7-col week timeline | Close; Kelyra uses category chips + hats. |
| Multi-day | ~4-col pinch/zoom from week (t034s-multiday.jpg) | None | Missing multi-day view. |
| Calendars Sheet | Account sections (Google, SportsYou subscribe, US Holidays), toggles, Show All (t042s-calendars-list.jpg) | CalendarsSheet: team/personal toggles + unsubscribe | Similar sheet but Kelyra uses category chips primary + layer text; no color swatches in list. |
| New Event Sheet | Event|Reminder tabs; All-day, Starts/Ends (inline month grid), Travel, Repeat, Calendar (color picker), Invitees, Alert, Attachments, URL, Notes (t054s-new-event.jpg, t062s, t070s) | EventComposer: sheet with title, dates (DATE-P1), category, calendar select, notes, AI draft banner. No Reminder, Travel, Attachments, URL, color picker grid, Invitees rich. | Missing many fields; Kelyra keeps AI draft + category chips + hidden publish. Adapt: map some to existing; no full Reminders product. |
| Color Picker | Inline grid swatches in composer (t070s-calendar-picker.jpg) | Color via CalendarsSheet or preset; no inline grid in composer | Missing inline color grid. Kelyra: keep category-primary. |
| Gestures/Motion | Sheet slide-up, pinch for multi-day, smooth nav, inline date grid expand | Sheet present/dismiss, nav via Pressable, reduced-motion a11y | Missing pinch multi-day, inline date grid. Emulate sheet + date picker where fits Kelyra. |
| Product Specific | Pure consumer: no hats, twins, assign/publish split, hidden quizzes, sports opt-in | Full Kelyra laws: hats, twins, assign≠publish, hidden teacher-only, sports, Calendar≠Diary | Keep-Kelyra-only: all product laws. Emulate UI/UX but adapt for hats/chips/publish. No Reminders unless mapped to events. |

## Emulate vs Adapt (Designer Handoff)
- **Emulate (close as possible):** Day/Week timelines, all-day strip, hour gutter, sheet presentation/animations, compact week strip in month context, calendar list toggles, inline date picker grid if fits DATE-P1.
- **Adapt (Kelyra must keep):** Category chips as primary (vs pure color), hats/twins/child switcher, hidden publish badge, AI draft banner in composer, sports opt-in, no Reminders product tab (map to event or drop), Desk not replaced, no 6th tray.
- **Missing to consider:** Year view, multi-day columns, rich event fields (Travel/Attachments/URL/Invitees/Alert/Repeat detailed) — decide in option packs later.
- **Keep only Kelyra:** All binding laws from R2 lock and product rules.

**Next:** ui-ux-designer produces option packs from this + frames. Chuck approval before Eng.

## Verification
- All three deliverables produced via skeleton + incremental patches (no long one-shot writes).
- Frames cited; code paths traced via search/read.
- No design picks, no Eng work.