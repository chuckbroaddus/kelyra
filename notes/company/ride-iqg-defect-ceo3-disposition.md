# DEFECT disposition — CEO-3 multi-vehicle sign-in pick

**Card:** t_6d13eb49  
**Date:** 2026-09-10  
**Profile:** product-manager  
**Feature:** RIDE car-rider (multi-vehicle vs pack L2)  
**Parent lock:** `notes/company/ride-iqg-pm-lock.md` §2 / §6.2 (card `t_a5ec7303`)

---

## Verdict

| Field | Value |
|---|---|
| **SEVERITY** | **P0** (gap severity at file time — product-law open vs CEO must-case) |
| **DISPOSITION** | **WONTFIX** (v1) |
| **Stamp conflict?** | No — aligns lock **(A) Keep L2** |
| **CEO escalate?** | No (not prod/legal/spend; lock already chose WONTFIX path) |
| **Designer?** | **No** — no pick UI |
| **Engineering?** | **No pick impl** — keep `t_a4c0d6bd` blocked / WONTFIX path |

---

## Why WONTFIX

(See pm-lock §2.1 — binding.)

1. **Pack L2 intentional:** vehicles on parent with validity; order identity = ahead photo / I’m first / staff — not self-picked own bumper.
2. **Self-pick ≠ queue honesty:** second identity channel; spoof/stale risk.
3. **Multi-car job already specified:** CRUD + validity + staff attach; grandma today-only — not shutter pick.
4. **Unlike leave:** no CEO-dated override file over L2; IQG example required disposition, not auto-override.
5. **Live already matches (A):** `parentCheckIn` has no `vehicle_id`; SQL test bans `p_vehicle_id` on check-in; no pick chrome.

---

## Case map (expected after lock)

| Case | Expected under (A) | Pass when |
|---|---|---|
| **CEO-3-01** | Multi-vehicle CRUD (MV-04) | add/void/validity works |
| **CEO-3-02** | **No** sign-in vehicle pick | picker absent at shutter/check-in |
| **MV-01..03** | No pick UI; check-in without vehicle_id | photo/I’m first succeeds |
| **MV-04** | Vehicles CRUD still | V-05/V-06 hold |
| **MV-05** | Self-pick without new CEO epic = **fail** | invent pick = fail |

**Fail would be:** shipping parent self-pick at sign-in against this lock.

---

## Live evidence (inspect-only; no src change)

| Check | Result |
|---|---|
| `src/lib/ride/api.ts` `parentCheckIn` | Args: lineId, studentIds, imFirst, storagePath, ahead plate — **no** vehicleId |
| `ride.security.test.ts` | Asserts check-in RPC signature **does not** match `p_vehicle_id` / `p_own_plate` |
| `src/app/parent/vehicles.tsx` | CRUD surface only (add/list) — not shutter pick |
| `src/app/parent/ride.tsx` | Trip XX + Manage vehicles link — **no** which-car picker |
| Pack L2 / architecture | “Does not pick which of their cars”; bumper from car behind / staff |

---

## Binding law IDs (from pm-lock §2.2)

IQG-RIDE-MV-01..06 — Keep L2; no self-pick; CEO WONTFIX; eng pick blocked; leave no vehicle pick.

---

## Severity note

Filed as **P0** because CEO must-case #3 was an **open product-law gap** at QE time (stamp miss risk). After lock (A), the product outcome “no pick UI” is **correct**. Severity label retained for audit of the original gap card; disposition **WONTFIX** closes the gap without FIX-NOW eng.

---

## Paper reconcile (this card)

- `ride-iqg-intent.md` §6.2: OPEN CONFLICT → **LOCKED (A) / WONTFIX**
- Related OPEN one-liners for vehicle pick closed
- Testplan CEO-3 / MV-05 expected text → lock (A)
- pm-lock §2 already binding — no law change; cross-ref defect id added
- execution CEO-3 row updated to WONTFIX dispositioned

---

## Recommended next action (CoS)

1. Accept **WONTFIX / P0 gap closed by law (A)**.
2. Do **not** staff designer or eng for pick UI.
3. Keep multi-vehicle check-in pick eng blocked under WONTFIX path.
4. QE re-row CEO-3: PASS when pick absent + CRUD works.
5. Dual-hat / leave defects remain separate.

---

## Handoff

- **OBJECTIVE:** Disposition CEO-3 P0 multi-vehicle sign-in pick.
- **RESULT:** SEVERITY P0; DISPOSITION **WONTFIX** v1; law (A) Keep L2.
- **FILES:** `notes/company/ride-iqg-defect-ceo3-disposition.md`; patches `ride-iqg-intent.md` §6.2 + stamp, `ride-iqg-testplan.md` CEO-3/MV-05, `ride-iqg-pm-lock.md` cross-ref, `ride-iqg-execution.md` CEO-3 row.
- **ESCALATION NEEDED:** No.
- **RECOMMENDED NEXT ACTION:** CoS — no eng/designer for pick; QE re-row CEO-3 under (A).
