# KEYGRADE-S1: Security — photo + answer-key grading

**Date:** 2026-09-04
**Author:** security (Kelyra)
**Ticket:** `t_5814ea59`
**Status:** Review only — no SQL, no app code, no Edge handlers, no kelyra-qa-loop, no git push.
**Depends on:** `notes/company/photo-key-grading-plan.md` (KEYGRADE-A1); research `photo-key-grading-research.md` (KEYGRADE-R1). No separate KEYGRADE architecture file.
**Live ground:** `docs/architecture.md` (soft FERPA; keys server-side); `docs/data-model.md` (`captures.model_draft` / `draft_score`, `assignments.key_*`, `submissions.approved_score`); `captures_via_class` / `assignments_via_class` = `teaches_class` (ORs `is_school_admin`); `class_teacher_of` (membership only); `student_gradebook` / family syllabus RPCs; `askToolPolicy` `assignments.manage` (teacher `own`, **student `own`**, office `school`); `analyze-homework` `verify_jwt=true`; `evaluate-homework` / `match-key` / `analyze-answer-key` are **ai:dev routes**, not listed in `supabase/config.toml`; `isAllowedAskImageUrl`; S1 thumbs + QA P2 `match-key` thumbs; private `photos` bucket (owner-prefix RLS).
**Legal posture:** Engineering threat model and implementation gates. Not a legal opinion and not a claim of FERPA “school official” status. Paid model tier, no training on prompts, no district DPA unless Chuck signs one.

**Non-goals of this ticket:** Implementation, Architect SQL, QA plan, staffing `senior-developer`.

---

## 0. Verdict

KEYGRADE-A1 product law is sound: extend Capture → desk → Approve; **scripts award**; cheap vision **extracts marks only**; LLM never writes a grade; v1 = MC + numeric; lists stay thumbs; grade-time + key analyze + match-key use **originals**; matcher never INSERTs a student; family sees the **post-Approve cell only**; no Ask `grade_photo`; no second OCR vendor; no ZipGrade product.

**Do not implement** until CEO says send **and** the v1 must-fix list in §2 is copied into any future qa-loop ticket. Architecture already names the big traps. Gaps that still ship a cheat sheet or a FERPA dump if implementers follow A1 loosely:

1. Postgres RLS is **row-level**. Parking extract / `draft_score` / `key_items` on a row family can SELECT (or stuffing them into `student_gradebook.answers`) is a Gauth dump. Family RPCs must **omit** those columns.
2. New extract / `score-key` / `match-key` Edge must `verify_jwt` **and** `class_teacher_of(class_id)` **before** signing or fetching originals. Live `evaluate-homework` is a Bearer + client URL path; that is not the wall.
3. Never map scoring onto `assignments.manage` (students already have `own`; office has `school` — AVG-S1 / GAUTH-S1 P0).
4. `draftScore` from the model is ignored. Approve is the only publish. Averages read `approved_score` only.

Soft FERPA posture unchanged. Security does not authorize a loop. CEO still must say send.

## 1. Threats (PII photos, answer keys, Approve path)

Attacker profiles: curious student JWT; parent JWT (incl. invite `/parent?t=`); teacher of class A on class B; office seat; dual-hat teacher-parent; modified Expo client; model tool-loop / prompt injection from OCR; storage signed-URL IDOR; vendor logs; LAN `ai:dev` if bound beyond localhost.

### 1.1 Data classes

| Data | FERPA / sensitivity | Where | Family-visible? |
|---|---|---|---|
| Capture originals (student pages) | **Education records** — high | private `photos` + `assets.storage_path` | **Never**. Lists = S1 thumbs only |
| Key photo / `key_items` / print signature | High — tonight’s answers | `assignments.key_*` | **Never** (student bulk key = cheat sheet) |
| Extract JSON / per-item marks | High — item-level work | `captures.model_draft` (A1 §5.1) | **Never** |
| `draft_score` / `model_draft` | Teacher work product; not a grade | capture / optional submission draft | **Never** |
| `approved_score` / `score_mark` | Education records | gradebook cell | Post-Approve only |
| Prompt + pixels at vendor | Third-party processing of student work | xAI via Edge / `ai:dev` | **Never** in UI. Paid no-train only |
| Spoken name / `guessed_student_id` | Identity guess, not a roster write | capture | **Never** as a published name |
| Sibling / twin other-student pages | **High** — classic over-read | must not bind | **Never** |

**Product law (unchanged):** Nothing is a grade until Approve. Matcher never inserts a student. Phone captures; web Approves. Model keys stay server-side. No `EXPO_PUBLIC_*`. Do not train on student work. Do not send IEP pages.

### 1.2 T1 — Family / student SELECT of extract, drafts, or keys

**Severity: P0 (v1 must-fix)**

