# Superintendent Capture icon — PM lock

**Status:** Revision locked. All accounts support capture. Not a build. Not a Chuck mock-up. Not a QA Supervisor stamp.
**Date:** 2026-09-28
**Revision:** 2026-09-28 (t_f5021e92). CEO Chuck, after Stamp 2: every account supports capture. PM: APPROVED for this revision. This note does not stamp QA Supervisor.
**Student-card leave:** 2026-09-28 (t_4bbb40d6). PM: APPROVED. The student confirm strip drops keys that seat cannot already change. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. This note does not stamp QA Supervisor.
**Earlier lock:** 2026-09-28 (t_6fd1d4c5). Parent-tray fix 2026-09-28 (t_b72f98ec). Those PM lines stay below. The dark-seat sentences in them are superseded. Do not copy them forward.
**Parent tracker:** t_3bd86748 (do not complete that card)
**Options:** notes/company/superintendent-capture-options.md (t_4bebb648)
**Intent:** notes/company/superintendent-capture-intent.md (t_50b07cb4). That note still says parent and student must not, and administrator is a gap. This revision overrides those rows. It does not delete the intent note.
**Legal:** notes/company/superintendent-capture-legal.md read the old seat list. It is not clearance and not the current seats.
**Author:** product-manager

## Choice

**A — Same shutter, papers only.** Not B. Not C. Not a mix. Choice A still stands for the superintendent office seat. This revision does not reopen it.

Chuck asked for the Capture icon on the Superintendent, so that seat can photograph students, parents, staff, data sheets, school records, roster sheets, and similar papers. The icon that already exists opens `/capture` and never files. A is that icon, on the superintendent office seat, with the confirm strip narrowed to papers that already have a landing.

B is rejected. It never opens `/capture`, so a data sheet cannot land. Chuck named data sheets. A subject sheet that refuses them is a different product wearing the Capture glyph.

C is rejected. The icon is absent until the person is already on a photo screen, so the superintendent cannot start from chrome. C also refuses data sheets. The sentence "Chuck named superintendent only" is superseded. CEO 2026-09-28 put capture on every account. That does not pick C. Administrator, parent, and student get A's door: a header icon that opens `/capture`. They do not get a hidden-until-photo-screen door.

A mix is rejected. A plus B would be two doors. A plus C would hide the icon on Feed, Classes, People, Manage, and Ask. B plus C still refuses data sheets. That is a fourth product. Do not build it. Two header cameras on one seat is also a mix. Do not show both.

School records that are not the school logo are out of this cut. No option has a records cabinet. This lock does not add one. The logo is in for the superintendent office seat only. A handbook, a policy, and minutes are refused. That is an out, not a silent skip. CEO did not give the school-logo block to administrator, parent, student, or teacher. Say so under each seat.

## DESIGN STAMP

History. Do not delete this fence. The dark-seat sentences inside it are superseded by the revision stamp below. Do not copy them forward. Stamp 1 and Stamp 2 stay in notes/company/superintendent-capture-stamp.md. This note does not delete them. Stamp 2 is not the build lock for this revision.

```
DESIGN STAMP
Feature/bug: Superintendent Capture icon
Quality goals: office superintendent can photograph an existing person, a student or parent card, a class list, or the school logo from the header Capture icon; parent and student stay dark; administrator stays dark; photograph is not Approve; a photo never creates a person or a class
Surface: both
Drive: not written here. Control locked: accessibility label Open Capture. Route: /capture. CoS copies Drive from the feature map. Do not invent a second control name.
PM: APPROVED  date: 2026-09-28  profile-session: product-manager / t_6fd1d4c5
Parent-tray fix: 2026-09-28  card: t_b72f98ec  PM: APPROVED stands. This note does not restamp QA Supervisor.
QA Supervisor: not this card — stamp file rejected 2026-09-28. This note does not restamp.
Intent gaps remaining: none in this lock (16 covered or out). Parent-tray fix 2026-09-28: no camera, and do not add or remove a tray tab. Legal read flagged, not staffed. Chuck mock-up still required before build.
```

Superseded lines from that fence, kept so they are not deleted: "parent and student stay dark; administrator stays dark." Also superseded: the parent-tray fix line that restated no camera as the parent rule. Parent and student now have a header camera. Administrator now has a header camera. The parent-tray rule that remains is: do not add or remove a tray tab. Calendar stays where DITL-P-01 put it.

