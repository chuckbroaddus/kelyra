# KEYGRADE-Q1: Acceptance plan — photo answer-key grading (not a Build send)

**Date:** 2026-09-04
**Author:** qa-supervisor
**Ticket:** t_44e2d210
**Status:** **PLAN ONLY** — not a Build send, not a release cert, not kelyra-qa-loop.
**Gate:** Implementation remains forbidden until Chuck later says **send**. Developers will not self-certify.

**Depends on (read-only pack):**

| Artifact | Role in this plan |
|---|---|
| `notes/company/photo-key-grading-plan.md` (KEYGRADE-A1) | Pipeline stages, scripts-first award, v1 cut, K0–K3 |
| `notes/company/photo-key-grading-security.md` (KEYGRADE-S1) | Must-fix §2.3 (T1–T10) + visibility matrix |
| `notes/company/photo-key-grading-research.md` (KEYGRADE-R1) | Method library context only |
| Live: `docs/mvp.md`, `docs/data-model.md`, `docs/architecture.md`, S1 thumbs | Capture → desk → Approve; keys server-side |

**Non-goals of this ticket**

- No app code, migrations, Edge handlers, Ask tool registration, or SQL apply.
- No `kelyra-qa-loop` / `author-qa-loop`.
- No release sign-off and no eng staffing authorization.
- No inventing ZipGrade product, OpenCV/Tesseract worker, Document AI/Textract, auto-publish, parent item marks, or Ask `grade_photo`.

---

## 0. Scope — what "good" means later

When Chuck authorizes implementation, a **future** build loop is accepted only if:

1. Every **P0** row in this matrix has **evidence** (unit pure-function test, RPC/JWT fixture, Edge contract test, or scripted UI check with artifact).
2. Every **KEYGRADE-S1 §2.3** must-fix (T1–T10 controls) is covered (see §3).
3. Explicit **non-acceptance** items (§4.2) are regression-guarded.
4. CoS does **not** treat green unit tests alone as product release; scripts-first award + Approve wall + originals-at-grade-time + family draft omit still need named evidence.
5. Developers do **not** self-certify the epic — CEO send + this plan + loop evidence.

Until then: this file is the contract for that future loop.

### 0.1 Product laws (always fail closed)

| ID | Law | Source |
|---|---|---|
| L1 | KEYGRADE extends Capture → desk → Approve. **Not** a ZipGrade product, not a second grade book, not student self-grade. | A1 §0–§1 |
| L2 | **Scripts award.** Cheap vision **extracts marks only**. LLM never writes a grade. `score-key` is pure TS of `{extract, key_items}`. | A1 §0/§3, S1 T4 |
| L3 | v1 item types = **MC + numeric only**. `short` / `work` / `needsTeacher` stay residual (null awarded, not 0). | A1 §4 |
| L4 | Lists = **thumbs only**, `fallbackOriginal: false`. Grade-time + key analyze + match-key + extract use **originals** (`storage_path`). | A1 §2–§3, S1 T2/K0 |
| L5 | Capture may have `student_id` null. Matcher sets `guessed_student_id` only — **never INSERT students**. | A1 §3, S1 T5 |
| L6 | **Nothing is a grade until Approve.** `draft_score` / `model_draft` are teacher work product; family never sees them. | AGENTS + A1 §7, S1 T1/T4 |
| L7 | Family / student RPCs **omit** extract JSON, `model_draft`, `draft_score`, `key_*`, original paths. Post-Approve cell = `approved_score` / status only. | S1 T1/T8 |
| L8 | New extract / match-key / score Edge: `verify_jwt=true` + **`class_teacher_of`** before sign/fetch. Not `teaches_class` / `is_school_admin` on **new** scoring RPCs. | S1 T2 |
| L9 | **No Ask write-score tools** (`grade_photo`, `score_key`, `approve_work`, `reveal_answer_key`). Do not reuse `assignments.manage` for scoring. | A1 §5.4, S1 T3 |
| L10 | Phone captures; web reviews / Approve. Model keys server-side. No `EXPO_PUBLIC_*`. Paid no-train; first names / codes only in prompts. | AGENTS + S1 T7 |
| L11 | Residuals = teacher-triggered only; still write `model_draft`, never `approved_score`. | A1 §3 Stage 5 |
| L12 | Averages (AVG) read **`approved_score` only**. `model_draft` never overwritten on Approve. | A1 §7, S1 T4 |

