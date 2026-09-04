# Gauth AI Research Note (2026) — [GAUTH-R1]

**Date:** 2026-09-03  
**Author:** research-feedback (Kelyra)  
**Status:** Complete — cited capability map for PM handoff  
**Constraints honored:** No app code, no SQL, no student PII, research-only. Teachers do not create classes.

## Executive Summary
Gauth AI (rebranded 2024 from Gauthmath, owned by ByteDance via GauthTech Pte. Ltd.) is a leading consumer freemium AI homework helper. Core mechanic: student photographs printed or handwritten homework → OCR + hybrid solver returns step-by-step explanation in seconds. Strong on high-school STEM (algebra/geometry/physics/chemistry), weaker on advanced calculus/proofs/humanities. 100M+ question database + proprietary Gauth GPT. Consumer positioning only — no school/enterprise tier, no FERPA claims, ByteDance data concerns limit school adoption. 

**Kelyra relevance:** Photo-capture UX mirrors Kelyra student phone capture, but inverted purpose (student self-solve vs teacher review/grade). CEO directive: replicate *equivalent capabilities* (fast accurate OCR + explainable solve) inside Kelyra AI functions, never a reskin. Overlaps KEYGRADE (t_15ae546e) on key-based objective grading; Gauth is open-ended LLM solve.

## Feature Inventory (2026)
From official App Store / Play Store + site (gauthmath.com) and 2026 reviews:

- **Photo Homework Solver (Snap & Solve):** Camera-first UX. Auto-crop, OCR printed/handwritten. Supports equations, diagrams, word problems. Returns animated step-by-step + explanations.
- **Step-by-Step Guidance + Explanations:** Numbered reasoning, formulas (LaTeX), multiple methods sometimes shown. Follow-up conversational chat ("why this formula?").
- **Multi-Subject Coverage:** Math (algebra → calculus, stats, matrices), Physics, Chemistry, Biology, Economics, Literature, Writing assistance, Business, Social Science, Others (30+ subjects, 50+ languages claimed).
- **AI Live Tutor (Voice + Whiteboard):** Interactive voice mode with virtual whiteboard for concepts.
- **Smart Study Converter:** Notes/photos/audio/lecture links → personalized quizzes, flashcards, study tools.
- **DeepThinking / Question Bank:** 100M+ solved questions searchable (Premium). History + spaced-repetition style.
- **24/7 Human Tutor Fallback:** Premium add-on (~$19.99/mo extra) for problems AI misses (5-15 min response).
- **Additional Tools:** Calculator, reading simplifier, writing assistant, focus timer, Chrome extension, web/desktop sync.
- **Platforms:** iOS, Android, Web, Desktop. 100M+ downloads, 4.8–4.9★ (1.6–2M reviews).

**Limitations noted in reviews:** Accuracy drops on complex/multi-step word problems, advanced calculus, messy handwriting, non-STEM. Occasional silent errors in intermediate steps. No on-device inference.

## Technical Sketch: How Photo-Solve Works
Hybrid architecture (sourced from multiple 2026 technical reviews):

1. **Capture & OCR:** Phone camera → auto-crop → OCR (text + math notation/symbols). Handles printed near-perfectly; handwriting variable (clean > messy). Server-side only.
2. **Matching Layer:** Query against 100M+ pre-solved question bank. Exact/similar match → instant verified human-curated solution (fast, high accuracy).
3. **Generation Layer:** No match → Gauth GPT (proprietary LLM, plus Gemini/GPT integrations) generates solution from patterns. Slower, ~95% claimed accuracy on standard STEM but lower on edge cases.
4. **Explanation & Interaction:** Rendered steps + LaTeX. Conversational follow-up re-queries model. Animated explanations on app.
5. **Fallback:** Human tutor queue for unsolved.

**On-device vs Cloud:** Entirely cloud/server-side. Requires internet. No local ML models mentioned.

**Answer-key vs Open Solve:** Purely open-ended generative + retrieval. No teacher-provided answer key support. Contrasts KEYGRADE key-based pipeline (OCR → template match → objective scoring, minimal generative AI).

