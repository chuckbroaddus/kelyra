# DITL-S-03-ASK-01 report

RESULT: PASS
Lane: C · Chromium user-data-dir /tmp/ditl-pw-lane-c
App: http://localhost:8081
User: ditl-student-s1 (Jordan Lee) · Engine: hermes SuperGrok
School: ditl-Sandbox Academy

## Evidence

1. Sign-in ditl-student-s1 → /todo PhaseB assign. Shot: 01-after-signin.png
2. /ask surface. Shot: 02-ask-home.png
3. Ask list_messages: tools list_threads + list_thread_messages; one direct thread; last DITL-S-03-UI-01 marker; grades unchanged; no Jamie cross. Shot: 03-list-messages.png
4. Ask list_focus: model used list_my_practice; focus ditl-bulk-jordan-place-value on S1 practice only. Shot: 04-list-focus.png
5. Ask send_message to Avery Quinn: RPC send_message 200 id 47f09edb-… thread 4ef24cae-… body probe; Ask “ok true… Grades unchanged.” Shot: 05-send-message.png
6. Dual path /messages: Avery Quinn “You: DITL-S-03-ASK-01 student msg probe”. Shot: 06-messages-dual.png
7. Sign out → /sign-in. Shot: 07-signout.png

Note: Expo :8081 was down mid-first attempt (CONNECTION_REFUSED); restarted lane-c expo and re-ran full case to PASS.

## FINDINGS

none

## Artifacts

notes/qa-fixtures/ditl/artifacts-S-03-ASK-01/ (01-07 png, result.json, run.log, run-ask-01.mjs)
