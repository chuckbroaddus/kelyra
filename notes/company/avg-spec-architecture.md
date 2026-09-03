# AVG-A1: Syllabus data model — architecture review (no SQL)

**Date:** 2026-09-02  
**Author:** software-architect  
**Ticket:** t_cb0b3bcc  
**Status:** Opinion + schema sketch only. **No migrations applied. No Edge. No kelyra-qa-loop.**  
**Depends on:**  
- `notes/company/avg-spec-syllabus-ia.md` (AVG-P1)  
- `notes/company/avg-spec-ask-photo-import.md` (AVG-P2)  
- Live: `docs/data-model.md`, `src/lib/grade/marks.ts`, `src/lib/ai/askToolPolicy.ts`, `src/lib/school/matrix.ts`, `supabase/migrations/20260819000008_class_teachers_office.sql`, `supabase/migrations/20260824000001_lesson_assignments.sql`  
- CEO 2026-08-27 / `notes/authoring/kinds-metrics.md`

**Gate:** Implementation remains forbidden until AVG-GATE `t_eea9ba55` has a **written CEO yes**.

---

## 0. Verdict

| Question | Answer |
|---|---|
| Schema sketch complete enough for a future loop? | **Yes** (this file). |
| RLS / privilege wall sketched? | **Yes**. |
| Migration sequencing designed? | **Yes** — not applied. |
| **Implementation loop ready?** | **NO until CoS+CEO gate.** |

Do not staff `kelyra-qa-loop`. Do not add SQL under `supabase/migrations/`. Do not register Ask tools. Do not change `publish_lesson_pack`.

Recommended next (still gated): QA acceptance plan (`t_8f7c0d1a`) + Security S1, then CoS brief to CEO.

---

## 1. Compatibility: Author, `publish_lesson_pack`, `kind=lesson` only

AVG is **class-app gradebook**. It must not leak into Author packaging.

| Surface | v1 contract |
|---|---|
| `publish_lesson_pack` Edge | **Unchanged.** No syllabus fields, no category weights, no `include_in_average` defaults, no `class_syllabi` writes. Pack catalog stays `lesson_packs` (HTML `kind=lesson`). |
| `assignments.kind` | No new enum values. Quiz / test / midterm / final are **`assignments.category` labels**, not players. |
| Author studio | May hint a suggested category string on a pack. **Must not** emit `class_syllabi` rows or embed final weights in HTML metrics. |
| `assignLesson` / plan / capture Approve | Bind point is the **class app assign UI**: teacher picks a category from this class’s published keys (or GradeKind fallback if no published syllabus). `include_in_average` seeds from category `default_include_in_average`, else **false**. Never `true` merely because `category` is `quiz` or `test`. Lesson path today already defaults include false (`src/lib/lessons/api.ts`) — keep that fail-closed. |
| Lesson metrics | Stay evidence in `submissions.answers` until teacher **Approves**. Syllabus engine reads `approved_score` only. |

If a future implementer is tempted to “set include true for Check-heavy packs,” that is a **product regression**, not a convenience.

---

## 2. Locked answers to P1 §10

