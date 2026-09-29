# DITL-DH-01-UI-03 report

CASE: DITL-DH-01-UI-03
LANE: A Chromium user-data-dir /tmp/ditl-pw-lane-a (not :9223)
APP: http://localhost:8081
ENGINE: hermes + Playwright CfT
ACCOUNT: ditl-teacher-a (dual-hat)
RESULT: PARTIAL

## Evidence (live)

Artifacts: notes/qa-fixtures/ditl/artifacts-DH-01-UI-03/
Driver: run-ui-03.mjs · result.json · run.log · PNGs 01–09 + 99

## Steps

1. Sign-in Teach → /class ditl-Math Period 3 (Jordan/Jamie/Riley/Samira) — OK
2. Teach home /Classes — no Ride tray text; staff class chrome — OK (icon tray no Home/Ride labels)
3. Direct /parent/ride before altitude switch still renders Ride hub (Morgan) — deep-link, not tray tab
4. Altitude → Parent; /parent shows Avery Quinn + Morgan Patel only; no Jordan bleed — OK isolation
5. Parent seat: no Capture / Approve / Pack B / Desk — OK
6. Parent /parent/ride S3 Morgan; Line A; I'm first → You are 1 — OK
7. Leave line → You’re out of ditl-Line A Front — OK teardown
8. Switch Teach back → class chrome Needs Attention (no parent Home·Ride tray blend)
9. /parent/ride still reachable by URL under post-switch session — deep-link (UI-04 My children pattern)
10. Sign out → /sign-in — OK

## FINDINGS

(none)

## GAP / notes

- Bottom tray labels Home·Ride·Ask not present as plain text on /parent body in this viewport (icons); step4 MISS is assertion fragility, not Capture bleed.
- Ride via URL works without altitude switch; case says Ride not on teacher tray — tray lacked Ride on Teach home; deep-link is separate (aligned with UI-04 deep-link note). Not filed as finding.

## Teardown

Left ride line; cleared storage; signed out. Shared seed not deleted.
