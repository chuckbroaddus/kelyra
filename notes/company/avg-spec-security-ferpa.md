# AVG-S1: FERPA / Security Review — Photo-Parse + Family View

**Date:** 2026-09-02
**Author:** security (Kelyra)
**Ticket:** t_60338b4e
**Status:** Review only — no app code, no migrations, no Edge handlers, no kelyra-qa-loop.
**Depends on:**
- `notes/company/avg-spec-ask-photo-import.md` (AVG-P2)
- `notes/company/avg-spec-family-view.md` (AVG-P4)
- `notes/company/avg-spec-syllabus-ia.md` (AVG-P1)
- Live walls: `src/lib/ai/askToolPolicy.ts` + Edge twin, `src/lib/ai/askImageUrl.ts`, `student_gradebook()`, `parent_open` / `parent_open_mine`, `teaches_class`, office-only `create_class`
**Legal posture:** Engineering threat model and implementation gates. Not a legal opinion and not a claim of FERPA “school official” status. Kelyra’s live posture (`docs/architecture.md`, `docs/mvp.md`) still applies: paid model tier, no training on prompts, no district DPA unless Chuck signs one.

**Non-goals of this ticket:** Implementation, Architect SQL, QA plan, lifting AVG-GATE.

---

## 0. Verdict

P2 and P4 product law is sound: Ask never auto-publishes; family is read-only; Approve remains the only grade publication; teachers do not create classes; office does not own class grade policy in v1.

**Do not implement** until the v1 must-fix list in §6 is in the architecture ticket (A1) and the future qa-loop. The live Ask matrix will otherwise mint syllabus **write** tools for students (and school-wide writes for office) if implementers copy `assignments.manage` from P2’s sketch.

---

## 1. Scope and data classes

| Data | FERPA / sensitivity | Where it would live | Family-visible? |
|---|---|---|---|
| Published category labels + weights + enabled rule *prose* | Generally **not** student education records (class policy). Directory-ish. | `class_syllabi` / `syllabus_categories` after Confirm | Yes, only if `status=published` **and** `publish_to_family` |
| Running average, approved marks, missing/excused **for one child** | **Education records** (PII) | submissions + derived DTO | Yes, own / linked child, post-Approve only |
| `ask_draft`, OCR confidence, `ocr_notes`, `rubric_draft`, `deferred_signals` | Teacher work product; may contain incidental student names | jsonb on syllabus or import row | **Never** |
| Syllabus / rubric **photo** (`source_asset_id`) | **High** if faces, roster, scores, IEP marks, handwritten student names | private Storage + assets | **Never** |
| Model prompt + image bytes at vendor | Third-party processing of possible student PII | xAI / Gemini via Edge or `ai:dev` | **Never** (not even teacher UI) |
| Other students’ scores, names in grade context, sibling blend | **High** — classic FERPA over-read | Must not exist in family payloads | **Never** |
| `draft_score`, `model_draft`, Glow/Grow pre-Approve, capture photos of work | Teacher-only until Approve | submissions / captures | **Never** |
| Class / school header on a printed syllabus | Low | photo + optional title | Title OK if teacher-confirmed; photo not |

**Product law (unchanged):** Nothing is a grade until Approve. Nothing is class policy until teacher Confirm. Matcher never inserts a student. This path never creates classes.

---

## 2. Threat model

Attacker profiles: curious student JWT, parent JWT (incl. invite token), teacher of class A looking at class B, office seat, dual-hat teacher-parent, modified Expo client, model tool-loop, storage URL leak, vendor logs.

### T1 — Syllabus photo stored and over-read

**Severity: P0 (v1 must-fix)**

Photographed handouts are not “just policy text.” They routinely include student faces in the frame, roster columns, score tables, IEP/504 stamps, or a child’s name in the header.

Live storage: `photos` / `audio` buckets are private (`public=false`) with path-prefixed object policies (`20260812000000_slice01_foundation.sql`). Family already must not get public-read. **Row-level SELECT on `class_syllabi` that includes `source_asset_id` + `ask_draft` is still an over-read** because Postgres RLS is not column-level.

