# ASK-R2: Student Pedagogy Research — Tutor, Don’t Answer

**Date:** 2026-09-10  
**Researcher:** research-feedback  
**Status:** Research only. No code, SQL, or qa-loop.  
**Target:** notes/company/ask-student-pedagogy-research.md (new companion; ASK-R1 cross-linked)  
**SoT decision:** New file for focused pedagogy depth. ASK-R1 updated with pointer + summary. Keeps single source of truth via explicit link.

## Executive Summary (Skeleton)

**CEO question answer:** Yes. Ask can educate on homework without giving the answer by using Socratic questioning, scaffolding, and other techniques. Still refuse numeric/final answer, key, or "here is what to write" for graded work. Practice/open curiosity gets deeper tutor support. 

**Verdict:** Viable and aligned with Kelyra integrity (nothing is a grade until Approve). Prototype Socratic + "next step only" + misconception prompts first. Keep Help Edge separate. Class context helps match depth to assignment.

**Evidence base:** Cited studies + Khanmigo practice (Socratic, no direct answers). Opinion labeled where noted.

## 1. Technique Survey (Skeleton)

Survey of 10 techniques for K-12 homework chat. Each: what it is, K-12 fit, integrity, token/turn cost. Cite literature + products. (Evidence vs opinion noted.)

| Technique | Description | K-12 Homework Fit | Integrity (Graded) | Token Cost Est. | Evidence |
|-----------|-------------|-------------------|--------------------|-----------------|----------|
| Socratic questioning | Guided questions to surface reasoning | High (critical thinking gains) | High (no answer given) | Medium (3-6 turns) | RCTs show large effect on argumentation (η²=.20-.32) [SSRN 5040921, RS.8118546] |
| Worked-example fading | Full example → partial → student solve | Medium (math) | Medium (example not key) | Low | Learning science standard |
| Productive failure | Attempt first, then instruction | High (struggle builds retention) | High (attempt before AI) | Low | [arXiv 2606.26181] |
| Retrieval practice | Recall prompts, spaced | High (retention) | High | Low | Roediger & Karpicke |
| Scaffolding / ZPD | Support in zone of proximal development | High | High (fade support) | Medium | Vygotsky; Khan retention curve |
| Analogical / isomorphic | Similar problem mapping | Medium (Help already has) | High | Low | Standard |
| "Next step only" | One hint, stop | High (prevents dump) | High | Low | Tutor practice |
| Conceptual hint then stop | Big idea hint, no steps | High | High | Low | Common in ethical AI tutors |
| Teach-back | Student explains back | High (metacognition) | High | Medium | Education lit |
| Common-misconception prompts | "Many think X; why not?" | High (error correction) | High | Low | AI tutoring studies |

(Khanmigo implements Socratic + no-answer policy successfully per their site and reviews.)

**Socratic questioning (evidence):** RCTs (122 high-schoolers, 90 10th-graders) show large gains in scientific argumentation (η²=0.20), critical thinking (η²=0.32), self-efficacy, cognitive engagement vs control/ADI. Socratic AI acts as "more knowledgeable other" (Vygotsky). Khanmigo implements exactly this: "never gives the answer... gently guides... discover the answers themselves." Primary school case (18 students) showed 78% autonomy growth in problem-solving via Socratic phases. Opinion: Best core technique for Ask; low risk of answer leak. Token: 4-8 turns typical.

**Worked-example fading & productive failure (evidence):** Standard in learning science; AI version must start with student attempt (productive struggle). arXiv study: unguarded AI (direct answers) caused 17% worse unaided exam scores; guarded (hints only) erased harm. Fits graded integrity perfectly.

**Retrieval practice, scaffolding/ZPD, teach-back (evidence):** Retrieval (Roediger & Karpicke) strongest for retention. ZPD/scaffolding (Khan curve). Teach-back builds metacognition. All low-leak, medium-turn.

**"Next step only", conceptual hint, misconception prompts (practice):** Common in ethical tutors (Khanmigo, Socratic AI systems). Prevents dump; high integrity. Low token.

**Analogical:** Already in Help; reusable.

**Overall cost est. (opinion):** +200-600 tokens/turn for dialogue vs direct answer. Worth it for learning signal.

## 2. Integrity Model (Skeleton)

**Graded homework/quiz/exit ticket:** Ask refuses final answer/key/"write this". May use pedagogy above if question is "how to figure out" not "give answer". Detect via prompt classification (explain-how vs what-is-answer vs photo-of-quiz).

**Practice (non-graded):** Deeper scaffolding allowed, still no submission answer.

**Open curiosity (unrelated to assignment):** Full tutor mode.

**Detection:** Use class/assignment context (from ASK-R1) + intent classifier. Never vision on quiz photo without GAUTH-S1 T1.

