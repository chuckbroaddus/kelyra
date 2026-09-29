# DITL-T-04-UI-03 report

Run: 2026-09-27 · qa-engineer SuperGrok lane A · t_7ef315af
LANE: A Chromium user-data-dir /tmp/ditl-pw-lane-a (not :9223)
APP: http://localhost:8081 · School: ditl-Sandbox Academy
CASE: DITL-T-04-UI-03 (seq 23) math answer-key capture + ingest
RESULT: PASS
Driver: notes/qa-fixtures/ditl/artifacts-T-04-UI-03/run-ui-03.mjs
Fixture: ditl-mixed-math-key-T-04.jpg (F-ART-KEY-MATH-MIXED)
Seat: ditl-teacher-a only

## Steps / live evidence

1. Sign-in teacher → desk ditl-Math Period 3 (01-after-signin.png). OK.
2. `/capture` drop well (02-capture.png). OK.
3. Library upload key photo → Remove page (03-after-upload.png). upload=library. OK.
4. Note + Ask AI → classify-capture hit; UI: "This will be an answer key for an assignment" + assignment picker (05-after-classify.png). OK.
5. Picked ditl-Math HW S1 (06). OK.
6. Attach key to assignment → navigated to assignment/610c0360-03db-4b2c-a555-9f0c1b293120; analyze-answer-key hit; ANSWER KEY Photo with extracted stems 1..n (08-after-confirm.png). Ingest success. OK.
7. Teardown sign-out → /sign-in (99-signout.png). OK.
8. Shared seed left intact (no delete of hist leftovers per card).

## RESULT
PASS — key photo path classified as answer_key, attached to ditl-Math HW S1, analyze-answer-key ran, photo key items shown on assignment editor.

## FINDINGS
(none)

## Artifacts
- result.json hits: classify=true analyzeKey=true
- run2.log, screenshots 01–10, 99
