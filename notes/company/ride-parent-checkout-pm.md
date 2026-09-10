# RIDE-CO-P1: Parent self check-out (leave line)

**Date:** 2026-09-09  
**Author:** product-manager (Kelyra)  
**Epic:** `t_bc63db16` · Stories card: `t_4a01e0f6` · Designer follow-on: `t_924ddb5b` (RIDE-CO-D1)  
**Status:** Spec only — no app code, no SQL, no Edge, no kelyra-qa-loop, no git, no `docs/ui-design.md` patch on this card.  
**Depends on:** `notes/company/car-rider-*.md` (v1 pack still law **except L-08**). Chrome SoT: `docs/ui-design.md` §13.13b / §34.2 (designer patches after PM lock).  
**CEO lock:** Chuck 2026-09-09 — if a parent checks into the line, they also need a way to check out. **Overrides paper L-08.**

---

## 0. One-line product law

| Surface | Job | What it is not |
|---|---|---|
| **Parent leave-line** | Signed-in parent ends **their waiting presence on this line** for the children they checked in. Event kind **`left`**. | Staff pickup confirmation; grade; Ask; GPS auto-exit |
| **Staff checkout** | Curb confirms child is in the car / picked up. Event kind **`released`**. | Parent self-service; “left the queue early” |
| **Photo check-in** | Join this line (ahead photo or I’m first). | Released; left |

**CEO override of L-08:** Parent **may** leave the line themselves. Staff **`released` stays** and remains the pickup confirmation.

---

## 1. left vs released (law)

Architecture already lists both kinds on `queue_events` (`car-rider-architecture.md`): `left`, `released` (checkout).

| Kind | Actor | Meaning | Live queue effect | Pickup meaning |
|---|---|---|---|---|
| **`left`** | **Parent** (self), this trip | “I am no longer waiting in **this line**.” | Parent + the children on **this trip** drop off **this line’s** live order. Position XX clears for that trip. | **Not** pickup confirmation. Child may still be at curb/stage. |
| **`released`** | **Curb staff** only | “This child / these children were picked up for **this line**.” | Same line exit for those children on that staff action. | **Yes** — product pickup confirmation. |
| Photo / `check_in` / `im_first` | Parent | Join line | Enter order | Not released, not left |

**Rules**

1. Photo check-in ≠ `left` ≠ `released`.
2. Parent UI and RPCs **must not** mint `released`. Parent path writes **`left` only**.
3. Staff curb **must not** lose `dismissal_release` / `released`. Parent leave does not replace duty checkout.
4. If staff later `released` after parent already `left`, server is idempotent for “already off this line” for those children; still audit the staff `released` (pickup fact).
5. If staff `released` first, parent leave control is gone / no-op for that trip (already not waiting).
6. Parent never sees neighbor plates, school total, or other parents’ leave/release events.
7. Events follow the existing **7-day** purge law with other `queue_events`.

**Copy posture (parent)**

- Leave success: short confirmation that they are **out of this line** (no XX, no total, no reason codes).
- Do **not** say “picked up,” “released,” or “checked out by staff.”
- Staff curb copy for `released` stays pickup-oriented (existing pack).

---

## 2. L-08 replacement text

### Prior (void for parent self leave)

| ID | Sev | Old pass criterion |
|---|---|---|
| **L-08** | P0 | Parent cannot checkout themselves |

**Void** as a ban on parent-initiated line exit. CEO 2026-09-09 override.

### Replacement acceptance text (drop into pack on next paper reconcile)

| ID | Sev | Pass |
|---|---|---|
| **L-08** | P0 | Parent **can** leave **this line** after a successful check-in while still waiting (not already `released` / not already `left`). Action records event kind **`left`** for **this `line_id`** + **the children on that check-in trip**. Parent **cannot** mint **`released`**. Staff curb **`released`** still works and remains pickup confirmation. |
| **L-08a** | P0 | After parent `left` on line A, parent **may** check into line B with **other** linked children (staggered). Twins never auto-mixed. |
| **L-08b** | P0 | Parent leave control appears only in **parent-seat** Ride (`/parent/ride` family). Dual-hat staff duty wall unchanged; no office Ride tray tab. |
| **L-05** (unchanged sense) | P0 | Staff checkout = curb `released`. Photo ≠ released. Parent `left` ≠ released. |

