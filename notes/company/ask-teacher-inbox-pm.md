# Ask teacher inbox

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_58d360d6`
**Finding:** `t_837efff9` (leave blocked, unassigned)
**Case:** DITL-T-03-ASK-01
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. A teacher who can open Inbox can list that inbox from Ask. Do not remove the Ask inbox tool. Do not leave the teacher-seat refusal for that teacher.
**Status:** PM DESIGN STAMP APPROVED (`t_58d360d6`). QA Supervisor stamp is not this card. Not Eng. No `src/`. Do not unblock `t_837efff9`.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Ask teacher inbox
Quality goals: AC-ASK-INBOX-1, AC-ASK-INBOX-2, AC-ASK-INBOX-3
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_58d360d6
QA Supervisor: pending  date:  profile-session: qa-supervisor / t_bea651fa
Intent gaps remaining: none
```

## 0. What is broken

The Inbox screen already works. Do not design a new Inbox. Do not remove `list_inbox`.

Needs triage is `/inbox` on the teacher seat. The tray label is Needs Attention. The route stays `/inbox`. The screen loads when the signed-in session has a teacher row and an open class (`chrome` class, else the teacher active class, else one resolve). It lists that class through the existing `listInbox` call. DITL-T-03-ASK-01 opened that screen on ditl-Math Period 3 in the same teacher-only session that used Ask.

Ask already has the tool. `list_inbox` is teacher-only, capability `capture.use`, and it is supposed to return capture statuses for a class. The run refuses before that list when `teacherId` is missing, with the error `Teacher seat required.` The same session had already opened `/inbox`. The case itself passed. This refusal is the finding.

The tool stays a list. It is not messages (`list_threads` already worked in that run). It is not Approve, assign, or delete. Those stay out of this fix.

Surface: both. Persona: teacher. Seat: teacher. Motion: none.

AC-ASK-INBOX-1: A teacher who can open Inbox on the screen can list that inbox from Ask.
AC-ASK-INBOX-2: Ask does not say teacher seat required for that teacher.
AC-ASK-INBOX-3: A student or a parent still cannot list the teacher inbox.

## 1. Stories

**Teacher.** As a teacher who can open Inbox on the screen, I ask Kelyra to list that inbox. Ask calls `list_inbox` and returns that class's capture list. It does not say teacher seat required.

**Teacher with two classes.** The list is the inbox of the class I can open, the open class, or a class id I pass for a class whose Inbox I can open. It is not another teacher's class. Switching the open class lists that class's inbox, not a seat refusal.

**Teacher who is also a parent.** On the teacher seat, if I can open Inbox, I can list that inbox from Ask. On the parent seat I cannot open the teacher Inbox, and I cannot list it.

**Teacher who is also office.** On the teacher seat, if I can open Inbox, I can list that inbox from Ask. On the office seat I do not have the teacher Inbox tray, and I cannot list the teacher inbox.

**Not a student, and not a parent seat.** A student cannot list the teacher inbox. A parent seat cannot list the teacher inbox. Signed-out cannot list it.

## 2. Acceptance

These match the lock. They do not add a second product choice. AC-ASK-INBOX-1 through AC-ASK-INBOX-3 are the CEO lines. Later ids only apply that lock to hats, the class the screen already opened, an empty list, and the seats that must still fail closed.

**AC-ASK-INBOX-1.** A teacher who can open Inbox on the screen can list that inbox from Ask.

Open means the teacher seat can open `/inbox` and the screen loads that class's Needs list. Ask `list_inbox` returns that same class's capture list from the existing `listInbox` call. The open class is the class the screen used. A passed `class_id` is listed only when that teacher can open Inbox for that class. An empty capture list is a successful list, not a refusal.

**AC-ASK-INBOX-2.** Ask does not say teacher seat required for that teacher.

The words `teacher seat required` do not appear for a teacher who can open Inbox, in any case. A renamed refusal that still means the seat is missing (`Teacher sign-in is required`, `teacher seat only`, or the same sentence with different caps) also fails this line. A missing class when the screen has no class may still say a class is needed. That is not this bug. A seat refusal while the screen is open is this bug.

**AC-ASK-INBOX-3.** A student or a parent still cannot list the teacher inbox.

A student seat cannot. A parent seat cannot, including a teacher who has switched to the parent seat. Signed-out cannot. The tool stays offered only where the teacher seat can open Inbox. Do not drop the student and parent walls to make AC-ASK-INBOX-1 pass.

**AC-ASK-INBOX-4.** Web and phone. Same tool, same three lines. No new Inbox route, tray row, or copy. Motion: none.

**AC-ASK-INBOX-5.** Teacher who is also a parent, on the teacher seat, gets AC-ASK-INBOX-1 and AC-ASK-INBOX-2 when that seat can open Inbox. On the parent seat, AC-ASK-INBOX-3 holds. Do not merge the seats.

**AC-ASK-INBOX-6.** Teacher who is also office, on the teacher seat, gets AC-ASK-INBOX-1 and AC-ASK-INBOX-2 when that seat can open Inbox. On the office seat, there is no teacher Inbox tray, and Ask does not list the teacher inbox. Office-only stays refused.

**AC-ASK-INBOX-7.** Two classes are two inboxes. Listing uses the open class, or a class id whose Inbox that teacher can open. It does not return another teacher's class. Switching class and opening Inbox lists the new class, and does not say teacher seat required. A class they cannot open is not listed, and that miss is not worded as a missing teacher seat if they can open some Inbox.