### 0.2 In scope vs out of scope

**In scope (must prove after CEO send):** K0 original signer for match-key/extract; K1 extract JSON + `score-key` TS when key present; confirm UI per-item; Approve path unchanged; MC/numeric type inference; residual omit-not-zero; S1 thumbs on lists; family omit drafts/keys; KEYGRADE-S1 must-fix; no Ask grade write.

**Out of scope (do not fail v1 for missing):** OpenCV/YOLO/wasm preprocess; on-device HTR; hardware OMR; parent-facing item marks; Document AI/Textract; second AI vendor; auto-split multi-page packets; student-created keys; template editor; CAS/algebra equivalence; full auto short-answer grade; ZipGrade printable forms required.

## 1. Scripts first / Approve wall

**Legend**

| Sev | Meaning |
|---|---|
| **P0** | Blocks CEO-authorized ship / loop pass |
| **P1** | Must fix before family-facing release |
| **P2** | Track; may defer with CoS note |

| Type | How to evidence later |
|---|---|
| **U** | Unit (pure `score-key`, extract schema strip, type inference) |
| **I** | Integration / RPC / RLS with JWT fixtures |
| **UI** | Scripted or dogfood UI on proposal / student page / Assign |
| **S** | Security static + seat JWT matrix |
| **R** | Regression vs frozen surfaces (unkeyed evaluate-homework, S1 thumbs, AVG approved_score) |

### 1.1 Extract schema (marks only — no grade)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| EX-01 | P0 | U | Extract JSON shape | `{ items: [{ n, extracted, confidence, flag? }] }` only — **no** `draftScore` / `approved_score` / total |
| EX-02 | P0 | U | Model sneaks `draftScore` | Parser **strips/ignores**; never lands in `model_draft` as award source |
| EX-03 | P0 | I | Keyed capture (`assignmentHasKey`) | Path = extract → `score-key`; **not** today's generative total |
| EX-04 | P0 | I | No key on assignment | Keep live `evaluate-homework` gap-draft path; do **not** force MC templates |
| EX-05 | P0 | I/S | Extract before `class_teacher_of` | **Forbidden** — fail closed; no original sign |
| EX-06 | P0 | S | Client `imageUrl` as ACL | **Forbidden** — server resolves capture/assignment in class; `isAllowedAskImageUrl` on vendor fetch |
| EX-07 | P0 | I | Unassigned capture (`student_id` null) | Extract may run for teacher review; **must not** INSERT student or invent roster row |
| EX-08 | P1 | U | Flags | `glare` / `blank` / `handwriting` / `unreadable` survive into confirm cells |
| EX-09 | P1 | S | Prompt PII | First names / opaque codes only; no SIS IDs, full roster, IEP pages, sibling names |
| EX-10 | P1 | I | Cost | One cheap vision pass default (`detail: low`); no flagship unless Look-again |