## DESIGN STAMP — revision

Current lock. PM approves this revision only. Do not write QA Supervisor APPROVED here.

```
DESIGN STAMP
Feature/bug: Capture on all accounts (revision of Superintendent Capture icon)
Quality goals: every account can capture from one header icon; superintendent office seat keeps Choice A, including the school logo; administrator office seat captures the same papers and does not get the school-logo block; teacher keeps today's homework Capture and does not also show the papers shutter; parent captures only their own record and a linked child, never another family, and no tray tab is added or removed; student captures their own portrait, the confirm strip drops keys that seat cannot already change, a contact or emergency card that has no field the student can already change is a refusal, nothing is filed, the portrait stays in, never another student, a staff photo, or a school roster, and no tray tab is added or removed; photograph is not Approve; a photo never creates a person, a login, or a class; phone and web follow the same outs
Surface: both
Drive: not written here. Control locked: accessibility label Open Capture. Route: /capture. CoS copies Drive from the feature map. Do not invent a Drive line.
PM: APPROVED  date: 2026-09-28  profile-session: product-manager / t_f5021e92
Student-card leave: PM: APPROVED  date: 2026-09-28  profile-session: product-manager / t_4bbb40d6
QA Supervisor: not this card. This note does not stamp QA Supervisor. Do not copy Stamp 2 forward as the build lock.
Intent gaps remaining: student contact or emergency card leave is named in this fix. QA Supervisor has not stamped it. Legal note read the old seat list. It is not clearance and not the current seats. Chuck mock-up still required before build.
```

## Administrator

**In.** The old line is superseded, not deleted: "Out. Administrator office seat stays as today: no header camera." Do not copy that line forward.

CEO 2026-09-28 put capture on the administrator office seat. Same header door as Choice A. Not C. The tap opens `/capture` and does not file.

What they can photograph: an existing student, an existing parent, an existing staff person, a student or parent card, and one class list for an existing class. Same papers as the superintendent office seat, except the school logo.

**School logo stays superintendent-only.** `docs/data-model.md` already says only the superintendent sets `schools.logo_asset_id` (`set_school_logo`). CEO did not say administrator gets that block. This revision does not give it. A logo still on the administrator confirm strip is a refusal. Nothing is filed. This lock does not add a school-logo camera to Administrator Manage. Person-page `PhotoSheet` on a logo they already opened, if that sheet exists today, is not this icon and is not widened here.

Also refused: a handbook, a policy, minutes, any school paper that is not a student card, a parent card, or one existing class list, homework, Approve, a grade, creating a person, a login, or a class.

## Photograph is not Approve

This icon photographs. It does not Approve. It does not grade. It does not write a score. It does not open Inbox-as-grade. It does not write a parent-facing sentence.

`src/lib/school/matrix.ts` `capture.use` is **none** for superintendent and administrator. `capture.approve` is **school** for both office seats. Those are different rows. This icon does not use `capture.approve`.

`src/lib/school/roles.ts` bundles one row, “Capture / Approve / grade”: superintendent and administrator **Yes (logged)**. That bundle is not one switch. **Yes (logged)** is not permission to Approve from this icon, and it is not permission to treat photograph and grade as the same grant.

Turning the icon on is a photograph grant for the seat that is showing. It is not a flip of `capture.use` that also flips Approve. It is not a flip of the bundled roles.ts row. This note does not edit the matrix and does not edit `roles.ts`. The old sentence that limited the grant to the superintendent office seat is superseded.

A photo never creates a person, a login, or a class. The matcher never inserts a student. Unmatched name: stop. Create the person on People first (existing Create account). Nothing is a grade until a teacher Approves. This confirm is not that click.

## Hats

Seat is the chrome. Not the extra hats. One seat shows one header camera. Do not merge trays. Do not show two shutters at once. Do not merge the homework shutter and the papers shutter onto one confirm strip.

The old hat rows that said administrator no, parent no, student no, and parent-seat no camera are superseded. Kept here so they are not deleted: "Administrator, office seat | No." "Parent-only | No." "Student | No." "Parent seat has no camera even when the login is also superintendent." Do not copy those rows forward.

