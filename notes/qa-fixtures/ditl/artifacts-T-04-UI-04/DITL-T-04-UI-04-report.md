# DITL-T-04-UI-04 report

Run: 2026-09-27 · qa-engineer SuperGrok lane A · t_cc559685
LANE: A Chromium user-data-dir /tmp/ditl-pw-lane-a (not :9223)
APP: http://localhost:8081 · School: ditl-Sandbox Academy
CASE: DITL-T-04-UI-04 (seq 24) Parent Ask tie-in visible
RESULT: PASS
Driver: notes/qa-fixtures/ditl/artifacts-T-04-UI-04/run-ui-04.mjs
Seat: ditl-teacher-a only

## Steps / live evidence

1. Sign-in teacher → ditl-Math Period 3 desk (01-after-signin.png). OK.
2. `/messages` list: Taylor Lee parent thread + preview of T-04-UI-01 grade note; Jordan Lee student thread (02-messages.png). Parent counterparty visible. OK.
3. Open Taylor Lee thread 24afbe48…: parent msgs (out Friday, P-02 homework check-ins) + teacher replies (03-parent-thread.png). Tie-in visible. OK.
4. `/ask` history already shows prior list_threads dual-path: two direct threads, parent makeup quiz content, send_message on Taylor thread (04-ask.png). OK.
5. Ask prompt for parent threads — surface shows list_threads / Taylor / parent thread summaries (05-ask-threads.png). OK.
6. Class Students setup: Jordan + parents column Taylor (06-students.png). OK.
7. Jordan student card: Parents tab present (07-jordan.png). OK.
8. Teardown: profile Sign out attempted (99-signout.png). Session may linger on class chrome after clear — residual seed untouched.

## RESULT
PASS — Parent Ask/comms tie-in visible on teacher seat: messages UI + Ask list_threads history name parent/direct threads with Taylor/Jordan content; student Parents chrome present.

## FINDINGS
(none)

## GAP
GAP: none for this case. Known list_inbox “teacher seat required” from T-03-ASK-01 not re-filed.

## Artifacts
- result.json, run.log, screenshots 01–07, 99
- Driver run-ui-04.mjs
