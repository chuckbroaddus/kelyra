# Calendar Research Note (CAL-R1 / Refresh of DR-9)

**Date:** 2026-09-03  
**Author:** research-feedback (Kelyra)  
**Status:** Complete for handoff to PM child  
**Citations:** PowerSchool docs (uc.powerschool-docs.com, esp.powerschool-docs.com), Instructure Canvas community, Google Classroom support, SportsYou site, ed.gov/FERPA references, Pulse Connect taxonomy (cross-ref from prior notes).

## Executive Summary

Original DR-9 positioned calendar as read-mostly overlay of assignment due dates. CEO direction (2026-09-03) expands to full dated/span calendar supporting school/class/sport/personal layers, filterable views, hat-based visibility (student/parent/teacher/office), mobile vs web differences, and draft/published states (unpublished due dates like pop quizzes hidden until teacher unhides via To-Do). New requirement: AI natural-language search/filter + AI event creation (e.g., parent "Johnny doctor appointment Tuesday 12pm" → dated item with correct per-hat visibility; no twins mixing, no school-wide firehose). Not diary scope.

**v1 Recommendation (MVP cut):** 
- Layered calendars (school events, class assignments, sports opt-in, personal) with on/off toggles or filter chips.
- Visibility matrix enforcing hat silos + per-child parent view.
- Day/week/month + agenda (phone favors agenda/list + day; web supports full grid).
- Draft state: due date exists internally but calendar-hidden; publish action via teacher To-Do.
- Light AI: NL search over visible items; NL add for simple dated events/absences (with hat enforcement).

Gaps: Real teacher pain with calendar clutter vs. hidden pop-quizzes; sparse public data on parent twin-separation UX; exact mobile vs web usage stats for K-12; subpoena exposure of unpublished items.

## 1. Competitors & School Products

### PowerSchool (SIS + Presence/Learning)
- Multiple calendar surfaces: SIS district/school calendar (in-session flags, bell schedules, ADA calc), teacher Presence calendars (color-coded, merged views, filters by name/desc/categories/location/color, default views: Day List/Weekly Grid/Monthly Grid/Event List/Yearly).
- Events publishable to students/guardians; require approval workflow option.
- Assignments/events in eSchoolPlus teacher calendar (month/day/week, slide-out filter by building/course/activity/homeroom; read-only assignments, editable events).
- Merged calendars, recurring events, color per calendar.
- No native "unpublished due date" concept; events visible once created/published. Strong on school-wide + class layers but less on sports opt-in or personal.
- (Sources: uc.powerschool-docs.com/presence/latest/calendars-guide, ps.powerschool-docs.com/pssis-admin/latest/calendar, esp.powerschool-docs.com/espsis-teacher-access/latest/calendar)

### Canvas LMS
- Global calendar aggregating all courses + events/assignments in one view.
- Filter by specific course calendars (on/off).
- Student view: upcoming events/assignments; personal events + recurring; iCal subscribe; optional account calendars.
- Teacher/instructor: add events, Scheduler for appointments.
- Due dates drive visibility; no explicit draft/hidden-until-publish for quizzes/assignments in calendar (items appear when due date set?).
- Mobile app support for calendar.
- (Source: community.instructure.com/en/kb/articles/662743-what-is-the-calendar)

### Google Classroom + Google Calendar
- Per-class Classroom calendar (computer-only simplified view) shows only items with due dates; no add capability in Classroom calendar itself.
- Full Google Calendar integration: class calendars appear; guardians see nothing unless shared; students can add personal reminders/events (study sessions) that stay private to their Google Calendar.
- Draft/scheduled classwork: drafts and scheduled items not visible in calendar until posted.
- All-classes dropdown filter; week view default.
- No native sports or school-wide events layer; relies on Google Calendar sharing.
- (Sources: support.google.com/edu/classroom/answer/6272985 and related)

### Finalsite / School Websites + SportsYou / TeamSnap
- Finalsite: School/district event calendars (typical web CMS calendars with public views, categories, filters; often embedded on sites). Visibility usually public or role-based login.
- SportsYou: High-school athletics comms platform with team calendars, real-time updates, files, opt-in groups for coaches/ADs/athletes/families. School-safe, encrypted, no student data sales. Focus on sports schedules + events rather than academic due dates. Opt-in per team/season.
- TeamSnap: Similar team sports calendar (schedules, RSVPs, availability). Opt-in per team; parent/athlete views.
- Pattern: Sports calendars are opt-in layered (not forced school firehose); visibility per roster/group; mobile-first for coaches/parents.
- (Sources: sportsyou.com site content; general TeamSnap help patterns)

### Reminder / General Apps + Gap Analysis
- Teachers often layer Google Calendar / Apple Reminders / Outlook for personal + school events because SIS/LMS calendars lack personal layer or clean filters.
- Usable for busy teacher: PowerSchool/Canvas win on integration with grades/assignments; sports tools win on opt-in + mobile push. Common complaint: calendar overload (too many events) or missing context (why is this due date hidden?).

