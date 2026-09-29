# Superintendent Capture icon — options

**Status:** Options only. No pick. No recommended winner.
**Date:** 2026-09-28
**Card:** t_4bebb648
**Parent tracker:** t_3bd86748 (do not complete that card)
**Ask:** CEO Chuck, 2026-09-28 — add the Capture icon on the Superintendent so that seat can photograph students, parents, staff, data sheets, school records, roster sheets, and similar papers.

This pack does not edit `docs/ui-design.md`, app code, or icon recipes. It does not choose. It does not implement.

## Before

Office header today: logo, wordmark, Search, messages, menu. No camera. `showHeaderCapture` is `role === 'teacher'` and not `/messages`. Tests lock superintendent and administrator to false. Parent and student omit the camera slot; Search sits immediately left of messages.

Teacher header, the slot this ask reuses: Capture, then Search, then messages, then menu. Hit 44. Glyph `capture`, 22, ink. Hover tip and accessibility label **Open Capture**. Hidden while Search is open, and on `/messages` (a group photo must not run portrait cutout). Tap routes to `/capture`. It does not file by itself.

## Conflict — flag, do not resolve

`src/lib/school/matrix.ts` `capture.use` is **none** for superintendent and administrator (teacher **own**). Help text is “Photograph or voice-note work.”

`src/lib/school/roles.ts` bundles one row, “Capture / Approve / grade”: superintendent and administrator **Yes (logged)**, teacher **Own classes**, parent **No**, student **Own practice only**.

`AppHeader` paints the glyph only when `showHeaderCapture` is true **and** `can(profile, 'capture.use', 'own', grants)`. Opening the role gate alone still hides the icon while `capture.use` is none.

This pack does not say which source wins. It does not read “Yes (logged)” as permission to Approve. Matrix `capture.approve` is a different row (superintendent **school**). This icon is not Approve.

## Shared law (every option)

- Parent seat and student seat: camera stays off. No tray tab. No sixth header icon.
- A photo never creates a person, a login, or a class. Matcher never inserts a student. Unmatched name: stop. Create the person on People first (existing Create account, which already has its own PhotoSheet).
- Nothing is a grade until a teacher Approves. This icon does not Approve.
- Reuse only: header Capture (`/capture`), `PhotoSheet` (take, library, remove), office roster confirm checklist. No new product, no new glyph, no district dashboard.
- Existing `capture` glyph. Do not invent a View-stroke.
- Messages hide and Search-open hide stay.
- Dual-hat mounts on the **active seat**, not the hat. Teach seat keeps today’s teacher Capture. Parent seat unmounts the icon. **My children** does not mount it.
- IEP / 504: existing note-only refusal. Do not extract those fields.

## What the person sees

### A — Same shutter, papers only

On the superintendent office seat, the header gains the teacher camera slot: Capture, then Search, then messages, then menu. The glyph and the label are the ones the teacher already has. Tap opens `/capture`. The confirm strip offers people and school papers only. Administrator does not see the icon. Feed, Classes, People, Manage, and Ask all show it, except Messages and an open Search field.

### B — Name the subject, then the sheet that already owns it

Same slot and same glyph as A, superintendent office seat only. The label is **Choose what to photograph**, not “Open Capture,” because the tap does not open `/capture`. It opens a short sheet of rows. Each row goes to a photo control that already exists (person PhotoSheet, roster confirm, school logo). Printed data sheets and unbound school papers are refused on this icon.

### C — Camera only on the screen that already has the photo

The slot is omitted on Feed, Ask, and list screens, the way parent chrome omits it. It appears in the same Capture slot only when the open screen already owns a photo: a person, class Students, or school identity. Superintendent and administrator office seats both follow this rule. Tap does not leave the screen and does not open `/capture`.

## Option A — Same shutter, papers only

**Job of the chrome.** One header camera for the superintendent office seat. It looks like the teacher shutter. It does not file homework.

**Where it sits.** Trailing cluster, immediately left of Search: `[ capture 44 ] [ search 44 ] [ messages 44 ] [ menu 44 ]`. Same order as the teacher. Wordmark stays the office title (Feed, Classes, People, Manage, Ask). Not in the tray. Not in the drawer. Not inside the Search field.

**Accessibility label.** **Open Capture.** Hover tip matches. Same string as the teacher, because the tap opens the same route.

**Who sees it.** Superintendent, office seat only. Administrator does not. CEO named superintendent only; this option does not extend the seat.

