# CAL-P1: Calendar feature set, UI/UX, implementation approach

**Date:** 2026-09-03  
**Author:** product-manager (Kelyra)  
**Card:** `t_461ff27b` · Parent research: `t_bd6d97f2`  
**Status:** Spec / plan only — **no app code**, no SQL, no migrations, no `IconName`, no kelyra-qa-loop, no git push.  
**Depends on:** `notes/company/calendar-research.md` (CAL-R1, 2026-09-03)  
**Also grounded in:** `docs/data-model.md` (`assignments.due_at`, hats, RLS posture), `docs/mvp.md` (phone capture / web review), `docs/ui-design.md` §13 / §29 (Today · This week · Coming due chips), `notes/company/teacher-ux-plan.md` (desk-centric IA), `notes/company/diary-ledger-stories.md` (hat walls, twin separation, draft-then-Save), CEO 2026-09-03 AI NL add via CoS.

**Audience:** CEO / Chief of Staff review. **Not** an implementation ticket. Do not staff `senior-developer` until Chuck says send.

---

## 0. One-line product law

| Surface | Job | What it is not |
|---|---|---|
| **Calendar** | One dated/span surface of **school · class · sport · personal** items the signed-in hat is allowed to see, with filters and light AI search/add | Not Google Calendar clone; not Diary; not car-rider queue; not Office firehose |
| **Assignment due dates** | Grade-book columns with `due_at` that **may** appear on Calendar when **published** | Not auto-broadcast of every planned column (pop quiz stays hidden until teacher unhides) |
| **Calendar events** | First-class dated/span rows (school day off, game, doctor pull-out, study block) with explicit visibility | Not `audit_events`; not Feed posts; not Messages |
| **Ask / AI calendar ops** | NL **search/filter** of already-visible items + NL **draft add** of simple dated items under hat walls | Not diary journal; not class-create; not grade Approve; not twin merge |

**CEO bar (from CAL-R1 + comment):** Complete dated/span calendar with category filters, hat/class walls (5th ≠ 3rd; parents only their kids’ classes; twins never mixed), day/week/month (device-appropriate), draft vs published + teacher To-Do unhide, and AI NL search + AI add (e.g. parent doctor appointment → correct teacher(s) only).

---

## 1. Problem statement (grounded)

Live Kelyra already has **due dates on assignments** (`assignments.due_at`) and light “Coming due” chips on the class Assignments list. There is **no first-class calendar surface**: no school/sport/personal layers, no draft-hidden pop quizzes, no parent per-child agenda, no office school calendar, no NL search/add.

Competitors cover pieces (PowerSchool merged grids, Canvas course filters, Google Classroom draft/scheduled hide, SportsYou opt-in team calendars) but none combine **Kelyra hat walls + assignment publish gate + AI NL under twin separation**.

**Teacher pain this solves:** plan a pop quiz with an internal due date without leaking it to students/parents; see this week’s class load without leaving Desk.  
**Parent pain:** one child’s doctor pull-out and homework due dates in one place — never Saydee’s events on Sydnee’s stream.  
**Office pain:** school-wide in-session / early-release without drowning teacher personal study blocks.

---

## 2. Explicit non-goals

Copy into any future implementation ticket. Fail closed.

