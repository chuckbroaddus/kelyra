# LPLAN-A1: Architecture — lesson plans

**Date:** 2026-09-04
**Author:** software-architect (Kelyra)
**Card:** LPLAN-A1 `t_6c919068` · Plan: `notes/company/lesson-plan-plan.md` · Research: `notes/company/lesson-plan-research.md`
**Status:** Architecture only — **no SQL**, no app code, no kelyra-qa-loop, no git push.
**Live ground:** `docs/data-model.md` (`assignments`, `lesson_packs`, `submissions`), `class_teacher_of` (`20260902000000_class_syllabus.sql`), `teaches_class` office bypass, `askToolPolicy.ts`, CAL-P1 / DIARY-A1 / LAND-P1 / AVG-A1.

**Gate:** Do not staff `senior-developer` / `kelyra-qa-loop` until Chuck says send.

---

## 0. Verdict

| Question | Answer |
|---|---|
| Schema sketch enough for a future loop? | **Yes** (this file). |
| Separate entity from `assignments` / Author packs? | **Yes.** New `lesson_plans`. Links only. |
| AI draft auto-publish? | **Never.** |
| Implementation ready? | **NO until CEO yes.** |

| Surface | Job | What it is not |
|---|---|---|
| **Lesson plan** | Teacher-owned accreditation working record + day-of run-of-show | Not a grade-book column; not Author HTML; not Diary; not Feed |
| **Calendar join** | Published + span → dated chip on **teacher** calendar (projection) | Not a copied event body; not family firehose in v1 |
| **Diary join** | Optional `diary_entries.related_plan_id` (diary owns the FK) | Not reflection text on the plan row |
| **Parent summary** | Explicit share of a **narrow** RPC payload | Not table SELECT; not procedures / differentiation |
| **AI draft** | Structured fields → teacher edit → human Publish | Not Ask-as-superuser; no roster PII in prompts |

**CEO bar (LPLAN-R1 / P1):** Teacher writes; AI drafts only; join calendar not duplicate; office none unless later required; fail-closed parents; diary separate.

## 1. Non-goals

| Non-goal | Why |
|---|---|
| Overload `assignments` as the plan row | Assignments seed `submissions` and become grades after Approve. Plans do not. |
| Store Author pack HTML on the plan | `lesson_packs` + `kind=lesson` stay the student player. Plan may **link** a pack id. |
| Duplicate plan body onto `calendar_events` | CAL-P1 join/reference. Dual-write is an audit lie. |
| Diary prose / STT on `lesson_plans` | DIARY-A1 owner-only; accreditation evidence is the **published plan**, not the journal. |
| Auto-publish AI or silent calendar schedule | Same bar as LAND/CAL/AVG. |
| Parent / student full body in v1 | FERPA fail-closed. |
| Family PostgREST SELECT on `lesson_plans` | Narrow SECURITY DEFINER RPC only. |
| Office author / school-wide rewrite in v1 | Teacher writes. `teaches_class` office bypass must not open writes. |
| Reuse `assignments.manage` / `teaches_class` for plan writes | Office already passes those. Use `class_teacher_of` + new `lesson_plan.manage`. |
| Co-teacher shared edit / specialist share | Parked. v1 = single `owner_profile_id`. |
| Class create, student insert, grade Approve from this surface | Core MVP law. |
| Public unauthenticated plan URL | Signed-in only. |
| Fake E2E / “only you ever see this” | Honest RLS. DBA / `service_role` / backups still exist. |
| New Storage bucket in v1 | Materials are text lists. Attachments later. |
| CAL category `lesson` for these rows | That chip is `assignments.kind = lesson` (hosted packs). Plans use **`plan`**. |
| `is_staff` / `is_school_admin` shortcut | Hard product law. |
| kelyra-qa-loop / SQL / git push from this card | Spec only. |

## 2. Data model (sketch, not a migration)