**What the tap opens.** Existing header Capture route `/capture`. Not ListenSheet. Not `/proposal` as the primary path. Ask AI may classify, as it does for the teacher. The confirm strip is the existing “This will be …” strip, with the job list narrowed below. Nothing files until the superintendent confirms. Roster intent hands off to the existing photo-of-list confirm checklist. School logo hands off to the existing school-identity `PhotoSheet`. A staff face uses the portrait person picker plus the existing `teacher` photo write. Do not add a `staff` classifier intent.

**Where each subject lands.**

| Subject | Lands | If there is no match |
|---|---|---|
| Student (face) | Portrait on an **existing** student. Writes that student’s photo the way portrait already does. Not a homework capture. | Stop. Do not insert a student. Pick a person already at the school, or leave. |
| Parent (face or contact card) | Portrait or parent card on an **existing** parent. Fields only the canonical parent keys, each checked. | Stop. Do not insert a parent from the photo. People → Create account is the create path, and it is not this tap. |
| Staff | Existing `setProfilePhoto` kind `teacher`, after they pick an existing staff person on the portrait person picker. That picker is student or parent today. This option adds staff to that picker. It does not add a classifier intent and it does not add a staff page. | Stop. Do not create a login. |
| Data sheet | Existing student-card or parent-card checklist (emergency card, birthdate, contact). Checked fields write metadata on the existing person. Photo kept as a note on that person, not a grade. | If it is not a student card or a parent card, do not file it. |
| School record | School logo only, via school-identity `PhotoSheet`. That is the only school-wide photo destination that exists. | A handbook, policy, or minutes page is refused. There is no records cabinet. Do not invent one. |
| Roster sheet | Existing office confirm checklist on a class the superintendent names. Low-confidence names start unchecked. Already-on-roster does not duplicate. Parked unconfirmed import stays the existing parked card. | No silent class create. A name that is not already a person does not become a person or a login. |

**Closed list for “etc.”**

In: student portrait, parent portrait, parent contact card, student emergency / contact card, staff photo of an existing staff person, photographed class list, school logo.

Out: hallway, event, an arbitrary camera-roll dump (library is one photo for a named target, not an album import), feed photo, vehicle / plate, homework, answer key, syllabus, lesson plan, lesson materials, IEP / 504 extraction, district dashboard, creating a person.

**Dual-hat.** Office seat shows this icon and this narrowed strip. Teach seat unmounts it and mounts today’s teacher Capture (homework `/capture`, label **Open Capture**, hidden on Messages). Gate on the active seat, not `also_teacher`. Parent seat: icon unmounts; parent tray stays Home · Ride · Ask. Student never sees it.

**Cancel, retake, remove.** Cancel: leave `/capture` before confirm, or `PhotoSheet` **Cancel** / scrim. Nothing is filed. Retake: existing ghost **Retake** on the confirm strip replaces the asset and does not file. Remove: `PhotoSheet` **Remove photo** (danger) only when that person or the logo already has a photo. This icon does not delete a person, a roster row, a class, or a grade.

**What it does not do.** It does not open a homework inbox. It does not Approve. It does not insert a person. It does not show for administrator, parent, or student. It does not add a tray tab. It does not change the teacher shutter.

## Option B — Name the subject, then the sheet that already owns it

**Job of the chrome.** A header camera that does not enter Capture. The superintendent names the subject, then the app opens the photo control that subject already has.

**Where it sits.** Same slot as A: `[ capture 44 ] [ search 44 ] [ messages 44 ] [ menu 44 ]`. Same glyph (`capture`). Not a tray tab. Not a drawer row.

**Accessibility label.** **Choose what to photograph.** Hover tip matches. Not “Open Capture,” so VoiceOver does not promise `/capture`.

**Who sees it.** Superintendent, office seat only. Administrator does not.

**What the tap opens.** A short sheet, same family as `PhotoSheet` (scrim, title, rows, **Cancel**). It does not route to `/capture`. It does not call Ask AI. Rows:

1. **Student** — pick an existing student, then that person’s `PhotoSheet`.
2. **Parent** — pick an existing parent, then that person’s `PhotoSheet`.
3. **Staff** — pick an existing staff person, then `PhotoSheet`, using the existing `teacher` photo write. Not a new page.
4. **Roster sheet** — pick an existing class, then the office add-students photo and confirm checklist on class Students.
5. **School logo** — school-identity `PhotoSheet`.

No sixth row. Data sheet and unbound school record are not rows.

**Where each subject lands.**

