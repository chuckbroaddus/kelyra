# Superintendent Capture icon — QA Supervisor stamp

Date: 2026-09-28
Card: t_6f669883
Parent tracker: t_3bd86748 (do not complete that card)
PM lock: notes/company/superintendent-capture-pm.md (t_6fd1d4c5)
Intent: notes/company/superintendent-capture-intent.md (t_50b07cb4)
Options: notes/company/superintendent-capture-options.md (t_4bebb648)
Author: qa-supervisor

Current verdict: Stamp 7, below. Stamp 1 stays REJECTED. Stamp 2 stays APPROVED and is not the build lock. Stamp 3 stays REJECTED and is not the build lock. Stamp 4 stays APPROVED and is not the build lock. Stamp 5 stays REJECTED and is not the build lock. Stamp 6 stays APPROVED and is not the build lock for this choice. Do not copy Stamp 1, Stamp 2, Stamp 3, Stamp 4, or Stamp 5 onto the parent. Do not copy Stamp 6's unlabeled office person-create forward.

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

## Stamp 5

Date: 2026-09-29
Card: t_71e9785d
Parent tracker: t_3bd86748 (do not complete that card)
PM lock: notes/company/superintendent-capture-pm.md (office merge t_f5b99886). PM: APPROVED 2026-09-29 for this revision. This seat does not edit that file.
Mock: notes/company/superintendent-capture-mockup.html. CEO pass 2026-09-29. This seat does not change the header or the jobs.
Prior stamps: Stamp 1 (t_6f669883) stays REJECTED. Stamp 2 (t_aafe1d69) stays APPROVED and is not the build lock. Stamp 3 (t_54089753) stays REJECTED and is not the build lock. Stamp 4 (t_8b45af26) stays APPROVED and is not the build lock. Do not copy Stamp 4 forward. It still keeps the school logo superintendent-only, and it still refuses a linked parent's face on the student strip.

Verdict: REJECTED. Superintendent and administrator have one list. Student, parent, and teacher match the CEO pass on the jobs. The lock is not safe to copy until a cross-person avatar has a leave that seat can already use. Do not split the office seats. Do not put a seat back in the dark. Do not drop the job.

### DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Office Capture merge
Quality goals: agree with the office-merge lists. Superintendent and administrator share one list. Student, parent, and teacher match the CEO pass on the jobs. A student confirm of a linked parent's face, and a parent confirm of a linked child's face, are not safe to copy until the leave is named. Header stays. No tray tab is added or removed. Photograph is not Approve. A photo does not set a grade.
Surface: both
Drive: missing from the feature map — do not invent
Persona: office, teacher, parent, student
Seat: the active seat
Motion: none
PM: APPROVED  date: 2026-09-29  profile-session: product-manager / t_f5b99886
QA Supervisor: REJECTED  date: 2026-09-29  profile-session: qa-supervisor / t_71e9785d
Intent gaps remaining: Those two confirms name Remove on that person's existing photo sheet. Those seats cannot open that sheet. File that must change: notes/company/superintendent-capture-pm.md.
```

## Answer

Superintendent and administrator have one list. Yes. The mock Office row says they are the same. The office-merge fence, the hat table, AC-SC-4, AC-SC-17, AC-SC-25, and the closed list give both seats the same jobs and the same refusals. The school logo is on both. A confirmed create of a class, a roster, or a new person is on both. If one can do it, the other can. If one is refused, the other is refused. This seat does not reject to split them. Do not copy Stamp 4's superintendent-only logo forward. Do not copy an administrator who cannot create a person forward.

Student matches the CEO pass on the jobs. Own face for the avatar. A linked parent's face for that parent's avatar. Own homework for submission. Turning it in is not a grade. Not another student. Not a grade. The student-card leave stays. A contact or emergency card with no field that seat can already change is a refusal. Nothing is filed. The portrait stays in. That leave is not this gap.

Parent matches the CEO pass on the jobs. Own face and a linked child's face for avatars. That child's homework to turn in. That homework in Ask as co-educator. Own bio. Not another family. Extra work is not an official grade. Twins stay one child at a time. The mock says extra practice. The lock says gap assignments. That is the same Ask job, not a new strip name and not a new header label. Not the reject. Do not invent a Gap assignments control.

Teacher matches the CEO pass. Anything they want, including classwork, except a photo used to create a class, a roster, or a new person. Only the teacher sets a classwork grade. The photo does not set it. Office may not send classwork to a teacher for grading. Office may not set a grade.

Header matches. Existing capture icon, left of Search, spoken name Open Capture, not a tray tab. The mock does not add a tray tab. Do not add one. Do not remove one. Surface: both. Drive is missing from the feature map. This seat does not invent a Drive line.

## Gap

File that must change: `notes/company/superintendent-capture-pm.md`. Do not edit `docs/ui-design.md`. Do not edit the mock. Do not draw a screen. Do not split superintendent from administrator. Do not remove the student header shutter or the parent header shutter. Do not drop the linked-parent face or the linked-child face. CEO passed those jobs. This reject does not contradict that pass.

Own face is in and has a leave. The student can already change their own face. The parent can already change their own face. `canEditProfile` is true when the actor is the target. That part is not the gap.

The student story, AC-SC-14, AC-SC-22, and AC-SC-27 also let the student confirm a linked parent's face onto that parent's avatar. The parent story, AC-SC-22, and AC-SC-26 let the parent confirm a linked child's face onto that child's avatar. AC-SC-22 says the leave is Remove on that person's existing photo sheet, then attach to the right person that seat may already touch.

That sheet is not a control those seats can already open. `canEditProfile` is true for self, for superintendent, or for administrator when the target is not protected staff. A student editing a parent is false. A parent editing a child is false. The parent photo sheet lives on the class parent page. The student photo sheet on a class page is not the parent seat. Parent routes do not open a child's photo sheet. Student routes do not open a parent's photo sheet. "That seat may already touch" does not name a control this seat found.

AC-SC-19 is cancel or dismiss before confirm. That is not a leave after the avatar is filed. AC-SC-20 says a person who already has a photo does not change until they confirm. That does not say a later confirm on the same person is the leave. It does not undo a photo that landed on the other linked parent or the other linked child. No move control. The wrong person is not deleted.

The lock must say one of these, in the PM file, without a new screen and without a new label:

1. The same camera is the leave. Confirm again on that same linked person replaces the avatar. A face that is not the person they meant does not attach. Say that in the student story, the parent story, AC-SC-20, and AC-SC-22. Do not offer cancel-before-confirm as that leave.
2. Or name the existing control the student can already use to Remove a linked parent's photo, and the existing control the parent can already use to Remove a linked child's photo. This seat did not find that control. Do not invent a photo sheet on the other person's page.

This seat does not pick which. The office list stays one list. The jobs stay.

## Not a reject reason

- One office list. It matches the mock. Do not split it.
- Student, parent, and teacher job lists. They match the CEO pass. The student-card leave stays.
- Header. Existing capture icon, left of Search, spoken name Open Capture. Not a tray tab. Do not add or remove a tray tab. Calendar stays where DITL-P-01 put it.
- Office create after confirm. Cancel before confirm files nothing. A wrong roster enroll uses the existing office swipe Remove. A confirmed new person is a person. A confirmed new class is a class. This icon does not delete them. The office seat can already reach Delete {first name} and Delete class. This seat does not reject to put Delete on the camera. Do not invent that control on the strip.
- gap assignments versus extra practice. Same Ask job. The strip names homework into Ask, not a new button. Do not invent a Gap assignments control.
- Drive. The feature map has no Open Capture line. This seat does not invent one. Engineering stays off until a Drive line is copied from that map.
- Legal and security. Flagged. Not browsed. Not cleared. Not the reason for this reject. Counsel still must see the shared office list before build. That flag is not this gap.
- Motion. None.
- Parent card. Not completed. Do not complete t_3bd86748.

## Prove-out

Not written. Nothing is built. A prove-out OBJECTIVE waits for an APPROVED stamp. Do not execute tests. Do not staff qa-engineer. Do not copy Stamp 2 or Stamp 4 prove-out forward. Those objectives still split the office list, or they still refuse the linked-parent face.

## DITL IMPACT

```
DITL IMPACT
Change: Office Capture merge — Stamp 5 REJECTED. No user-visible change accepted.
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: Do not file a new DITL-UPDATE from this reject. Do not rewrite the plans. Do not add or remove a tray tab. t_dc2e1120 stays stale. It encodes Stamp 2: parent and student stay dark, administrator stays dark, and administrator photo extract stays a gap. Do not unblock that card. Do not complete it. Do not copy those lines into the plans. Stamp 4's rows are not this build lock either. A later APPROVED stamp names the rows.
```

## Stop

Do not complete t_3bd86748. Do not implement. Do not start a build loop. Do not staff anyone. Do not clear the legal and security flag. Do not edit app code, docs/ui-design.md, the mock, or the PM lock. CoS does not copy a REJECTED stamp onto the parent as APPROVED. PM names the cross-person avatar leave. This seat stamps again on a later card. Engineering stays off.

## Stamp 6

Date: 2026-09-29
Card: t_2bbbd789
Parent tracker: t_3bd86748 (do not complete that card)
PM lock: notes/company/superintendent-capture-pm.md (cross-person avatar leave t_e90d2988). PM: APPROVED 2026-09-29 for that leave. Office merge t_f5b99886 stays PM: APPROVED. This seat does not edit that file.
Mock: notes/company/superintendent-capture-mockup.html. CEO pass 2026-09-29 stands. That pass is not this stamp. This seat does not edit the mock.
Prior stamps: Stamp 1 (t_6f669883) stays REJECTED. Stamp 2 (t_aafe1d69) stays APPROVED and is not the build lock. Stamp 3 (t_54089753) stays REJECTED and is not the build lock. Stamp 4 (t_8b45af26) stays APPROVED and is not the build lock. Stamp 5 (t_71e9785d) stays REJECTED and is not the build lock. Do not copy Stamp 4 or Stamp 5 forward. Stamp 4 still keeps the school logo superintendent-only, and it still refuses a linked parent's face on the student strip. Stamp 5 still says the leave is missing.

Verdict: APPROVED. The leave is named. The student story, the parent story, AC-SC-20, and AC-SC-22 agree. Cancel before confirm is not offered as that leave. No new gap. Nothing is built.

### DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Office Capture merge — cross-person avatar leave
Quality goals: agree with the office-merge list, including the leave. Superintendent and administrator share one list. If one can do it, the other can. If one is refused, the other is refused. Student, parent, and teacher match the CEO pass on the jobs. After a student files a linked parent's face, and after a parent files a linked child's face, the same camera is the leave. Confirm again on that same linked person replaces the avatar. A face that is not the person they meant does not attach. Cancel before confirm is not that leave. Header stays. No tray tab is added or removed. Photograph is not Approve. A photo does not set a grade.
Surface: both
Drive: missing from the feature map — do not invent
Persona: office, teacher, parent, student
Seat: the active seat
Motion: none
PM: APPROVED  date: 2026-09-29  profile-session: product-manager / t_f5b99886
Cross-person avatar leave: PM: APPROVED  date: 2026-09-29  profile-session: product-manager / t_e90d2988
QA Supervisor: APPROVED  date: 2026-09-29  profile-session: qa-supervisor / t_2bbbd789
Intent gaps remaining: none
```

