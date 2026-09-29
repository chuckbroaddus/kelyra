# Superintendent Capture — IQG intent (phase 1)

Date: 2026-09-28
Card: t_50b07cb4
Parent tracker: t_3bd86748 (do not complete here)
Author: qa-supervisor
Parallel options: t_4bebb648 (designer owns the look; this note does not)
Status: verdict is REJECTED in notes/company/superintendent-capture-stamp.md (t_6f669883). This note is still the phase-1 gap list. It is not the stamp.

This note is not a build stamp. It does not choose chrome, a route, or a label. It does not edit the app or `docs/ui-design.md`.

## CEO ask

Chuck, 2026-09-28: the Superintendent gets the Capture icon and can photograph students, parents, staff, data sheets, school records, roster sheets, and similar papers.

## Today (facts, not a design)

- `showHeaderCapture` is true only when role is `teacher` and the path is not Messages. Superintendent and administrator are false. Tests lock that.
- Spec camera gate is `role === 'teacher'`, not hats. Office seat unmounts the camera. Parent seat has no header camera.
- `capture.use` is `none` for superintendent and administrator. `capture.approve` is `school` for both office seats.
- `roles.ts` says Capture / Approve / grade is "Yes (logged)" for superintendent and administrator. That disagrees with `capture.use`. This note does not pick a winner.
- Person faces, class avatar, school logo, and create-account already open `PhotoSheet`. That door is not the header icon.
- Teacher header camera opens `/capture` and never files. A stale spec line still says the class Students tab camera goes to `/proposal`. Office never reaches either path today, because the icon is hidden.
- Matcher never inserts a student. Nothing is a grade until a teacher Approves. A roster photo must not create a student.

## Hats

Seat is the chrome altitude, not the login's extra hats. One seat shows one header camera job. Do not merge trays. Do not show the teacher homework camera and this capture at the same time.

| Hat | This capture icon |
|---|---|
| Superintendent, office seat | Yes. This is the seat Chuck named. The icon is on while that seat is up, except where a gap below says the designer must still say (Messages, a parent-family deep-link that did not switch seats). |
| Administrator | Gap. Chuck did not name them. Not a yes. If PM later says yes, they follow this note. If PM says no, they stay as today: no header camera. |
| Dual-hat office+teacher, office seat | Yes, only when the job of record is superintendent (administrator stays the gap above). Default seat is Office. This seat gets this capture, not the teacher homework camera. |
| Dual-hat office+teacher, Teach seat | No. Teach keeps today's teacher header camera and today's homework job. They must not also get this school-paper capture. Switching to Office removes the teacher camera and shows this one. Switching to Teach does the reverse. Gate stays the active seat, not `also_teacher`. |
| Dual-hat office+parent, Parent seat | Must not. Parent seat has no camera even when the login is also superintendent. Switching to Parent unmounts this icon. Switching back to Office remounts it only if this hat's office seat was allowed above. |
| Parent-only | Must not. No camera. |
| Student | Must not. No camera. |
| Pure teacher | Must not gain this icon. They keep the teacher header camera they already have. This note does not add a school-records camera to Teach. |

My children is a deep-link. It does not flip the seat. Whether the office icon stays during that deep-link is a gap (Entry). It is not permission to put a camera on the Parent seat.

## Entry

The new door is the header icon only. No tray tab. Office tray stays Feed, Classes, People, Manage, Ask. Do not add a camera tab to any tray, including Teach, Parent, and Student.

Do not invent a second header glyph, a route, or a label. The designer option pack chooses the look. Today the teacher control is the header camera, hidden on Messages, and it opens `/capture`. Whether the superintendent control reuses that surface is not decided here. Office does not reach it today.

Person-page `PhotoSheet` is a second door that must stay. It is not this icon and it is not a tray tab.

It already exists for a known face or mark: student page, parent page, staff profile, create-account, class avatar, school logo. Take, library, and remove live there. Student page can also point a face at an existing homework photo. That sheet does not insert a captures row.

Must stay means: turning on the header icon must not remove those sheets, and must not become the only way to change a face you are already looking at. The header icon is how the superintendent starts from chrome when they are not already on that person. `PhotoSheet` is how they change a photo on a person, class, or logo they already opened.

No screen yet for attaching a header photo of a staff face, a data sheet, or a school record. Say so under Lifecycle. Do not draw one.