### 1.2 `score-key` pure function

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| SK-01 | P0 | U | MC exact after normalize | `a` / `A` / `(a)` → match; wrong letter → 0 if extracted present |
| SK-02 | P0 | U | MC blank / low-conf | Award **null** (residual), not 0 — glare must not zero quiz by default |
| SK-03 | P0 | U | Numeric normalize | Strip commas/spaces; optional trailing `%`; exact only — **no** algebra solver |
| SK-04 | P0 | U | `short` / `work` | Always residual (`awarded: null`, `residual: true`) |
| SK-05 | P0 | U | `needsTeacher: true` | Always residual regardless of extract |
| SK-06 | P0 | U | Type inference | A–E / T/F → `mc`; mostly digits → `numeric`; else `short` |
| SK-07 | P0 | U | `draft_score` formula | Sum(awarded) / sum(points of **scored** items) × 100 (or raw if `max_score`); residuals **omitted** from denom |
| SK-08 | P0 | U | Model total present in extract | **Ignored** — script is sole award |
| SK-09 | P0 | U | Shared module | Same pure function Edge + client preview; no LLM call inside score |
| SK-10 | P1 | U | Teacher toggle “blank as 0” | Only on confirm; default remains omit |
| SK-11 | P1 | U | `model_draft.method` | `"key_score"`; `schema_version: 1`; items carry expected · extracted · awarded · flag |
| SK-12 | P2 | U | Matching / multi-select MC | Later; v1 single-letter / T-F is enough |

### 1.3 Confirm (not a grade)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| CF-01 | P0 | UI | Proposal / student page | Per-item: expected · extracted · awarded · flag; original viewer (not list thumb) |
| CF-02 | P0 | UI/I | Edit cell → Save | Stays `captures.status = draft`; updates `draft_score` / `model_draft`; **not** family-visible |
| CF-03 | P0 | UI | Spoken mark wins | Teacher said “88” / “Pass” / “don’t grade” overrides script total on confirm |
| CF-04 | P0 | UI | Residual copy | “n items need you” — residuals not silently 0 |
| CF-05 | P0 | I/UI | Student/parent open confirm table | **Denied** / no extract fields in family DTO |
| CF-06 | P1 | UI | Web denser than phone | Web-first Approve (MVP); phone confirm acceptable denser later (A1 open) |
| CF-07 | P1 | UI | Look-again / residual AI | Teacher-triggered only; still parks `model_draft`; never auto-Approve |
| CF-08 | P2 | UI | Show-work crop | Draft region for teacher eye; no auto points in v1 |

### 1.4 Approve wall (only publish)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| AP-01 | P0 | I/UI | Teacher Approve tap | Copies **edited** score → `approved_score` / submission `graded` |
| AP-02 | P0 | I | No Approve | Not a grade; not family-visible; not in syllabus averages |
| AP-03 | P0 | I | Approve does not overwrite `model_draft` | Audit trail preserved |
| AP-04 | P0 | I | Averages / AVG live | Read `approved_score` only — never `draft_score` |
| AP-05 | P0 | I | Client POSTs model number as Approve | **Rejected** — existing Approve RPC/tap only |
| AP-06 | P0 | I | Files into planned `assignment_id` | Does not invent a second column |
| AP-07 | P0 | S | Ask / Edge auto-Approve | **Forbidden** — no tool writes `approved_score` |
| AP-08 | P1 | I | Gaps on keyed MC | Optional; do not invent skill gaps from bubble misses unless teacher asks |
| AP-09 | P1 | R | Unkeyed homework Approve path | Unchanged M6 behavior when no key |

### 1.5 Ask / capability walls

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| AK-01 | P0 | S | `grade_photo` / `score_key` / `approve_work` / `reveal_answer_key` | Unknown-name **denied** both client + Edge twins |
| AK-02 | P0 | S | Scoring mapped to `assignments.manage` | **Forbidden** (student `own` + office `school` = P0 cheat sheet / school scorer) |
| AK-03 | P0 | S | `scan_answer_key` remains authoring | Confirm → `create_assignment` only; does not write scores |
| AK-04 | P0 | S | Office JWT new extract/score RPC | **Denied** (`class_teacher_of`, not `teaches_class`) |
| AK-05 | P0 | S | Dual-hat parent seat | Family RPCs only; no extract / key SELECT |
| AK-06 | P0 | S | Student JWT extract or `key_items` | **Denied** |
| AK-07 | P1 | S | Keep live `assignments.manage` for key authoring only | Do not widen; do not add score verbs under it |