## 3. Hats

| Hat | Can open teacher Inbox? | Ask list_inbox |
|---|---|---|
| Teacher-only | Yes. Tray Needs Attention, route `/inbox`. | List that class. Do not say teacher seat required. |
| Teacher + parent, teacher seat | Yes, same screen. | Same list. Do not merge into the parent seat. |
| Teacher + parent, parent seat | No. Parent tray has no Inbox. | Cannot list the teacher inbox. |
| Teacher + office, teacher seat | Yes, same screen. | Same list. |
| Teacher + office, office seat | No. Office tray has no Inbox. | Cannot list the teacher inbox. |
| Office-only | No. | Stay refused. Do not add the tool. |
| Pure parent | No. | Cannot list. |
| Student | No. | Cannot list. |
| Signed-out | No. | Fail closed. No list. |

Active chrome seat is the seat. A teacher row on the profile does not let the parent seat or the office seat list the teacher inbox.

## 4. Entry and lifecycle

**Entry.** Existing Ask on the teacher seat, web and phone. Existing `list_inbox`. Existing `/inbox` screen. No new route. No new tray row. No new button.

**Start.** The teacher can already open Inbox for a class. They ask Kelyra to list that inbox. Ask calls `list_inbox`. It does not refuse the seat.

**Change.** None. This is a read. Do not Approve, assign, file, or delete from this fix.

**Finish.** The reply is that class's capture list, or an empty list when the screen's capture list is empty. It names the class. It does not say teacher seat required.

**Reverse.** Sign out. The next Ask cannot list the teacher inbox. Switching to the parent seat or the office seat cannot list it. Switching back to the teacher seat, when Inbox opens again, can list it again.

**Already in flow.** If Inbox is already open, Ask still lists that same class. Do not send them to a new Inbox to get the list. Do not replace the tool with "open the screen" as the only answer.

**Multiplicity.** One open class is one inbox. Two taught classes are two inboxes. List the one they can open. Do not list a class they do not teach. Do not invent a class picker.

**Messages.** `list_threads` and `send_message` stay as they are. This stamp does not retarget them.

## 5. Non-goals

**Do not remove `list_inbox`.** The fix is that a teacher who can open Inbox can list it. Deleting the tool, hiding it, or answering only with "open the screen" fails the lock.

**Do not design a new Inbox.** No new route, tray label, chip, or copy. Needs Attention and `/inbox` stay.

**Do not leave the refusal.** Renaming `Teacher seat required.` is not the fix if that teacher still cannot list.

**Do not widen the list.** Student, parent seat, office seat, and signed-out still cannot list the teacher inbox. Do not drop those walls so the teacher path passes.

**Turned-in rows stay out.** The screen also lists turned-in work. This tool stays the existing capture-status list. Do not add turned-in, Approve, assign, or delete to make this pass.

**The existing row cap stays.** A long inbox may still return the current cap. That is not this bug. A seat refusal is.

**Do not unblock `t_837efff9`.** Do not parent work onto it. Do not staff Engineering from this card. Chief of Staff starts the Surface workflow only after this stamp and the QA Supervisor stamp are both APPROVED.

**Messages are out.** Thread list and send already passed in the case. Do not retarget them.

## 6. DITL IMPACT

```
DITL IMPACT
Change: Ask list_inbox lists the inbox a teacher can already open on /inbox. It does not say teacher seat required for that teacher. Student and parent seats still cannot list it. The tool stays. No new Inbox.
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: DITL-T-03 already maps Needs triage to /inbox and list_inbox. This stamp matches that plan. Do not rewrite the plan to describe the bug. Do not staff ditl-scribe from this card. Prove-out after the Surface workflow re-runs list_inbox on a teacher who can open /inbox, against AC-ASK-INBOX-1..7. The case pass is not this fix. Do not unblock t_837efff9.
```

## 7. Handoff

**WORK PERFORMED:** PM stamped the locked Ask teacher inbox fix. Spec is this note. No app code. Finding `t_837efff9` stays blocked and unassigned.

**VERIFICATION:** Screen `/inbox` loads from the teacher row and the open class (`src/app/inbox.tsx`, tray `src/lib/chrome/trayTabs.ts`). Ask `list_inbox` returns `Teacher seat required.` when `teacherId` is missing (`src/lib/ai/askTools.ts`). Student, parent, and office trays have no Inbox. Policy keeps `list_inbox` teacher-seat-only (`src/lib/ai/askToolPolicy.ts`). DITL-T-03-ASK-01 report: same teacher session opened `/inbox` and Ask refused the list.

**RESULT:** PM APPROVED 2026-09-27. Intent gaps remaining: none. Not a build. Not a new Inbox. Not a removed tool. DITL IMPACT: NONE.

**OPEN ISSUES:** QA Supervisor stamp on `t_bea651fa` is still required. Dual stamp is not MET until that line is APPROVED.

**ESCALATION NEEDED:** No. Do not unblock `t_837efff9`. Do not parent work onto it.

**RECOMMENDED NEXT ACTION:** Chief of Staff reads this stamp and the QA Supervisor stamp. If both are APPROVED, start the Surface workflow from `t_a3713889` (both surfaces, so kelyra-ui-loop) with the lock lines. If QA rejects, comment the gap on `t_837efff9` and do not start a build. Build shape when both approve: a teacher who can open Inbox can list that inbox from Ask. Do not say teacher seat required for that teacher. Do not remove the tool. Student and parent seats still cannot list it.