Live `student_gradebook` already returns `approved_score` (good) **and** `answers` jsonb. A1 parks extract on `captures.model_draft` and may copy to submission draft. If implementers `SELECT *` from captures/submissions for the family book, or dump extract into `answers` “so the student can see missed items,” the key + marks leak. RLS cannot hide columns. Live family syllabus RPCs already constrain to `approved_score` after `approved_at` — copy that, do not invent a family table SELECT.

`assignments.key_items` lives on the assignment row. `assignments_via_class` is `teaches_class` today (not family). Do **not** add a student/parent policy “so they can preview the worksheet.”

**Must-fix:** Family RPCs (`student_gradebook`, `parent_progress`, landing, any AVG live block) **omit** `model_draft`, extract JSON, `draft_score`, `key_items`, `key_asset_id`, `key_notes`, original `storage_path`. Token-only `/parent` stays out (live comment: no scores or photos). Prefer teacher-only columns family GRANTs never include. Post-Approve cell = `approved_score` / status / mark — not per-item expected answers.

### 1.3 T2 — Edge opens originals without `class_teacher_of`

**Severity: P0**

A1: JWT + teacher of that class **before** signing originals. Live `analyze-homework` uses the caller JWT to SELECT the capture (`teaches_class`, so **office** can open every class’s pages) then `createSignedUrl` on the original. Live `evaluate-homework` / `match-key` / `analyze-answer-key` are **ai:dev** routes: Bearer required, but **no** `getUser` + taught-class check; they take client `imageUrls`. They are **not** in `config.toml`. A production extract function with default `verify_jwt=false` or “trust the signed URL” is SSRF + IDOR.

QA P2: `proposal.tsx` feeds `match-key` **thumbs**. That is a correctness bug; security also cares that **lists** never flip `fallbackOriginal: true` to “fix” it.

**Must-fix:** New K0/K1 functions: `verify_jwt=true`; `getUser`; `class_teacher_of(class_id)` **before** Storage sign/fetch; capture/assignment in that class; fail closed. `isAllowedAskImageUrl` on every vendor fetch (no `data:` from student Ask; no evil hosts). Do not trust `body.imageUrl` as authorization. Office JWT: **no new** extract/score RPCs (`class_teacher_of`, not `teaches_class`). Do not relitigate live assignment writes. Lists: thumbs only, `fallbackOriginal: false`.

### 1.4 T3 — Ask `grade_photo` / reuse `assignments.manage`

**Severity: P0**

A1 forbids an Ask tool that writes scores. Live `scan_answer_key` / `create_assignment` already ride `assignments.manage`. Matrix: teacher `own`, **student `own`**, office `school`. Mapping extract/score/Approve onto that cap mints a student grader and a school-wide office scorer (same P0 as AVG-S1 / GAUTH-S1).

**Must-fix:** Scoring stays Capture/Edge. **Never register** `grade_photo`, `score_key`, `approve_work`, `reveal_answer_key`. Keep `scan_answer_key` as **authoring** (confirm → `create_assignment`). If a future cap is needed, new name, `teacherSeatOnly`, office **none**. Ignore `body.tools` / `body.role`. Unknown names denied. Twin test kept.

### 1.5 T4 — LLM / client writes the grade; auto-publish

**Severity: P0**

Today `evaluate-homework` still asks vision for `draftScore`. A1: extract schema has **no** `draftScore`; `score-key` is pure TS; residuals write `model_draft` only. Failure modes: schema drift; Edge copies model total into `approved_score`; averages read `draft_score`; client preview POST’s the model number as Approve.

**Must-fix:** Extract JSON = marks only. Score module **ignores** model totals if present. `approved_score` only from existing Approve RPC/tap. `model_draft` never overwritten on Approve. Averages (AVG-A1) read `approved_score` only. Unscored residuals are **null**, not 0 (glare must not zero a quiz unless the teacher toggles). Spoken mark still wins on confirm. No IEP/skill-gap invention from bubble misses unless the teacher asks.

### 1.6 T5 — Matcher invents a student; twins / mixed stack

**Severity: P0**

Capture may have `student_id` null. Live `analyze-homework` **refuses** unassigned (`Capture must have a student`). KEYGRADE extract must **not** invent a roster row to unblock scoring. Matcher sets `guessed_student_id` only. One capture, one student. Hash mismatch → picker, not silent file to the wrong column (wrong kid’s grade). Dual-hat parent seat cannot open extract. Unlabeled twins fail closed.

### 1.7 T6–T10 — Remaining v1 threats

| ID | Sev | Threat |
|---|---|---|
| T6 Dual-hat / `teaches_class` OR | P0 | Parent chrome must not receive extract. Queries by **active seat**, not `class_teacher_of() OR parent_of()`. Do not widen live captures RLS in this epic. |
| T7 Prompt PII / vendor | P0 | First names / opaque codes only. No SIS IDs, full roster, IEP pages, or `data:` student Ask. Paid no-train. Logs = request id, uid, class_id, latency, error class — **not** pixels, extract JSON, or key answers. |
| T8 Parking dump | P0 | Do not put extract on `students.metadata` or lesson `answers`. A1 §5.1. `submissions.answers` is already family-visible via `student_gradebook`. |
| T9 Client chrome as security | P0 | Hiding the confirm table from parents in UI is not FERPA. Server predicates only. Modified client / network tab wins. |
| T10 Crypto theater / public bucket | P1 | Do not public-bucket photos to save egress (`notes/storage-egress.md`). Honest RLS. No E2E in v1. Signed URL TTL stays short; do not log the token. |

