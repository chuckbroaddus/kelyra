# Superintendent Capture icon — QA Supervisor stamp

Date: 2026-09-28
Card: t_6f669883
Parent tracker: t_3bd86748 (do not complete that card)
PM lock: notes/company/superintendent-capture-pm.md (t_6fd1d4c5)
Intent: notes/company/superintendent-capture-intent.md (t_50b07cb4)
Options: notes/company/superintendent-capture-options.md (t_4bebb648)
Author: qa-supervisor

Current verdict: Stamp 4, below. Stamp 1 stays REJECTED. Stamp 2 stays APPROVED and is not the build lock. Stamp 3 stays REJECTED and is not the build lock. Do not copy Stamp 1, Stamp 2, or Stamp 3 onto the parent.

Verdict: REJECTED. Choice A stays the product choice. The lock is not safe to copy onto the parent until the parent-tray lines change.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Superintendent Capture icon
Quality goals: agree with the PM goals (superintendent office seat can photograph an existing person, a student or parent card, a class list, or the school logo from the header Capture icon; parent and student stay dark; administrator stays dark; photograph is not Approve; a photo never creates a person or a class; phone and web follow the same outs). Limit: parent and student no-camera must not add or remove a tray tab.
Surface: both
Drive: missing from the feature map — do not invent
Persona: office
Seat: office
Motion: none
PM: APPROVED  date: 2026-09-28  profile-session: product-manager / t_6fd1d4c5
QA Supervisor: REJECTED  date: 2026-09-28  profile-session: qa-supervisor / t_6f669883
Intent gaps remaining: Parent story and AC-SC-8 restate a 3-tab parent tray (Home · Ride · Ask). That tray is not this icon. DITL-P-01 and the parent-seat Ask stamp keep Calendar and no camera.
```

## Review

Choice A, as locked, covers hats, entry, lifecycle, multiplicity, reverse, and the phase-1 non-goals. The reject is not a missing camera behavior. It is two lines that would delete a tab this icon does not own.

### Hats

Covered. Superintendent office seat: yes, except Messages, an open Search field, and My children. Administrator: out, named, not a silent yes. This seat does not reject the lock for leaving administrator off. Dual-hat office+teacher shows this papers shutter only on the superintendent office seat, and today's teacher shutter only on Teach. An office job of administrator stays dark on the office seat. Parent seat stays dark even when the login is also superintendent. Parent-only, student, and pure teacher do not gain this icon. Gate is the active seat, not `also_teacher`.

### Entry

Covered. The door is the header slot only. Existing `capture` glyph. Accessibility label Open Capture. Route `/capture`. Not a tray tab. Not a drawer row. Person-page `PhotoSheet` stays a second door. Messages, open Search, and My children hide this icon. No new glyph, route, or label.

### Lifecycle

Covered. The tap does not file. Confirm on this sheet is not Approve, not a score, and not a grade. This icon does not use `capture.approve`. A photo never creates a person, a login, or a class. The first cut is the closed list: existing student, existing parent, student or parent card, existing staff person, one existing class list, school logo. A data sheet that is not a student or parent card, and a school record that is not the logo, are named outs. Not a silent skip. Retake, dismiss, and cancel are controls that already exist. Nothing is filed before confirm. A preview that is dismissed is gone. An existing photo stays until they confirm the new one. A roster names an existing class, then reuses the existing confirm checklist. A staff face reuses the portrait picker and the existing `teacher` photo write. No new staff page. No new park screen.

### Multiplicity

Covered. One school. Not a district dashboard. Empty guess, low confidence, or two matches: they pick an existing person, and the row says student, parent, or staff. One shutter is one photo. A sheet that spans classes is out of this cut: pick one existing class or leave. Do not split the sheet. Do not create a class. Do not create a person. A name already on the roster is not a second row.

### Reverse

Covered. Dismiss before confirm: back where they were. No new person, no grade, no parked paper. Remove photo is the existing danger control. The person stays. The circle falls back to initials. A wrong enroll after roster confirm is undone with the existing office swipe Remove on class Students. That person is not deleted. This camera does not show Remove. A face on the wrong person: Remove on that person's existing photo sheet, then attach to the right existing person. No move control. No second delete verb.

### Non-goals

Covered. Not teacher homework Approve. Not the teacher homework camera copied onto the office seat. Not a camera for parent or student. Not this icon for administrator. Not this icon on Teach for a pure teacher. Not a tray tab. Not auto-create a person, a class, or an enroll. Not voice. Not a batch. Not library, files, or a mic on this seat. Not a records cabinet. Not an edit of `matrix.ts` or `roles.ts`. The photograph / Approve split is written in the lock. The files stay untouched.

## Gap

File that must change: `notes/company/superintendent-capture-pm.md`. Do not change the options pack into a new screen. Do not edit `docs/ui-design.md` from this card. Do not draw a screen.

1. Parent story: "My tray stays Home · Ride · Ask."
2. AC-SC-8: "Parent tray is Home · Ride · Ask."

Parent no-camera is already AC-SC-6. Those two lines restate a 3-tab tray. DITL-P-01 (2026-09-27, t_9fd8ed09) and the parent-seat Ask stamp (t_1a9b5254) keep Home · Ride · Ask · Calendar, and no camera. Building the lock as written would remove Calendar. That tab is not this icon.

Change those two lines to: no camera, and do not add or remove a tray tab. Leave AC-SC-6. Choice A does not need a new option.

## Not a reject reason

- Administrator out. Chuck named superintendent only. Named out. This seat does not reject the lock to put administrator in.
- School records that are not the logo, and data sheets that are not a student or parent card. Named outs. Not a silent skip. This seat does not reopen that list.
- Drive. `.grok/skills/verify-kelyra/features/` has no Open Capture line. This seat does not invent one. Engineering stays off until a Drive line is copied from that map.
- Legal and security. Flagged in the PM lock. Not browsed. Not cleared. Not an intent gap for a redesign.
- Office tray nouns in the lock match `docs/ui-design.md` (Feed · Classes · People · Manage · Ask). This icon must not rewrite that tray. A code drift is not a second gap on this card.
- Motion. The icon mounts and unmounts with seat and route, the way the teacher icon already hides. No new motion.

## Prove-out

Not written. Nothing is built. A prove-out OBJECTIVE waits for an APPROVED stamp. Do not execute tests. Do not staff `qa-engineer`.

## DITL IMPACT

```
DITL IMPACT
Change: Superintendent Capture icon — stamp rejected; no user-visible change accepted
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: Do not file DITL-UPDATE. After a later APPROVED stamp, the rows that would move are DITL-O-07 (office photo extract is a GAP today; a superintendent student or parent card would no longer be a gap; administrator stays a gap), DITL-O-01 (superintendent header camera vs administrator none), and DITL-DH-02 (parent seat and My children stay dark; superintendent office seat shows Open Capture). Do not rewrite those plans against this rejected lock. Parent tray Calendar is already in DITL-P-01. This reject does not reopen it.
```

## Stop

Do not complete t_3bd86748. Do not implement. Do not start a build loop. Do not staff anyone. CoS does not copy a REJECTED stamp onto the parent as APPROVED. PM changes the two lines. This seat stamps again on a later card.

## Stamp 2

Date: 2026-09-28
Card: t_aafe1d69
Parent tracker: t_3bd86748 (do not complete that card)
PM lock: notes/company/superintendent-capture-pm.md (t_6fd1d4c5; parent-tray fix t_b72f98ec)
Prior stamp: Stamp 1 on this file (t_6f669883) stays REJECTED
Author: qa-supervisor

Verdict: APPROVED. The Parent story and AC-SC-8 are fixed. No new gap. Choice A stays. Nothing is built.

### DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Superintendent Capture icon
Quality goals: agree with the PM goals (superintendent office seat can photograph an existing person, a student or parent card, a class list, or the school logo from the header Capture icon; parent and student stay dark; administrator stays dark; photograph is not Approve; a photo never creates a person or a class; phone and web follow the same outs). Parent story and AC-SC-8 now say no camera, and do not add or remove a tray tab.
Surface: both
Drive: missing from the feature map — do not invent
Persona: office
Seat: office
Motion: none
PM: APPROVED  date: 2026-09-28  profile-session: product-manager / t_6fd1d4c5
Parent-tray fix: 2026-09-28  card: t_b72f98ec  PM: APPROVED stands
QA Supervisor: APPROVED  date: 2026-09-28  profile-session: qa-supervisor / t_aafe1d69
Intent gaps remaining: none
```