Messages: the teacher icon is hidden on Messages so a group photo cannot run portrait cutout. Messages has its own `PhotoSheet`. Whether the superintendent icon is also hidden there is a gap. Do not invent a Messages camera.

My children while office chrome is still up: gap. Parent seat itself stays dark.

## Lifecycle

Nothing files on the shutter. Nothing creates a person. Nothing becomes a grade. A person confirms, or the paper stays parked until a person confirms. Cancel leaves no new person and no new grade.

**Start.** Superintendent office seat taps the header icon and takes a photo of one of the named subjects: a student, a parent, a staff person, a data sheet, a school record, a roster sheet, or a similar paper. "Similar papers" is not a list. Designer must say which papers are in the first cut. Do not add a kind Chuck did not name (homework grade, vehicle, lesson plan) just because the teacher classifier has it.

Phone vs web is a gap. Product law is phone captures, web reviews. Chuck did not say phone-only. Do not assume the teacher library, files, and mic stack comes along. Voice was not asked. Do not require a mic.

**Change before confirm.** Retake or replace the photo before anyone confirms. If they dismiss the system camera, nothing is filed. Teacher Capture stays on its sheet with an empty or prior preview. There is no superintendent sheet yet. Designer must cover retake and dismiss without naming a new control here.

**Finish — attach to an existing person.** A face or a card that is clearly one person ends attached to someone who already exists (student, parent, or staff). If the guess is empty or wrong, they pick. They never insert. Several people with the same name are under Multiplicity.

Student and parent faces already have a teacher portrait path and `PhotoSheet`. Those stay. There is no screen yet that lets the superintendent header photo land on a staff face. No screen yet that lets a header photo of a data sheet or a school record land on an existing person. Say that. Do not draw them.

A student card or parent card that writes details is a teacher path today (checked fields, unrecognized lines become notes, IEP/504 forced to note-only). Whether a superintendent header photo may write those same details is a gap. It must not invent columns, and it must not invent the person.

**Finish — park a paper a person confirms.** A roster sheet parks until a person confirms names. Today that confirm checklist exists for office on class setup, and a pending `roster_imports` row can sit there. The header icon does not open it today. Reaching that checklist from this icon is allowed only as reuse of that existing confirm, not as a new screen this note draws. A name that is not already a person stays unmatched. Creating the person stays the existing office create-account path, not this camera.

A data sheet or school record that is not a roster and not one existing person has no park screen. No screen yet. Do not draw one. "Similar papers" with no matching person and no matching class also have no park screen.

**Cancel.** Dismiss the camera or leave before confirm. No person created. No grade. No parked paper unless they already confirmed a park. A half-read photo must not become a filed capture.

**Already has a photo.** A person, class, or logo that already has a photo must not be silently overwritten by a header shot. `PhotoSheet` already has remove, and remove keeps the person. Replace vs keep for a header shot is a gap. Designer must cover it. Do not invent the words on the control.

**Teacher homework path is not this finish.** Confirm here must not open Approve, must not write a score, and must not file the photo as graded work. `capture.approve` being `school` for office is a different capability. This camera must not use it.

## Multiplicity

One school. Do not design multi-school. The superintendent seat is this school's office, not a district dashboard.

**Several people with the same name.** A photo must not attach to the wrong twin, the wrong parent, or the wrong staff person. Empty guess, low confidence, or two matches means they pick an existing person. No screen yet for that pick on the superintendent header path. Teacher portrait already requires a picker when the guess is null. Reuse is a designer choice. This note does not draw a picker and does not name one.

**Staff vs student vs parent with the same name.** The pick must say which kind of person, or the photo can land on the wrong record. No screen yet. Gap.

**Several classes for one roster sheet.** A printed list may be one class, more than one class, or not a class list. Teacher roster intent proposes the active class. A superintendent on the office seat may have no active class. Which class, or a school-level park, is a gap. No screen yet for a sheet that spans classes. Do not split the sheet into a new class. Do not create a class from a photo.

Already-on-roster names must not duplicate. That rule already exists on the confirm checklist. It still applies if that checklist is reused.

**Several papers.** Chuck named kinds of paper, not a stack. One shutter is one photo until PM says otherwise. Do not require a batch tray.

**Already has a photo** is lifecycle, not a second person.

## Reverse

