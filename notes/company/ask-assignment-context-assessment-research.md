# ASK-R3: Once-per-assignment AI assessment as student Ask context

**Date:** 2026-09-10  
**Researcher:** research-feedback  
**Status:** Research only. No code, SQL, or qa-loop.  
**Target:** notes/company/ask-assignment-context-assessment-research.md

## Executive Summary

**CEO question answer (direct to six questions):**
- Support? Yes.
- Mission benefit? High — consistent tutor context without solver risk; reuses class context (ASK-R1) + tutor policy (ASK-R2).
- Once vs N students? 25-50× cheaper (see cost table); 1 publish vs 25× or 125×.
- AI task? Produce student-safe pedagogy pack (objectives, misconceptions, hint depth, vocab; max 800 tokens). No keys.
- Storage+auto-inject? pedagogy_context on assignments/lesson_packs + student-safe RLS view; Edge ask-assistant attaches via AskLiveContext extension.
- How we know + how we speak? Auto from lesson/assignment navigation (extend chrome); soft assume + tap-to-correct for students; explicit ask for parents.

**Verdict (evidence-based):** Support. Once-at-publish assessment + runtime injection aligns with class context (ASK-R1), tutor-not-solver (ASK-R2), GAUTH-S1 refusal policy. No theater; direct cost/integrity win. Opinion: low risk if student-safe only. No per-assignment answer skills (harmful per ASK-R1).

## 1. Mission Fit

**Benefit vs theater vs harm:** Once-per-assignment brief assessment (objectives, likely misconceptions, allowed hint depth, vocabulary) injected as Ask context is high benefit: enables consistent, assignment-aware tutoring (Socratic/next-step per ASK-R2) without per-student re-assessment cost or variance. Teacher effort once at publish. Aligns with Kelyra mission (custom AI assistance without homework solver). 

**Harm avoided:** Never includes key/worked solutions/"write this" (per GAUTH-S1, ASK-R1 per-assignment answer skills = don’t). Student-safe slice only.

**Theater risk:** Low — scoped strictly to pedagogy context (no answer key). Reuses existing AskLiveContext extension path (ASK-R1). Opinion: direct win for integrity + cost; not theater.

## 2. Cost: Once vs Per Student

**Assumptions (stated):** 1 teacher publish/update per lesson/assignment × 25 students × 5 Ask turns per lesson. Token estimates labeled quote vs estimate. Re-run on teacher edit requires cache invalidation (version flag).

| Approach                  | Tokens (est.)      | Storage     | Re-run on edit     | Total cost (N=25, M=5) | Notes                          |
|---------------------------|--------------------|-------------|--------------------|------------------------|--------------------------------|
| Once-per-assignment       | 6k (quote)        | Small JSON  | Yes (invalidate)   | 1×                     | ~$0.01/lesson (est. Grok)     |
| Per-student assessment    | 150k (est.)       | Per-student | Per edit           | 25×                    | Higher variance, storage bloat|
| Per-Ask-turn assessment   | 750k (est.)       | None        | N/A                | 125×                   | Wasteful, no reuse            |
| No assessment (class only)| 0 extra           | 0           | N/A                | 0                      | Baseline (ASK-R1 live context)|

**Cache invalidation:** Assignment update sets stale flag; re-generate on next publish or teacher confirm. Storage: small per-assignment JSONB (~1-2kB). Opinion: once-per wins decisively on cost and consistency.

## 3. AI Task at Publish

**What the AI is tasked to produce (schema sketch, student-safe only):** 
- assignment_id / lesson_id (link)
- objectives: string[] (what students should learn)
- likely_misconceptions: string[] (common errors to probe)
- allowed_hint_depth: "next-step" | "conceptual" | "scaffolding" (maps to ASK-R2 techniques)
- vocabulary: string[] (key terms to use/avoid)
- max_tokens: 800 (hard cap for injection)

**Teacher-only fields (never in student Ask):** internal_notes, draft_key_stems (for teacher review only).

**Teacher review/override:** Auto-generate at publish/update; teacher sees preview + edit/confirm-before-use toggle (or always-on after first confirm). Matches "Nothing is a grade until Approve" spirit.

**Never:** key, worked solutions, "write this", explain_draft content. (Per ASK-R1, ASK-R2, GAUTH-S1.)

## 4. Storage / Injection

**Where it lives:** New `pedagogy_context` JSONB column (or separate small table) on `assignments` / lesson packs (not on captures/explain_draft — that remains teacher-only per ASK-R1). 

**RLS:** Student Ask runtime uses a **student-safe view** (excludes teacher-only fields; no keys). Parent co-teacher sees full but bypass per GAUTH. Encrypted at rest.

**Injection:** Edge `ask-assistant` (askPrompt.ts pattern) attaches the safe slice to AskLiveContext when assignmentId present. Small token overhead (~300-600/turn, cacheable).

**FERPA:** Stems/vocab in pack acceptable if RLS + encryption; student never sees raw pack or keys. (Opinion: compliant.)

## 5. Knowing the Student is on That Work

**Automatic detection (extend ASK-R1):** 
- Lesson player, assignment page, practice tray, notification deep links set assignmentId in chrome + AskLiveContext.
- Screen/pathname + classId already wired; add assignmentId pass-through.

**Must ask / handle edge cases:** 
- Parent dual-hat / child switcher (may lag class).
- Twins (fail closed per GAUTH-S1).
- Two live assignments (explicit prompt: "Which assignment?").
- Tray-open / direct /ask without context (fall back to class only or ask).

**Dual-hat / parent vs student:** Student = auto + soft ground. Parent = explicit confirm (co-teacher role).

## 6. UX of Grounding

**Comparison (integrity-critical — wrong assignment context as bad as solver):**
- Explicit Ask: “Are you working on your FoM 1.2 assignment?” (clear but friction)
- Hard Assume: “I’m assuming you’re on FoM 1.2. To help, here’s a question…” (risky if wrong)
- Soft Assume (recommended for students): “Looks like FoM 1.2 — if that’s wrong, tap here to switch.” (low friction, correctable)

**Recommendation:** 
- Student: Soft assume + tap-to-correct (balances UX/integrity; matches class context from ASK-R1).
- Parent: Explicit ask (co-teacher bypass per GAUTH; higher stakes).

**Model talk example (student):** “I’m assuming you’re working on FoM 1.2 based on your current lesson. If that’s not right, tap here. What part are you stuck on?”

Wrong-context risk mitigated by easy correction + classId guard.

## 7. Constraints (No Re-Open)

- Do **not** recommend storing keys in the student-visible pack.
- Do **not** collapse Help into Ask.
- Do **not** reopen parent co-teacher (GAUTH-S1).
- Cite ASK-R1 (class/seat/screen in AskLiveContext; per-assignment answer skills = don’t), ASK-R2 (student Ask = tutor, don’t answer on graded), GAUTH-S1 (refusals, twins fail closed), live `askPrompt.ts` (AskLiveContext wiring).

## References & Sources

- ASK-R1: notes/company/ask-agentic-skills-research.md (class context, per-assignment skills verdict)
- ASK-R2: notes/company/ask-student-pedagogy-research.md (tutor techniques, graded refuse)
- GAUTH-S1: notes/company/gauth-research.md (refusal policy, parent co-teacher, twins)
- live `askPrompt.ts` (AskLiveContext type and buildAskInstructions)
- No external tutoring literature cited (opinion-based synthesis of prior R1/R2; context-caching benefit labeled as standard practice)

**Recommended Next Action:** research-feedback completes brief. CoS → CEO. PM only if we add publish-time assessment feature.