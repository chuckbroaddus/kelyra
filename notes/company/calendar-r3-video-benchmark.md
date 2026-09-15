# CAL-R3 Video Benchmark — Apple Calendar iPhone Recording (2026-09-14)

**Source:** iPhone Screen Recording ~13:17, 124s, 1126×2436, dark mode.  
**Frames:** `notes/company/calendar-r3-iphone-frames/` (2s samples + extras).  
**Purpose:** Shot-by-shot inventory of views, chrome, gestures, motion, create-event flow. Cite frames. Note iOS Calendar behaviors.

## 0. Recording Overview
- Duration: 124s
- Starts in Year view
- Navigates: Year → Month list → Day → Week → Multi-day → Calendars sheet → New Event sheet → date picker → color picker
- Dark mode throughout
- Gestures: tap, swipe, pinch (for multi-day)

## 1. Year View (t000s-year.jpg, t004s-year-scroll.jpg)
- 2-column grid of mini-months (2026 left, 2027 right?)
- Header: "2026" or year nav, Today button, Calendars, Inbox
- Tap month header or day to drill

## 2. Month + List View (t010s-month-list.jpg)
- Month header with compact week strip (Sun-Sat dots or days)
- Below: vertical list of days with events
- Tap day → Day view

## 3. Day View (t022s-day.jpg)
- Timeline with hour gutter (left)
- All-day strip at top
- Timed event blocks with color bars
- Swipe or nav to adjacent days

## 4. Week View (t030s-week.jpg)
- 7-column timeline (Sun–Sat)
- All-day row across top
- Hour labels left
- Event blocks span columns if multi-day?

## 5. Multi-day View (t034s-multiday.jpg)
- ~4 day columns (pinch/zoom gesture from week?)
- Similar timeline structure
- Custom iOS Calendar multi-day (not standard month)

## 6. Calendars Sheet (t042s-calendars-list.jpg)
- List of calendars: Google account, SportsYou (subscribe), US Holidays, Show All
- Toggles per calendar
- Account sections

## 7. New Event Sheet (t054s-new-event.jpg, t062s-new-event-date.jpg, t070s-calendar-picker.jpg)
- Tabs: Event | Reminder
- Fields: All-day toggle, Starts/Ends (with inline month grid date picker), Travel time, Repeat, Calendar (color picker), Invitees, Alert, Attachments, URL, Notes
- Color dots for calendars (Home/Work/Family + Gmail)
- Sheet presentation with standard iOS sheet motion

## 8. Motion & Transitions Observed
- Sheet slide-up / dismiss
- View changes with smooth nav
- Date picker inline grid expand
- Color picker grid

## 9. iOS Calendar Version Behaviors Noted
- Year: 2-col mini months with year range
- Week: 7-col full week
- Multi-day: pinch-zoom custom ~4-col
- New Event: rich sheet with inline DATE-P1-like picker and color swatches
- No "hats" or teacher-specific; pure consumer calendar

**Notes for designer:** Exact chrome, gestures, sheet fields, color picker UI to emulate where possible. Frames provide visual reference.

## 10. Extra Frames Inventory
- t004s-year-scroll.jpg: shows vertical scroll in year grid
- All frames dark mode, high-res iPhone capture
- No visible "SportsYou Calendar" as app chrome (notification only)