| # | Question | Decision (v1) |
|---|---|---|
| 1 | Normalize scores | **`approved_score` is 0–100.** `parseScoreInput` already rejects outside 0–100. Ignore `max_score` in the average. Later: optional `score/max_score` mode. Mixed legacy >100: treat as non-numeric (omit cell) rather than rescale. |
| 2 | Empty categories | **Omit + renormalize** among categories with ≥1 eligible cell. Disclose in “why this average.” Do **not** contribute 0. Do **not** hide overall solely for missing min-grades (warning only). |
| 3 | `weight_band` / `weight_percent` | **Keep columns.** When a syllabus is **published**, they are **display-only** (optional “Major work” hint). They **do not** enter the final. No dual-run. No per-assignment override of category weight. Unpublished fallback: **do not invent weights**; no silent 40/60; no band→percent map. |
| 4 | Makeup identity | **Data:** `assignments.is_makeup boolean not null default false` (additive, nullable-not-needed). **Code:** replace/cap algorithm in a pure TS module. No title-regex. No separate makeup category required (rule may point at same `key`). |
| 5 | One syllabus vs year | **1:1 `class_id` UNIQUE.** Archive+clone when the teacher starts a new class/year. No history table in v1. In-place publish replace + `write_audit`. |
| 6 | JSON vs `syllabus_rules` rows | **JSON** on `class_syllabi.policies` and `syllabus_categories.rules`. Audit the blob on confirm/publish. Promote to rows only if office needs per-knob history. |
| 7 | Hard FK vs string `category` | **Keep `assignments.category` text.** Unique `(syllabus_id, key)`. No `syllabus_category_id` in v1 (avoids dual-write with Author/assign). Orphan keys (assignment category not in published set) → teacher “Uncategorized”; **excluded** from type averages. |
| 8 | Co-teachers / office templates | **Co-teachers:** any `class_teachers` row for `auth.uid()` may CRUD this class’s syllabus. **Office: no write, no parse, no school-wide template** in v1. Schema hook = existing `class_teachers`. Do **not** reuse `teaches_class()` for writes (see §5). |
| 9 | Concurrent edit / mid-term weights | **Always live.** Averages recompute on read. Optimistic lock via `row_version`. Confirm of a new published set must warn that family averages change; past `approved_score` values stay. No report-card snapshot table in v1. |
| 10 | Rounding | **Final only.** Default `nearest_whole`. Type averages stay unrounded internally (IEEE number); UI may show 1 decimal. Do not round-then-weight. |
| 11 | Behavior / participation | **Do not force Pass/Fail.** Teacher sets `score_scheme`. If a category has no numeric eligible cells, omit + renormalize. |
| 12 | Materialize running averages | **Compute on read** in `src/lib/grade/syllabusAverage.ts` (pure). Roster grid: one assignments+submissions fetch, then the function. Materialize later if profiling says so. Family path: SECURITY DEFINER RPC that returns **explanation JSON**, not raw classmates. |

---

## 3. Schema sketch (not applied)

Names are proposed. Implementer may prefix with a dated migration **only after CEO yes**.

### 3.1 `class_syllabi` — 1:1 with `classes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `class_id` | uuid UNIQUE NOT NULL | FK `classes(id)` ON DELETE CASCADE |
| `status` | text NOT NULL | `draft` \| `published` \| `archived`. Default `draft`. |
| `title` | text | Optional |
| `calc_mode` | text NOT NULL | v1: `category_weight` only. CHECK that value. |
| `term_structure` | text NOT NULL | `quarters` \| `semesters` \| `year` \| `custom`. Default `year`. |
| `active_term` | text | Nullable; must be a `GRADE_TERMS` key if set |
| `grading_scale` | jsonb | Display cutoffs; not used in numeric engine |
| `policies` | jsonb NOT NULL default `{}` | Class knobs (§3.4) |
| `terms` | jsonb NOT NULL default `[]` | Array of `{key, label, sort_order, weight_percent, starts_on, ends_on}`. `weight_percent` **ignored in v1**. Keys ⊆ `q1`…`year`. |
| `source` | text NOT NULL | `manual` \| `ask_import` \| `copied` |
| `source_asset_id` | uuid | FK `assets(id)` ON DELETE SET NULL. **Teacher-only.** |
| `ask_draft` | jsonb | Last P2 `schema_version: 1` draft. **Teacher-only. Never family-visible.** |
| `publish_to_family` | boolean NOT NULL | Default `true`. Denormalized from policies for RLS predicates (do not make RLS parse jsonb). Confirm RPC keeps this column in sync with `policies.publish_to_family`. |
| `published_at` | timestamptz | |
| `row_version` | int NOT NULL default 1 | Optimistic lock |
| `created_at` / `updated_at` | timestamptz | |

**Why `publish_to_family` is a column:** family SELECT / RPC must filter without jsonb operators in policies.

**Why `ask_draft` stays on this row (P1/P2 contract), not a twin of `roster_imports`:** one parked draft per class is enough for v1; re-scan replaces JSON only. **Column leak risk is real** (Postgres RLS is row-level). Mitigate with:

1. Family **must not** `SELECT` this table. Use RPCs/views that omit `ask_draft`, `source_asset_id`.  
2. Teacher client may SELECT the row.  
3. If S1 requires belt-and-suspenders, a later `syllabus_imports` table can take the draft; do not block v1 design on it.

### 3.2 `syllabus_categories`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `syllabus_id` | uuid NOT NULL | FK `class_syllabi(id)` ON DELETE CASCADE |
| `key` | text NOT NULL | Slug; unique per syllabus. Prefer `GRADE_KINDS` keys; class-local custom allowed (`^[a-z][a-z0-9_]{0,31}$`). |
| `label` | text NOT NULL | Teacher-facing |
| `weight_percent` | numeric(6,3) NOT NULL | Share of final. Active rows must sum to 100 ± 0.01 **at publish**. |
| `sort_order` | int NOT NULL | |
| `active` | boolean NOT NULL default true | Soft-hide; inactive excluded from sum and calc |
| `group` | text | `formative` \| `summative` \| null — hint only |
| `default_include_in_average` | boolean NOT NULL default **false** | Seed only. Never quiz→true. |
| `min_grades_per_term` | int | Soft warning |
| `rules` | jsonb NOT NULL default `{}` | Per-category knobs (§3.4) |
| `created_at` | timestamptz | |

Unique `(syllabus_id, key)`.

### 3.3 What stays on `assignments` / `submissions`

**No change in the first syllabus migration** except the additive makeup flag (may ship in the same file or immediately after):

| Column | Action |
|---|---|
| `category` | Unchanged text. When syllabus published, assign UI restricts to active keys. |
| `term` | Unchanged. Membership for `GRADE_TERM_ROLLUP`. |
| `include_in_average` | Unchanged. “Counts in **type** average.” SQL default remains true for legacy planned rows; **lesson assign stays false**. |
| `weight_band`, `weight_percent` | **Stay.** Ignored by syllabus engine when status=published. |
| `score_scheme`, `max_score` | Unchanged. Pass/Fail never numeric-average. |
| `kind` | Unchanged (`planned` \| `capture` \| `practice` \| `lesson`). |
| **`is_makeup`** | **New bool default false.** Data for replace-lowest. Engine no-ops if no category rule enabled. |
| `submissions.approved_score` / `approved_at` / `score_mark` | Sole numeric inputs. Draft/AI never. |

Do **not** add `excused` in v1 unless product already has it. Missing vs not-due: `due_at` + clock + presence of approved score (P1/P4). Excused can wait (or a later `submissions.excused boolean`).

### 3.4 JSON contracts (engine allow-list)

Unknown keys are **stored** (so Ask can park `deferred_signals`) but **ignored by calc**. Publish RPC should warn on unknown **enabled** rule kinds.

**`class_syllabi.policies` (v1):**

```json
{
  "extra_credit_allowed": false,
  "late_penalty_mode": "none | manual",
  "makeup_window_days": null,
  "redo_max_percent": null,
  "min_floor_percent": null,
  "rounding": "nearest_whole | none",
  "missing_as_zero": false,
  "publish_to_family": true
}
```

`late_penalty_mode` is **not an engine** in v1 (`manual` = teacher typed the score). `makeup_window_days` is advisory.

**`syllabus_categories.rules` (v1):**

```json
{
  "drop_lowest_n": 0,
  "replace_lowest_with_makeup": {
    "enabled": false,
    "makeup_category_key": "test",
    "cap_percent": 85,
    "max_replacements": 1
  }
}
```

Makeup columns: `assignments.is_makeup = true` **and** (category = `makeup_category_key` OR same category as the rule’s parent). Do not double-count a replacement vehicle in the mean.

### 3.5 Indexes (sketch)

- `class_syllabi(class_id)` unique  
- `syllabus_categories(syllabus_id, sort_order)`  
- `assignments(class_id, category, term)` already useful; add only if explain shows seq scans  

No generated average columns.

---

## 4. Average engine — data vs code