## What changed

Read `notes/company/superintendent-capture-pm.md` after t_b72f98ec. The lock no longer contains Home · Ride · Ask.

Parent story: "No camera, and do not add or remove a tray tab."
AC-SC-8: "Parent seat of a dual-hat login: no camera, and do not add or remove a tray tab."

Those lines do not name a 3-tab tray. They do not add a tray tab. They do not remove a tray tab. Calendar stays where DITL-P-01 already put it. This icon does not own that tray.

Quality goal 2 says no tray tab is added. AC-SC-8 is the stronger line: do not add or remove. Agree with the PM quality goals. The Stamp 1 limit is met. Not a new gap.

## Prior review still holds

Hats, entry, lifecycle, multiplicity, reverse, and non-goals were covered on Stamp 1. This restamp did not reopen them. No new gap.

Administrator stays out. Photograph is not Approve. A photo never creates a person, a login, or a class. Legal and security stay flagged, not cleared, not browsed. Drive is still missing: `.grok/skills/verify-kelyra/features/` has no Open Capture line. Do not invent a route, a label, or a Drive line. Office tray nouns in the designer tell are not this icon's parent tray. Motion: none. Chuck mock-up is still required before build. This seat does not invent a mock-up path.

## Prove-out

Not executed. Nothing is built. Do not staff `qa-engineer` from this seat. Chief of Staff staffs that card after build, from the OBJECTIVE below. This seat does not grade screenshots.