**Plan.md gloss (when CoS reconciles paper):**  
Parent: … own status + own XX; **may leave this line (`left`)**; then may join the other line with other children.  
Curb: … **checkout (`released`)** when child is in the car.  
Mechanic: Staff `released` **or** parent `left` ends waiting on **this line** for the relevant children; only `released` is pickup confirmation.

**Architecture gloss:** Checkout/pickup confirmation remains curb-only (`released`). Parent self-exit is `left` via a parent RPC (name left to engineering; e.g. `dismissal_parent_leave`). Do not collapse kinds.

---

## 3. When parent may leave

Parent may leave **only when all** of the following hold:

| # | Gate | Fail-closed if false |
|---|---|---|
| 1 | Signed in as **parent seat** (not student; not staff-as-parent chrome merge) | No leave control |
| 2 | Has a **live waiting trip** on a specific `line_id` from successful check-in / I’m first | No leave control |
| 3 | That trip is **not** already terminal via parent `left` or staff `released` for those children on that line | Hide or no-op |
| 4 | School_date / line still the active dismissal context for that trip (server clock) | No leave |
| 5 | Caller is the **same parent** who owns the trip (no acting-for-another-parent) | Deny |
| 6 | Restrictions: leave does **not** bypass blacklist. Leave is allowed so a restricted-or-blocked parent is not stuck displaying a false “waiting” state **if** they somehow had a trip; new check-in remains fail-closed with **Check in failed** (no reason) | Check-in law unchanged |

**Not required to leave**

- Staff walk present
- Plate readable
- GPS / geofence
- All household children selected
- Confirming pickup happened

**Server is source of truth** for “am I waiting.” Client cannot forge leave for another line, another parent, or children not on the trip.

---

## 4. What leaves (scope of the action)

| Dimension | Rule |
|---|---|
| **Line** | **This line only.** Leaving line A does not touch line B. |
| **Children** | **Exactly the student_ids on the live check-in trip** (the chips they selected when they checked in). **Not** the whole household, not “all linked kids,” not kids only on another line. |
| **Partial leave** | **Out of v1.** No multi-select uncheck to drop one twin while keeping the other on the same trip. To change the set: leave the trip (all of it), then check in again with the desired chips. |
| **Vehicles** | Leave does not add/remove vehicles. No self-pick of own car. |
| **Other parents** | No effect on neighbors’ order except server recomputes positions; parent DTO still shows **own XX only** when still waiting, never totals. |
| **Stage / curb lists** | After `left`, those children are not “waiting parent in line” for this line. Stage pre-call rules stay per existing pack (this line’s children). `left` is not a substitute for staff knowing a child was handed off — that is `released`. |

**Twins / multi-child:** Same trip chips leave together. Never blend Saydee’s line A trip with Sydnee’s line B trip into one leave.

---

## 5. Confirm, undo, copy

### Confirm vs one-tap (PM lock)

| Decision | Lock | Rationale |
|---|---|---|
| **Confirm before leave** | **Yes — lightweight confirm** (sheet or dialog: leave this line? primary Leave / cancel) | Leaving drops XX and graph place; accidental tap during curb stress is costly. Still one decision, not a multi-step wizard. |
| **One-tap no confirm** | **Declined v1** | Too easy to fat-finger while photographing / switching lines. |
| **Type-to-confirm / hold 3s** | **Declined v1** | Overkill vs staff release; parent leave is not destructive of grades or records. |

### Undo

| Decision | Lock |
|---|---|
| **Undo leave** | **No timed undo v1.** To wait again, parent **checks in again** (photo ahead or I’m first) with the children for that stop. |
| **Reason** | Re-entry must rebuild graph honestly (who is ahead now). Silent undo would lie about order. |

### Copy (parent)

