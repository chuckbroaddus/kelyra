# Parent-seat Ask stays on the parent seat

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_b5c4e44c`
**Lane:** `t_09285c7e`
**Finding:** `t_99e3a96c` stays blocked and unassigned. Do not unblock. Do not parent work onto it.
**QA Supervisor card:** `t_1a9b5254` (their stamp is not this note). Do not write `notes/company/parent-seat-ask-intent.md`.
**Continuation:** `t_48110044` waits on both stamps. Do not staff Engineering from this card.
**Case:** DITL-DH-01-ASK-01
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Fix the product so parent-seat Ask stays on the parent seat and hides the teacher roster and captures. Do not block Ask on the parent seat. Do not keep one mixed transcript.
**Status:** PM DESIGN STAMP APPROVED (`t_b5c4e44c`). Not Eng from this seat. No `src/`. No new Ask screen.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Parent-seat Ask stays on the parent seat
Quality goals: AC-DUAL-ASK-1, AC-DUAL-ASK-2, AC-DUAL-ASK-3, AC-DUAL-ASK-4
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_b5c4e44c
QA Supervisor: pending t_1a9b5254
Intent gaps remaining: none
```

## Lock lines

Surface: both
Persona: parent
Seat: parent
Motion: none
AC-DUAL-ASK-1: A teacher-who-is-also-a-parent, on the parent seat, opens Ask and stays on the parent tray.
AC-DUAL-ASK-2: That parent-seat Ask does not show the teacher roster or teacher captures.
AC-DUAL-ASK-3: Switching back to the teacher seat still shows the teacher tray and teacher Ask.
AC-DUAL-ASK-4: The transcript is seat-scoped. Parent-seat Ask and teacher-seat Ask are not one mixed transcript.

## 0. What is broken

CASE: DITL-DH-01-ASK-01. A teacher-who-is-also-a-parent switches to the parent seat, then bare navigation to `/ask` restores the Teach tray. The Ask transcript is one thread for the login, not scoped to the seat. The teacher roster and teacher captures stay visible after the Parent altitude switch.

Ask already exists on the parent tray. This is not a new screen. Do not remove parent Ask. Do not block the composer. Do not keep one mixed transcript. Opening Ask must not be a seat switch.

Today the parent tray is Home, Ride, Calendar, Ask. The Teach tray is Desk, Needs Attention, Diary, Calendar, Kelyra. Success is the parent tray staying. Do not redesign either tray. Do not bring back Capture or Class tabs.

Walls follow the active seat, not the job of record. A teacher profile sitting on the parent seat is parent for Ask chrome, tools, replies, and transcript. Checking only `profile.role` leaves the teacher roster and captures on the parent seat. That is the miss.

## 1. Stories

**Open Ask on the parent seat.** A teacher-who-is-also-a-parent has already switched to Parent. They open Ask from the parent tray Ask tab, or by bare navigation to `/ask` (typed URL, refresh, or in-app push), on phone and web. They stay on the parent seat. The parent tray stays. Teach tabs do not replace it. Ride stays. Desk and Needs Attention do not appear. The header stays parent chrome. No Teach capture. Seat preference stays parent. Opening Ask does not animate a seat switch. Motion: none.

**Hide the teacher roster and captures.** That parent-seat Ask does not show the teacher roster or teacher captures. Not in chips, not in a class chip, not in the transcript, not in the reply, and not in a list the existing Ask screen already renders. Teacher roster and capture tools do not run. A reply must not navigate to a teacher route (`/class`, `/inbox`, `/capture`, or a classmate). Stay on parent Ask. Drafts, extracts, Needs, and classmates stay hidden. Parent seat still cannot Approve.

**Ask stays usable.** The composer stays. The parent can ask about their own linked children. Empty state stays the existing parent prompt. Do not replace Ask with a blocked screen or remove the tab. Own-child post-Approve grades that parent Ask already shows are not the teacher roster and not teacher captures. Keep them. If the linked child is also in a class this person teaches, the parent seat still does not show that class roster or other students' captures. Only the linked child's parent-legal view.