| Concern | Data (tables / JSON) | Code (pure module) |
|---|---|---|
| Category set + weights | `syllabus_categories` | Weighted sum + renormalize |
| Term membership | `assignments.term` + existing `GRADE_TERM_ROLLUP` | Filter cells for UI term T |
| Counts in type average | `include_in_average` | Eligibility predicate |
| Drop lowest N | `rules.drop_lowest_n` | Sort numeric cells, drop N |
| Makeup replace + cap | `is_makeup` + `replace_lowest_with_makeup` | Cap makeup, replace lowest non-makeup, exclude vehicle from extra mean |
| Floor / rounding | `policies.min_floor_percent`, `rounding` | Apply **after** weighted sum |
| Missing as zero | `policies.missing_as_zero` (default **false**) | Only due + no approved + not excused |
| Not-yet-due | `due_at` | **Never** a grade, never a Canvas-style zero |
| Pass/Fail | `score_mark` / scheme | `numericScoreForAverage` — exclude |
| Unpublished class | no published row | **No invented weights.** Hide overall or unweighted mean of included numerics with banner |

**Do not** implement the engine as Postgres functions in v1. Golden tests belong in TS (`syllabusAverage.test.ts`) with fixtures from P1 §9.1.

**Term-boundary risk (explicit):** v1 year filter = all member terms’ **columns**, then category weighting — **not** “Q1 40% + Q2 40% + exam 20%.” `terms[].weight_percent` is stored for later and **must not** be read by v1 calc. UI copy must not imply a year composite.

**Weight-sum risk (explicit):** cannot CHECK sum across child rows cheaply. Enforce in **publish/confirm RPC** only. Drafts may sum ≠ 100. Do not auto-normalize. Inactive categories excluded. Epsilon ± 0.01.

---

## 5. RLS sketch — do not copy `teaches_class` for writes

### 5.1 The live trap

`public.teaches_class(class_id)` is true when **`is_school_admin()` OR `class_teachers`**. Office therefore passes every `assignments_via_class` policy.

P1/P2 altitude: **office does not own class grade policy in v1.** Reusing `teaches_class` for syllabus **INSERT/UPDATE/DELETE** would let superintendent/administrator publish weights for a class they do not teach.

Lesson catalog already avoided this: `lesson_packs` SELECT is `class_teachers` only, “Not is_staff, not is_school_admin” (`20260824000001_lesson_assignments.sql`).

### 5.2 New helper (sketch)

```
class_teacher_of(p_class_id uuid) → boolean
  -- security definer, stable
  -- true iff auth.uid() has class_teachers(class_id, teacher_id)
  -- NOT is_school_admin()
```

`also_teacher` hat is irrelevant unless a `class_teachers` row exists.

### 5.3 Table policies (intent)

**`class_syllabi`**

| Command | Who |
|---|---|
| SELECT (full row, including draft/ask_draft) | `class_teacher_of(class_id)` |
| INSERT / UPDATE / DELETE | `class_teacher_of(class_id)` only |
| Family / student SELECT | **None on the table** |
| Office SELECT | **None in v1** (no office gradebook). Revisit later as published-only, still no `ask_draft`. |

**`syllabus_categories`**

Same: CRUD iff `class_teacher_of` on parent syllabus’s class. No family table SELECT.

**`assignments.is_makeup`**

Rides existing `assignments_via_class` (`teaches_class`). Office can already edit assignments; that is live behavior, not a new hole. Do not special-case.

### 5.4 Family / student read path (RPC, not table)

Mirror `parent_progress` / student todo:

| RPC | Caller | Returns |
|---|---|---|
| `published_class_syllabus(p_class_id)` | student enrolled in class **or** parent linked via `parent_students` to an enrolled child | `{ title, calc_mode, term_structure, categories[{key,label,weight_percent,sort_order}], policies_public }` — **no** `ask_draft`, `source_asset_id`, rule **editors**, inactive categories optional |
| `student_class_average_explain(p_class_id)` | `my_student_id()` enrolled | Own type avgs + overall + dropped/replaced ids. Post-Approve cells only. |
| `parent_class_average_explain(p_class_id, p_student_id)` | parent linked to **that** student + enrollment | Same, one child. No sibling blend. |