| Non-goal | Why |
|---|---|
| Full Google / Outlook clone (two-way sync, free/busy, rooms, invites RSVP mesh) | Scope; Kelyra is school work surface first |
| Diary / personal journal on Calendar | Separate product (`diary-ledger-stories.md`); Calendar is dated **events + work**, not reflection |
| Car-rider / dismissal queue | Separate research track; different ops surface |
| Class create from Calendar or Ask | Teachers do not create classes; Office owns directory |
| Widen `is_staff` / office SELECT to student personal or parent doctor notes | FERPA minimization; hat walls |
| Auto-publish every assignment with `due_at` to student/parent calendar | Pop-quiz / surprise assessment requirement |
| School-wide firehose of every class’s homework to all parents | Parent sees **linked children only** |
| Mixing siblings (twins) into one unlabeled stream | Hard product law |
| Matcher invents students from NL (“add Maya”) | Unassigned / confirm only; no student insert from calendar AI |
| Ask Approves grades or writes `approved_score` | Core MVP law |
| iCal subscribe / external two-way sync in v1 | Later |
| Sports RSVP / availability / TeamSnap clone | Later; v1 is schedule layer + opt-in roster only |
| Public anonymous school calendar URL | Login + RLS only in v1 |
| Student role creates school-wide events | Student calendar is read + thin personal study only |
| Envelope E2E claims for calendar rows | Honest RLS + visibility matrix; no fake crypto theater |
| Replace Desk **Today / This week** with a month grid as home | TEACH-UX keeps Desk operational; Calendar is adjacent surface |

---

## 3. Category model (filter chips)

Canonical **category** values for calendar items (UI chips). Assignment rows map from existing `assignments.category` + `kind` where possible.

| Category id | Label (UI) | Typical sources | Default-on (see §5) |
|---|---|---|---|
| `school` | School | Office school events (holiday, early release, picture day) | All hats: **on** |
| `class` | Class | Class meetings, field trip for one class, class-only notices | Teacher: taught classes on; Student/Parent: enrolled/linked on |
| `lesson` | Lessons | `assignments.kind = lesson` with published due/window | Teacher/Student/Parent (scoped): **on** |
| `assignment` | Assignments / homework | `assignments` planned/practice/capture with published due | **on** when published |
| `quiz` | Quizzes | `assignments.category` quiz (or kind mapped) | **on** when published |
| `test` | Tests | test / midterm / final | **on** when published |
| `project` | Projects | project / presentation | **on** when published |
| `study` | Study | Personal or teacher-suggested study blocks | Owner default **on**; others only if shared |
| `sport` | Sports | Opt-in team/season calendars | **off** until user opts into a team |
| `personal` | Personal | Doctor, pickup, family — **not** Diary prose | Owner **on**; recipients per visibility only |
| `absence` | Absence / pull-out | Early pickup, appointment affecting attendance awareness | Creator + relevant teachers **on**; not school firehose |

**Filter UX:** multi-select ChipRow (Canvas/PowerSchool pattern). Persistent per profile + seat (local prefs OK v1; server prefs later).  
**“All academic”** preset = assignment + quiz + test + project + lesson + class.  
**Sport** never auto-joins from school roster — explicit opt-in (SportsYou pattern).

---

## 4. Visibility matrix (hat × item)

Hard walls. 5th-grade class calendar ≠ 3rd-grade. Parent of twins: **one focused child** at a time (or clearly labeled dual panes — never unlabeled merge).

| Item kind | Student | Parent (linked child C) | Teacher (taught class T) | Office (admin/super) |
|---|---|---|---|---|
| School event (`visibility=school`) | Yes | Yes | Yes | Yes (create/edit) |
| Class event for class T | If enrolled in T | If C enrolled in T | If teaches T (or co-teacher of T) | Directory view of school classes; **not** teacher personal |
| Published assignment due (class T) | If assigned / enrolled per existing student to-do rules | If C has that assignment in parent-visible progress | If teaches T | No homework firehose by default; optional aggregate **counts** later — not row dump v1 |
| **Draft / calendar_hidden** assignment | **No** | **No** | Yes (owner class) | **No** (not student-visible education surprise) |
| Sport team event | If on roster / opted in | If C opted in | If coach role on team | AD/office sport directory only if product adds AD hat later; v1 office sees school-level sport **announcements** only if marked school |
| Personal study (student-owned) | Owner only | No (unless student shares — out of v1) | No | No |
| Parent personal / doctor pull-out for child C | No | Owner parent(s) of C | Teachers of **C’s enrolled classes** only (awareness) | **No** by default (not attendance SIS substitute); optional later escalate |
| Teacher personal study | No | No | Owner only | No |
| AI-created draft (any) | Only after Save + visibility rules | Same | Same | Same |

