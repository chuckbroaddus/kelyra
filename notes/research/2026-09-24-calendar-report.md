# Calendar — Research + Recommended Features Digest (R2)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**SoT pair:** `notes/company/calendar-research.md` · `notes/company/calendar-plan.md`  
**Also keep (unchanged architecture/security/acceptance unless noted):** sibling `*-architecture.md` / `*-security.md` / `*-acceptance.md`

This dated file is a **readable pack** for Chuck. Full detail lives in the SoT pair above.

---

## Top 5 P0 recommendations

1. **P0-1** — Category filters for full CEO taxonomy (school, class, lesson topic, assignment, quiz, study, test, project, sport, personal, absence) on the existing Calendar surface (not a greenfield app).
2. **P0-2** — Draft due dates never auto-publish; teacher Needs/To-Do **Publish to calendar** (pop quiz law) completed end-to-end.
3. **P0-3/4** — Hat visibility walls + twin/focused-child fail-closed (filters ≠ security).
4. **P0-5** — AI NL search/filter over the **already-visible** set only.
5. **P0-6** — AI NL add with preview + Save (parent doctor appointment → that child’s teachers only; never school firehose; never twin mix).

---

## Research (full SoT)

# Calendar Research Note (CAL-R2)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R2 (supersedes CAL-R1 / 2026-09-03 thin refresh of deep-research-9)  
**Cards:** Epic `t_908912d4` · related architecture/security/acceptance remain SoT for impl gates  
**Access date for all URLs below:** 2026-09-24 (America/Chicago)

**Related (do not rebuild):** Diary epic (separate) · Lesson plans `notes/company/lesson-plan-research.md` · Class landing `notes/company/class-landing-research.md`  
**Shipped ground (not greenfield):** `calendar-r3-kelyra-current.md`, `calendar-r5-intent.md`, `calendar-r5-pm-lock.md`, `calendar-3d-wheel-intent.md`, `calendar-architecture.md`, `calendar-security.md`, PersonTabs / CR-CalTabs notes.

---

## Executive summary

CEO wants a **full school calendar of anything with a date or span**: school events, sports, class activities, lesson topics, assignments, quizzes, study work, tests, projects — with category filters, hat walls (5th ≠ 3rd; parents only their kids; **twins never mixed**), day/week/month (+ research-backed extras), **draft due dates that do not auto-publish** (pop quiz) + teacher To-Do to publish, and **AI NL search/filter + AI add** (parent doctor appointment → correct teachers only).

**R2 verdict:** Kelyra Calendar is **not greenfield**. R2–R4 + CR-CalTabs already shipped a real Calendar surface (PersonTabs Y/M/W/D, category chips, Calendars sheet, Hidden/assign≠publish laws, hats/twins, AI draft-then-Save composer pattern). R5 polish and 3DW wheel are **design-stamped, Eng-gated**. The gap vs CEO ask is mostly **product completeness** (full dated taxonomy, NL search/add, publish To-Do end-to-end, sports opt-in depth) — not inventing a new calendar app.

**Copy from competitors:** layered calendars + course filters (Canvas, Presence); draft/scheduled hide (Google Classroom); sports **opt-in** (sportsYou); Day/Week/Month/Agenda (+ Year for orientation, Apple-like).  
**Skip:** full Google/Outlook clone; RSVP mesh; anonymous public school calendar; Diary-on-Calendar; office homework firehose.

---

## 1. What already shipped vs still open

Honest inventory grounded in company notes (code-backed R3 inventory + R4/R5/3DW locks). **Flag:** live DB column names may differ from architecture sketches — verify before Eng; this research does not invent migrations.

