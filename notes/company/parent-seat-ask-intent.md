# Parent-seat Ask scope — IQG intent

Date: 2026-09-27
Card: t_1a9b5254
Author: qa-supervisor
PM card: t_b5c4e44c (parallel stamp; must not write this file)
Finding: t_99e3a96c (leave blocked, unassigned)
Case: DITL-DH-01-ASK-01
Status: QA Supervisor APPROVED

CEO lock (Chuck 2026-09-27): Fix the product so parent-seat Ask stays on the parent seat and hides the teacher roster and captures. Do not block Ask on the parent seat. Do not keep one mixed transcript.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: parent-seat Ask scope
Quality goals: AC-DUAL-ASK-1, AC-DUAL-ASK-2, AC-DUAL-ASK-3
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_1a9b5254
Intent gaps remaining: none
```

Surface: both
Persona: parent
Seat: parent
Motion: none

AC-DUAL-ASK-1: A teacher-who-is-also-a-parent, on the parent seat, opens Ask and stays on the parent tray.
AC-DUAL-ASK-2: That parent-seat Ask does not show the teacher roster or teacher captures.
AC-DUAL-ASK-3: Switching back to the teacher seat still shows the teacher tray and teacher Ask.

PM stamp is a sibling card. This note does not speak for PM.

## Hats

This lock is the parent seat of a teacher-who-is-also-a-parent. Persona is parent. Seat is parent. Same login, two altitudes. Not a new hat.

| Hat | In this stamp |
|---|---|
| Teacher-who-is-also-a-parent, Parent seat | Yes. Opening Ask stays on the parent tray. Parent-seat Ask does not show the teacher roster or teacher captures. Ask stays usable. |
| Same person, Teach seat | Yes, as the return path. Switching back shows the teacher tray and teacher Ask. That transcript is the teacher one, not the parent one. |
| Parent-only login | Keep existing parent Ask. Do not block it. Do not remove it. Do not send them to a new screen. |
| Student, office, superintendent | Out of this stamp. Do not change their Ask. Do not fix this by merging trays. |
| Office-who-is-also-a-parent | Out of this stamp (DITL-DH-02). Do not widen this lock into an office product. |

Dual-hat is a seat switch, not a blended tray. My children deep-link is not the Parent altitude. Ask on the teacher seat after only that deep-link stays teacher Ask.

## Entry

No new Ask screen, route, tab, or second chat. Web and phone. Motion: none. The screen is the Ask that already exists (`/ask`).

Parent tray today is Home, Ride, Calendar, Ask. Teach tray today is Desk, Needs Attention, Diary, Calendar, Kelyra. Do not invent a tray. Do not concatenate them.

Entry that must hold the parent seat:

- Parent tray Ask.
- In-app link to `/ask`.
- Bare navigation to `/ask` while Parent altitude is already the active seat in this signed-in session. That includes a same-session document load or refresh of `/ask`. The evidence path is that bare navigation. It must not restore the Teach tray (Desk, Needs, class chip, Open Capture).

Opening `/ask` must not change the active seat in either direction. Teacher-seat `/ask` stays the teacher tray. Parent-seat `/ask` stays the parent tray.

Cold launch is not this entry. DH-07 stays: force-quit, a killed app, or a new browser session still starts on the job-of-record seat (Teach for this hat), not Parent. This lock does not persist Parent across that cold launch. A same signed-in session that already chose Parent, then opens `/ask`, is not that cold launch.

## Lifecycle

**Start.** Signed in as the dual-hat teacher. Altitude switch to Parent (drawer Parent, not My children). Parent tray is up. Open existing Ask by tray or by bare `/ask`. Tray stays parent. Composer stays. Ask is not blocked.

**Change.** Ask on that seat uses the parent transcript only. A turn sent here appends to the parent transcript only. It must not list the teach-class roster or teacher captures, including in a new reply, not only by hiding old bubbles. Linked-child parent facts stay askable (do not remove parent Ask). The teacher class chip does not show on this seat.

**Finish.** Leave Ask the way they already leave: another parent tab, back, or sign out. No new close control. Parent seat remains parent until they switch or the session ends.

**Switch back.** Drawer Teach. Teacher tray returns. Teacher Ask is the teacher transcript, including a prior teacher thread if one exists. Parent turns are not mixed into that scroll.

**Switch again.** Drawer Parent. Parent tray and parent transcript return. Teacher roster, teacher captures, and the teacher class chip are absent again.

**Already on Ask.** If Ask is open on Teach and they switch to Parent, the screen stays `/ask` or follows the existing seat-switch navigation, but the visible tray, chip, and transcript become the parent seat's. Do not keep painting the teacher scroll under the parent tray.

**In flight.** A reply started on one seat belongs to that seat. Switching away must not drop it into the other transcript, and the other seat must not show it.

**New chat.** The existing New chat control clears only the active seat's open transcript. It must not wipe the other seat's transcript. It is not a new screen.

## Multiplicity

One linked child or more than one: parent-seat Ask shows parent facts for linked children only. It does not show the teach-class roster (classmates who are not the question). Sibling isolation from the parent Ask assignments lock stays: do not mix one child's work with a sibling's. This stamp does not reopen that lock.

A child who is also on the teacher's own class may still be talked about as a linked child. That is not permission to show the class roster, teacher captures, or desk drafts.

Two transcripts, one per active seat, for this login. Not one thread for the profile. Not a third transcript for a class, a child, or a device. Phone and web in the same seat see that seat's transcript, not a blend.

Teach seat still has its own class context. Parent seat does not inherit `classId` as teacher working context.

## Reverse / cancel

- Leave Ask without switching seat: parent tray remains. Coming back to Ask in that same parent altitude shows the parent transcript, not the teacher one.
- New chat clears the active seat only. Leaving that control unused leaves both transcripts as they were.
- Switch Teach, then Parent: each return shows that seat's tray and that seat's transcript. No concatenated tray. No concatenated scroll.
- Sign out ends the session. Next launch is a cold start (DH-07): Teach, not Parent. This lock does not add a Parent restore on that launch.
- Do not add a cancel control, a seat picker inside Ask, or a second thread list.

## Explicit non-goals

- Do not block Ask on the parent seat. Composer and send stay.
- Do not remove parent Ask. Do not remove teacher Ask.
- Do not keep one mixed transcript.
- Do not design a new Ask screen, a second Ask tab, or a thread picker.
- Do not persist Parent across force-quit or a new browser session (DH-07). Fixing bare `/ask` is not a license to cold-start on Parent.
- Do not treat My children deep-link as a Parent altitude switch.
- Do not add Approve on the parent seat. Do not reopen Pack B.
- Do not change student Ask, office Ask, or office-parent Ask (DITL-DH-02).
- Do not unblock `t_99e3a96c`. Do not parent work onto it.
- Do not invent chrome. Parent tray and Teach tray stay the trays that already exist.

## PROVE-OUT OBJECTIVE

CoS staffs qa-engineer from this OBJECTIVE after the Surface workflow is terminal (`t_48110044`). This seat does not staff that card. Loop passed is not product-complete. Do not file AC-DUAL-ASK-1, AC-DUAL-ASK-2, or AC-DUAL-ASK-3 to engineering as defects. They are the stamp. A miss after implementation is a new defect card. No mock-up. Experience first. Web and phone. Existing `/ask` only.

Full featured versus this stamp:

1. Dual-hat teacher-parent (F-DH-TP shape). Parent altitude already active. Open Ask from the parent tray. Tray stays parent (Home, Ride, Calendar, Ask). Not Desk, Needs, Diary, Calendar, Kelyra. No teacher class chip. Composer still sends. Ask is not blocked.
2. Same session, bare navigation to `/ask` (document load or refresh, not only the tray tab). Parent tray still holds. Teach tray does not return. That is the evidence path.
3. Parent-seat Ask does not show the teacher roster or teacher captures. A prior Teach transcript (class roster names, captures, desk drafts) is not in this scroll. A new parent question does not list that roster or those captures. Linked-child parent facts may still be asked. No new screen.
4. Switch back to Teach. Teacher tray returns. Teacher Ask shows the teacher transcript, not a mix with the parent turns, and not a wiped teacher thread if one existed before the switch.
5. Switch to Parent again. Parent transcript returns. Teacher roster and captures stay hidden. Trays are not concatenated.
6. New chat on the parent seat clears only the parent transcript. Switch to Teach and the teacher transcript is still there.
7. Parent-only login still has Ask on the parent tray. Teacher-seat `/ask` without a Parent switch still shows the teacher tray. My children deep-link does not flip the tray to parent. Cold start after force-quit or a new browser session still lands Teach, not Parent (DH-07).
8. `t_99e3a96c` stays blocked and unassigned.

Verify on the signed-in screen, both surfaces. Static source is aid only. Never sole PASS for the tray or the transcript. Do not grade a screenshot packet on this card.

## DITL IMPACT

```
DITL IMPACT
Change: Parent-seat Ask stays on the parent tray, including bare /ask in the same signed-in session, and hides the teacher roster and captures. Transcript is seat-scoped. Ask is not blocked. No new Ask screen.
Verdict: UPDATE_PLANS | UPDATE_CASES
Plans touched: DITL-DH-01
Cases touched: DITL-DH-01-ASK-01
New DITL needed: no
Seed/artifacts: none
Notes: Beat 10 and the Ask dual-path row still say parent context and no class-stack tools. They do not say bare /ask holds the parent tray, or that the transcript is seat-scoped both ways. The case expected line says context aware and no Approve. It does not fail a Teach tray on bare /ask, or a Teach roster still in the parent scroll. Rewrite, when Chuck unblocks it, thickens those lines. Prove-out does not wait on that rewrite. This seat does not rewrite the plans or cases, does not file the DITL-UPDATE card, and does not staff anyone.
```