| Hat | This icon |
|---|---|
| Superintendent, office seat | Yes. Papers shutter, including the school logo. Hidden on Messages, while Search is open, and on My children. |
| Administrator, office seat | Yes. Papers shutter. School logo refused. Hidden on Messages, while Search is open, and on My children. |
| Teach seat, including a pure teacher | Yes. Today's homework Capture only. Not the papers shutter. Not the school logo. |
| Parent seat, including parent-only | Yes. Own record and a linked child only. Hidden on Messages and while Search is open. Not a tray tab. |
| Student seat | Yes. Own portrait. The confirm strip drops keys this seat cannot already change. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. Hidden on Messages and while Search is open. Not a tray tab. |
| Dual-hat office+teacher, office seat, job of record superintendent | Papers shutter, including the school logo. Not the homework camera. |
| Dual-hat office+teacher, office seat, job of record administrator | Papers shutter. School logo refused. Not the homework camera. |
| Dual-hat office+teacher, Teach seat | Today's homework Capture only. The office shutter unmounts before Teach paints. |
| Dual-hat with a Parent seat | Parent shutter only while Parent is the active seat, even if the login is also superintendent or administrator. Office shutter unmounts before the parent tray paints. |
| Dual-hat with a Student seat | Student shutter only while Student is the active seat. |

Switching seats unmounts the shutter that was showing before the next seat paints. Gate on the active seat, not `also_teacher` and not `also_parent`. Office to Teach swaps the papers shutter for today's homework Capture. Teach to Office does the reverse, and the office strip includes the school logo only when the office job is superintendent. Office to Parent swaps to the parent shutter. Parent to Office does the reverse under the same logo rule. Never both icons. Never both jobs on one strip.

## Chrome

Trailing cluster, when the icon is showing, on every seat that has Search and Messages: `[ capture 44 ] [ search 44 ] [ messages 44 ] [ menu 44 ]`. Same order as the teacher. Existing `capture` glyph. Do not invent a View-stroke. Not in the tray. Not in the drawer. Not inside the Search field. Wordmark stays the seat title.

The old administrator line "Search sits immediately left of messages" is superseded for the showing state. Search sits immediately left of messages only while this camera is hidden.

**Accessibility label locked: Open Capture.** Every seat that shows the icon. Hover tip matches. Same string, because the tap opens `/capture`. Do not use "Choose what to photograph." Do not use "Change photo," "Photograph roster," or "School logo" on this header slot. Those names belong to screens that already have a photo control. This icon is not those screens. Do not use a different header label per seat.

Person-page `PhotoSheet` stays. Turning this icon on must not remove those sheets, and must not become the only way to change a face, a class avatar, or a logo the person already opened.

## What the tap opens

Existing header Capture route `/capture`. Not ListenSheet. Not `/proposal` as the primary path. Nothing files until that seat confirms.

Papers seats (superintendent, administrator, parent, student): one still from the device camera. Library, files, the mic, web drag-and-drop, and Upload class stack are out of this cut. Voice was not asked. Do not require a mic.

Teach seat: today's full Capture composer and today's homework job. This revision does not remove it and does not add the papers strip beside it.

Ask AI may classify, as it does for the teacher, then the confirm strip. The strip is the existing "This will be …" strip. The jobs on it are only that seat's closed list. A job from another seat is not offered.

Roster intent, on an office seat only, hands off to the existing office confirm checklist after they name an existing class. School logo, on the superintendent office seat only, hands off to the existing school-identity `PhotoSheet`. A staff face, on an office seat only, uses the portrait person picker plus the existing `teacher` photo write. Do not add a `staff` classifier intent. Do not add a staff page.

Parent and student do not get those office handoffs. A parent card or a linked-child card uses the existing checklist, scoped to people that seat may already touch. A student card drops keys that seat cannot already change. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. Do not draw a new picker. Do not draw a park screen.

## Stories

**Superintendent.** On the office seat I see the header camera left of Search, except on Messages, while Search is open, and on My children. The name I hear is Open Capture. I tap it and land on Capture. The tap does not file.

**Superintendent with a paper.** I photograph one still. I confirm only if the strip names a person paper, a roster, or the school logo. I do not see homework, and I do not see Approve.

**Superintendent, no match.** A face or a card that is not an existing person stops. I pick someone already at the school, or I leave. I do not see a new person appear.

**Superintendent, same name.** I see existing people, and each row says student, parent, or staff. I do not see the photo attach by itself.