Gate inside RPC: syllabus `status = published` AND `publish_to_family = true`. Else return “weights not published” without leaking draft.

Students **own** submission cells today via student RPCs; they still do **not** own syllabus rows.

### 5.5 Confirm / draft RPCs (teacher)

| RPC | Notes |
|---|---|
| `upsert_syllabus_ask_draft(p_class_id, p_draft jsonb)` | `class_teacher_of`. Does **not** publish. Validates `schema_version = 1` loosely; does not invent weights. |
| `discard_syllabus_ask_draft(p_class_id)` | Clears `ask_draft` only. |
| `save_class_syllabus_draft(p_class_id, payload)` | Manual/Ask-edited structure, `status=draft`. Sum may be incomplete. |
| `publish_class_syllabus(p_class_id, payload, p_row_version)` | **The write.** Validates: ≥1 active category; unique keys; sum 100 ± 0.01; `calc_mode=category_weight`; no quiz→include shortcut in defaults; `class_teacher_of`; optimistic lock. Sets `published_at`, increments `row_version`, syncs `publish_to_family`, `write_audit('publish_class_syllabus', ...)`. Replaces live categories in a transaction. **Does not** touch submissions or bulk-flip `include_in_average`. |

Vision Edge `parse-class-syllabus` (future): JWT + `class_teacher_of` **before** fetching the image. Must **not** UPDATE published columns. Client or `upsert_syllabus_ask_draft` parks JSON.

---

## 6. Ask tools (future names) + privilege wall

**Do not implement.** When the gate lifts, register **identical** maps in `src/lib/ai/askToolPolicy.ts` and `supabase/functions/_shared/askToolPolicy.ts` (existing twin test).

### 6.1 New capability (do **not** reuse `assignments.manage`)

`assignments.manage` is `superintendent/administrator: school`. Office would inherit scan/confirm.

Add matrix capability:

```
syllabus.manage  — Class grading policy (weights, rules)
  superintendent: none
  administrator: none
  teacher: own
  parent: none
  student: none
```

Need = `own` (taught class). Extra runtime check: `class_teacher_of(class_id)` on every tool handler. Unknown tool names stay denied.

Office walls: **not** `officeOnly: true` (that would *require* office). These tools are **teacher-seat only**. If the implementer needs a policy flag, add `teacherSeatOnly: true` that returns false for `isOfficeRole` **unless** that office user also has a `class_teachers` row (unusual; still the SQL check is source of truth).

### 6.2 Tool table

| Name | Capability | Writes | Privilege wall |
|---|---|---|---|
| `scan_class_syllabus` | `syllabus.manage` | `ask_draft` only | Taught class; no office-wide parse; no student/parent |
| `get_class_syllabus_draft` | `syllabus.manage` | none | Same class |
| `discard_class_syllabus_draft` | `syllabus.manage` | clears draft | Same |
| `confirm_class_syllabus` | `syllabus.manage` | publish via RPC | **UI/RPC primary.** If Ask exposes it: structured **teacher-edited** payload + `row_version`; never raw model JSON. Same validations as `publish_class_syllabus`. |
| `get_published_class_syllabus` | `gradebook.view` / `children.view` own | none | Student: own enrollment. Parent: linked child. Published + `publish_to_family`. |
| `explain_my_class_average` | same | none | Own / linked child cells only. Post-Approve. |

Student/parent **must not** receive scan/confirm/discard. Fail closed if a modified client sends them.

`parse-class-syllabus` is an **AI gateway function name**, not an Ask tool. No `EXPO_PUBLIC_*` keys. Local `npm run ai:dev` + production Edge `XAI_API_KEY`. Follow existing SSRF rules for image URLs.

---

## 7. Migration sequencing (design only)

Apply **nothing** now. When CEO yes, one loop, this order:

| Step | Contents | Must not |
|---|---|---|
| **M1** | `class_teacher_of`; `class_syllabi`; `syllabus_categories`; RLS; teacher RPCs `save`/`publish`/`discard`/`upsert_ask_draft`; `write_audit`; grants | Touch `publish_lesson_pack`; drop `weight_band`; change `assignments.kind`; enable Ask tools |
| **M2** | `assignments.is_makeup` default false | Backfill true from titles |
| **M3** (app, same loop or immediately after) | Pure `syllabusAverage` + tests; teacher setup UI; assign picker uses published keys; family RPCs + serializers omit drafts | Quiz→include shortcut; silent default weights |
| **M4** (separate, still gated) | `parse-class-syllabus` Edge + Ask tools + policy twins + security tests | Auto-publish inside the vision function |

`weight_band` / `include_in_average` **remain** until a designed deprecation (not v1). Dual-write of averages is forbidden.

Rollback: DROP new tables/RPCs; `is_makeup` is additive and harmless if unused.

---

## 8. Risks (named)

1. **Weight sum** — publish-time only; drafts off-100; no silent normalize; inactive rows excluded.  
2. **Term boundaries** — v1 uses `GRADE_TERM_ROLLUP` membership, not multi-term composites. Year ≠ weighted quarters. Custom structure is labels on existing keys.  
3. **Makeup as data vs code** — identity + caps are data; replace algorithm is tested code. Title-matching will misfire; require `is_makeup`.  
4. **`teaches_class` office bypass** — syllabus writes must use `class_teacher_of`.  
5. **`ask_draft` column leak** — family never SELECTs `class_syllabi`.  
6. **Orphan `assignments.category`** after key rename — **forbid key rename** in v1 (relabel `label` only).  
7. **Live weight edits mid-term** — averages jump; confirm copy required; no snapshot.  
8. **Empty category renormalize** — families must see disclosure (P4 why-average).  
9. **Author / lesson path** — `include_in_average` default false must survive syllabus seed unless teacher opts in.  
10. **Missing zeros** — default `missing_as_zero=false`; not-due is never zero (Canvas trap).  
11. **Rubric photos** — P2: criteria never become `weight_percent`. Confirm RPC ignores `rubric_draft` for category writes.  
12. **Performance** — on-read is enough for MVP rosters; do not add triggers that write grades.

---

## 9. Future implementation ACs (not this ticket)

Copied/tightened from P1 §9 for the **post-gate** loop:

1. M1–M2 exist with RLS as §5.  
2. Publish validates sum, keys, taught-class, no quiz shortcut.  
3. Assign/lesson-assign pick published categories; copy “counts toward [Type] average.”  
4. Pure average tests: simple weights; drop 1; makeup cap 85; Pass/Fail excluded; unpublished fallback; empty renormalize; not-due not zero.  
5. No `EXPO_PUBLIC_` model keys.  
6. `publish_lesson_pack` diff empty.  
7. Family RPC omits `ask_draft`.  
8. Ask tools (if M4) denied for parent/student/office-without-seat.

**Non-acceptance:** quiz→include as the gradebook; silent district defaults; rubric→weights; auto-zero missing without policy; office-wide import.

---

## 10. Implementation loop ready?

**NO.**

This document is the architecture opinion. AVG-GATE `t_eea9ba55` still requires Chuck’s written go. Downstream Q1 (`t_8f7c0d1a`) may write an acceptance **plan** against this sketch. Nobody applies SQL.

---

## 11. Sources

- P1 IA: category weighting; include = type membership; Ask never auto-publishes; Author bind at assign.  
- P2: tool names, draft JSON, taught-class wall, FERPA inputs.  
- Live `teaches_class` includes office; lesson_packs already used `class_teachers` only.  
- `GRADE_KINDS` / `GRADE_TERM_ROLLUP` / `numericScoreForAverage`.  
- `assignLesson` include default false.  
- CEO: type averages → weighted final; nothing is a grade until Approve.

**Architect decisions:** `class_teacher_of` for writes; new `syllabus.manage` (office none); JSON rules; string category keys; ignore assignment `weight_percent` when published; on-read TS engine; `is_makeup` additive; family RPC not table SELECT; `publish_lesson_pack` frozen.

---

**RECOMMENDED NEXT ACTION:** QA acceptance plan. CoS gate. No kelyra-qa-loop. No SQL.