## Agreement

Read the student story, the parent story, AC-SC-20, and AC-SC-22 in notes/company/superintendent-capture-pm.md after t_e90d2988. They agree. Pick is option 1 from Stamp 5. This seat does not reopen the jobs. This seat does not split the office seats.

Shared rule, in all four places: the same camera is the leave. Confirm again on that same linked person replaces the avatar. A face that is not the person they meant does not attach. Cancel before confirm is not that leave.

The student story says that in the first person, for a linked parent. It does not offer cancel as the leave. The parent story says that in the first person, for a linked child. It does not offer cancel as the leave. AC-SC-20 names the same camera, the same replace, and the same non-attach. It says do not offer cancel-before-confirm as that leave. Those seats do not open that person's photo sheet for this leave. AC-SC-22 names the same four sentences. It says do not offer Remove on that person's photo sheet as that leave. Those seats cannot open that sheet.

AC-SC-19 stays cancel or dismiss before confirm. That is the preview leave. It says that cancel is not the leave after a student has filed a linked parent's face, or after a parent has filed a linked child's face. The lock does not offer it as that leave.

AC-SC-14, AC-SC-26, AC-SC-27, gap 8, and gap 10 say the same leave. They do not offer cancel as that leave. They do not invent a photo sheet on the other person's page. Office still uses Remove on a sheet that seat can already open. That office leave is not the student leave and not the parent leave.

## Not a new gap

No new control. No new screen. No new label. No new route. The jobs stay. A student may still file a linked parent's face. A parent may still file a linked child's face. Do not drop either job. Do not put a seat back in the dark. Superintendent and administrator stay one list. Do not split them.

Clear-to-initials is not this leave. Stamp 5 option 1 is replace on the same camera. Do not invent Remove on the other person's photo sheet. The wrong person is not deleted. No move control. A face that is not the person they meant does not attach. The old avatar stays until a later confirm on that same linked person replaces it.

Own face is not this gap. The student can already change their own face. The parent can already change their own face. That sheet stays. It is not the leave for the other linked person.

