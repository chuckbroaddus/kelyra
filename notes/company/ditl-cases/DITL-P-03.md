# DITL-P-03 Cases (Parent Ride multi-child multi-car)

**Plan:** [DITL-P-03](../ditl-plans/DITL-P-03.md)
**Preconditions (all cases):** F-SCHOOL=`ditl-Sandbox Academy`, F-PARENT-1=`ditl-parent-1` (P1, linked S1+S2), S1=`Jordan Lee`, S2=`Jamie Lee`, V1=`DITL-AAA1`, V2=`DITL-BBB2`, Line A/B, passwords `DITL-parent-test`. No prior Ride events for this parent today.

**DITL-P-03-UI-01** | tags: ride, multiplicity, chrome-parent
- Pre: F-PARENT-1 (`ditl-parent-1`), S1=`Jordan Lee`, S2=`Jamie Lee`, V1=`DITL-AAA1`, Line A, passwords `DITL-parent-test`
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-parent-1` / `DITL-parent-test`.
  2. Ride hub at `/parent/ride`.
  3. Manage vehicles confirm V1=`DITL-AAA1`+V2=`DITL-BBB2` at `/parent/vehicles`.
  4. Line A: select car V1 + child S1=`Jordan Lee` only.
  5. Check-in (photo or first) at `/parent/ride`.
  6. Observe position XX only.
  7. Leave → left event.
- Expected: Sibling isolation; position visible; leave succeeds (left not released).
- Artifact: none
- DB assert: ride_events for parent only (check-in/left)
- Teardown: leave any line → sign out (idempotent, ditl- isolation)
- PARTIAL/GAP: none (PHYSICAL-ONLY shutter noted but UI primary)

**DITL-P-03-UI-02** | tags: ride, multiplicity, vehicles
- Pre: same + V2=`DITL-BBB2`, S2=`Jamie Lee`
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-parent-1` / `DITL-parent-test`.
  2. Line B: select car V2 + child S2=`Jamie Lee` only at `/parent/ride`.
  3. Check-in (photo or first).
  4. Observe position.
  5. Leave B → left event.
- Expected: Second line independent; no twin mix.
- Teardown: leave line → sign out.
- PARTIAL/GAP: none

**DITL-P-03-UI-03** | tags: ride, restrictions
- Pre: same + restricted child fixture
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-parent-1` / `DITL-parent-test`.
  2. Attempt check-in restricted child on Line A at `/parent/ride`.
  3. Observe fail closed.
- Expected: "Check in failed" no reason shown.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-P-03-ASK-01** | tags: ask-dual, ride
- Pre: same
- Steps (Ask):
  1. Route `/sign-in` → sign in `ditl-parent-1` / `DITL-parent-test`.
  2. Use Ask tool for vehicle list (documented GAP).
  3. Attempt line pick (documented GAP).
- Expected: PARTIAL/GAP documented; no false green.
- Teardown: sign out.
- PARTIAL/GAP: Vehicles/Line check-in/leave = PARTIAL/GAP (no Ask tools; PHYSICAL-ONLY for camera)