## 2. Photos / thumbs / keys

### 2.1 S1 thumbs vs originals (K0)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| PH-01 | P0 | I/UI | Inbox / WorkRow / assignment chip / avatar | Sign **`thumb_storage_path` only**; `fallbackOriginal: false` |
| PH-02 | P0 | I | `match-key` input | **Original** student page + original key asset / print signature — **not** thumb URLs (fixes live QA P2) |
| PH-03 | P0 | I | Extract / `analyze-answer-key` | Original `storage_path` via server sign after `class_teacher_of` |
| PH-04 | P0 | UI | ImageViewer / Capture review / confirm | Original viewer; list row stays thumb |
| PH-05 | P0 | R | “Fix match-key” by flipping list fallback | **Forbidden** — would blow S1 egress + FERPA surface |
| PH-06 | P1 | I | Print signature build | From **original** key photo (`key_phash` / layout / header / blank_map) |
| PH-07 | P1 | I | Delete capture | Existing unref rules; do **not** delete key `assets` still on assignment |
| PH-08 | P2 | — | Public bucket to save egress | **Never** (S1 T10) |

### 2.2 Key authoring (Assign)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| KY-01 | P0 | UI/I | Save assignment with typed `key_items` and/or key photo | Key SoT on assignment; teacher-accepted analyze items |
| KY-02 | P0 | U | Item shape | `{n, stem, answer, points, needsTeacher, note}` + v1 `type` / optional `choices` |
| KY-03 | P0 | I/S | Student/parent SELECT `key_items` / `key_asset_id` | **Never** — cheat sheet |
| KY-04 | P0 | I | Family syllabus / landing / AVG | Omit every `key_*` column |
| KY-05 | P0 | S | Do not add family policy “preview worksheet” | Live `assignments_via_class` stays teacher-side |
| KY-06 | P1 | UI | `key_kind` photo / items / both | Unchanged product; KEYGRADE scores when any key present |
| KY-07 | P1 | I | Versioned keys / hash miss | `match-key` low confidence → picker; **no silent** score against wrong column |
| KY-08 | P2 | — | Template editor / student-created keys | Out of v1 |

### 2.3 Capture + matcher + twins

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| CA-01 | P0 | I | Phone upload | JPEG original (max long edge ~1600) + `*_thumb` (S1) |
| CA-02 | P0 | I | Insert capture | `student_id` null / `unassigned` unless teacher already confirmed roster name |
| CA-03 | P0 | I/S | Matcher | `guessed_student_id` only — **never INSERT `students`** |
| CA-04 | P0 | I | One capture, one student | No auto-split mixed stack; Unassigned inbox first-class |
| CA-05 | P0 | I | Twins unlabeled | Fail closed — teacher confirms; no mash-up grade |
| CA-06 | P0 | I | Wrong page / wrong assignment version | Teacher picker; hash mismatch must not silent-file |
| CA-07 | P1 | R | Live `analyze-homework` refuses unassigned | KEYGRADE extract must **not** invent student to unblock scoring |
| CA-08 | P1 | UI | Spoken-name guess shown as guess | Not published name; not roster write |

### 2.4 Storage / parking / DTO

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| ST-01 | P0 | I | Extract parked on `captures.model_draft` | A1 §5.1 shape; never on `students.metadata` |
| ST-02 | P0 | I | Do not dump extract into `submissions.answers` | `student_gradebook.answers` already family-visible — parking dump = P0 |
| ST-03 | P0 | I | Family RPCs field allow-list | Omit `model_draft`, extract, `draft_score`, `key_*`, original paths |
| ST-04 | P0 | I | Token-only `/parent` | No scores, no photos, no extract (live comment holds) |
| ST-05 | P0 | S | UI hide of confirm table | **Not** FERPA control — server predicates only |
| ST-06 | P1 | I | Optional later `score_method` column | Skip until JSON outgrows confirm UX |
| ST-07 | P1 | S | Logs | request id, uid, class_id, latency, error class — **not** pixels, extract JSON, key answers |
| ST-08 | P1 | S | Signed URL TTL short; never log token | Private `photos` bucket stays private |