**Twin rule:** Parent calendar queries **require** `child_student_id` (focused child). Switching child reloads the query. Never `WHERE parent_id = me` without child predicate for multi-child parents.

**Class wall:** Teacher multi-class: default filter = **active class** (Desk context) with optional “All my classes.” Never show Class B homework inside Class A desk calendar without an explicit “all classes” toggle.

---

## 5. Default-on filter presets by hat

| Hat | Default categories ON | Default scope | Notes |
|---|---|---|---|
| **Teacher** | school, class, lesson, assignment, quiz, test, project, absence (incoming pull-outs) | Active class + school | Sport off until coach opt-in; personal study on for self |
| **Student** | school, class, lesson, assignment, quiz, test, project, study (own) | Enrolled classes | Sport off until join; no other students’ work |
| **Parent** | school, class, lesson, assignment, quiz, test, project, absence (own created), personal (own) | **Focused child** only | Sport if child opted in; never other families |
| **Office** | school, class (directory), sport (school-marked only) | School | No teacher diaries; no parent doctor notes; no per-student homework list as default home |

---

## 6. Draft / hidden vs published-to-calendar

### 6.1 Product rule

Creating or editing an assignment **with a due date must not imply** student/parent calendar visibility.

| State | Teacher sees on Calendar | Student/Parent see on Calendar | Grade book column |
|---|---|---|---|
| `calendar_visibility = hidden` (default for quiz/test optional; explicit for pop quiz) | Yes (teacher layer) | **No** | Yes if assignment exists |
| `calendar_visibility = published` | Yes | Yes (per matrix) | Yes |
| No `due_at` | Not a dated calendar item (may still be grade column) | No | Yes |

**Pop quiz flow:**

1. Teacher creates assignment + due_at + category quiz, leaves **Hide on family calendar** (or kind default hidden).  
2. Item appears on **teacher** calendar + teacher To-Do: “Publish pop quiz to calendar?” optional.  
3. Student to-do / grade column behavior follows existing assignment rules (separate from calendar publish — PM decision: **calendar publish ≠ assign**. Assign seeds submissions; publish only controls calendar projection).  
4. Teacher completes To-Do **Publish to calendar** (or toggles on assignment form) → students/parents see dated item.

### 6.2 Teacher To-Do unhide

- Source: teacher Needs / To-Do cluster (align TEACH-UX **Needs**), not a separate product.  
- Card copy: “Publish to calendar: {title} · {date}”.  
- Actions: **Publish** · **Keep hidden** · **Open assignment**.  
- Publishing is auditable (who/when) — prefer append-only note on assignment or thin `calendar_publish_events` later; v1 can store `calendar_published_at` + `calendar_published_by` on assignment projection fields (impl approach §11).

### 6.3 Non-assignment events

School/class/sport/personal/absence events are **created visible to their audience** unless the creator marks **Draft** (teacher-only or office-only staging). Default for parent doctor note: **Save publishes to intended audience** (relevant teachers) after confirm — not a second To-Do.

---

## 7. User stories by hat

Acceptance is product acceptance for CEO review — not QA automation.

### 7.1 Teacher

**US-T-CAL-1 — Open class calendar**  
As a **teacher**, I open Calendar from Desk/drawer and see this class’s published + my hidden items for the selected range.  
**ACCEPTANCE:** Active class context; school layer included; other classes hidden unless “All my classes”; 5th ≠ 3rd.

**US-T-CAL-2 — Due date without family leak**  
As a **teacher**, I set a due date on a pop quiz without students/parents seeing it on Calendar until I publish.  
**ACCEPTANCE:** Form control **Show on student/parent calendar** default off for quiz/test (or explicit Hide); family queries exclude hidden; teacher calendar still shows.