**Dismiss the camera.** Leave before confirm. Back where they were. No new person, no grade, no parked paper. A photo that was only previewed is gone. If they were replacing a face and they dismiss, the old photo stays.

**Remove a photo.** A face set by `PhotoSheet` or by a confirmed header shot can be removed. The person stays. Circles fall back to initials. That remove already exists on `PhotoSheet` for student, parent, staff profile, class avatar, and school logo. Header-shot faces must be removable the same way once they are attached. No second delete verb.

**A roster photo that is wrong.** Before confirm, throw the list away. No students added. That discard already exists for a pending `roster_imports` row and for in-memory suggestions. It must remain reachable for a list this icon parked.

After confirm, do not delete people who already existed. Un-enrolling a name this sheet wrongly added is a gap. No screen yet for "this roster photo was wrong" after names were confirmed. Creating a missing person is still not this camera. A wrong sheet must not be the only path those names enter the school.

**A data sheet or school record that was wrong.** No remove screen yet, because there is no park screen yet. Gap. Do not draw one.

**Wrong person.** If a face landed on the wrong existing person, remove it there and attach it to the right one. Both steps must exist. Silent move is not specified. Gap for the designer: how they leave the wrong record without deleting that person.

## Non-goals

Explicitly out. "Not built" here is not "done."

- Not teacher homework Approve. Not a score, not Inbox-as-grade, not a parent-facing sentence.
- Not the teacher header camera's job copied onto the office seat (homework, gaps, spoken mark, Approve).
- Not a camera for parent. Not a camera for student. Not this icon on Teach for a pure teacher.
- Not a tray tab.
- Not auto-create a person. Not auto-create a class. Not auto-enroll an unmatched name.
- Not a grade.
- Not a district dashboard. Not multi-school.
- Not a resolution of `roles.ts` "Yes (logged)" vs `capture.use` none. PM splits photograph from Approve. This note does not edit the matrix.
- Not voice. Not a batch of papers. Not library or files, unless a later stamp adds them.
- Not Ask. Not Messages portrait cutout. Not Ride line photos.
- Not a new glyph, route, or label from this seat. Designer options are parallel. PM chooses.

## Gaps the designer must cover

Do not draw these here. If PM's option pack skips one, the stamp cannot be approved later.

1. Administrator: in or out. Not a silent yes.
2. Which papers are in the first cut. "Similar papers" is undefined. Data sheets and school records have no screen.
3. Where a header photo of a staff face attaches. No screen yet.
4. Where a data sheet or school record parks, and how a person confirms it. No screen yet.
5. Same-name pick, including staff vs student vs parent. No screen yet on this path.
6. Roster sheet with no active class, or names in more than one class. No screen yet. Must not create a class or a person.
7. Retake, replace, and dismiss before confirm, without a new label from this note.
8. Already has a photo: replace vs keep. Must not silently overwrite.
9. Wrong roster after confirm: undo the bad enroll without deleting people who already existed. No screen yet.
10. Wrong person after attach: leave the wrong record without deleting them.
11. Messages: hide this icon or not. Teacher icon is hidden there today.
12. My children deep-link while office chrome is up: icon on or off. Parent seat stays off either way.
13. Phone vs web. Do not assume the teacher mic, library, and files stack.
14. Reuse of the existing roster confirm checklist vs a different confirm. This note allows reuse. It does not choose.
15. `capture.use` none vs `roles.ts` "Yes (logged)". PM splits photograph from Approve/grade. Do not treat Approve as part of this icon.
16. Whether a header photo may write student or parent detail fields. Must not invent columns. IEP/504 stays out of extracted fields (teacher path already forces note-only). How a superintendent school record is stored is the privacy read, not a designer guess.

## Privacy

Student, parent, and staff photos, plus data sheets and school records, need a legal and security read after PM picks an option. Flag only. This note does not browse the law and does not staff that read.

Until that read, do not treat a school record as safe to extract. Teacher student-card already refuses to pull IEP/504 into metadata. That caution is a fact, not a legal opinion.

Audit: if PM keeps "logged," the activity log is append-only (`audit.mutate` is none). What row a superintendent photo writes is part of the later read, not this note.

## Stop

Phase 1 only. No stamp on this note and no stamp on t_3bd86748. CoS staffs PM when the option pack exists. This seat stamps only on that later card.
