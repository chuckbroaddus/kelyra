# DITL-DH-01-ASK-01 EXEC REPORT

CASE: DITL-DH-01-ASK-01 (seq 50)
LANE: A / SuperGrok / Hermes
ENGINE: hermes
BROWSER: Chromium user-data-dir /tmp/ditl-pw-lane-a
APP: http://localhost:8081
ACCOUNT: ditl-teacher-a (dual-hat)
WHEN: 2026-09-27

## RESULT

RESULT: PARTIAL

## Evidence

Live Chromium lane A against http://localhost:8081 (curl HTTP 200). Scripts: `/tmp/ditl-dh-01-ask-01-lane-a.mjs` → `/tmp/ditl-dh-01-ask-01-out/`; `/tmp/ditl-dh-01-ask-01-b.mjs` → `/tmp/ditl-dh-01-ask-01-out2/`.

Run 2 (primary SPA path):

1. Sign-in ditl-teacher-a → Teach C-MATH Period 3; tray Desk·Needs·Diary·Calendar·Kelyra.
2. Teach Ask via tray Kelyra → `/ask`; composer Ask… + Send; class chip ditl-Math Period 3.
3. Teach prompt listed taught class + roster (Jordan/Jamie/Riley/Samira) and prior captures/Needs; refused parent my_children from Teach seat (“no linked children on this profile”); approveChrome=false; no Approve this capture control.
4. Altitude Switch to Parent seat → `/parent`; tray Home·Ride·Calendar·Ask; Morgan Patel + Avery Quinn parent home; approveHits=[].
5. Parent tray tab Ask (not bare location) → `/ask` while tray stayed Home·Ride·Calendar·Ask (hasHomeRide=true, hasDeskNeeds=false). Drawer: Switch to Teach seat · Sign out · My children.
6. Parent prompt my_children / Morgan grades: no Approve labels; hasApproveThis=false. UI showed Working… then “New chat / Which assignment?” picker; scroll still contained prior Teach transcript (C-MATH roster, Jordan captures, desk drafts).
7. Run 1 bare `goto /ask` after Parent seat restored Teach tray Desk·Needs·Diary·Calendar·Kelyra + Open Capture / ditl-Math — seat wall not held on deep link.

Screens: out2 `02-teach-ask.png` `03-teach-reply.png` `04-parent.png` `05-parent-ask-tray.png` `06-parent-reply.png` `07-drawer.png`; out1 `04-parent-seat.png` `05-parent-ask.png` (teach tray regression).

Expected partially met: Ask usable both seats; Parent tray Ask keeps parent chrome and no Approve. Not fully met: Ask history/context not seat-isolated; bare `/ask` deep link drops Parent altitude.

## FINDINGS

FINDING: Parent-seat bare navigation to /ask restores Teach tray (Desk·Needs·Capture class chip); severity P2; case DITL-DH-01-ASK-01
FINDING: Dual-hat Ask transcript not seat-scoped — Teach roster/captures remain visible after Parent altitude + tray Ask; severity P2; case DITL-DH-01-ASK-01

No Pack B Approve miss refiled. Leftover Needs Attention drafts not treated as new finding.

## Teardown

Attempted Sign out from Parent Ask drawer (run2); landed still authenticated on /parent with mixed tray. Follow-up so script left session on Teach class route. Shared seed not torn down. Operator may need manual sign-out on lane-A profile.
