# Photo Key Grading Research Note (KEYGRADE-R1)

**Date:** 2026-09-03  
**Author:** research-feedback (Kelyra)  
**Status:** Complete for handoff to architect child (t_e0892939)  
**Citations:** Gradescope.com and guides (2026), ZipGrade.com, 2026 IJFMR paper on ESDPAS (YOLOv8+OpenCV+Tesseract), GitHub Score-Matrix / quikscore / Exam-Grading-Assistant projects (OpenCV/Tesseract pipelines), general 2026 searches on Canvas SpeedGrader / Remark OMR. All claims from extracted page content or paper abstracts.

## Executive Summary

Research into 2026 methods for grading photographed student work against an answer key with **minimal LLM use** (CV/OCR primary, LLM only on residuals like ambiguous short answers or handwriting). Context: Phone photo in → key-based score out, teacher Approves. Never auto-inserts student (matcher constraint). Focus on cheap/local-first: OpenCV preprocessing (deskew, glare reduction, adaptive threshold), Tesseract OCR or on-device equivalents, bubble/region detection (contours/YOLO), template match to key, then minimal AI for unmatched cells.

**Key separations by response type:**
- Bubble/MC: High accuracy via OMR-like detection + key match (ZipGrade/Gradescope bubble sheets excel here).
- Numeric/gridded: OCR numbers + exact/fuzzy match to key.
- Short constructed response: OCR + rule-based or low-cost similarity (avoid full LLM).
- Show-your-work math: Region crop + OCR text/numbers, flag for teacher review (hardest for auto).

**Competitors landscape:** Gradescope (web + student mobile photo/PDF submit, AI answer grouping + bubble auto-grade, full rubric), ZipGrade (pure phone app, MC/numeric on-device, $7/yr unlimited after free tier), Canvas SpeedGrader (mostly manual web grading of uploads), Remark (often hardware scanner + OMR software). Phone-only wins for Kelyra constraint (no special hardware).

**Cost analysis:** Local script (OpenCV + Tesseract or PyMuPDF free, runs on teacher laptop/phone via script or Tauri/Flutter wrapper) sufficient for MC/numeric. Edge vision (on-device ML like ML Kit or custom YOLO) for better handwriting robustness without cloud. Full Ask/LLM only for edge short-answer or when teacher escalates. Avoids per-student or high SaaS fees.

**Failure modes (phone photos):** Glare/uneven lighting (mitigate with OpenCV CLAHE/histogram equalization + adaptive thresh), handwriting vs print (Tesseract struggles; flag or use specialized HTR), wrong page/rotation (deskew via Hough or corner detection), mixed student papers (system never auto-mixes; teacher confirms per capture batch). Twins’ papers: teacher visual review + confirm step prevents.

**Teacher UX:** Capture photo(s) → preview deskewed/OCR’d regions with key overlay → teacher confirms/adjusts scores per cell or batch → Approve to grade. Nothing is a grade until explicit teacher Approve. Confirm before any roster match/score write.

**v1 Recommendation (needed vs desired, MVP cut):** 
- Needed: MC/bubble + numeric support via local CV/OCR + template key match (printable custom forms like ZipGrade). Phone photo input with preprocessing pipeline. Teacher confirmation modal before Approve. Flag short/show-work for manual/LLM-residual review only.
- Desired later: YOLO layout detection for arbitrary worksheets, on-device HTR for handwriting, batch multi-page, standards tagging export.
- Non-goals for v1: Full auto short-answer grading, hardware integration, parent-facing scores, student creation of keys.
- Result: Cheap, private, phone-first that feeds into existing capture → desk → Approve flow without new LLM spend.

**Gaps noted:** Limited public 2026 benchmarks on phone-photo glare robustness vs scanned; exact accuracy numbers for mixed handwriting on consumer phones; integration points with Kelyra capture matcher (research only, no code).

## 1. Competitors & 2026 Landscape (phone vs hardware)

### ZipGrade (phone-only MC/numeric leader)
- iOS/Android app turns existing phone into optical scanner; no internet required for grading/scanning.
- Supports 20/50/100 question sheets + custom forms (MC, T/F, matching, gridded-numeric).
- Free 100 papers/month; $6.99/yr unlimited. Sync optional to web for analytics/standards.
- On-device; prints on plain paper; item analysis, CSV export.
- Limitation: Primarily MC/numeric; no short constructed or show-work. [ZipGrade.com extraction]

### Gradescope (full platform, student photo submit + AI assist)
- Supports fixed-template (bubble sheets, worksheets) and variable-length handwritten.
- Bubble sheets: predefine answer key (up to 5 versions), auto-grades MC.
- Student mobile app: photo/PDF submit of paper work (no scanner needed).
- AI-Assisted Answer Grouping for similar handwritten responses (review groups, not full auto grade).
- Instructor grading on web with rubrics, annotations; exports.
- Strong on consistency but requires account/setup; not pure local. Mobile app student-only. [gradescope.com + guides 2026]

