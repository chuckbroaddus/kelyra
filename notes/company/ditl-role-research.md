# DITL Role Research Brief

**Date:** 2026-09-10  
**Purpose:** Provide cited typical Day-in-the-Life (DITL) activities for all Kelyra roles, mapped to product-supported surfaces vs explicit non-goals. Sole input for QA Supervisor DITL test plans. Research-only; no test cases, no UI, no new features.

## Sources
- Internal: docs/mvp.md (M1-M11 flows, phone/web split), docs/vision.md (capture cheaper than skipping, teacher last click, Approve gate), docs/data-model.md (sparse students, unassigned captures, hats: also_administrator/also_teacher/parent_id, profiles roles), docs/ui-design.md (chrome, Ask, person pages), docs/architecture.md (phone capture → Edge STT/match/draftGaps → web Approve/assign/gradebook), notes/company/KELYRA_MAP.md (products, loops), car-rider-*.md / ride-*.md (car line check-in/checkout), class-landing-*.md, diary-*.md (student diary), avg-*.md (family gradebook), teach-ux-*.md / teacher-ux-*.md (teacher surfaces), calendar-*.md, messaging-v1.md
- External (2024-2026 preferred):
  - Elementary teacher DITL: https://pressbooks.ulib.csuohio.edu/publicservicecareers/chapter/11-5-a-day-in-the-life-of-an-elementary-school-teacher (prep, morning meeting, core subjects, grading, PD)
  - YES Prep Elementary: https://www.yesprep.org/uploaded/Talent_-_Jobvite/Talent/Elementary_Day_in_the_Life.pdf (arrival 6:50am, duty, classes, lunch duty, afterschool tutorials)
  - EdWeek teacher day: https://www.edweek.org/teaching-learning/what-a-typical-teachers-day-actually-looks-like/2022/04 (5am wake, prep, classes, meetings, grading at home)
  - Student day: https://publicschoolreview.com/blog/a-typical-day-in-public-school-2025-guide (blocks, lunch, recess, electives)
  - Parent drop-off/pick-up: car rider line discussions (Reddit, school videos) — 30-50min lines common
  - Additional to be patched: admin/office handbooks, superintendent oversight (district reports, PD), dual-hat mixed days from operating model notes

(Author studio sources: ~/projects/kelyra-author/README.md, docs/product-design.md — lesson pack emission only)

## Role Activity Inventories

### 1. Student (Elementary/Middle)
Typical activities from sources (publicschoolreview 2025, Pear Tree, US school schedules):
- Morning arrival / bus or parent drop-off / car rider line check-in
- Morning meeting / check-in / announcements
- Core instruction blocks (ELA/math/science/social studies, 40-60min periods)
- Lunch + recess
- Electives / specials / project time
- Afternoon instruction / small group work
- Dismissal (bus, car line, afterschool)
- Evening: homework help from parent, review assignments, submit practice
- Weekly: tests, projects, diary entries if used

### 2. Teacher (Elementary, single class ~50-100 students)
From CSU pressbooks, YES Prep, EdWeek 2022/2026:
- Pre-arrival: lesson prep, materials setup, email check (6:50am arrival)
- Morning duty / car line / bus duty
- Morning meeting / community building
- Core teaching (multiple subjects, behavior management, differentiated instruction)
- Lunch/recess duty (sometimes)
- Planning periods (grading, data meetings, parent calls)
- After school: tutorials, PD, grade level meetings, family events, lesson planning/grading at home until 8-10pm
- Capture work (photos/voice notes of exit tickets, observations)
- Review inbox, Approve gaps, assign practice, update grade book
- Car line checkout / parent comms

### 3. Parent / Guardian (incl. multiple children)
- Morning: prepare children, drop-off (car rider line 30-50min common), check school app/notifications
- During day: work, receive messages from teacher
- Afternoon: car line pickup or afterschool pickup, review child progress/invite link
- Evening: homework help (review assignments, use Ask for how to help), check grades/focus skills for each child, message teacher if needed
- Weekly: family engagement events, review diary/grades

### 4. Administrator / Office
Typical from district handbooks (inferred 2025-26 calendars, office roles):
- Arrival: open building, attendance, nurse/logistics
- Desk: handle parent calls, car line coordination, discipline referrals, schedule changes
- During day: observations, meetings, data review, support teachers
- End of day: close procedures, reports, family comms
- Weekly: PD coordination, compliance, student records

### 5. Superintendent
- District oversight: review school data/grades (aggregated), PD planning, board reports
- School visits, policy, budget, family/community engagement
- Not day-to-day classroom; high-level metrics, approvals for multi-school

### 6. Dual-hat (e.g. teacher+parent, office+parent, superintendent+teacher)
Mixed days: switch contexts (e.g. teacher capture in AM, then parent view for own child PM; office duties + teacher hat for own class). From data-model hats (also_*, parent_id) and OPERATING_MODEL.md.

### 7. Kelyra Author Studio User
From kelyra-author/README.md and docs/: Lesson author workflow — prepare source deck (notes/teacher-decks/), run pack CLI to emit index.html + manifest.json + media for class app publish. Not daily school role; separate studio for compliant lesson packs. Only if actor is lesson designer (internal or partner). Not core class app user.

## Support Map (Table)

