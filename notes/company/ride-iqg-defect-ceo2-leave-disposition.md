# DEFECT disposition — CEO-2 parent leave (`left`) missing

**Card:** t_6f5ec4a9  
**Date:** 2026-09-10  
**Profile:** product-manager  
**Feature:** RIDE car-rider — parent leave-line (CEO must-case #2)

---

## Verdict

| Field | Value |
|---|---|
| **SEVERITY** | **P0** (confirmed) |
| **DISPOSITION** | **FIX-NOW** |
| **Stamp gate** | Eng **only after** dual DESIGN STAMP (PM APPROVED; QA Sup still REJECTED as of ride-iqg-pm-lock) |
| **CEO escalate?** | No — product P0 in IQG queue; not production outage / legal / spend |
| **Design reopen?** | **No** — Option A already locked |

---

## Why P0

IQG severity guide: **P0** = cannot complete a live school flow (also safety / data wrong).

1. **CEO must-case #2** is exactly this flow: parent who entered the line must leave (`left`) **without staff**. Missing Leave means the only finish path is staff curb `released` — parent lifecycle is enter-only.
2. **Stamped chrome exists on paper** (`ride-parent-checkout-lock.md` Option A + `docs/ui-design.md` §13.13b) and CEO override of L-08 is product law (`ride-parent-checkout-pm.md`). Live parent Ride is happy-path check-in only.
3. **Curb stress / safety posture:** a parent stuck “waiting” with no self-exit must flag staff or abandon the line without a recorded `left`, corrupting XX/graph honesty for the rest of the line.
4. **Not P1:** P1 is “stamped behavior missing for a primary hat/lifecycle” in a way that still allows a school flow with friction. Here the **finish** half of the primary parent lifecycle is absent — CEO named this as the IQG archetype for incomplete ship.

| Guide | Fit |
|---|---|
| **P0** | **Yes** — cannot complete leave-line school flow without staff |
| P1 | Too low — finish path missing, not merely secondary-hat polish |
| P2/P3 | No |

Severity **stays P0**. QE title severity confirmed.

### Expected vs actual (corrected evidence)

| | |
|---|---|
| **Cases** | CEO-2-01..04, P-LEFT-03..12, C-07..08 (testplan) |
| **Expected** | Waiting trip card on `/parent/ride` shows Ghost **Leave line**; ConfirmSheet **Leave line** / **Keep waiting**; confirm → `queue_events.kind=left` for this `line_id` + trip `student_ids`; success restores check-in stack; no parent `released` |
| **QE actual (card)** | Claimed no `/parent/ride` route |
| **PM verified actual** | `src/app/parent/ride.tsx` **exists** (check-in + XX status card). **No** Leave CTA, **no** ConfirmSheet, **no** parent leave client API. Trip card is XX-only (`trip.status === 'in_line'`). `src/lib/ride/api.ts` exports `parentCheckIn` / `releasePickup` (staff) — **no** `parentLeave`. Schema allows event kind `left` (`20260907000000_ride_schema.sql`) but parent path not wired |

---

## Why FIX-NOW

1. **P0 FIX-NOW default** (IQG Phase 6) unless written reason otherwise — none.
2. **Law already locked** — not waiting on A/B/C. Option A + micro-adoptions locked 2026-09-09; ui-design §13.13b already patched. This is **implement missing stamped finish**, not design work.
3. **Epic already known blocked:** `t_bc63db16` parent self check-out eng family. Defect makes the miss board-visible with severity + disposition.
4. **Not WONTFIX / DEFER / SCHEDULE:** Would ship CEO archetype incomplete (enter without leave). No safe parent workaround that records `left` and restores staggered B.

**Staffing caveat (binding):** Disposition is **FIX-NOW**, but CoS **must not** staff Engineering / kelyra-qa-loop until **both** DESIGN STAMP lines are APPROVED (see Stamp gate). PM line APPROVED 2026-09-10 (`ride-iqg-pm-lock.md`); QA Supervisor remains REJECTED on dual-hat G3 + multi-vehicle disposition residual — leave law itself is **not** the REJECT driver.

---

## Accepted expected behavior (no design change)

From `ride-parent-checkout-pm.md` (L-08/L-08a/b, US-CO-*), `ride-parent-checkout-lock.md` Option A, `docs/ui-design.md` §13.13b:

- Parent-seat `/parent/ride` **hub only** while server reports live waiting trip.
- First-class **trip card**: line name, `You are {XX}` (no of N), trip child first names **read-only** (server trip scope).
- Full-width Ghost/Secondary **Leave line** **inside** the card (not sticky footer, not vehicles route, not Danger).
- Tap → parent-safe ConfirmSheet: title `Leave {line}?`; body stop-waiting for trip names + can check in again + **not pickup**; Primary **Leave line**; Ghost **Keep waiting** below; no type-name; no delete coda.
- Confirm → parent leave RPC only → `queue_events.kind = left` for this `line_id` + exactly trip `student_ids`; server `occurred_at`.
- Parent **never** mints `released`. Staff curb `released` still works before/after.
- Success: replace card with short “out of this line”; **restore** check-in stack (staggered B). No undo/XX restore; no partial leave; no household leave-all.
- While waiting: same-line Photo / I’m first **disabled** + mute helper.
- Dual-hat: Leave only under parent tray Home · Ride · Ask.

---

## Implementation contract (for CoS → Engineering after dual stamps)

PM does **not** implement. No src/SQL/git on this disposition card. Scope when eng is unlocked:

1. **Server:** parent-only leave RPC (or equivalent) that appends `queue_events.kind = left` for caller’s live waiting trip on `line_id` + exactly that trip’s `student_ids`; server `occurred_at`. Reject forge (other parent, other line, not waiting, already left/released). **Never** allow parent to mint `released`.
2. **Client API:** `parentLeave` (name flexible) in `src/lib/ride/api.ts`; do not overload `releasePickup`.
3. **UI Option A on `src/app/parent/ride.tsx`:**
   - Waiting trip card: line · XX · trip child first names (from server trip) · Ghost **Leave line** inside card.
   - ConfirmSheet shape per §13.13b (Primary Leave line / Keep waiting).
   - Success inline; restore check-in stack.
   - Same-line Photo / I’m first disabled + mute while waiting on that line.
   - **No** Leave on `/parent/vehicles…`.
4. **Staff path:** `releasePickup` / curb `released` remains; prove unaffected (P-LEFT-08).
5. **Tests:** parent leave happy path; not waiting no-op; trip scope only; parent cannot released; hub-only chrome; security (no cross-parent leave). Bundle CEO-2 / P-LEFT-03..12 prove-out after loop.
6. **Non-goals:** no A/B/C reopen; no sticky/Danger/one-tap; no undo XX; no partial/household leave; no GPS auto-leave; no office/teacher Ride tab; no multi-vehicle pick (separate CEO-3 / L2 WONTFIX path).

**AC to re-prove:** CEO-2-01..04 and P-LEFT-03..12 from `ride-iqg-testplan.md`.

**Related epic:** link eng child to this defect and feature parent `t_bc63db16` (or current RIDE leave epic) when staffing.

---

## Stamp / staffing gate

| Line | Status (as of disposition) | Source |
|---|---|---|
| PM DESIGN STAMP | **APPROVED** 2026-09-10 | `ride-iqg-pm-lock.md` (leave not reopened; L-08 paper reconcile) |
| QA Supervisor DESIGN STAMP | **REJECTED** (dual-hat G3 / multi-vehicle residual) | `ride-iqg-intent.md` |
| Leave Option A chrome | **LOCKED** | checkout-lock + ui-design §13.13b |
| Eng / qa-loop on leave | **Blocked until both stamps APPROVED** | IQG chain + operator note |

When QA Sup re-stamps APPROVED (and dual-hat chrome fold lands if still required for DH entry), CoS: ARM GRANT + staff Engineering FIX-NOW child of `t_6f5ec4a9` with contract above. Do **not** wait for multi-vehicle pick eng (WONTFIX under PM §6.2 A) to ship leave.

---

## Recommended next action (CoS)

1. Accept PM disposition **P0 / FIX-NOW** (eng gated on dual stamps).
2. Keep leave eng blocked until QA Supervisor **APPROVED** re-stamp (close dual-hat G3 fold + any remaining REJECT drivers that block RIDE stamps — leave itself is already specified).
3. After dual APPROVED: ARM GRANT + staff Engineering (kelyra-qa-loop) child of this defect; implement Option A leave per contract; do not reopen design.
4. After loop terminal: QA Engineer execute CEO-2 / P-LEFT rows; QA Supervisor release evidence only when P0 closed or in-flight FIX-NOW with evidence path.
5. Do **not** declare RIDE product-complete or staff devops-release while this P0 is open without a FIX-NOW eng path post-stamp.
6. Correct QE note: route exists; miss is Leave CTA + parent leave RPC, not missing screen file.

---

## Handoff fields

- **OBJECTIVE:** Disposition CEO-2 DEFECT — parent leave (`left`) missing on trip card.
- **RESULT:** SEVERITY **P0** confirmed; DISPOSITION **FIX-NOW**; eng **after dual DESIGN STAMP** only; Option A not reopened.
- **FILES:** `notes/company/ride-iqg-defect-ceo2-leave-disposition.md`
- **VERIFICATION:** Live `ride.tsx` XX-only card; no Leave/parentLeave; lock + §13.13b expected behavior cited.
- **OPEN ISSUES:** QA Sup stamp still REJECTED (blocks eng staffing, not disposition).
- **ESCALATION NEEDED:** CoS only (stamp close + eng staff). No CEO unless Chuck overrides gate.
- **RECOMMENDED NEXT ACTION:** CoS hold eng until dual stamps → then FIX-NOW eng child; QE re-prove CEO-2.
