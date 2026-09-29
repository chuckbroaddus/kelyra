# DITL-P-03-UI-01 report

CASE: DITL-P-03-UI-01
LANE: B (user-data-dir /tmp/ditl-pw-lane-b)
APP: http://localhost:8081
ENGINE: hermes + Playwright Chrome persistent
RESULT: PASS

## Evidence (live)

See result.json + PNGs in notes/qa-fixtures/ditl/artifacts-P-03-UI-01/

## Steps

1. Sign-in ditl-parent-1 → /parent Taylor Lee — OK (01-after-signin.png)
2. Leave any prior line if present; Ride hub /parent/ride — OK (02-ride-hub.png)
3. Manage vehicles: DITL-AAA1 · V1 and DITL-BBB2 · V2 both indefinite — OK (03-vehicles.png)
4. Line A Front; children chips Jamie + Jordan; select Jordan only for stop — OK (05-kids-picked.png). Product note: check-in does not pick which of own cars you sit in (copy on hub).
5. I'm first → You’re in this line · You are 1 · Jordan only · Check in successful — OK position + sibling isolation (06-after-checkin.png)
6. Leave line confirm → You’re out of ditl-Line A Front — OK left not released (07-after-leave.png)
7. Sign out → /sign-in — OK (08-signout.png)

## FINDINGS

none

## GAP

none (V1 selected at vehicles list only; no car picker at check-in is design-aligned, same as P-01)

## Teardown

Left Line A after check-in; signed out to /sign-in. Shared seed untouched.