P1 §9.1 currently says students/parents `SELECT` published syllabi. That is **too wide** if the same row holds `ask_draft` / `source_asset_id`.

**Must-fix:**
- Family never `SELECT`s the teacher syllabus table. Dedicated RPCs/views (P4 §9 names are fine) that return only published, family-publishable **policy DTO** fields.
- No signed URL mint for syllabus source assets except taught-class teacher (same wall as homework assets: teacher-only).
- Discard deletes the unreferenced source object (and thumb), matching `delete from storage.objects` patterns already used for people photos.
- Confirm default: **drop source bytes** after structured policy is saved. Keeping the photo is an explicit teacher “keep original for my records” later — not v1 default.
- Unpublished draft images: purge on Discard; idle TTL **30 days**.
- Ask history (`ask_messages`, 90-day purge in `20260823000000_ask_history.sql`): store `asset_id` / storage path, **not** `data:` image bytes in `payload`. New chat / discard must not leave a second copy.

**Later:** face/PII detector before vendor call; redaction; school retention schedule in a DPA.

### T2 — Model prompt / vendor leakage

**Severity: P0 for controls; residual vendor risk is accepted only with paid no-training**

Parse sends the **pixels** to the vision provider. Deleting Storage after the fact does not unsay that call.

Live mitigations to **reuse**, not invent:
- Server-side only: `invokeAi('parse-class-syllabus')` → `ai:dev` or Edge. `verify_jwt=true`. Secrets `XAI_API_KEY` (or current Edge vision secret). **Never** `EXPO_PUBLIC_*`.
- SSRF: `isAllowedAskImageUrl` (`src/lib/ai/askImageUrl.ts`) — https Storage on this project host, or `data:`. No arbitrary fetch. Parse must call the same helper **before** `fetch(imageUrl)`.
- Taught-class check **before** the vendor call (do not spend tokens / leak pixels on IDOR).
- Prompt: **no roster, no SIS ids, no IEP text, no classmate first-name list.** Homework Ask injects first names; syllabus parse must not copy that.
- Logs: function logs may include `class_id`, draft_id, warning codes — **not** image bytes, not `ocr_notes` dumps, not full `ask_draft`.
- Document kind `unknown` / detected grade-list / student-filled rubric: return empty structured categories; do not OCR name/score tables into JSON (P2 §9 / §10.1). Teacher warning is required; silent partial extract is a leak.

**Residual:** vendor subprocessors see the page. Same soft FERPA posture as capture grading. Do not claim school-official. Do not use a free consumer endpoint.

**Later:** DPA; disable parse in regions without one; on-device OCR.

### T3 — Ask becomes superuser (tool allowlist)

**Severity: P0 (v1 must-fix)** — P2’s capability sketch is unsafe against **live** policy.

Live `ASK_TOOL_POLICY` (`src/lib/ai/askToolPolicy.ts` + Edge twin):

- Unknown names → denied (keep).
- `create_class` is `officeOnly: true`; matrix `classes.create` teacher = `none`; home copy: “The office assigns the classes you teach.” **Teachers must not create classes** on this path or any Ask tool added for AVG.
- `scan_answer_key` / `create_assignment` / `list_assignments` use `capability: 'assignments.manage'`.
- Edge defaults: `'assignments.manage': { … teacher: 'own', parent: 'none', student: 'own' }` and office = `'school'`.

P2 table says `scan_class_syllabus` may use `assignments.manage`. **If implemented that way, a student JWT is offered the scan tool**, and an office JWT can parse **any** class. Client map and Edge twin stay in sync today (`askToolPolicy.test.ts`); a client-only hide does not bind the server.

**Must-fix allowlist (Architect names may differ; semantics may not):**

