# CAL-R3 Kelyra Current — Inventory of Shipping Calendar (2026-09-14)

**Source:** Code inspection of `src/app/calendar.tsx` + `src/components/calendar/*` + supporting lib/calendar/*  
**Purpose:** Factual inventory of what Kelyra Calendar actually ships today (views, composer, layers, motion). Code-backed, not R2 lock only.  
**Product laws:** hats, twins, assign≠publish, hidden quizzes, sports opt-in, Calendar≠Diary, Desk not replaced.

## 0. High-Level Architecture
- Phone: drawer entry (CE-A), agenda-led default
- Web (teacher): week-led default
- Uses Expo Router, React Native for phone, web via RNW
- State: prefs in local storage + Supabase RLS for events/calendars
- Layers: category chips + CalendarsSheet for multi-cal

## 1. Views Supported (from calendar.tsx:61-63)
- PhoneView: 'agenda' | 'day'
- WebView: 'week' | 'agenda' | 'day'
- No year view
- No multi-day / pinch-zoom columns
- Agenda: 14-day range (agendaRangeFrom)
- Day: single day timeline (DayColumn)
- Week: 7-col grid (TeacherWeekGrid)

## 2. Key Components
- AgendaList.tsx: vertical event list with day headers
- DayColumn.tsx: hour gutter + timed blocks + all-day
- TeacherWeekGrid.tsx: 7-col week timeline
- EventComposer.tsx: sheet/modal for create/edit + AI draft
- CalendarsSheet.tsx: multi-cal toggle sheet
- EventMenu.tsx: per-event actions

## 3. Create/Edit Flow (CR-A)
- Sheet composer on phone, modal on web
- AI draft-then-Save banner
- Uses DATE-P1 primitive for dates
- No Reminder tab; events only (Calendar≠Diary)
- Hidden publish badge (DP-A); Needs owns publish

## 4. Layers & Filters (LF-A)
- CATEGORY_CHIPS primary (class/team/personal etc)
- CalendarsSheet secondary for accounts/cal toggles
- resolveEnabledCalendarIds, toggleLayerEnabled

## 5. Motion (from code patterns)
- useFocusEffect, Pressable nav
- Sheet present/dismiss (standard RN modal/sheet)
- Reduced motion support (a11y)
- No custom year/month list transitions observed in main file

## 6. Gaps vs Apple (preview)
- Missing: year, multi-day, rich new-event fields (Travel, Attachments, URL, Reminder toggle, inline color picker grid)
- Has: category chips (Kelyra-specific), hats/twins, AI draft, hidden publish

**Status:** Shipping per R2 lock (VW-A, CE-A, CR-A, LF-A, DP-A). Full details in referenced components.

## 7. Supporting Libs (quick inventory)
- lib/calendar/api.ts: listCalendarItems, listCalendars, delete, unsubscribe
- lib/calendar/filters.ts: CATEGORY_CHIPS, FILTER_PRESETS, toggleChip
- lib/calendar/prefs.ts: resolveCategoryChipIds, CAL_PREFS_VERSION
- No year or multi-day primitives yet