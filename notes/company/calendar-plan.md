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
