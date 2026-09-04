# KEYGRADE-A1: Photo key grading — proposed method (no code)

**Date:** 2026-09-03
**Author:** software-architect
**Ticket:** t_e0892939
**Status:** Opinion + pipeline sketch only. **No SQL. No Edge. No kelyra-qa-loop. Not implementation.**
**Depends on:**
- `notes/company/photo-key-grading-research.md` (KEYGRADE-R1, 2026-09-03)
- Live: `docs/architecture.md`, `docs/data-model.md`, `docs/mvp.md`, `docs/ui-design.md` §29.4
- Live key path: `assignments.key_*`, `analyze-answer-key`, `match-key`, `evaluate-homework`, `src/lib/assignments/keys.ts`
- S1 thumbs: `notes/storage-egress.md`, `assets.thumb_storage_path`, QA P2 `match-key` still signs key images as thumbs

**Gate:** Do not staff `senior-developer` / `kelyra-qa-loop` until Chuck says send. This file is for CEO / CoS review.

---

## 0. Verdict

| Question | Answer |
|---|---|
| Fit the live product (Capture → desk → Approve)? | **Yes** — extend the existing key, do not add a ZipGrade product. |
| Scripts first, AI residuals? | **Yes** — deterministic TS score against `key_items`; cheap vision only to **extract**; LLM never writes a grade. |
| v1 item types | **MC + numeric only.** Short / show-work stay `needsTeacher`. |
| Originals vs thumbs | Grade-time + key analyze + match-key use **originals**. Lists stay **thumbs only** (S1). |
| Implementation loop ready? | **NO until CEO yes.** |

Do not add OpenCV/Tesseract as a laptop script. Do not add Document AI / Textract. Do not auto-insert a student. Do not publish `draft_score`.

---

## 1. What this is (and is not)

Kelyra already has the grade-book column and the key:

- Teacher **plans** an assignment (web) and attaches a key: photo and/or typed items (`key_kind` `photo` / `items` / `both`).
- Phone **captures** student paper. Spoken-name matcher may guess; **never inserts** a student. Unassigned is first-class.
- `match-key` may pre-select the planned column from print hash / layout / header.
- `evaluate-homework` today asks cheap vision for gaps **and** a draft score, including when a key is present.
- Teacher confirms on proposal / student page, then **Approve**. Nothing is a grade until that click.

KEYGRADE does **not** replace unstructured homework → named gaps (MVP M6). It is the **keyed** path: when `assignmentHasKey`, score against the key with scripts first.

Research (ZipGrade, Gradescope, OpenCV+Tesseract papers) is the **method library**. The product constraint is Expo + Supabase Edge + one AI adapter. A Python OpenCV CLI on the teacher laptop is not shippable here.

**“Scripts first” in Kelyra means:** extraction may use cheap vision (or later CV); **awarding points is a pure function** of `{extracted answers, key_items}`. Residual AI only on items the script will not score.

---

## 2. Where it lives

```
Assign (web)                         Capture (phone)                    Edge (keys server-side)
────────────                         ───────────────                    ─────────────────────
AssignmentForm                       camera + upload original+thumb     match-key  (print ID)
  key photo / typed items            spoken name → guess only           extract   (cheap vision or later CV)
  analyze-answer-key → editable      inbox if student_id null           score-key (TS, no LLM)
  Save assignment = key SoT          lists: thumbs only                 write model_draft + draft_score
                                     never invent student
                \                      /
                 → proposal / student page (web denser) ←
                         teacher edits cells
                         Approve  →  assignments + submissions.graded
```

| Surface | Owns | Does not |
|---|---|---|
| **Capture (phone)** | Shutter, multi-page upload, S1 thumb, spoken name, Unassigned inbox | Scoring, Approve, key authoring, originals on list rows |
| **Assign (web)** | Planned column + `key_items` / `key_asset_id` / print signature | Student filing, grades |
| **Edge** | `match-key`, extract, deterministic `score-key`, JWT + class-teacher check before fetching originals | Client LLM, family reads of drafts |
| **Proposal / student page** | Confirm extracted marks, override cells, **Approve** | Auto-publish |
| **Grade book** | `approved_score` after Approve | `draft_score` / `model_draft` |

