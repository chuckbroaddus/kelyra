# LAND-A1: Architecture — class landing

**Date:** 2026-09-04
**Author:** software-architect (Kelyra)
**Card:** LAND-A1 `t_1717e013` · Plan: `notes/company/class-landing-plan.md` · Research: `notes/company/class-landing-research.md`
**Status:** Architecture only — **no SQL**, no app code, no kelyra-qa-loop, no git push.
**Live ground:** `docs/data-model.md`; `class_teachers` / `teaches_class` (`20260819000008`); `posts` + `can_see_post` (`20260818000000_messaging_v1.sql`); `assignments.due_at`; `enrollments`; `parent_students`; `askToolPolicy.ts` twins; CAL-P1 / LPLAN join law.

**Gate:** Do not staff `senior-developer` / `kelyra-qa-loop` until Chuck says send.

---

## 0. Law

Webpage-like class home: live joins + named regions; signed-in only.

| Question | Answer |
|---|---|
| Schema sketch enough for a future loop? | **Yes** (this file). |
| Row vs live blocks? | **One `class_landing` row** for named regions. Live blocks = **queries**, never copies. |
| Public URL / CDN? | **No.** Signed-in only. `anon` deny. kelyra.app DNS stays held. |
| AI writes? | **Named region columns only.** Preview → teacher Confirm → publish. |
| Twins / hats | Fail closed. Never mix Saydee/Sydnee. No `is_staff` widen. |
| Implementation ready? | **NO until CEO yes.** |

| Surface | Job | What it is not |
|---|---|---|
| **Class landing** | One webpage-like home per taught class | Not Feed, not Desk grade loop, not public site, not free HTML |
| **Named regions** | Teacher-authored plain text AI can draft into | Not Ask-as-superuser; not student PII in prompts |
| **Live blocks** | Join assignments / posts / calendar / files | Not stored copies of due dates or lesson plans |

## 1. Non-goals

**In v1:** signed-in web route `/class/:id/home` (name TBD; **one Home**, not an 11th tab) + phone WebView of the same document; four named regions; live due / posts / calendar-slice / files **queries**; teacher NL → preview → Confirm.

**FERPA fail-closed (product law, not a legal opinion):** no anonymous public class URL; no grades / `approved_score` on the landing; no roster dump; parent view is **one focused child**; unlabeled multi-child blend returns **empty**. Teachers do not create classes from landing or Ask.

| Non-goal | Why |
|---|---|
| Public / pre-auth URL | FERPA; LAND-R1 found no K-12 taught-class default that is public |
| Free-form HTML / Sites clone | XSS + AI-unsafe; later maybe |
| Duplicate calendar events or LPLAN bodies | Join/reference only (CAL-P1 / LPLAN) |
| Class-create from landing or Ask | Office owns class create |
| Widen `is_staff` / `teaches_class` office bypass | Same wall as syllabus writes |
| Mixing twins on one landing | Hard product law |
| Auto-publish AI or unpublished assignments | Confirm-before-publish; pop quiz stays hidden |
| Landing as the grade loop | Desk stays capture → match → Approve |
| Student-editable landing | Teacher authors; family reads |
| Grades on the landing | Gradebook stays elsewhere |
| New `IconName` / kelyra.app DNS | Existing holds |

## 2. Data model

Names proposed. **No CREATE TABLE in this ticket.** 1:1 `class_id` UNIQUE. Live blocks are **not** columns.

**Why a row at all:** named regions need draft vs published, `updated_by`, optimistic lock, and an AI target that is not `assignments` / `posts` / calendar. **Why not store live blocks:** copies drift (CAL-P1 / LPLAN join law). Missing `class_landing` row is legal — regions render empty; live queries still run.

### 2.1 `class_landing` (authored only)