**Seat-scoped transcript.** Parent-seat Ask loads and writes only the parent-seat transcript. Teacher-seat turns do not appear, including turns already stored in the shared thread. One open thread per login is the failure. The model context for a parent-seat turn is parent-seat turns only. Legacy rows with no seat are not shown on the parent seat. New chat clears only the active seat's transcript. It does not reveal or erase the other seat's transcript. Isolation is on open. The parent does not have to tap New chat to hide the teacher thread.

**Switch back.** Drawer Teach restores the teacher tray and teacher Ask. Teacher Ask shows the teacher transcript, and the teacher roster and captures the teacher seat already may see. Parent-seat turns do not appear there. Switch to Parent again restores the parent tray and the parent transcript. Two switches. No concatenated trays. No concatenated transcript.

**Same seat law.** The active parent seat owns this, including an office-who-is-also-a-parent who has switched to Parent. The named prove case stays DITL-DH-01 (teacher + parent). Office-seat Ask is unchanged. Student Ask is unchanged. A pure parent login still has parent Ask and no teacher roster. Cold start still does not restore the parent seat. That existing law is not this fix.

## 2. Acceptance

These match the lock. They do not add a second product choice.

**AC-DUAL-ASK-1.** A teacher-who-is-also-a-parent, on the parent seat, opens Ask and stays on the parent tray. Opens means the parent tray Ask tab and bare navigation to `/ask` (typed URL, refresh, in-app push), phone and web. Stays means the parent tray that seat already shows (Home, Ride, Calendar, Ask). Teach tray does not return. Ride stays. Desk and Needs Attention do not appear. Header stays parent chrome. Opening Ask does not change the seat. Refresh on `/ask` while the parent seat is active still shows the parent tray. A reply must not push a teacher route.

**AC-DUAL-ASK-2.** That parent-seat Ask does not show the teacher roster or teacher captures. Not in chips, class chip, transcript, reply, or an existing list on this screen. Tools that list the teacher roster or teacher captures do not run while the parent seat is active. Walls follow the active seat, not the job of record. Drafts, extracts, Needs, and classmates stay hidden. Parent seat still cannot Approve. Own linked children and their post-Approve grades stay. Those are not the teacher roster and not teacher captures. Hiding the child's published grades, or blocking the composer, is a failure.

**AC-DUAL-ASK-3.** Switching back to the teacher seat still shows the teacher tray and teacher Ask. Drawer Teach restores Desk, Needs Attention, Diary, Calendar, Kelyra. Teacher Ask shows the teacher transcript and the roster and captures the teacher seat already may see. Parent-seat turns are not in that transcript. Switch to Parent again restores the parent tray and the parent transcript. Two switches. No concatenated trays. No concatenated transcript.

**AC-DUAL-ASK-4.** The transcript is seat-scoped. Parent-seat Ask and teacher-seat Ask are not one mixed transcript. Each seat reads and writes only its own transcript. A turn written on one seat never appears on the other, including turns already in the shared thread. Legacy rows with no seat are not shown on the parent seat. Model context for a parent-seat turn is parent-seat turns only. New chat clears only the active seat. Isolation holds on open, without a New chat tap. One open thread per login is the failure.

**Must hold with those four.** Surface both. Persona parent. Seat parent. Motion none. No new Ask screen. Do not remove parent Ask. Do not block Ask. Do not keep one mixed transcript. Pure parent login still has parent Ask and no teacher roster. Office-who-is-parent, once on the parent seat, follows the same seat law. Office-seat Ask and student Ask stay as they are. My children deep-link is not a seat switch and is not this fix. Cold start still does not restore the parent seat.

## 3. Hats and non-goals

