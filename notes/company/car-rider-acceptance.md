# RIDE-Q1: Acceptance plan — car-rider photo/plate (not a Build send)

**Date:** 2026-09-05  
**Author:** chief-of-staff  
**Status:** PLAN ONLY. Hold until **RIDE-GATE** send.

Pack: `car-rider-research.md` / `plan.md` / `architecture.md` / `security.md`.

---

## 0. Laws

| ID | Law |
|---|---|
| L1 | Check-in = photo of car ahead **or** I’m first, **per line**. Not placard, not GPS. |
| L2 | Vehicles on parent (incl. grandma/nanny) with today/range/indefinite. No self-pick of own car at shutter. |
| L3 | Order per line; staff walk / order_fix / graph. Server seq. |
| L4 | Duty wall. Two lines. Staggered: checkout line A then check-in line B. |
| L5 | Checkout = curb `released`. Photo ≠ released. Parent `left` ≠ released. |
| L6 | Parent: own XX, no total, no neighbor plates. Fail: Check in failed, no reason. |
| L7 | No anon / token parent. |
| L8 | Linked+picked children. Restriction fail-closed. |
| L9 | RPC writes; server LPR; type or STT plate text. |
| L10 | 7-day purge photos+events; superintendent archive day’s photos until delete. |
| L11 | LPR never inserts people. |
| L12 | Private storage. No Ask tool. Not a grade. |
| **L-08** | Parent **can** leave **this line** while waiting → event **`left`** (this `line_id` + trip children only). Parent **cannot** mint **`released`**. Staff curb **`released`** remains pickup. CEO 2026-09-09 override; SoT `ride-parent-checkout-pm.md` §2. |
| **L-08a** | After parent `left` on line A, parent **may** check into line B with **other** linked children (staggered). Twins never auto-mixed. |
| **L-08b** | Parent leave control only on **parent-seat** Ride (`/parent/ride` family). Dual-hat duty wall unchanged; no office Ride tray tab. |

**L-08 history:** Old pack row “Parent cannot checkout themselves” is **void** as a ban on parent-initiated line exit. Replacement above = live law (Option A chrome + ui-design §13.13b). Do not re-read the void ban.

**Out of v1:** poles, GPS, SMS, face match, subpoena desk, nanny’s own login.

---

## 2. Extra cases (add to prior matrix)

| ID | Sev | Pass |
|---|---|---|
| C-09 | P0 | I’m first on empty line → position 1, success XX=1 |
| C-10 | P0 | Two I’m-first → curb conflict; parent still own status; staff order_fix |
| C-11 | P0 | Restricted → Check in failed, no reason string |
| C-12 | P0 | Success copy has XX, not “of N” |
| V-05 | P0 | Parent adds nanny car, today-only; next school day does not match |
| V-06 | P0 | Parent voids/removes vehicle |
| V-07 | P0 | Type or STT plate on unreadable / staff attach |
| L-06 | P0 | Two lines independent orders |
| L-07 | P0 | Checkout line A; check-in line B other child |
| L-08 | P0 | Parent **can** leave this line while waiting → `left` (trip + line only); cannot mint `released`; staff `released` still works. See `ride-parent-checkout-pm.md` §2 / Option A. |
| L-08a | P0 | After `left` on A, check-in line B other linked children (staggered); twins never auto-mixed |
| L-08b | P0 | Leave control only on parent-seat Ride hub family; no office Ride tray tab |
| H-08 | P0 | Day 8: unarchived photos+events gone |
| H-09 | P0 | Super archive day 0: those photos remain after day 8; events still gone |
| H-10 | P0 | Administrator cannot archive (superintendent only) |

S1-01…21 must have evidence after send.

**Non-acceptance:** placard-only, auto-release, “of 40”, reason on fail, public photos, `is_staff` queue, twin blend, client-forged order, no 7-day purge.

**GATE:** held until Chuck sends.
