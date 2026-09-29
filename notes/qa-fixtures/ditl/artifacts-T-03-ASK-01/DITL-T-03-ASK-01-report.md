# DITL-T-03-ASK-01 report

RESULT: PASS

Case: DITL-T-03-ASK-01
Lane: A SuperGrok / Hermes
Browser: Chromium persistent /tmp/ditl-pw-lane-a (not :9223)
App: http://localhost:8081
Seat: ditl-teacher-a (teacher only)
Marker: ditl-T-03-ASK-01-1790525823965

## Evidence (live)

- Sign-in → class desk ditl-Math Period 3 (shot 01)
- UI /messages: Taylor Lee thread present (shot 02)
- /ask surface open (shot 03)
- Ask list_threads + my_unread: toolCalls list_threads; summary 2 direct threads (shot 04–05)
- Ask send_message: RPC send_message 200 id 37e20504… thread 24afbe48; Ask text “Sent on existing thread”
- Dual path UI: messages list preview + thread shows marker Just now (shots 06–07)
- /inbox UI Needs chips + rows (shot 09)
- Sign-out /sign-in (shot 10)

Driver: notes/qa-fixtures/ditl/artifacts-T-03-ASK-01/run-ask-01.mjs
result.json: same dir

## FINDINGS

FINDING: Ask list_inbox returned “teacher seat required” while UI /inbox works on same teacher session; severity P2; case DITL-T-03-ASK-01

(Jacquee Broaddus on tray already filed — not refiled.)

## GAP

GAP: message delete via Ask residual OK per plan — not a finding

## Teardown

Session clear + /sign-in only. Did not delete shared seed threads.
