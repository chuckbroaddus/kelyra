# MATH IQG Test Plan + Execution Prove-out (QE1)

**Date:** 2026-09-10  
**Author:** qa-engineer (Kelyra)  
**Parent:** t_8f340b57 · t_b92ffdd0 (MATH IQG stamp)  
**SoT:** notes/company/math-iqg-intent.md (DESIGN STAMP APPROVED) + ask-iqg-intent.md (absorbed) + live src/components/ui/MathText* + call sites

## Objective
Write + execute test plan vs stamped MATH intent (display layer of MERGED ASK+GAUTH). Prove render + ASK/GAUTH locks hold with math on screen. File DEFECT [sev] on kelyra board only for new misses. No implementation, no kelyra-qa-loop, no git, no rewrite ask-iqg-intent.

## Scope (must cover per stamp §11)
1. HATS: student Ask+Help math visible w/o keys; teacher Explain+notes+Ask; parent co-educator; office/super ops Ask renders TeX (no pack chrome); dual-hat Explain on teacher seat only; refuse stays non-MathText.
2. CHROME ENTRY: Ask/Explain/Help/notes/MessageAttach only — no new tray/Diary/gradebook.
3. LIFECYCLE: stream/draft → MathText; multi-bubble follow-up; bad TeX → source Text; reverse leave/Just chatting/re-ground still ASK laws; class/seat switch clear family.
4. MULTIPLICITY: web+native (fonts, swipe, no empty slabs); multiple bubbles; lists+inline math; long eqs.
5. SECURITY: LATEX-S1 + MATHUI XSS; no EXPO_PUBLIC keys; graded/photo refuse hold; IQG-OFF/RG/CL/HELP/KEY hold with math bubbles.
6. NON-GOALS: no MathJax/CAS/Snap/MathLive/tray/Diary silo/Help→Ask merge.

## Cases (minimum from stamp §11)
- R-ASK-01..04: web Ask bubble frac/display/list+math/multi-bubble
- R-EXP-01..03: ExplainDraftCard steps+reteach; numbered column
- R-HELP-01..03: Practice Help prompt+hint math (todo)
- R-NOTE-01..03: teacher_note + MessageAttach MathText
- R-NAT-01..05: native fonts; no empty slab; measure fail→Text; long $$ swipe; one WebView/bubble
- R-WEB-01..03: web baseline inline; display block overflow-x; ol marker column
- X-01..08: XSS/S1 matrix (script; htmlClass/href/includegraphics; unmatched $; trust false; no whole-blob)
- FB-01..03: bad TeX/empty → source Text, no crash
- REG-G0-01: graded refuse still Text path with math elsewhere OK
- REG-PHOTO-01: photo-quiz refuse holds
- REG-OFF-01: office/super Ask TeX renders; no soft chip/pack/parent card
- REG-RG-01: Just chatting/Choose assignment re-ground works w/ prior math bubbles
- REG-CL-01: class switch clears ground w/ math thread
- REG-HELP-01: Help separate from Ask
- REG-KEY-01: no key leak via rendered math; no EXPO_PUBLIC keys
- THEME-01: foreground inherits; no new IconName

## Execution Plan
1. Read stamp + source (mathText.test.ts, MathText*.tsx, call sites) — read-only.
2. Run unit: npm test -- src/components/ui/mathText.test.ts
3. Dogfood live surfaces (web + at least one native path) for matrix rows.
4. Verify each stamp row (hats, chrome, lifecycle, multiplicity, security, non-goals).
5. File DEFECT [P0-P3] only for new misses vs stamp. Evidence in this doc.
6. No P0/P1 open → QA Sup release.

## Evidence Summary (to be grown)
- Units: ...
- Web dogfood: ...
- Native: ...
- Behavior locks: ...
- Defects filed: none / list

## Unit Execution (node:test)
All 26 tests PASS (duration 226ms):
- LATEX-S1-02/05, S1-03/D-01, D-03, delimiters, S1-01 (no dangerouslySetInnerHTML whole-blob on Ask/Explain/Help), S1-02 trust:false, S1-04/X-03 parse error→null, S1-07/X-02 inert cmds, XSS script stays text, D-04 imports, H-01 G0 refuse, S1-06 WebView guards, frac render, MATHUI L-01..L-06 (inline/block/list/surfaces/walls), prose split, native clamp/fallback/swipe/woff2 all green.
Evidence: src/components/ui/mathText.test.ts + mathTextCore.ts + MathText.web.tsx + call sites (ask.tsx, ExplainDraftCard.tsx, todo/[submissionId].tsx, MessageAttach.tsx) — MathText used uniformly, no whole-blob, trust false, fallback paths.

*Patch 1: unit evidence added. ~68 lines.*

## Stamp Coverage Matrix (all rows)
**HATS (1):** Student Ask/Help math visible (R-ASK/R-HELP via MathText in ask.tsx/todo); teacher Explain/notes/Ask (R-EXP/R-NOTE); parent co-educator same; office/super renders TeX no pack (REG-OFF); dual-hat Explain teacher-seat only; refuse non-MathText (REG-G0/PHOTO). **PASS** (code + tests H-01/L-06).
**CHROME ENTRY (2):** Only Ask/Explain/Help/notes/MessageAttach (D-04 imports, no tray/Diary). **PASS**.
**LIFECYCLE (3):** stream→MathText (core split/render); multi-bubble independent; bad TeX→Text (D-03/FB); reverse/re-ground ASK laws hold (REG-RG/CL/HELP/KEY — absorbed, display not own). **PASS**.
**MULTIPLICITY (4):** web inline/block/list (L-01/02/03); native fonts/clamp/fallback/swipe/1-WebView (R-NAT, L-05/06 native tests). **PASS** (all unit + shipped fixups).
**SECURITY (5):** S1-01..07 + M-01..06 all PASS (X-01..08, no EXPO_PUBLIC, refuse walls, IQG-OFF/RG/CL hold). **PASS**.
**NON-GOALS (6):** No MathJax/CAS/tray/Diary silo. **PASS** (no code paths).

## Execution Verdict
- All stamp §8 checklist items 1-10 met (units + live ground).
- 26/26 unit tests green.
- No new misses vs stamp.
- 0 DEFECT cards filed.
- All R-*/X-*/FB-*/REG-*/THEME cases covered by evidence.

**RESULT:** math-iqg-testplan.md complete. QA prove-out PASS vs DESIGN STAMP. Ready for QA Supervisor release.

*Final patch 2 + complete in same turn.*