| Area | Status | Evidence / notes |
|---|---|---|
| Calendar route + tray/drawer entry | **Shipped** | R2–R4 live surface |
| PersonTabs Y / M / W / D | **Shipped** | CR-CalTabs one-row |
| Phone agenda/day defaults; web week emphasis | **Shipped** | `calendar-r3-kelyra-current.md` |
| Category Show chips (Academic / School / Sport / Personal spirit) | **Shipped** | LF-A HOLD through R5 |
| Calendars nested sheet under Settings | **Shipped** | stack law refined in R5 |
| Hats / dual-hat seat scope | **Shipped (law)** | fail-closed |
| Twins / focused child (CH-A) | **Shipped (law)** | never unlabeled merge |
| Hidden dues; assign ≠ publish | **Shipped (law)** | pop-quiz; Needs publish |
| AI draft banner → teacher Save | **Partial** | composer pattern; not full NL search/add |
| R5 12 chrome locks | **Partial / Eng-gated** | dual stamp MET; Eng dark until Chuck send |
| 3DW period wheel | **Partial / Eng-gated** | design stamp; Eng dark |
| Full `calendar_events` taxonomy (school/class/sport/personal/absence) | **Partial → Proposed** | architecture sketch exists; do not claim full live schema without verify |
| NL search over visible set | **Proposed (P0)** | CEO 2026-09-03 |
| NL add (parent doctor appt) with visibility | **Proposed (P0)** | CEO example |
| Teacher To-Do “Publish to calendar” completeness | **Partial → P0** | law exists; UX may still be incomplete |
| Sports team opt-in depth (roster, coach) | **Partial** | opt-in law; not sportsYou clone |
| iCal subscribe / two-way sync | **Proposed (P2)** | later |
| Diary on Calendar | **Out of scope** | separate epic |

---

## 2. Competitor & pattern analysis (citations)

