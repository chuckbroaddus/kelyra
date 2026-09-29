# DITL-P-01-UI-01 report

CASE: DITL-P-01-UI-01
LANE: B (user-data-dir /tmp/ditl-pw-lane-b)
APP: http://localhost:8081
ENGINE: hermes + Playwright Chrome persistent
RESULT: PARTIAL

## Evidence (live)

See result.json + PNGs in notes/qa-fixtures/ditl/artifacts-P-01-UI-01/

## Steps

1. Sign-in ditl-parent-1 → /parent Taylor Lee — OK (01-after-signin.png)
2. Tray shows Home · Ride · Calendar · Ask; no Capture/Camera — OK chrome, see finding on count
3. Child chips Jamie + Jordan on Home — OK
4. Select Jordan → focus ditl-bulk-jordan-place-value; Math 92% English 88% — OK (on /parent P-H2 style, not only /parent/grades)
5. Switch Jamie → prior Jordan focus clears; Jamie decimals PRACTICE — OK isolation
6. /parent/ride hub — OK
7. Manage vehicles: DITL-AAA1 · V1 present; check-in copy: do not pick own car — OK / design-aligned (not a picker at check-in)
8. Children chips Jamie Lee + Jordan Lee; line ditl-Line A Front — OK
9. I'm first → You’re in this line · You are 1 · Jordan, Jamie · Check in successful — OK position only
10. Leave line confirm → You’re out of ditl-Line A Front — OK left (no released mint text)
11. Storage clear + /sign-in — OK teardown

## FINDINGS

FINDING: Parent tray is Home·Ride·Calendar·Ask (4) not Home·Ride·Ask (3) per case expected tray=3 only; severity P3; case DITL-P-01-UI-01

## GAP

None for this UI path. Vehicle is managed separately; check-in does not select V1 (product design).

## Artifacts

- run-ui-01.mjs, result.json
- 01-after-signin.png … 11-signout.png

## Teardown

Left line after check-in; session cleared to sign-in. Shared seed untouched.
