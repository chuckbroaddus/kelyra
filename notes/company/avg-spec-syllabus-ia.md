# AVG-P1: Class Syllabus Information Architecture + Rules Model

**Date:** 2026-09-02  
**Author:** product-manager  
**Ticket:** t_92ce6080  
**Status:** Spec only — no app code, no migrations, no kelyra-qa-loop.  
**Depends on:**  
- `notes/company/avg-research-syllabus-conventions.md` (AVG-R1)  
- `notes/company/avg-research-rubrics-vs-syllabus.md` (AVG-R2)  
- CEO model 2026-08-27 (`notes/authoring/kinds-metrics.md`, worklist AVG HOLD)  
- Live grade-book columns in `docs/data-model.md` (`assignments`)  

**Non-goals of this ticket:** Teacher UI wireframes (P3), Ask/photo import flow (P2), family view (P4), Architect SQL, implementation.

---

## 1. Product model (locked)

Teacher defines the **class syllabus** at class setup:

1. Which **assignment types** (categories) exist for this class.
2. Each type’s **weight toward the final** (e.g. Homework 10%, Tests 40%).
3. The **term structure** the class uses (quarters / semesters / year).
4. **Special rules** (example: a makeup replaces the lowest test, capped at 85%).

Computation:

- For a given term window, average the numeric cells that **count** inside each type → **type average**.
- Weight those type averages by syllabus weights → **term / final average**.
- `assignments.include_in_average` means: **this column counts in its type average**, not “this column is a slice of the final.”
- Nothing is a grade until the teacher **Approves** a submission/capture.
- **Do not** ship the old shortcut “quiz → `include_in_average=true`” as the gradebook.

Author still emits `kind=lesson` HTML only. Quiz / test / midterm / final are **labels** on `assignments.category`, not separate players.

---

## 2. Separation of concerns (from R1 / R2)

| Object | Scope | Owns | Does not own |
|---|---|---|---|
| **ClassSyllabus** | One class (+ optional active term config) | Categories, weights, term structure, class-wide policies, publish state | Per-assignment scoring criteria |
| **SyllabusCategory** | Child of ClassSyllabus | Name, weight %, sort, default include flag, per-category rules | Individual assignment scores |
| **Assignment** (existing) | Grade-book column | Title, kind, category key, term, include_in_average, score scheme, keys | Syllabus weight of its type |
| **AssignmentRubric** | Per assignment (later) | Criteria, levels, points | Category weights |
| **Submission** (existing) | Cell | draft_score / approved_score | Policy |

Parse target for photo/Ask in this epic: **ClassSyllabus + Categories** (grading policy). Rubric parse is deferred (P2 may store unstructured attachment only).

---

## 3. Live state vs proposed state

### 3.1 Live today (do not pretend this already works)

`assignments` already has:

| Field | Role today | Role after syllabus |
|---|---|---|
| `category` | Free text / GradeKind label (`homework`, `quiz`, `test`, …) | **FK-like key** into syllabus categories (same string keys for v1; must match a live category when syllabus is published) |
| `term` | `q1`–`q4` \| `s1` \| `s2` \| `year` | Unchanged — which marking period the column belongs to |
| `weight_band` | `none` \| `daily` \| `major` \| `custom` | **Legacy / display only in v1 averages.** Syllabus category weight replaces band-as-final-slice. Keep column for migration and optional UI hint (“Major work”) until Architect deprecates |
| `weight_percent` | Used when `custom` | **Deprecated for final calc in v1.** Optional override path is an open Architect question (see §10). Default: ignored when class syllabus is active |
| `include_in_average` | Bool; SQL default true; lesson assign defaults false | **Counts in type average** when true and score is numeric (Pass/Fail never averages) |
| `score_scheme` | `numeric` \| `pass_fail` \| `either` | Unchanged |
| `max_score` | Optional | Needed for points→% if Architect chooses points mode later; v1 averages on 0–100 approved scores |

No class-level syllabus table. `marks.ts` only labels bands/terms. Running averages are not a first-class syllabus-weighted engine.

### 3.2 Proposed tables (sketch — Architect finalizes names/SQL)