```
PROVE-OUT OBJECTIVE:
Prove the stamped Superintendent Capture icon against notes/company/superintendent-capture-pm.md and Stamp 2 in notes/company/superintendent-capture-stamp.md. Run this only after implementation. Experience-first: sign in and look. Do not pass on code inspection alone. Verify the acceptance ids below. Do not invent a Drive line. The feature map has no Open Capture line. A screen check that needs Drive waits until that line is copied from the map. This seat does not invent the route or the control.

Full featured means the superintendent office seat can start from the header Capture icon, accessibility name Open Capture, and photograph one still of an existing student, an existing parent, an existing staff person, a student or parent card, one existing class list, or the school logo. The tap opens /capture and does not file. Confirm on that sheet is not Approve, not a score, and not a grade. A photo never creates a person, a login, or a class.

Hats and chrome. AC-SC-1, AC-SC-5, AC-SC-6, AC-SC-7, AC-SC-8, AC-SC-9, AC-SC-10, AC-SC-11, AC-SC-23.
Superintendent office seat, not on Messages, Search closed, not on My children: the camera sits immediately left of Search, name Open Capture. Administrator office seat: no camera. Search sits immediately left of messages. Parent seat: no camera. Student seat: no camera. No tray shows a Capture tab. Do not add a tray tab. Do not remove a tray tab. Do not grade Calendar. Leave Calendar where DITL-P-01 already put it. This icon does not own that tray. Dual-hat parent seat: no camera, and the tray tab count is unchanged (AC-SC-8). Teach seat: today's teacher camera, name Open Capture, today's homework Capture, not this papers strip. Messages, Search open, and My children hide this camera. Leaving My children shows it again when the other show rules pass. Phone and web: same icon rules, same label, same outs. Gate on the active seat. Office and Teach never show both shutters. An office job of administrator stays dark on the office seat.

Lifecycle. AC-SC-2, AC-SC-3, AC-SC-4, AC-SC-12, AC-SC-14, AC-SC-15, AC-SC-16, AC-SC-17, AC-SC-18, AC-SC-24.
The tap does not file. One camera still. No Photo or Video, Files, mic, drop target, or Upload class stack on this seat. The confirm strip names only a person paper, a roster, or the school logo. Not homework. Not Approve. Not a grade. No matching person: stop. No new person, login, or class. Staff: pick an existing staff person, then the existing photo sheet, writing the existing teacher photo. No new staff page. A student or parent card uses the existing checklist. Each field is checked before it writes. IEP and 504 stay a note, not an extracted field. A paper that is not a student card, a parent card, a roster, or the school logo is a refusal. Nothing is filed. A handbook, a policy, or minutes is a refusal. No records cabinet. Roster: name an existing class, then the existing confirm checklist. No new class.

Multiplicity. AC-SC-13, AC-SC-18.
Empty guess, low confidence, or two matches: pick existing people. Each row says student, parent, or staff. No new picker screen. A sheet that spans classes: pick one existing class or leave. Do not split the sheet. Do not create a class or a person. A name already on the roster is not a second row. One shutter is one photo.

Reverse. AC-SC-19, AC-SC-20, AC-SC-21, AC-SC-22.
Cancel or dismiss before confirm: back where they were. No new person, no grade, no parked paper. A preview is gone. If they were replacing a photo, the old photo stays. A person, class, or logo that already has a photo does not change until confirm. Remove photo is the existing danger control. The person stays. The circle falls back to initials. A wrong enroll after roster confirm is undone with the existing office swipe Remove on class Students. That person is not deleted. This camera does not show Remove. A face on the wrong person: Remove on that person's existing photo sheet, then attach to the right existing person. No move control.

Fail if any of these appear: a parent or student camera; a tray tab added or removed, including a Capture tab or a deleted Calendar tab; this icon on the administrator office seat; Approve, a score, or a grade on this sheet; a new person, login, or class from a photo; IEP or 504 extracted into fields; a school record that is not the logo stored. The legal and security flag is not cleared by this prove-out.

Surface: both. Persona: office. Seat: office. Motion: none.
Do not complete t_3bd86748 from the prove-out card. Do not treat a missing Drive line as a pass. Do not rewrite DITL plans from the prove-out card.
```

## DITL IMPACT