| Subject | Lands | If there is no match |
|---|---|---|
| Student | Existing student `PhotoSheet` (take, library, remove). Face only. | Stop. No insert. |
| Parent | Existing parent `PhotoSheet`. | Stop. No insert. |
| Staff | Pick an existing staff person, then `PhotoSheet`, writing with the existing `teacher` photo path (`ProfilePhotoKind` includes `teacher`). The People list has no photo control today. This row is a launcher into that write, not a new filing surface, and not a new classifier intent. | Stop. No login created. |
| Data sheet | **Refused.** `PhotoSheet` and the roster checklist do not write Details fields. Filing a printed form is a `/capture` student-card or parent-card job. This option does not open `/capture`, so a data sheet cannot land here. | — |
| School record | School logo only, school-identity `PhotoSheet`. | A handbook, policy, or minutes page is refused. No records cabinet. |
| Roster sheet | Existing confirm checklist on the class they pick. Unchecked until confirmed. Does not duplicate. Does not create a person. | No silent class create. |

**Closed list for “etc.”**

In: student face, parent face, staff face, photographed class list, school logo. Library on `PhotoSheet` is one photo for that named target.

Out: data sheet (refused, above), hallway, event, camera-roll dump, feed photo, vehicle / plate, homework and the other teacher paper jobs (answer key, syllabus, lesson plan, lesson materials), IEP / 504 extraction, district dashboard, creating a person, any paper that is not the logo and not a class list.

**Dual-hat.** Office seat: this icon and this sheet. Teach seat: today’s teacher Capture, label **Open Capture**, hidden on Messages. Parent seat: no camera. Student: no camera. Active seat, not the hat.

**Cancel, retake, remove.** Cancel: scrim or **Cancel** on the subject sheet, and `PhotoSheet` **Cancel**. Nothing is written. Retake: **Take photo** again on `PhotoSheet` replaces the uncommitted shot; the roster checklist keeps its existing retake. This pack does not add a retake control. Remove: `PhotoSheet` **Remove photo** when that target already has a photo. The roster checklist’s swipe **Remove** on an enrolled student is a different control. This icon does not call it.

**What it does not do.** It does not open `/capture`. It does not classify. It does not file a data sheet. It does not Approve, grade, or insert a person. It does not show for administrator, parent, or student. It does not add a tray tab.

## Option C — Camera only on the screen that already has the photo

**Job of the chrome.** No always-on office camera. The glyph appears only when the open screen already has a photo control. Tap runs that control. It does not navigate away and it does not open `/capture`.

**Where it sits.** Same Capture slot as the teacher — immediately left of Search — and only on these screens:

- Student person page. Label **Change photo**.
- Parent person page. Label **Change photo**.
- Create-account form, while that form is open (it already has `PhotoSheet`). Label **Change photo**.
- A staff person’s own profile, when that profile is the open screen (`ProfilePhotoKind` includes `teacher`). Label **Change photo**.
- Class Students, office add-students card (the pane that already photographs a list). Label **Photograph roster**.
- Manage, and only when the school-logo block is on screen. That block is superintendent-only today. Label **School logo**.

Everywhere else the slot is omitted. Search sits immediately left of messages, as office chrome does today. Feed, Ask, People list, Classes list, and administrator Manage have no icon.

**Accessibility label.** The label is the screen’s job, not “Open Capture.” Hover tip matches the label above. When the slot is omitted, there is no label.

**Who sees it.** Superintendent and administrator, office seat, on a screen in the list that their seat can already open. Administrator is drawn here so the both-seats choice is visible. It is not the pack default. CEO named superintendent only. Administrator Manage has no logo block, so administrator does not get a school-logo camera. Do not add the logo block for them in this option.

**What the tap opens.** The control already on that screen. Person, create-account, profile, and logo: that screen’s `PhotoSheet` (take, library, remove). Class Students: the existing add-students photo and confirm checklist. Not `/capture`. Not Ask AI. Not a new route.

**Where each subject lands.**

| Subject | Lands | If the screen is not the one that owns it |
|---|---|---|
| Student | `PhotoSheet` on the open student page. Face only. | Icon is absent on the People list. Open the student first. No insert. |
| Parent | `PhotoSheet` on the open parent page. | Same. Open the parent first. No insert. |
| Staff | `PhotoSheet` on the create-account form, or on that staff person’s open profile. Write path is the existing teacher/staff photo, not a new intent. | Refused from the People list. That list has no photo control. Do not add one. |
| Data sheet | **Refused.** No open office screen extracts form fields. Student-card and parent-card live on `/capture`, which this option does not open. | — |
| School record | School logo only, and only on superintendent Manage, via the logo `PhotoSheet` already there. | Handbook, policy, and minutes are refused. No records cabinet. Administrator does not see this camera. |
| Roster sheet | Existing confirm checklist on class Students. Unchecked until confirmed. Does not create a person. | Icon is absent on the Classes list. Open that class’s Students pane first. No silent class create. |