| Hat | This fix |
|---|---|
| Teacher who is also a parent, parent seat | Ask stays on the parent tray. No teacher roster or captures. Own transcript. Ask stays usable. Phone and web. |
| Same person, Teach seat | Teacher tray and teacher Ask return. Teacher transcript. Roster and captures only here. |
| Office who is also a parent, parent seat | Same parent-seat law. Not a new screen. |
| Office seat, student, pure parent | Unchanged, except pure parent must not gain a teacher roster. |
| Parent of more than one child | Existing child binding stays. No classmate roster. Do not block Ask. |

Entry is the existing Ask screen at `/ask`. Not a new screen.

Lifecycle: parent seat, open Ask, stay, ask about own child, switch Teach, teacher Ask, switch Parent again. Both directions. Transcripts do not mix.

Multiplicity: own classes versus own children must not blend. A linked child in this person's class still does not open the class roster on the parent seat. Two seats, two transcripts.

Non-goals:

- No new Ask screen. No tray redesign. No new motion.
- Do not remove parent Ask. Do not block Ask on the parent seat.
- Do not keep one mixed transcript. Do not require New chat to hide the other seat.
- Do not Approve from the parent seat. Do not show drafts or extracts there.
- Do not change My children into a seat switch. Do not persist the parent seat across cold start.
- Do not change office-seat Ask or student Ask.
- Do not unblock `t_99e3a96c`. Do not parent work onto it.
- Do not staff Engineering from this card. Do not write `notes/company/parent-seat-ask-intent.md`.

## 4. DITL IMPACT

DITL IMPACT
Plan: notes/company/ditl-plans/DITL-DH-01.md
Case: notes/company/ditl-cases/DITL-DH-01.md
Case id: DITL-DH-01-ASK-01
Finding: t_99e3a96c (leave blocked, unassigned)
Stamp: PM APPROVED 2026-09-27 on t_b5c4e44c. QA Supervisor stamp is t_1a9b5254, not this note.

Delta for the scribe. Do not edit those DITL files from this card.

- Beat 10 (Ask on parent seat): after the Parent altitude switch, tray Ask and bare `/ask` keep the parent tray (Home, Ride, Calendar, Ask). Teach tray does not return. No teacher roster. No teacher captures. No drafts, extracts, or Approve. Ask stays usable for the linked child (Morgan Patel / S3) and post-Approve grades only. Transcript on this seat is the parent transcript only.
- Beat 11 (Teach switch back): teacher tray returns. Teacher Ask returns with the teacher transcript. Parent turns are absent. Parent switch again restores the parent tray and parent transcript. No concatenated tray. No concatenated transcript.
- Case DITL-DH-01-ASK-01 steps: keep the seat switch, then `/ask`. Expected isolation now includes tray stay, roster and capture hide, and seat-scoped transcript. Bare `/ask` is in the case, not only a tray tap.
- Do not add a new Ask screen beat. Do not remove the parent Ask beat. Do not mark the case passed from this stamp.

## 5. Handoff

OBJECTIVE: Stamp the locked parent-seat Ask scope fix, or name a gap. Choice stays locked.
WORK PERFORMED: Stories and acceptance for parent-seat Ask on the existing screen. Tray stays parent. Teacher roster and captures stay hidden. Transcript is seat-scoped. Ask is not blocked. No app code. No Engineering card. Finding left blocked.
VERIFICATION: This note has PM: APPROVED, AC-DUAL-ASK-1 through AC-DUAL-ASK-4, Surface both, Persona parent, Seat parent, Motion none, the DITL IMPACT block, and the non-goals.
RESULT: PM: APPROVED. Intent gaps remaining: none.
OPEN ISSUES: QA Supervisor stamp is `t_1a9b5254`, not this card. Dual stamp is not claimed here.
ESCALATION NEEDED: none.
RECOMMENDED NEXT ACTION: QA Supervisor stamps `t_1a9b5254`. Continuation `t_48110044` waits on both stamps. Do not staff Engineering from this card. Do not unblock `t_99e3a96c`.