Names proposed. No CREATE TABLE in this ticket. Do not touch `assignments.kind`, `publish_lesson_pack`, or Author studio.

### 2.1 Three products — do not collapse

| Entity | Job | Student cell? | Calendar |
|---|---|---|---|
| **`lesson_plans`** (new) | Accreditation script + run-of-show | **No** | Projection when **published + span** (teacher v1) |
| **`assignments`** (live) | Grade-book **column**; `due_at`; seeds `submissions` | **Yes** | CAL-P1 assignment projection + `calendar_visibility` |
| **`lesson_packs`** (live, Author) | Hosted HTML catalog (`kind=lesson` bind) | Via assignment | Category chip **`lesson`** = this, not plans |

Plan → assignment / pack / file = **optional links** (ids only). Due dates stay on `assignments`. Pack HTML stays in `lessons` storage. Deleting an assignment must **not** delete the plan.

### 2.2 `lesson_plans`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `class_id` | uuid NOT NULL | FK `classes(id)` ON DELETE CASCADE. Taught class only. AI never invents. |
| `owner_profile_id` | uuid NOT NULL | FK `profiles(id)`. Creator. v1 sole full-body reader/writer. |
| `status` | text NOT NULL | `draft` \| `published` \| `archived`. Default `draft`. CHECK. |
| `title` | text NOT NULL | |
| `objectives` | text NOT NULL | Learning goals. Empty string allowed on draft; Publish warns if blank. |
| `standards` | jsonb NOT NULL | `[{code, label}]`. Default `[]`. Soft-required: Publish **warns**, does not hard-block in pilot. |
| `materials` | jsonb NOT NULL | `text[]` or `[{label}]`. Default `[]`. |
| `procedures` | jsonb NOT NULL | `[{n, text, minutes?}]` ordered. Default `[]`. |
| `assessment` | text NOT NULL | Formative/summative **plan**, not a score. |
| `differentiation` | text NOT NULL | ELL/IEP/tier. **Teacher-only.** Never in family RPC. |
| `teacher_notes` | text | Optional. Teacher-only. **Not** Diary. |
| `parent_summary` | text | Optional. The **only** family-facing prose **if** shared. |
| `summary_shared_at` | timestamptz NULL | NULL = not shared. Share is a separate confirm from Publish. |
| `summary_shared_by` | uuid NULL | |
| `starts_at` / `ends_at` | timestamptz NULL | Optional span. Both null = library/unit bank (calendar silent). |
| `all_day` | bool NOT NULL | Default false. |
| `period_label` | text | Optional human “3rd period”; not a period table in v1. |
| `source` | text NOT NULL | `blank` \| `copy` \| `ai_draft`. Default `blank`. |
| `copied_from_id` | uuid NULL | Prior plan; ON DELETE SET NULL. |
| `row_version` | int NOT NULL | Optimistic lock. Default 1. |
| `published_at` / `published_by` | timestamptz / uuid | NULL until first Publish. Unpublish **clears visibility**, keep last values for audit or add `unpublished_at` — implementer pick one; do not leave family seeing archived as live. |
| `created_at` / `updated_at` | timestamptz | |

Indexes: `(class_id, status, starts_at)`, `(owner_profile_id, updated_at desc)`, `(class_id, starts_at)` where span not null.

Unpublish: `status` back to `draft` (or stay `published` with a `calendar_hidden` — **lock: status=`draft` or `archived` only; unpublish → `draft`**). Calendar join hides immediately for non-teachers. Teacher still sees the row.

Archive: `status=archived`. Hidden from default lists; owner can still SELECT.

### 2.3 `lesson_plan_links` (optional many)

Thin join. No cascade of plan on target delete.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `plan_id` | uuid NOT NULL | FK `lesson_plans` CASCADE |
| `target_kind` | text NOT NULL | `assignment` \| `pack` \| `file` |
| `target_id` | uuid NOT NULL | Soft id. **No** FK to `assignments` / `lesson_packs` in v1 (packs keyed by `deck_id`+`version` — store `target_id` null + `deck_id`/`version` text when kind=`pack`). |
| `deck_id` / `lesson_version` | text | Pack bind only |

