# GAUTH-S1: Security — Ask / Gauth-like

**Date:** 2026-09-04
**Author:** security (Kelyra)
**Ticket:** t_0b7dba7b (GAUTH-S1)
**Status:** Review only — no SQL, no app code, no migrations, no Edge handlers, no kelyra-qa-loop, no git push.
**Depends on:** `notes/company/gauth-kelyra-architecture.md` (GAUTH-A1); plan `gauth-kelyra-plan.md` (GAUTH-P1); research `gauth-research.md` (GAUTH-R1).
**Live ground:** `docs/ui-design.md` §12; `docs/data-model.md` (`ask_threads` / `ask_messages`); `src/lib/ai/askToolPolicy.ts` + Edge twin; `ask-assistant` `verify_jwt=true`; `assignments.manage` matrix (teacher `own`, **student `own`**, office `school`); `class_teacher_of` vs `teaches_class`; `20260823000000_ask_history.sql`; KEYGRADE-A1; `isAllowedAskImageUrl`.
**Legal posture:** Engineering threat model and implementation gates. Not a legal opinion and not a claim of FERPA “school official” status. Paid model tier, no training on prompts, no district DPA unless Chuck signs one.

**Non-goals of this ticket:** Implementation, Architect SQL, QA plan, staffing `senior-developer`.

---

## 0. Verdict

GAUTH-A1 product law is sound: invert Gauth (teacher Explain + student refuse, never a Snap & Solve tab); three runtimes stay uncollapsed; Ask never Approves and never `create_class`; KEYGRADE scripts remain the award; new Ask cap `explain.manage` (not `assignments.manage`); `class_teacher_of` before originals; family never SELECT extract / `explain_draft`; dual-hat follows **active seat**; twins fail closed; keys stay server-side.

**Do not implement** until the v1 must-fix list in §2 is copied into A1 / the future qa-loop. Architecture already names the big traps. Gaps that still ship a cheat app or a FERPA dump if implementers follow A1 literally:

1. Student/parent **generative** Ask is the Gauth loop even with zero solve tools. An “intent gate” that still sends the photo/paste to grok-4.6 is prompt-only. Refuse **before** the vendor call; no student/parent vision on Ask.
2. `explain.manage` matrix must be teacher `own`, parent/student/office **`none`**. Copying `assignments.manage` repeats AVG-S1 P0 (students already have `own`).
3. Postgres RLS is **row-level**. `explain_draft` on a capture/proposal row that family can SELECT leaks the Gauth dump. Family RPC/view must omit the column (or a teacher-only table).
4. `body.role` / `body.tools` are not the control plane. Seat + allow-list come from `getUser` + profile + twins. Dual-hat parent seat cannot open extract JSON.
5. `attach_explain_as_note` that students/parents can read is a post-hoc answer key. Default Keep private; never auto-attach; never seed Practice Help with the full key.

Soft FERPA posture unchanged. Security does not authorize a loop. CEO still must say send.

## 1. Threats (cheat, PII, hat escape)

Attacker profiles: curious student JWT, parent JWT (incl. invite token `/parent?t=`), teacher of class A on class B, office seat, dual-hat teacher-parent, modified Expo client, model tool-loop / prompt injection from OCR, storage signed-URL IDOR, vendor logs.

### 1.1 Data classes

| Data | FERPA / sensitivity | Where | Family-visible? |
|---|---|---|---|
| Capture originals (student pages) | **Education records** — high | private Storage + assets | **Never** (S1 thumbs on teacher lists only) |
| KEYGRADE extract JSON / marks | High — item-level work | capture / proposal | **Never** |
| `explain_draft` / `explain_status` | Teacher work product; full correct path | same row or teacher-only blob | **Never** (not even post-Approve unless teacher attaches a minimized note) |
| `approved_score` / `draft_score` | Education records | gradebook | Post-Approve cell only; Ask never writes |
| Practice Help turns (hints, check-my-work) | Education-record adjacent | ephemeral Edge; later help-used count | **Never** to parent; student sees own ladder only |
| `help_mode` on assignment | Class policy, not a grade | `assignments` | Teacher set; student may infer On from UI. Not a key. |
| Ask history (`ask_messages`) | Owner chat; may hold first names + problem text | owner-only RLS, 90-day purge | Owner only. Never a submission cell. No `data:` bytes. |
| Model prompt + pixels at vendor | Third-party processing of student work | xAI via Edge / `ai:dev` | **Never** in UI. Paid no-train only. |
| Answer key / worked example | High if shown early | assignment key | Student: never bulk; per-item only after attempt gate |
| Sibling / twin other-student pages | **High** — classic over-read | must not bind | **Never** |