| State | Copy rules |
|---|---|
| Waiting | Existing: success already showed own **XX**, no total. Live trip may still show status + XX via `dismissal_my_trip`. |
| Leave confirm | Name **this line** if multiple lines exist; list **this trip’s children** (first names). No neighbor data. |
| Leave success | e.g. pattern: out of this line / no longer waiting — **no** “picked up,” **no** reason codes, **no** school count. Exact strings are designer + copy pass. |
| Leave fail | Generic fail (no reason). Same posture as check-in fail. |
| Not waiting | No leave CTA (check-in / I’m first path as today). |

Noun in UI: prefer **Leave line** / **I’m not waiting** over **Checkout** so parents do not confuse with staff **released** pickup. Final label is a designer question (§11).

---

## 6. After leave (staggered A→B)

1. Parent `left` on line A → trip A terminal; not in A’s live order.
2. Parent **may immediately** start check-in on line B with **other** linked children (staggered second stop).
3. **Empty line / I’m first** mechanics **unchanged**.
4. Two I’m-first conflict remains curb-only; parent still only own status.
5. Checking into B does not revive A.
6. If parent left A by mistake: check into A again (new graph place) — no undo buffer.
7. Staff may still `released` on A for pickup audit after parent left; parent UX already “not waiting.”
8. Parent still never sees totals or neighbor plates on A or B.

---

## 7. Hats / dual-hat / duty wall

| Seat | Leave-line UI | Staff `released` |
|---|---|---|
| **Parent** | Yes — `/parent/ride` (and Ride-active vehicle subroutes only as designer places; **action is trip-scoped on Ride**) | No |
| **Student** | No | No |
| **Teacher (no duty)** | No | No |
| **Curb duty** | No parent leave chrome | Yes — existing checkout |
| **Stage duty** | No | Per existing pack (not parent leave) |
| **Office / Manage altitude** | No parent leave; no office Ride tray tab | Duty tools under Manage |
| **Dual-hat** (staff + parent) | Leave only under **parent seat** tray (Home · Ride · Ask). Switching to office/teacher chrome does **not** merge trays (§31.4b). Duty wall RPCs unchanged. | Duty seat only |

**Hard rules (unchanged pack + this feature)**

- Restrictions fail-closed on check-in; fail copy has **no reason**.
- LPR never inserts people.
- No Ask tool / no Ask dump of line photos or leave events.
- Not a grade; nothing Approves.
- No anon / token parent.
- No `is_staff` widen for queue read.
- Private storage; 7-day purge; superintendent photo archive law unchanged.

---

## 8. User stories

Each story: **seat · trigger · acceptance · out of scope.**

### US-CO-01 — Leave while waiting

**Seat:** Parent.  
**Trigger:** Parent has successful live trip on line A; opens Ride; chooses Leave; confirms.  
**Acceptance:**

- Leave CTA only while server says waiting on that trip.
- Confirm shows this line + this trip’s child first names only.
- On confirm, server appends `queue_events.kind = left` for `line_id` A + those `student_ids`; `occurred_at` server.
- Parent DTO: not waiting on A; no XX for A.
- Parent cannot write `released`.
- Fail path: generic failure, no reason string.

**Out of scope:** Staff duty UI; partial child deselect; undo toast that restores graph place.

### US-CO-02 — Cannot leave when not waiting

**Seat:** Parent.  
**Trigger:** No live trip (never checked in, already `left`, or staff `released`).  
**Acceptance:** No enabled Leave CTA (hidden or disabled with non-leaky empty/check-in state). Client-only leave call rejected server-side.  
**Out of scope:** Explaining *why* (restriction vs released vs left).

### US-CO-03 — Trip children only, not household

**Seat:** Parent with 2+ linked children.  
**Trigger:** Checked in line A with child 1 only; leaves.  
**Acceptance:** Only child 1 leaves A. Child 2 unchanged (not on A). Household not auto-included.  
**Out of scope:** “Leave all my kids everywhere.”

### US-CO-04 — Staggered A → B

**Seat:** Parent.  
**Trigger:** `left` on A (child 1); check-in B (child 2).  
**Acceptance:** B check-in allowed under normal rules. A and B orders independent. Twins not merged into one trip. Own XX on B only; no totals.  
**Out of scope:** One check-in covering both lines; auto-suggest the other twin.

