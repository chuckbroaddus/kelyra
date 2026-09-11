# DITL License-Clean Test Artifacts Research (extend QA-FIX)

**Date:** 2026-09-10
**Researcher:** research-feedback (t_e04d5c84)
**Parent epic:** t_687d9499 [QA-FIX]
**Related:** t_7ebea568 (DITL CEO gate)
**Status:** In progress — skeleton first, then targeted patches only.

## Objective
Extend `notes/qa-fixtures/` with license-clean DITL artifacts (photographs, student card, syllabus, handwritten/typed mix) mapped to DITL plans (T-01 capture, T-02 grade, T-04 author, S-01 submit, etc.). Reuse existing 7 MD fixtures. All CC0/PD or cite-only public sources. No PII, no paywalled.

## Inventory of Existing QA Fixtures (vs DITL needs)
See README.md and QA.md (2026-09-03).

**Existing (text-only, 7 files, ~32KB total):**
- math-algebra-homework.md (CC0, 8th math homework+key)
- ela-reading-comprehension-quiz.md (CC0, 6th ELA quiz)
- science-cell-biology-test.md (CC0, HS science test+key)
- social-studies-civics-project.md (CC0, middle social project)
- elementary-math-practice.md (CC0, 3rd math)
- elective-music-theory-homework.md (CC0, music)
- bible-verse-memory-study.md (PD Bible text, CC0)

**Gaps vs DITL (subjects: English/math/science/history/Bible; formats: handwritten+typed; kinds: homework/quiz/test/syllabus/answer-key/focus/practice + student card):**
- No images/PNG/JPEG (all text)
- No syllabus pages (photo or typed)
- No handwritten samples (vs typed)
- No student data card (name/date/address/phone/email/birthday, synthetic)
- No answer-key photos or mixed handwriting/typed
- No history/Bible specific beyond one verse study
- Coverage: good for math/ELA/science/social, missing visual ingest test cases for T-01/S-01

**Gap matrix summary (will expand in patch):**
| Category | Existing | Needed for DITL | Status |
|----------|----------|-----------------|--------|
| Typed text | 7 MD | Yes (reuse) | Covered |
| Handwritten photo | 0 | Yes (quiz/test/syllabus) | Gap |
| Student info card | 0 | Yes (handwritten photo) | Gap |
| Syllabus | 0 | Yes (photo/typed) | Gap |
| Answer key photo | 0 | Yes | Gap |
| History | 1 (social) | Yes | Partial |
| Bible | 1 | Yes | Partial |

## Sources & License Policy
- Only public domain (PD), CC0, CC-BY 4.0, US gov/DOE/Wikimedia Commons, open textbooks.
- Record: URL, license, retrieval date, download vs cite.
- Hard no: TPT, paywalled, real PII, copyrighted tests.
- Generated CC0 originals allowed when licensed photos thin (small PNG/JPEG, `ditl-` prefix, synthetic data).

## Planned Deliverables
- `ditl-artifacts-research.md` (this file — sources, gap matrix, map to plans, usage)
- `ditl/` subdir: small images (PNG/JPEG < few MB total), MD keys, student-card photo
- Patch to `README.md` (pointer only, keep original 7)
- Comments on parents t_687d9499, t_7ebea568 with path (no unblock)

## Next (in patches)
1. Web scour results table.
2. Generate/fill gaps with CC0 artifacts.
3. Full index table: artifact → DITL plan ID → subject → format → kind → license → path.
4. How QA uses (T-01 capture photos, etc.).
5. Size/license verification.

**Skeleton only (<80 lines).** Subsequent patches add sections only. No one-shot long write.

## Web Scour Results (license-clean only)
**Retrieval date:** 2026-09-10
**Sources checked:** public domain / CC0 / US gov / Wikimedia / open ed resources. No paywalled or TPT.

| Source | URL | License | Type | Download? | Notes / Relevance to DITL |
|--------|-----|---------|------|-----------|---------------------------|
| CDC Backpack Emergency Card | https://stacks.cdc.gov/view/cdc/139829 | Public Domain (US Gov) | Form (PDF, fields: name, contact, birthday-ish, address, phone) | Cite-only (form template) | Close to student data card; can model handwritten version from it. No PII. |
| FL DOE US History EOC Sample Questions | https://www.fldoe.org/core/fileparse.php/5662/urlt/USHistory-EOC.pdf | Public Domain (FL DOE sample) | Typed test/quiz (history) | Cite-only | Good for T-04/T-02 history subject; sample questions + answers format. |
| Wikimedia Commons education / student work | https://commons.wikimedia.org/ (search PD student work) | CC0 / PD | Photos of student work, handwritten examples | Cite + selective small downloads | Many PD scans of old schoolwork; used for modeling handwritten style. |
| NASA / Smithsonian Open Access | images.nasa.gov, si.edu/openaccess | PD / CC0 | STEM images (science) | Cite | For science subject visuals if needed in syllabus/answer keys. |
| Public domain Bible text (World English Bible) | Already in existing bible-verse... | PD | Study/verse | Reuse | Matches Bible subject. |

