# KEYGRADE Research OS Refresh (KEYGRADE-R2)

**Date:** 2026-09-10  
**Author:** grok-bot-consultant (research only)  
**Ticket:** t_6383db01  
**Status:** Research note only — no implementation, no DESIGN STAMP, no QAS/QE cases, no DITL-UPDATE cards filed.  

**Citations:** R1 (2026-09-03 photo-key-grading-research.md), IQG (2026-09-10 INTENT_QUALITY_GATE.md), DITL_OS (2026-09-10), gauth-kelyra-acceptance.md (2026-09-04), ditl-testplans.md (2026-09-10), existing A1/Q1/S1 plans. No new web fetches; 2026 landscape from R1 still current for this refresh.

## Executive Summary (refresh vs R1)

R1 established the method library for phone-photo key grading: ZipGrade/Gradescope for MC/numeric, OpenCV+Tesseract/YOLO pipelines for local extraction, teacher Approve wall, scripts-first award. This OS refresh maps the same method onto the new 2026-09-10 Company OS (IQG + DITL) without changing the core recommendation.

What still holds from R1/A1:
- Expo + Edge + cheap vision extract + TS `score-key` pure function (no laptop OpenCV CLI).
- v1 = MC + numeric only; short/show-work = needsTeacher residual.
- Nothing is a grade until Approve; matcher never inserts student.
- Originals at grade-time; lists stay thumbs.

New OS lens applied below.

## 1. Method Refresh (2026 sources — no change to v1 cut)

R1 (2026-09-03) landscape remains current as of 2026-09-10. No material public updates to ZipGrade, Gradescope, Canvas SpeedGrader, Remark, or open CV/OCR pipelines in the intervening week. The 2026 IJFMR ESDPAS paper (YOLOv8+OpenCV+Tesseract) and GitHub projects (Score-Matrix, quikscore) still represent the cheap local baseline.

What still holds vs A1 (Expo+Edge, no laptop OpenCV CLI):
- Phone capture → cheap vision extract (OpenCV/Tesseract or equiv on-device) → TS `score-key` pure function of {extracted, key_items}.
- Residual LLM only on ambiguous short/show-work (flagged needsTeacher).
- No Document AI / Textract / cloud OCR vendor for the core path.
- v1 item types unchanged: MC/bubble + numeric/gridded fully supported; short constructed and show-your-work remain teacher-residual.

Cheap vision extract + TS score-key vs residual LLM is the confirmed separation. R1 cost analysis (local free, edge desired, LLM residual only) unchanged. Failure modes (glare, handwriting, skew, mixed papers) and mitigations (adaptive thresh, CLAHE, teacher confirm) remain valid.

No new 2026 benchmarks alter the v1 recommendation.

## 2. IQG Lens Map (hats / entry / lifecycle / multiplicity / reverse / non-goals)

This is research analysis only — does not constitute a DESIGN STAMP or qa-supervisor intent file. Mapped per IQG Phase 1 requirements.

**Hats (roles that must use KEYGRADE):**
- Student: capture via phone (existing).
- Teacher: plan key (web), review/Approve (web), dual-hat teacher-parent.
- Parent: view published grades (existing); dual-hat parent-teacher.
- Office / superintendent: gradebook visibility (read-only post-Approve).
- Dual-hat examples: teacher who is also parent (must see both own class grades and child grades without leakage).

**Entry (chrome per hat):**
- Teacher: Assignment create/edit (key attach), student detail / gradebook Approve flow, capture review desk.
- Parent: Child gradebook / report card.
- No hidden dead-ends; every hat has explicit chrome path.

**Full lifecycle (start / change / finish):**
- Start: Teacher plans assignment + key (photo or items); student captures paper (phone).
- Change: Teacher overrides score pre-Approve; unassign capture; cancel draft.
- Finish: Explicit Approve publishes `approved_score`; family sees only post-Approve cell. Reverse: un-Approve not supported in v1 (non-goal); override via re-Approve.
- Capture may have `student_id` null (matcher guesses only).

**Multiplicity:**
- Twins papers: teacher visual review + confirm step (per R1).
- Two classes / two devices: teacher selects class at plan time; capture batch per device.
- Multi-page: batch confirm + page OCR preview.
- Two keys: assignment supports multiple versions (A1).
- Two devices: phone capture + web review (existing separation).

**Reverse / cancel / already-in-flow:**
- Unassign capture before Approve.
- Override score before Approve.
- Cancel draft (no publish).
- Already-in-flow: capture in desk with key match pre-selected.

**Explicit non-goals (so “not built” is not mistaken for “done”):**
- No auto student insert.
- No full auto short/show-work grading.
- No hardware scanner integration.
- No parent-facing score entry.
- No student creation of keys.
- No second grade book or ZipGrade product.
- No Ask `grade_photo` tool.
- No family SELECT of extract / draft_score / key_items.
- No laptop OpenCV CLI.

Gaps for later IQG stamp: exact chrome strings per hat, full multiplicity matrix for superintendent view. This note surfaces them for qa-supervisor.

## 3. QA Supervisor / QA Engineer work-product map

This section is research analysis only. It does not write the official intent file, testplan, or cases, and does not invent a DESIGN STAMP.

