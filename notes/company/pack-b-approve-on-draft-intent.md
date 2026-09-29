# Pack B Approve on saved homework draft — IQG intent

Date: 2026-09-27
Card: t_c35bd2e8
Author: qa-supervisor
Status: QA Supervisor APPROVED

CEO lock (Chuck 2026-09-27): Fix the product so Approve appears on a saved homework draft in the teacher review. The parent seat must keep hiding Approve.

Locked lines (do not drop):
Surface: both
Persona: teacher
Seat: teacher
Motion: none
AC-PACKB-1: After a teacher saves a keyed homework draft, Pack B Approve or Accept recommendation appears for that draft.
AC-PACKB-2: The teacher can accept that draft from that control.
AC-PACKB-3: The parent seat still does not show Approve.

## DESIGN STAMP

Feature/bug: Pack B Approve on saved homework draft
Quality goals: AC-PACKB-1, AC-PACKB-2, AC-PACKB-3
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_c35bd2e8 run 3696
Intent gaps remaining: none

PM stamp is a sibling card (t_1da8d81a). This note does not speak for PM.

## Intent

Hats. Teacher seat (persona teacher) must see the existing Pack B Approve or Accept recommendation on a saved keyed homework draft, and must be able to accept that draft from that control. Parent seat must keep hiding Approve. Dual-hat teacher+parent is this case (DITL-DH-01): Teach seat shows the control; Parent seat does not. Office, superintendent, and student stay unable to Approve keyed drafts. That is existing law, not a new seat.

Entry. Phone and web (Surface: both). Motion: none. The draft is already in the teacher inbox. The control appears on the existing teacher review of that saved draft. Do not design a new review screen. Do not require a re-capture to see it. The control already exists for other drafts. Make it appear here.

Lifecycle. Save a keyed homework draft (start, already possible). Open that draft's existing teacher review (the miss: inbox showed draft 1f4e9f54 and the review offered no Pack B). The control is visible. The teacher accepts from that control (finish). Leaving the review without accepting does not grade. Parent seat switch still hides Approve (already worked; keep it). No new un-approve path.

Multiplicity. The control is for that draft, not a batch approve of the inbox. A filed student (Jordan Lee shape, own class) must not be a dead end. Existing walls stay: unassigned cannot publish; twins are not auto-picked; own-class Teach seat only. Parent child isolation stays (Morgan only, no teach-roster bleed).

Non-goals. No new review screen. No new product. No label change required (Pack B Approve or Accept recommendation both satisfy the lock). Do not drop the parent hide. Do not add office or student Approve. Do not change Ask. Do not unblock or parent work onto finding t_019ab036.

## PROVE-OUT OBJECTIVE

Full featured versus this stamp means the locked behavior is true on the shipped tree, not only that a unit file mentions Accept recommendation. QA Engineer grades the packet. This seat does not grade screenshots. Loop passed is not product-complete.

Experience-first acceptance (verify before done):
1. Teacher, phone and web: save a keyed homework draft for a filed student on an own class (Jordan Lee shape). Inbox shows that draft. Open the existing teacher review of that saved draft. Pack B Approve or Accept recommendation is visible. Fail if the control only existed in the live capture session and vanished after save. Do not pass a new review screen.
2. From that same control, the teacher accepts that draft. The accept completes on the same path other drafts already use. Nothing is a grade until that accept. A visible control that cannot accept a filed saved keyed homework draft fails AC-PACKB-2.
3. Dual-hat parent seat: switch to Parent. No Approve control. Morgan-only isolation stays. Do not regress the path that already hid Approve.
4. Office, superintendent, and student still cannot Approve keyed drafts. Do not add an office Approve screen to prove the teacher fix.
5. Unassigned still cannot publish. This lock is the filed saved keyed homework draft. A control that appears only for turned-in practice, or only for unkeyed work, and not for this saved homework draft, fails the stamp.

Evidence labels:
- STATIC: source walls. Aid only. Never sole PASS for a user-visible control.
- LIVE UI: signed-in Teach seat, saved keyed homework draft, existing review, control visible, accept works. Phone and web.
- NON-GOAL ABSENT: no new review screen. Parent seat has no Approve. Their absence is correct.

Do not send AC-PACKB-1..3 to engineering as defects. They are the stamp. A miss after implementation is a new defect card.

Next qa-engineer card: CoS t_941e07f4 staffs prove-out from this OBJECTIVE after the Surface workflow. This seat does not staff Engineering.

## DITL IMPACT

Change: Saved keyed homework draft shows the existing Pack B Approve or Accept recommendation on the teacher review. Parent seat still hides Approve.
Verdict: UPDATE_PLANS | UPDATE_CASES
Plans touched: DITL-DH-01 (beat 3b is phone /capture review only; the lock is the saved-draft review on phone and web)
Cases touched: DITL-DH-01-UI-02 (thicken: after save, the inbox draft's existing teacher review shows the control and accept works; parent steps stay)
New DITL needed: no
Seed/artifacts: none
Notes: CoS files the sticky DITL-UPDATE card. This seat does not rewrite the plans or cases and does not staff that card.
