# RIDE-CO-PM-LOCK — Parent leave-line chrome pick

**Date:** 2026-09-09  
**Author:** product-manager (Kelyra)  
**Epic:** `t_bc63db16`  
**Sources:** `notes/company/ride-parent-checkout-pm.md` (law + US-CO-*) · `notes/company/ride-parent-checkout-options.md` (A/B/C)  
**Status:** **LOCKED pick** — chrome choice only. No `src/`, SQL, Edge, git, qa-loop, or kanban children on this card. **Do not** patch `docs/ui-design.md` here — that is a separate designer card.

---

## 1. Chosen option

| Field | Value |
|---|---|
| **Option id** | **A** — Trip card owns Leave (status-first) |
| **Base stance** | Waiting is a first-class **trip card**. Leave is a **secondary** control on that card. Same-line check-in tools **recede** while waiting. |
| **Micro-adoptions** | Named from B/C below (not full B or C) |

### 1.1 Locked micro-adoptions (from B / C)

| # | Source | Adoption |
|---|---|---|
| 1 | **B** | Confirm **cancel** label = **Keep waiting** (not plain Cancel) — clearer under curb stress. |
| 2 | **A** (keep) | Confirm **primary** label = **Leave line** (not C’s “I’m not waiting”). Shorter; still not checkout/released/picked up. |
| 3 | **A / C** | **Vehicles:** Leave chrome on **`/parent/ride` hub only**. No Leave on `/parent/vehicles…`; no second confirm surface there. |
| 4 | **A** | Same-line **Photo** / **I’m first** **disabled** while waiting, with one mute helper: leave this line before checking in here again. Trip children on the card are **read-only** (server trip scope). |
| 5 | **Shared / A** | Confirm = parent-safe **ConfirmSheet shape** (or thin visual sibling): brand **Primary**, never Danger, **no** type-name, **no** “This cannot be undone.” delete coda. Cancel/Keep waiting below primary with large gap; both ≥44 hit. |
| 6 | **A** | Leave CTA: full-width **Ghost** (or Secondary) **inside** the trip card under XX + child first names. **Not** sticky footer. **Not** trailing-only ListRow. |
| 7 | **A** | After leave: replace trip card with short inline success; **restore** check-in stack for staggered B. Success copy: out of this line only — no XX, no total, no “picked up.” |
| 8 | **A** | Live trip card stays **pinned** for the waiting line; switching line chips may surface check-in for another line under a quiet “Another line” frame **without** hiding Leave for the live trip. |

### 1.2 Explicitly **not** adopted

| From | Declined element | Why |
|---|---|---|
| **B** | Sticky Leave footer above tray | Fights floating tray; edges toward duty chrome; two strong CTAs risk. Thumb reach loses to note-home tone. |
| **B** | Check-in stack fully visible/editable weight while waiting | Same-line double-join confusion; chip vs trip-scope ambiguity. |
| **B** | Optional vehicles banner Leave path | Hub-only is enough; avoids second surface. |
| **C** | Quiet ListRow + trailing Leave as primary pattern | Weak discoverability under curb stress (US-CO-01). |
| **C** | Check-in remains full primary weight while waiting | Invites accidental re-check-in; Leave too quiet for CEO “real way to leave.” |
| **C** | Primary confirm noun **I’m not waiting** | Prefer shorter **Leave line** on A’s card + sheet. |
| Any | Danger red Leave; header overflow; FAB; swipe-to-leave; one-tap; type-to-confirm; hold-3s | Shared declines / PM §5 / §9. |

---

## 2. Why this pick

1. **US-CO-01 discoverability:** Leave co-located with own XX + this trip’s children on one trip object. C’s quiet trailing fails when the parent is already stressed at the curb; CEO asked for a real exit path.
2. **left ≠ released posture:** Status-first trip card reads like a parent note, not a curb checkout list or duty footer. Sticky B raises duty-confusion risk (options matrix).
3. **US-CO-03 trip scope:** Card children are read-only from the **server trip**; disabled same-line re-check-in avoids implying chip toggles edit a live wait (no partial leave v1).
4. **US-CO-04 staggered A→B:** Post-leave restores the check-in stack on the same hub; line chips can still target B without a second surface.
5. **US-CO-08 calm / firehose:** No totals, no neighbor data; success is short “out of this line.”
6. **Tray / dual-hat law:** Parent `/parent/ride` only; no office Ride tab; no vehicles Leave; IconName `ride` unchanged.
7. Designer non-binding recommend matched product law; PM does not reopen A/B/C packing.

**Rejected full B:** one-handed thumb is valuable but secondary to parent tone and tray geometry on this product.  
**Rejected full C:** calm is good; missing Leave under stress is not.

---

## 3. Acceptance (one paragraph for engineering)