Phone is shutter + inbox (M10). Web is review + Approve. Edge is the only place model keys and original student pages are opened for grade-time.

---

## 3. Pipeline stages (keyed capture)

Hard order. Later stages must not run if earlier gates fail.

### Stage 0 — Key exists (Assign)

Teacher saves a planned assignment with at least one of: typed `key_items`, or a key photo whose items the teacher accepted.

Item shape today: `{n, stem, answer, points, needsTeacher, note}`.

v1 additive fields on the same JSON (no new table):

| Field | v1 |
|---|---|
| `type` | `mc` \| `numeric` \| `short` \| `work`. Default: infer (`answer` is A–E / T/F → `mc`; mostly digits → `numeric`; else `short`). |
| `choices` | Optional `["A","B","C","D"]` for MC. |
| `needsTeacher` | If true, script awards **null** (not 0). Teacher fills on confirm. |

Print signature (`key_phash`, `key_layout`, `key_header`, `key_blank_map`) stays as today. Built from the **original** key photo, not the thumb.

### Stage 1 — Capture + store (phone)

1. Upload JPEG original (existing max long edge ~1600) + `*_thumb` (S1).
2. Insert `captures` with `student_id` null, `status = unassigned` unless the teacher already confirmed a roster name.
3. Matcher may set `guessed_student_id` only. **Never INSERT students.**

Lists (Inbox, WorkRow, avatars, assignment chips): sign **thumb only**, `fallbackOriginal: false`.

### Stage 2 — File to a column (`match-key`)

Inputs: **original** student page + each class key’s print signature **and original** `key_asset` (not `signedUrlsForAssetIds` / avatar thumbs).

Output: suggested `assignment_id` + confidence. Teacher can change it. Low confidence → picker, no silent file.

Known defect (QA P2, S1): `proposal.tsx` currently feeds `match-key` thumb URLs. Grade-time must use `signedUrlForAsset` on `storage_path`. Chips stay thumbs.

### Stage 3 — Extract (the only default AI)

When the capture has a photo **and** the chosen assignment has a key:

Edge (cheap vision, `detail: low`, already resized ~1280) returns **marks, not a grade**:

```
{ items: [{ n, extracted: string | null, confidence: 0–1, flag?: 'glare'|'blank'|'handwriting'|'unreadable' }] }
```

No `draftScore` from the model. No Glow/Grow required on this pass. Do not send full roster legal names. First names / opaque codes only if a name-on-page hint is needed (matcher still does not insert).

If there is **no** key, keep today’s `evaluate-homework` gap-draft path. Do not force MC templates on freeform work.

### Stage 4 — Score (script, no LLM)

Pure TypeScript (shared module, Edge + client preview). Inputs: extract JSON + `normalizeKeyItems(key_items)` + `score_scheme` / `max_score`.

| `type` | Award |
|---|---|
| `mc` | Exact after normalize (`a`/`A`/`(a)`). Else 0 if extracted; null if blank/low-conf. |
| `numeric` | Exact after strip commas/spaces; optional trailing `%`. No algebra solver. |
| `short` / `work` | Always residual (`needsTeacher` / null awarded). |
| `needsTeacher: true` | Always residual. |

`draft_score` = sum(awarded) / sum(points of **scored** items) × 100, or raw points if `max_score` set — **proposal only**. Unscored residuals do not count as 0 in v1 (omit + note “n items need you”). Teacher can switch to “count blank as 0” on confirm.

### Stage 5 — Residuals (optional AI, teacher-triggered)

Run **only** if the teacher taps Look-again / “grade the short answers,” or if extract confidence is below a threshold **and** they opt in.

- Cheap vision first; **grok-4.6** only on explicit Look-again (existing policy).
- Still writes `model_draft`, never `approved_score`.
- Show-your-work: crop region in the draft for the teacher’s eye. No auto points in v1.

### Stage 6 — Confirm (not a grade)

Proposal / student page shows:

- Original photo (viewer), not the list thumb.
- Per-item: expected · extracted · awarded · flag.
- Spoken mark still wins if the teacher said “88” / “Pass” / “don’t grade” (ui-design capture rules).
- Teacher edits cells. Save keeps `captures.status = draft`, `draft_score`, `model_draft`.

Student/parent: **not visible**.