The student-card leave stays. A contact or emergency card with no field that seat can already change is a refusal. Nothing is filed. The portrait stays in. That leave is not this gap. Do not reopen it.

Header stays. Existing capture icon, left of Search, spoken name Open Capture. Not a tray tab. Do not add or remove a tray tab. Calendar stays where DITL-P-01 put it.

Drive is still missing. The feature map has no Open Capture line. This seat does not invent one. Engineering stays off until a Drive line is copied from that map.

Legal and security stay flagged. Not browsed. Not cleared. Not a reason to reject the leave. Counsel still must see the shared office list before build. That flag is not this gap.

Motion: none. CEO pass on the mock stands. That pass is not this stamp. Parent card is not completed. Do not complete t_3bd86748.

## Prove-out

Not executed. Nothing is built. Do not staff qa-engineer from this seat. Chief of Staff staffs that card after build, from the OBJECTIVE below. This seat does not grade screenshots. Do not copy Stamp 2 or Stamp 4 prove-out forward. Those objectives still split the office list, or they still refuse the linked-parent face. Stamp 5 has no prove-out. Do not write one from that reject.

```
PROVE-OUT OBJECTIVE:
Prove the office Capture merge, including the cross-person avatar leave, against notes/company/superintendent-capture-pm.md and Stamp 6 in notes/company/superintendent-capture-stamp.md. Run this only after implementation. Experience-first: sign in and look. Do not pass on code inspection alone. Verify the acceptance ids below. Do not invent a Drive line. The feature map has no Open Capture line. A screen check that needs Drive waits until that line is copied from the map. This seat does not invent the route or the control.

Full featured means every signed-in account can start from one header shutter, accessibility name Open Capture, route /capture. The tap does not file. Confirm is not Approve, not a score, and not a grade. A photo does not set a grade. One seat shows one shutter. No tray tab is added or removed. Superintendent and administrator share one list. Do not ship a split.

Hats and chrome. AC-SC-1, AC-SC-5, AC-SC-6, AC-SC-7, AC-SC-8, AC-SC-9, AC-SC-10, AC-SC-11, AC-SC-23, AC-SC-28.
Superintendent office seat, not on Messages, Search closed, not on My children: the camera sits immediately left of Search, name Open Capture. Administrator office seat, same show rules: the same camera and the same list. Teach seat: header camera, name Open Capture. The teacher may confirm anything they photograph, including classwork, except a photo used to create a new class, a class roster, or a new person. Those three are refusals. Nothing is filed for them. Not a second icon. Parent seat, including parent-only: parent shutter, except on Messages and while Search is open. Student seat: student shutter, same hides. No tray shows a Capture tab. Do not add a tray tab. Do not remove a tray tab. Do not grade Calendar. Leave Calendar where DITL-P-01 already put it. Dual-hat: one shutter, the active seat. The shutter that was showing unmounts before the next seat paints. Office and Teach never show both. Parent does not show the office list. Phone and web: same icon rules, same label, same list for that seat.

Office list. AC-SC-2, AC-SC-3, AC-SC-4, AC-SC-12, AC-SC-16, AC-SC-17, AC-SC-18, AC-SC-24, AC-SC-25, AC-SC-30.
Both office seats: the strip may name the school logo, a contact card, one class list, a face for someone new, a face for someone already at the school, or a photo used to create a class, a roster, or a new person. Confirm, not a silent insert. It does not name classwork to send to a teacher for grading. It does not name a grade. If one office seat can do it, the other can. If one is refused, the other is refused. A handbook, a policy, or minutes is a refusal on every seat. Parent and student do not get the office create jobs, the office class list, or the school logo.

Parent and student jobs. AC-SC-14, AC-SC-15, AC-SC-26, AC-SC-27, AC-SC-29.
Parent strip names only their own face, a linked child's face, that child's homework for submission, that child's homework into Ask, or their own bio. Not another family. Twins stay one child at a time. Ask is co-educator with the teacher. Extra work is not an official gradebook grade. It does not complete the parent card. Student strip names their own face for the avatar, a linked parent's face for that parent's avatar, or their own homework for submission. Turning it in is not a grade. It does not name another student, a grade, or a new person. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. The student confirm strip drops keys that seat cannot already change, including phone, email, address, emergency_name, and emergency_phone. Do not treat those five names as a closed list that lets other hidden keys through.

Cross-person avatar leave. AC-SC-20 and AC-SC-22. This is the Stamp 5 gap. It is closed only if these hold.
After a student files a linked parent's face, that student cannot open that parent's photo sheet. The same camera is the leave. Confirm again on that same linked parent replaces the avatar. A face that is not the person they meant does not attach. Cancel before confirm is not that leave. Do not offer Remove on that sheet as the leave. After a parent files a linked child's face, that parent cannot open that child's photo sheet. The same camera is the leave. Confirm again on that same linked child replaces the avatar. A face that is not the person they meant does not attach. Cancel before confirm is not that leave. Do not offer Remove on that sheet as the leave. The old avatar stays until that later confirm. The wrong person is not deleted. No move control. No new screen. No new label. Office, a face on the wrong person: Remove on that person's existing photo sheet, then attach to the right person that seat may already touch. Do not use that office leave as the student leave or the parent leave.

Multiplicity. AC-SC-13, AC-SC-18, AC-SC-29.
Office: empty guess, low confidence, or two matches means pick existing people at this school, or confirm someone new. That confirm is not a silent insert. Each row says student, parent, or staff. No new picker screen. Parent pick lists only this parent and children already linked. Twins: one child at a time. A person outside that set is a stop. Student pick is themselves, or a linked parent for that parent's avatar. A classmate is a stop. Another parent who is not linked is a stop. A sheet that spans classes, office only: pick one class or leave. Do not split the sheet. One shutter is one photo.

Reverse. AC-SC-19, AC-SC-20, AC-SC-21, AC-SC-22.
Cancel or dismiss before confirm: back where they were. Nothing is inserted. No grade. No parked paper. That is the preview leave. It is not the leave after a linked parent's face is filed, and it is not the leave after a linked child's face is filed. Fail if that avatar is filed and cancel-before-confirm is offered as the undo. A person, class, or logo that already has a photo does not change until confirm. Remove photo is the existing danger control on a sheet that seat can already open. The person stays. The circle falls back to initials. A wrong enroll after roster confirm is undone with the existing office swipe Remove on class Students. That person is not deleted. This camera does not show Remove.

Fail if any of these appear: a seat with no header shutter when the show rules pass; a split office list; the school logo refused on administrator; a confirmed create refused on one office seat and allowed on the other; a tray tab added or removed, including a Capture tab or a deleted Calendar tab; Approve, a score, or a grade set by this photo; a student or parent sent to the other person's photo sheet as the leave; cancel-before-confirm offered as that leave; the linked-parent face or the linked-child face dropped; a new screen, label, or route invented as that leave; a student confirm that writes a key that seat cannot already change; IEP or 504 extracted into fields. The legal and security flag is not cleared by this prove-out.

Surface: both. Persona: office, teacher, parent, student. Seat: the active seat. Motion: none.
Do not complete t_3bd86748 from the prove-out card. Do not treat a missing Drive line as a pass. Do not rewrite DITL plans from the prove-out card. Do not copy Stamp 2, Stamp 4, or Stamp 5 forward.
```

