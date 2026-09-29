# Clear pickup restriction — IQG intent

Date: 2026-09-27
Card: t_23c4ec74
Author: qa-supervisor
Status: QA Supervisor APPROVED

CEO lock (Chuck 2026-09-27): Fix the product so the office can clear a pickup restriction on the ride screen. Do not leave clear as a database-only step.

Locked lines (do not drop):
Surface: both
Persona: office
Seat: office
Motion: none
AC-BAN-CLEAR-1: After a pickup restriction is saved, the office ride screen has a control to clear it.
AC-BAN-CLEAR-2: Clearing it removes that restriction. It does not remove a different family's restriction.
AC-BAN-CLEAR-3: Saving a restriction still works.

## DESIGN STAMP

Feature/bug: clear pickup restriction
Quality goals: AC-BAN-CLEAR-1, AC-BAN-CLEAR-2, AC-BAN-CLEAR-3
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_23c4ec74 run 3698
Intent gaps remaining: none

PM stamp is a sibling card (t_cbc3cc46). This note does not speak for PM.

## Intent

Hats. Office seat only. Administrator and superintendent already save on this screen (ride.restrict is school for both). Dual-hat office+teacher and office+parent clear on the office ride screen while seated as office. Parent, teacher, and student seats do not get a clear control. Not a new hat.

Entry. The screen that already saves the restriction: Ride office, /admin/ride, Pickup restriction card, Save restriction. Phone and web. Motion none: a visible control on that card, not a gesture and not a new ride screen. Ask is not the entry. The Ask restrict gap stays a non-goal.

Lifecycle. Save still works: student id, optional parent id, office reason never shown to the parent. After that save, the same screen has a control to clear that restriction. Clear removes that saved restriction. It does not remove a different family's restriction, and it does not remove a different parent's restriction on the same child. While it is active, that parent still sees Check in failed with no reason. After clear, that pair is no longer restricted. Clear is not a database-only step.

Multiplicity. The saved restriction is the pair this screen saved (evidence: parent-1 on Jordan). Clear that pair only. A second family's restriction stays. If the other parent on the same child has their own restriction, it stays. Do not clear the school, and do not clear every restriction on the student when the saved row names a parent. Vehicle-scoped rows are not this lock. The current save control does not set a vehicle. Do not add a vehicle picker.

Non-goals. No new ride screen. No database-only clear. Do not clear the live sandbox ban from this card, or as a substitute for the screen control. No Ask restrict tool. No notify auto fan-out. No parent-visible reason. No clear control on parent, teacher, or student ride. No confirm card. Do not unblock t_ba828734. Do not parent work onto t_ba828734.

## DITL IMPACT

Change: office ride screen can clear a saved pickup restriction. Save stays.
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: DITL-O-04 already expects admin-ride clear/unban (plan step 12, case UI-04 set/clear, UI-01 teardown remove ban). This lock makes the product match that plan. CoS does not file DITL-UPDATE. This seat did not rewrite plans or cases.

## PROVE-OUT OBJECTIVE

Full featured versus this stamp means the office saves a pickup restriction on the existing ride screen, then a control on that same screen clears that restriction and not a different family's. Saving still works. No new ride screen. Clear is not a database-only step. Verify before done, experience-first, not unit-only.

1. Office administrator, phone and web: on the existing Ride office screen, save a pickup restriction for parent-1 on Jordan. After save, a visible control clears that restriction. That pair is gone. A different family's restriction, saved the same way, is still active. The other parent on Jordan, if restricted, is still restricted.
2. The same Save restriction control still saves a restriction. Do not remove Save to add Clear.
3. Superintendent uses the same office ride screen and the same clear control. Not a new seat and not a new screen.
4. Parent, teacher, and student seats have no clear control. Dual-hat office+parent clears only while seated as office, on the office ride screen, not on parent ride. The parent never sees the office reason. While the restriction is active, that parent still gets Check in failed with no reason. After clear, that pair is no longer restricted.
5. Clearing is not a database edit, a sandbox SQL clear, or a new ride screen. Absence of a new ride screen is correct (NON-GOAL ABSENT). Do not clear the live sandbox ban as the proof. Do not unblock or parent work onto t_ba828734.

Evidence: STATIC is aid only. LIVE UI on phone and web is the stamp PASS for the clear control and for save still working. Do not send AC-BAN-CLEAR-1, AC-BAN-CLEAR-2, or AC-BAN-CLEAR-3 to engineering as defects. Loop passed is not product-complete. Next qa-engineer card: CoS t_b9e5793a staffs prove-out from this OBJECTIVE after the Surface workflow.