### 2.5 Visibility matrix (copy of S1 §2.2 — must evidence)

| Viewer | Originals | Extract / `draft_score` | `key_items` | `approved_score` |
|---|---|---|---|---|
| Class teacher (`class_teacher_of`) | Grade-time / viewer | Yes (confirm) | Yes (Assign) | Yes |
| Office (no `class_teachers` row) | **Not via new RPCs** | No | Live assignment write may exist — no new extract | Gradebook as today |
| Co-teacher with `class_teachers` row | Same as teacher | Same | Same | Same |
| Student | Never | Never | Never | Own cell post-Approve |
| Parent login | Never | Never | Never | Linked child post-Approve |
| Token-only `/parent` | Never | Never | Never | Never |
| Dual-hat parent seat | Never | Never | Never | Parent RPC only |

## 3. Evidence

### 3.1 KEYGRADE-S1 §2.3 must-fix → evidence map

Copy into any future `kelyra-qa-loop` ticket body. IDs below are acceptance evidence tags, not new security tickets.

| SEC | S1 control (abbrev) | Evidence IDs | Type |
|---|---|---|---|
| KG-S1-01 | Family/student RPCs omit extract, `model_draft`, `draft_score`, `key_*`, originals; no park on `answers` / `metadata` | ST-01…04, KY-03/04, CF-05, AP-02 | I/S |
| KG-S1-02 | New Edge: `verify_jwt` + `class_teacher_of` before sign/fetch; `isAllowedAskImageUrl`; list functions in `config.toml` when ship | EX-05/06, PH-02/03, AK-04 | I/S |
| KG-S1-03 | No Ask write-score tools; do not reuse `assignments.manage` for scoring | AK-01…03, AK-07, AP-07 | S |
| KG-S1-04 | Extract has no grade; `score-key` ignores model totals; Approve only; AVG = `approved_score` | EX-01/02, SK-07/08, AP-01…05 | U/I |
| KG-S1-05 | Matcher never INSERT; unassigned extract no invent `student_id`; twins fail closed; hash miss → picker | CA-02…06, EX-07 | I |
| KG-S1-06 | S1 lists thumbs; K0 originals for match-key/extract only | PH-01…05 | I/UI/R |
| KG-S1-07 | Prompts: first names/codes; paid no-train; no IEP; keys server-side | EX-09, L10 | S |
| KG-S1-08 | Dual-hat follows **active seat**; parent seat denied extract | AK-05, visibility §2.5 | I/S |
| KG-S1-09 | Residual AI teacher-triggered; still not a grade | CF-07, L11 | UI/I |
| KG-S1-10 | Tests: student/parent cannot SELECT extract/`key_items`; office cannot call new extract; `grade_photo` denied; Approve preserves `model_draft`; `student_gradebook.answers` unchanged by key_score | AK-01/04/06, AP-03, ST-02/03 | I/S |

### 3.2 Minimum automated suite (when staffed — not now)

1. Pure `score-key` unit table: MC normalize, blank→null, numeric strip, short residual, sneaked model total ignored, residual omit from denom.
2. Extract parser: strips `draftScore`; flags preserved.
3. JWT matrix on new extract/match/score: teacher OK; other-class teacher 403; student 403; parent 403; office 403; anon 401; dual-hat parent seat 403.
4. Family DTO / `student_gradebook`: no `model_draft`, no `draft_score`, no `key_items`, no original paths; `answers` unchanged after key_score path.
5. List signing: Inbox/WorkRow chips never request original; `fallbackOriginal: false` asserted.
6. `match-key` / extract receive original paths only (contract test vs proposal caller).
7. Ask policy twins: `grade_photo` / `score_key` / `approve_work` / `reveal_answer_key` unknown-denied; scoring not under `assignments.manage`.
8. Approve: `approved_score` set; `model_draft` intact; AVG fixture reads approved only.
9. Matcher: no `INSERT INTO students` on any KEYGRADE path.
10. Unkeyed capture still hits gap-draft evaluate path (regression).

