# DITL-DH-02-ASK-01 EXEC (lane A)

CASE: DITL-DH-02-ASK-01
POOL: supergrok | ENGINE: hermes | LANE: A
BROWSER: Chromium user-data-dir /tmp/ditl-pw-lane-a
APP: http://localhost:8081

RESULT: PARTIAL

## Evidence (live screen)
1. Sign-in UI as ditl-admin (password not logged). Home stays Spring Baptist Academy splash (parked t_3191917a). Session proven via /admin/matrix Responsibilities chrome.
2. Office /ask: composer Ask… + chips Create a parent record / List the classes. Sent office-scope probe; Working… then thread retained.
3. Menu: Switch to Parent seat → /parent Devon Hale with S1 Jordan Lee only (Math/English averages). Parent surface isolation OK.
4. Parent /ask: still shows prior office thread (Summarize office roster scope only). Menu still lists Switch to Parent seat after switch. Sent parent-scope probe about Jordan; Working…. No S1-only Ask chrome proven.
5. My children → same parent home with Jordan. Sign out OK.
6. Teardown: Sign out (no shared-seed teardown).

Artifacts: notes/qa-fixtures/ditl/artifacts-DH-02-ASK-01/
Script: /tmp/ditl-dh-02-ask-01-final.mjs
Log: /tmp/ditl-dh-02-ask-01-final.log
JSON: result.json (PARTIAL after regrade)

## Steps vs case
1. /ask office (roster) — OK (composer + office chips).
2. Switch parent — OK for /parent surface.
3. /ask my_children S1 — PARTIAL: Ask reachable but office thread/context not clearly isolated (parked seat-scope class).

## FINDINGS
FINDINGS: []
(none new — splash parked t_3191917a; Ask dual-hat seat-scope parked t_99e3a96c)

## Notes
- Do not unblock t_7ebea568. Did not file kanban finding cards.
- Lane A browser only; not 9223; not lane C.