#### `class_syllabi` (1:1 with `classes` for v1)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `class_id` | uuid UNIQUE FK `classes` ON DELETE CASCADE | One active syllabus per class in v1 |
| `status` | text | `draft` \| `published` \| `archived` |
| `title` | text | Optional (“Room 14 Math — Fall 2026”) |
| `calc_mode` | text | v1: `category_weight` only. Later: `total_points` |
| `term_structure` | text | `quarters` \| `semesters` \| `year` \| `custom` |
| `active_term` | text nullable | Current working period (`q1`…); optional UI default |
| `grading_scale` | jsonb nullable | e.g. letter cutoffs; display only in v1 |
| `policies` | jsonb | Class-wide defaults (see §5) |
| `source` | text | `manual` \| `ask_import` \| `copied` |
| `source_asset_id` | uuid nullable | Photo used for Ask import |
| `ask_draft` | jsonb nullable | Last proposed structure; never live until confirm |
| `published_at` | timestamptz nullable | |
| `created_at` / `updated_at` | timestamptz | |

**Altitude:** Owned by the **class teacher** (same RLS owner pattern as the class). Office does **not** set school-wide syllabi in v1. Superintendents/admins may view if product later allows; edit stays with taught-class teacher.

#### `syllabus_categories`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `syllabus_id` | uuid FK | |
| `key` | text | Stable slug matching `assignments.category` where possible (`homework`, `test`, …). Unique per syllabus |
| `label` | text | Teacher-facing (“Unit tests”) |
| `weight_percent` | numeric | Share of final for this type. Sum of **active** categories must = 100 (± epsilon) when published |
| `sort_order` | int | |
| `active` | bool | Soft-hide without deleting history |
| `group` | text nullable | Optional `formative` \| `summative` (policy hint; not separate calc in v1) |
| `default_include_in_average` | bool | Seed for new columns of this type; **never** auto-force quiz=true |
| `min_grades_per_term` | int nullable | Soft warning only in v1 |
| `rules` | jsonb | Per-category rule pack (see §5) |
| `created_at` | timestamptz | |

Seed set should align with existing `GradeKind` keys so Author/assign UI does not invent parallel vocab. Teachers may add `other` or custom keys; custom keys become valid `assignments.category` values for that class only.

#### `syllabus_terms` (optional normalized; may start as JSON on syllabus)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `syllabus_id` | uuid FK | |
| `key` | text | `q1`…`year` — must stay compatible with `assignments.term` + `GRADE_TERM_ROLLUP` |
| `label` | text | |
| `sort_order` | int | |
| `weight_percent` | numeric nullable | **v2+** multi-term rollup into year (e.g. Q1 40 + Q2 40 + Exam 20). v1: null = equal/simple filter, no year composite engine |
| `starts_on` / `ends_on` | date nullable | Optional calendar |

#### `syllabus_rules` (optional rows; v1 may live entirely in JSON)

Prefer **typed JSON on category + class** for v1 speed; promote to rows if Architect wants auditability.

Illustrative rule row:

| Field | Notes |
|---|---|
| `scope` | `class` \| `category` |
| `category_id` | nullable |
| `kind` | see §5 |
| `params` | jsonb |
| `enabled` | bool |

#### What stays on `assignments` (no new required columns for v1 calc)

- `category` → resolves to `syllabus_categories.key`
- `term` → marking period membership
- `include_in_average` → membership in type average
- Scores via `submissions.approved_score` + numeric mark only

**Do not** add `syllabus_category_id` unless Architect wants hard FK; string `key` is enough if uniqueness is enforced per class.

---

## 4. Average engine (definition of done for calc)

### 4.1 Inputs (post-Approve only)

For student S, class C, filter term T:

1. Load published syllabus for C (if none → §4.4 fallback).
2. Load assignments in C whose `term` is included by `GRADE_TERM_ROLLUP[T]` (same semantics as UI filters today).
3. For each active category K with `weight_percent > 0`:
   - Cells = submissions for S on those assignments where:
     - `assignments.category = K.key`
     - `assignments.include_in_average = true`
     - score is **numeric** (`numericScoreForAverage` rules: Pass/Fail excluded)
     - status graded / `approved_score` present
   - Apply **category rules** (drop lowest, replace with makeup, caps) → eligible set
   - `type_avg(K) = mean(eligible % scores)`  
     (v1: treat `approved_score` as already 0–100; if `max_score` differs, Architect picks normalize formula — open question)