## DITL IMPACT

```
DITL IMPACT
Change: Office Capture merge — Stamp 6 APPROVED. Every signed-in seat would keep one header shutter for that seat's list. Superintendent and administrator would share one list, including the school logo and a confirmed create. After a student files a linked parent's face, and after a parent files a linked child's face, the same camera is the leave. Confirm again on that same linked person replaces the avatar. A face that is not the person they meant does not attach. Cancel before confirm is not that leave. No tray tab is added or removed. Nothing is built on this card.
Verdict: UPDATE_PLANS
Plans touched: DITL-O-07, DITL-O-01, DITL-DH-02, DITL-P-01, DITL-S-01
Cases touched: DITL-P-01 (expects no camera), DITL-O-07 (expects photo-extract GAP)
New DITL needed: no
Seed/artifacts: none
Notes: Do not rewrite the plans from this card. Do not add or remove a tray tab. CoS files DITL-UPDATE. Chuck unblocks before any rewrite. This seat does not staff that card.
t_dc2e1120 stays stale. It encodes Stamp 2: parent and student stay dark, administrator stays dark, and administrator photo extract stays a gap. Do not unblock that card. Do not complete it. Do not copy those lines into the plans. Stamp 4's rows are not this build lock either. They still keep the school logo superintendent-only, and they still refuse a linked parent's face.
DITL-O-07 still says office photo extract is a gap because there is no office Capture tray. After an approved ship, a contact card on either office seat would no longer be that gap. Do not copy "administrator stays a gap." DITL-O-07-UI-01 and DITL-O-07-UI-02 stay the manual preferred-name path. Do not rewrite them on this card. Do not add a Capture tray tab.
DITL-O-01 does not say either office seat shows Open Capture. Beat 7 is still super-only for school name and logo. After an approved ship, both office seats would show Open Capture except Messages, open Search, and My children. The Capture list does not split. Do not keep the school logo superintendent-only on that strip. This stamp does not edit docs/data-model.md.
DITL-DH-02 beat 8 still says Home·Ride·Ask only. That 3-tab line is not this icon. After an approved ship the parent seat would show the parent shutter. My children, office chrome still up, stays hidden. Do not use the update to add or remove a parent tray tab. Calendar stays where DITL-P-01 put it.
DITL-P-01 beat 2 says four tabs and no camera. After an approved ship the tray stays four, including Calendar, and the header would show Open Capture except Messages and open Search. The linked-child face leave is part of that shutter, not a new day. Do not read "no camera" as a reason to delete Calendar or to keep the header dark. The DITL-P-01 cases that expect no camera follow that plan rewrite. Do not rewrite them on this card.
DITL-S-01 lists Capture camera as a non-goal. After an approved ship that line would be stale for a header shutter on the student seat, including a linked parent's face and own homework for submission. Turning it in is not a grade. The leave is the same camera, not a new day. Do not add or remove a student tray tab. Do not use this update to change the tray count the plan already has. DITL-S-02 diary camera is a different sheet. Do not merge them.
DITL-T-01, DITL-T-02, and DITL-DH-01 keep today's teacher Capture. Do not add the office list to Teach. Do not add or remove a tray tab. The three create refusals are a confirm-strip check, not a new day.
```