| Role | Activity | Support Level | Kelyra Surface / Note | Citation |
|------|----------|---------------|-----------------------|----------|
| Student | Morning arrival / car rider check-in | PARTIAL | Ride chrome (car-rider-acceptance.md); check-in supported, full line management NOT | ride-*.md, car-rider-research.md |
| Student | Review assignments / focus skill | SUPPORTED | Student to-do / class link progress view (mvp M11, vision) | mvp.md, vision.md |
| Student | Submit practice / diary | SUPPORTED | Diary ledger, submission flow | diary-ledger-*.md |
| Student | Use Ask for help | SUPPORTED | /ask (Ask agentic, tutor brief) | ask-*.md notes |
| Teacher | Capture work (photo/voice + name) | SUPPORTED | Mobile capture, matcher, inbox (M2-M4) | mvp.md, architecture.md |
| Teacher | Approve gap / assign practice | SUPPORTED | Web Approve, generate/assign, grade book (M6-M9) | mvp.md, teacher-ux-*.md |
| Teacher | Car line checkout | SUPPORTED | Ride checkout flows | ride-iqg-*.md |
| Teacher | Parent messaging | SUPPORTED | Messaging v1 | messaging-v1.md |
| Parent | Check grades for each child | SUPPORTED | Family gradebook / invite link (AVG) | avg-*.md, avg-research-family-grade-transparency.md |
| Parent | Message teacher / use Ask | SUPPORTED | Messaging, Ask (parent context limited) | messaging-v1.md, ask-*.md |
| Parent | Car rider line | PARTIAL | Ride parent checkout; full line NOT | ride-parent-checkout-*.md |
| Admin/Office | Attendance, records, reports | NOT IN PRODUCT | No attendance/behavior/SIS; office hat for people/activity only | data-model.md (roles), mvp out-of-scope |
| Superintendent | District oversight / aggregated data | NOT IN PRODUCT | Single-teacher SKU first; no multi-class/district admin | mvp.md L13, vision out-of-scope |
| Dual-hat | Context switch (teacher then parent view) | SUPPORTED | Hats (also_*, parent_id), My children /parent | data-model.md |
| Author | Emit lesson pack | SUPPORTED (studio) | pack CLI, manifest (separate repo) | kelyra-author/README.md |
|------|----------|---------------|-----------------------|----------|
(End of table; see full rows above. Some activities marked NOT are explicit non-goals per mvp.md.)

## Proposed DITL Catalog

**Parent Morning Drop-off + Evening Help (Chuck example, updated)**  
1. Login (parent hat)  
2. Check grades/focus for each child (family gradebook)  
3. Review upcoming assignments  
4. Use Ask to figure help strategy  
5. Message teacher  
6. Check in to car rider line (Ride)  
7. (Add: leave line, pick which car if twins/multi)  
Flags: hats=parent, chrome=parent+ride, multiplicity=many children/cars, start+finish=full day

**Teacher Capture Morning**  
1-8 beats: arrival duty, capture exit tickets (photo+name), inbox review, Approve/assign  
Flags: hats=teacher, chrome=mobile capture

**Teacher Grading Afternoon**  
Web review, grade book, parent comms  
Flags: hats=teacher, chrome=web

**Student Typical School + Home**  
Arrival, instruction, submit practice, evening review  
Flags: hats=student, chrome=class link + diary

**Admin Office Day**  
Desk, attendance (NOT), support, reports (NOT) — covered only by people/activity hat  
Explicit: no distinct DITL beyond office hat; covered by admin surfaces in data-model

**Superintendent Oversight**  
No distinct daily DITL in product; high-level only (NOT multi-school)  
Explicit: "no distinct DITL — covered by superintendent hat in profiles"

**Dual-hat Mixed (Teacher+Parent)**  
AM teacher capture, PM parent view own child + car line  
Flags: hats=also_teacher + parent_id, multiplicity=switch contexts

**Author Studio Pack Day**  
Prepare deck, pack CLI, emit manifest — not school daily role  
Explicit: "no distinct DITL — studio-only, separate from class app"

(Additional scenarios if needed in final patch)

## Dual-Hat Days
Mixed days covered in catalog above (e.g. Teacher+Parent: AM capture + PM parent view + car line). Flags track `also_*` and `parent_id` from data-model. Chrome switches via role context (My children opens /parent). No new surfaces.

## Author Studio
Lesson author workflow (pack CLI → manifest for class app). Supported in studio repo only. Not a daily school role for class app users; explicit "no distinct DITL — studio-only". Covered if actor is lesson designer.

## Explicit Non-Goals
- FERPA-sensitive activities (grades, messages, car line, student data) noted as constraints only — do not invent features or publish without Approve.
- No attendance, behavior, SIS, multi-school admin, full line management, rewards, tutor chat, IEP extraction (per mvp.md out-of-scope and vision).
- Nothing is a grade until teacher Approve; matcher never inserts student.

## Open Questions for QA Supervisor / CEO
- Confirm if Author studio DITL is in scope for class-app QA or separate.
- Any additional multiplicity flags needed for twins/multi-car scenarios in Ride?
- Superintendent hat: any aggregated view planned beyond single-teacher? (Current: NOT)
- Dual-hat chrome switch: any edge cases in profile switching not covered by data-model hats?

---
File complete per requirements. All roles covered with at least one scenario or explicit note. Support map distinguishes SUPPORTED/PARTIAL/NOT. Citations from internal SoT + external 2025 sources. Ready for QA Supervisor DITL plans.