### Stage 7 — Approve (the only publish)

Existing Approve path:

- Teacher tap only.
- Copies `approved_score` (edited, not raw model) onto the assignment’s submission cell (`graded`).
- Files into the planned `assignment_id` when set; does not invent a second column.
- `model_draft` is **never overwritten**.
- Gaps optional on keyed MC (often none). Do not invent skill gaps from bubble misses unless the teacher asks.

Until this click: not a grade, not family-visible, not in syllabus averages.

---

## 4. v1 vs later by item type

| Type | v1 (needed) | Later (desired) | Non-goal |
|---|---|---|---|
| **MC / T/F / matching** | Extract letter/bubble → exact match | Fill-% / contour / on-device detector | Require ZipGrade printable forms |
| **Numeric / gridded** | OCR digits → exact/normalize | Range checks, units | CAS / “equivalent expression” |
| **Short constructed** | Flag `needsTeacher` | Teacher-triggered cheap similarity / grouping | Full auto essay grade |
| **Show-your-work** | Flag + crop | HTR, YOLO layout | Auto rubric score |
| **Freeform homework, no key** | Unchanged M6 gap draft | — | Force a key |
| **Multi-page / mixed kids** | One student per capture; teacher confirms | Batch page OCR | Auto-split packets; twins auto-file |
| **Key authoring** | Existing photo + typed items | Template editor, versioned keys | Student-created keys |

**v1 cut (needed):** keyed MC + numeric, original-signed grade-time, script score, teacher confirm, Approve.

**Explicitly out of v1:** OpenCV/YOLO worker, on-device HTR, hardware OMR, parent-facing item marks, Document AI/Textract, second AI vendor, auto-publish.

---

## 5. Data / RLS sketch (not applied)

No new tables in v1. Reuse `assignments.key_*`, `captures.model_draft` / `draft_score`, `submissions.draft_score` / `model_draft` / `approved_score`.

### 5.1 `model_draft` score pass (additive JSON)

Parked on the capture (and copied to submission draft if that path is used). Never family-visible.

```
{
  schema_version: 1,
  method: "key_score",
  assignment_id: uuid,
  extract_model: string | null,
  items: [{
    n, type, expected, extracted, points,
    awarded: number | null,
    confidence: number | null,
    residual: boolean,
    flag: string | null
  }],
  draft_score: number | null,
  residuals: number,
  cost_usd: number | null
}
```

Do not put this on `students.metadata`. Do not make it an `answers` lesson payload.

### 5.2 Optional later columns (not v1)

Only if JSON outgrows confirm UX: `captures.score_method text` (`vision_gaps` \| `key_score`). Skip until needed.

### 5.3 Storage

| Use | Object |
|---|---|
| Inbox, WorkRow, assignment chip, avatar | `thumb_storage_path` (S1, no original fallback) |
| ImageViewer, Capture review, `analyze-answer-key`, `match-key`, extract, Ask photo | `storage_path` original |
| Delete capture | Existing unref rules; do not delete a key `assets` row still on the assignment |

### 5.4 RLS / privilege

Live assignment + capture writes already ride `teaches_class` (includes office). **Do not widen.**

| Action | Who |
|---|---|
| Create/edit key, run analyze-answer-key | Class teacher (`class_teacher_of` preferred for any **new** RPC). Office may already edit assignments today — do not special-case, do not grant students. |
| Extract / score-key Edge | JWT + teacher of that class **before** signing originals. Fail closed. |
| SELECT `model_draft` / `draft_score` | Teacher of class only. **No** student/parent table SELECT. |
| Approve | Teacher tap; existing RPC/trigger. |
| Family / student | Post-Approve cell only (`approved_score`, status). No item extract JSON. |

Ask: do **not** add a “grade this photo” tool that writes scores. Existing `scan_answer_key` → confirm → `create_assignment` stays key **authoring**. Scoring is Capture/Edge, not Ask.

Matcher constraint unchanged: guessed name never INSERTs `students`.

---

## 6. Cost and risk

### Cost (minimize AI)