### 3.3 Evidence types by surface

| Surface | Preferred evidence |
|---|---|
| `score-key` / type inference | Golden unit vectors (U) |
| Extract schema / parser | Unit + Edge contract fixture |
| RLS / new RPCs | JWT fixture matrix (teacher, co-teacher, other teacher, student, parent twin, office, anon, dual-hat) |
| Family gradebook / syllabus | Field-allowlist or snapshot: omit drafts/keys |
| S1 thumbs / K0 originals | Integration on sign helpers + proposal caller paths |
| Ask policy | Unit on client + Edge twin maps |
| Approve / AVG | Integration: draft invisible; approved visible; averages approved-only |
| Desk capture loop | R: phone capture → match → confirm → Approve still works unkeyed + keyed |
| Storage | R: private bucket; no public photos; key asset not deleted while referenced |

### 3.4 Dogfood script (after CEO send — not this ticket)

1. Teacher assigns MC quiz with typed key (A/B/C/D + one numeric).
2. Phone captures student page; list shows **thumb**; open confirm shows **original**.
3. Extract runs; confirm table shows expected · extracted · awarded; one glare item residual not 0.
4. Edit one cell; Save; family device still sees **no** score.
5. Approve; family sees cell only; no item key dump.
6. `match-key` on a second page uses original (not thumb); low-hash → picker, not silent wrong column.
7. Unassigned capture: extract OK; roster count unchanged (no invent student).
8. Parent twin switch: never sees extract or key.
9. Office seat: cannot call new extract RPC.
10. Ask “grade this photo” / unknown tool: denied.
11. Unkeyed homework still drafts gaps as today.
12. AVG / syllabus average moves only after Approve.

### 3.5 Regression guards (non-acceptance if broken)

| ID | Sev | Guard |
|---|---|---|
| RG-01 | P0 | Unkeyed `evaluate-homework` gap path unchanged when no key |
| RG-02 | P0 | Nothing is a grade until Approve (draft never family-visible) |
| RG-03 | P0 | Matcher still never inserts a student |
| RG-04 | P0 | S1 list thumbs stay thumbs — no `fallbackOriginal: true` “fix” |
| RG-05 | P0 | AVG / family gradebook still read `approved_score` only |
| RG-06 | P0 | `scan_answer_key` remains authoring, not scoring |
| RG-07 | P0 | No `EXPO_PUBLIC_*` model keys introduced |
| RG-08 | P0 | No second OCR vendor (Textract/Document AI) quietly added |
| RG-09 | P1 | GAUTH Explain (if present) never writes `approved_score`; scripts remain award |
| RG-10 | P1 | Live assignment writes via `teaches_class` not relitigated; **new** score RPCs stay `class_teacher_of` |

### 3.6 Phased evidence expectation (when sent)

| Phase | Must prove before calling phase done |
|---|---|
| **K0** | Originals for match-key / key evaluate; lists thumbs; PH-01…05, RG-04 |
| **K1** | Keyed extract + `score-key` + confirm + Approve wall; EX/SK/CF/AP P0; KG-S1-01…10 core |
| **K2** | `type` on key items; MC/numeric inference; residual count copy; SK-06/07, CF-04 |
| **K3** | Teacher-triggered residual short pass; still not a grade; CF-07, KG-S1-09 |
| **Later** | CV/HTR/OMR/parent item marks — new product decision, not quiet columns |

## 4. Acceptance

### 4.1 This ticket (KEYGRADE-Q1)