**Accuracy Reality (aggregated 2026 reviews):** 95% marketing claim holds for textbook algebra/geometry/basic physics/chem. Drops sharply on calculus proofs, non-linear ODEs, word-problem intent errors, humanities. Database hits outperform pure generation.

## School / Academic-Integrity / FERPA Posture
- **Consumer-only:** No enterprise/school admin dashboards, SSO, class rosters, or centralized licensing found. Schools may informally recommend the public app; no SLAs or bulk controls.
- **Privacy & Compliance:** ByteDance ownership (TikTok parent) triggers US regulatory scrutiny. No public FERPA, COPPA, or SOC2 attestations in reviews or site. Data collection includes usage; student data routed through Singapore/China-linked entity raises flags for US K-12 districts.
- **Academic Integrity:** Explicitly student self-help tool. Schools increasingly detect/ban Gauth-style apps (plagiarism detectors evolving for AI output). Designed for learning via explanation, but easily abused for copy-paste. No teacher-side visibility or proctoring.
- **Vs Kelyra Philosophy:** Kelyra keeps teachers in control (Approve before grade), uses capture for evidence, never auto-grades without key or teacher oversight. Gauth empowers student bypass.

## Overlap with KEYGRADE (t_15ae546e) & Kelyra Ask/Capture
- **Shared:** Phone photo capture of homework/worksheets. OCR robustness critical for both.
- **Divergent:**
  - KEYGRADE: Key-based (answer key provided by teacher or extracted), objective scoring, minimize hallucination, teacher review/assign flow. Phone capture optional for students.
  - Gauth: Open generative solve, no key required, student-facing, explanation-focused.
- **Kelyra Opportunity (per CEO):** Embed Gauth-like *photo capture speed + step-by-step explainability* into Kelyra AI functions for teacher-side use (e.g., auto-suggest rubric feedback on captured work, or student self-check against approved key). Never replicate full student solve engine.
- **Risk if copied:** Hallucination on open problems, academic integrity backlash, privacy mismatch with school data rules.

## Needed vs Desired by Role (Kelyra Lens)
- **Student:** High desire for instant, accurate, explainable help (Gauth wins here). Needed: reliable on core curriculum, not just gimmick.
- **Teacher:** Low desire for student bypass tool. High need for: accurate capture import, key-matched grading assistance, detection of AI use, parent visibility without enabling cheating.
- **Parent:** Desire for legitimate learning aid; concern over dependency or undetected copying.
- **School/District:** Desire for compliant, auditable tools with FERPA/SOC2. Gauth posture makes it unsuitable for official adoption.

## Capability Map for Kelyra PM Handoff
**Must-have equivalents (inside Kelyra AI, not Gauth clone):**
1. Robust phone-to-server OCR for mixed printed/handwritten student work (leverage for capture import).
2. Fast retrieval + explainable output (step-by-step) when key matches.
3. Clear separation: key-based objective (KEYGRADE) vs any open generative (limited, teacher-gated).
4. Privacy-first: no PII leakage, school-controlled data residency.

**Nice-to-have (future phases):**
- Conversational follow-up on captured work (teacher view only).
- Flashcard/study converter from approved materials.
- Human-tutor style fallback (internal or integrated).

**Do not pursue:** Student-facing open solve, live tutor marketplace, ByteDance-style data model.

## Citations (all 2026 sources)
- Official: gauthmath.com, App Store (id1542571008, 4.8★ 1.5M), Google Play (4.8★ 1.96M).
- Reviews: dupple.com/reviews/gauth-ai (detailed pricing/accuracy), techlinos.com/post/gauth-ai-the-complete-truth-behind-the-1-homework-helper-app (tech architecture, DB+GPT hybrid), nibble-app.com/blog/gauth-app, mobileappdaily.com/product-review/gauthmath-math-problem-solver, rankolist.com/reviews/gauth-ai, softwarecurio.com/blog/gauth-ai-review.
- Additional: flowith.io/blog/gauth-bytedance-personalized-learning-journey (ByteDance/FERPA note), zeroskillai.com/gauth-ai-review (OCR details).

**Handoff:** Note complete. Ready for CoS to ARM-grant product-manager child (t_f9f96bca). No further research needed unless new 2026 sources emerge.

---

*Research performed with web_search + web_extract. No PII captured. All claims backed by cited public sources.*