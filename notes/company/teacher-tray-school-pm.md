# Teacher messages tray school scope

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_626a8738`
**Finding:** `t_2853355f` stays blocked and unassigned. Do not unblock. Do not parent work onto it.
**Case:** DITL-T-03-UI-01
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. The teacher messages tray lists only people in that school. Do not hide the leak by deleting one contact.
**QA intent file:** `notes/company/teacher-tray-school-intent.md` (QA Supervisor owns it. This note does not replace it.)
**Status:** PM DESIGN STAMP APPROVED (`t_626a8738`). Not Eng. No `src/`. Do not unblock `t_2853355f`.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: TEACHER TRAY SCHOOL — existing teacher messages list shows only people in the signed-in teacher's school
Quality goals: AC-TRAY-SCHOOL-1, AC-TRAY-SCHOOL-2, AC-TRAY-SCHOOL-3; teacher seat including office and parent dual-hats; bad link does not list an other-school person; in-school people stay; no contact delete
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_626a8738
QA Supervisor: pending  date:  profile-session: qa-supervisor (owns teacher-tray-school-intent.md)
Intent gaps remaining: none
```

## Lock lines

Surface: both
Persona: teacher
Seat: teacher
Motion: none
AC-TRAY-SCHOOL-1: A teacher messages tray lists only people in that teacher's school.
AC-TRAY-SCHOOL-2: A person from another school does not appear, even if a bad link exists.
AC-TRAY-SCHOOL-3: People who belong in that school still appear.

## 0. What is broken

The messages screen already exists. Do not design a new one.

On the sandbox teacher seat (`ditl-teacher-a`, school ditl-Sandbox Academy), `/messages` listed Jacquee Broaddus next to Taylor Lee. Taylor Lee is the in-school parent (`ditl-parent-1`). Jacquee is not a ditl sandbox person. Case DITL-T-03-UI-01 passed. The list leak is the finding. Shot: `notes/qa-fixtures/ditl/artifacts-T-03-UI-01/final-05-tray.png`.

The teacher list is three existing places, not a new surface:

- Favorites row on `/messages` (pinned threads).
- Thread rows on `/messages` (the scroll list, including unread and groups filters, and the search box on that screen).
- People the compose picker can show. That is `/messages/new` (one person or new group) and the existing add-person list on thread info. Both read `listMessageDirectory`.

Those rows come from thread membership (`listThreads` → `message_thread_members` → `listPeopleByIds`) and from `message_directory` / `can_message`. `listThreads` does not check school. A membership row is enough to put the other person on the tray. `can_message` already returns false when `school_id` differs, then `message_directory` follows that. `listMessageDirectory` still merges `listProfiles()` when `isAdminRole` is true. That merge has no school check in the client. A teacher who is also office can be `isAdminRole` while sitting on the teacher seat.

That school is the signed-in teacher's `profiles.school_id`. `my_school_id()` reads that column. There is no school switcher. A person is in that school only when their `profiles.school_id` is not distinct from the teacher's. A null `school_id` is not in the school.

The fix is that school wall on the existing list. It is not deleting Jacquee Broaddus, not deleting one membership, and not editing sandbox seed so one name disappears.

## 1. Stories

**Teacher.** As a teacher on the teacher seat, I open the existing messages tray. Favorites and thread rows name only people in my school. Search and the unread and groups filters on that screen cannot bring back someone from another school. Taylor Lee, and anyone else already in my school, still show.

**Compose.** As that teacher, I open New Message or New Group. The people I can pick are in my school. I cannot pick someone from another school, even if a thread, pin, or directory row already points at them.

**Bad link.** A membership, pin, or other link to a person whose school is not mine does not put that person on the tray or in the picker. The person row stays in the database. The list does not show them.

**Teacher who is also office.** While I am on the teacher seat, the same wall holds. Also-administrator does not merge other-school people into this list. Switching to the office seat is a different seat. This lock does not retarget that seat.

**Teacher who is also a parent.** While I am on the teacher seat, the same wall holds. A parent or child whose profile is another school does not appear, even if a parent link or a thread membership exists. Switching to the parent seat is a different seat. This lock does not retarget that seat.

**In-school people stay.** Staff, parents, and students I can already message in this school still appear. This fix does not shrink that set and does not hide a person by name.

## 2. Acceptance

These match the lock. They do not add a second product. AC-TRAY-SCHOOL-1 through AC-TRAY-SCHOOL-3 are the CEO lines. Later ids only apply that lock to the existing list, dual-hats on the teacher seat, and the bad link.