| Criterion | Status |
|---|---|
| `notes/company/photo-key-grading-acceptance.md` exists for CEO/CoS | **Met by this file** |
| Grounded in KEYGRADE-A1 / S1 / R1 (no invented product law) | **Met** |
| P0 matrix covers scripts-first, Approve wall, thumbs/originals, keys, matcher, S1 must-fix | **Met** (§1–§3) |
| Explicit non-acceptance / regression guards | **Met** (§3.5, §4.2) |
| No app code, SQL, migrations, Edge, Ask registration | **Met** — plan only |
| No `kelyra-qa-loop` / release cert / eng staffing | **Met** |
| Not a Build send | **Met** |

**Audience:** CEO / Chief of Staff. **Not** an implementation ticket. Do **not** staff `senior-developer` or launch `kelyra-qa-loop` until Chuck writes **send**.

### 4.2 Non-acceptance (ship blockers even after a green unit suite)

A future build is **not** accepted if any of the following is true:

1. Family/student can read extract JSON, `model_draft`, `draft_score`, `key_items`, or original paths (table SELECT or fat RPC).
2. Extract / score parks on `submissions.answers` or `students.metadata` (or any family-visible jsonb).
3. New Edge opens originals without `verify_jwt` + `class_teacher_of`, or trusts client `imageUrl` as ACL.
4. Scoring ships as Ask tools or under `assignments.manage`.
5. LLM / client writes `approved_score`, or averages read `draft_score`.
6. Extract schema / path still treats model `draftScore` as the award.
7. Blank/low-conf MC defaults to 0 and zeros quizzes on glare without teacher toggle.
8. Lists sign originals or set `fallbackOriginal: true` to “fix” match-key.
9. `match-key` / extract still consume thumb URLs only (QA P2 unresolved).
10. Matcher INSERTs a student, or extract invents `student_id` to unblock scoring.
11. Hash/version miss silently files/scores the wrong column.
12. Office JWT gains new school-wide extract/score RPCs via `teaches_class` / `is_school_admin`.
13. Dual-hat parent seat receives teacher extract/key payloads.
14. Token-only `/parent` gains scores or photos.
15. Second OCR vendor, public photos bucket, or `EXPO_PUBLIC_*` model keys appear.
16. Developers self-certify without CEO send + this plan + loop evidence.

### 4.3 Open issues (not blockers for this acceptance plan)

| # | Question | Owner |
|---|---|---|
| 1 | Exact confirm UX density phone vs web | Product (A1 open; web-first Approve already MVP) |
| 2 | Default blank MC = omit vs 0 (plan default omit + teacher toggle) | Product — Security prefers omit |
| 3 | Real phone-photo fixtures (glare, twins, two key versions) for QA later | QA when staffed |
| 4 | Live assignment writes stay `teaches_class`; only **new** score RPCs use `class_teacher_of` | Architect — do not relitigate in KEYGRADE |
| 5 | Whether K0 ships alone if KEYGRADE product declined | CEO — A1 notes K0 is still correctness/egress |

### 4.4 Downstream

| Ticket / actor | Needs |
|---|---|
| CEO / CoS | Review this plan + A1/S1/R1 pack; **Chuck still must write send** |
| Architect | Fold S1 §2.3 into any pre-SQL polish; no SQL until send |
| Future `kelyra-qa-loop` | Execute §1–§3 matrices; copy §3.1 into ticket body — **do not run now** |
| `senior-developer` | **Do not staff** until send |
| GAUTH join | Scripts remain award; Explain never writes `approved_score` (RG-09) |

### 4.5 Verdict

**Acceptance plan complete.** Ready for CEO/CoS review as the contract for a future authorized build loop (K0→K1 first).

**Not a send. Not a release. Not QA certification.**

**RECOMMENDED NEXT ACTION:** CoS surfaces this file with the KEYGRADE pack (A1 + S1 + R1) to Chuck. Hold eng. Do not launch kelyra-qa-loop from this ticket.