4. `running = Σ type_avg(K) * (weight_percent(K) / 100)` over categories that have ≥1 eligible cell **or** explicit missing policy (open: empty category omit vs zero — recommend **omit and renormalize weights among categories that have data**, with UI disclosure; see §10).
5. Apply class-level floor/rounding last.

### 4.2 Missing / not due

| State | Counts in average? |
|---|---|
| Not due yet | No |
| Due, no submission, not excused | **v1:** no auto-zero unless class policy `missing_as_zero=true` (default **false** — teacher must enter 0 or use missing flag later) |
| Excused | Excluded |
| Draft / unapproved AI | Never visible as grade; never in average |
| `include_in_average=false` | Excluded from type average (still visible as a column) |

### 4.3 Makeup / replace (CEO example)

Example rule on category `test`:

```json
{
  "replace_lowest_with_makeup": {
    "enabled": true,
    "makeup_category_key": "test",
    "or_flag": "is_makeup",
    "cap_percent": 85,
    "max_replacements": 1
  }
}
```

Semantics:

1. Identify makeup scores (v1: assignment flag `metadata`/`is_makeup` **or** separate category key decided in implementation — prefer explicit `assignments` bool `is_makeup` later; until then teacher-titled + rule “latest extra test replaces lowest”).
2. Cap makeup score at `cap_percent` before replace.
3. Replace the single lowest eligible non-makeup test score (or drop it if makeup higher after cap).
4. Do not double-count the makeup as an extra column if it was only a replacement vehicle.

Exact “which column is makeup” is an open Architect/UI detail; product intent is CEO’s example.

### 4.4 Fallback when no published syllabus

- **Do not invent weights.**
- Show category labels and columns only; running “final %” may be hidden or simple unweighted mean of included numeric cells with banner: “Syllabus weights not set.”
- Never apply district-looking defaults (no silent 40/60).

### 4.5 Pass/Fail and behavior

- Pass/Fail never enter numeric type averages (existing `numericScoreForAverage`).
- Categories with only Pass/Fail columns contribute no numeric type average (omit + renormalize, same as empty).

---

## 5. Rules catalog — v1 cut line

Drawn from R1 knobs + CEO examples. **v1 = ship with syllabus; Later = explicit follow-on.**

### 5.1 Class-level (`class_syllabi.policies`)

| Knob | v1 | Later | Default if unset |
|---|---|---|---|
| `extra_credit_allowed` | Yes (bool) | Full EC category math | `false` (equitable guidance; teacher may enable) |
| `late_penalty_mode` | Yes: `none` \| `manual` | Auto % decay, letter-max drop | `manual` (teacher enters score; no silent penalty engine) |
| `makeup_window_days` | Yes (int nullable, advisory) | Hard lock on submit | null = no auto enforce |
| `redo_max_percent` | Yes (global default cap) | Per-assignment override UI | null |
| `min_floor_percent` | Yes (e.g. 50) optional | District lock | null = off |
| `rounding` | Yes: `nearest_whole` \| `none` | Banker, truncate | `nearest_whole` |
| `missing_as_zero` | Yes bool | SIS sync | `false` |
| `publish_to_family` | Yes bool | — | `true` when status=published (weights visible; see family spec) |
| Multi-term year composite weights | — | Yes | — |
| Decaying average / Power Law / standards-based | — | Yes | — |
| GPA / AP bump | — | Out of classroom % | — |

### 5.2 Category-level (`syllabus_categories.rules`)

| Knob | v1 | Later | Notes |
|---|---|---|---|
| `drop_lowest_n` | Yes (0–3) | Higher n, drop highest | Applied after eligibility, before mean |
| `replace_lowest_with_makeup` + `cap_percent` | Yes | Multi-rule chains | CEO example |
| `default_include_in_average` | Yes | — | Seeds new assignments; teacher can flip per column |
| `max_weight_warn` | Soft UI only | Hard district max | e.g. warn if category >40% |
| Auto late penalty curve | — | Yes | |
| Min grades hard-block report card | — | Yes | v1 warning only |