| Future tool | Seat | Capability | Extra wall |
|---|---|---|---|
| `scan_class_syllabus` | Teacher of **that** `class_id` only | **New** `syllabus.manage` (teacher `own`, parent/student/`none`, office **`none`** in v1) | Server `teaches_class(class_id)` before vision; writes **`ask_draft` only** |
| `get_class_syllabus_draft` | Same | Same | Returns draft; never family serializer |
| `discard_class_syllabus_draft` | Same | Same | Clears draft; does not touch published; deletes unref asset |
| `confirm_class_syllabus` | **Prefer omitted from Ask** | Confirm is **setup UI + RPC** | If Ask exposes it: structured args = **teacher-edited** form snapshot, re-check `teaches_class`, never model re-output |
| Family explain (P4 S-A1 / P-A1) | Student / parent | New **read** tools or none | Published + own/child only; **no** `list_roster`, `scan_*`, `confirm_*`, `create_*` |

Hard rules:
1. Do **not** reuse `assignments.manage` for syllabus writes.
2. Do **not** ride `is_staff`, `also_administrator`, or office `school` scope.
3. Office cannot parse or publish class policy in v1 (P1 altitude).
4. Dual-hat (`staff_also_parent`, `also_teacher`): tool seat is the **signed-in profile role**, then `teaches_class` / `parent_students`. A teacher-parent does not inherit scan on the child’s other classes.
5. `filterAskToolDefs` on Edge after `getUser` + profile row — never `body.tools` / `body.role` (live ask-assistant pattern).
6. This path must not call `create_class`, `add_student`, `enroll_student`, or any roster insert (matcher law).

### T4 — Write policy without Confirm

**Severity: P0 (v1 must-fix)**

P2 sequences are correct. Implementation failure modes:

- Vision Edge `UPDATE`s `class_syllabi` to `published`.
- `scan_class_syllabus` “helpfully” publishes when weights sum to 100.
- Ask tool `confirm_class_syllabus` invoked from model loop with **unedited** JSON.
- Classifier job `import_syllabus` auto-runs parse **and** confirm (P2 E3 must stay proposal-only).
- Partial JSON merged onto a live published row.
- Re-scan overwrites published instead of `ask_draft`.

**Must-fix:**
- `parse-class-syllabus` is side-effect-free except metering/logs. Client or a **draft-only** RPC parks JSON.
- Confirm RPC: `SECURITY DEFINER`, `search_path = public`, `auth.uid()` not null, `teaches_class(p_class_id)`, payload = selected fields only, sum/key gates, replace-copy if live exists. `REVOKE ALL FROM public, anon`; `GRANT EXECUTE` to `authenticated`.
- Confirm disabled until review UI mounted (P2 gate 2). No one-tap chat confirm of raw model output.
- OCR/LLM failure → empty draft + error; **no** silent 40/60; **no** quiz→`include_in_average` shortcut (server force `false`).
- No writes to `submissions`, `approved_score`, `draft_score`, or assignment bulk `include_in_average`.

### T5 — Parent / student over-read (family view)

**Severity: P0 (v1 must-fix)**

P4 matrix is the product contract. Server must enforce it; UI hiding is not FERPA control.

**Must-fix read models** (names illustrative):

1. `family_class_syllabus(class_id)` — empty unless published + `publish_to_family` + (student enrolled **or** parent linked **and** child enrolled). Columns: labels, weights, term labels, **plain-English enabled rules only**. Omit: `ask_draft`, `source_asset_id`, `ocr_notes`, keys as slugs, `calc_mode` raw, `publish_to_family` flag, inactive categories, confidence.
2. `family_student_gradebook(student_id, class_id, term)` — session student **or** `parent_students` contains that id. Own cells. `approved_score` / family status only.
3. `family_why_average(...)` — same identity wall. Contribution list = **that student’s** counted assignment ids only.

**Do not extend** live `student_gradebook()` as-is. That RPC is `SECURITY DEFINER` and already returns `sub.answers` jsonb; its comment admits draft scores “stay on the row.” Family AVG must **not** select `draft_score`, `model_draft`, `answers` (unless a future explicitly student-authored practice payload is separately reviewed), classmate rows, or roster.

**Sibling isolation:** Parent Home chips are not enough. RPC takes `student_id` and **fails closed** if not linked. Never return all children and let the client filter. Switching child must not leave sibling cells in a shared cache key without the child id.

**Token vs login parent:** Same DTO. `parent_open(p_token)` is already a capability URL. Do not stuff gradebooks into that blob without the same strip. Token leak = that parent’s linked children only — still education records; keep the existing token hygiene; do not widen.