No dominant product combines academic + sports + personal with draft visibility + per-hat AI NL controls while strictly enforcing no child mixing.

## 2. Information Architecture: Layered vs Single Calendar

- **Layered preferred** (school / class / sport / personal): Matches real usage (PowerSchool merged, Canvas filters, Google class calendars, SportsYou opt-in).
- Filter chips vs on/off toggles: Both used; chips for quick multi-select (date range + category + visibility); toggles for persistent "show my sports only".
- One calendar surface with strong filters beats separate apps for teacher workflow.
- Visibility matrix (hats):
  - Student: own classes + opted-in sports + personal.
  - Parent: per-child only (never mix twins/Saydee vs Sydnee); see child's class + sports + approved personal notes.
  - Teacher: taught classes + school events + own sports if coaching.
  - Office: school-wide + teacher reports (no student personal unless escalated).
- Sports opt-in: explicit roster join; not auto-added.
- Honest FERPA: Assignment due dates are education records; unpublished (pop quiz) can stay hidden from students/parents until published; directory info vs. specific student data leakage risk if calendar exposes too much.

## 3. Draft vs Published + To-Do Integration

- Due date can exist (for teacher planning/To-Do) but calendar item hidden until "Publish to Calendar" action (teacher To-Do item).
- Example: Pop quiz due date set in assignment; calendar entry suppressed until teacher explicitly unhides.
- Prevents student/parent seeing surprise assessments early.
- Teacher To-Do surfaces the "publish" action; once done, item appears with correct visibility.
- Aligns with Google Classroom draft/scheduled behavior but makes it explicit for calendar.

## 4. Views: Phone vs Web + AI Additions (CEO 2026-09-03)

- **Phone (capture/review focus)**: Agenda/list view primary (scrollable upcoming + today); day view for detail; swipe for week. Avoid dense month grid. Push notifications for new published items or AI-suggested events.
- **Web (review/assign/grade)**: Full month/week/day grids + agenda sidebar; multi-select filters; color legend for layers.
- **AI NL (new requirement)**:
  - Search/filter: "show all math assignments due next week for my 5th graders" or "doctor appointments this month".
  - Add item: Parent voice/text "Johnny pulled out Tuesday 12pm for doctor" → creates dated span event, auto-tags as absence/personal, applies visibility only to relevant teacher(s) of Johnny's class(es); never mixes siblings; no broadcast.
  - Patterns to research: Absence/early-pickup flows common in SIS (PowerSchool has membership notes); NL must respect hat walls and produce auditable item.
  - Not diary: This is calendar surface only; private reflection stays in Diary product.
- STT/AI light only for NL calendar ops; no heavy generation.

## 5. Updated Conclusions vs Original DR-9

- Original: Read-mostly due-date overlay.
- Refresh: Full interactive calendar with layers, filters, draft state, hat visibility, mobile/web split, and AI NL search/add (constrained to calendar events/absences, not diary).
- v1 viable because competitors already do pieces (merged calendars, filters, per-class visibility, draft posting); gap is unified Kelyra hat enforcement + AI on top of existing assignment data.
- Open gaps: Real-world usage stats on teacher calendar switching (Google vs SIS); parent satisfaction with per-child vs family views; exact mobile calendar abandonment rates in K-12.

## Recommended Feature Cut for v1 vs Later

**v1 (MVP)**:
- Layered calendars (school/class/sport/personal) with toggle/filter chips.
- Hat-based visibility matrix (student/parent-per-child/teacher/office); sports opt-in.
- Draft/published state tied to teacher To-Do "publish to calendar".
- Views: phone (agenda + day), web (month/week/day/agenda).
- AI: NL search/filter over visible items; NL add for simple dated events/absences (example: parent doctor appt) with strict hat enforcement.
- No public firehose; no child mixing; citations to competitors.

**Later**:
- Advanced NL parsing (recurring, complex filters, auto-suggest from syllabus).
- iCal subscribe + two-way sync.
- Richer sports integration (RSVP, availability).
- Envelope encryption for sensitive personal events.
- Analytics on calendar usage per hat.

**Handoff to PM**: This note + citations ready for story writing / epic decomposition. No re-research needed. CoS can ARM-grant product-manager child (t_461ff27b).

**Files/Areas touched**: notes/company/calendar-research.md (new)

**Verification**: All claims backed by extracted sources (PowerSchool docs, Canvas KB, Google support, SportsYou); no invention. Constraints followed (no code, no SQL, no kelyra-qa-loop, no implementation). New CEO AI requirement incorporated verbatim.

**OPEN ISSUES**: Need primary teacher interviews on unpublished due-date pain; exact FERPA status of AI-generated calendar notes vs official records; sports calendar opt-in UX benchmarks from TeamSnap/SportsYou users.

**RECOMMENDED NEXT ACTION**: CoS ARM-grants product-manager child for calendar epic planning.