**Product law (unchanged):** Nothing is a grade until Approve. Matcher never inserts a student. This path never creates classes. Twins never mix. Student camera = submit / practice entry, not solve.

### 1.2 T1 — Student/parent Ask is Gauth without tools (integrity)

**Severity: P0 (v1 must-fix)**

A1 G0 denylists `solve_photo` / `snap_solve` and adds an intent gate. Live student Ask is still a general grok-4.6 chat (`ask-assistant`). Paste or photo of tonight’s quiz → full steps **with zero tools**. Prompt copy is not the control plane (A1 §3.3 already says this). If the gate classifies then still forwards the body to the model “to phrase the refusal,” or if uncertain → generate, the red line is gone.

**Must-fix:**
- Student and parent Ask: **no vision**. Drop image attachments server-side before hydrate. Do not fetch Storage URLs for those seats.
- Intent gate runs **before** any generative completion. On match **or uncertainty**, return the G3 card with **empty model context** (do not send the homework body/pixels to xAI).
- Do not leak a partial hint on the refuse path.
- Classifier is assistive, not authoritative: keyword / assignment-bound heuristics + fail-closed. Jailbreak paraphrases (“explain like I’m checking my work”) still refuse when a photo or multi-step stem is present.
- Parent seat: same refuse. No Practice Help. Published `parent_sentence` only (ui-design §12.3).
- Token-only `/parent` never calls `ask-assistant`.

### 1.3 T2 — `explain.manage` copied from `assignments.manage`

**Severity: P0** — live matrix: teacher `own`, **student `own`**, office `school`.

A1 names a new cap (good). Implementers who copy `scan_answer_key` will offer `explain_capture` to students and school-wide Explain to office.

**Must-fix (normative):**

| Future tool | Seat | Capability | Extra wall |
|---|---|---|---|
| `explain_capture` | teacher | `explain.manage` need `own` | `teacherSeatOnly`; handler `class_teacher_of(class_id)` **before** originals; capture in that class |
| `discard_explain_draft` | same | same | same |
| `attach_explain_as_note` | same | same | Confirm in UI; copies parked draft, **not** model-supplied text |

Parent/student/office grants: **`none`**. Do **not** set `officeOnly`. `teaches_class` / `also_administrator` do not widen. Unknown names denied. Twin test kept. **Never register** `solve_photo`, `snap_solve`, `grade_photo`, `approve_work`, `reveal_answer_key`, student `check_work` as Ask tools.

### 1.4 T3 — Family SELECT of `explain_draft` / extract (column leak)

**Severity: P0** — same class as `class_syllabi.ask_draft`

A1 parks `explain_draft` jsonb on the capture/proposal row. Family gradebook RPCs that `SELECT *` or add the column “for later” dump the correct path. RLS cannot hide columns.

**Must-fix:** Family **must not** `SELECT` the teacher capture/proposal table for this blob. Teacher client SELECT iff `class_teacher_of`. Family RPCs (`parent_progress`, `student_gradebook`, any landing live block) **omit** `explain_draft`, extract JSON, `draft_score`, originals paths. Prefer a teacher-only column the family GRANTs never include. `explain_status` is not family-visible either (`noted` ≠ approved grade).

### 1.5 T4 — Dual-hat OR / `body.role` / tool-loop dump

**Severity: P0**

Live `ask-assistant` already filters tools after `getUser` (not raw `body.tools`). ui-design §12.2 still sketches `role` in the body. Dual-hat teacher+parent: parent chrome must not call `explain_capture` or receive extract in the assistant payload. A1 “active seat is the wall” fails if one query is `class_teacher_of() OR parent_of()`.