**Dual-hat:** Teacher JWT must not `SELECT` another teacher’s `ask_draft` because they parent a child in that class. Family RPCs for the parent hat; taught-class CRUD only for classes they teach.

**Ask family tools:** Read published + own/child averages only. Prompt the model with **that DTO**, not `SELECT *` from submissions.

**Office:** No family gradebook in v1; no school-wide syllabus dump.

**Stale cache:** Un-publish or unlink → next load empty; no long-lived client cache of weights/scores.

### T6 — Cross-class IDOR

**Severity: P0 (v1 must-fix)**

`class_id` in Ask args / Edge body / Confirm RPC is attacker-controlled. Live assignment RLS uses `teaches_class(class_id)`. Syllabus tables and parse must use the same helper, not `classes.teacher_id = auth.uid()` only (co-teacher / office-created classes with null `teacher_id` are real).

Signed Storage URLs for the source photo: mint only after taught-class; short TTL; path under teacher prefix.

Student/parent calling Confirm or parse with a classmate’s `class_id` → 403, no vendor call.

### T7 — Incidental PII in structured output / published title

**Severity: P1 (v1 must-fix for family serializers; detector can be later)**

Even a “clean” syllabus photo can OCR a student name into `title`, `ocr_notes`, or a bogus category label (“Maya — extra credit”).

**Must-fix:** Family DTO is teacher-confirmed selected fields only. `ocr_notes` / `deferred_signals` / rubric criteria **never** publish to family. Low-confidence fields stay unselected (P2).

**Later:** Model flag `contains_student_identifying_data`; block Publish until teacher acknowledges.

### T8 — Known wider holes — do not stack

Live HOLD comments (`notes/grok-build-queue.md`): do not ride thread-member insert, `school_*_for_link`, or `get_parent_card` dumps. New syllabus/family RPCs fail closed to **“work on a student in a class I teach”** / **“this linked child”**. User JWT only. No service-role as the actor in Expo.

---

## 3. RLS / RPC recommendations (for Architect)

Fail closed. Prefer RPCs over table grants for family.

| Object | Teacher (taught class) | Office v1 | Student | Parent |
|---|---|---|---|---|
| `class_syllabi` table | ALL if `teaches_class(class_id)` | **No** (no school-wide policy) | **No table privilege** | **No table privilege** |
| `syllabus_categories` | ALL via syllabus class | No | No table | No table |
| `ask_draft` / `source_asset_id` | Teacher via table | No | No | No |
| Family syllabus RPC | n/a (use teacher UI) | No | Execute; empty unless enrolled + published + `publish_to_family` | Execute; empty unless `parent_students` + child enrolled + same publish gates |
| Family gradebook / why RPC | n/a | No | Execute; `student_id = my_student_id()` | Execute; link check; one child per call |
| Confirm / draft upsert / discard RPCs | Execute + `teaches_class` | **No** | **No** | **No** |
| Storage syllabus objects | Teacher path CRUD | No | No | No |
| `parse-class-syllabus` Edge | JWT + taught-class | Deny | Deny | Deny |

Column note: if Architect insists on student/parent `SELECT` of published rows, it **must** be a **view** without draft/asset/ocr columns, plus `security_invoker` or a definer that re-checks enrollment. A policy on the base table cannot hide jsonb.

Do not copy `student_gradebook`’s “draft stays on the row.” Do not copy office directory RPCs.

---

## 4. Ask tool allowlist (normative for v1)

Copy into A1 / future `ASK_TOOL_POLICY` (client **and** Edge twin; test like `askToolPolicy.test.ts`):

```
syllabus.manage:  superintendent none, administrator none, teacher own, parent none, student none
  tools: scan_class_syllabus, get_class_syllabus_draft, discard_class_syllabus_draft
  officeOnly: false
  run: teaches_class(class_id) or deny

syllabus.confirm: same matrix; **UI RPC primary** — omit from Ask unless structured edited payload
  officeOnly: false

syllabus.family_read (optional tools): teacher none (they have setup), office none,
  parent own, student own
  tools: explain_class_grades / get_published_syllabus — read DTOs only
```