Unique `(plan_id, target_kind, target_id)` (and pack unique on deck+version). UI shows “removed” if target gone. **YAGNI alternative:** jsonb `links` on the plan if implementer wants zero tables — acceptable; junction is preferred for reverse “which plans cite this assignment.”

**No `lesson_plan_templates` table in v1.** Copy-forward = INSERT clone, new id, `status=draft`, clear publish/share timestamps, re-bind `class_id` (must still `class_teacher_of`). School templates later.

### 2.4 What is not on this row

- Diary body, STT, media paths
- `approved_score` / submissions
- Pack HTML / `storage_deck_id` copies (link only)
- Parent ACL arrays
- Office comment thread (parked)

### 2.5 Lifecycle

```
blank | copy-forward | AI draft
  → Save (draft, source stamped)
  → optional span (still draft = owner calendar only)
  → Publish (working record; teacher calendar join if span)
  → optional Share parent summary (separate confirm)
  → Reflect (Diary deep-link; FK lives on diary when both ship)
  → Unpublish → draft  |  Archive
```

Publish **does not** assign work, seed submissions, or Approve grades.

## 3. RLS (fail closed)

Honest model: **RLS + definer RPCs.** Not envelope. Not E2E. Copy must not claim “only you can ever see this.”

Live trap: `public.teaches_class(class_id)` is true when **`is_school_admin()` OR `class_teachers`**. AVG-A1 already forbade it for syllabus **writes**. Lesson plans are **more** private (differentiation, IEP notes). **Never** copy `assignments_via_class` / `teaches_class` onto this table.

Stricter than syllabus: syllabus CRUD = any `class_teacher_of`. Plans v1 = **owner row** + `class_teacher_of` on writes. Co-teachers of the same class **do not** SELECT drafts or full bodies. Parked: co-own.

### 3.1 Table policies (sketch, not SQL)

ENABLE RLS on `lesson_plans` and `lesson_plan_links`. REVOKE ALL from `anon`. `authenticated` only via policies below.

| Op | `lesson_plans` |
|---|---|
| SELECT full row | `owner_profile_id = auth.uid()` **only**. No office, no co-teacher, no parent, no student, no `is_staff`. |
| INSERT | `owner_profile_id = auth.uid()` AND `class_teacher_of(class_id)`. Owner cannot insert for someone else. |
| UPDATE / DELETE | Same as INSERT: still owner **and** still `class_teacher_of(class_id)`. Leave the class → keep SELECT of own rows, **lose write**. |
| Sub cover SELECT | **No table policy in v1.** Parked. Export/print is owner action. |

`lesson_plan_links`: CRUD iff parent plan is owner-writable / owner-selectable. No independent SELECT.

**Forbidden in USING/WITH CHECK:** `is_school_admin()`, `is_staff()`, `teaches_class()`, parent_students, enrollment, `also_administrator`. Security tests must `doesNotMatch` those helpers (pattern: lesson_packs / diary).

### 3.2 Family path — RPC, not SELECT

Do **not** grant parents/students table SELECT even for `parent_summary`. Mirror AVG family syllabus: SECURITY DEFINER RPC.

`family_lesson_plan_summary(p_class_id, p_student_id)` returns **only**:

- `id`, `title`, `objectives` (optional — lock: **omit objectives if we want summary-only**; **v1 return `title` + `parent_summary` only**), `starts_at`/`ends_at` if span, `published_at`

**Never returns:** `procedures`, `materials` (full list), `assessment` internals, `differentiation`, `teacher_notes`, `standards` dump, links, `source`, owner id.

Preconditions (else empty / not_found, not a leaky error):