```
DITL IMPACT
Change: Superintendent Capture icon — Stamp 2 APPROVED. Superintendent office seat would gain header Open Capture for the closed paper list. Parent and student stay dark. Administrator stays dark. No tray tab added or removed. Nothing is built on this card.
Verdict: UPDATE_PLANS
Plans touched: DITL-O-07, DITL-O-01, DITL-DH-02
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: Still the rows named on Stamp 1. That note said those rows would move after an APPROVED stamp. That is still the verdict. Do not rewrite the plans from this card. CoS files DITL-UPDATE. Chuck unblocks before any rewrite.
DITL-O-07 still says photo extract is PARTIAL/GAP because there is no office Capture tray (beat 5; non-goal office camera student_card pipeline). After this icon ships, a superintendent student or parent card is no longer that gap. Administrator stays a gap. Cases DITL-O-07-UI-01 and DITL-O-07-UI-02 stay the administrator manual-edit path. Do not rewrite them to expect a camera.
DITL-O-01 does not split a superintendent header camera from administrator none. After ship, superintendent office chrome includes Open Capture except Messages, open Search, and My children. Administrator has no camera.
DITL-DH-02 does not say parent seat and My children stay dark, or that the superintendent office seat shows Open Capture. Beat 8 still says Home·Ride·Ask only. That 3-tab line is not this icon. Leave Calendar where DITL-P-01 already put it. Do not use this DITL-UPDATE to add or remove a parent tray tab.
```

## Stop

Do not complete t_3bd86748. Do not implement. Do not start a build loop. Do not staff anyone. Do not clear the legal and security flag. Do not edit app code, docs/ui-design.md, or the options pack. Engineering stays off until CoS copies this APPROVED stamp onto the parent, a Drive line is copied from the feature map, and a Chuck mock-up exists. This seat does not invent those.

## Stamp 3

Date: 2026-09-28
Card: t_54089753
Parent tracker: t_3bd86748 (do not complete that card)
PM lock: notes/company/superintendent-capture-pm.md (revision t_f5021e92). PM: APPROVED 2026-09-28 for this revision. This seat does not edit that file.
Prior stamps: Stamp 1 on this file (t_6f669883) stays REJECTED. Stamp 2 on this file (t_aafe1d69) stays APPROVED and is not the build lock.
Author: qa-supervisor

Verdict: REJECTED. Every account has a header shutter in the revision lock. That is not the reject. The student contact and emergency card has no leave after confirm. Do not put a seat back in the dark.

### DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Capture on all accounts
Quality goals: agree with the revision goals except the student contact and emergency card is not safe to copy until the leave path is named. Every account has a header shutter in this lock. Photograph is not Approve. A photo never creates a person, a login, or a class. No tray tab is added or removed.
Surface: both
Drive: missing from the feature map — do not invent
Persona: office, teacher, parent, student (the seat that must be signed in is named in the review below; not used as a prove-out, because this stamp is REJECTED)
Seat: the active seat, not the extra hat
Motion: none
PM: APPROVED  date: 2026-09-28  profile-session: product-manager / t_f5021e92
QA Supervisor: REJECTED  date: 2026-09-28  profile-session: qa-supervisor / t_54089753
Intent gaps remaining: Student contact or emergency card. The checklist may write keys the student seat hides. No leave after confirm is named. File that must change: notes/company/superintendent-capture-pm.md.
```

## Review

Every account has a header shutter in the revision lock. Yes. CEO 2026-09-28 said every account supports capture. This lock does that. This seat does not reject to put a seat back in the dark.

Signed-in seat, not the extra hat:

- Superintendent, office seat: papers shutter, including the school logo. Hidden on Messages, while Search is open, and on My children.
- Administrator, office seat: papers shutter. School logo refused. Same hides. In. Not dark.
- Teach seat, including a pure teacher: today's homework Capture. Not the papers shutter. Not both.
- Parent seat, including parent-only: parent shutter. Own record and a linked child only. Hidden on Messages and while Search is open. Not a tray tab.
- Student seat: student shutter. Own record only. Hidden on Messages and while Search is open. Not a tray tab.
- Dual-hat: one shutter, the active seat. The shutter that was showing unmounts before the next seat paints. Office job of record decides the logo. An administrator office job refuses the logo. Parent shutter only while Parent is the active seat. Student shutter only while Student is the active seat.

Parent and student trays do not gain or lose a tab. The Parent story, AC-SC-6, and AC-SC-8 say do not add a tray tab and do not remove a tray tab. They do not restate Home · Ride · Ask. Calendar stays where DITL-P-01 put it: Home · Ride · Ask · Calendar, four tabs. Student tray stays the six tabs that plan already has. No tray shows a Capture tab. Capture is not a tray tab. Not the reject.

Hats, entry, multiplicity, and non-goals are covered for the seats that are not the gap. Entry is the header slot. Accessibility label Open Capture. Route /capture. Existing capture glyph. Not a drawer row. Person-page PhotoSheet stays. Messages, open Search, and My children (office chrome still up) hide the icon. No new glyph, route, or label. Motion: none. The icon mounts and unmounts with seat and route, the way the teacher icon already hides.

Office closed list and refusals cover lifecycle, multiplicity, and reverse. Confirm is not Approve. A photo never creates a person, a login, or a class. Same-name pick is existing people at this school, and the row says student, parent, or staff. A sheet that spans classes is pick one existing class or leave. Cancel before confirm files nothing. A wrong enroll uses the existing office swipe Remove. A wrong face uses the existing photo sheet Remove, then attach to the right existing person. School logo is superintendent office seat only. Administrator refuses it. Nothing is filed.

Parent closed list and refusals cover lifecycle, multiplicity, and reverse. Own portrait, a linked child's portrait, own contact card, that child's contact or emergency card. Another family is a refusal. A same-name person who is not this parent and not a linked child is a stop. AC-SC-29 lists only this parent and children already linked. The parent sentence scopes the checklist to people that seat may already touch. A parent can already edit a linked child's details, including emergency, from Edit details. A parent can already change their own photo and their own profile contact fields. That is the leave. Not the reject.

## Gap

File that must change: `notes/company/superintendent-capture-pm.md`. Do not edit `docs/ui-design.md`. Do not edit the options pack. Do not draw a screen. Do not remove the student header shutter. Do not put administrator, parent, or student back in the dark. CEO said every account supports capture. This reject does not contradict that line.

Student portrait is in and has a leave. The student can already change their own face. Remove photo is the existing danger control. AC-SC-22 lets the student pick only themselves. That part is not the gap.

The student closed list also includes their own contact or emergency card. The student story, AC-SC-15, AC-SC-27, and gap 16 say the existing checklist may write the same checked canonical fields the teacher path already writes, on the student's own record. The student sentence does not say "may already touch." It says their own record only.

Those card keys are hidden on the student seat today. Teacher-only student keys include phone, email, address, emergency_name, and emergency_phone. The student's own profile hides those fields. After confirm, the student cannot open them. AC-SC-19 is cancel before confirm. That is not a leave after confirm. AC-SC-22 undoes a wrong person. It does not undo a field the student cannot see.

The lock must say one of these, in the PM file, without a new screen and without a new label:

1. The student confirm strip drops keys that seat cannot already change. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in.
2. Or name the existing control the student can already use to undo those fields after confirm. This seat did not find that control. Do not invent one.

This seat does not pick which. Choice A stays for the superintendent office seat. Administrator stays in. The school-logo block stays superintendent-only.

## Not a reject reason

- A missing header shutter. Every account has one in this lock. Do not copy Stamp 2's dark seats forward.
- Parent and student tray tabs. The lock does not add one and does not remove one. Calendar stays where DITL-P-01 put it.
- Administrator in, without the school-logo block. CEO put capture on that seat and did not give it the logo. Named refusal. Not a silent yes.
- Teacher keeps today's homework Capture and does not also show the papers shutter. That is still capture. Not a dark account.
- Drive. `.grok/skills/verify-kelyra/features/` has no Open Capture line. The map lists Office home, Messages, Student To Do, Ask, Pickup restriction, Phone sign-in, and Splash centering. This seat does not invent a Drive line. Engineering stays off until a Drive line is copied from that map.
- Legal and security. Flagged in the PM lock. The legal note read the old seat list. It is not clearance and not the current seats. Not browsed. Not cleared. Not the reason for this reject.
- Motion. None. No new motion.
- Chuck mock-up. Still required before build. This seat does not invent a mock-up path.

## Prove-out

Not written. Nothing is built. A prove-out OBJECTIVE waits for an APPROVED stamp. Do not execute tests. Do not staff `qa-engineer`. Do not copy Stamp 2's prove-out forward. That objective still says parent and student have no camera, and administrator has no camera.

## DITL IMPACT

```
DITL IMPACT
Change: Capture on all accounts — Stamp 3 REJECTED. No user-visible change accepted.
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: Do not file a new DITL-UPDATE from this reject. Do not rewrite the plans. t_dc2e1120 is stale. It encodes Stamp 2: parent and student stay dark, administrator stays dark, and administrator photo extract stays a gap. Do not unblock that card to write those lines. Do not complete it as if Stamp 2 were still the build lock. A later APPROVED stamp names the rows. Until then, do not copy these notes into the plans.
After a later APPROVED stamp, the rows that would move are DITL-O-07, DITL-O-01, DITL-DH-02, DITL-P-01, and DITL-S-01. Do not add or remove a tray tab in any of those rewrites. Calendar stays where DITL-P-01 put it.
DITL-O-07 still says office photo extract is a gap because there is no office Capture tray. After an approved ship, a student or parent card on either office seat would no longer be that gap. The school logo stays superintendent-only. Do not copy "administrator stays a gap."
DITL-O-01 does not say either office seat shows Open Capture. After an approved ship, both office seats would, except Messages, open Search, and My children. The strip includes the school logo only when the office job is superintendent.
DITL-DH-02 does not say the parent seat shows the parent shutter. My children, office chrome still up, stays hidden. Beat 8 still says Home·Ride·Ask only. That 3-tab line is not this icon. Do not use the update to add or remove a parent tray tab.
DITL-P-01 beat 2 says four tabs and no camera. After an approved ship the tray stays four, including Calendar, and the header would show Open Capture except Messages and open Search. Do not read "no camera" as a reason to delete Calendar or to keep the header dark.
DITL-S-01 lists Capture camera as a non-goal. After an approved ship that line would be stale for a header shutter on the student's own record. The tray stays six tabs. Do not add or remove a student tray tab. DITL-S-02 diary camera is a different sheet. Do not merge them.
DITL-T-01, DITL-T-02, and DITL-DH-01 keep today's homework Capture. Do not add the papers shutter to Teach.
```

## Stop

Do not complete t_3bd86748. Do not implement. Do not start a build loop. Do not staff anyone. Do not clear the legal and security flag. Do not edit app code, docs/ui-design.md, or the PM lock. CoS does not copy a REJECTED stamp onto the parent as APPROVED. PM changes the student contact and emergency card leave path. This seat stamps again on a later card. Engineering stays off.

## Stamp 4

Date: 2026-09-28
Card: t_8b45af26
Parent tracker: t_3bd86748 (do not complete that card)
PM lock: notes/company/superintendent-capture-pm.md (student-card leave t_4bbb40d6). PM: APPROVED 2026-09-28 for that leave. This seat does not edit that file.
Prior stamps: Stamp 1 (t_6f669883) stays REJECTED. Stamp 2 (t_aafe1d69) stays APPROVED and is not the build lock. Stamp 3 (t_54089753) stays REJECTED and is not the build lock.
Author: qa-supervisor

Verdict: APPROVED. The student leave is named. The student story, AC-SC-15, AC-SC-27, and gap 16 agree. Cancel before confirm is not offered as the leave. No new gap. Option 1 stands. Nothing is built.

### DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Capture on all accounts
Quality goals: agree with the revision goals. Every account has a header shutter. Superintendent office seat keeps Choice A, including the school logo. Administrator office seat captures the same papers and does not get the school-logo block. Teacher keeps today's homework Capture and does not also show the papers shutter. Parent captures only their own record and a linked child, never another family, and no tray tab is added or removed. Student captures their own portrait. The confirm strip drops keys that seat cannot already change. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. Never another student, a staff photo, or a school roster. No tray tab is added or removed. Photograph is not Approve. A photo never creates a person, a login, or a class. Phone and web follow the same outs.
Surface: both
Drive: missing from the feature map — do not invent
Persona: office, teacher, parent, student
Seat: the active seat
Motion: none
PM: APPROVED  date: 2026-09-28  profile-session: product-manager / t_f5021e92
Student-card leave: PM: APPROVED  date: 2026-09-28  profile-session: product-manager / t_4bbb40d6
QA Supervisor: APPROVED  date: 2026-09-28  profile-session: qa-supervisor / t_8b45af26
Intent gaps remaining: none
```