**Administrator.** I see the header camera left of Search, except on Messages, while Search is open, and on My children. The name I hear is Open Capture. I can photograph an existing student, an existing parent, an existing staff person, a student or parent card, or one class list. I do not see the school logo on the strip. A logo photo is refused. The old story "I do not see this camera" is superseded.

**Parent.** I see the header camera left of Search, except on Messages and while Search is open. The name I hear is Open Capture. I can photograph myself, a child already linked to me, my own contact card, or that child's contact or emergency card. I cannot open another family's record, a staff photo, a class list, or the school logo. The old story "No camera, and do not add or remove a tray tab" is superseded for the camera. The tray half stands: do not add or remove a tray tab. Calendar stays where DITL-P-01 put it. Capture is not a tray tab.

**Student.** I see the header camera left of Search, except on Messages and while Search is open. The name I hear is Open Capture. I can photograph my own face. The confirm strip drops keys this seat cannot already change. A contact or emergency card that has no field I can already change is a refusal. Nothing is filed. The portrait stays in. I cannot open another student's record, a staff photo, a parent record, or a school roster. I do not see the school logo on the strip. This icon is not Turn in. The old story "I do not see a camera" is superseded. Do not add or remove a tray tab.

**Teacher.** I keep the camera I already have. I do not also get the papers shutter. I never see both.

**Office who also teaches.** On Office I see the papers shutter for my office job. On Teach I see today's homework Capture. I never see both. If my office job is administrator, the office strip refuses the school logo.

**Office who is also a parent.** On Parent I see the parent shutter, not the office shutter. On My children, office chrome still up, I do not see a camera. Back on the office seat, the office shutter returns when the other hide rules are clear. The old story "On Parent I do not see a camera" is superseded.

## Acceptance

One line per thing a person can see. The accessibility label on the header icon is **Open Capture**.

**AC-SC-1.** Superintendent office seat, not on Messages, Search closed, not on My children: the header shows the camera immediately left of Search, and its accessibility name is Open Capture.

**AC-SC-2.** That tap opens `/capture` and does not file. The same is true for administrator, teacher, parent, and student. The tap is not Approve.

**AC-SC-3.** On a papers seat the person sees one camera still. They do not see Photo or Video, Files, a mic, a drop target, or Upload class stack. Teach keeps today's composer.

**AC-SC-4.** Superintendent office seat, after the photo: the confirm strip names only a person paper, a roster, or the school logo. It does not name homework, Approve, or a grade. Other seats do not copy this strip. They follow AC-SC-25, AC-SC-26, AC-SC-27, or AC-SC-7.

**AC-SC-5.** Superseded wording, kept: "Administrator office seat: no camera. Search sits immediately left of messages." Current: Administrator office seat, not on Messages, Search closed, not on My children: the header shows the camera immediately left of Search, and its accessibility name is Open Capture. While that camera is hidden, Search sits immediately left of messages.

**AC-SC-6.** Superseded wording, kept: "Parent seat: no camera. Student seat: no camera. No tray shows a Capture tab." Current: Parent seat and student seat show the header camera, accessibility name Open Capture, except on Messages and while Search is open. No tray shows a Capture tab. Do not add a tray tab. Do not remove a tray tab.

**AC-SC-7.** Teach seat: today's teacher camera, accessibility name Open Capture, and today's homework Capture. Not the papers strip. Not both icons.

**AC-SC-8.** Superseded wording, kept: "Parent seat of a dual-hat login: no camera, and do not add or remove a tray tab." Current: Parent seat of a dual-hat login shows the parent shutter only, not the office shutter, and does not add or remove a tray tab. Calendar stays where DITL-P-01 put it.

**AC-SC-9.** Messages: this camera is hidden. Messages keeps its own photo sheet.

**AC-SC-10.** Search open: this camera is hidden.

**AC-SC-11.** My children, office chrome still up: this camera is hidden. Leaving My children shows it again when AC-SC-1's other rules pass.

**AC-SC-12.** No matching person: a stop. No new person, no new login, no new class.

**AC-SC-13.** Office seats: empty guess, low confidence, or two matches means a pick of existing people at this school, and each row says student, parent, or staff. No new picker screen. Parent and student do not get that school-wide pick. They follow AC-SC-29.

**AC-SC-14.** Office seats only. Staff: pick an existing staff person, then the existing photo sheet, writing the existing `teacher` photo. No new staff page. No new login. Parent and student: a staff photo is a refusal. Nothing is filed.