### US-CO-05 — Staff `released` still works

**Seat:** Curb duty.  
**Trigger:** Staff checkout while parent still waiting **or** after parent `left`.  
**Acceptance:**

- Waiting case: `released` ends waiting; pickup confirmation; parent Leave disappears.
- Already-`left` case: `released` still records pickup; no crash; parent still not waiting.
- Photo check-in still ≠ `released`.

**Out of scope:** Parent button that means picked-up.

### US-CO-06 — Dual-hat isolation

**Seat:** Profile with parent + staff.  
**Trigger:** Parent tray Ride vs duty/Manage chrome.  
**Acceptance:** Leave only on parent Ride. Duty wall unchanged. No office Ride tray tab. No tray merge.  
**Out of scope:** Single chrome that mixes curb list + parent Leave.

### US-CO-07 — Restriction / fail-closed posture

**Seat:** Restricted parent (or blocked child link).  
**Trigger:** Check-in attempt; and leave if a trip exists.  
**Acceptance:** Check-in remains **Check in failed** with **no reason**. Leave never grants pickup rights or clears restrictions. LPR still never inserts people.  
**Out of scope:** Showing blacklist reason on leave or check-in.

### US-CO-08 — Visibility / firehose

**Seat:** Parent.  
**Trigger:** Any leave success/fail.  
**Acceptance:** DTO still: own trip, own children, own XX only when waiting. No neighbor plates, no “you were N of M,” no other parents’ `left`/`released`.  
**Out of scope:** School-wide line map for parents.

### US-CO-09 — Empty line / I’m first unchanged

**Seat:** Parent.  
**Trigger:** After leaving, becomes first on empty line or uses I’m first.  
**Acceptance:** Existing I’m first / empty-lane / two-firsts conflict laws unchanged. Leave does not special-case first.  
**Out of scope:** GPS “arrived first.”

### US-CO-10 — Not a grade / no Ask

**Seat:** Any.  
**Trigger:** Leave event exists.  
**Acceptance:** No gradebook row; no Approve; Ask cannot perform leave or ingest line photos as a tool.  
**Out of scope:** Diary/ledger product hooks (separate epics).

---

## 9. Explicit declines (v1)

| Decline | Why |
|---|---|
| GPS / geofence auto-checkout | CEO pack bans GPS order; auto-exit is worse (false leave). |
| Auto-leave on LPR read of own plate | Photo ≠ released; LPR is not presence truth. |
| Parent mints `released` / “mark picked up” | Pickup confirmation is curb only. |
| Parent sees line total or neighbor plates | Firehose ban (RIDE-S1 T1). |
| Reason codes on leave/check-in fail | Same as restriction copy law. |
| One-tap leave without confirm | Fat-finger risk. |
| Timed undo that restores prior XX | Lies about predecessor graph. |
| Partial leave (drop one chip mid-trip) | Twins/complexity; re-check-in is the clean path. |
| Household leave-all-lines | Staggered two-line product needs per-line trips. |
| Placard / keypad / poles / RFID as leave mechanism | Out of v1 pack. |
| Student or teacher tray Leave | Parent seat only. |
| Office Ride tray tab for parity | Manage altitude (§13.13b / §34.2). |
| Ask performs leave or reads queue | No Ask tool. |
| Client-forged order / client `occurred_at` | Server seq only. |
| Public photo URLs / leave as grade | Pack + MVP law. |
| Nanny’s own login leave | Out of v1 (nanny car on parent vehicles only). |
| SMS leave | Out of v1. |
| Face-match driver to allow leave | Out of v1. |

---

## 10. Acceptance deltas (paper pack)

When CoS reconciles the v1 pack (not this card’s job to edit those files unless asked):