1. Caller is guardian of `p_student_id` via `parent_students` (or student JWT = that student — **v1 student: deny anyway**, product law “no plan body”).
2. Student enrolled in `p_class_id`.
3. Plan `status = published` (not draft/archived).
4. `summary_shared_at IS NOT NULL` AND `parent_summary` non-empty.
5. Twin wall: parent with 2+ children **must** pass focused `p_student_id`. Unlabeled blend → **empty**.

Student JWT: **deny** this RPC in v1.

Office JWT: **deny**.

### 3.3 RPCs (teacher)

REVOKE EXECUTE from `anon`. Grant `authenticated`; each body starts with owner + `class_teacher_of`.

| RPC | Does |
|---|---|
| `save_lesson_plan_draft(...)` | Upsert draft. **Cannot** set `status=published`. Cannot set `summary_shared_at`. Optimistic `row_version`. |
| `publish_lesson_plan(p_id, p_row_version)` | Owner + taught class. Sets published. Does not share summary. `write_ledger` best-effort (`publish_lesson_plan`, family `other` or new `plan` — lock **`plan`**). Optional `write_audit` — **skip** so Office Activity is not a plan firehose; ledger is enough. |
| `unpublish_lesson_plan` | → `draft`. Calendar join hides. Clears `summary_shared_at` (**lock: unpublish unshares**). |
| `archive_lesson_plan` | → `archived`. Same hide. |
| `share_lesson_plan_summary` / `unshare_lesson_plan_summary` | Separate confirm. Share no-ops if not published or summary empty. |
| `copy_lesson_plan` | New draft; clear publish/share; `source=copy`. |

Clients do not UPDATE `status` / `summary_shared_at` directly if RPCs own those columns — prefer column grants that leave status to definers, **or** RLS that rejects status transitions except via RPC. Implementer: **RPCs own publish/share**; table UPDATE of those columns denied to `authenticated`.

### 3.4 Privilege / Ask wall

New capability `lesson_plan.manage`, need=`own`, **teacherSeatOnly**, office **none**. Do **not** reuse `assignments.manage`.

Ask tools (when staffed): `draft_lesson_plan` only. **No** `publish_lesson_plan` tool. Unknown names denied. Handler: `class_teacher_of` before model call. Returns structured JSON to the editor; **Save** is `save_lesson_plan_draft`. Publish stays a UI button.

### 3.5 Visibility matrix (enforcement)

| Viewer | Draft | Published full | Parent summary if shared | Diary |
|---|---|---|---|---|
| Owner teacher | Yes | Yes | Edit | Own diary only |
| Other teacher (incl. co-teacher) | No | No | No | No |
| Substitute | No v1 | No v1 | No | No |
| Office | No | No | No | No |
| Student | No | No | No | No |
| Parent (linked child in class) | No | No | RPC only | No |
| Other class / anonymous | No | No | No | No |

### 3.6 `target_id` on links

Nullable when `target_kind=pack` (use `deck_id`+`lesson_version`). CHECK: assignment/file require `target_id`; pack requires deck+version.

## 4. AI draft

**Server-side keys only.** Prod Edge `XAI_API_KEY`. Local `npm run ai:dev` + Grok CLI OAuth. Never `EXPO_PUBLIC_*`. Company TTS (`grok-tts`) is **not** this path.

### 4.1 Flow

1. Teacher invokes “Draft plan” (web panel or Ask) with **topic / unit / standards / grade / class_id** (optional syllabus excerpt the teacher **pastes** — no silent roster or syllabus scrape).
2. Matcher binds **one taught class**. Unassigned → picker. **Never invent `class_id`.** Never `classes.create`.
3. Edge (or Ask tool handler) calls the model → structured JSON matching §2.2 fields (not HTML).
4. Client parks JSON in the editor. Teacher edits.
5. **Save** → `save_lesson_plan_draft` with `source=ai_draft`. Status stays `draft`.
6. **Publish is a separate human control.** Model and Ask **must not** call `publish_lesson_plan`.