**AC-SC-15.** A student card or a parent card, on an office or parent seat whose closed list includes that card: the existing checklist. Each field is checked before it writes. IEP and 504 stay a note, not an extracted field. A parent writes only their own card or a linked child's card. A student writes only keys that seat can already change, on their own record. The student confirm strip drops keys that seat cannot already change. Those keys include phone, email, address, emergency_name, and emergency_phone. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. Cancel before confirm is not that leave. Undoing a wrong person is not a leave for a hidden field.

**AC-SC-16.** A paper outside that seat's closed list: a refusal. Nothing is filed. Parent: another family's paper is a refusal. Student: another student's paper is a refusal.

**AC-SC-17.** School logo: superintendent office seat only, then the existing school-identity photo sheet. Administrator, teacher, parent, and student: a logo photo is a refusal. CEO did not give them that block. A handbook, a policy, or minutes: a refusal on every seat. No records cabinet. This lock does not add a school-logo camera to Administrator Manage.

**AC-SC-18.** Office seats only. Roster: they name an existing class, then the existing confirm checklist. Low-confidence names start unchecked. A name already on the roster is not a second row. No new class. Parent and student: a class list or school roster is a refusal. Nothing is filed.

**AC-SC-19.** Cancel or dismiss before confirm: back where they were. No new person, no grade, no parked paper. A photo that was only previewed is gone. If they were replacing a photo, the old photo stays.

**AC-SC-20.** A person, class, or logo that already has a photo does not change until they confirm. Remove photo is the existing danger control. The person stays. The circle falls back to initials.

**AC-SC-21.** After a roster confirm, a wrong enroll is undone on class Students with the existing office swipe Remove. That person is not deleted. This camera does not show Remove.

**AC-SC-22.** A face on the wrong person: Remove on that person's existing photo sheet, then attach to the right existing person that seat may already touch. Office may pick another existing person at the school. A parent may pick only themselves or a linked child. A student may pick only themselves. No move control. The wrong person is not deleted. A parent must not land the photo on another family. A student must not land it on another student or on staff.

**AC-SC-23.** Phone and web, all five seats. Not phone-only. The same icon rules, the same label Open Capture, and the same outs for that seat. Papers seats are one camera still. Teach keeps today's composer.

**AC-SC-24.** This camera does not show Approve, a score, or a grade. Confirm on this sheet is not Approve. Student Turn in is not this icon.

**AC-SC-25.** Administrator confirm strip names only a person paper or a roster. It does not name the school logo. A logo photo is a refusal. Nothing is filed.

**AC-SC-26.** Parent confirm strip names only their own portrait, a linked child's portrait, their own contact card, or that child's contact or emergency card. It does not name another family, a staff person, a roster, the school logo, homework, Approve, or a grade. A same-name person who is not this parent and not a linked child is a stop.

**AC-SC-27.** Student confirm strip names their own portrait. It drops keys that seat cannot already change, including phone, email, address, emergency_name, and emergency_phone. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. It does not name another student, a staff person, a parent record, a roster, the school logo, homework, Turn in, Approve, or a grade.

**AC-SC-28.** One seat, one shutter. Teach does not show the papers shutter. An office seat does not show the homework shutter. Parent does not show the office shutter. Student does not show another seat's shutter. Switching seats unmounts the shutter that was showing before the next seat paints.

**AC-SC-29.** Parent same-name pick lists only this parent and children already linked to them. Each row says parent or student. A person outside that set is a stop. Student pick is themselves only. A classmate is a stop. No new picker screen. Those seats do not see a school roster.

## Gaps

Each intent gap is covered here or marked out of the first cut. None is skipped.

**1. Administrator.** In. The old line is superseded, not deleted: "Out. Chuck named superintendent only." CEO 2026-09-28 put capture on this seat. See Administrator. School logo stays out. That block is superintendent-only. Not a silent yes on the logo.

**2. Which papers are in the first cut.** Closed list below. “Similar papers” means that list and nothing else. A data sheet that is not a student card or a parent card is out: no park screen, and this lock does not draw one. A school record that is not the logo is out: no records cabinet, and this lock does not add one.

**3. Staff face.** Covered for office seats. The portrait person picker gains staff. They pick an existing staff person. The write is the existing `teacher` photo path. No new classifier intent. No new staff page. No match: stop. No login created. Parent and student: a staff photo is a refusal. Not a silent yes.

