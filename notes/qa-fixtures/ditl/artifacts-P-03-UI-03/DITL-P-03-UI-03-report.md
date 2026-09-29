# DITL-P-03-UI-03 report (lane B)

RESULT: PASS

Case: restricted child Line A check-in fail-closed.
App: http://localhost:8081
Browser: Chromium persistent /tmp/ditl-pw-lane-b
Login: ditl-parent-1 (parent seat only)

## Evidence
- Fixture: office_set_pickup_restriction for Jordan + Taylor parent (reason not shown to parent).
- Sign-in → parent Home (Taylor Lee, Jamie + Jordan).
- /parent/ride: Line A Front / B Side; children Jamie Lee, Jordan Lee.
- Check-in attempt (I'm first) → body shows **Check in failed**; no position; no ban reason leak.
- Leave not needed (not in line). Sign out → /sign-in.
- Fixture restriction deactivated after run.

Screens: notes/qa-fixtures/ditl/artifacts-P-03-UI-03/*.png
result.json: same dir

## FINDINGS
(none)

## Notes
Expected fail is not a product defect. Restriction cleared post-run (neighbor cleanup).
