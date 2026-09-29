# Ask teacher inbox

**Date:** 2026-09-27
**Author:** qa-supervisor
**Card:** `t_bea651fa`
**PM card:** `t_58d360d6` (stamp is separate; this note does not wait on it)
**Lane:** `t_990d831a`
**Finding:** `t_837efff9` (leave blocked, unassigned)
**Case:** DITL-T-03-ASK-01
**Process:** `notes/company/INTENT_QUALITY_GATE.md`

CEO lock (Chuck 2026-09-27): Fix Ask so a teacher who can open Inbox can list that inbox from Ask. Do not remove the Ask inbox tool. Do not leave the teacher-seat refusal for that teacher.

Status: QA Supervisor DESIGN STAMP below. Not Eng from this seat. No `src/` change. No new Inbox. Do not unblock `t_837efff9`. Do not parent work onto `t_837efff9`.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Ask teacher inbox
Quality goals: AC-ASK-INBOX-1, AC-ASK-INBOX-2, AC-ASK-INBOX-3
PM: pending  date:  profile-session: product-manager / t_58d360d6
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_bea651fa
Intent gaps remaining: none
```

Surface: both
Persona: teacher
Seat: teacher
Motion: none

AC-ASK-INBOX-1: A teacher who can open Inbox on the screen can list that inbox from Ask.
AC-ASK-INBOX-2: Ask does not say teacher seat required for that teacher.
AC-ASK-INBOX-3: A student or a parent still cannot list the teacher inbox.

## 1. What is broken

The Inbox screen already works for this teacher. Do not design a new Inbox. Do not remove the Ask inbox tool.

DITL-T-03-ASK-01 (ditl-teacher-a, teacher only) opened `/inbox` on the same session and saw Needs rows. Ask `list_inbox` returned "Teacher seat required." The case itself passed. This tool refusal is the finding. `t_837efff9` stays blocked and unassigned.

"That inbox" is the Needs inbox the screen already shows for the open class (`/inbox`, `listInbox` for that `class_id`). It is not Messages, not a school-wide tray, and not another class.

Ask already has `list_inbox`. The teacher prompt already names it. The fix is that a teacher who can open that screen can list that same inbox from Ask, and Ask does not answer with a teacher-seat refusal for that teacher.

## 2. Hats

The gate is the active seat plus the screen, not a new role and not a merged hat.

| Hat | Seat | Ask list of the teacher inbox |
|---|---|---|
| Teacher who can open Inbox | teacher | Lists that inbox. No teacher-seat refusal. |
| Teacher who is also a parent | teacher (active) | Same, if this seat can open Inbox. |
| Teacher who is also a parent | parent (active) | Cannot list the teacher inbox. |
| Student | student | Cannot list the teacher inbox. |
| Parent | parent | Cannot list the teacher inbox. |
| Office-only | office | Not this lock. Do not grant `list_inbox`. |
| Office who also teaches | office (active) | Not this lock. Do not grant from the office seat. |
| Office who also teaches | teacher (active), and can open Inbox | Same as the teacher row. |

Seat is not merged. Parent seat and student seat stay refused even if the person also teaches. Office seat stays refused. Do not weaken `teacherSeatOnly` on other tools so an office JWT is offered teacher tools.

## 3. Entry

No new route, tab, button, or Inbox screen. Web and phone. No motion.

The teacher already opens Needs at `/inbox` from the existing tray. Ask is the existing Ask surface (`/ask` and the Ask tray). The teacher asks Ask to list that inbox. `list_inbox` stays in the teacher tool list. Do not hide it. Do not replace it with a new tool name.

Chrome entry for Inbox does not change. This stamp does not add an Ask button on the Inbox screen and does not remove the one that already exists.

## 4. Lifecycle

Read only. Listing does not Approve, delete, file, or send.

**Start.** Teacher seat, signed in, can open `/inbox` for the open class. Ask is open on that same session. The teacher asks Ask to list that inbox (the words can be "list my inbox" or an explicit `list_inbox` call). Ask must call `list_inbox`. It must not skip the tool and invent counts.

**Finish.** Ask returns the Needs rows for that class: the same class the screen inbox is using. An empty Needs list is a successful list (zero items), not a refusal. The reply and the tool result must not say "teacher seat required" in any case. They must not say "Teacher seat required."

**Leave.** Close Ask or leave the screen. No new capture, no status change, no message sent, because this action only listed.

**Fail closed for the wrong seat.** A student session or a parent session that asks to list the teacher inbox does not receive those rows. The tool is not offered, or the call is refused. The refusal must not be a successful list. Do not satisfy AC-ASK-INBOX-2 by deleting the refusal for every seat.

## 5. Multiplicity and reverse

One Needs inbox per open class. If the teacher can open Inbox for class A, Ask lists class A's Needs rows, not class B's. Switching the open class switches which inbox "that inbox" means. Do not build a class picker inside Ask for this lock. Use the class the screen inbox is already using.

Several Needs rows are a list, not a new inbox. Zero rows are a list. Do not cap the list so small that the screen shows a row Ask cannot name, and do not invent rows the screen does not have.

Reverse: there is nothing to undo. A list does not file, Approve, or delete. Closing Ask leaves the inbox as it was. Do not add a cancel control for this read.

## 6. Non-goals

- Do not remove `list_inbox`.
- Do not design a new Inbox, a new route, or a new Ask tool name.
- Do not leave "teacher seat required" for a teacher who can open Inbox.
- Do not let a student or a parent list the teacher inbox.
- Do not grant office-only, and do not grant the office seat.
- Do not weaken `teacherSeatOnly` on other Ask tools.
- Do not add Approve, delete, reply, or send as this fix. Those stay as they are.
- Do not change the screen inbox. It already works.
- Do not unblock `t_837efff9`. Do not parent work onto it.
- Do not treat Messages (`list_threads`, `send_message`) as this bug. That dual path already passed on the same case.

## 7. DITL IMPACT

```
DITL IMPACT
Change: Ask list_inbox lists the Needs inbox a teacher can already open on the screen, and does not say teacher seat required for that teacher. Student and parent still cannot list that inbox. The tool stays. No new Inbox.
Verdict: UPDATE_CASES
Plans touched: none
Cases touched: DITL-T-03-ASK-01
New DITL needed: no
Seed/artifacts: none
Notes: Plan DITL-T-03 already names Needs triage as /inbox and list_inbox. The case steps only cover send/receive, and the run passed while list_inbox refused. When Chuck unblocks a rewrite, the case must assert the list, not only the message dual path. Prove-out does not wait on that rewrite. This seat does not staff ditl-scribe and does not file the DITL-UPDATE card.
```

## 8. Prove-out

CoS staffs `qa-engineer` after the Surface loop is terminal. This seat does not grade screenshots and does not staff that card. Loop `passed` is not product-complete.

Experience first. Web and phone. Teacher seat. No mock-up. No new Inbox. Do not remove `list_inbox`. Do not treat the screen inbox as the defect. Motion: none. Do not file AC-ASK-INBOX-1, AC-ASK-INBOX-2, or AC-ASK-INBOX-3 to engineering as defects.

Prove the teacher who can open `/inbox` for the open class can list that same Needs inbox from Ask. Prove Ask does not say teacher seat required for that teacher. Prove a student and a parent still cannot list the teacher inbox, including a teacher-who-is-also-parent while the active seat is parent. Office seat is not granted. An empty Needs list is a pass, not a refusal. Listing does not Approve, delete, or send.