| Doc | Delta |
|---|---|
| `car-rider-acceptance.md` | Replace L-08 row; add L-08a/b; clarify L5 parent `left` ≠ `released`. |
| `car-rider-plan.md` | Parent hat + mechanic: parent may `left`; staff `released` stays. |
| `car-rider-architecture.md` | Parent leave RPC; kinds remain distinct; checkout/pickup row = curb only. |
| `car-rider-research.md` | Note CEO override: parent self-exit for staggered; staff still confirms pickup. |
| `car-rider-security.md` | Parent leave RPC under parent auth; still no firehose; still no `released` from parent. |
| `docs/ui-design.md` §13.13b | **Designer after option pick** — not this card. |

**Non-acceptance (still):** placard-only product, auto-release, “of 40,” reason on fail, public photos, twin blend, client-forged order, parent-written `released`.

---

## 11. Designer handoff (questions only — no option packs)

**Role boundary:** `ui-ux-designer` builds option packs. PM does **not** sketch competing packs. PM will **choose** later. Do **not** patch `docs/ui-design.md` until choice.

### Recommended designer questions

1. **Placement of Leave on `/parent/ride`** while waiting: sticky footer vs inline on trip status card vs header overflow? (Must not look like curb duty checkout.)
2. **Label noun:** “Leave line” vs “I’m not waiting” vs other — avoid “Checkout” / “Released” / “Picked up.”
3. **Confirm pattern:** bottom sheet vs centered dialog; how child chips + line name read at a glance in sun/glare.
4. **Post-leave empty state:** immediate path to check into **another** line (staggered) without implying household blob.
5. **Waiting state hierarchy:** own XX + trip children + Leave vs shutter/I’m first — what is primary when already in line?
6. **Vehicles subroutes** (`/parent/vehicles…`): Leave live there too, or Ride hub only?
7. **Dual-hat:** any accidental duty-pattern bleed (walk list chrome) to forbid in options.
8. **Disabled/hidden Leave** when not waiting — which empty/check-in frame?
9. **Success feedback** after leave: toast vs inline status; still no totals.
10. **Accessibility:** one-handed in car; minimum hit target; confirm cancel far from primary.

### Non-goals for designer on this card

- Staff curb redesign
- Office tray Ride tab
- Icon option reopen (RearPlate locked)
- Drawing GPS / map leave
- Implementing screens in `src/`

### Deliverable from D1

Option pack (2–3) for parent Ride leave-line chrome only, grounded in this PM file + §13.13b chrome law. Research-feedback only if designer needs evidence CoS already staffed.

---

## 12. Filing order for CoS

1. **Done (this card):** PM stories + law → `notes/company/ride-parent-checkout-pm.md`
2. **Next:** CoS staffs **ui-ux-designer** options (`t_924ddb5b` / RIDE-CO-D1) — **not Engineering**
3. **Then:** PM **chooses** option (separate small card or same epic comment)
4. **Then:** Designer/PM patch `docs/ui-design.md` §13.13b (+ pointer notes if needed)
5. **Then:** CoS paper-reconcile L-08 in `car-rider-*.md` if not folded into eng brief
6. **Only after GATE / CoS grant:** Engineering — parent `left` RPC + parent Ride UI + tests; staff `released` remains; **kelyra-qa-loop** only on that Build send

**Do not:** dispatcher-ready eng from P1 alone; qa-loop from this paper card; ARM widen.

---

## 13. OPEN ISSUES / NEXT

**OPEN ISSUES for product law:** none blocking designer options. Exact microcopy strings deferred to designer + PM choose.

**RECOMMENDED NEXT ACTION:** CoS closes/completes `t_4a01e0f6` when satisfied; staff **ui-ux-designer** on RIDE-CO-D1 (`t_924ddb5b`). Parent tracker `t_bc63db16` stays umbrella. **No Engineering. No kelyra-qa-loop.**

**Handoff**

| Field | Value |
|---|---|
| OBJECTIVE | Parent self leave-line (`left`) product law |
| RESULT | Spec filed at `notes/company/ride-parent-checkout-pm.md` |
| FILES | `notes/company/ride-parent-checkout-pm.md` only |
| VERIFICATION | Stories US-CO-01…10; left vs released; L-08 replacement; declines; designer questions; filing order |
| ESCALATION NEEDED | No — CoS owns D1 staffing |
| RECOMMENDED NEXT ACTION | Designer options pack; PM choose later |