## Agreement

Read the student story, AC-SC-15, AC-SC-27, and gap 16 in notes/company/superintendent-capture-pm.md after t_4bbb40d6. They agree. Pick is option 1 from Stamp 3. This seat does not reopen the seats.

Shared rule, in all four places: the student confirm strip drops keys that seat cannot already change. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in.

The student story says that in the first person. It does not offer cancel as the leave. AC-SC-27 names the same drop, the same refusal, and the same portrait. It does not offer cancel as the leave. AC-SC-15 and gap 16 add the same five names and say cancel before confirm is not that leave. Undoing a wrong person is not a leave for a hidden field. Gap 16 also says this lock does not name a new control, and does not invent a screen or a label.

The five names are phone, email, address, emergency_name, and emergency_phone. "Include" is not a closed drop list. The rule is every key that seat cannot already change. A reader must not keep allergies, health_conditions, notes, or grade_or_age because those five names were the only ones written down. Those four are teacher-only on the student seat today. They drop under the same rule. This seat does not add them as a new product list. It does not send the card back for a fifth name.

Keys the student can already change today are not a new control. Preferred name and birthday are on the student profile. The portrait is the existing photo control. A card that still has one of those may write only that key, on the student's own record, each field checked. The existing profile edit, or the existing photo sheet, is the leave for that key. A card that has none of them is the refusal. Nothing is filed. The portrait path stays available. "The portrait stays in" is that path. It is not a write from a refused card.

AC-SC-19 stays cancel or dismiss before confirm. That is the preview leave. It is not the leave for a hidden field. The lock does not offer it as that leave. AC-SC-22 still undoes a wrong person. It does not undo a field the student cannot see. Those two lines are not the gap anymore, because the hidden keys are not filed.

## Not a new gap

No new control. No new screen. No new label. No new route. The student header shutter stays. Every account still has a header shutter. Do not put a seat back in the dark. No tray tab is added or removed. Calendar stays where DITL-P-01 put it. Parent and student trays are not this icon.

