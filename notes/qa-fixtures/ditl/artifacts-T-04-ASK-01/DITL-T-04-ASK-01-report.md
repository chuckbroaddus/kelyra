# DITL-T-04-ASK-01 report

RESULT: PASS

Case: DITL-T-04-ASK-01
Lane: A SuperGrok / Hermes
Browser: Chromium persistent /tmp/ditl-pw-lane-a (not :9223)
App: http://localhost:8081
Seat: ditl-teacher-a (teacher only)
Marker: ditl-T-04-ASK-01-1790530620930

## Evidence (live)

- Sign-in → ditl-Math Period 3 desk (shot 01)
- UI gradebook: Jordan/Jamie/Riley/Samira; assigns ditl-Math HW S1, Quiz, Hist HW*, Multi*; Jordan Overall 92% (shot 02, 07)
- Class desk OK (shot 03)
- /ask surface (shot 04)
- Ask list_assignments toolCall 200: titles match UI (Math HW S1, Quiz, PhaseB*, Multi*, Hist HW*) (shot 05)
- Ask list_grade_cells: Jordan Lee on ditl-Math HW S1 status graded score 92 (shot 06) — matches UI 92%
- Dual path: UI gradebook + Ask list/explain agree (shot 07)
- Sign-out /sign-in (shot 08)

Driver: notes/qa-fixtures/ditl/artifacts-T-04-ASK-01/run-ask-01.mjs
result.json: same dir

## FINDINGS

(none)

## GAP

(none for this case)

## Teardown

Session clear + /sign-in only. Did not delete shared seed leftovers.