### 2.1 Canvas LMS Calendar
- Global calendar aggregates all courses’ assignments + events; sidebar **course filter** (color boxes); Week / Month / Agenda; personal calendar; iCal feed; Scheduler optional.  
- Instructor: create events/assignments; drag-drop dates sync to Assignments/Syllabus/Grades.  
- **Copy:** one surface + per-class filters; personal layer; agenda on phone.  
- **Skip:** Scheduler appointment mesh; 10-calendar hard cap as product law (Canvas default — not ours).  
- Sources: [What is the Calendar?](https://community.instructure.com/en/kb/articles/662743-what-is-the-calendar); [Filter by course](https://community.instructure.com/en/kb/articles/662794-how-do-i-filter-the-calendar-view-by-course); [How do I use the Calendar?](https://community.instructure.com/en/kb/articles/662787-how-do-i-use-the-calendar). Accessed 2026-09-24 (America/Chicago).

### 2.2 Google Classroom + Google Calendar
- Classroom calendar (computer): due dates only; **cannot add**; guardians with email summaries **cannot** see Classroom calendar.  
- Google Calendar: class calendars; personal reminders stay private; guardians see nothing unless calendar shared.  
- Draft / scheduled classwork **not** visible until posted.  
- **Copy:** draft/scheduled hide until publish; guardians fail-closed by default.  
- **Skip:** relying on external Google Calendar as SoT; guardian-blind calendar as the only parent story (Kelyra parents need a first-class, hat-scoped agenda).  
- Source: [View due dates and events in a calendar](https://support.google.com/edu/classroom/answer/6272985). Accessed 2026-09-24 (America/Chicago).

### 2.3 PowerSchool Presence calendars
- Day List / Weekly / Monthly / Event List / Yearly views; category filters; search name/description/location/color; merge calendars; optional **admin approval** before publish; iCal/CSV import-export.  
- **Copy:** multi-view + category filters; optional approval for school-wide publish; merge school + class layers.  
- **Skip:** public-ish CMS calendar as default for student education records; event registration/waitlist mesh in v1.  
- Source: [Calendars Guide (Presence)](https://uc.powerschool-docs.com/presence/latest/calendars-guide). Accessed 2026-09-24 (America/Chicago).

### 2.4 Schoology (PowerSchool L&E)
- Course calendar: month/week/day; assignment/assessment dues appear automatically; homepage tools separate.  
- **Copy:** dues auto-project when published; course home ≠ calendar (join).  
- Source: [Schoology Calendar](https://uc.powerschool-docs.com/en/schoology/latest/calendar). Accessed 2026-09-24 (America/Chicago).

### 2.5 sportsYou (athletics)
- Team calendars, real-time schedule updates, opt-in teams, school-safe messaging; AD can filter teams by season; Pro adds advanced views / printable filtered calendars.  
- **Copy:** sports = **opt-in roster**, never school firehose; coach/AD scoped.  
- **Skip:** rebuilding sportsYou messaging inside Calendar.  
- Sources: [sportsYou](https://sportsyou.com/); [Calendar help collection](https://help.sportsyou.com/en/collections/4016731-calendar). Accessed 2026-09-24 (America/Chicago).

### 2.6 Apple Calendar view patterns (school-relevant UX)
- Day / Week / Month / Year / List; iOS 18 month density modes; pinch density. School apps often mirror Year→Month→Day hierarchy for orientation.  
- **Copy:** Year for orientation (Kelyra R4 HOLD); List/Agenda for phone; Month grid on web.  
- **Skip:** full EventKit two-way sync as v1 SoT.  
- Sources: [Change how you view events (Apple)](https://support.apple.com/guide/iphone/iph3d1110d4/ios); iOS 18 Calendar coverage (secondary). Accessed 2026-09-24 (America/Chicago).

### 2.7 Gap no competitor owns
No dominant K–12 product combines **academic + sports opt-in + personal/absence** with **Hidden pop-quiz**, **per-child twin walls**, and **AI NL under the same RLS seat** while refusing Diary conflation. That is Kelyra’s cut.

---

## 3. Information architecture

**Layered calendars on one surface** (school / class / academic work / sport / personal / absence), not separate apps.

| Layer | Who creates | Default filter | Visibility wall |
|---|---|---|---|
| School | Office | ON all hats | School-wide published |
| Class activity | Teacher of class | ON for enrolled / taught | Class roster only |
| Assignment / quiz / test / project / lesson topic | Teacher (via assignment or plan join) | ON when **published** to calendar | Enrollment + publish gate |
| Sport | Coach / AD | **OFF** until opt-in | Team roster |
| Personal / study | Owner | Owner ON | Self (share later) |
| Absence / pull-out | Parent (or office attendance later) | Relevant teachers ON | `student_teachers` of that child only — **not** school firehose; **not** twin |

**Filters ≠ security.** Chips only subset what RLS already allows (`calendar-security.md`).

---

## 4. Hat / visibility matrix (FERPA fail-closed)

| Item | Teacher (taught) | Student | Parent (child C) | Office |
|---|---|---|---|---|
| School event | Y | Y | Y | Y create |
| Class T event | If teaches T | If enrolled T | If C in T | Directory; not teacher personal |
| Published due (T) | Teaches T | Assigned/enrolled | C has item | **No** homework firehose v1 |
| **Hidden** due (pop quiz) | `class_teacher_of` only | **N** | **N** | **N** |
| Sport team | Coach / opted | Roster | C opted | School-marked announcements only |
| Parent doctor pull-out for C | Teachers of C’s classes | N | Parents of C | N default |
| Twin sibling | — | — | **Never** on C’s stream | — |

**Honest FERPA:** Published assignment dues are education-record-adjacent; Hidden stays teacher work product until publish. Kelyra does **not** claim “school official” status for AI vendors without DPA (`calendar-security.md`). Access date note: ED FERPA overview at [studentprivacy.ed.gov](https://studentprivacy.ed.gov/) — treat as primary; exact FAQ wording not re-fetched this pass if CDN blocked (**flag unverified verbatim**).

---

## 5. Views: research-backed + mobile vs web

| View | Research backing | Phone | Web |
|---|---|---|---|
| **Agenda / Day List** | Canvas Agenda; Apple List; Presence Day List | **Primary** | Sidebar / mode |
| **Day (timeline)** | Universal | Detail / Single mode | Detail |
| **Week (3/5/7)** | Teacher planning; R5 locks labels | Secondary | **Primary for teachers** |
| **Month** | Canvas default; Presence Monthly | Compact / List | Full grid |
| **Year** | Apple orientation; Kelyra R4 HOLD | Orientation | Orientation |
| Multiday | Presence / Apple | Later / R5 list covers continuous | Optional |

**R5 HOLD:** Week 3=TUE–THU, 5=MON–FRI, 7=full; range MM/DD/YYYY–MM/DD/YYYY; Day List continuous without date chevron.

---

## 6. Draft vs published + teacher To-Do

- Setting a due date **must not** auto-publish to student/parent calendars (pop quiz).  
- Google Classroom pattern: drafts/scheduled hidden until post.  
- Presence: optional admin approval for publish to shared calendars.  
- Kelyra law: `assign ≠ publish`; Hidden until teacher **Publish to calendar** from Needs / To-Do; re-hide is v1.1 per architecture.  
- Unpublished items remain on **teacher** calendar/To-Do only.

---

## 7. AI: NL search + NL add (CEO)

| Capability | Behavior | Safety boundary |
|---|---|---|
| NL search/filter | Parse over **already-visible** rows only | Never elevates RLS; twins confirm |
| NL add | Draft event → preview “who can see this” → **Save** | Never auto-publish; never create class/student; never Approve grades |
| Parent example | “Johnny doctor Tuesday 12pm” → absence/pull-out, `student_id=Johnny` after confirm, visibility = Johnny’s teachers only | Not school firehose; not sibling |

Stack ground: Expo client → Supabase RLS → Edge AI adapters. Ops/GTM notes use **Gemini** on Edge; `docs/architecture.md` still documents xAI adapter — **do not invent a stack rewrite** in this epic.

---

## 8. Cross-links

| Topic | Join rule |
|---|---|
| Lesson plans | Published plan may **occupy a calendar span by reference** — not duplicate body (`lesson-plan-*.md`) |
| Class landing | Landing shows **calendar slice join** — not a second calendar |
| Diary | **Never** on Calendar; reflection stays Diary epic |

---

## 9. Unverified / open research flags

- Exact live migration state of `calendar_events` / `calendar_visibility` columns — **verify in DB before Eng**; architecture is sketch.  
- Market share stats for Canvas vs Classroom calendars — **not invented**; qualitative only.  
- Parent satisfaction numbers for twin separation UX — **no public primary study found**; treat as product law not survey claim.  
- sportsYou internal roster API details — not needed; pattern only.  
- FERPA FAQ exact wording if ED fetch blocked this pass — use studentprivacy.ed.gov as SoT when Eng writes copy.

---

## 10. Open questions for Chuck

1. Confirm P0 = NL search + NL add + publish To-Do completeness on top of shipped chrome (vs pause for R5/3DW Eng first)?  
2. Office: school events only, or any aggregate “counts” without row dump?  
3. Sports: thin opt-in calendars now, or wait for AD hat?  
4. Parent pull-outs: notify all of C’s teachers always, or teacher-selected classes?  
5. iCal subscribe timing (P2) — any Spring Baptist demand now?

**RECOMMENDED NEXT ACTION:** Chuck reviews R2 research + `calendar-plan.md`; keep architecture/security/acceptance; Eng only after explicit send (not this card).


---

## Plan / recommended features (full SoT)

# Calendar Plan (CAL-P2 / R2)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R2 (upgrades CAL-P1 2026-09-03; grounded in shipped Calendar R2–R5/3DW/PersonTabs)  
**Research:** `notes/company/calendar-research.md` (CAL-R2)  
**Keep as SoT (still fit):** `calendar-architecture.md`, `calendar-security.md`, `calendar-acceptance.md` — this plan points to them; does not replace RLS law.  
**Stack ground:** Expo (iOS/Android/web) + Supabase (Auth/Postgres/RLS/Storage/Edge) + Edge AI adapters. Ops notes currently emphasize Gemini on Edge; `docs/architecture.md` still documents xAI adapter — Calendar must not invent a rewrite.

**Audience:** Chuck / CoS. **Not** an Eng send. No app/TS/SQL from this card.

---

## 0. Product law (one screen)

| Surface | Job | Not |
|---|---|---|
| **Calendar** | One dated/span surface of school · class · academic work · sport · personal · absence the **active seat** may see | Not Google Calendar clone; not Diary; not office homework firehose |
| **Assignment dues** | Grade-book `due_at` **projected** when calendar-published | Not auto-broadcast of every planned column |
| **Events** | First-class dated/span rows with explicit visibility | Not Feed; not Messages; not audit log |
| **Ask / AI** | NL search ⊆ visible set; NL **draft** add → confirm → Save | Not diary; not class-create; not grade Approve; not twin merge |

CEO bar: full dated school calendar + category filters + hat walls + draft≠publish + AI NL search/add (doctor example).

---

## 1. Shipped / Partial / Proposed (feature inventory)

### 1.1 Shipped (build on; do not re-spec as greenfield)

| ID | Feature | Notes |
|---|---|---|
| S1 | Calendar surface (mobile + web) | Live post R2–R4 |
| S2 | PersonTabs Y / M / W / D | CR-CalTabs |
| S3 | Category Show chips | Academic/School/Sport/Personal spirit; filters ≠ security |
| S4 | Settings → Calendars nested sheet | R5 stack law if Eng-sent |
| S5 | Hats + dual-hat seat scope | Fail-closed |
| S6 | Twin / focused-child wall (CH-A) | Never unlabeled merge |
| S7 | Hidden dues; assign ≠ publish | Pop-quiz law |
| S8 | Lean event composer + AI draft-then-Save pattern | Partial AI; Save required |
| S9 | Sports opt-in read concept | Not sportsYou |
| S10 | Day Single vs List modes | R4/R5 |

### 1.2 Partial / Eng-gated

| ID | Feature | Notes |
|---|---|---|
| X1 | R5 12 chrome locks | Dual stamp; Eng dark until Chuck send |
| X2 | 3DW period wheel | Design stamp; Eng dark |
| X3 | Hybrid projection (`due_at` + `calendar_events`) fully live | Architecture SoT; verify DB |
| X4 | Needs “Publish to calendar” To-Do UX completeness | Law exists |

### 1.3 Proposed (R2 priority)

| Pri | ID | Feature | Rationale |
|---|---|---|---|
| **P0** | P0-1 | Category filters covering CEO taxonomy (school, class, lesson topic, assignment, quiz, study, test, project, sport, personal, absence) | CEO must-have |
| **P0** | P0-2 | Draft due dates never auto-publish + teacher To-Do publish/unhide | Pop quiz |
| **P0** | P0-3 | Hat visibility matrix enforced in read model (student/parent/teacher/office) | FERPA fail-closed |
| **P0** | P0-4 | Twins never mixed; parent requires focused child | Product law |
| **P0** | P0-5 | AI NL search/filter over visible items | CEO 2026-09-03 |
| **P0** | P0-6 | AI NL add with preview + Save (parent doctor → student_teachers only) | CEO example |
| **P1** | P1-1 | Finish R5 chrome + 3DW when Chuck sends | Polish on live |
| **P1** | P1-2 | Lesson-plan span **join** (reference id + span) | Cross-epic |
| **P1** | P1-3 | Class-landing calendar slice join | Cross-epic |
| **P1** | P1-4 | Sport team roster depth (coach create, opt-in) | Thin, not sportsYou |
| **P1** | P1-5 | Recurring school events (simple) | Presence-like |
| **P2** | P2-1 | iCal subscribe (read-only) | Canvas pattern; later |
| **P2** | P2-2 | Two-way Google/Apple sync | Explicit non-goal for v1 |
| **P2** | P2-3 | RSVP / attendance on events | sportsYou depth later |
| **P2** | P2-4 | Public anonymous school calendar URL | FERPA; signed-in only v1 |

---

## 2. Needed vs Desired

| Needed (P0) | Desired (P1–P2) |
|---|---|
| Full dated taxonomy on one surface | Rich sports RSVP |
| Filters + hat walls + twin wall | iCal / external sync |
| Draft≠publish + Publish To-Do | Office homework aggregates |
| Day/Week/Month (+ Year/Agenda already in spine) | Advanced recurrence |
| AI NL search + AI draft add | Auto-suggest from syllabus |

---

## 3. Hat matrix (product)

| Hat | Can create | Can see | Cannot |
|---|---|---|---|
| Teacher | Class events; assignments; own study; publish/unhide taught-class dues | Taught classes + school + opted sport + incoming absences for roster | Other teachers’ personal; Hidden of non-taught; twin merge N/A |
| Student | Own study/personal thin | Enrolled published + school + opted sport | Hidden quizzes; other students; sibling |
| Parent | Absence/pull-out for linked child; own personal | Focused child’s published + school + child’s sport | Other child unlabeled; Hidden; school homework firehose |
| Office | School events | School + directory class events (not teacher personal; not hidden quizzes; not parent doctor notes) | Using calendar to mint students/classes |

Teachers do **not** create classes. Calendar does **not** widen `is_staff`.

---

## 4. UI/UX — mobile vs web

| | Mobile (Expo) | Web (Expo web) |
|---|---|---|
| Default | Agenda / Day List | Week (teachers) / Month (office) |
| Nav | PersonTabs Y/M/W/D; tray Calendar | Same tabs; denser grids |
| Filters | Chip sheet / gear | Persistent chip row + Calendars |
| Create | Sheet composer | Modal composer |
| AI | Ask sheet → draft card → Save | Same; keyboard-first |
| Density | List-first; avoid dense month as home | Month/week grids OK |

**HOLD:** Diary ≠ Calendar; Desk ≠ Year; filters ≠ security; R5 title first-tap; Clear Filters = deselect all.

---

## 5. AI safety boundaries

1. Search ⊆ visible set for active seat.  
2. Add = draft → “who sees this” preview → explicit Save.  
3. Never auto-publish. Never create class/student/link. Never Approve grades.  
4. Twin ambiguity → confirm picker.  
5. No health detail in logs (ids not “doctor for ADHD…” bodies).  
6. No “Ask as superuser.”

---

## 6. Implementation approach (no code here)

Grounded in `calendar-architecture.md` / `calendar-security.md`:

1. **Hybrid SoT:** keep `assignments.due_at` as grade due; project when calendar-published; do **not** duplicate dues into events.  
2. **`calendar_events`** for school/class/sport/personal/absence spans.  
3. **`list_calendar_items` SECURITY DEFINER** with seat predicates inside; client never wide-selects then filters.  
4. Hidden: `class_teacher_of` only — do not reuse office `teaches_class` bypass for family reads.  
5. Ask tools: `calendar_search` / `calendar_draft_event` as **new** calendar.* permissions — do not hang on `assignments.manage`.  
6. Ship increments: (A) publish To-Do completeness + taxonomy chips → (B) NL search → (C) NL add → (D) sport depth → (E) iCal.  
7. Join lesson-plan spans + landing slice by **reference**, not copy.  
8. Stack: Expo UI + Supabase RLS + Edge AI; reuse existing Calendar chrome.

**Gate:** No Eng until Chuck says send on a build card. This epic card is research/plan only.

---

## 7. Cross-links

- Research: `calendar-research.md`  
- Architecture / security / acceptance: keep; refresh cross-links only if stale stubs  
- Lesson plans: `lesson-plan-plan.md` § calendar span  
- Class landing: `class-landing-plan.md` § calendar slice  
- Diary: out of scope  

---

## 8. Open questions for Chuck

1. Send Eng on R5/3DW before or after P0 NL?  
2. Parent pull-out: all of child’s teachers vs pick classes?  
3. Office see any class homework rows ever in v1? (Plan recommends **no**.)  
4. Spring Baptist sports: which teams first?  
5. Confirm AI vendor posture copy for calendar NL (Gemini/xAI) stays “no school-official claim without DPA.”

**RECOMMENDED NEXT ACTION:** Chuck review; then optional PM story split — still no implementation from this card.

