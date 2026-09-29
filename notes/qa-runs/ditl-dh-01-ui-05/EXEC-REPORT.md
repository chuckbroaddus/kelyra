# DITL-DH-01-UI-05 EXEC REPORT

CASE: DITL-DH-01-UI-05 (seq 49)
LANE: A / SuperGrok / Hermes
ENGINE: hermes
BROWSER: Chromium user-data-dir /tmp/ditl-pw-lane-a
APP: http://localhost:8081
ACCOUNT: ditl-teacher-a (dual-hat teacher+parent)
WHEN: 2026-09-27

## RESULT

RESULT: PASS

## Evidence

Live Chromium lane A against http://localhost:8081 (curl 200).

Run 1 (`/tmp/ditl-dh-01-ui-05-lane-a.mjs` → `/tmp/ditl-dh-01-ui-05-out/`):
- Sign-in ditl-teacher-a → Teach seat C-MATH Period 3; tray Desk·Needs·Diary·Calendar·Kelyra.
- Altitude Switch to Parent seat → `/parent`; tray Home·Ride·Calendar·Ask; Morgan Patel + Avery Quinn parent home; approveHits=[].
- parent_scan: hasApproveText=false, hasDraft=false, hasExtract=false, hasMorgan=true, approveBtns=[].
- Direct URL probes `/capture` `/needs` `/inbox` etc. after full navigation left parent seat (teacher tray restored) — not the altitude path; approve still absent. Known leftover Needs Attention drafts not treated as new finding.
- approve_click_attempt clicked=false.

Run 2 clean SPA path (`/tmp/ditl-dh-01-ui-05-b.mjs` → `/tmp/ditl-dh-01-ui-05-out2/`):
- Switch to Parent seat held: tray Home·Ride·Calendar·Ask; approve=[].
- capture_click=null (no Capture chrome on Parent seat).
- needs_click=null (no Needs tab on Parent tray).
- approve_hunt found=false; no Approve this capture control.
- drawer on Parent: Teach / My children / Sign out; no Approve row.
- Switch to Teach seat → C-MATH teacher tray again.
- Sign out → `/` Sign in chrome.

Case expected met: Parent seat cannot Approve; draft/extract/Approve chrome absent; attempts fail closed (no control).

Screens: `/tmp/ditl-dh-01-ui-05-out2/02-parent.png`, `05-approve.png`, `06-teach.png`, `99.png`; run1 `/tmp/ditl-dh-01-ui-05-out/02-parent-seat.png`.

## FINDINGS

(none)

## Teardown

Returned Teach seat then Sign out to Sign-in landing (run2 after_so url `/`, tray Sign in).
