# IQG prove-out: Jordan Turn in after SQL (t_c781dd02)

Stamp: notes/company/student-turnin-submit-pm.md
SQL parent: t_017eec9e (student_submit planned+practice live)
Drive: live screen only. No app edit. No SQL. No kelyra-ui-loop.

Student: ditl-student-s1 (Jordan Lee). Not Colton.
Submission: 8c1e6ed0-f708-454b-b509-9b40ff2c3377
Title: ditl-PhaseB Assign NoUnhide
App: http://127.0.0.1:8081 (expo web this run)

## Verdict

AC-TURNIN-1: REPLAYED pass — web Turn in → student_submit HTTP 204; no Could not submit; row Done Turned in Sep 27.
AC-TURNIN-2: REPLAYED pass — after success Turn in gone; no second write.
AC-TURNIN-3: REPLAYED pass — To Do list no other-student bleed.
MOCKUP: not applicable (drive card, no packet mock-up).
LIVE: web1280 + phone390 viewport. USB/native iPhone not driven this run (prior USB wrong-student; web phone-vp after submit shows submitted detail without Turn in).

## Evidence paths

notes/qa-fixtures/ditl/artifacts-turnin-after-sql/
- run-turnin.mjs, run.log, result.json
- web1280-01-after-signin.png
- web1280-02-detail.png
- web1280-03-after-turnin.png
- web1280-05-todo-list.png
- phone390-01-after-signin.png
- phone390-02-detail.png
- phone390-03-no-turnin-control.png
- phone390-05-todo-list.png
- phone390-recheck-detail.png
- phone390-recheck-done.png
- recheck-phone.mjs, recheck-phone.log

## What the live screen showed

Web 1280: sign-in ditl-student-s1 → /todo listed PhaseB Open. Opened /todo/8c1e6ed0… title PhaseB + Turn in. Tap Turn in. RPC student_submit 204 empty body. Navigated to /todo Done: PhaseB Turned in Sep 27. No Could not submit.

Phone 390 (after web submit): same handle. Detail PhaseB + Math Period 3; no Turn in; no Could not submit. List isolation OK. Done-tab click flaky on narrow VP; submitted state already proven on web Done shot.

## AC lines

AC-TURNIN-1: REPLAYED pass — web submit 204 + Done Turned in; phone-vp already-submitted detail no error banner.
AC-TURNIN-2: REPLAYED pass — control absent after submit; secondWrite=false.
AC-TURNIN-3: REPLAYED pass — no Jamie/Colton/cross-student on list.