**AC-TRAY-SCHOOL-1.** A teacher messages tray lists only people in that teacher's school.

On the teacher seat, web and phone, favorites and thread rows on `/messages` name, face, or preview only people whose `profiles.school_id` is not distinct from the signed-in teacher's `profiles.school_id`. The unread filter, the groups filter, and the search box on that screen use the same set. They do not reveal someone the unfiltered tray must hide.

**AC-TRAY-SCHOOL-2.** A person from another school does not appear, even if a bad link exists.

A bad link is a thread membership, a pin, a local pin, a directory row, an admin `listProfiles` merge, or a parent or class relationship that would otherwise put that person on this list, when their `school_id` is distinct from the teacher's, or null. That person is absent from favorites, thread rows, the compose picker, and the existing add-person list. Their profile is not deleted. The membership is not deleted as the fix. Hiding one named contact, or editing seed so one name is gone, is not success.

A 1:1 whose only other person is out of school is not a tray row and not a favorite. A group that still has an in-school person may stay. That row must not show the other-school face or name. If the only name the row would show is an other-school person, the row does not appear.

**AC-TRAY-SCHOOL-3.** People who belong in that school still appear.

In-school people the teacher can already message still appear on the tray and in the picker. That includes the in-school parent thread (Taylor Lee on the sandbox teacher seat) and in-school staff, parents, and students `can_message` already allows. This fix does not remove an in-school person because they are outside the ditl fixture list. It does not hide a person by display name.

**AC-TRAY-SCHOOL-4.** Teacher who is also office, while on the teacher seat, gets AC-TRAY-SCHOOL-1 through AC-TRAY-SCHOOL-3. `also_administrator` does not merge other-school profiles into the picker or the tray. The office seat is not this proof.

**AC-TRAY-SCHOOL-5.** Teacher who is also a parent, while on the teacher seat, gets AC-TRAY-SCHOOL-1 through AC-TRAY-SCHOOL-3. A cross-school parent link or child profile does not appear. The parent seat is not this proof.

**AC-TRAY-SCHOOL-6.** The header messages badge does not count a thread the tray must hide because every other person is out of school. A group the tray still shows, because an in-school person is in it, may still count. Ask `list_threads` and the Ask unread count use the same wall. Do not add an Ask tool. Ask is not the proof. The proof is the tray and the compose picker.

**AC-TRAY-SCHOOL-7.** Opening a thread the tray must hide does not present the other-school person as someone in this school. Use the existing thread screen. Do not add a screen. Do not delete the thread or its messages. Closing that screen writes nothing.

## 3. Hats

| Hat | On the teacher seat? | This list |
|---|---|---|
| Teacher | Yes. Default seat is teacher. | School wall. In-school people stay. |
| Teacher + office, teacher seat | Yes, after they choose the teacher seat. Default for an office job stays office. Do not flip that default. | Same wall. Admin merge does not add other schools. |
| Teacher + office, office seat | No. | Out. Do not retarget office messaging. |
| Teacher + parent, teacher seat | Yes. | Same wall. A cross-school parent or child does not appear. |
| Teacher + parent, parent seat | No. Parent seat is `/parent`. | Out. Do not retarget `src/app/parent.tsx`. |
| Office only, superintendent | No, unless they are also a teacher and sit on the teacher seat. | Out of this proof. |
| Pure parent | No. | Out. |
| Student | No. | Out. Do not change the student people list. |
| Signed-out | No. | Fail closed. No list. |

Default chrome seat for an office job stays office, even when `also_teacher` or `parent_id` is set. Do not flip that default to force this tray.

## 4. Entry and lifecycle

**Entry.** Existing header mail to `/messages`. Existing New Message and New Group. Existing add-person on thread info. No new route, tab, or button.

**Start.** Open the tray. Only in-school people are listed. An other-school person is not a row, a favorite, or a search hit.

**Change.** Pin, unpin, mute, filter, or search. None of those put an other-school person back. Picking someone in the compose picker only offers in-school people. Starting a thread with an in-school person still works.

**Finish.** The teacher can still open and reply on an in-school thread, including the parent thread this case already used. Reply and send stay as they are for in-school people.

**Reverse.** Leave the tray. Leave the picker without sending. Nothing is deleted. An other-school profile and any bad membership remain in the database.