Optional later assists (still draft): standards tag suggestions, timing split, materials expansion.

### 4.2 Hard refuses

- Auto-publish, silent span/calendar write, parent share
- Class create, student create, grade Approve / `approved_score`
- Twin merge / other-class write
- Prompts containing roster names, grades, IEP full text, sibling names, doctor notes, diary body
- Parent/student invoking plan AI
- Office JWT (`teacherSeatOnly`)
- “Ask as superuser”

### 4.3 Logging

Tag `source=ai_draft`. Log request id, uid, class_id, latency, error class. **Do not** log full prompt/completion, differentiation, or teacher_notes. Do not `write_audit` drafts. Do not `write_ledger` until Publish.

### 4.4 Edge sketch

`draft-lesson-plan`: JWT required. `class_teacher_of` **before** vendor. No image fetch unless a later photo-import card (out of v1). Returns JSON only. Must **not** UPDATE `lesson_plans`.

## 5. Joins (CAL / DIARY / LAND)

Do not rebuild those products. Plans are the **canonical body**. Others **reference**.

### 5.1 Calendar (CAL-P1) — join keys

**Do not INSERT `calendar_events` for a plan.** Dual-write of title/span/body is forbidden. CAL reads a **projection**.

Join key (stable for CAL-A1):

| Field | Source |
|---|---|
| `source_kind` | `'lesson_plan'` (not `'assignment'`, not pack) |
| `source_id` | `lesson_plans.id` |
| `class_id` | `lesson_plans.class_id` |
| `owner_profile_id` | `lesson_plans.owner_profile_id` |
| `starts_at` / `ends_at` / `all_day` | Plan span columns |
| `category` | **`plan`** — **new chip**. Do **not** reuse CAL-P1 `lesson` (`assignments.kind=lesson`). |
| `title` | Plan title (label only; **no body**) |
| `visibility` | Derived from `status` + hat (below) |

Projection rules:

| Plan state | Owner teacher calendar | Student / parent calendar | Office |
|---|---|---|---|
| Draft, no span | Library only | No | No |
| Draft + span | Yes (owner layer, hidden from family) | **No** | No |
| Published + span | Yes, category `plan` | **No in v1** (fail-closed occupancy leak) | No homework/plan firehose |
| Published, no span | Library; calendar silent | No | No |
| Unpublish / archive | Owner may still see archived in library | Join **gone immediately** | No |

Assignment `due_at` projections stay on assignments. A plan **link** to an assignment does not move `due_at`. Pop quiz hide stays CAL-P1 `calendar_visibility` — plans do not force a firehose.

CAL query union (when that card ships): `calendar_events` ∪ assignment dues ∪ **this projection**. Filter chips: add `plan`; default-on for **teacher**; default-**off** for family (they should not see the chip until a later share-title decision).

### 5.2 Diary (DIARY-A1)

- Reflection lives in `diary_entries`. **No** diary columns on `lesson_plans` besides optional short `teacher_notes` (still teacher-only, not journal).
- FK: `diary_entries.related_plan_id` → `lesson_plans.id` ON DELETE SET NULL. DIARY-A1 marked **v1 omit** — keep that until Diary ships. LPLAN v1 UI may deep-link “Reflect in Diary” with `planId` query param; persist the FK when both exist.
- **1:N** (many diary rows per plan). Do not FK the other way.
- Teaching / publishing a plan does **not** auto-insert Diary or student Log.
- Diary SELECT stays owner-only. `related_plan_id` is **not** an ACL grant to co-teachers or office.
- Accreditation evidence = published plans (+ later coverage reports). **Not** private diary contents.
- Ledger: Publish/unpublish/archive may `write_ledger` for the owner. Draft save / AI park / diary CRUD do not.

### 5.3 Landing (LAND-P1)