Drive is still missing. `.grok/skills/verify-kelyra/features/` lists Office home, Messages, Student To Do, Ask, Pickup restriction, Phone sign-in, and Splash centering. It has no Open Capture line. This seat does not invent one.

Legal and security stay flagged. Not browsed. Not cleared. Not a reason to reject the leave.

Motion: none. Chuck mock-up is still required before build. This seat does not invent a mock-up path. Choice A stays for the superintendent office seat. The school-logo block stays superintendent-only.

## Prove-out

Not executed. Nothing is built. Do not staff `qa-engineer` from this seat. Chief of Staff staffs that card after build, from the OBJECTIVE below. This seat does not grade screenshots. Do not copy Stamp 2's prove-out forward. That objective still says parent and student have no camera, and administrator has no camera.

```
PROVE-OUT OBJECTIVE:
Prove Capture on all accounts against notes/company/superintendent-capture-pm.md and Stamp 4 in notes/company/superintendent-capture-stamp.md. Run this only after implementation. Experience-first: sign in and look. Do not pass on code inspection alone. Verify the acceptance ids below. Do not invent a Drive line. The feature map has no Open Capture line. A screen check that needs Drive waits until that line is copied from the map. This seat does not invent the route or the control.

Full featured means every signed-in account can start from one header shutter, accessibility name Open Capture, route /capture. The tap does not file. Confirm is not Approve, not a score, and not a grade. A photo never creates a person, a login, or a class. One seat shows one shutter. No tray tab is added or removed.

Hats and chrome. AC-SC-1, AC-SC-5, AC-SC-6, AC-SC-7, AC-SC-8, AC-SC-9, AC-SC-10, AC-SC-11, AC-SC-23, AC-SC-28.
Superintendent office seat, not on Messages, Search closed, not on My children: the camera sits immediately left of Search, name Open Capture. The strip may name the school logo. Administrator office seat, same show rules: the camera is there. The strip does not name the school logo. A logo photo is a refusal. Nothing is filed. Teach seat: today's homework Capture only, name Open Capture. Not the papers shutter. Not both. Parent seat, including parent-only: parent shutter, except on Messages and while Search is open. Student seat: student shutter, same hides. No tray shows a Capture tab. Do not add a tray tab. Do not remove a tray tab. Do not grade Calendar. Leave Calendar where DITL-P-01 already put it. Dual-hat: one shutter, the active seat. The shutter that was showing unmounts before the next seat paints. Office and Teach never show both. Parent does not show the office shutter. An office job of administrator stays without the logo on the office seat. Phone and web: same icon rules, same label, same outs for that seat.

Lifecycle, office and parent. AC-SC-2, AC-SC-3, AC-SC-4, AC-SC-12, AC-SC-14, AC-SC-15, AC-SC-16, AC-SC-17, AC-SC-18, AC-SC-24, AC-SC-25, AC-SC-26.
Papers seats: one camera still. No Photo or Video, Files, mic, drop target, or Upload class stack. Teach keeps today's composer. Superintendent confirm strip names only a person paper, a roster, or the school logo. Administrator strip names only a person paper or a roster. Parent strip names only their own portrait, a linked child's portrait, their own contact card, or that child's contact or emergency card. Not another family. Not a staff person. Not a roster. Not the school logo. Not homework. Not Approve. Not a grade. No matching person: stop. No new person, login, or class. Office staff: pick an existing staff person, then the existing photo sheet. Parent and student: a staff photo is a refusal. A paper outside that seat's closed list is a refusal. Nothing is filed. A handbook, a policy, or minutes is a refusal on every seat. Office roster: name an existing class, then the existing confirm checklist. Parent and student: a class list is a refusal.

Student leave. AC-SC-15, AC-SC-27, and gap 16. This is the Stamp 3 gap. It is closed only if these hold on the student seat.
The student can photograph their own face. The confirm strip names that portrait. It drops every key that seat cannot already change. Those keys include phone, email, address, emergency_name, and emergency_phone. They also include the other keys that seat cannot already change today, including allergies, health_conditions, notes, and grade_or_age. Do not treat the five names as a closed list that lets the others through. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait path stays. A refused card does not write a portrait. A card that still has a key the student can already change may write only that key, on their own record, each field checked. Preferred name and birthday are keys that seat can already change today. Do not require a new editor for them. The existing profile edit is the leave. Do not invent a control, a screen, or a label. Another student, a staff photo, a parent record, a roster, the school logo, homework, Turn in, Approve, and a grade are not on the strip.

Multiplicity. AC-SC-13, AC-SC-18, AC-SC-29.
Office: empty guess, low confidence, or two matches means pick existing people at this school. Each row says student, parent, or staff. No new picker screen. Parent pick lists only this parent and children already linked. A person outside that set is a stop. Student pick is themselves only. A classmate is a stop. A sheet that spans classes, office only: pick one existing class or leave. Do not split the sheet. Do not create a class or a person. One shutter is one photo.

Reverse. AC-SC-19, AC-SC-20, AC-SC-21, AC-SC-22.
Cancel or dismiss before confirm: back where they were. No new person, no grade, no parked paper. That is the preview leave. It is not the leave for a hidden student field. Fail if a hidden key was written and cancel-before-confirm is offered as the undo. A person, class, or logo that already has a photo does not change until confirm. Remove photo is the existing danger control. The person stays. The circle falls back to initials. A wrong enroll after roster confirm is undone with the existing office swipe Remove on class Students. That person is not deleted. This camera does not show Remove. A face on the wrong person: Remove on that person's existing photo sheet, then attach to the right existing person that seat may already touch. A student may pick only themselves. No move control.

Fail if any of these appear: a seat with no header shutter when the show rules pass; a tray tab added or removed, including a Capture tab or a deleted Calendar tab; the school logo on an administrator, teacher, parent, or student strip; Approve, a score, or a grade on this sheet; a new person, login, or class from a photo; a student confirm that writes a key that seat cannot already change; a student contact or emergency card filed when it has no field that seat can already change; a new control, screen, or label invented as the student leave; IEP or 504 extracted into fields. The legal and security flag is not cleared by this prove-out.

Surface: both. Persona: office, teacher, parent, student. Seat: the active seat. Motion: none.
Do not complete t_3bd86748 from the prove-out card. Do not treat a missing Drive line as a pass. Do not rewrite DITL plans from the prove-out card. Do not copy Stamp 2 forward.
```

