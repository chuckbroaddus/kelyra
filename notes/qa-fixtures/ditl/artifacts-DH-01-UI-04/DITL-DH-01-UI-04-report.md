# DITL-DH-01-UI-04 report

RESULT: PASS

LANE: A · Chromium user-data-dir /tmp/ditl-pw-lane-a (not 9223)
ACCOUNT: ditl-teacher-a (dual-hat Teach+Parent) · school ditl-Sandbox Academy
APP: http://localhost:8081
ENGINE: hermes · pool supergrok

## Verdict
PASS on live screen for chrome altitude tray + My children deep-link. FINDINGS none.

## Steps (live)
1. Sign-in OK → class ditl-Math Period 3.
2. Teach tray (aria tabs): Desk · Needs Attention · Diary · Calendar · Kelyra — no Home/Ride.
3. Open menu → Switch to Parent seat → /parent Morgan Patel only; tray Home · Ride · Calendar · Ask (no Desk/Capture/Needs).
4. Switch to Teach seat → staff tray Desk · Needs · Diary · Calendar · Kelyra again.
5. Parent seat second toggle — same Home · Ride · Ask isolation.
6. Teach seat second return — staff tray again. Two full Teach↔Parent cycles OK.
7. Open menu → My children → /parent (Morgan) while tray stayed staff (Desk · Needs Attention…, no Ride under staff chrome).
8. No Approve / Pack B on that deep-link.
9. No concatenated Teach+Parent trays.
10. Teardown: after step 7 still Teach chrome; goto / then sign-in hit ERR_CONNECTION_REFUSED (app died mid-teardown). Case chrome criteria already met. Not a product FINDING.

## Evidence paths
notes/qa-fixtures/ditl/artifacts-DH-01-UI-04/ (01..08 png, result.json, run.log, run-ui-04.mjs)

## FINDINGS
(none)

## Notes
- Capture tab not always labeled in bottom band on class route (Open Capture is header); staff identity via Desk/Needs.
- Parent tray also shows Calendar alongside Home·Ride·Ask (product chrome; not concat with Desk/Capture).
- Do not refile Pack B Approve gap; leftover Needs badge drafts from prior seq ignored.