**US-T-CAL-3 — Publish via To-Do**  
As a **teacher**, Needs/To-Do offers **Publish to calendar** for hidden dated assignments.  
**ACCEPTANCE:** One tap publish; item appears for enrolled students/linked parents; To-Do clears; reversible to hide again (optional v1.1 — v1 at least publish once).

**US-T-CAL-4 — Filter categories**  
As a **teacher**, I filter by category chips (tests only, hide sports, etc.).  
**ACCEPTANCE:** Multi-select; prefs remember per seat; empty state explains filters.

**US-T-CAL-5 — Views**  
As a **teacher on web**, I use month/week/day/agenda; **on phone**, agenda + day first.  
**ACCEPTANCE:** See §8 responsive IA.

**US-T-CAL-6 — NL search**  
As a **teacher**, I ask “math quizzes due next week in 5th” and get only items I’m allowed to see.  
**ACCEPTANCE:** Results ⊆ visible set; no cross-class leak; no hidden family items invented as visible.

**US-T-CAL-7 — NL add class event**  
As a **teacher**, I say “Field trip Friday 9–2 for this class” and get a **draft** class event to confirm.  
**ACCEPTANCE:** Draft-then-Save; bound to active/taught class; does not create class; does not enroll students.

**US-T-CAL-8 — See parent pull-out**  
As a **teacher**, when a parent logs “Johnny doctor Tuesday 12pm,” I see an absence/pull-out on my calendar for classes Johnny is in.  
**ACCEPTANCE:** Only teachers of Johnny’s classes; not school-wide; not other students.

### 7.2 Student

**US-S-CAL-1 — My agenda**  
As a **student**, I see school + my classes’ **published** work and lessons, plus my study blocks.  
**ACCEPTANCE:** No other students; no hidden quizzes; no teacher personal.

**US-S-CAL-2 — Add study block**  
As a **student**, I add a personal study span (tonight 7–8).  
**ACCEPTANCE:** Owner only; category study; not Diary.

**US-S-CAL-3 — NL search**  
As a **student**, “what’s due Friday” returns only my published items.  
**ACCEPTANCE:** Hat-scoped.

### 7.3 Parent

**US-P-CAL-1 — Per-child calendar**  
As a **parent**, I must pick **one child** (Saydee vs Sydnee); calendar shows only that child’s school/class/published work + my notes for that child.  
**ACCEPTANCE:** Multi-child requires switcher; no unlabeled merge; leaving child A does not leave A’s events under B.

**US-P-CAL-2 — Doctor pull-out via AI**  
As a **parent**, I tell Kelyra: “Johnny is pulled out Tuesday at 12pm for a doctor appointment.”  
**ACCEPTANCE:**  
- Produces dated **absence/personal** draft with child = Johnny (disambiguate if two Johnnys — must confirm).  
- On Save: visible to **me** + **teachers of Johnny’s classes** only.  
- Not school firehose; not the other twin; not Diary entry unless I separately open Diary.  
- User confirms before Save (draft-then-Save).

**US-P-CAL-3 — Filters**  
As a **parent**, I can hide homework and keep school + sports.  
**ACCEPTANCE:** Chips; defaults per §5.

**US-P-CAL-4 — NL search**  
As a **parent**, “doctor appointments this month” searches only my visible items for focused child.  
**ACCEPTANCE:** No other families; no teacher-hidden quizzes.

### 7.4 Office (superintendent / administrator)

**US-O-CAL-1 — School calendar CRUD**  
As **office**, I create school-wide events (holiday, early release).  
**ACCEPTANCE:** All hats see per matrix; teachers cannot delete office school events.

**US-O-CAL-2 — No homework firehose**  
As **office**, my default calendar is **not** every assignment in the building.  
**ACCEPTANCE:** School + optional class directory events; no widening staff read of personal/absence notes.

