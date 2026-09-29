# Clear pickup restriction

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_cbc3cc46`
**Lane:** `t_a5089ed5`
**Finding:** `t_ba828734` stays blocked and unassigned. Do not unblock. Do not parent work onto it. Do not clear the live sandbox ban.
**QA Supervisor card:** `t_23c4ec74` (their stamp is not this note)
**Continuation:** `t_b9e5793a` waits for both stamps. Do not staff Engineering from this card.
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Fix the product so the office can clear a pickup restriction on the ride screen. Do not leave clear as a database-only step.
**Case:** DITL-O-04-UI-01
**Status:** PM DESIGN STAMP APPROVED (`t_cbc3cc46`). Not Eng from this seat. No `src/` from this card. No new ride screen.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: clear pickup restriction
Quality goals: AC-BAN-CLEAR-1, AC-BAN-CLEAR-2, AC-BAN-CLEAR-3
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_cbc3cc46
QA Supervisor: pending t_23c4ec74
Intent gaps remaining: none
```

## Lock lines

Surface: both
Persona: office
Seat: office
Motion: none
AC-BAN-CLEAR-1: After a pickup restriction is saved, the office ride screen has a control to clear it.
AC-BAN-CLEAR-2: Clearing it removes that restriction. It does not remove a different family's restriction.
AC-BAN-CLEAR-3: Saving a restriction still works.

## 0. What is broken

Office ride screen is `src/app/admin/ride/index.tsx` (Ride office, `/admin/ride`). The Pickup restriction card has Student id, Parent id (optional), Office reason, and Save restriction. Save always calls `setPickupRestriction` with `active: true`. There is no clear control. DITL-O-04-UI-01 saved a restriction for parent-1 on Jordan and left the ban active.

`setPickupRestriction` already passes `p_active` to `office_set_pickup_restriction`. The screen never sends false. That RPC inserts a new row when `p_id` is null, even if `p_active` is false. It updates `active` only when `p_id` is set. A control that calls the RPC with no id and `active: false` inserts a second inactive row and leaves the saved ban active. That is not a clear.

`ride_is_restricted` blocks when an active row matches the student and (`parent_id` is null or equals the checking-in parent). Clear means that saved row no longer blocks. `active = false` on that row is enough. No new table. No new ride screen.

Office for this RPC is `ride_is_office`: superintendent, administrator, or `also_administrator`. Persona and seat stay office.

## 1. Stories

**Office, phone and web.** After office saves a pickup restriction on the ride screen, that same screen has a control to clear it. Not a database step. Not a new ride screen.

**That pair only.** Clearing parent-1 on Jordan removes that restriction. It does not remove a different family's restriction.

**Save still works.** Save restriction on that card still saves.

**Later visit.** The control stays on the Pickup restriction card. It is not a toast undo. Office identifies the saved restriction the same way they saved it: student id and parent id on that card. No roster.

## 2. Acceptance

These match the lock. They do not add a second product choice.

**AC-BAN-CLEAR-1.** After a pickup restriction is saved, the office ride screen has a control to clear it. The control is on the existing Pickup restriction card, phone and web, including when office returns later. Not database-only. Not a new ride screen.

**AC-BAN-CLEAR-2.** Clearing it removes that restriction. It does not remove a different family's restriction. Clear deactivates the saved active row for that student and parent. It must not insert a second inactive row and leave the saved ban active. Another family's row stays. A student-wide row (`parent_id` null) is not parent-1's row and is not cleared when clearing parent-1. Another student's restriction is not cleared.

**AC-BAN-CLEAR-3.** Saving a restriction still works. Save restriction still saves with the restriction active. Clear does not replace Save.

**Must hold with those three.** Office reason stays off the parent copy. Do not clear the live sandbox ban as a substitute for the screen control. Do not unblock `t_ba828734`. Clearing an already-cleared pair does not recreate an active ban and does not trap office on the screen.

## 3. Hats and non-goals

| Hat | This lock |
|---|---|
| Office (administrator, superintendent, also_administrator) | Clear control on the existing ride screen. |
| Office who is also teacher or parent | Same office seat, same screen. No second entry. |
| Teacher-only, parent, student | No new clear entry. |

Entry is the existing Ride office Pickup restriction card, phone and web. Lifecycle is save (already there) and clear (this control). Multiplicity is one student plus one parent per clear. Other families stay.

Non-goals: a new ride screen, roster, or ban list; database-only clear as the product; clearing the live sandbox ban; an Ask restrict or clear tool (Ask stays the existing GAP; motion none); a notify-on-clear screen, an audit screen, or a vehicle-scoped clear control; showing the office reason to the parent; changing fail-closed check-in copy.