**Never:** Numeric answer, worked solution for submission, "here is what to write".

**Detection heuristics (opinion, to be prototyped later):** Intent classifier on first turn ("explain how", "walk me through", "what's the answer", "solve this"). Use assignment context (ASK-R1) to flag graded. Photo-of-quiz → refuse + "use Help Edge or ask teacher" (no vision tutor without GAUTH-S1 T1 call). Class/assignment context allows matching allowed depth (e.g., objectives say "show work" → stricter). 

**Graded vs practice distinction:** Graded = pedagogy only if "how to figure" intent. Practice = full ZPD scaffolding + fading. Open curiosity = unrestricted tutor (still no answer-if-graded-context). Parent role bypasses (co-teacher).

## 3. Ask vs Help Edge (Skeleton)

Overlap: Both can use same pedagogy packs.

Conflict: Help is teacher-controlled ladder (off/hints/steps_after_try/check_work). Ask is student-initiated.

**Recommendation:** Share pedagogy skill pack (runtime load, per ASK-R1 Hermes pattern). Homework-in-Ask stays in Ask (student-tutor profile). Help remains teacher-controlled ladder. No auto-route. Overlap resolved by shared pack; conflict avoided by role + help_mode flag. 

## 4. Fit with ASK-R1 (Expanded)

Class/assignment context (already wired) lets pedagogy match assignment objectives and allowed hint depth without per-assignment answer skills. Per-assignment pedagogy packs (objectives + max-depth + no-key) have integrity benefit but add teacher burden vs existing Help settings — defer to post-GAUTH/Help maturity (opinion: theater for MVP). Per-assignment answer skills remain harmful.

## 4. Fit with ASK-R1 (Skeleton)

Class/assignment context remains useful for tailoring pedagogy depth (e.g., match to objectives, allowed hint level). Per-assignment answer skills still out. Per-assignment pedagogy (objectives, max depth, no-key) has benefit but teacher burden vs Help settings — defer unless Author adds review gates.

## 5. Recommendation (Skeleton)

**One student-Ask tutoring policy:** Tutor persona. Use Socratic + next-step + misconception prompts + teach-back for graded. Full scaffolding for practice. Eval: learning gains (pre/post unaided), not "feels nice". FERPA: stems in logs ok if encrypted/RLS.

**Prototype later:** Socratic core, "next step only", common-misconception.

**What not to build:** Answer giver, per-assignment solver skills, vision quiz tutor without GAUTH call.

**Eval (not "feels nice"):** Pre/post unaided problem solve rate; reduced off-task Ask volume; teacher-reported integrity incidents. A/B class-context + Socratic first. FERPA: stems in logs acceptable if encrypted at rest + RLS (student never sees pack).

**Final policy:** Student Ask = tutor that teaches how to figure it out. Graded work: pedagogy yes, answer no. Matches CEO directive and Kelyra integrity lock. 

## 6. Pointer from ASK-R1

See also: notes/company/ask-student-pedagogy-research.md (this file) for full student-tutor policy, technique table, and Ask-vs-Help mapping.

**Ask-vs-Help:** Separate; share pack.

**CEO answer:** Yes — Ask educates on homework via tutor techniques; still no answer for graded. 

## 6. References & Sources (Added in final patch)

- Min et al. (2025). Socratic AI in K–12 Science Classrooms: RCT evidence, large effects on argumentation/critical thinking. rs.3.rs-8118546/v1.
- SSRN 5040921 (2025). Randomised study of Socratic vs Non-Socratic AI; step-by-step improves accuracy, engagement mixed.
- Avella (2025). Socratic AI Tutoring in Primary School Mathematics (DigComp case study). 78% autonomy in problem-solving.
- Salden et al. (2009). Worked Examples and Tutored Problem Solving: adaptive fading synergistic for transfer (Cognitive Tutor geometry).
- Oreopoulos et al. (NBER 2026 w35621). AI tutoring productive only with mastery/structured struggle; improves post-mistake accuracy.
- Khanmigo reviews (2026): Socratic core, no direct answers, parent/teacher visibility, $4/mo; aligns with "tutor not answerer". Common Sense Media endorsed.
- Vygotsky ZPD / scaffolding lit: AI as "more knowledgeable other"; fade support (multiple reviews 2025-26).
- Roediger & Karpicke: Retrieval practice meta for long-term retention.
- AGENTS.md + ASK-R1: class context, student refuse, Help distinct, no per-assignment solver skills.

**Opinion labels:** All technique costs/ease are researcher estimates (low/med based on prompt length). No vendor contracts or code proposed.

**Final file status:** Research complete per brief. CEO question answered affirmatively with how. One SoT (this file) + pointer in ASK-R1.

(End of document — grown via skeleton + small patches per rule.)