**US-O-CAL-3 — NL search school layer**  
As **office**, “early releases this semester” filters school events I can see.  
**ACCEPTANCE:** Does not return parent doctor notes.

### 7.5 Dual-hat

**US-X-CAL-1 — Seat switch**  
As dual-hat (teacher+parent), Calendar respects **active seat**. Teacher seat ≠ parent child calendar.  
**ACCEPTANCE:** Same profile, different query scope; no silent cross-read.

---

## 8. View set + responsive IA

### 8.1 Views

| View | Web | Phone | Notes |
|---|---|---|---|
| **Agenda / list** | Yes (sidebar or primary) | **Primary default** | Upcoming + past sections; best for sparse school life |
| **Day** | Yes | **Secondary default** | Timed + all-day stacks |
| **Week** | Yes default for teachers | Optional swipe/from menu | PowerSchool-like grid light |
| **Month** | Yes | Optional (dense — avoid as phone default) | Dots + overflow “+N” |
| **Year** | Later | No | Out of v1 |

### 8.2 Placement (chrome)

| Hat | Entry | Notes |
|---|---|---|
| Teacher | Drawer / Class overflow / optional Desk link “Calendar” — **not** a 6th tray tab v1 | Align TEACH-UX: Desk stays Today/Needs/Feed |
| Student | Work area / drawer | |
| Parent | Parent home / drawer next to child progress | Child switcher above calendar |
| Office | Office Classes or school home | School calendar management |

**Route proposal (not binding on implementer names):** `/calendar` with query `classId`, `childId`, `view=`.

### 8.3 Mobile vs web IA sketch

**Phone**

```
[ Child switcher if parent ]
[ ChipRow categories — horizontal scroll ]
[ Segment: Agenda | Day ]  … Week/Month in overflow
Agenda rows: time · title · category mark · class/child subtitle
FAB or + : New event (manual) · optional mic → AI draft
```

**Web**

```
Left: filters (categories, classes, child)
Center: Week or Month grid
Right or bottom: Agenda selected-day detail
Header: range picker · Today · New · Ask “Search calendar…”
```

### 8.4 Color / marks

Reuse assignment category marks where they exist (`AssignmentMark` / grade kinds). Do not invent View-stroke icon glyphs in this plan — implementation adds recipes via `scripts/build-icons.mjs` only when Chuck staffs build.

---

## 9. AI natural language (CEO 2026-09-03)

### 9.1 Two capabilities

| Capability | Behavior | Gate |
|---|---|---|
| **NL search / filter** | Parse time range + category + class/child → apply as filter on **already-visible** rows | Read path only; never elevates privilege |
| **NL add** | Parse title, start/end, category, subject person → **draft** calendar item → user Save | Write only after confirm; visibility from hat rules |

### 9.2 Patterns (from research)

| Pattern | Product mapping |
|---|---|
| Absence / early pickup (SIS-like) | category `absence` + `student_id` + notify teachers of enrollments |
| Assignment due | Prefer linking existing `assignment_id`; do not invent grade columns from parent NL |
| Personal appointment | `personal` / `absence`; audience = creator + allowed recipients |
| Recurring “every Tuesday practice” | **Later** — v1 single instance or simple weekly only if cheap; default single |

### 9.3 AI safety / hat walls

- Model keys server-side only (no `EXPO_PUBLIC_*`).  
- Tool results filtered by same RLS predicates as UI (defense in depth).  
- Disambiguation UI when multiple children/classes match.  
- Refuse: class create, student create, grade Approve, diary auto-file, broadcast all-parents, twin merge.  
- Audit: AI draft Save writes normal row with `source=ai_nl` metadata for support — not Office Activity spam.

### 9.4 Stories (cross-hat)