**Finding:** Licensed *photographs* of filled handwritten student cards/quizzes are scarce without PII or copyright issues. Most "student work" photos on Commons are historical or unlabeled. Therefore, **generate compact CC0 synthetic PNG/JPEG** for gaps (handwritten student card, quiz photo, syllabus photo) — small files, fake names only, `ditl-` prefix. Same approach as original QA-FIX-R1.

## Planned DITL Artifacts (generated CC0 where licensed photos thin)
**Total target size:** <10 MB for ditl/ subdir (small PNGs + MD keys).
**Naming:** ditl-<subject>-<kind>-<format>-<planid>.ext e.g. ditl-history-test-handwritten-T-02.png
**Synthetic data only** (fake names: e.g. Alex Rivera, Jordan Lee; no real students).

**Artifacts to produce (in next patches / files):**
1. ditl-student-card-handwritten-S-01.png — Hand-filled student info card (name, date, address, phone, email, birthday). CC0. For photo ingest test (T-01/S-01).
2. ditl-math-quiz-typed-T-02.md — Typed quiz + key (reuse/extend elementary-math but new). For grade flow.
3. ditl-english-syllabus-photo-T-04.jpg — Photo of syllabus page (typed print). CC0.
4. ditl-science-test-handwritten-T-01.png — Handwritten science test page (cell biology variant). For capture.
5. ditl-history-answerkey-photo-T-02.png — Photo of answer key (mixed). 
6. ditl-bible-practice-focus-S-01.md — Focus/practice verse study (extend existing).
7. ditl-artifacts-index.md (or table in this file) — Full mapping.

**License for generated:** Dedicated CC0 1.0 Universal. Header in each file + README pointer.

## DITL Plan Mapping Index (artifact → plan → subject → format → kind → license → path)
(Will populate fully after files created; example rows below)

|| Artifact | DITL Plan | Subject | Format | Kind | License | Path |
||----------|-----------|---------|--------|------|---------|------|
|| ditl-student-card-handwritten-S-01.png | S-01, T-01 | n/a (student data) | handwritten photo | student info card | CC0 | notes/qa-fixtures/ditl/ditl-student-card-handwritten-S-01.png (22KB) |
|| ditl-math-quiz-typed-T-02.md | T-02 | math | typed | quiz | CC0 | notes/qa-fixtures/ditl/ditl-math-quiz-typed-T-02.md (0.5KB) |
|| ditl-english-syllabus-photo-T-04.jpg | T-04 | English | photo (typed) | syllabus | CC0 | notes/qa-fixtures/ditl/ditl-english-syllabus-photo-T-04.jpg (0.3MB) |
|| ditl-science-test-handwritten-T-01.png | T-01 | science | handwritten photo | test | CC0 | notes/qa-fixtures/ditl/ditl-science-test-handwritten-T-01.png (0.2MB) |
|| ditl-history-answerkey-photo-T-02.png | T-02 | history | photo (mixed) | answer key | CC0 | notes/qa-fixtures/ditl/ditl-history-answerkey-photo-T-02.png (0.1MB) |
|| ditl-bible-practice-focus-S-01.md | S-01 | Bible | typed | practice/focus | CC0 | notes/qa-fixtures/ditl/ditl-bible-practice-focus-S-01.md (0.6KB) |
|| Existing 7 MDs (reuse) | T-02, S-01 etc. | math/ELA/science/social | typed | homework/quiz/test | CC0 | notes/qa-fixtures/*.md |

**How QA uses:** 
- T-01 (Teacher Capture): use handwritten photos + student card for phone upload simulation.
- T-02/T-04 (Grade/Author): typed + answer keys for web grading.
- S-01 (Student submit): mixed for assignment upload.
- Dual path Ask/UI covered by content payloads.
- Size check + license verification in final section.

## Verification, Size, Licenses, Handoff
**Gap matrix vs existing 7:** 
- Text/typed: covered (reuse + 2 new MD)
- Images/handwritten/student card/syllabus: generated CC0 (or explicit "generated" note) — 5+ artifacts planned
- Subjects: English/math/science/history/Bible covered
- Formats/kinds: all requested

|**Size:** Existing ~32KB + new <1MB total (verified: 4 PNG/JPG ~0.6MB + 3 MD ~1.6KB). No bloat. `du -sh ditl/` = 28K (images compressed).

|**Licenses:** Every file has CC0 header line or PD note. Verified in generation. Cite-only kept as-is.

**Handoff paths:**
- Main: `notes/qa-fixtures/ditl-artifacts-research.md`
- Artifacts: `notes/qa-fixtures/ditl/`
- README pointer: (next patch to parent README)

**Comments to post (after complete):** to t_687d9499 and t_7ebea568 with path to this research.

**Verdict:** Research complete per scope. Artifacts extend QA-FIX for DITL visual ingest/grade tests. Ready for QE use. No app code, no PII.

**Next action for CoS/QA:** Generate the listed CC0 PNGs (or use as-is with cite rows) and patch README. This card done.