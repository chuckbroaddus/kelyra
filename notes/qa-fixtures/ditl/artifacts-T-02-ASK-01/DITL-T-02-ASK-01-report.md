# DITL-T-02-ASK-01 — Ask cannot silently publish a grade (EXEC 13, t_d3edaa5f)

Run: 2026-09-27 ~9:10 AM CT, Chief of Staff (Grok Bot consultant). Code on main 518ec79. Sandbox only; no live Ask chat was driven, no rows mutated, no teardown needed.

## RESULT: PARTIAL (code-path verified; live Ask not driven) + 1 finding (spec conflict)

Case expected: "Confirm Ask cannot silently publish approved_score without teacher UI Approve (web or Pack B phone)… Ask Approve must fail closed. Ask Approve = non-goal."

## Evidence
- `src/lib/ai/askTools.ts:1739` defines Ask tool `approve_capture` (capability `capture.approve`). It calls `approveCapture()` from `src/lib/gaps/api.ts`, which writes `approved_score` (from score, else the draft score) and the approved gaps. The only refusals are student and parent seats.
- There is no confirm step. `attach_explain_as_note` requires `confirmed: true` (askTools.ts:1398), but `approve_capture` has no such gate, and `askAgent.ts` / `ask.tsx` have no pending-write confirm UI. A model tool call runs the approve directly with the teacher's JWT.
- Policy: `askToolPolicy.ts:71` and `supabase/functions/_shared/askToolPolicy.ts:79` allow it. `capture.approve` is teacher `own` and superintendent/administrator `school`. Test `askToolPolicy.test.ts` "A4 … teacher capture.approve allowed" asserts teacher and administrator are allowed.
- The teacher prompt (`askPrompt.ts:34`) tells the model: "When approve_capture … are listed, you may Approve … via those tools".
- Shipped deliberately in commit f75c61a "[A4] Ask write/admin tools with capability gates (t_4d0247f0)".
- The sources disagree. The case file (this case) says Ask Approve is a non-goal and must fail closed, and `docs/ui-design.md:2277` says "do not auto-Approve from Ask". But plan `ditl-plans/DITL-T-02.md:100` lists "Ask approve parity", and A4 shipped it.
- Grade tools: `list_grade_cells`, `assignment_completion`, and `summarize_class_desk` exist (read-only), so "full grade tools missing" GAP is only partly true.

## FINDINGS
FINDING: Ask approve_capture writes approved_score with no UI Approve tap or confirm (teacher own classes; office school-wide), contrary to case "Ask Approve must fail closed" and ui-design "do not auto-Approve from Ask"; plan says "Ask approve parity", so this needs a product call (remove tool, or add explicit Confirm card); severity P2; case DITL-T-02-ASK-01

## Not done
Live Ask chat as ditl-teacher-a (would consume the S1 draft and is model-nondeterministic). Re-run live after the product call.