**Must-fix:** Ignore `body.role` / `body.tools`. Profile row + which function was called. Parent Ask tools stay `familyRead` only. Tool results that contain extract/originals **must not** be persisted into `ask_messages.payload` in a form the parent seat can reopen. Dual-hat tests: parent seat denied extract; teacher seat OK on taught class only.

### 1.6 T5 — Originals signed before `class_teacher_of` (IDOR / SSRF)

**Severity: P0**

Explain Edge must check JWT + `class_teacher_of(class_id)` **and** capture belongs to that class **before** minting a signed URL or `fetch(imageUrl)`. `student_id` may be null (Unassigned) — still taught-class only. Teacher of class A must not explain class B by swapping `capture_id`. Reuse `isAllowedAskImageUrl` (this project Storage host or controlled `data:`). No arbitrary URL fetch. Office JWT without a `class_teachers` row: denied (live `teacherSeatOnly` already fail-closes office at the policy layer; SQL remains SoT in the handler).

### 1.7 T6 — Practice Help collapsed into Ask / graded capture inherit On

**Severity: P0 if G4 ships; P1 for G0/G1 if `help_mode` is added early**

A1: separate Edge; every turn re-reads `help_mode`; JWT student == `student_id`; enrollment; practice only; attempt gate; no bulk key in the client; revoke fail-closed. Failure modes: register `check_work` on Ask; Help Edge accepts teacher JWT “on behalf of”; `help_mode` default copied onto the scored original; client holds the full key and “hides” it.

**Must-fix:** Do not register Help as Ask tools. Help Edge: student JWT only; `help_mode` re-read each turn (`off` → refuse); assignment kind is **practice** server-side (not chrome). Graded original captures **must not** inherit On. Ladder (1) conceptual (2) next step no final (3) isomorphic if allowed (4) full item only after attempt/post-submit. Parent: deny. Teacher sets mode; does not run Help as the child.

### 1.8 T7 — Attach-as-note / Ask chat becomes the answer key

**Severity: P0 (product default) / P1 if Confirm stays teacher-only and student-hidden**

`attach_explain_as_note` copies the Gauth dump into a field students or parents might read. Ask history is owner-only (good) but is not a grade — also must not be copied into `audit_events` or family RPCs. `ask_messages.payload` must store `asset_id`, never `data:` bytes (AVG-S1).

**Must-fix:** Default **Keep private**. Attach requires Confirm; copies **parked** `explain_draft`, not the latest model bubble. Student-visible note is optional pedagogy **after** the capture exists (already turned in), never a pre-submit key. Do not seed Practice Help with full solutions (G6 later: hints without summative key). Prompts: first names / opaque ids; no IEP; no roster dump; no sibling blend. Logs: request id, uid, capture_id, latency — **not** page bodies, not extract JSON, not `explain_draft`.

### 1.9 T8 — Twins, matcher, Approve, `create_class` regression

**Severity: P0 if regressed (A1 already forbids)**

Ask/Explain must not bind `student_id` from a first name that hits two roster rows. Matcher never INSERT `students`. Ask never `approve_work`. `create_class` stays `officeOnly`. `add_student` / `link_parent_student` unchanged. Unassigned inbox stays legal. Forbidden chips (`Solve this worksheet for the student`, `Approve all drafts`, `Create a class`) are UX; server denylist is the wall.

### 1.10 T9 — Vendor / keys / training

**Severity: P0 for controls; residual vendor risk accepted only with paid no-train**

Keys server-side (`XAI_API_KEY` / `ai:dev` + `~/.grok/auth.json`). Never `EXPO_PUBLIC_*`. `ask-assistant` `verify_jwt=true`. Explain on demand (not auto-run) to cut pixels sent. No Gauth/ByteDance SDK. No train flag. Deleting Storage does not unsay a vendor call.

### 1.11 T10 — `open_screen` as confused deputy (P1)

Live `open_screen` has `capability: null` (all seats). Student Ask may navigate to **assigned** practice only. Must not open arbitrary routes, other students, keys, or teacher proposal URLs. Server allow-list of screens + enrollment check.

## 2. Controls

Copy into A1 / future qa-loop. Do not staff `senior-developer` until Chuck says send.

### 2.1 v1 must-fix (G0+G1+G3)