**US-AI-CAL-1 — Search** covered in per-hat NL search stories.  
**US-AI-CAL-2 — Add** covered in US-P-CAL-2 / US-T-CAL-7.  
**US-AI-CAL-3 — Refuse over-scope**  
As any user, if I ask AI to “put this on everyone’s calendar,” the product refuses school-wide blast unless I am office creating a **school** event.  
**ACCEPTANCE:** Clear refuse copy; office path explicit.

---

## 10. Feature set — v1 vs later

### 10.1 v1 (MVP calendar)

| # | Feature |
|---|---|
| 1 | Calendar surface per hat with agenda + day (phone) and week/month/day/agenda (web) |
| 2 | Layered categories + filter chips + defaults (§3–§5) |
| 3 | Visibility matrix + twin/class walls (§4) |
| 4 | Project **published** `assignments.due_at` into calendar; **hidden** teacher-only until publish |
| 5 | Assignment form + teacher To-Do **Publish to calendar** |
| 6 | First-class **calendar_events** for school/class/sport/personal/absence (see §11) |
| 7 | Sports **opt-in** membership (minimal roster join) — schedule read |
| 8 | Manual create/edit/delete own events (hat-scoped) |
| 9 | AI NL search/filter over visible items |
| 10 | AI NL add → draft → Save (parent pull-out + teacher class event + simple personal) |
| 11 | Parent child switcher mandatory for 2+ links |
| 12 | Honest empty states and privacy copy (who can see this event) |

### 10.2 Later

| Feature | Why later |
|---|---|
| iCal subscribe / Google two-way sync | OAuth + conflict UX |
| Rich recurrence editor | Complexity |
| Sports RSVP / availability | TeamSnap scope |
| Envelope encryption for sensitive personal | Key custody |
| Office analytics (“who’s overloaded”) | Privacy + product focus |
| Year view, drag-reschedule grids | Polish |
| Auto-suggest events from syllabus import | AVG join |
| Push notification suite per publish | Needs notification policy pass |
| Co-teacher shared edit policies beyond owner | Edge cases |

---

## 11. Implementation approach (no code this card)

### 11.1 Data sources (hybrid — recommended)

Do **not** overload Feed or `audit_events`.

| Source | Role |
|---|---|
| **`assignments`** (existing) | Academic due points. Add projection fields (names illustrative): `calendar_visibility` (`hidden` \| `published`), `calendar_published_at`, optional `calendar_span_end`. Keep `due_at` as SoT for due instant. |
| **`calendar_events`** (new table) | School/class/sport/personal/absence spans. Fields (illustrative): `id`, `school_id`, `class_id?`, `team_id?`, `student_id?`, `owner_profile_id`, `category`, `title`, `body?`, `starts_at`, `ends_at?`, `all_day`, `visibility_scope` (`self` \| `class` \| `school` \| `student_teachers` \| `team`), `source` (`manual` \| `ai_nl`), `created_at`. |
| **`calendar_team_members`** (new, thin) | Sport opt-in: `team_id`, `student_id` or `profile_id`, role. |
| **Read model / RPC** | `list_calendar_items(range, filters)` security-definer or strict RLS view **UNION** assignment projections + events. Client never trusts “wide select then filter.” |

**Why hybrid:** Assignments already power grade book; duplicating every due into events invites drift. Events need spans/visibility that assignments should not absorb (doctor appointment is not a grade column).

### 11.2 RLS / security posture

| Rule | Detail |
|---|---|
| No `is_staff` widen | Office does not gain SELECT on parent personal/absence or teacher private study because calendar exists |
| Parent | `parent_students` link required; multi-child queries bind `student_id` |
| Teacher | `classes.teacher_id` / teaching membership only for that class’s rows |
| Student | enrollment + own personal rows |
| AI path | Same predicates; server-side tools only |
| No class-create | RPCs for event create do not insert `classes` or `students` |
| Media | If events ever attach photos: private bucket only |

### 11.3 API / UI touchpoints (indicative)

