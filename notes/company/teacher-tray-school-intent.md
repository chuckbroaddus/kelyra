# Teacher messages tray — school scope

**Date:** 2026-09-27
**Author:** qa-supervisor
**Card:** `t_2287c2b7`
**PM card:** `t_626a8738` (PM APPROVED; this note does not speak for PM)
**Finding:** `t_2853355f` stays blocked and unassigned. Do not unblock. Do not parent work onto it.
**Case:** DITL-T-03-UI-01
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. The teacher messages tray lists only people in that school. Do not hide the leak by deleting one contact.
**Status:** QA Supervisor DESIGN STAMP below. Not Eng. No `src/`. No new messages screen.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: teacher messages tray lists only people in the signed-in teacher's school
Quality goals: AC-TRAY-SCHOOL-1, AC-TRAY-SCHOOL-2, AC-TRAY-SCHOOL-3
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_2287c2b7
Intent gaps remaining: none
```

Surface: both
Persona: teacher
Seat: teacher
Motion: none
AC-TRAY-SCHOOL-1: A teacher messages tray lists only people in that teacher's school.
AC-TRAY-SCHOOL-2: A person from another school does not appear, even if a bad link exists.
AC-TRAY-SCHOOL-3: People who belong in that school still appear.

PM stamp is the sibling card `t_626a8738` and `notes/company/teacher-tray-school-pm.md`. This seat does not restamp PM.

## What is already true

The messages screen exists. This stamp does not design another one.

On the sandbox teacher seat (`ditl-teacher-a`, ditl-Sandbox Academy), `/messages` listed Jacquee Broaddus next to Taylor Lee. Taylor Lee is the in-school parent. Jacquee is not a ditl sandbox person. DITL-T-03-UI-01 passed. The list leak is the finding.

The teacher list is the existing tray, not a new surface:

- Favorites row on `/messages` (server `pinned_at` or a local pin).
- Thread rows on `/messages`, including the unread filter, the groups filter, and the search box on that screen.
- People the compose picker can show: `/messages/new` (one person or new group) and the existing add-person list on thread info. Both read `listMessageDirectory`.

Those rows come from thread membership (`listThreads` reads `message_thread_members`, then `listPeopleByIds`) and from `message_directory` / `can_message`. `listThreads` does not check school. A membership row is enough to name the other person on the tray. Profile read also allows a shared-thread member, so the bad link hydrates the name. `can_message` already returns false when `school_id` differs, and `message_directory` follows that. `listMessageDirectory` still merges `listProfiles()` when `isAdminRole` is true. A teacher who is also office can be `isAdminRole` while sitting on the teacher seat. That merge is not a school wall.

That school is the signed-in teacher's `profiles.school_id`. There is no school switcher. A person is in that school only when their `profiles.school_id` is not distinct from the teacher's. A null `school_id` is not in the school.

The fix is that wall on the existing list. It is not deleting Jacquee Broaddus, not deleting one membership or pin, and not editing sandbox seed so one name disappears.

## Hats

Teacher seat only. Phone and web. Motion is none. No new button, tab, or route.

**Teacher.** Default seat is teacher. Favorites and thread rows name only people in that school. Search, unread, and groups on that screen cannot bring an other-school person back. People already in that school still show, including the in-school parent thread.

**Teacher who is also office, on the teacher seat.** Same wall. `also_administrator` does not merge other-school profiles into the tray or the picker. Default chrome for an office job stays office. Do not flip that default to force this tray. The office seat is a different seat. This lock does not retarget office messaging.

**Teacher who is also a parent, on the teacher seat.** Same wall. A parent or child whose `school_id` is not this school does not appear, even if a parent link or a thread membership exists. Switching to the parent seat is a different seat (`/parent`). This lock does not retarget that seat.

**Out.** Office seat, pure parent, student, superintendent who is not sitting on the teacher seat, and signed-out. Signed-out stays fail closed: no list. Do not change the student people list. Do not retarget `src/app/parent.tsx`.

## Entry

Existing header mail to `/messages`. Existing New Message and New Group. Existing add-person on thread info. No new chrome.

## Lifecycle

**Start.** Open the tray. Only in-school people are listed. An other-school person is not a row, a favorite, a face, or a search hit.

**Change.** Pin, unpin, mute, filter, or search. None of those put an other-school person back. A local pin of a bad thread does not resurrect the row. The compose picker and the add-person list offer only in-school people. Starting a thread with an in-school person still works.

**Finish.** The teacher can still open and reply on an in-school thread, including the parent thread this case already used. Reply and send stay as they are for in-school people.

**Reverse / cancel.** Leave the tray. Leave the picker without sending. Remove a compose chip. Nothing is deleted. An other-school profile and any bad membership remain in the database. Unpin does not delete a person.

**Already in flow.** A 1:1 whose only other person is out of school is not a tray row and not a favorite. Opening that thread by a link the tray no longer offers uses the existing thread screen. It must not present that person as someone in this school, and it must not put them back on the tray or in the picker. Do not add a screen. Do not delete the thread or its messages. Back writes nothing.

A group that still has an in-school person may stay on the tray. That row must not show the other-school face or name, including a saved title that is only that other-school name. If the only name the row would show is an other-school person, the row does not appear. The existing thread-info member list must not show that other-school person as a member of this school's conversation. Do not add a member-list screen. Do not delete the membership row to hide the name.

Message text that happens to mention a name is not a person row. Do not scrub stored message bodies.

## Multiplicity

One signed-in school. No school picker. Many in-school threads still list. Many classes do not split this list into a new picker. A person who is in this school still appears even if they also have a link outside it. A person in another school does not appear on any of those rows, even if several bad links exist. Two schools' people do not mix on this list.

The header messages badge does not count a thread the tray must hide because every other person is out of school. A group the tray still shows, because an in-school person is in it, may still count. Ask `list_threads` reads the same thread list, so it must not name an other-school person. Do not add an Ask tool. Ask is not a new proof. The proof is the tray and the compose picker.

## Non-goals

**No new messages screen.** No new route, tab, copy, or layout. Favorites, thread rows, and the compose picker stay where they are.

**Do not delete people.** Do not delete Jacquee Broaddus or any production person. Do not delete one membership, one pin, or one sandbox row to hide one name. Seed cleanup is not the fix.

**Do not hide by name.** A person in this school still appears, even if they are not a ditl fixture. The rule is `school_id`, not a denylist.

**Do not shrink in-school messaging.** Staff, parents, and students the teacher can already message in this school still appear. `can_message` rules inside the school stay. This stamp does not add a permission matrix and does not limit the list to one class.

**Other seats are out.** Do not retarget office messaging, the parent seat, or the student people list. Alerts, feeds, Needs, Search, and the class parents directory are not this tray.

**No school switcher.** One signed-in school. Do not add a picker.

**Do not unblock `t_2853355f`.** Do not staff anyone from this card.

**Group chat expansion, SMS, and email stay out.** Do not add them to fix this list.

## PROVE-OUT OBJECTIVE

Full featured versus this stamp means the locked list is true on the shipped tree, not only that a query mentions `school_id`. QA Engineer grades the packet. This seat does not grade screenshots. Loop passed is not product-complete. CoS staffs `qa-engineer` from this OBJECTIVE after the Surface workflow is terminal. This seat does not staff that card.

Experience-first acceptance (verify before done):

1. Teacher seat, phone and web: sign in as the sandbox teacher. Favorites and thread rows on `/messages` do not name or face Jacquee Broaddus. Taylor Lee still appears. Search, unread, and groups on that screen do not bring Jacquee back. The bad membership or pin may still exist in the database. Deleting Jacquee, the membership, the pin, or a seed row is not a pass.
2. Compose picker on `/messages/new`, including new group, and the existing add-person list: Jacquee is not a choice. An in-school person the teacher can already message still is. Leave the picker without sending. Nothing is deleted.
3. Teacher who is also office, while on the teacher seat: same wall. `also_administrator` does not merge an other-school person into the picker or the tray. Do not flip the office default seat to prove this. The office seat is not this proof.
4. Teacher who is also a parent, while on the teacher seat: same wall. A cross-school parent or child does not appear. The parent seat is not this proof.
5. A 1:1 whose only other person is out of school is not a tray row. A group that still has an in-school person may stay, and must not show the other-school face or name. Opening a hidden thread on the existing screen does not present that person as someone in this school and does not put them back on the tray. No new screen. Messages are not deleted.
6. Header badge does not count a thread the tray must hide because every other person is out of school. Ask `list_threads` uses the same list and must not name that person. Ask is not the proof and is not a new tool.

Evidence labels:

- STATIC: source and policy tests. Aid only. Never sole PASS for who the tray lists.
- LIVE UI: signed-in teacher session, phone and web, tray and compose picker, with the bad link still present.
- NON-GOAL ABSENT: no new messages screen, no deleted production person, no seed-only hide. Their absence is correct.

Do not send AC-TRAY-SCHOOL-1..3 to engineering as defects. They are the stamp. A miss after implementation is a new defect card.

## DITL IMPACT

```
DITL IMPACT
Change: Teacher messages tray (favorites, thread rows, compose picker) lists only people in the signed-in teacher's school. A bad link does not show an other-school person. In-school people stay. No contact delete. No new screen.
Verdict: UPDATE_PLANS | UPDATE_CASES
Plans touched: DITL-T-03
Cases touched: DITL-T-03-UI-01, DITL-T-03-ASK-01
New DITL needed: no
Seed/artifacts: none
Notes: QA Supervisor (t_2287c2b7) owns this verdict. DITL-T-03 still expects the teacher to open messages and reply to the in-school parent. It does not yet say the tray is the signed-in school, so a later run can pass while an other-school person is listed. Thicken the plan multiplicity and the messages beat: favorites, thread rows, and the compose picker are that school only. Thicken DITL-T-03-UI-01 expected result: Taylor Lee still appears; an other-school person does not, even if the bad link remains. Do not rewrite the case to require deleting Jacquee or the membership. DITL-T-03-ASK-01: list_threads follows the same wall. Ask is not a new proof and not a new tool. CoS files the sticky DITL-UPDATE card. This seat does not rewrite the plans or cases and does not staff that card. Do not unblock t_2853355f.
```

## Handoff

**WORK PERFORMED:** Reviewed the locked tray choice against the existing `/messages` list, compose picker, `listThreads`, `message_directory` / `can_message`, and the PM note `teacher-tray-school-pm.md`. DESIGN STAMP APPROVED on this note and on card `t_2287c2b7`.

**VERIFICATION:** The leak is a person row from thread membership (and an admin directory merge), not a missing screen. `can_message` already rejects a different `school_id`. The tray does not. No app code was changed. No person was deleted.

**RESULT:** QA Supervisor APPROVED 2026-09-27. Intent gaps remaining: none. DITL IMPACT: UPDATE_PLANS | UPDATE_CASES.

**OPEN ISSUES:** None on this stamp. PM stamp is `t_626a8738`. Engineering is not staffed from this seat.

**ESCALATION NEEDED:** No. Do not unblock `t_2853355f`.

**RECOMMENDED NEXT ACTION:** Chief of Staff reads this stamp and the PM stamp. Both are APPROVED. Start the Surface workflow with the lock lines, then staff qa-engineer from the PROVE-OUT OBJECTIVE after that workflow is terminal. File the sticky DITL-UPDATE card from the verdict above. Do not unblock `t_2853355f`.