| ID | Sev | Control |
|---|---|---|
| GAUTH-S1-01 | P0 | Student/parent Ask: no vision; intent refuse **before** vendor; no homework body on refuse path; no partial hint |
| GAUTH-S1-02 | P0 | New cap `explain.manage` teacher `own`; parent/student/office `none`; `teacherSeatOnly`; **not** `assignments.manage` |
| GAUTH-S1-03 | P0 | Identical maps client + Edge; unknown denied; never register solve/grade/approve/reveal/check_work Ask tools |
| GAUTH-S1-04 | P0 | Family RPC/view omits `explain_draft`, extract, `draft_score`, originals; no family `SELECT` of that row/column |
| GAUTH-S1-05 | P0 | `class_teacher_of` + capture∈class **before** signed URL / fetch; `isAllowedAskImageUrl`; Unassigned OK |
| GAUTH-S1-06 | P0 | Ignore `body.role` / `body.tools`; dual-hat parent seat denied extract; no `teaches_class` write wall |
| GAUTH-S1-07 | P0 | `create_class` stays officeOnly; no `approve_work`; matcher never INSERT; twins confirm, never pick |
| GAUTH-S1-08 | P0 | Keys server-side; `verify_jwt=true`; no `EXPO_PUBLIC_*`; no train flag; no Gauth SDK |
| GAUTH-S1-09 | P0 | Attach-as-note: default Keep private; copy parked draft only; Confirm; not a grade |
| GAUTH-S1-10 | P0 | `ask_messages`: owner RLS; no `data:` bytes; never copy explain/extract into `audit_events` or family DTOs |
| GAUTH-S1-11 | P1 | `open_screen` allow-list + enrollment; student cannot open teacher proposal / keys |
| GAUTH-S1-12 | P1 | Explain on demand (not auto-run); prompts first names / opaque ids; no IEP; no full page in logs |
| GAUTH-S1-13 | P1 | Token-only `/parent` never Ask / Explain / Help |
| GAUTH-S1-14 | P1 | `askActorSystemLine` stays non-overridable; OCR extract isolated so it cannot jailbreak Approve/score tools |

### 2.2 v1.1 Practice Help (G4) — extra gates

| ID | Sev | Control |
|---|---|---|
| GAUTH-S1-15 | P0 | Separate Edge, not Ask tools; student JWT == `student_id`; enrollment; `help_mode` re-read fail-closed |
| GAUTH-S1-16 | P0 | Help denied on graded original captures; default `off`; no bulk key in client |
| GAUTH-S1-17 | P0 | Attempt gate before full item; parent deny; teacher does not run Help as the child |

### 2.3 Tests (when gated loop runs)

Hat walls; policy twins; unknown tool denied; student `explain_capture` / `solve_photo` false; office without `class_teachers` denied; `create_class` still officeOnly; Explain cannot write `approved_score`; family RPC omits `explain_draft`; student image attachment dropped; refuse path does not call xAI with the stem; dual-hat parent seat denied extract; twin name does not auto-bind; Help on graded capture denied; `help_mode` default off; revoke mid-flight; `open_screen` off allow-list denied.

### 2.4 Out of scope / never

Student Snap tab; 100M bank; tutor marketplace; office bulk-solve; train on pages; G11 voice tutor unless CEO reopens L10; G10 “AI-use accuser” without a separate FERPA/false-positive review.

Three runtimes stay uncollapsed: Ask gateway · Explain Edge · Practice Help Edge.

## 3. Acceptance

This file is for CEO/CoS. **No SQL, no app code, no kelyra-qa-loop, no git push.**

| Check | Met |
|---|---|
| Cheat refuse is server-side, not prompt-only | Yes — T1 must-fix (no student/parent vision; refuse before vendor) |
| Hats / dual-hat / twins | Yes — T4, T8 |
| `explain.manage` not `assignments.manage` | Yes — T2 |
| Family never SELECT extract / `explain_draft` | Yes — T3 |
| Ask never Approves; teachers never `create_class` here | Yes — T8 |
| KEYGRADE scripts remain award; generative is explain/help | Yes |
| Secrets / vendor / FERPA minimization | Yes — T7, T9 |
| Implementation | **NO until Chuck says send** |

Do **not** staff `senior-developer` until Chuck says send.

