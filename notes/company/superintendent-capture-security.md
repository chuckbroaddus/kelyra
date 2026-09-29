# Capture on all accounts — security read

**Date:** 2026-09-28
**Author:** security (Kelyra)
**Card:** t_04c026f6
**Parent tracker:** t_3bd86748 (do not complete that card)
**Revision read:** notes/company/superintendent-capture-pm.md (t_f5021e92)
**Sources read (filed only; no browse):**
- notes/company/superintendent-capture-pm.md
- notes/company/superintendent-capture-legal.md (old seat list; not clearance; not the current seats)

**Status:** Privacy flag only. Not clearance to build. Not a control design. Not a FERPA ruling. Not a DPA.

**Build flag:** NOT CLEARED.

No outside page was opened. No URL to register. Claims below are lock facts or this seat's risk judgment. They are not statute text.

## Posture

This seat read the revised PM lock. It did not browse. It did not review an application diff. None exists. It did not implement. It does not design a control. It does not staff anyone. It does not edit the PM lock, the stamp, the legal note, or docs/ui-design.md.

PM: APPROVED on t_f5021e92 is a product revision only. It does not clear this flag. The legal note read the old seat list (administrator, parent, and student dark). That note is not clearance and not the current seats. This file does not replace it and does not clear it.

## What changed (lock facts)

Fact (lock): Every signed-in account has a header shutter. The tap opens `/capture` and does not file until that seat confirms. Choice A still stands for the superintendent office seat. The accessibility label is Open Capture.

Fact (lock): Parent may photograph only their own record and a linked child. Student may photograph only their own record. Administrator may photograph people and cards and may not set the school logo. Teacher keeps today's homework Capture and does not also get the papers shutter. A photo never creates a person, a login, or a class. Photograph is not Approve and is not a grade. IEP and 504 stay note-only.

Fact (lock): Those person limits are written as confirm-strip refusals, acceptance lines (AC-SC-16, AC-SC-22, AC-SC-26, AC-SC-27, AC-SC-29), and a designer tell. Gap 5 says if the existing picker cannot limit the rows, the designer says the rows omit the people that seat must not see, and that is not a new screen. Parent and student reuse the existing checklist, scoped in prose to people that seat may already touch. No new picker is drawn. No write wall is named. The matrix and roles.ts are not edited. No application diff exists for this revision.

## Privacy risk

Flag remains. The risk is cross-person reach through the shared Capture door. A sentence that the strip refuses the paper is not a proven refusal of the write, and it is not a proven refusal of the still being classified before confirm. This seat does not clear the flag. It does not design a control.

### Parent reaching another family

Fact (lock): Parent seat now shows Open Capture, except on Messages and while Search is open. In: own portrait, a linked child's portrait, own contact card, that child's contact or emergency card. Out, as sentences: another family, a same-name person who is not linked, a staff photo, a class list, a school roster, the school logo. AC-SC-26 and AC-SC-29 say the same-name list is this parent and linked children only. AC-SC-22 says a parent must not land the photo on another family. Dual-hat: the office shutter unmounts before the parent tray paints.

Risk (this seat; not cleared): A parent can open the same `/capture` route the office seats use and photograph another family's face or card. The stated stop is the confirm strip and a pick list that is limited only in prose. If that list is the office picker with rows omitted in the UI, or if confirm writes through a path that is not limited to the linked set, the parent reaches another family's record. The reach is a face attach, a contact or emergency field, or a note taken from the card. A same-name person who is not linked is the obvious miss. A dual-hat login that is also superintendent or administrator is the other miss: if the office papers shutter is still mounted when Parent paints, the parent session shows the school-wide people, cards, and class-list camera. That is another family, not this parent's own record.

Naming that reach is not a control. This seat does not specify how a later build would refuse it.

### Student reaching another student

Fact (lock): Student seat now shows Open Capture, except on Messages and while Search is open. In: own portrait, own contact or emergency card. Out, as sentences: another student, a classmate, a staff photo, a parent record, a class list, a school roster, the school logo, homework, Turn in, Approve, a grade. AC-SC-27 and AC-SC-29 say the student pick is themselves only and a classmate is a stop. AC-SC-22 says a student must not land the photo on another student or on staff. This icon is not Turn in. No tray tab is added or removed.

Risk (this seat; not cleared): A student can open `/capture` and photograph another student. The stated stop is the confirm strip and "themselves only." If the shared checklist, picker, or photo write still offers school people, or if a classmate's card is classified before the strip refuses it, the student reaches another student's record. Landing the photo on that student, writing that student's card fields, or storing the card as a note is the write. Seeing the other student offered in a pick list is the read. A failed unmount that leaves an office shutter or a parent shutter on the student seat is the same reach with a wider list: other students, a roster, or a staff photo.

Naming that reach is not a control. This seat does not specify how a later build would refuse it.

### Not only the superintendent seat

The earlier lock kept parent and student dark. This revision is the new door. Superintendent office capture of existing people and cards was already in that earlier lock. It is not the new cross-family or cross-student reach, and this note does not clear that older path either.

Administrator is also new relative to the legal note's seat list. Fact (lock): the administrator office seat photographs the superintendent papers except the school logo. That is a wider office write of student and parent images and cards. It does not shrink the parent or student risk. A school-logo refusal on administrator is a product sentence. It is not a privacy clearance of people-and-cards capture.

Teacher homework Capture is unchanged in the lock and is not this papers door. That sentence is not a review of homework Capture, and it is not clearance.

### IEP, 504, and classify-before-confirm

Fact (lock): IEP and 504 stay a note, not an extracted field. Unrecognized lines become notes. Ask AI may classify the still, then the confirm strip. The legal note already flagged note-only disability text and vendor processing on the old seat list. This seat does not invent a FERPA claim, a school-official claim, or a DPA. Those stay with human counsel. The legal file is not edited here.

Risk (this seat; not cleared): Note-only does not stop a parent or a student from photographing a card that contains that text, and it does not stop the still from being classified before a refusal. If the card is another family's or another student's, the note and the classify are cross-person handling of high-sensitivity text. "Do not extract" is not a clearance of that path.

### What does not clear the flag

- PM: APPROVED on this revision. Product only.
- Confirm-strip refusals, AC-SC lines, and "the designer omits the rows." Intent, not a verified write or read boundary.
- "A photo never creates a person." That stops an insert. It does not stop a write onto an existing person in another family, or onto another student.
- "Photograph is not Approve." That stops a grade. It does not stop a photo or a card field on the wrong person.
- Teacher not receiving the papers shutter. Scope of this papers door, not a parent or student wall.
- The legal note. It read the old seat list. It is not clearance.

No control is specified here. No one is staffed.

## What this seat does not clear

- Privacy flag: open. Parent reaching another family, and student reaching another student, remain named risks.
- Legal flag on the PM lock: still open. This file does not clear it.
- FERPA school-official status: not claimed.
- DPA: not drafted.
- Build, implement, matrix edit, roles.ts edit, stamp, Chuck mock-up: not granted.

## Stop

Do not complete t_3bd86748. Do not implement. Do not start a build loop. Do not staff anyone. Do not clear the build flag. CoS does not treat this note as clearance to build.