- Assignment form: due chips (existing) + **Show on family calendar** toggle.  
- Assignments list Coming due: only **published** for student/parent surfaces; teacher may see hidden with badge.  
- New `/calendar` screens (web + native).  
- Ask tools: `calendar_search`, `calendar_draft_event` (draft only).  
- Teacher Needs: publish-calendar cards.

### 11.4 Migration / rollout phasing (when staffed)

| Phase | Deliverable |
|---|---|
| **A** | Schema + RLS + `list_calendar_items` + teacher web week/agenda read of published+hidden assignments |
| **B** | Publish toggle + To-Do unhide + student/parent read |
| **C** | `calendar_events` CRUD + school/office + parent absence |
| **D** | Filters prefs + sport opt-in read |
| **E** | AI NL search then AI NL draft-add |

Each phase ships behind hat flags if needed; no big-bang rewrite of Desk.

### 11.5 Explicit engineering non-goals (impl)

- No widening staff policies “to make calendar easier.”  
- No client-only security filters.  
- No second grade book.  
- No Diary table reuse for events.  
- No kelyra-qa-loop on this plan card.

---

## 12. Relationship to other epics

| Epic | Relationship |
|---|---|
| **TEACH-UX** | Calendar is adjacent to Desk, not a replacement for Today/Needs |
| **Diary / Ledger** | Strictly separate; AI calendar add ≠ diary entry |
| **AVG syllabus** | Later may seed suggested term dates; not required for calendar v1 |
| **Car-rider** | Out of scope |
| **Gauth / KEYGRADE** | Orthogonal; calendar does not score work |
| **Messaging** | Optional later “notify on publish”; not required to ship calendar read |

---

## 13. Open issues (for CEO / CoS)

1. **Default hide policy:** Default **hidden** for all new quizzes/tests, or only when teacher checks Hide? (PM recommendation: default **hidden** for `quiz`/`test`/`midterm`/`final`; default **published** for routine `homework`/`practice`/`lesson` when `due_at` set.)  
2. **Does assign-to-student imply calendar publish?** (PM recommendation: **No** — independent toggles.)  
3. **Office seeing class field trips:** school vs class visibility — keep class-scoped unless office marks school.  
4. **FERPA:** parent-created absence notes visible to teachers — treat as operational communication; confirm copy (“Teachers of this child’s classes can see this”).  
5. **Co-teachers:** if product gains co-teach, calendar edit rights follow class teaching membership (not designed in MVP teacher_id-only world beyond owner).  
6. Primary teacher interviews on pop-quiz hide pain (research gap) — does not block plan approval.

---

## 14. Acceptance for this card

| Criterion | Status |
|---|---|
| User stories per hat | §7 |
| Filter model + default-on | §3, §5 |
| Visibility matrix | §4 |
| Draft/hidden vs published + To-Do unhide | §6 |
| View set + responsive IA | §8 |
| Implementation approach (sources, RLS, no class-create, no is_staff widen) | §11 |
| v1 vs later + non-goals | §2, §10 |
| CEO AI NL search + add | §9 |
| Artifact path | `notes/company/calendar-plan.md` |
| No code / SQL / qa-loop / git push | Honored |

**Recommended next action:** CEO/CoS review. **Do not** staff `senior-developer` until Chuck says send.

---

## 15. Handoff fields

- **OBJECTIVE:** Calendar feature set + UI/UX + impl approach for review.  
- **CONTEXT:** CAL-R1 research + CEO AI NL comment + live `assignments.due_at`.  
- **WORK PERFORMED:** Wrote this plan.  
- **VERIFICATION:** File on disk under `notes/company/calendar-plan.md`; maps research v1 cut; hat walls match diary twin law; data approach hybrid assignments + events.  
- **RESULT:** Ready for CEO/CoS — not implementation.  
- **OPEN ISSUES:** §13.  
- **ESCALATION NEEDED:** No (unless CEO rejects hybrid data approach).  
- **RECOMMENDED NEXT ACTION:** CEO/CoS review; hold eng staffing.