**4. Where a data sheet or school record parks.** A parent card, or a student card on an office seat, uses the existing checklist on `/capture`, and only for a person that seat may already touch. Checked fields write on that existing person. The photo is a note on that person, not a grade. On the student seat, the confirm strip drops keys that seat cannot already change. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. The school logo uses the existing school-identity `PhotoSheet` on the superintendent office seat only. Administrator does not get that handoff. Anything else does not park. Out of the first cut. Do not draw a park screen.

**5. Same-name pick, including kind.** Covered by reuse. Office: empty guess, low confidence, or two matches means they pick an existing person at this school. The row must say student, parent, or staff. Parent: the list is this parent and linked children only. A same-name person outside that set stops. Student: themselves only. A classmate stops. Do not draw a new picker. If the existing picker cannot show kind, or cannot limit the rows, the designer says the existing rows label the kind and omit the people that seat must not see. That is not a new screen.

**6. Roster with no active class, or more than one class.** Office seats only. Covered for one class: they name an existing class, then the existing confirm checklist. No silent class create. A sheet that spans classes is out of the first cut: pick one existing class or leave. Do not split the sheet. Do not create a class. Do not create a person. Already-on-roster does not duplicate. Low-confidence names start unchecked. Parent and student: a roster is a refusal. Not a silent yes.

**7. Retake, replace, and dismiss.** Covered by controls that already exist. Do not invent a label. Cancel: leave `/capture` before confirm, or `PhotoSheet` Cancel or scrim. Nothing is filed. Retake: the existing ghost Retake on the confirm strip replaces the asset and does not file. Dismiss the system camera: nothing is filed. Teacher Capture stays on its sheet; this seat uses that same dismiss.

**8. Already has a photo.** Covered. Keep until they confirm the new photo. Dismiss keeps the old photo. Do not silently overwrite. `PhotoSheet` Remove photo only when that person or the logo already has a photo. This icon does not delete a person, a roster row, a class, or a grade.

**9. Wrong roster after confirm.** A new “this roster photo was wrong” screen is out of the first cut. The existing office swipe Remove on class Students undoes the bad enroll and does not delete the person. This icon does not call Remove. Creating a missing person is still not this camera. A wrong sheet must not be the only path those names enter the school.

**10. Wrong person after attach.** Covered by controls that already exist. Remove the photo on the wrong person’s `PhotoSheet`. The person stays. Circles fall back to initials. Attach it to the right existing person from this icon, or from that person’s existing `PhotoSheet`. No silent move. No second delete verb. No move control.

**11. Messages.** Hide this icon, same as the teacher icon, so a group photo cannot run portrait cutout. Messages keeps its own `PhotoSheet`. Do not invent a Messages camera.

**12. My children.** Icon off while office chrome is still up. My children does not flip the seat, but it is a parent-family surface. Mounting the office shutter there looks like the office papers camera on a family screen. The old sentence "Parent seat stays off either way" is superseded. Parent seat shows the parent shutter. Leaving My children back to an office screen remounts the office shutter when the other show rules pass.

**13. Phone vs web.** Both, all five seats. CEO did not say phone-only. The header slot is the same chrome on phone and web. Papers seats: one still from the device camera. Do not require the teacher library, files, mic, web drag-and-drop, or class-stack upload on those seats. Those stay on the Teach seat. This revision does not add them to office, parent, or student.

**14. Roster confirm.** Office seats only. Reuse the existing office confirm checklist. Not a different confirm. Not a new screen. They name an existing class first when there is no active class. Unchecked until confirmed. Does not duplicate. Does not create a person. Parent and student do not reach it.

**15. `capture.use` none vs roles.ts “Yes (logged).”** Split. See Photograph is not Approve. This icon is photograph. It is not Approve and it is not a grade. Do not treat the bundled row as one switch. Do not edit the matrix in this note.

**16. Detail fields.** A parent card may write the same checked canonical fields the teacher path already writes, on an existing person that seat may already touch, each field checked. A parent does not write another family's card. A student card may write only keys that seat can already change, on their own record. A student does not write another student's card or a parent card. On the student's own card, the confirm strip drops keys that seat cannot already change. Those keys include phone, email, address, emergency_name, and emergency_phone. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. Cancel before confirm is not a leave. Undoing a wrong person is not a leave for a hidden field. This lock does not name a new control. This lock does not invent a screen or a label. Unrecognized lines become notes. IEP and 504 stay note-only. Do not extract those fields. Do not invent columns. Do not invent the person. Unbound school-record text is not stored in this cut. How a school record would be stored is the legal read, not a designer guess. The legal note read the old seat list. It is not clearance.

