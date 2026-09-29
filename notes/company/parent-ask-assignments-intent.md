# Parent Ask assignments

**Date:** 2026-09-27
**Author:** qa-supervisor
**Card:** `t_0755b0ee`
**PM card:** `t_407db7da` (parallel stamp; must not write this file)
**Lane:** `t_d38c9363`
**Finding:** `t_df0481c4` (leave blocked, unassigned)
**Case:** DITL-P-02-ASK-01
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Fix Ask so a parent can list that child's assignments. Do not remove the Ask path. Do not mix one child's work with a sibling's.
**Status:** QA Supervisor DESIGN STAMP APPROVED 2026-09-27 (`t_0755b0ee`). Not Eng from this seat. No `src/`. No new parent screen. Do not unblock `t_df0481c4`. Do not invent a second messenger.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: parent Ask assignments
Quality goals: AC-PARENT-ASK-1, AC-PARENT-ASK-2, AC-PARENT-ASK-3
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_0755b0ee
Intent gaps remaining: none
```

Surface: both
Persona: parent
Seat: parent
Motion: none

AC-PARENT-ASK-1: A parent can list one child's assignments from Ask.
AC-PARENT-ASK-2: A parent with two children lists the child they asked about, not the sibling's work.
AC-PARENT-ASK-3: The message-the-teacher path still sends.

## 1. What is broken

Parent Ask on the existing Ask path did not list the child's assignments. Case DITL-P-02-ASK-01 (parent seat `ditl-parent-1`, children Jamie and Jordan). Home bound Jordan, Ask was open, and the ask was for Jordan Lee only. The parent seat has no `list_my_assignments`. Class assignment lookup failed. Assignments were not listed. The assistant did not invent a list. `send_message_to_teacher` did send. Grades were not changed.

This stamp fixes that miss on the existing Ask path. It does not add a parent screen. It does not add a second messenger. It does not remove Ask.

## 2. Hats

This lock is the parent seat only. Persona is parent. Seat is parent.

| Hat | In this stamp |
|---|---|
| Parent | Yes. Existing Ask lists the asked child's assignments. |
| Staff who is also a parent, while seated as parent | Same parent Ask. Do not merge a teacher or office tray into this list. Do not send them to a new screen. |
| Teacher seat, student seat, office seat | Out of this stamp. Do not remove their Ask. Do not fix this by building a shared new parent screen. |

Dual-hat is not a second product here. Plan DITL-P-02 already says dual-hat none for this day. A teacher-parent on the parent seat uses this same Ask list. Teacher-seat Ask is another lane.

## 3. Entry

No new route, tab, button, or parent screen. Web and phone. Motion: none.

Entry is the Ask the parent already has: tray Ask, or `/ask`, after parent sign-in. Home may already have a child selected. That selection is not a new screen and is not a new picker.

Do not add an assignments page, a sibling picker screen, or a second chat as the way in.

## 4. Lifecycle

**Start.** Signed-in parent opens existing Ask.

**Change.** They ask for one child's assignments. The reply lists that child's real assignments (titles, and due date and class name when the assignment has them). Do not invent titles. Do not answer with a failed class lookup and an empty list when that child has assignments.

**Finish.** The list is in the Ask reply. The parent leaves Ask the way they already leave (back, another tab, sign out). Do not add a close control.

**Message.** The existing message-the-teacher path still sends and confirms. Same Ask. Not a new messenger.

**Reverse.** Abandon the Ask turn as today. No new cancel control. A failed send still must not wipe the list path, and a list must not block a later send.

**Grades.** This path does not Approve, publish, or edit a grade. That already held in the case. Keep it.

## 5. Multiplicity

One linked child: list that child's assignments (AC-PARENT-ASK-1).

Two or more: list only the child they asked about (AC-PARENT-ASK-2). Jamie's work must not appear in a list asked for Jordan, and the reverse. A Home bind does not override a named child. If Ask is bound to Jordan and the ask names Jamie, the list is Jamie.

If two children are linked and the ask does not identify one, do not return a mixed list. Stay in Ask and ask which child. That question is the existing Ask reply. It is not a new screen.

More than one class for the same child is still that child's list. Do not drop a class to avoid mixing a sibling. Do not merge a sibling's class into it.

## 6. Explicit non-goals

- Do not remove the Ask path.
- Do not mix one child's work with a sibling's.
- Do not design a new parent screen.
- Do not invent a second messenger. `send_message_to_teacher` remains the send.
- Do not make Ask Approve or edit a grade.
- Do not unblock `t_df0481c4`. Do not parent work onto it.
- Do not change teacher-inbox Ask, student Turn in, or office splash. Those are other locks.

## DITL IMPACT

```
DITL IMPACT
Change: Parent Ask lists the asked child's assignments. Sibling work is not mixed in. The existing message-the-teacher path still sends. No new parent screen. Ask path stays.
Verdict: UPDATE_CASES
Plans touched: none
Cases touched: DITL-P-02-ASK-01
New DITL needed: no
Seed/artifacts: none
Notes: Plan DITL-P-02 already has parent Ask, sibling isolation, and the message path. The case expected line only says assignments listed for S1. The lane-B runner does not fail a mixed sibling list. Case rewrite, when Chuck unblocks it, adds the asked-child-only expected line. Prove-out does not wait on that rewrite. This seat does not file the DITL-UPDATE card and does not staff ditl-scribe.
```

## PROVE-OUT OBJECTIVE

CoS staffs qa-engineer after the Surface loop is terminal. Do not treat loop passed as product-complete. Do not file these acceptance ids to engineering as defects. No mock-up. Experience first. Web and phone. Parent seat. Existing Ask only.

Full featured versus this stamp:

- AC-PARENT-ASK-1: A parent with one child opens existing Ask and asks for that child's assignments. The reply lists that child's real assignments (titles, and due date and class name when present). It does not invent titles. It does not stop at a failed class lookup.
- AC-PARENT-ASK-2: A parent with two children (fixture shape: Jamie and Jordan) asks for one named child. The reply is that child only. The sibling's titles are absent. A Home bind to the other child does not override the name in the ask. An ask that names neither child does not return a mixed list.
- AC-PARENT-ASK-3: On that same Ask path, the message-the-teacher send still sends and confirms. No second messenger. Ask still does not Approve or edit a grade.
- Non-goals hold: Ask path still exists. No new parent screen. No new picker. `t_df0481c4` stays blocked and unassigned.

Verify by the Ask reply and the send result, on both surfaces. Do not grade a screenshot packet on this card.