**Later (not v1):** OpenCV worker, on-device HTR, parent-facing item marks, Document AI/Textract, student-created keys, auto-split packets.

## 2. Controls

A1’s pipeline is the product contract. Server must enforce it. UI hiding is not FERPA control. Do not widen live `teaches_class` on captures/assignments in this epic; **new** extract/score/match RPCs use `class_teacher_of` only.

### 2.1 Helper / capability choice (lock)

| Helper | KEYGRADE use | Forbidden use |
|---|---|---|
| `class_teacher_of(class_id)` | New extract / match-key / score Edge **before** originals | Family reads |
| `teaches_class(class_id)` | Unchanged live assignment/capture writes (do not relitigate) | **New** scoring RPCs; family SELECT |
| `is_school_admin()` / `is_staff()` | **None** on new KEYGRADE RPCs | School-wide page dump |
| Family RPCs (`student_gradebook`, syllabus live) | `approved_score` after Approve | extract, `draft_score`, `key_items`, originals |
| `my_student_id()` | Own published cell only | Capture table; key photo |
| Active chrome seat | Dual-hat: teacher query ≠ parent query | Job-of-record flags as a bypass |
| `assignments.manage` | Existing key **authoring** Ask only | extract, score, Approve, `grade_photo` |
| Matcher | `guessed_student_id` only | `INSERT students`; silent file on hash miss |

REVOKE `anon` from any new RPC. No new Storage bucket. Private `photos` stays private. Owner-prefix object paths unchanged. Do not delete a key `assets` row still referenced by an assignment.

### 2.2 Visibility matrix (enforcement)

| Viewer | Originals | Extract / `draft_score` | `key_items` | `approved_score` |
|---|---|---|---|---|
| Class teacher (`class_teacher_of`) | Grade-time / viewer | Yes (confirm) | Yes (Assign) | Yes |
| Office (no class_teachers row) | **Not via new RPCs** | No | Live assignment write may already exist — do not add extract | Gradebook as today |
| Co-teacher with `class_teachers` row | Same as teacher (live captures) | Same | Same | Same |
| Student | Never | Never | Never | Own cell post-Approve |
| Parent login | Never | Never | Never | Linked child post-Approve |
| Token-only `/parent` | Never | Never | Never | Never |
| Dual-hat parent seat | Never | Never | Never | Parent RPC only |

### 2.3 v1 must-fix (copy into any future qa-loop)

1. Family / student RPCs omit extract, `model_draft`, `draft_score`, `key_*`, original paths. Do not park on `submissions.answers` or `students.metadata`.
2. New Edge: `verify_jwt=true` + `class_teacher_of` **before** sign/fetch. `isAllowedAskImageUrl`. No client URL as ACL. List `evaluate-homework` / `match-key` / extract in `config.toml` when they ship.
3. No Ask write-score tools. Do not reuse `assignments.manage` for scoring.
4. Extract schema has no grade. `score-key` ignores model totals. Approve tap only. Averages = `approved_score`.
5. Matcher never INSERTs. Unassigned extract does not invent `student_id`. Twins fail closed. Hash miss → picker.
6. S1: lists thumbs, `fallbackOriginal: false`. K0 signs originals for match-key / extract only.
7. Prompts: first names / codes only; paid no-train; no IEP pages; keys stay server-side.
8. Dual-hat follows **active seat**. Parent seat denied extract.
9. Residual AI is teacher-triggered; still not a grade.
10. Tests (when staffed): student/parent JWT cannot SELECT extract or `key_items`; office JWT cannot call new extract RPC; `grade_photo` unknown-name denied; Approve does not overwrite `model_draft`; `student_gradebook.answers` unchanged by key_score.

### 2.4 Honest limits

DBA / `service_role` / backups still see rows. Soft FERPA ≠ school-official DPA. Signed URLs are capability tokens until TTL. `ai:dev` on LAN is a teacher-machine trust boundary — do not bind it on a classroom Wi-Fi as a substitute for Edge JWT.

## 3. Acceptance

CEO / CoS review this note with KEYGRADE-A1.

- Ready for CEO/CoS. This ticket does **not** authorize eng staffing.
- If **yes** on A1: copy §2.3 into the implementation ticket before `kelyra-qa-loop`.
- If **no / later**: park. Unstructured `evaluate-homework` drafts stay as they are.
- Do **not** staff `senior-developer` until Chuck says send.
- Join GAUTH: scripts remain the award; Explain never writes `approved_score`.

