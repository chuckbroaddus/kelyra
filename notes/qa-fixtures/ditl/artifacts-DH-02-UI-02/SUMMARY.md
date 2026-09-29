# DITL-DH-02-UI-02 EXEC (lane A)

CASE: DITL-DH-02-UI-02
POOL: supergrok | ENGINE: hermes | LANE: A
BROWSER: Chromium user-data-dir /tmp/ditl-pw-lane-a (not 9222/9223)
APP: http://localhost:8081

RESULT: PARTIAL

## Evidence (live screen)
1. Sign-in UI as ditl-admin (password not logged). After auth Home = Spring Baptist Academy splash (parked t_3191917a, not refiled).
2. /admin/matrix loaded office Responsibilities chrome (session OK).
3. ONE direct bio route (card stop rule):  
   `/class/d1715000-0000-4000-a000-000000000301/student/2bcee429-11ce-4f84-b2de-9aab349f03cc`  
   → Jordan Lee Details tab with Name, Preferred name (Add preferred name), Birthday Mar 15 2012, Phone (512) 555-0142, Email, Address, Notes. NOT splash. NOT unmatched.
4. Office bio *write* not completed this run: Edit sheet / Add preferred name fill+Save did not stick (EDIT_OPEN false, FILLED false, marker absent). Existing baseline bio fields were already visible on office Details.
5. Switch seat via menu null; direct `/parent` as same session: Devon Hale parent home with S1 Jordan Lee only (Math/English averages). Parent sees baseline student surface; no new office marker (write never landed).
6. Teardown: session clear; final sign-out hit ERR_CONNECTION_REFUSED (app dropped mid-teardown).
7. Retry after first run: HEALTH 0 — localhost:8081 refused. Stopped per card (do not hunt other ports). No DB/API metadata edit.

Artifacts: notes/qa-fixtures/ditl/artifacts-DH-02-UI-02/
Scripts: run-ui-02.mjs, /tmp/ditl-dh-02-ui-02-retry.mjs
Logs: run.log, run-retry.log
JSON: result.json (PARTIAL), result-retry.json (FAIL app down)

## Steps vs case
1. Office bio attach S1 — PARTIAL: Details reachable + baseline fields readable; new preferred_name write not completed in UI.
2. Switch — PARTIAL: /parent route worked (seat menu switch null).
3. Parent view S1 — OK for presence of Jordan; cannot prove “updates visible” without successful office write.

## FINDINGS
FINDINGS: []
(none new — Home splash parked t_3191917a; app crash at teardown not filed as product finding without stable repro beyond this lane)

## Notes
- Did not clear pickup ban; did not file splash again; did not use lane C browser; did not edit via DB/API.
- Do not unblock t_7ebea568.