Unknown names denied. Teachers still cannot `create_class`. Parse/confirm must not insert `classes` or `students`.

Student live `list_roster` (`roster.view` own) is **out of AVG family Ask**. Do not add it to grade-explain prompts.

---

## 5. Retention of captured syllabus images

| Stage | Keep? | Who can read | TTL |
|---|---|---|---|
| In-flight parse | Bytes to vendor once; Storage object for signed fetch | Server + teaching teacher | Minutes (signed URL) |
| Parked `ask_draft` | Source asset until Discard/Confirm | Teaching teacher only | **30 days** idle purge |
| Discard / cancel | **Delete** unreferenced object + thumb | — | Immediate |
| After Confirm (v1 default) | **Delete** source object; structured policy remains | — | Immediate |
| After Confirm (later opt-in “keep original”) | Teacher-only asset | Teaching teacher | School policy / later DPA |
| Ask thread payload | `asset_id` only, never data-URL | Thread owner (teacher) | Existing 90-day Ask purge **and** same asset TTL |
| Vendor | Not under our disk | Provider | Paid no-training; no extra logging of bytes |
| Family / student | Never | — | — |

Rationale: once weights exist as rows, the photograph is no longer needed for the family product and is the highest-PII artifact in this feature.

---

## 6. Findings — severity and v1 cut

### v1 must-fix (block AVG implementation / qa-loop if missing)

| ID | Sev | Finding | Gate |
|---|---|---|---|
| S1-01 | P0 | New `syllabus.manage` (or equivalent). **Do not** map scan/confirm to `assignments.manage` (students have `own`; office has `school`). Client + Edge twins. Unknown denied. | Ask policy tests: student, parent, office, teacher-also-admin, teacher-parent dual-hat |
| S1-02 | P0 | Teachers **must not** create classes; parse/confirm **must not** insert classes or students | Static + RPC tests |
| S1-03 | P0 | Vision function never publishes; Confirm is taught-class RPC on **edited** payload; Ask does not auto-confirm | No UPDATE published in parse; confirm revoke/grant |
| S1-04 | P0 | Family **RPCs/views**, not `SELECT` on teacher syllabus rows; strip `ask_draft`, `source_asset_id`, ocr, confidence | Serializer tests |
| S1-05 | P0 | Family grade/why payloads: no `draft_score`, `model_draft`, AI answers, classmates, sibling mix; parent `student_id` link-checked on server | Network fixture tests |
| S1-06 | P0 | `teaches_class(class_id)` before vendor fetch; `isAllowedAskImageUrl`; JWT; no `EXPO_PUBLIC_` keys | Edge + ai:dev |
| S1-07 | P0 | Syllabus photos: private bucket, no family signed URLs, delete on Discard, **delete on Confirm by default**, 30-day idle TTL for drafts; no data-URL in `ask_messages` | Storage + purge |
| S1-08 | P0 | Prompt contains no roster/SIS/IEP; grade-list / student-filled pages do not emit name/score JSON | Prompt + fixture |
| S1-09 | P0 | Do not stack on `get_parent_card` / directory dumps / `is_staff`; user JWT only | Review of SQL |
| S1-10 | P1 | Dual-hat: parent-hat cannot read other teachers’ drafts; teacher-hat cannot family-read unlinked kids | RLS tests |
| S1-11 | P1 | Confirm RPC definer hygiene (`search_path`, revoke anon, taught-class, replace warning) | SQL review |
| S1-12 | P1 | Family Ask read-only; no scan/confirm/create on those seats; DTO-only context to the model | Policy tests |
| S1-13 | P1 | Un-publish / unlink / `publish_to_family=false` immediately hides weights and weighted average; no invented 40/60 | Product + API |

### Later (not v1 blockers)