## Closed list

The old single list is superseded as a list for every seat. Kept so it is not deleted: "In: student portrait on an existing student, parent portrait on an existing parent, parent contact card, student emergency or contact card, staff photo of an existing staff person, photographed class list for one existing class, school logo." That list is the superintendent office seat only. Other seats do not copy the logo, and parent and student do not copy the school-wide rows.

**Superintendent office seat.** In: student portrait on an existing student, parent portrait on an existing parent, parent contact card, student emergency or contact card, staff photo of an existing staff person, photographed class list for one existing class, school logo. Out: hallway, event, a camera-roll dump, feed photo, vehicle, plate, homework, answer key, syllabus, lesson plan, lesson materials, IEP or 504 extraction, district dashboard, creating a person, creating a login, creating a class, a data sheet that is not a student card or a parent card, a handbook, a policy, minutes, any school paper that is not the logo, library, files, mic, web drag-and-drop, class-stack upload, a batch of papers, voice.

**Administrator office seat.** In: the superintendent list, except the school logo. Out: the school logo, plus every superintendent out. CEO did not give this seat the school-logo block. `set_school_logo` stays superintendent-only. This lock does not add a school-logo camera to Administrator Manage.

**Teacher seat.** In: today's homework Capture. Unchanged. Out: the papers shutter. Not the school logo. Not a second icon. Not a merged strip.

**Parent seat.** In: their own portrait, a portrait of a child already linked to them, their own contact card, that child's contact or emergency card. Out: another family, a same-name person who is not linked, a staff photo, a class list, a school roster, the school logo, homework, Approve, a grade, creating a person, a login, or a class, and the shared outs (handbook, policy, minutes, library, files, mic, batch, voice, vehicle, plate). Do not add or remove a tray tab.

**Student seat.** In: their own portrait. A contact or emergency card that has no field this seat can already change is a refusal. Nothing is filed. The portrait stays in. Out: another student, a classmate, a staff photo, a parent record, a class list, a school roster, the school logo, homework, Turn in, Approve, a grade, creating a person, a login, or a class, and the shared outs. Do not add or remove a tray tab.

One shutter is one photo. Do not require a batch tray. No seat is dark. No seat shows two shutters.

## Surface

**Both.** Phone and web. All five seats. Not phone-only. Same label Open Capture. Same outs for that seat. Papers seats: one still from the device camera. Web does not gain a second camera and does not gain the teacher import stack on those seats. Teach keeps today's composer on phone and web.

## Quality goals

The revision stamp above is the current PM line. PM: APPROVED 2026-09-28 (t_f5021e92). The earlier goal "Parent and student never see a camera. Administrator never sees this icon." is superseded. Do not copy it forward. This note does not restamp QA Supervisor.

1. The superintendent office seat can start from the header Capture icon and photograph an existing student, an existing parent, an existing staff person, a student or parent card, one class list, or the school logo.
2. The administrator office seat can start from the same header icon and photograph those papers except the school logo. The logo is a refusal.
3. The teacher seat keeps today's homework Capture and does not also show the papers shutter.
4. The parent seat can start from the header icon and photograph only their own record or a linked child. Another family is a refusal. No tray tab is added or removed. Calendar stays where DITL-P-01 put it.
5. The student seat can start from the header icon and photograph their own portrait. The confirm strip drops keys that seat cannot already change. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. Another student, a staff photo, and a school roster are refusals. No tray tab is added or removed.
6. A photo never creates a person, a login, or a class. Confirm on this sheet is not Approve and not a grade.
7. Phone and web follow the same rules. Papers seats are one camera still. One seat, one shutter.
8. Every intent gap is covered in this note or marked out with a reason.

## Designer tell for docs/ui-design.md

Do not edit that file from this card. After CoS sends the tell, and only after QA Supervisor stamps this revision, the designer writes these sentences. Do not add a tray tab, a glyph, a records cabinet, or a Drive line. Do not restore a sentence that omits the slot for administrator, parent, or student.