## DITL IMPACT

```
DITL IMPACT
Change: Capture on all accounts — Stamp 4 APPROVED. Every account would gain one header shutter for that seat's closed list. The student confirm strip drops keys that seat cannot already change. A contact or emergency card with no such field is a refusal. Nothing is filed. The portrait stays in. No tray tab is added or removed. Nothing is built on this card.
Verdict: UPDATE_PLANS
Plans touched: DITL-O-07, DITL-O-01, DITL-DH-02, DITL-P-01, DITL-S-01
Cases touched: DITL-P-01 (expects no camera), DITL-O-07 (expects photo-extract GAP)
New DITL needed: no
Seed/artifacts: none
Notes: Still the rows named on Stamp 3. That note said a later APPROVED stamp would touch DITL-O-07, DITL-O-01, DITL-DH-02, DITL-P-01, and DITL-S-01. That is still the verdict. The student leave does not add a plan and does not remove one. Do not rewrite the plans from this card. Do not add or remove a tray tab in any of those rewrites. Calendar stays where DITL-P-01 put it. CoS files DITL-UPDATE. Chuck unblocks before any rewrite. This seat does not staff that card.
t_dc2e1120 is still stale. It encodes Stamp 2: parent and student stay dark, administrator stays dark, and administrator photo extract stays a gap. Do not unblock that card. Do not complete it. Do not copy those lines into the plans.
DITL-O-07 still says office photo extract is a gap because there is no office Capture tray. After an approved ship, a student or parent card on either office seat would no longer be that gap. The school logo stays superintendent-only. Do not copy "administrator stays a gap." DITL-O-07-UI-01 and DITL-O-07-UI-02 stay the manual preferred-name path. Do not rewrite them on this card. After the plan rewrite they must not still say photo-extract stays a GAP for an office seat that has this shutter.
DITL-O-01 does not say either office seat shows Open Capture. After an approved ship, both office seats would, except Messages, open Search, and My children. The strip includes the school logo only when the office job is superintendent.
DITL-DH-02 beat 8 still says Home·Ride·Ask only. That 3-tab line is not this icon. After an approved ship the parent seat would show the parent shutter. My children, office chrome still up, stays hidden. Do not use the update to add or remove a parent tray tab.
DITL-P-01 beat 2 says four tabs and no camera. After an approved ship the tray stays four, including Calendar, and the header would show Open Capture except Messages and open Search. Do not read "no camera" as a reason to delete Calendar or to keep the header dark. The DITL-P-01 cases that expect no camera follow that plan rewrite. Do not rewrite them on this card.
DITL-S-01 lists Capture camera as a non-goal. After an approved ship that line would be stale for a header shutter on the student's own record. The hidden-key drop is part of that shutter, not a new day. Do not add or remove a student tray tab. Do not use this update to change the tray count the plan already has. DITL-S-02 diary camera is a different sheet. Do not merge them.
DITL-T-01, DITL-T-02, and DITL-DH-01 keep today's homework Capture. Do not add the papers shutter to Teach.
```

## Stop

Do not complete t_3bd86748. Do not implement. Do not start a build loop. Do not staff anyone. Do not clear the legal and security flag. Do not edit app code, docs/ui-design.md, or the PM lock. Engineering stays off until CoS copies this APPROVED stamp onto the parent, a Drive line is copied from the feature map, and a Chuck mock-up exists. This seat does not invent those.