- Live block “lesson focus” is a **link**, not an embed of procedures.
- **Teacher** landing: link to today’s **published** plan for that class (span overlaps local today). Drafts hidden.
- **Family** landing: **no** link to full plan. If `summary_shared_at` set, landing may show the same narrow summary the RPC returns — or omit and keep LAND `daily_focus` as the only student-facing blurb. **Lock: family landing does not deep-link the plan editor.** `daily_focus` remains a separate named region.
- Unpublished / archived: no landing chip.

### 5.4 Sequencing

LPLAN can ship without CAL/DIARY/LAND tables existing: span columns live on the plan; projections no-op until CAL queries them. Do not block this schema on CAL-A1. CAL-A1 must consume `source_kind=lesson_plan` rather than inventing a second span table.

## 6. v1 vs later / locked decisions

| # | Question | Decision |
|---|---|---|
| 1 | Plan vs assignment | **New `lesson_plans`.** Assignments optional links only. |
| 2 | Author packs | Link `deck_id`+version. Never store HTML. `publish_lesson_pack` frozen. |
| 3 | Calendar body copy? | **No.** Projection `source_kind=lesson_plan`. Category **`plan`**. |
| 4 | Family calendar occupancy | **No v1.** Teacher only. |
| 5 | Diary on plan row? | **No.** FK on diary, later. |
| 6 | Parent payload | Column `parent_summary` + `summary_shared_at`; **RPC not table SELECT**. Unpublish unshares. |
| 7 | Co-teacher | **Parked.** Owner-only full body. |
| 8 | Office | **None** v1 (no read, no write). |
| 9 | Writes helper | `class_teacher_of` + owner. **Not** `teaches_class`. |
| 10 | Capability | New `lesson_plan.manage` own / teacherSeatOnly. |
| 11 | AI publish | **Never.** |
| 12 | Sub SELECT | **Parked.** Owner print/export. |
| 13 | Templates table | **No v1.** Copy-forward clone. |
| 14 | Standards catalog | Free-text jsonb. Soft warn on publish. |
| 15 | TEACH-UX slot | Not this card. Must not add a tray tab; Plans segment under Teaching/Desk. |

### v1

Core fields, draft/publish/archive, copy-forward, AI structured draft, span columns, teacher calendar projection contract, parent summary RPC, Ask `draft_lesson_plan` only, ledger on publish.

### Later (do not staff)

Office published-plan list; co-teacher; sub cover SELECT; family calendar title chip; attachments bucket; school templates; Cognia taught-vs-planned export; recurring unit wizard; hard district standards lock.

## 7. Threat notes (later Security card)

| ID | Threat | v1 mitigation |
|---|---|---|
| T1 | Office SELECT via `teaches_class` copy-paste | Owner-only policies; tests `doesNotMatch` |
| T2 | Parent PostgREST reads differentiation | No family table SELECT; RPC column allow-list |
| T3 | Ask `publish_lesson_plan` tool | Tool not registered; unknown denied |
| T4 | AI prompt PII | Paste-only context; no roster scrape |
| T5 | Unpublish still on family calendar | Status-driven projection; unpublish → draft + unshare |
| T6 | Pack/assignment delete orphans | Soft links; no cascade onto plan |
| T7 | Twin merge on summary RPC | Require `p_student_id`; else empty |
| T8 | Crypto theater | Honest RLS copy |

## 8. Acceptance

- [x] `lesson_plans` vs `assignments` vs Author packs
- [x] Draft / publish / archive; RPCs own status
- [x] Calendar join keys (`source_kind`, `source_id`, span, category `plan`)
- [x] RLS fail-closed; `class_teacher_of`; no `teaches_class` writes
- [x] AI draft never auto-publish
- [x] Parent summary RPC only if shared; diary separate
- [ ] CEO / CoS review
- [ ] **No implementation** until Chuck says send

**Recommended next action:** CEO/CoS review. Do not staff `senior-developer` until Chuck says send.

