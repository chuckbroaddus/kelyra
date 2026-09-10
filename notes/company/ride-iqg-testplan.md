# RIDE IQG Test Plan + Cases (QE1)

**Date:** 2026-09-10
**Author:** qa-engineer (Kelyra)
**Card:** t_58fa76a1
**SoT:** notes/company/ride-iqg-intent.md (REJECTED stamp + gaps), ride-parent-checkout-lock.md (Option A), ride-parent-checkout-pm.md, car-rider-*.md, docs/ui-design.md §§, live src/...

**Status:** Plan + cases. PM lock §6.2 = **(A) Keep L2 / CEO pick WONTFIX** (`ride-iqg-pm-lock.md` §2; disposition `t_6d13eb49`). §6.1 dual-hat designer fold still pending. Do not declare product-complete.

## 1. Scope Coverage (per IQG §10)

- HATS
- CHROME ENTRY
- LIFECYCLE ENTER
- LIFECYCLE LEAVE (CEO-2)
- MULTIPLICITY (incl. CEO-3)
- INTEGRITY
- NON-GOALS
- CEO MUST-CASES: CEO-1, CEO-2, CEO-3 (mandatory evidence rows; file DEFECT if OPEN gaps)

## 2. Test Case Matrix (minimum IDs)

### 2.1 HATS (P-*, S-*, D-HAT-*, TW-*)
**Parent hat (primary):**
- P-VEH-01: Add vehicle (plate/make/model + today/range/indefinite)
- P-VEH-02: Void vehicle
- P-VEH-03: Grandma/nanny car today-only expiry
- P-IN-01: Check-in photo of car ahead (per line)
- P-IN-02: I’m first check-in (per line)
- P-IN-03: Own success XX only (no total)
- P-IN-04: Fail closed on restriction (no reason shown)
- P-LEFT-01: Leave line while waiting (CEO-2)
- P-LEFT-02: Confirm Leave line / Keep waiting (Option A)

**Curb duty / stage:**
- S-CURB-01: Walk list per line; order_fix on duplicate-first
- S-CURB-02: Checkout = released (child in car)
- S-CURB-03: Duty wall (not is_staff widen)
- S-OFF-01: Manage altitude entry (no Ride tab)

**Teacher (no parent):**
- T-NO-01: No Ride tab in teacher tray
- T-NO-02: No parent check-in/leave

**Office/super:**
- S-OFF-02: Dismissal curb under Manage only
- S-OFF-03: Super archive photos only (admin cannot)
- S-OFF-04: No Ride tab on office seat

**Student:**
- STU-01: No Ride UI / tray

**Dual-hat (CEO-1 critical):**
- D-HAT-01: Teacher+parent reaches parent seat + Ride tray
- D-HAT-02: Office+parent: parent seat Ride; staff seat no Ride
- D-HAT-03: Trays never merge on seat switch
- D-HAT-04: My children deep-link vs explicit parent seat row (G3 — expect DEFECT if OPEN)
- D-HAT-05: Leave only under parent-seat Ride
- D-HAT-06: Duty wall RPCs unchanged on parent seat

**Twins:**
- TW-01: Twins fail closed (unlabeled empty)
- TW-02: Leave = exactly trip student_ids (no household)
- TW-03: No cross-line twin trip blend

### 2.2 CHROME ENTRY
- C-01: Parent-only login → tray Home · Ride · Ask (IconName ride)
- C-02: Vehicles subroute Ride-active highlight
- C-03: Office seat: no Ride tab (Manage altitude only)
- C-04: Teacher seat: no Ride tab
- C-05: Dual-hat: never merge trays on seat switch
- C-06: G3 dual-hat parent altitude path (per PM §6.1 lock; else DEFECT vs CEO-1 naming PM/Designer)
- C-07: Leave-line entry only on /parent/ride trip card (hub-only, Option A)
- C-08: No Leave on /parent/vehicles routes

### 2.3 LIFECYCLE ENTER (P-IN-*)
- P-IN-05: Photo ahead per line (independent orders)
- P-IN-06: I’m first per line; two I’m-first → curb conflict (parent own status only)
- P-IN-07: Success: own XX only (firehose ban — no total, no “of N”)
- P-IN-08: Fail: Check in failed (no reason) on restriction
- P-IN-09: Child chips this stop only (multi-child trip scope)
- P-IN-10: Line pick at entry; staggered lines independent

