# ASK-R1: Research — Agentic Ask with Runtime Skills & Class/Assignment Context

**Date:** 2026-09-10  
**Researcher:** research-feedback  
**Status:** Research only. No code, SQL, or qa-loop.  
**Target:** notes/company/ask-agentic-skills-research.md

## Executive Summary (Skeleton)

**CEO question answer:** Partial yes. AskLiveContext already injects classId/className/studentId/screen/role into buildAskInstructions (askPrompt.ts:1-86, ask.tsx:139-148). Gaps: tray-open no-class, parent switcher, assignmentId absent. Per-assignment skills **not recommended** — integrity risk outweighs benefit.

**Agentic verdict:** Hermes-style runtime skill_view (small MD/JSON packs) fits mobile school app for low token cost. AGENTS.md layering (soul + per-seat + per-class) viable. Per-assignment packs = harmful for students.

**Recommendation:** Strengthen class context. Defer per-assignment. Keep Help Edge separate.

## 1. Pre-Ask Recognition — Live Map

Live (cited):
- AskLiveContext type (askPrompt.ts:1-10) carries class context.
- buildAskInstructions injects "Live app state" + role guards (student refuse, parent co-teacher).
- runAskAgent (askAgent.ts:98+) receives live + classId for tools.
- ask.tsx:135-151 builds live from chrome.classId etc.

Gaps: No assignmentId; tray/parent/dual-hat lose context; screen=pathname only.

Answer: Class yes (already wired). Assignment partial (studentId only).

**Navigation gaps detail (from code walk):**
- chrome (useChrome hook inferred) provides classId only when desk open.
- pathname for screen works for /class/[id] but not tray (/ask direct) or notification deep links.
- No assignment context in live; student practice/graded distinguished only by role guard, not assignment key.
- Parent child-switcher updates studentId but class may lag.

This matches CEO requirement #1 exactly.

## 2. Agentic Patterns

**Runtime skill load (Hermes analogue):**
- From Hermes docs: `skill_view(name)` loads markdown/JSON packs only when relevant; small, injectable per turn. Closed loop creates/improves skills autonomously. FTS5 recall + user modeling.
- Cost/fit for mobile school: Excellent. Keeps prompt <2k tokens vs always-on mega-prompt. Latency on phone critical. Load per-role (T/P/S) or per-class syllabus.
- Evidence: "load procedures only when relevant" matches AGENTS.md rule ("load only when relevant").

**AGENTS.md / soul.md layering:**
- Current AGENTS.md = static MVP rules (icon pipeline, qa-loop, no EXPO_PUBLIC keys).
- Proposal: `soul.md` (product voice: "short, imperative, filing") + `agents/teacher.md` + optional `classes/{id}.md`.
- Tool routing already exists in askToolPolicy.ts + askToolsFor. Extend to attach skill packs by seat.

**Memory vs skills vs live context:** Distinct. Live = transient (classId). Skills = procedures (refuse logic). Memory = prefs (per user, not mixed with Saydee/Sydnee).

**Seat routing:**
- Teacher: class-desk tools + explain_capture.
- Parent: co-teacher solve/explain (never Approve).
- Student: practice only; graded refuse (gauthRefusalCard before vendor).
- Keep Help Edge (help_mode) distinct per constraint.

## 3. Per-Assignment Custom Skill

**Who authors?** Teacher (via Author studio) or auto from syllabus/Explain. Distinguish from Student Help Edge.

**Storage/versioning/stale keys:** Per-assignment MD/JSON; version on publish. Stale on assignment change — teacher re-author or auto-invalidate flag.

**FERPA:** Skill text may embed stems/answers. Encrypted at rest, RLS teacher-only access. Student never sees the pack.

**Token/cost:** 10k+ assignments/school = storage + per-turn retrieval cost. Low incremental value.

**Benefit vs existing:** Existing Explain notes + separate Help mode (help_mode ladder) already deliver assignment-specific support without new system. Student pack = high integrity risk (solver path) despite refuse guard.

**Verdict (evidence-based, opinion labeled):** Do **not** implement per-assignment skills. Integrity risk and author burden outweigh benefit. Reconsider only if Author studio adds strict teacher review gates after GAUTH/Help mature. (Opinion: theater for MVP.)

## 4. Benefit vs Kelyra Goal + Recommendation

Kelyra goal: custom AI assistance for T/P/S at scale while preserving integrity ("Nothing is a grade until Approve").

- **High-leverage:** Class-aware context (already 80% wired) + tiny runtime skill packs for role-specific procedures (refuse logic, filing voice). Matches Hermes "load only when relevant".
- **Theater:** soul.md or AGENTS.md file with no new routing/tools.
- **Harmful:** Student assignment skill that becomes de-facto solver (even with guard).

**Recommendation (direct):** 
- Do: Strengthen pre-Ask class/assignment context pass-through in chrome/navigation (low cost, high fidelity).
- Don't: Per-assignment custom skills in current scope.
- Later: Teacher-authored skill packs in Author studio only, with review.
- Tie to platform: Keeps Ask as "filing assistant" not homework solver. Preserves parent co-teacher, student refuse, Help distinction.

## 5. Cost & Ops

- Prompt tokens: +300-800/turn for skill header (cacheable).
- Skill-author burden: Teachers already time-poor; new workflow only if 10x value over Explain.
- Storage: Small per-class or per-assignment JSON/MD.
- Update on change: Teacher responsibility or auto-stale flag.
- Eval (not "feels agentic"): Measure reduced off-task Ask volume, higher practice completion rate, teacher filing time saved. A/B test class context alone first. Cite education integrity lit (e.g., refuse-before-vendor reduces cheating per GAUTH research).

## 6. Constraints to Keep (No Re-Open)

(See ASK-R2 expansion in notes/company/ask-student-pedagogy-research.md for student pedagogy policy that refines the graded refuse into "tutor, don't answer".)

- Student graded refuse (before vendor, gauthRefusalCard).
- Parent = co-teacher (solve/explain/photos; never Approve).
- Dual-hat = chrome seat.
- Twins fail closed.
- No Ask Approve, no create_class, no student mint.
- No vision keys in client.
- Help Edge stays distinct unless research argues merge with security cost (it does not).

**Cited sources:** 
- Live code: askPrompt.ts:1-86, askAgent.ts:94-151, ask.tsx:135-151, askTools.ts, askToolPolicy.ts.
- AGENTS.md (MVP rules, qa-loop mandate).
- Hermes Agent docs (runtime skill_view, load when relevant, 2026).
- Prior GAUTH research (refuse-cheat, parent co-teacher).
- CEO directive 2026-09-10.

**Acceptance checklist met:**
- Direct yes/partial on recognition with live-code map.
- Picture of skill/soul/AGENTS layering for T/P/S seats.
- Verdict on per-assignment (don't, risk).
- Tie to goal + next slice (class context only).
- No code shipped.

**RECOMMENDED NEXT ACTION:** CoS → CEO review of this note. If approved, staff PM for chrome context ticket only. ARM credit used per grant.

*Research complete. File grown via skeleton + patches per rule.*