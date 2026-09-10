# RIDE IQG — RELEASE EVIDENCE

**Date:** 2026-09-10
**Card:** t_52d353e6 · qa-supervisor
**Feature:** RIDE — car-rider / dismissal line (Parent seat + Leave line + MV lock A)
**Process:** notes/company/INTENT_QUALITY_GATE.md § verification

---

## RELEASE STAMP

```
RELEASE STAMP
Feature: RIDE — car-rider line (IQG retro + E1 FIX-NOW)
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_52d353e6 / qa-supervisor
Open P0/P1 FIX-NOW: none
Stamp vs prove-out: met (DH-01..07 / Leave Option A / MV-01 no picker / CEO-1/2/3)
P2 leftovers: sticky only — do not block release
SQL named not applied: supabase/migrations/20260910000003_dismissal_parent_leave.sql
```

---

## 1. Gate checklist

| Gate | Status | Evidence |
|---|---|---|
| Dual DESIGN STAMP | **APPROVED** | `ride-iqg-intent.md` PM `t_a5ec7303` + QA Sup Q2 `t_5546cf61` |
| Implementation loop | terminal **passed** | E1 `t_df371b64` wf_01a08ca3c2c376808122af3b78ed63e4 |
| QE plan + execute | done | QE1 `ride-iqg-testplan.md`; QE3 `ride-iqg-execution-qe3.md` **PASS** |
| Open P0/P1 FIX-NOW | **none** | CEO-1/2 done via E1; CEO-3 WONTFIX; board: no open DEFECT [P0]/[P1] |
| P2 leftovers | sticky, non-blocking | `t_c1f9817c` Leave GhostButton not full-width |
| Independent recheck | **pass** | seat.ts / trayTabs / ride.tsx / api.ts / migration (read-only) |

---

## 2. Stamp vs prove-out map

| Stamp dimension | Met? | Notes |
|---|---|---|
| Hats + dual-hat Parent seat (DH-01..07) | Yes | QE3 PASS; drawer Parent row; tray Home·Ride·Ask only on parent seat; cold-start job-of-record |
| Chrome entry | Yes | Parent tray Ride; staff Manage altitude for curb; no staff Ride tab; My children ≠ Ride SoT |
| Full lifecycle enter + leave | Yes | Check-in path + Leave Option A (`left`); ConfirmSheet Leave/Keep waiting; hub-only |
| Multiplicity MV-01 | Yes | No vehicle pick at sign-in (lock A / WONTFIX); vehicles CRUD remains |
| CEO must-cases 1/2/3 | Yes | CEO-1 Parent seat path; CEO-2 leave without staff; CEO-3 no picker PASS |
| Integrity walls | Yes | left≠released; duty wall; trays never merge; firehose/LPR walls per QE3 |
| Non-goals | Guarded | No staff Ride tab; no vehicle_id pick; no sticky Leave footer; CEO-3 pick not reopened |

Former QE2 P0s (CEO-1/2 FIX-NOW) closed by E1 + QE3. CEO-3 closed WONTFIX (`t_6d13eb49` / `t_a4c0d6bd`). No new P0/P1 from QE3.

---

## 3. Code choke points verified (QA Sup recheck)

- `seat.ts`: `availableChromeSeats` adds parent when also_parent; `resolveStaffChromeRole` parent seat → role `parent`; `defaultChromeSeat` never defaults Parent
- `trayTabs.ts`: Ride tab only when `role === 'parent'` (Home · Ride · Ask)
- `HamburgerDrawer.tsx`: a11y `Switch to Parent seat` (rideParentSeat / altitudeLocks tests)
- `parent/ride.tsx`: waiting trip card Ghost **Leave line** → ConfirmSheet → `parentLeave`; copy states no car pick
- `lib/ride/api.ts` `parentLeave` → RPC `dismissal_parent_leave` (kind=left only; never released)
- Migration `20260910000003_dismissal_parent_leave.sql`: inserts `queue_events.kind='left'`; trip kids from server order; deny student/token
- MV: no `vehicle_id` chooser in ride check-in UI; parent lead copy “You do not pick which of your cars”

---

## 4. Defect disposition trail

| Card | Sev | Disposition | Status after REL |
|---|---|---|---|
| `t_6bccc492` CEO-1 dual-hat G3 | P0 | FIX-NOW → E1 Parent seat | **done** (closed by eng+QE3) |
| `t_6f5ec4a9` CEO-2 leave missing | P0 | FIX-NOW → E1 Leave Option A | **done** (closed by eng+QE3) |
| `t_6d13eb49` CEO-3 multi-vehicle pick | P0 | **WONTFIX** lock (A) Keep L2 | **done** |
| `t_a4c0d6bd` pick-at-check-in tracker | — | WONTFIX complete | **done** |
| `t_c1f9817c` Leave GhostButton width | P2 | sticky parked | open — **non-blocking** |

Board scan 2026-09-10: zero non-done `DEFECT [P0]` / `DEFECT [P1]` / open FIX-NOW for RIDE.

---

## 5. P2 leftovers (explicit non-block)

Sticky only — **do not** block RIDE release:

- `t_c1f9817c` Leave line GhostButton not full-width inside trip card (visual vs Option A full-width lock). Behavior Leave path works.

No leftover elevates to P0/P1 miss vs stamped intent.

---

## 6. SQL / ship gate (not applied this card)

Named migration for devops apply-by-filename **only after** this RELEASE APPROVED:

- `supabase/migrations/20260910000003_dismissal_parent_leave.sql`

Client already calls `dismissal_parent_leave`. Without SQL apply, live leave RPC may 404 — devops must apply then commit/push. QA Supervisor does **not** apply SQL or git.

---

## 7. Verdict

**RELEASE: APPROVED**

CEO IQG smoke condition met: dual design stamp + prove-out PASS + no open P0/P1 FIX-NOW.

**QA Supervisor does not staff DevOps.** CoS may staff `devops-release` for:
1. SQL apply-by-filename `20260910000003_dismissal_parent_leave.sql`
2. THEN git commit/push RIDE E1 (no force-push; no secrets)

CoS does not git or apply SQL itself.

---

## 8. Handoff

| Field | Value |
|---|---|
| RESULT | RELEASE APPROVED |
| FILES | `notes/company/ride-iqg-release.md` |
| ESCALATION | No |
| NEXT | CoS → `devops-release` (SQL apply-by-filename THEN git) |

*End RIDE IQG release evidence — APPROVED 2026-09-10.*
