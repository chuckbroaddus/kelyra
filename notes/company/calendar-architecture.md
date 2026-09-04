# CAL-A1: Architecture — school calendar

**Date:** 2026-09-04
**Author:** software-architect (Kelyra)
**Card:** CAL-A1 `t_2f1d680d` · Plan: `notes/company/calendar-plan.md` · Research: `notes/company/calendar-research.md`
**Status:** Architecture only — **no SQL**, no app code, no kelyra-qa-loop, no git push.
**Live ground:** `docs/data-model.md` (`assignments.due_at`; no calendar table), `assignments_via_class` via `teaches_class` (ORs `is_school_admin`), `class_teacher_of` (membership only), `parent_students`, `student_gradebook()`, `parent_progress()`, `askToolPolicy.ts`.

**Gate:** Do not staff `senior-developer` until Chuck says send.

## 0. Law + verdict

| Question | Answer |
|---|---|
| Hybrid SoT? | **Yes.** `assignments.due_at` stays the grade-book due instant. **Do not copy dues into events.** Project when published; teacher still sees `hidden`. |
| New table? | **`calendar_events`** for school/class/sport/personal/absence. Not Feed, not `audit_events`, not Diary. |
| Office vs hidden quizzes? | **Do not** reuse `teaches_class` for family calendar reads. Hidden dues: `class_teacher_of` only. Office is not a homework firehose. |
| AI? | Search ⊆ visible set. Draft-then-Save. **Never insert students or classes.** |
| Ready to implement? | **NO until CEO yes.** |

Calendar = one dated/span surface the **active seat** may see. Dual-hat queries by chrome seat, not job-of-record.

## 1. Non-goals

Fail closed. Copy into any future loop ticket.

| Non-goal | Why |
|---|---|
| Google/Outlook clone, two-way sync, rooms, RSVP mesh | School work surface first |
| Diary on Calendar | Separate epic; events ≠ reflection |
| Car-rider / ANPR / dismissal | Different ops; **ANPR n/a** |
| Class-create or student-insert from Calendar/Ask | Office owns directory; matcher never inserts a student |
| Widen `is_staff` / `teaches_class` / `is_school_admin` onto parent doctor notes, teacher study, or hidden quizzes | FERPA minimization |
| Auto-publish every `due_at` | Pop-quiz law |
| School homework firehose / unlabeled twin merge | Parent = focused `child_student_id` |
| Ask Approves grades | Core MVP |
| iCal / public anonymous URL | Later; v1 = login + RLS |
| Student creates school-wide events | Read + own study only |
| Envelope E2E claims | Honest RLS, no crypto theater |
| Replace Desk Today / This week | Adjacent surface only |
| Second grade book; `audit_events` or Diary table reuse | Drift + confused deputy |

## 2. Data model (sketch, not a migration)

**Hybrid.** Duplicating every due into events invites drift. A doctor pull-out is not a grade column.

### 2.1 Assignment projection (existing `assignments`)

`due_at` remains SoT for the due instant. Additive fields (names illustrative):

| Column | Notes |
|---|---|
| `calendar_visibility` | `hidden` \| `published`. Independent of assign-to-roster. |
| `calendar_published_at` / `calendar_published_by` | Family unhide audit |
| `calendar_span_end` | Optional; omit v1 if unused |