### 5.3 Explicitly out of v1 engine

- Total-points mode as primary calc (category weight is v1).
- Standards-based / mastery / Power Law.
- SIS push/pull of weights.
- School-wide locked category taxonomy (teachers may use GradeKind set; admin lock later).
- Automatic “quiz counts” shortcuts.
- Rubric criteria → weight mapping (forbidden).

---

## 6. Author lesson pack ↔ syllabus category binding

### 6.1 Today

- Author emits `kind=lesson` packs only.
- On assign, class app sets `assignments.category` (default `homework`) and `include_in_average` (lesson path defaults **false**).
- Pack metadata may suggest a pedagogical role; it must **not** write syllabus weights.

### 6.2 Binding rules (product)

1. **Assign UI** is the bind point: teacher picks category from **this class’s syllabus categories** (or GradeKind fallback if syllabus draft/absent).
2. Author/studio may show a **suggested category** string on the pack (e.g. “quiz-heavy check pack”) as a hint only.
3. On assign:
   - `category` ← teacher choice (required).
   - `include_in_average` ← syllabus category `default_include_in_average`, then teacher override. **Still default false for brand-new lesson packs if category has no default and teacher does not opt in.**
   - Never set include true merely because `category=quiz|test`.
4. Changing syllabus category weights does **not** rewrite historical assignment rows; it only changes how type averages roll into the final.
5. Renaming a category `key` is a migration hazard — prefer relabel `label`, keep `key` stable; if key changes, batch-update assignments or keep alias map (Architect).

### 6.3 What Author must not do

- Emit `class_syllabi` rows.
- Default quiz/test packs to `include_in_average=true`.
- Embed final weights inside HTML metrics.
- Treat rubric HTML as syllabus.

---

## 7. Ask / photo import — propose vs confirm

(Detail sequence lives in P2; IA contract here.)

### 7.1 Ask may propose (draft only)

Stored on `class_syllabi.ask_draft` / thread tool result — **never** written as published policy without confirm:

- Detected document kind: `syllabus_policy` | `rubric` | `unknown` | `mixed`
- Categories: `{ key?, label, weight_percent?, confidence }`
- Term structure guess
- Policy snippets: late, makeup, drop lowest, floors, extra credit (as text + structured guess)
- Source page references / low-confidence flags
- For **rubric** photos: criteria list as **assignment-scoring draft**, not category weights (R2)

### 7.2 Teacher must confirm before live

- Create/update `class_syllabi` status → `published` (or explicit “Save draft”)
- Every category label + weight
- Sum-to-100 (or explicit remainder category)
- Enabled rules + caps
- `publish_to_family`
- Mapping of free-text labels → keys (`Tests` → `test`)

### 7.3 Fail-closed

- OCR/LLM failure → empty draft + message; no partial silent publish
- Mixed syllabus+rubric page → split warnings; do not dump rubric levels into weights
- Student/parent Ask: **read** explanations only; **no** syllabus write tools
- Only taught-class teacher (or future delegated co-teacher) may confirm
- Nothing in Ask draft is a grade

### 7.4 Confidence UX (product intent)

- Per-field confidence; fields below threshold start unchecked or highlighted
- Teacher can discard draft and enter manually
- Re-import replaces `ask_draft`, not live published row, until confirm

---

## 8. Visibility matrix (IA-level; family UI in P4)

| Data | Teacher | Student | Parent (linked child) |
|---|---|---|---|
| Published category names + weights | Edit | Read | Read |
| Running type averages + overall (post-Approve cells only) | Read/calc | Read | Read |
| Which assignments counted / dropped by rule | Read | Read (own) | Read (child) |
| Draft syllabus / ask_draft | Edit | No | No |
| Unapproved AI scores | Yes | No | No |
| Rule **editors** | Yes | No | No |
| Other students | No (except teacher) | No | No |

Weights are **not** teacher-secret (R1 FERPA/portal norm). Calculation drafts and unapproved scores are.

---

## 9. Acceptance criteria for a **future** implementation loop

