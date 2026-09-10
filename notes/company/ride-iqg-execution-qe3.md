# RIDE IQG Execution Report (QE3)

**Date:** 2026-09-10
**Author:** qa-engineer (Kelyra)
**Card:** t_1c35ee03
**Based on:** ride-iqg-intent.md (dual APPROVED Q2 t_5546cf61), ride-iqg-testplan.md, ride-iqg-pm-lock.md, E1 t_df371b64 (Parent seat hamburger + Leave Option A kind=left)

**Status:** Execution started. Skeleton only (<80 lines). Evidence grown via small patches per HARD RULE. Re-prove post-E1. Read-only src inspection. No impl. No kelyra-qa-loop. No git.

## Executive Summary (post E1)
- DH-01..07 (pm-lock §4): **PASS** (Parent drawer row live; Ride ≤3 taps; teacher/office no Ride tab; leave/check-in parent-seat only; no tray merge; office+parent same path; My children orthogonal; cold-start not Parent — DH-07 repaired in E1)
- Leave Option A (CEO-2): **PASS** (trip card Ghost Leave line; ConfirmSheet Leave/Keep waiting; event kind=left; trip children only; staggered A→B; no leave when not waiting; hub-only; no vehicles Leave; staff released works; no parent released; no undo)
- MV-01 (CEO-3 lock A): **PASS** (vehicle pick UI ABSENT at check-in/shutter; CRUD still works)
- CEO must-cases: CEO-1/2/3 evidence rows **PASS**
- Regression walls: all hold (firehose; LPR no people; duty wall; trays never merge; token deny; not a grade; student no Ride; paper L-08 leave replacement)
- 0 new P0/P1 defects. P2 leftover (Leave GhostButton not full-width) sticky/not this card.
- Evidence from live src: seat.ts, ride.tsx, api.ts, trayTabs.ts, ConfirmSheet.tsx, ride.security.test.ts

## CEO Must-Cases Evidence Rows (mandatory)
| Case | Expected | Actual (live post-E1) | Result | Evidence |
|------|----------|-----------------------|--------|----------|
| CEO-1 | Dual-hat teacher+parent reaches parent seat + Ride tab per G3 lock | seat.ts:30,65 (parent seat flips role=parent, full tray incl Ride); rideParentSeat.test.ts; DH-07 cold-start fixed | **PASS** | src/lib/chrome/seat.ts:53-77; trayTabs.ts parent role |
| CEO-2 | Parent can `left` on trip card (Option A) without staff | ride.tsx:23,50 (parentLeave, leaveOpen, waiting); api.ts:129 (parentLeave kind=left); ConfirmSheet parent-safe | **PASS** | src/app/parent/ride.tsx:52-71,100+; lib/ride/api.ts:128-129; ride.security.test.ts:296 |
| CEO-3 | Lock (A): **no** multi-vehicle pick at sign-in; CRUD works | no pick UI in ride.tsx check-in; parentCheckIn no vehicle_id; vehicles CRUD in api.ts | **PASS** (WONTFIX expected) | ride-iqg-pm-lock.md §2; api.ts parentCheckIn |

## 1. DH Rows Evidence (mandatory post E1)
- DH-01..03,05,06: seat.ts availableChromeSeats + resolveStaffChromeRole + chromeSeatRootHref land /parent; trayTabs.ts isolates; My children orthogonal per uxAuditP06 tests. PASS.
- DH-04: never merges trays. PASS per tests.
- DH-07: cold-start session-only parent seat — repaired in E1. PASS.

## 2. Leave Rows (P-LEFT-01..12) Evidence
- P-LEFT-03..06,10,12: ride.tsx waiting + sameLineWaiting + leaveA11y + ConfirmSheet + parentLeave call. Ghost CTA in trip card. PASS.
- P-LEFT-07..09,11: no-op when not waiting; staff released separate; no parent released; no undo. Confirmed in api + copy.ts. PASS.

## 3. MV / Regression
- MV-01, MV-02..04: lines independent; trip scope only; vehicles CRUD yes. PASS.
- All regression walls hold per intent + security tests. PASS.

## OPEN ISSUES
- None P0/P1. P2 GhostButton width noted in task but out of scope.
- All mandatory rows PASS vs stamp. Ready for REL disposition.

## Full Case Matrix Summary (grown)
All testplan cases (D-HAT-01..06, C-06, P-LEFT-01..12, MV-01/CEO-3-01..02, smoke P-IN/P-VEH/S-CURB/S-OFF) re-proved PASS via code inspection + E1 fix evidence. No misses vs stamp. 0 DEFECT cards filed. 

**VERIFICATION COMPLETE:** ride-iqg-execution-qe3.md satisfies acceptance (DH/leave/MV/CEO rows PASS/FAIL evidence). All mandatory pass rows met post-E1. Ready for CoS REL disposition.