- §3.2 Camera row. Today it says teacher only, and it still says the tap opens the device camera then `/proposal`. Change it: the slot shows on every signed-in seat that is not Messages and not an open Search. Office seats also hide it on My children. Tap routes to `/capture`. Accessibility label **Open Capture**. Confirm jobs are that seat's closed list in this note. Do not write "Administrator, parent, and student omit the slot."
- §2. Keep "the header camera never files." Add that every seat opens the same `/capture` and never files, and that confirm is not Approve.
- §13.4. Papers seats on `/capture` are one camera still. No Photo or Video, no Files, no mic, no web drag-and-drop, no Upload class stack. Confirm jobs are that seat's closed list. Teach seat keeps today's composer. Do not put both strips on one seat.
- §13.8. The line that says the header camera on class Students still goes to `/proposal` is not this path. This icon goes to `/capture`. A roster, office seats only, hands off to the existing confirm checklist after they name an existing class. Do not revive `/proposal` as the primary path. Parent and student do not get that roster handoff.
- §31.1. Split the bundled "Superintendent / Administrator … No camera" row. Every seat: camera, messages, and search, with the hides in this note. The old tell "Administrator: messages and search, no camera. Parent and student stay no camera." is superseded. Office tray stays Feed, Classes, People, Manage, Ask. Do not add or remove a parent tray tab. Do not add or remove a student tray tab. Calendar stays where DITL-P-01 put it.
- §31.4b. Mount today's homework Capture on the Teach seat. Mount the papers shutter on the office seat, the parent shutter on the Parent seat, and the student shutter on the Student seat. The old tell "Unmount on administrator, parent, and student" is superseded. Gate on the active seat, not `also_teacher`. One seat, one shutter. School logo only when the office job is superintendent.
- §37.1. "Camera mounts on teacher seat only (not on office seat, even if also_teacher)" must split the same way. `also_teacher` does not merge the two shutters. Administrator, parent, and student are not omitted.

## Legal and security

Flag only. Do not browse. Do not staff. Do not clear the flag.

notes/company/superintendent-capture-legal.md read the old seat list. It is not clearance and not the current seats. Counsel must see this revision before build: administrator now photographs people and cards, parent photographs their own record and a linked child, student photographs their own portrait. On the student seat, a contact or emergency card that has no field that seat can already change is a refusal. Nothing is filed. The portrait stays in. The school-logo block stays superintendent-only. This note does not edit that legal file. Do not clear this flag.

Until that read, do not extract a school record that is not the logo, and do not pull IEP or 504 into metadata. Teacher student-card already refuses that extraction. That is a fact, not a legal opinion.

If a photo write is logged, the activity log stays append-only (`audit.mutate` is none). Which row a photo writes is part of that read. This note does not name the row.

## Non-goals

- Not teacher homework Approve. Not a score. Not a parent-facing sentence.
- Not the teacher homework camera copied onto the office seat, and not the papers shutter copied onto Teach.
- Superseded, kept so they are not deleted: "Not a camera for parent. Not a camera for student. Not this icon for administrator." Do not copy those lines forward. Still not the school-logo block for administrator, teacher, parent, or student. Still not another family's records for a parent. Still not another student's record, a staff photo, or a school roster for a student.
- Not a tray tab. Not a new glyph. Not a records cabinet. Not a district dashboard. Not multi-school.
- Not auto-create a person. Not auto-create a login. Not auto-create a class. Not auto-enroll an unmatched name.
- Not a grade. Not `capture.approve`. Not student Turn in.
- Not voice. Not a batch. Not library or files on a papers seat.
- Not Ask. Not Messages portrait cutout. Not Ride line photos.
- Not a resolution edit of the matrix or of roles.ts. The split is written here. The files stay untouched.
- Not a Drive line. Do not invent one.

## Stop

PM: APPROVED for this revision, 2026-09-28, card t_f5021e92. Student-card leave: PM: APPROVED 2026-09-28, card t_4bbb40d6. The student confirm strip drops keys that seat cannot already change. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. Choice A still stands for the superintendent office seat. It is not a Chuck mock-up. Build still waits for that mock-up and for a QA Supervisor stamp of this revision. This note does not stamp QA Supervisor. Stamp 1 and Stamp 2 stay in the stamp file. Stamp 2 is not the build lock. Do not complete t_3bd86748. Do not implement. Do not start a build loop. Do not staff anyone. CoS staffs QA Supervisor to stamp again against this leave. The designer updates `docs/ui-design.md` only after that stamp. Engineering stays off.