(Not this ticket. Gate remains CoS/CEO AVG HOLD until greenlit.)

### 9.1 Data / API

1. Migration adds `class_syllabi` + `syllabus_categories` (and term storage as designed) with RLS: class teacher CRUD; students/parents SELECT published only for enrolled/linked class.
2. Publishing validates: ≥1 active category; weights sum to 100 ± 0.01; keys unique; no quiz→include shortcut.
3. Assign / plan / lesson-assign pick categories from syllabus when published; `include_in_average` semantics documented in UI copy as “counts toward [Type] average.”
4. Average service (pure function + tests) implements §4 with fixtures: simple weights, drop_lowest_n=1, makeup cap 85 replace lowest, Pass/Fail excluded, unpublished fallback, empty category renormalize.
5. No `EXPO_PUBLIC_` model keys; Ask import tools server-side only when P2 implements.
6. Author `publish_lesson_pack` unchanged; no syllabus emission.

### 9.2 Product / QA

7. Teacher can create draft → edit → publish without Ask.
8. Teacher can load Ask draft → edit → confirm; cancel leaves prior published intact.
9. Family read path shows weights + post-approve running explanation (P4).
10. Typecheck + unit tests for calc; no grade written without Approve path.
11. Desk AVG HOLD lifted only after CoS/CEO explicit go.

### 9.3 Explicit non-acceptance

- Shipping only `include_in_average=true` on quizzes.
- Silent district default weights.
- Rubric criteria stored as category weights.
- Auto-zero missing without policy + UI.

---

## 10. Open questions for Architect

1. **Normalize scores:** Always 0–100 `approved_score`, or support `score/max_score`? Legacy data mix?
2. **Empty categories:** Omit + renormalize (PM recommendation) vs contribute 0 vs require min grades before showing overall?
3. **`weight_band` / `weight_percent` on assignments:** Ignore when syllabus published, dual-run deprecation period, or per-assignment override of category weight (discouraged)?
4. **Makeup identity:** New `assignments.is_makeup` bool vs naming convention vs separate category?
5. **One syllabus per class vs per school year:** Archive + clone model when term rolls?
6. **JSON policies vs `syllabus_rules` table** for audit_events granularity?
7. **Hard FK** `assignments.syllabus_category_id` vs string `category` key?
8. **Co-teachers / office copy syllabus** templates — v1 out; any schema hook needed now?
9. **Concurrent edit** of weights while term in progress — snapshot weights at report time or always live?
10. **Rounding** applied per type avg, final only, or both?
11. **Behavior / participation** categories that are non-numeric — force Pass/Fail scheme?
12. **Performance:** materialize running averages vs compute on read for roster grids?

---

## 11. Downstream tickets (do not implement here)

| ID | Deliverable |
|---|---|
| AVG-P2 | `notes/company/avg-spec-ask-photo-import.md` — sequence + draft JSON matching this IA |
| AVG-P3 | `notes/company/avg-spec-teacher-ui.md` — class setup chrome |
| AVG-P4 | `notes/company/avg-spec-family-view.md` — visibility matrix UX |
| Architect | SQL + calc module design answering §10 |
| Security | RLS + Ask tool privilege + FERPA on family read |
| Implementation | Gated kelyra-qa-loop after CEO lift HOLD |

---

## 12. Sources & decisions log

- CEO 2026-08-27 model: type averages → weighted final; `include_in_average` = counts in type average; no quiz shortcut.
- R1: category weighting as primary SIS mode; drop/replace, caps, floors common; weights parent-visible.
- R2: ClassSyllabus ≠ AssignmentRubric; parse syllabus first.
- R3: family language “Categories” + % weights + post-Approve only.
- Live schema: `docs/data-model.md` assignments columns; `src/lib/grade/marks.ts` GradeKind / terms.

**Decision (PM):** v1 calc mode = category weighting only; assignment-level `weight_percent` does not define final slice when syllabus is published; Ask never auto-publishes; Author binds only via assign-time category.

---

**RECOMMENDED NEXT ACTION:** Leave implementation gated (AVG HOLD). Unblock P2/P3/P4 specs against this IA. Architect answers §10 before any migration. No kelyra-qa-loop from this ticket.