## Stop

Do not complete t_3bd86748. Do not implement. Do not start a build loop. Do not staff anyone. Do not clear the legal and security flag. Do not edit app code, docs/ui-design.md, the mock, or the PM lock. Engineering stays off until CoS copies this APPROVED stamp onto the parent and a Drive line is copied from the feature map. This seat does not invent those. CEO pass is not this stamp.

## Stamp 7

Date: 2026-09-29
Card: t_d488e911
Parent tracker: t_3bd86748 (do not complete that card)
PM lock: notes/company/superintendent-capture-pm.md (person-photo choice t_9eb82afb). PM: APPROVED 2026-09-29 for that choice. This seat does not edit that file.
Mock: notes/company/superintendent-capture-mockup.html. CEO pass 2026-09-29 stands. That pass is not this stamp. This seat does not edit the mock.
Drive source: .grok/skills/verify-kelyra/features/open-capture.md. The office line is copied. This seat does not invent a second control name.
Prior stamps: Stamp 1 (t_6f669883) stays REJECTED. Stamp 2 (t_aafe1d69) stays APPROVED and is not the build lock. Stamp 3 (t_54089753) stays REJECTED and is not the build lock. Stamp 4 (t_8b45af26) stays APPROVED and is not the build lock. Stamp 5 (t_71e9785d) stays REJECTED and is not the build lock. Stamp 6 (t_2bbbd789) stays APPROVED and is not the build lock for this choice. Do not copy Stamp 6's unlabeled office person-create forward. Do not delete earlier stamps.

Verdict: APPROVED. An office person photo waits for the two-way choice. It does not attach and does not create until they choose. Teacher, parent, and student are refused choice 2. They do not see that choice. The choice is named. No new gap. Nothing is built.

### DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Person photo must choose avatar or new person
Quality goals: agree with the person-photo choice. A photo of a person on an office seat does not attach and does not create until they choose. Choice 1 is avatar on a person who already exists. Choice 2 is create a new person and use this photo as that person's avatar. Not a silent insert. Cancel before the choice files nothing. A face that is not the person they meant does not attach to an existing person. Superintendent and administrator share that choice. If one sees it, the other sees it. Teacher, parent, and student do not get choice 2 and do not see that choice. A photo used to create a class or a roster still waits for confirm and is not this choice. Header stays. No tray tab is added or removed. Photograph is not Approve. A photo does not set a grade. Legal flag stays. Security flag stays.
Surface: both
Drive: / click=[aria-label=Open Capture]
Persona: office
Seat: the active seat
Motion: none
PM: APPROVED  date: 2026-09-29  profile-session: product-manager / t_9eb82afb
QA Supervisor: APPROVED  date: 2026-09-29  profile-session: qa-supervisor / t_d488e911
Intent gaps remaining: none
```

## Agreement

Read the person-photo fence, the office list, the office story, the administrator story, the teacher story, the parent story, the student story, the hat table, the closed list, quality goals 1, 2, 5, 6, and 7, and AC-SC-4, AC-SC-7, AC-SC-12, AC-SC-13, AC-SC-14, AC-SC-25, AC-SC-26, AC-SC-27, and AC-SC-31 in notes/company/superintendent-capture-pm.md after t_9eb82afb. They agree. This seat does not reopen the other jobs. This seat does not split the office seats. This seat does not give teacher, parent, or student a new-person create.

Office answer: yes. A photo of a person on an office seat waits for the two-way choice. It does not attach and does not create until they choose. Choice 1 is avatar on a person who already exists. Choice 2 is create a new person and use this photo as that person's avatar. Not a silent insert. Cancel before the choice files nothing. A face that is not the person they meant does not attach to an existing person. Superintendent and administrator share that choice. If one sees it, the other sees it.

Other seats: yes, refused. Teacher, parent, and student do not see that choice. They do not get choice 2. The teacher story, the parent story, the student story, AC-SC-7, AC-SC-26, AC-SC-27, and AC-SC-31 say that. Create-a-new-person stays office only. That is not an open assumption. The lock and this card name the same refusal.

The unlabeled office confirm that creates a person is superseded. Do not copy it forward. A class or a roster still waits for confirm. That confirm is not this choice. The cross-person avatar leave stays. The student-card leave stays. Those are not this gap.

## Not a new gap

No new control. No new screen. No new label. No new route. No second control name. Header stays. Existing capture icon, left of Search, spoken name Open Capture. Not a tray tab. Do not add or remove a tray tab. Calendar stays where DITL-P-01 put it.

Choice 2 does not name a login. The lock does not say this choice creates a login. That is not a gap and not a new screen. Do not invent a kind picker. Do not invent a label. Each existing row still says student, parent, or staff. That row label is already in the lock. It is not a new control.

Drive is copied from .grok/skills/verify-kelyra/features/open-capture.md. Office line: `/ click=[aria-label=Open Capture]`. Teacher uses the same click on `/`. Parent uses the same click on `/parent`. Student uses the same click on `/todo`. Those routes are already in that file. This seat does not invent a second control name. Persona on this stamp is office. Seat is the active seat. Motion is none.

Legal and security stay flagged. Not browsed. Not cleared. Not a reason to reject this choice. Counsel still must see this choice before build. That flag is not this gap. Do not clear either flag.

A photo does not set a grade. Photograph is not Approve. Parent card is not completed. Do not complete t_3bd86748. CEO pass on the mock stands. That pass is not this stamp. Nothing is built.

## Prove-out

Not executed. Nothing is built. Do not staff qa-engineer from this seat. Chief of Staff staffs that card after build, from the OBJECTIVE below. This seat does not grade screenshots. Do not copy Stamp 6's unlabeled office person-create forward. Do not copy Stamp 2 or Stamp 4 prove-out forward. Stamp 5 has no prove-out. Do not write one from that reject.

```
PROVE-OUT OBJECTIVE:
Prove the office person-photo choice against notes/company/superintendent-capture-pm.md and Stamp 7 in notes/company/superintendent-capture-stamp.md. Run this only after implementation. Experience-first: sign in and look. Do not pass on code inspection alone. Verify the acceptance ids below. Drive is copied from .grok/skills/verify-kelyra/features/open-capture.md. Do not invent a second control name. Do not invent a screen or a label.

Full featured for this choice means an office person photo waits. It does not attach and does not create until they choose. Choice 1 is avatar on a person who already exists. Choice 2 is create a new person and use this photo as that person's avatar. Not a silent insert. Cancel before the choice files nothing. A face that is not the person they meant does not attach to an existing person. Teacher, parent, and student do not see that choice. They do not get choice 2. Superintendent and administrator share it. If one sees it, the other sees it. Header stays. No tray tab is added or removed. A photo does not set a grade. The other jobs stay. Do not reopen them. Do not ship an unlabeled office confirm that creates a person.

Chrome. AC-SC-1, AC-SC-2, AC-SC-6, AC-SC-23.
Office, superintendent or administrator, not on Messages, Search closed, not on My children: one header shutter, accessibility name Open Capture, immediately left of Search. Drive: / click=[aria-label=Open Capture]. The tap opens /capture and does not file. Parent and student show the same name when their hides are clear. Teacher uses the same click. Parent route already in the map: /parent. Student route already in the map: /todo. Same control name. Phone and web follow the same label. No tray shows a Capture tab. Do not add a tray tab. Do not remove a tray tab. Do not grade Calendar.