| Step | Meter |
|---|---|
| Thumb lists | Storage egress only (S1). **Do not** sign originals here. |
| `match-key` | Cheap vision if hash/layout miss; prefer hash-first so most pages are $0 model. |
| Extract | One cheap vision pass per capture (`grok-4.20-0309-non-reasoning`, low detail). Same family as today’s evaluate. |
| Score-key | **$0** compute. |
| Residuals | Teacher-triggered only. Flagship = Look-again. |
| No key | Today’s evaluate-homework (unchanged). |

Vs research “local OpenCV is free”: true on a laptop; false as a Kelyra service unless we add a worker. v1 buys **zero LLM on the award step**, which is the spend that would scale with every bubble.

A 30-student MC quiz: 30 extract calls, 0 score calls, 0 Approves until the teacher walks the stack. Monthly cap + existing `ai-spend` still apply.

### Risks

| Risk | Mitigation |
|---|---|
| **Thumb-graded keys** (live P2) | Grade-time original signer; thumbs for chips only. |
| Glare / skew / curl | Extract flags `glare`/`unreadable`; teacher confirm; later CV preprocess — not v1 blocker. |
| Handwriting on “numeric” | Low confidence → residual, not 0. |
| Wrong page / versioned keys | `match-key` + teacher picker; hash mismatch must not silently score against the wrong column. |
| Twins / mixed stack | One capture, one student; Unassigned inbox; matcher never invents. |
| LLM “helpfully” totals | Schema: extract has no `draftScore`. Score module ignores model totals if present. |
| Auto-publish | Approve only. Averages read `approved_score` only (AVG-A1). |
| FERPA | Private bucket; paid adapter; no training; first names in prompts; originals not public; no IEP pages. |
| Expo cannot run OpenCV | Accepted. Do not pretend on-device OMR in v1. |
| Edge cannot run Tesseract | Accepted. Cheap vision extract is the v1 stand-in for OCR. |
| Office / Ask scoring | No new Ask write tool; Edge checks class teacher. |

Architecture.md already forbids a second OCR vendor until the one model is inadequate. KEYGRADE does not reopen Textract.

---

## 7. Phased implementation (staffing later)

Do **not** start a loop from this list. Sequence for when Chuck says send:

| Phase | Work | Loop? |
|---|---|---|
| **K0** | Sign originals for `match-key` / key evaluate (fix QA P2). Thumbs remain on lists. | Small, existing S1 follow-on |
| **K1** | Split evaluate: if key present → extract JSON + `score-key` TS; else today’s gaps. `model_draft.method = key_score`. Confirm UI per item. Approve unchanged. | `kelyra-qa-loop` only after CEO yes |
| **K2** | `type` on key items; MC/numeric inference; residual count in confirm copy. | Same |
| **K3** | Teacher-triggered residual pass for `short`. Still not a grade. | Same |
| **Later** | wasm/CV preprocess, bubble fill %, on-device HTR, YOLO layout, multi-page batch. Separate tickets. | Not this plan |

K0 is a correctness/egress fix even if KEYGRADE is declined. It is still not staffed until Chuck says send.

---

## 8. Compatibility with live rules

- Phone captures; web reviews / Approve.
- Model keys server-side. No `EXPO_PUBLIC_*`.
- Capture may have `student_id` null. Matcher never inserts a student.
- Nothing is a grade until Approve.
- S1: lists thumbs; grade-time originals.
- One AI adapter; cheap default; flagship = Ask / Look-again.
- Do not train on student work.
- Do not replace SIS / official book of record.

---

## 9. Open issues (non-blocking for this note)

1. Exact confirm UX density on phone vs web — Product, not this sketch. Web-first Approve is already MVP (S7 is should-have).
2. Whether blank MC counts as 0 or omit — teacher toggle on confirm; default **omit** so glare does not zero a quiz.
3. Real phone-photo fixtures (glare, twins, two versions) — QA later; research already flagged the gap.
4. `class_teacher_of` vs live `teaches_class` on assignment writes — do not relitigate in KEYGRADE; follow AVG write-wall only for **new** RPCs.

---

## 10. Recommended next action

CEO / CoS review this method.

- If **yes**: CoS ARM-grant a single implementation ticket (K0+K1), then staff `kelyra-qa-loop`. Do not pre-write SQL.
- If **no / later**: park. Unstructured homework drafts stay as they are.
- Do **not** staff `senior-developer` until Chuck says send.
