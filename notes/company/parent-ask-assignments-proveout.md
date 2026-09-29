# Prove-out: parent Ask assignments

Card: t_1e43161f
Stamp: notes/company/parent-ask-assignments-intent.md
Case: DITL-P-02-ASK-01
Seat: parent ditl-parent-1 (Taylor Lee; Jamie + Jordan)
Surfaces: web + phone attempts
Date: 2026-09-27
Profile: qa-engineer

## Loop packet (not product-complete)

- Workflow: kelyra-ui-loop wf_01a0e4ae95a076f0b48864bb33b0a32b
- Outcome: escalated (host complete is not a pass)
- Summary: UI drive did not run. Missing browser/sim is not a pass.
- qa_repair_cycles: 0
- This prove-out does not treat that loop as product-complete.

## LIVE web (parent seat, existing Ask)

App: http://localhost:8081
Runner: notes/qa-fixtures/ditl/artifacts-proveout-parent-ask-t_1e43161f/
Auth: ditl-parent-1 (fixture password via DITL_PARENT_PASS default)

### AC-PARENT-ASK-1: REPLAYED fail

Bound Jordan on Home → tray Ask → New chat → ask list_my_assignments for Jordan Lee only.
Assistant reply: "I started that work, then stopped. Check People or the class card to confirm what was saved."
No assignment titles in the assistant reply. Invented titles: no.
Failed class lookup wording: not that string; stop-mid-tool instead.
Ask chips on open still show ditl-Math HW S1 / ditl-English HW S1 (UI aid only — not AC pass).
Artifacts: v2-02-ask-jordan.png, v2-03-list-jordan.png, result-web-v2.json, run-web-v2.log

### AC-PARENT-ASK-2: REPLAYED fail

Home bind Jamie → Ask → named Jordan list request.
Same stop-mid-work assistant reply; no Jordan title list in reply.
No evidence of Jamie titles mixed into a successful list (list never succeeded).
Artifact: v2-04-jordan-named-jamie-bound.png

### AC-PARENT-ASK-3: REPLAYED pass

Dedicated redrive run-msg.mjs after list failures.
send_message_to_teacher for Jordan Lee body PROVEOUT-t_1e43161f-msg …
Assistant: Sent. Thread 24afbe48-…, message 6307947f-…. Grades unchanged.
Artifact: v2-msg-only.png, result-msg.json
No Approve/Publish grade chrome on Ask path in these drives.

### Leave Ask

Tray Home after Ask — parent home restored (v2-06-home.png).

## LIVE phone

- iOS Simulator iPhone 17 booted; Expo Go installed.
- simctl openurl localhost:8081/sign-in → screenshot phone-sim-01-signin.png
- Native in-app phone tap of parent Ask list path: not completed this run (metro dropped mid-session; restarted; phone-vp Ask open incomplete — result-phone-vp.json FAIL open).
- Phone surface for AC-1/2/3 list+send: UNPROVEN as native phone taps.
- Do not mark phone AC pass from chips or sim sign-in alone.

## Unit aid (not product pass)

node --test src/lib/ai/askParentAssignments.test.ts → 8/8 pass
(list policy + resolve/shape only)

## MOCKUP

none (stamp: no mock-up)

## Defects

Per card: do not file AC-PARENT-ASK-1/2/3 as engineering defects on this prove-out.
Finding t_df0481c4 left blocked/unassigned. No second engineering loop from this seat.
No DEFECT cards created for these acceptance ids.

## Verdict

PRODUCT: not complete vs stamp.
- AC-PARENT-ASK-1: LIVE fail (web)
- AC-PARENT-ASK-2: LIVE fail (web)
- AC-PARENT-ASK-3: LIVE pass (web)
- Phone full path: incomplete / UNPROVEN native
- Escalated loop: not a pass

## Artifacts root

/Users/chuckbroaddus/projects/kelyra/notes/qa-fixtures/ditl/artifacts-proveout-parent-ask-t_1e43161f/