**Already in flow.** A thread already open that the tray must hide does not present the other-school person as someone in this school. Dismiss with the existing back control. Do not add a screen to explain the hide.

**Multiplicity.** One signed-in school. No school picker. Many in-school threads still list. A group may keep its in-school members and omit the other-school member. Two schools' people do not mix on this list.

**Ask.** Existing `list_threads` and unread count follow the same wall. Do not add a tool. Do not require Ask for the proof.

## 5. Non-goals

**No new messages screen.** No new route, tab, copy, or layout. Favorites, thread rows, and the compose picker stay where they are.

**Do not delete people.** Do not delete Jacquee Broaddus or any production person. Do not delete one membership, one pin, or one sandbox row to hide one name. Seed cleanup is not the fix.

**Do not hide by name.** A person in this school still appears, even if they are not a ditl fixture. The rule is `school_id`, not a denylist.

**Do not rewrite who may message inside the school.** `can_message` rules for staff, own students, and their parents stay. This stamp adds the school wall on the list. It does not add a new permission matrix.

**Office seat and parent seat are out.** Do not retarget office messaging or `src/app/parent.tsx`. Student people list is out. Alerts, feeds, Needs, Search, and the class parents directory are not this tray.

**No school switcher.** One signed-in school. Do not add a picker.

**Do not unblock `t_2853355f`.** Do not staff Engineering from this card. Chief of Staff starts the Surface workflow only after this stamp and the QA Supervisor stamp are both APPROVED.

**Group chat expansion, SMS, and email stay out.** Those are already non-goals on DITL-T-03. Do not add them to fix this list.

## 6. DITL IMPACT

```
DITL IMPACT
Change: Teacher messages tray, favorites, and the compose picker list only people in the signed-in teacher's school. An other-school person does not appear even if a membership or other bad link exists. In-school people still appear. Do not delete a person or one sandbox contact to hide the leak.
Verdict: UPDATE_CASES
Plans touched: DITL-T-03
Cases touched: DITL-T-03-UI-01
New DITL needed: no
Seed/artifacts: none
Notes: UI-01 passed while the tray listed Jacquee Broaddus next to Taylor Lee. The written expected line is "Message thread; need flagged" and does not catch the leak. After Eng, that case should still expect the in-school parent thread and the needs flag, and should also expect no other-school person on the tray or in the compose picker. Do not rewrite the plan or the case file from this card. Do not staff ditl-scribe from this card. CoS owns the DITL-UPDATE card. Do not delete Jacquee or edit seed to drop one membership. Do not unblock t_2853355f. ASK-01 is not the proof. If Ask still lists an other-school person, that is the same wall, not a new case family.
```

## 7. Handoff

**WORK PERFORMED:** PM stamped the locked teacher-tray school fix. Spec is this note. QA Supervisor still owns `notes/company/teacher-tray-school-intent.md`. No app code. Finding left blocked.

**VERIFICATION:** Tray rows come from `listThreads` with no school check (`src/lib/messages/api.ts`). Compose and add-person read `listMessageDirectory`, which follows `message_directory` / `can_message` and, for `isAdminRole`, merges `listProfiles()` with no client school check. `can_message` already rejects a different `school_id` (`supabase/migrations/20260911160000_teacher_student_can_message.sql`). `my_school_id()` is `profiles.school_id`. Teacher seat is chrome, not a second messages screen (`src/lib/chrome/seat.ts`). Evidence: DITL-T-03-UI-01 passed with Jacquee Broaddus beside Taylor Lee.

**RESULT:** PM APPROVED 2026-09-27. Intent gaps remaining: none. Not a build. Not a new messages screen. Not a contact delete. DITL IMPACT: UPDATE_CASES.

**OPEN ISSUES:** QA Supervisor stamp is not this card. Dual stamp is not MET until that line is APPROVED.

**ESCALATION NEEDED:** No. Do not unblock `t_2853355f`. Do not staff Engineering from this card.

**RECOMMENDED NEXT ACTION:** Chief of Staff reads this stamp and the QA Supervisor stamp. If both are APPROVED, start the Surface workflow. If QA rejects, do not staff Engineering. Build shape when both approve: scope the existing teacher list to the signed-in school. Favorites, thread rows, and the compose picker. Hide an other-school person even when a bad link exists. Keep in-school people. Do not delete Jacquee or one sandbox contact.

*End PM stamp — t_626a8738 APPROVED 2026-09-27. Not Eng. Finding t_2853355f stays blocked.*

