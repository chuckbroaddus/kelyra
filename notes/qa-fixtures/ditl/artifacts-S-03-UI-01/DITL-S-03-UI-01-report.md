# DITL-S-03-UI-01 — Student messages + focus (EXEC 42)

RESULT: PASS
Lane: C · Chromium user-data-dir /tmp/ditl-pw-lane-c
App: http://localhost:8081 · School: ditl-Sandbox Academy
User: ditl-student-s1 (Jordan Lee) · Engine: hermes SuperGrok
Artifacts: notes/qa-fixtures/ditl/artifacts-S-03-UI-01/

## Evidence (live)

1. Sign-in ditl-student-s1 → /todo (Math+English chips, PhaseB assign). Shot: 01-after-signin.png
2. /messages empty tray “No messages yet” (school feeds chips only). Shot: 02-messages-tray.png
3. /messages/new → Staff Avery Quinn @ditl-teacher-a → Chat with Avery Quinn → thread `4ef24cae-51fd-463c-8e56-46fe4bf0ac6b`. Shots: 02b-new-message.png, 03-thread.png
4. Composer send marker `DITL-S-03-UI-01 laneC 1790527713609` → You · Just now. Shot: 04-after-reply.png
5. /todo focus/work list: ditl-PhaseB Assign NoUnhide Due Sep 19 (plan maps focus → assigned practice/to-do; no separate Focus chrome label). Shot: 05-todo-focus.png
6. Opened PhaseB todo row; grades own-only Jordan English 88 Math 92 + PhaseB row (no gradesFocus skill banner). Shots: 06-focus-item.png, 06b-grades-focus.png
7. /student/people classmates Jamie/Morgan/Riley/Samira roster only — no score bleed. Shot: 07-people.png
8. Teardown localStorage clear → /sign-in. Shot: 08-signout.png

## FINDINGS
(none)

## Teardown
Sign-in after localStorage clear. Case message left on Avery Quinn thread (plan residual OK; no shared seed delete).