### Canvas SpeedGrader / Remark
- Canvas: Web-based manual or basic auto for quizzes; photo uploads graded by eye/rubric. Less CV automation.
- Remark: OMR software often paired with dedicated scanners (hardware cost); strong for high-volume MC but setup heavier than phone. Less phone-photo focus.

### Open-source / CV pipelines (cheap local baseline)
- ESDPAS (2026 paper): YOLOv8 region detection + OpenCV preprocess (grayscale, blur, adaptive thresh, perspective correction) + Tesseract OCR → 96.8% detection, 94.3% OCR, 99.1% scoring on structured exam sheets; <3s/sheet. Handles student ID/rolls/marks. [IJFMR doi]
- Score-Matrix (GitHub): PyTesseract + OpenCV preprocess, question classification (MC vs descriptive), RAG/LLM for ideal answers + rubrics (but can strip to rule-based for minimal LLM). Batch upload, analytics.
- quikscore / Exam-Grading-Assistant: OpenCV + Tesseract for answer sheets; Rust/Tauri or Flask web; supports scanning/scoring MC/numeric; some BERT similarity for short answers.
- Common pattern: Preprocess for phone artifacts → detect bubbles/fields (contours or YOLO) → OCR → key template match → score. Post-process numeric validation.

## 2. Pipeline Options (CV/OCR first, minimal LLM)

1. **Deskew / Crop / Enhance (OpenCV mandatory for phone photos):** Perspective transform, rotation correction (Hough lines or corner find), glare reduction (CLAHE, adaptive histogram), binarization (adaptive threshold). Handles skew, shadows, paper curl.
2. **Print-text OCR (Tesseract or equiv):** For labels, numeric, short print. PSM modes tuned per region. Post-process: numeric range checks, spell/levenshtein for keys.
3. **Bubble / Region Detect:** Contour finding or YOLOv8 fine-tuned on worksheet layouts for MC bubbles, answer boxes, work areas. Template match printed key to student bubbles (fill detection via pixel fill %).
4. **Template Match to Key:** Pre-loaded answer key (JSON or image regions) → exact match for MC/numeric; fuzzy for short.
5. **LLM only on residuals:** Unmatched cells, low-confidence OCR, or short constructed flagged → optional teacher-triggered minimal embed similarity or Ask. Never default LLM on all.
6. **Type-specific:** MC/bubble strongest auto; numeric next; short/show-work → crop regions + OCR text + teacher confirm or residual LLM.

Local script sufficient for 80%+ MC/numeric volume per open-source results.

## 3. Failure Modes & Mitigations (phone photos)

- Glare/poor lighting: OpenCV enhancement + multi-shot capture option.
- Handwriting (vs typed/print): Tesseract limited; flag high-uncertainty or route to teacher/edge HTR model.
- Wrong page / multi-page mix: Visual preview + page number OCR + teacher batch confirm.
- Mixed student papers (twins etc.): Capture is per-photo or per-batch; matcher never auto-assigns student_id (per constraint); teacher explicitly reviews/assigns before Approve.
- Low contrast bubbles: Adaptive detection + confidence threshold → manual override.

## 4. Cost: Local vs Edge vs Full LLM

- **Local script (needed v1):** Free (OpenCV, Tesseract, optional YOLO weights). Runs on teacher device or simple web wrapper. Zero ongoing cost beyond dev time.
- **Edge vision (desired):** On-device models (e.g., TensorFlow Lite / CoreML for detection/OCR) for better robustness without sending photos to cloud. Low latency, privacy.
- **Full Ask/LLM (residual only):** Use only when teacher escalates short-answer or complex math; pay-per-use or cached. Avoids blanket cost.
- Vs competitors: ZipGrade cheap subscription but MC-only; Gradescope higher for full feature set + accounts.

## 5. Teacher UX & Constraints

- Flow: Capture photo (phone) → auto pipeline (deskew/OCR/detect/match) → review UI shows key overlay + proposed scores per item → teacher adjusts/approves per cell or batch → explicit Approve → score becomes grade (never before).
- Confirm step mandatory (matches "Nothing is a grade until the teacher Approves").
- No student PII beyond generic examples in research.
- Teachers do not create classes (existing constraint).
- Output feeds capture → match (null student_id ok) → desk → Approve.

## 6. Recommended v1 Method (needed vs desired)

**Needed (MVP):** Printable custom MC/numeric forms + phone photo capture + OpenCV/Tesseract pipeline + key template match + teacher confirmation modal before Approve. Supports bubble/MC + numeric fully auto; short/show-work flagged. Local-first, no new LLM spend. Integrates with existing photo capture flow.

**Desired (post-v1):** YOLO layout for free-form worksheets, on-device handwriting, batch analytics export, residual LLM for short answers only on teacher request.

**Handoff for architect:** Note provides cited options and v1 cut. Architect can now scope implementation (no code here per constraints). CoS can ARM-grant architect child once note reviewed.

**OPEN ISSUES:** None blocking; ready for architect review. Real-world phone photo test fixtures would help validation (separate from this research).

**Next:** Architect child (t_e0892939) can now produce design spec or plan.md. CoS ARM-grant after this note.