# DITL-P-03-UI-02 report

CASE: DITL-P-03-UI-02
LANE: B (user-data-dir /tmp/ditl-pw-lane-b)
APP: http://localhost:8081
RESULT: PASS

## Evidence (live screen)
1. Sign-in ditl-parent-1 → /parent Taylor Lee (Jordan+Jamie) — OK
2. /parent/ride hub: Line A Front + Line B Side, children Jamie+Jordan — OK
3. Picks: Jamie + Line B (V2 plate not chosen on UI — copy says car not picked by parent) — OK
4. Check-in I'm first → You're in this line · ditl-Line B Side · You are 1 · Jamie — OK
5. Isolation: Jamie only on active line (no Jordan twin mix) — OK
6. Leave line → You're out of ditl-Line B Side — OK
7. Sign out → /sign-in — OK

## FINDINGS
(none)

## Artifacts
notes/qa-fixtures/ditl/artifacts-P-03-UI-02/ (01–06 pngs, result.json, run-ui-02.mjs, run.log)