Office choice. AC-SC-4, AC-SC-12, AC-SC-13, AC-SC-14, AC-SC-25, AC-SC-31.
Both office seats, after a photo of a person: it does not attach and does not create until they choose. Choice 1: avatar on a person who already exists. Empty guess, low confidence, or two matches is still that wait. Each row says student, parent, or staff. No new picker screen. A face that is not the person they meant does not attach to an existing person. Choice 2: create a new person and use this photo as that avatar. Not a silent insert. That choice does not create a login. Do not invent a kind picker. Do not invent a label. If one office seat sees the choice, the other sees it. A missing choice on one office seat is a split. Do not ship a split. A class or a roster still waits for confirm. That confirm is not this choice. It does not insert on capture.

Refused seats. AC-SC-7, AC-SC-26, AC-SC-27.
Teach seat does not see the person-photo choice. The teacher does not get choice 2. A photo used to create a new class, a class roster, or a new person is a refusal. Nothing is filed for those three. Parent strip does not name choice 2 and does not name a new person. Student strip does not name choice 2 and does not name a new person. Do not give them a new-person create. Their other jobs stay. Do not drop the linked-parent face, the linked-child face, or the student-card leave. Those leaves are not this choice.

Reverse. AC-SC-19, AC-SC-20, AC-SC-22.
Cancel or dismiss before the choice, on an office person photo: back where they were. Nothing is inserted. No avatar is attached. No new person. An office person photo does not replace an avatar until they choose. Office, a face already on the wrong person: Remove on that person's existing photo sheet, then choose the right person. Do not use that office leave as the student leave or the parent leave. After a student files a linked parent's face, and after a parent files a linked child's face, the same camera is still the leave. Do not reopen that leave. Do not offer choice 2 as that leave.

Fail if any of these appear: an office person photo that attaches or creates before the choice; an unlabeled confirm that creates a person; choice 2 on teacher, parent, or student; a split office list; a new screen, label, route, or second control name; a login created by this choice; a tray tab added or removed; Approve, a score, or a grade set by this photo; the legal flag cleared; the security flag cleared. The other jobs are not defects on this card.

Surface: both. Persona: office. Seat: the active seat. Motion: none.
Do not complete t_3bd86748 from the prove-out card. Do not rewrite DITL plans from the prove-out card. Do not copy Stamp 6's unlabeled office person-create forward. Engineering stays off while the legal and security flags are open. This prove-out does not clear them.
```

## DITL IMPACT

```
DITL IMPACT
Change: Person photo must choose avatar or new person — Stamp 7 APPROVED. An office person photo would wait for the two-way choice. Choice 1 is avatar on a person who already exists. Choice 2 is create a new person and use this photo as that avatar. Not a silent insert. Cancel before the choice files nothing. Teacher, parent, and student would not see choice 2. Superintendent and administrator would share the choice. If one sees it, the other sees it. No tray tab is added or removed. Nothing is built on this card.
Verdict: UPDATE_PLANS
Plans touched: DITL-O-01, DITL-DH-02, DITL-O-07
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: Do not rewrite the plans from this card. Do not add or remove a tray tab. CoS files DITL-UPDATE. Chuck unblocks before any rewrite. This seat does not staff that card.
DITL-O-01 still names a face for someone new, a face for someone already at the school, or a photo used to create a class, a roster, or a new person, as confirm. That is the unlabeled office person-create. Do not copy it forward. After an approved ship, a photo of a person waits for the two-way choice. A class or a roster still waits for confirm. That confirm is not this choice.
DITL-DH-02 copies that same unlabeled office person-create on the office seat list. The parent seat list must not gain choice 2. Do not add or remove a tray tab. Calendar stays where DITL-P-01 put it.
DITL-O-07 still says a confirmed create of a new person stays the shared office list on DITL-O-01. That sentence must not keep the unlabeled confirm. The person-photo choice stays on the office list. It is not a new day on this bio-attach plan. Do not add a Capture tray tab.
DITL-P-01 and DITL-S-01 must not gain choice 2. DITL-S-01 already says not a new person. Do not add a new-person create. Do not add or remove a tray tab. DITL-T-01 keeps today's teacher Capture. Do not add choice 2. Do not add the office list to Teach.
t_dc2e1120 stays stale. It encodes Stamp 2. Do not unblock that card. Do not complete it. Do not copy those lines into the plans.
```

## Stop

Do not complete t_3bd86748. Do not implement. Do not start a build loop. Do not staff anyone. Do not clear the legal and security flag. Do not edit app code, docs/ui-design.md, the mock, or the PM lock. Do not rewrite the plans. Engineering stays off while the legal and security flags are open. CoS copies this APPROVED stamp onto the parent. This seat does not invent a Drive line. CEO pass is not this stamp.















