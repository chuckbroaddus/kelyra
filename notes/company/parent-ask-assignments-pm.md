# Parent Ask assignments

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_407db7da`
**Lane:** `t_d38c9363`
**Finding:** `t_df0481c4` stays blocked and unassigned. Do not unblock. Do not parent work onto it.
**QA Supervisor card:** `t_0755b0ee` (their stamp is not this note)
**Continuation:** `t_0fa2c5d4` waits on both stamps. Do not staff Engineering from this card.
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Fix Ask so a parent can list that child's assignments. Do not remove the Ask path. Do not mix one child's work with a sibling's.
**Case:** DITL-P-02-ASK-01
**Status:** PM DESIGN STAMP APPROVED (`t_407db7da`). Not Eng from this seat. No `src/`. No new parent screen. No second messenger.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: parent Ask assignments
Quality goals: AC-PARENT-ASK-1, AC-PARENT-ASK-2, AC-PARENT-ASK-3
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_407db7da
QA Supervisor: pending t_0755b0ee
Intent gaps remaining: none
```

## Lock lines

Surface: both
Persona: parent
Seat: parent
Motion: none
AC-PARENT-ASK-1: A parent can list one child's assignments from Ask.
AC-PARENT-ASK-2: A parent with two children lists the child they asked about, not the sibling's work.
AC-PARENT-ASK-3: The message-the-teacher path still sends.

## 0. What is broken

DITL-P-02-ASK-01 signed in as ditl-parent-1 (parent seat only). Home showed two children, Jamie and Jordan. The run bound Jordan, opened existing Ask at `/ask`, and asked for Jordan Lee's assignments: titles, due dates, and class names. Do not invent. Do not change grades.

Ask had no `list_my_assignments` tool. The class assignment lookup failed. Assignments were not listed. The assistant did not invent titles. That is a miss against "Assignments listed."

The next Ask turn messaged the teacher. Message id aec15fe0 on thread 24afbe48 sent. Grades did not change. That path already works. It is not the bug.

Parent Ask today can call `my_children_progress` (all linked children, scores stripped, not an assignment list) and teacher `list_assignments` is `assignments.manage` and needs a class id. That class lookup is what failed. Student `list_my_practice` is student seat only. None of those is a parent list of one child's assignments.

The case also says Ask does not mutate grades. That already held. It must keep holding.

## 1. Stories

**One child.** As a parent with one linked child, I ask in existing Ask what that child is assigned. Ask lists that child's assignments. Phone and web. Seat parent. Motion none. No new screen.

**Named child.** As a parent with two children, I name one child in Ask. Ask lists that child's assignments only. The sibling's titles, dues, and class names are not in the list and not in the reply.

**Bound child.** If I already selected a child on Home and I do not name a different child, that selected child is the one I asked about. The evidence path bound Jordan, then asked for Jordan. Listing Jamie there is a miss.

**Child not identified.** If I have two or more linked children and I do not name one and none is selected, Ask does not blend them and does not guess a sibling. It asks which child in the existing Ask thread. That question is not a new parent screen.

**Several classes.** One child in more than one class still gets that child's assignments. A failed class-id lookup is not success, and it is not a reason to omit the list or to borrow the sibling's work.

**None assigned.** If that child has no assignments the parent seat may see, Ask says so for that child. It does not fill the list from a sibling and it does not invent titles.

**Message still sends.** After the list, or instead of it, the existing message-the-teacher path still sends. Do not remove it to make the list work. Do not add a second messenger.

## 2. Acceptance

These match the lock. They do not add a second product choice.

**AC-PARENT-ASK-1.** A parent can list one child's assignments from Ask. Existing Ask, phone and web. The reply names that child and lists that child's assignment titles. Due date and class name are included when the assignment has them. The list is assignments that child is assigned and the parent seat may already see. Not a draft key. Not another family's child. A failed class-id lookup is not success. Retrying teacher `list_assignments` is not success. Dumping `my_children_progress` is not success. Handing the parent student `list_my_practice` is not success. Invented titles are not success. A tool name is not the product. The list is.

**AC-PARENT-ASK-2.** A parent with two children lists the child they asked about, not the sibling's work. Named child wins. If no name and a child is already selected on Home, that selected child is the one. The other child's assignments are absent from the tool result and from the reply. If two or more children and neither a name nor a selection identifies one, Ask does not blend and does not guess. It asks which child in the existing Ask thread. An empty list for the asked child stays empty. It is not filled from the sibling.

**AC-PARENT-ASK-3.** The message-the-teacher path still sends. The path that already sent in DITL-P-02-ASK-01 still delivers a teacher message from Ask. Do not remove it. Do not replace it with a second sender. Do not add a tool whose only job is a new messenger. Grades stay unchanged on that send.

**Must hold with those three.** Phone and web. Parent seat only, including a person who also has another hat while they are seated as parent. No new parent screen. No new motion. Ask does not write a grade, an assignment, or a score. Nothing is a grade until the teacher Approves. The Ask path stays.

## 3. Hats and non-goals

| Hat | This Ask list |
|---|---|
| Parent | Existing Ask lists the asked child's assignments. Message path still sends. |
| Also-parent, seated as parent | Same parent rules. Not a new screen. |
| Teacher, office, student, superintendent | Not this stamp. Do not widen their tools to satisfy it. |
| Dual-hat person in teacher or office seat | Not this list. Switching back to parent seat uses the parent rules. |

Entry is existing Ask, phone and web (`/ask` or the Ask tab). Home may already have a child selected. That selection is context. It is not a new screen.

Lifecycle: the parent asks, Ask lists that child's assignments, and the parent can still message the teacher. The list does not write. The message still sends. Abandoning an Ask turn stays as it is. An unidentified child is a question in the thread, not a dead end and not a blend.

Multiplicity: one child, or the one child asked about among siblings. Several classes for that child are still that child's list. A failed class lookup does not switch children.

Non-goals:

- No new parent screen. No second assignment browser. No new motion.
- Do not remove the Ask path.
- Do not mix one child's work with a sibling's.
- Do not invent a second messenger. `send_message` stays the send path that already worked.
- Do not satisfy the list with teacher `list_assignments`, student `list_my_practice`, or an all-children `my_children_progress` dump.
- Do not give the parent assignment write, Approve, or grade edit.
- Do not mutate grades. The case already confirmed Ask does not.
- Parent Home upcoming work (DITL-P-02-UI-01) is not this stamp. Do not replace Ask with Home.
- Do not unblock `t_df0481c4`. Do not parent work onto it. Do not staff Engineering from this card. Do not GRANT grok-bot.

## 4. Handoff

OBJECTIVE: Stamp the locked parent Ask assignments choice, or name a gap. Choice stays locked.
WORK PERFORMED: Stories and acceptance for listing one child's assignments from existing Ask. Sibling work stays out. The message path still sends. No app code. No Engineering card. Finding left blocked.
VERIFICATION: This note has PM: APPROVED, the three AC-PARENT-ASK lines, Surface both, Persona parent, Seat parent, Motion none, and the non-goals. No new parent screen. No second messenger. The Ask path stays.
RESULT: PM: APPROVED. Intent gaps remaining: none.
OPEN ISSUES: QA Supervisor stamp is `t_0755b0ee`, not this card. Dual stamp is not claimed here.
ESCALATION NEEDED: none.
RECOMMENDED NEXT ACTION: QA Supervisor stamps `t_0755b0ee`. Continuation `t_0fa2c5d4` waits on both stamps. Do not staff Engineering from this card. Do not unblock `t_df0481c4`.