Typed columns, **not JSON** (family RLS must not parse jsonb; same reason as `class_syllabi.publish_to_family`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `class_id` | uuid UNIQUE NOT NULL | FK `classes(id)` ON DELETE CASCADE |
| `header_title_draft` / `_published` | text | Empty published → UI shows `classes.name` |
| `welcome_draft` / `_published` | text | Plain text. Empty OK |
| `daily_focus_draft` / `_published` | text | Blurb, not LPLAN body |
| `verse_draft` / `_published` | text | Optional; empty allowed (school-optional) |
| `row_version` | int NOT NULL default 1 | Optimistic lock |
| `updated_by` | uuid | FK profiles |
| `updated_at` / `created_at` | timestamptz | |

Per-region publish: Confirm writes **one** `*_published` from that region’s draft. Other regions stay. No HTML. No sanitizer needed in v1 because there is no HTML.

Lazy INSERT on first teacher save/AI confirm. Class delete cascades the row.

### 2.2 Live blocks (queries — never copied onto the row)

| Block | Source | Family rule |
|---|---|---|
| Due this week | `assignments` + `due_at` for this `class_id` | **Published-to-family only.** Until CAL-P1 `calendar_visibility` ships, **fail closed**: omit from student/parent landing. Teacher may see hidden, labeled. **No scores.** |
| Announcements | `posts` where `class_id` = this class | Existing `can_see_post`. Recent N. Not school-wide `class_id` null. |
| Calendar slice | CAL-P1 events **join** this `class_id` | Hat-visible + published. If table absent, due-query is the slice. **No event body copy.** |
| Files | Existing hat-readable class files | Do not invent a CMS or Files-API 403. Omit if no catalog. |
| Lesson focus | LPLAN published span **link** | Hide if draft/absent. Landing does **not** wait on LPLAN code. |

AI / RPCs **must not** INSERT/UPDATE those source tables from the landing path.

## 3. RLS

ENABLE RLS. **No table GRANT to `anon`.** No public storage object. No pre-auth route. Signed-in JWT only.

`public.teaches_class(class_id)` is true when **`is_school_admin()` OR `class_teachers`**. Office would pass every write if we reused it (AVG-A1). **Writes use `class_teacher_of`** (true iff `class_teachers(class_id, teacher_id = auth.uid())`). `also_teacher` without a row is denied. Co-teachers with a row: allowed.

**Do not** widen `is_staff` / `is_school_admin` into landing SELECT. Office has **no** landing editor in v1.

Draft columns are a **row-level leak** if family SELECT the table (same as `class_syllabi.ask_draft`). Mitigate:

1. Family **must not** `SELECT class_landing`.
2. Teacher client may SELECT the full row iff `class_teacher_of`.
3. Family reads **published** fields via SECURITY DEFINER RPC/view that omits every `*_draft`.

| Op | Who |
|---|---|
| Teacher SELECT full row | `class_teacher_of(class_id)` |
| INSERT / UPDATE / DELETE | `class_teacher_of` only. Client save of drafts OK. Publish of a region: prefer RPC `publish_class_landing_region` (lock `row_version`). |
| Family table SELECT | **Revoke.** |
| `landing_published(p_class_id)` RPC | Student: enrollment in that class. Parent: `parent_students` for **focused child** enrolled in that class. Returns published texts + live block query results already filtered. |
| `anon` | Deny all. |
| Storage | None in v1 (no hero image). |

**Twins:** parent RPC requires `p_child_student_id`. If owner has 2+ `parent_students` and child is missing/unlinked → **empty**, not a mash-up. Child must be enrolled in `p_class_id`.

**Student:** enrolled class only. Cannot invoke publish/AI.

Live-block queries reuse **existing** assignment / `can_see_post` / calendar RLS. Landing must not add a second, looser policy on those tables.

## 4. AI named-region edit

**Server-side only.** Model keys stay on Edge / `ai:dev`. Never `EXPO_PUBLIC_*`. Company TTS remains `grok-tts` — unused here.

Allow-list region ids: `welcome` | `daily_focus` | `verse` | `header_title`. Unknown id → deny. AI writes **only** the matching `*_draft` column. Never `assignments`, `posts`, calendar, files, syllabus, roster.

### 4.1 Flow

1. Teacher NL names **class + region + new text** (CEO: “Update the Bible Verse for Fundamentals of Math to Genesis 1:1 (KJV)”).
2. Matcher binds to **one** taught class (`class_teacher_of`). Unassigned → confirm picker. Never invent a class. Never “Ask as superuser.”
3. Tool parks draft; UI shows before/after on **that region only**.
4. Teacher Confirm → `publish_class_landing_region` copies draft → published. Reject discards draft. Human edit of the field is a normal save.
5. Students/parents cannot invoke these tools.

Prompts contain **no roster, no grades, no sibling names, no unpublished assignments.**

### 4.2 Ask tools (do not register until CEO yes)

Identical maps in `src/lib/ai/askToolPolicy.ts` and `supabase/functions/_shared/askToolPolicy.ts`. Unknown names denied.

| Tool | Policy |
|---|---|
| `draft_class_landing_region` | `teacherSeatOnly`, need `own`, capability `landing.manage` (new; **not** `assignments.manage`). `class_teacher_of` in handler. Writes draft only. |
| `publish_class_landing_region` | Same walls. Confirm path. Optimistic `row_version`. |
| `discard_class_landing_region_draft` | Same walls. |

Office JWT denied unless they also have a `class_teachers` row (SQL is SoT). Do **not** set `officeOnly`.

v1 audit: `write_audit('publish_class_landing_region', …)` with region id + old/new snippets. Optional later: DIARY ledger `action_family` other. **No** diary body.

No new privilege that grants assign/grade.

## 5. v1 vs later

| v1 | Later |
|---|---|
| Named regions + live due/posts/calendar-slice/files **queries** | Free HTML region (still confirm; XSS sanitizer required) |
| Signed-in web + WebView | Public open-house page only if Chuck + legal |
| Teacher NL + confirm | Never student-facing landing AI |
| Join calendar / LPLAN **when those tables exist** | iCal, Sites import |
| No hero image / no storage | Optional header image in private bucket + signed URLs |
| Office: no editor | Optional school-wide region defaults |
| Fail-closed family due list until CAL publish flag | CAL-P1 `calendar_visibility` becomes the due-block predicate |

**Composition:** client or signed-in server compose sections. Do not embed splash video. Phone: one column; AI confirm is a sheet.

**Tests (when gated loop runs):** hat walls; twin empty mash-up; unpublished assignment absent from family; AI cannot write live-block tables; confirm required before published column changes; `anon` 401; office without `class_teachers` denied; Ask policy twins.

**Open (not blockers):** exact route vs Class desk “Home”; parent link = existing `parent_students`; `verse` empty allowed.

## 6. Acceptance

This file is for CEO/CoS review. **No SQL, no app code, no kelyra-qa-loop, no git push.**

Do **not** staff `senior-developer` until Chuck says send.