| ID | Sev | Item |
|---|---|---|
| S1-L1 | P2 | Signed DPA / school-official claim; until then keep current “soft FERPA” copy |
| S1-L2 | P2 | On-device OCR or vendor face/PII redaction before upload |
| S1-L3 | P2 | Teacher opt-in keep-original after confirm; district retention schedule |
| S1-L4 | P2 | Classifier `import_syllabus` job (must remain non-publishing if ever built) |
| S1-L5 | P2 | Eligible student (18+) / FERPA rights transfer |
| S1-L6 | P2 | Email/push digest of average changes (new disclosure surface) |
| S1-L7 | P2 | Co-teacher confirm rights beyond `teaches_class` |
| S1-L8 | P3 | What-if / GPA / year composite (P4 later) — new inference risks |
| S1-L9 | P3 | PDF syllabus download for family (don’t ship photo bytes) |

---

## 7. FERPA mapping (engineering)

| FERPA concern | AVG control |
|---|---|
| Education records (grades) disclosed only to parent / eligible student / school official | Linked child only; Approve gate; no classmates |
| Parents inspect **how** the grade is computed | Published weights + why-sheet of **own** contributions (R3/P4). Draft calc stays teacher-only |
| No peer grades in the product | Why-sheet and books are single-student |
| Vendor as school official | **Not claimed** without DPA. Paid no-training; minimize pixels; delete photos |
| Directory vs record | Weights/labels OK when teacher publishes to family. Photos/scores are records |
| COPPA | Unchanged: school/teacher context; no new public child posting |
| Redisclosure | Family Ask must not echo other students; logs without image/PII dumps |

---

## 8. Tests a future qa-loop must include (do not run now)

1. Student JWT: scan/confirm denied; family syllabus empty when unpublished; no `ask_draft` in any student RPC.
2. Parent JWT: child A selected cannot fetch child B gradebook by id; unlink → 403/empty.
3. Teacher of class A cannot parse class B.
4. Office JWT cannot scan/confirm class syllabus in v1.
5. Teacher `also_administrator` still cannot `create_class`; still cannot office-publish syllabus.
6. Parse with `class_id` attacker-supplied + valid JWT of non-teacher → no vendor mock call.
7. Image URL `https://evil.example/...` rejected by allowlist.
8. Confirm without review payload / raw model JSON rejected.
9. Discard leaves published weights intact; source object gone.
10. Family payload fixture: no `draft_score`, `ask_draft`, `source_asset`.
11. `publish_to_family=false` → no weighted average, no weight list.
12. Grade-list photo fixture → no student names in draft categories.

---

## 9. Open questions (not blocking this review)

| # | Question | Owner |
|---|---|---|
| 1 | Separate `syllabus_imports` table vs `ask_draft` column (P2 Q1) — **security prefers a separate import row** so published family views cannot share a table with draft jsonb | Architect |
| 2 | Confirm-from-Ask vs UI-only — **security: UI/RPC only in v1** | PM already leans this |
| 3 | Idle 30-day draft photo TTL vs 7-day — 30 days matches teacher weekend/break; tighten if Storage cost/PII appetite is higher | CEO optional |
| 4 | Whether `student_gradebook.answers` is a live leak today | Out of AVG scope; do not copy |

---

## 10. Decisions (this ticket)

1. Family access is RPC/view-only; no base-table SELECT of `class_syllabi`.
2. Syllabus Ask writes get a **new** capability, not `assignments.manage`.
3. Office and family seats cannot write syllabus in v1.
4. Teachers cannot create classes; this feature cannot either.
5. Source photos: teacher-only, delete on Discard, **delete on Confirm by default**, 30-day idle TTL.
6. Confirm is not an unsupervised Ask side effect.
7. Soft FERPA posture unchanged until a DPA exists.
8. No implementation from this ticket.

---

## 11. Downstream

| Ticket | Needs |
|---|---|
| AVG-A1 `t_cb0b3bcc` | §3 RLS, §4 tools, §5 retention, S1-01–S1-13 |
| AVG-Q1 `t_8f7c0d1a` | §8 tests |
| AVG-GATE `t_eea9ba55` | This artifact exists; **CEO still must write yes**. Security does not authorize implementation |

**RECOMMENDED NEXT ACTION:** Architect A1 incorporates must-fix walls. CoS/CEO AVG-GATE. Do not launch kelyra-qa-loop from this ticket.