### 2.4 LIFECYCLE LEAVE (P-LEFT-*) — CEO must-case #2
- P-LEFT-03: Leave line on trip card while waiting (Ghost CTA inside card)
- P-LEFT-04: ConfirmSheet: Leave line (primary) / Keep waiting (cancel)
- P-LEFT-05: Event kind=`left` (this line_id + trip student_ids only; not released)
- P-LEFT-06: After left: restore check-in stack; may staggered B (other line)
- P-LEFT-07: No leave when not waiting (no-op / disabled)
- P-LEFT-08: Staff released still works (before/after parent left)
- P-LEFT-09: No parent mints released
- P-LEFT-10: No Leave chrome on vehicles routes (hub-only)
- P-LEFT-11: No undo / restore prior XX (re-check-in = new graph)
- P-LEFT-12: Trip children read-only; same-line photo/I’m-first disabled while waiting

### 2.5 MULTIPLICITY (MV-*, TW-*)
- MV-01: Two lines independent (staggered A→B allowed)
- MV-02: Multi-child trip scope (leave = trip set only)
- MV-03: Twins fail closed (no auto blend)
- MV-04: Multi-vehicle CRUD + validity (today/range/indefinite; grandma/nanny)
- MV-05: SIGN-IN vehicle pick — **LOCKED (A) Keep L2 / WONTFIX**: **PASS when no pick UI** at shutter/check-in and check-in works without vehicle_id; **FAIL if** parent self-pick ships without new CEO epic. CRUD still MV-04.
- MV-06: Two I’m-first curb conflict handled (no parent PII leak)

### 2.6 INTEGRITY (H-*, REG-*)
- H-01: 7-day purge (photos + events)
- H-02: Super archive retains day’s photos only (admin cannot archive)
- H-03: Duty wall (RPCs respect assignment, not blanket is_staff)
- REG-01: Firehose ban (no neighbor plates, no line total)
- REG-02: LPR server-only; never inserts people
- REG-03: Token /parent deny; no anon
- REG-04: Not a grade; no Approve path
- REG-05: No Ask tool on Ride
- REG-06: Student no Ride UI
- REG-07: Paper L-08 void reconciled vs live leave (Option A)
- REG-08: No EXPO_PUBLIC vision keys

### 2.7 CEO MUST-CASES (mandatory evidence rows)
**CEO-1 (Teacher who is also parent — Ride menu / complete parent Ride check-in):**
- CEO-1-01: Dual-hat teacher+parent reaches parent seat tray with Ride tab (G3 path per PM lock)
- CEO-1-02: On parent seat: full check-in + leave works
- CEO-1-03: On teacher seat: no Ride tab (DEFECT [P0] if present; owner PM/Designer if G3 open)
- Expected: DH-01/D-HAT-04 pass or explicit DEFECT row

**CEO-2 (Parent who entered the line — can they leave (`left`) without staff):**
- CEO-2-01: Waiting trip card shows Leave line (Ghost, Option A)
- CEO-2-02: Confirm Leave line → event left (not released); success “out of this line”
- CEO-2-03: After left: may check-in staggered B; no undo restore XX
- CEO-2-04: No leave when not waiting; staff released still functions
- Expected: P-LEFT-03..08 pass or BLOCKED note if eng not live

**CEO-3 (Parent with multiple cars — vehicle pick at sign-in vs pack L2):**
- CEO-3-01: Multi-vehicle CRUD works (MV-04)
- CEO-3-02: **No** SIGN-IN vehicle pick control (lock **A** / WONTFIX) — pass when picker absent; check-in without vehicle_id
- Expected: MV-05 PASS under (A); disposition `notes/company/ride-iqg-defect-ceo3-disposition.md` (`t_6d13eb49`). Do **not** invent pick law or reopen (B)/(C).

## 3. Evidence Requirements
Each case → role fixture + expected vs actual. Open gaps → DEFECT [sev] naming owner (PM/Designer). CEO rows mandatory. If leave/multi-vehicle eng not live: record BLOCKED + dependency note (do not pass by omission).

## 4. Non-Goals Guarded
- No GPS / placard / keypad product
- No office/teacher/student Ride tab
- No sticky/Danger Leave; no partial leave; no undo
- No Ask tool; not a grade; no EXPO_PUBLIC keys

## 5. Regression Walls
- Matcher never inserts student
- Duty wall, LPR no people, 7-day purge, firehose ban, trays never merge, token deny all hold with Ride present

*Plan complete — grown via skeleton + small patches only. Ready for QE2 execute after PM lock.*