**Defaults (lock P1 §13 #1–2):** `quiz`/`test`/`midterm`/`final` → `hidden` when `due_at` set. Routine `homework`/`practice`/`lesson` → `published`. **Assign ≠ publish.** Seeding `submissions` does not flip visibility. No `due_at` → not a dated calendar item. Teacher Needs “Publish to calendar” sets `published`. Re-hide is v1.1.

### 2.2 `calendar_events` (new)

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `school_id` | required |
| `class_id` | null except class-scoped |
| `team_id` | null except sport |
| `student_id` | null except absence/personal-about-child. FK SET NULL. **Never minted here.** |
| `owner_profile_id` | creator = `auth.uid()` on write |
| `seat` | chrome at create |
| `category` | `school`/`class`/`study`/`sport`/`personal`/`absence` (academic cats stay on assignments) |
| `title` | required |
| `body` | optional short; not diary |
| `starts_at` / `ends_at` / `all_day` | span |
| `visibility_scope` | `self` \| `class` \| `school` \| `student_teachers` \| `team` |
| `status` | `draft` \| `published` |
| `source` | `manual` \| `ai_nl` |
| `created_at` / `updated_at` | |

Indexes: `(school_id, starts_at)`, `(class_id, starts_at)`, `(owner_profile_id, starts_at)`, `(student_id, starts_at)`.

### 2.3 Sport (thin)

`calendar_teams` (`id`, `school_id`, `name`) + `calendar_team_members` (`team_id`, `student_id` or `profile_id`, `role`). **Opt-in only** — never auto-join from class roster.

### 2.4 Read model

`list_calendar_items(p_from, p_to, p_class_id?, p_child_student_id?, p_categories[])` — SECURITY DEFINER, `search_path=public`. UNION (1) assignments with `due_at` in range, category mapped from `assignments.category`/`kind`, **§3 filters**; (2) `calendar_events` in range, same filters. Client **never** wide-selects then filters.

Row shape: `{source: assignment|event, id, title, starts_at, ends_at, category, class_id, student_id, visibility, ...}`. Assignment deep-links the existing form; events open an event sheet.

**Deletes:** assignment delete drops the projection. Event hard-delete (owner; office for school scope). Student delete: SET NULL on `student_id`. Parent-created `student_teachers` absence: on child unlink, **delete** the row (do not orphan into a school firehose). No public calendar URLs. Media: none in v1 (if later: private bucket, owner path).

## 3. RLS / visibility (data rules)

**Product matrix = SQL predicates.** Filter chips are not security.

### 3.1 Helpers — pick the right one

| Helper | Calendar use |
|---|---|
| `class_teacher_of(class_id)` | Teacher **write** class events; teacher **read of hidden dues** |
| `teaches_class(class_id)` | **Forbidden** for family calendar reads — ORs `is_school_admin()`, which would dump every class’s homework (incl. hidden quizzes) to office |
| `is_school_admin()` / `is_staff_profile` | School-layer CRUD only (`visibility_scope=school`). Never SELECT `self`, `student_teachers`, or hidden assignments |
| `parent_students` | Parent scope. 2+ children: **require** `p_child_student_id` in that set. Missing child → **empty**, not a mash-up |
| `my_student_id()` / enrollment | Student: published class/school + own `self` study |
| Active seat | Dual-hat: teacher query ≠ parent-child query |

### 3.2 Item rules (fail closed)

| Item | Student | Parent (child C) | Teacher | Office |
|---|---|---|---|---|
| School event published | Yes | Yes | Yes | CRUD |
| Class event T | Enrolled T | C enrolled T | `class_teacher_of(T)` | School-marked only; not teacher personal |
| Assignment due **published** | Own cell / enrolled (existing family rules) | C’s work (same as `parent_progress`) | Taught T | **No row dump** |
| Assignment **hidden** | No | No | `class_teacher_of` only | **No** |
| Sport | Opt-in | C opted in | Coach membership | School-marked sport announcements only |
| Study `self` | Owner | No (v1) | Owner only | No |
| Parent absence for C | No | Owner parents of C | Teachers of **C’s enrollments** (`class_teacher_of`) | **No** |
| Event `draft` | Creator only | Creator only | Creator only | Creator only |

Teacher default: **active class** + school. “All my classes” is an explicit OR of `class_teacher_of` ids. Writes: owner, or school-admin for school scope. Teachers cannot delete office school events. RPCs must not INSERT `classes` or `students`. No new privileges.

## 4. AI search / add

Server-side tools only. Keys never `EXPO_PUBLIC_*`. Same predicates as `list_calendar_items`. Unknown Ask names stay denied (`askToolPolicy`).

| Tool (indicative) | Privilege | Behavior |
|---|---|---|
| `calendar_search` | Current-seat read | Parse range + category + class/child → **filter already-visible rows**. Never elevates. |
| `calendar_draft_event` | Seat-scoped create | Returns a **draft**. Persist to audience only on user Save. |

**Matcher law (capture analog):** NL may **guess** `student_id` against an allowed roster (parent: linked children; teacher: roster of the taught class in context). Ambiguous (“Johnny” × twins) → confirm UI, do not pick. No match → `student_id` null or refuse — **never INSERT `students`**. Never `create_class`. Never `link_parent_student`. Never write `approved_score`.

Refuse with copy, not a silent no-op: school-wide blast unless office is creating `visibility_scope=school`; twin merge; diary auto-file; “notify all parents”; grade Approve.

Parent doctor example: draft `category=absence`, `visibility_scope=student_teachers`, `student_id=C` after confirm. Save → owner parents of C + `class_teacher_of` for C’s enrollments. Not school firehose. Not the other twin. Not Diary.

Teacher “Field trip Friday 9–2 for this class”: draft bound to **active/taught** class (`class_teacher_of`). Save publishes class scope.

`source=ai_nl` on the event for support. Do **not** `write_audit` parent doctor notes onto Office `/activity` (existence leak). Assignment publish-to-calendar may stamp the projection columns only.

v1 recurrence: single instance. Do not invent grade columns from parent NL (“add a test Friday”).

## 5. v1 vs later

**v1:** Surface (phone agenda+day; web week/month/day/agenda); category chips; hat walls; published `due_at` projection + hidden teacher layer; assignment toggle + Needs To-Do publish; `calendar_events` CRUD; sport opt-in **read**; manual create; parent child switcher; AI search then AI draft-add; honest “who can see this” copy.

**Later (not this epic):** iCal / Google two-way; rich recurrence; sports RSVP/availability; envelope encryption; office load analytics; year view / drag grid; syllabus auto-seed (AVG); push suite; co-teacher policy beyond `class_teacher_of`; public URL.

**ANPR / car-rider:** out of calendar. Do not put plate-read, queue, or dismissal on `calendar_events`.

### 5.1 Build phases (only after CEO says send)

| Phase | |
|---|---|
| A | Columns on `assignments` + RLS + `list_calendar_items` + teacher web read (published+hidden of taught classes) |
| B | Family publish toggle + To-Do + student/parent published read |
| C | `calendar_events` + office school CRUD + parent absence |
| D | Filter prefs + sport opt-in read |
| E | Ask `calendar_search` then `calendar_draft_event` |

No Desk rewrite. Hat flags OK. Each phase its own loop **after** Chuck says send.

### 5.2 Open issues (CEO)

1. Default hide for quiz/test — **architect agrees with PM.**
2. Assign ≠ calendar publish — **locked.**
3. Office class field trips stay class-scoped unless marked school — **locked.**
4. FERPA copy on parent absence: “Teachers of this child’s classes can see this.” Product communication, not a legal opinion.
5. Co-teachers: any `class_teachers` row (`class_teacher_of`), not `classes.teacher_id` only.

## 6. Acceptance

| Criterion | Where |
|---|---|
| Tables vs projections (`due_at` vs `calendar_events`) | §2 |
| RLS / visibility as data rules | §3 |
| AI matcher; no invented students | §4 |
| v1 vs later; iCal later; ANPR n/a | §5 |
| No SQL / app code / qa-loop / git push | Honored |

**Recommended next action:** CEO/CoS review. **Do not** staff `senior-developer` until Chuck says send.

### Handoff

- **OBJECTIVE:** Architecture review of school calendar (CAL-P1).
- **FILES/AREAS:** `notes/company/calendar-architecture.md`
- **WORK PERFORMED:** Hybrid SoT, RLS helper choice (`class_teacher_of` vs `teaches_class`), AI draft tools, v1/later cut.
- **VERIFICATION:** File on disk; no SQL; no app code.
- **RESULT:** Ready for CEO/CoS — not implementation.
- **OPEN ISSUES:** §5.2
- **ESCALATION NEEDED:** No unless CEO rejects hybrid or helper split.
- **RECOMMENDED NEXT ACTION:** CEO/CoS review; hold eng staffing.