**Closed list for “etc.”**

In, and only on the owning screen: student face, parent face, staff face (create-account or that profile), class list photo, school logo (superintendent Manage).

Out: data sheet (refused), hallway, event, camera-roll dump, feed photo, vehicle / plate, homework and the other teacher paper jobs, IEP / 504 extraction, district dashboard, creating a person from a photo, any paper that is not the logo and not a class list.

**Dual-hat.** Office seat: this contextual icon, and only on the screens above. Teach seat: today’s teacher Capture on the teacher header, including screens that are not “photo screens,” label **Open Capture**, hidden on Messages. Parent seat: no camera, even on a child page. Student: no camera. Active seat, not the hat. Switching to parent unmounts the icon before the parent tray paints.

**Cancel, retake, remove.** Cancel: `PhotoSheet` **Cancel** or scrim; roster checklist keeps its existing cancel. Nothing is written. Retake: **Take photo** again, or the checklist’s existing retake. No new retake glyph. Remove: `PhotoSheet` **Remove photo** when the target already has a photo. This icon does not swipe-remove an enrolled student.

**What it does not do.** It does not sit on every office screen. It does not open `/capture`. It does not file a data sheet. It does not Approve, grade, or insert a person. It does not show for parent or student. It does not add a tray tab. It does not give administrator the school logo.

## Differences

Chrome, office seat, when the icon is showing:

```
Today     [ logo  wordmark          ] [ search ] [ messages ] [ menu ]
A and B   [ logo  wordmark          ] [ capture ] [ search ] [ messages ] [ menu ]
C, photo  [ logo  wordmark          ] [ capture ] [ search ] [ messages ] [ menu ]
C, else   [ logo  wordmark          ] [ search ] [ messages ] [ menu ]
```

Capture is the existing `capture` glyph. 44 hit. Left of Search. Not a tray tab.

| | A — Same shutter, papers only | B — Name the subject first | C — Only on the owning screen |
|---|---|---|---|
| Always in the header | Yes, except Messages and open Search | Yes, except Messages and open Search | No. Only on a screen that already has the photo control |
| Who | Superintendent office seat | Superintendent office seat | Superintendent and administrator office seats. Administrator is drawn here; CEO named superintendent only |
| Label | Open Capture | Choose what to photograph | Change photo, Photograph roster, or School logo |
| Tap | `/capture`, narrowed confirm | Subject sheet, then PhotoSheet or roster confirm | The control already on that screen |
| Ask AI | Yes, then confirm | No | No |
| Student | Portrait on an existing student | PhotoSheet on an existing student | PhotoSheet on the open student page |
| Parent | Portrait or parent card on an existing parent | PhotoSheet on an existing parent | PhotoSheet on the open parent page |
| Staff | Portrait picker plus existing `teacher` photo write | Sheet row, then that same write | Create-account or own profile only. Refused from the People list |
| Data sheet | Student card or parent card on `/capture` | Refused. This option does not open `/capture` | Refused. No office screen extracts fields |
| School record | Logo only. Other papers refused | Logo only. Other papers refused | Logo only, superintendent Manage. Other papers refused |
| Roster sheet | Confirm checklist after classify | Confirm checklist after they pick a class | Confirm checklist on class Students |
| Homework inbox | No | No | No |
| Administrator | No | No | Yes, on screens that seat already has. No logo camera |
| Parent / student camera | Off | Off | Off |
| Teach seat | Today’s teacher Capture | Today’s teacher Capture | Today’s teacher Capture |
| Parent seat | Icon unmounts | Icon unmounts | Icon unmounts |

Homework on the superintendent shutter is not in A, B, or C. If Product Manager wants that inbox too, that is a separate decision. It is not a fourth option here.

## Pack non-goals

- No winner. No recommendation.
- Do not edit `docs/ui-design.md` until Product Manager records a choice.
- Do not implement, and do not start a build loop.
- Do not resolve matrix `capture.use` none versus roles.ts “Yes (logged).”
- Do not design the district dashboard.
- Do not add a tray tab, a new glyph, or a records cabinet.
- Do not give parent or student a camera.
- Do not auto-create a person from a photo.
- Do not treat this icon as Approve.