**What QAS must cover in a later intent file + DESIGN STAMP (IQG Phase 1/2):**
- Full hat matrix with exact chrome entry points per role (teacher plan key, parent view, dual-hat leakage prevention).
- Lifecycle completeness: every start/change/finish path with reverse flows (unassign, override, cancel draft) and multiplicity examples (twins, multi-page, two keys, two devices).
- Explicit non-goals list in the stamp note.
- Gauth join law (L3) and family RLS omit rules.
- v1 cut vs desired (MC+numeric only; short/work = needsTeacher).

**What QE prove-out plan/cases would need after implement (IQG Phase 4):**
- Test plan at notes/company/keygrade-testplan.md (after stamp).
- Cases proving: scripts award produces correct `approved_score` only after Approve; extract uses originals at grade-time; family RPCs omit draft columns; matcher never INSERTs student; no Ask grade_photo path.
- Evidence for every P0 in future Q1 acceptance matrix (unit pure-function test for score-key, JWT fixture for class_teacher_of on new scoring RPCs, UI check for Approve wall).
- DITL IMPACT verdict execution (see §4).
- Security must-fix T1–T10 from S1 covered.

Do not treat this note as the stamp or the testplan. CoS will staff qa-supervisor / qa-engineer only after CEO unblocks the parent epic.

## 4. DITL IMPACT forecast

This is a research forecast only — not an official QAS verdict and does not file any DITL-UPDATE cards.

**Likely touched DITL plans if KEYGRADE shipped (per DITL_OS and ditl-testplans.md 2026-09-10):**
- DITL-T-01 (teacher morning capture): update for key-aware capture preview + confirm step.
- DITL-T-02 (afternoon Approve/gradebook): update for Approve wall on keyed assignments, override flow.
- DITL-S-01: student capture flow unchanged (phone photo still primary).
- DITL-DH-01 (dual-hat capture + parent grades): new or update for teacher-parent hat leakage prevention and child grade visibility.
- DITL-P-02 (parent homework/grades): update for post-Approve only visibility of keyed scores.

**Verdict forecast (for QAS to decide later):**
- UPDATE_PLANS likely for T-01, T-02, DH-01, P-02.
- UPDATE_CASES for QE after plans.
- Seed / F-ARTIFACTS: possibly new fixtures in notes/qa-fixtures/ditl/ for keyed capture examples (synthetic only).
- Dual path UI+Ask: Ask remains non-scoring (L3); UI path uses KEYGRADE scripts.

Do not rewrite DITL plans here. CoS files sticky DITL-UPDATE only after QAS verdict on the parent card.

## 5. Join Gauth (KEYGRADE ordering vs Explain/Help)

From gauth-kelyra-acceptance.md (2026-09-04) L3 and L4:
- Award = KEYGRADE scripts (`score-key`).
- Generative Explain/Help never substitutes totals or writes approved_score.
- Ask never writes approved_score; never a Gauth reskin or cheat app (L1).
- KEYGRADE is the keyed award path when assignmentHasKey; Explain reads extract only (not this epic’s score path).
- Research should not reopen Gauth as a cheat app.

This ordering law is unchanged by the OS refresh and must be carried into any future IQG stamp.

## 6. v1 cut (reconciled with A1)

From A1 and Q1:
- Needed (MVP): Printable custom MC/numeric forms + phone photo capture + cheap vision extract (OpenCV/Tesseract or on-device) + TS `score-key` pure function + teacher confirmation modal before Approve. Supports bubble/MC + numeric fully auto; short/show-work flagged needsTeacher. Local-first, integrates with existing Capture → desk → Approve. Originals at grade-time; lists thumbs only.
- Desired (post-v1): YOLO layout detection for arbitrary worksheets, on-device HTR for handwriting, batch multi-page analytics, residual LLM for short answers only on teacher request.
- Non-goals for v1: Full auto short-answer grading, hardware integration, parent-facing scores, student creation of keys, second grade book, Ask grade_photo, family draft leak, laptop OpenCV CLI.

Reconciled with A1: no change to the scripts-first, Approve-wall, matcher-never-inserts-student constraints.

## 7. What changed vs R1/A1/Q1

- Added full IQG lens map (hats, entry, lifecycle, multiplicity, reverse, non-goals) per 2026-09-10 INTENT_QUALITY_GATE.md — new OS requirement for any feature.
- Added QAS work-product map (what later intent + DESIGN STAMP must cover) and QE prove-out needs (testplan/cases after stamp) — new OS.
- Added DITL IMPACT forecast (likely UPDATE_PLANS for T-01/T-02/DH-01/P-02; possible seed/F-ARTIFACTS) — new OS.
- Confirmed Gauth join law (L3) and ordering vs Explain/Help unchanged.
- R1 method library, A1 pipeline, Q1 acceptance plan, and S1 security must-fixes remain the authoritative source of truth; this note is the OS overlay / refresh only. R1 file left intact (optional pointer only at top if desired later).

**End of research note.** All sections grown via patch. No implementation performed. No DESIGN STAMP, no official QAS/QE artifacts, no DITL-UPDATE cards created. Parent epic t_15ae546e remains unblocked.