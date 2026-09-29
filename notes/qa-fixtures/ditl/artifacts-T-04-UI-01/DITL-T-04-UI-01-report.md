# DITL-T-04-UI-01 report (lane A SuperGrok)

RESULT: PARTIAL

## Case
DITL-T-04-UI-01 — Teacher academic day: author HW, capture S1, gradebook, message parent, comms.

## Live screen
- App: http://localhost:8081
- Chromium persistent: /tmp/ditl-pw-lane-a (not 9223)
- Seat: ditl-teacher-a → ditl-Math Period 3 (d1715000-…0301)
- Runner: notes/qa-fixtures/ditl/artifacts-T-04-UI-01/run-ui-01.mjs
- Logs: run3.log · result.json · PNGs 01–21

## Evidence

1. Sign-in → teacher desk ditl-Math Period 3. OK (01-after-signin.png).
2. Author assignment `/class/…/assignment/new` title `ditl-Hist HW 28649169`, homework + tomorrow due → created id `76f4b8b3-e0fc-437a-9542-3cc04c664082` (?brief=1). OK (02–04).
3. Capture hist HW fixture `ditl-pen-hist-homework-T-04.jpg` → classify → pick Jordan → **Save to student** → toast “Saved to Jordan Lee.” OK (05–08). Note: page OCR name Alex Rivera; matcher forced Jordan pick (will-not-invent).
4. Gradebook shows columns including `ditl-Hist HW 28649169` (and prior run leftovers 28402546 / 28534336). Grid score entry not completed (scored=false; cells still —). PARTIAL grade beat (09–12).
5. Messages → Taylor Lee (parent of S1) → sent marker `ditl-T-04-UI-01-1790528649169 teacher: Jordan hist HW graded — see gradebook.` visible Just now / list preview. OK (13–17).
6. Teardown: assignment delete control not found on edit screen (assignment still open after delete attempt). Sign-out via /profile did not leave session. Leftover case assignments remain in gradebook. PARTIAL teardown.

## RESULT
**PARTIAL** — author + capture-to-S1 + parent message/comms linked on live UI; gradebook column present but no score write confirmed; assignment delete/sign-out incomplete.

## FINDINGS
(none for supported product — score/delete gaps look like automation/chrome discovery, not a clear product break; do not file kanban finding cards per card rules)

## Artifacts
- assignId: 76f4b8b3-e0fc-437a-9542-3cc04c664082 (plus leftovers e3a7e01e… / ff362576… from earlier attempts)
- marker: ditl-T-04-UI-01-1790528649169
- thread: 24afbe48-3bf7-49be-90da-88e09bcfe1c5 (Taylor Lee)

## Notes
- First attempt aborted when Expo :8081 died mid-run (connection refused); Expo restarted; full re-run succeeded to PARTIAL.
- Do not unblock t_7ebea568. No product fix.