On parent-seat `/parent/ride` only, while the server reports a live waiting trip, show a first-class trip card (line name, `You are {XX}` with no “of N,” this trip’s child first names read-only) with a full-width Ghost/Secondary **Leave line** control inside the card; same-line Photo / I’m first are disabled with a mute helper, and Leave must not appear when not waiting, after parent `left`, after staff `released`, on student/teacher/office/duty seats, or on `/parent/vehicles…`. Tapping Leave opens a lightweight parent-safe ConfirmSheet-shaped confirm (no type-name, no delete coda, brand Primary **Leave line**, Ghost **Keep waiting** below, a11y label includes line + child names); on confirm the client calls the parent leave path only, server appends `queue_events.kind = left` for this `line_id` + exactly this trip’s `student_ids` with server `occurred_at`, parent never mints `released`, staff curb `released` still works and remains pickup confirmation, fail is generic with no reason, success replaces the trip card with short “out of this line” copy (no XX, no total, no picked-up language) and restores the check-in stack so staggered check-in on another line is possible under existing empty/I’m-first law; no undo (re-check-in rebuilds order), no partial leave, no household leave-all, no neighbor plates/totals, no new IconName, no sticky footer/FAB/swipe, dual-hat Leave only under parent tray Home · Ride · Ask.

---

## 4. Out of scope (unchanged — still declined v1)

- Parent-written **`released`** / “mark picked up”
- Office / teacher / student Ride Leave; **office tray Ride tab**
- **One-tap** leave (no confirm); type-to-confirm; hold-to-confirm
- Timed **undo** that restores prior XX
- Partial leave / household leave-all-lines
- GPS / geofence / LPR auto-leave; SMS leave; face-match
- Neighbor plates, line totals, reason codes on fail
- Ask tool leave or queue photo ingest; gradebook row
- Staff curb redesign; duty walk-list chrome on parent Ride
- New IconName / RearPlate reopen
- Nanny own-login leave
- Implementing or shipping without GATE + designer §13.13b patch

Product law SoT remains `ride-parent-checkout-pm.md` §1–9 and US-CO-01…10. This lock only chooses chrome among the option pack.

---

## 5. Chrome summary (for designer §13.13b patch)

| Element | Lock |
|---|---|
| Placement | Trip **Card** on `/parent/ride` while waiting |
| Leave CTA | **Leave line** — Ghost/Secondary in card |
| Confirm title | `Leave {line name}?` |
| Confirm body | Stop waiting on this line for {trip first names}; can check in again; **not pickup** |
| Confirm primary | **Leave line** (brand Primary) |
| Confirm cancel | **Keep waiting** (Ghost, below) |
| Success | `You’re out of {line name}.` (or equivalent short; no XX/total/picked-up) |
| Fail | Generic; no reason |
| Same-line check-in while waiting | Disabled + mute helper |
| Vehicles | Hub only — no Leave |
| Motion | Standard sheet; instant content swap; no XX morph / confetti |
| Primitives | Card, Chip/ChipRow, Primary/Ghost, ConfirmSheet-shape; prefer no new glyphs |

Exact microcopy may be tightened in the ui-design patch as long as nouns stay off Checkout / Released / Picked up and the locks above hold.

---

## 6. Filing order (CoS owns cards — PM does not file kanban children)

1. **This lock** — `notes/company/ride-parent-checkout-lock.md` (done on this card).  
2. **Spec-doc (next):** `ui-ux-designer` patches **`docs/ui-design.md` §13.13b** (and §34.2 pointer if needed) to **Option A + locked micro-adoptions only**. Separate card. **PM does not patch `ui-design.md` on this card.**  
3. **Paper reconcile (CoS, as needed):** L-08 / L-08a/b into `car-rider-*.md` if not folded into eng brief.  
4. **Engineering (only after GATE / CoS grant):** parent `left` RPC + parent Ride UI per this lock + tests; staff `released` remains; run **`kelyra-qa-loop`** only on that Build send.  
5. **Not before GATE:** no dispatcher-ready eng from lock alone; no qa-loop from this paper card.

---

## 7. Notify

**ui-ux-designer** must patch `docs/ui-design.md` §13.13b to this pick on a **separate** card after CoS staffs it. Do not implement app code from this lock. Do not treat designer recommend as still open — **A + micro-adoptions above is PM-locked.**

---

## 8. Handoff

| Field | Value |
|---|---|
| OBJECTIVE | PM lock parent leave-line chrome among A/B/C |
| CONTEXT | Epic `t_bc63db16`; options + PM stories filed |
| RESULT | **Option A** locked + B/C micro-adoptions §1.1 |
| FILES | `notes/company/ride-parent-checkout-lock.md` |
| VERIFICATION | Option id A; acceptance §3; OOS §4; no ui-design/src/SQL/git/qa-loop/kanban |
| OPEN ISSUES | None blocking spec-doc. Eng must unlock parent-safe confirm primitive (no delete coda) when building. |
| ESCALATION NEEDED | No |
| RECOMMENDED NEXT ACTION | **CoS** completes this choose card, then staffs **spec-doc** (designer → `docs/ui-design.md` §13.13b) then **engineering** when ARM/loop allow. |
