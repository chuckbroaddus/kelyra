# Capture office merge — legal read (Stamp 6)

**Date:** 2026-09-29
**Author:** legal-compliance (Kelyra)
**Card:** t_f9f897c3
**Parent tracker:** t_3bd86748 (do not complete that card)
**Sources read (filed only; no browse):**
- notes/company/superintendent-capture-pm.md (office merge t_f5b99886; cross-person avatar leave t_e90d2988)
- notes/company/superintendent-capture-stamp.md Stamp 6 (t_2bbbd789)
- notes/company/superintendent-capture-legal.md and superintendent-capture-legal-revision.md (earlier reads; not deleted; not copied forward as current seats)

**Status:** Counsel flag only. Not clearance to build. Not a legal opinion. Not a DPA. Not a FERPA “school official” claim.

**Build flag:** NOT CLEARED by this seat.

**CEO clearance 2026-09-29:** Chuck cleared this flag for a build. This seat did not. See notes/company/superintendent-capture-ceo-clearance.md. Not a FERPA school-official claim.

---

## Posture

This seat reads the merged Capture lock (Stamp 6) only. It does not browse. It does not invent statute text. It does not staff counsel, security, engineering, or CoS.

Earlier legal notes read older seat lists (dark seats; split office; never-create). Those lists are superseded. Do not treat those notes as the current read. Do not delete them. Do not copy a dark-seat list forward.

CEO pass 2026-09-29 on the mock is a look approval. It is not legal clearance.

Stamp 6 APPROVED is product/QA lock on the office merge and cross-person avatar leave. It does not clear legal or security.

Do not treat this file as permission to implement, start a build loop, edit the matrix, or ship Capture on any seat.

---

## What the Stamp 6 lock would touch (facts from the lock)

From the PM office-merge lock and Stamp 6. Not a restatement of product preference. Not a legal conclusion.

1. **No seat is dark.** Every signed-in seat has a header Capture icon when show rules pass. Accessibility label Open Capture. Route `/capture`. The tap does not file. No tray tab added or removed. One seat, one shutter. Switching seats unmounts the prior shutter before the next paints. Administrator, parent, and student are not dark.

2. **Photograph is not Approve.** Confirm on this sheet is not Approve and not a grade. A photo does not set a grade. Only the teacher enters or sets a grade for classwork. Student turn-in is not a grade. Parent extra work is not an official gradebook grade. Office confirm is not that grade.

3. **Shared office list (superintendent and administrator — one list).** Same features. Same functions. Same refusals. If one can do it, the other can. If one is refused, the other is refused. Do not ship a split.

   In, both office seats:
   - School logo.
   - A contact card.
   - One class list.
   - A face for someone new, or for someone already at the school.
   - A photo used to create a class, a roster, or a **new person**. Confirm, not a silent insert.

   Refused, both office seats:
   - Classwork sent to a teacher for grading.
   - A grade that overrides the teacher.
   - A photo that sets a grade.
   - A handbook, a policy, minutes. No records cabinet.
   - A silent insert. Cancel before confirm files nothing.

4. **Office confirmed create (new vs earlier legal notes).** An office seat may confirm a new person, a new class, or a roster. Nothing is inserted until that confirm. The matcher does not insert until that confirm. Cancel files nothing. Teacher, parent, and student: a photo used to create a class, a roster, or a new person is a refusal. Nothing is filed. Earlier “photo never creates a person/class” walls do not apply to office confirmed create under this lock.

5. **School logo on both office seats.** Both office confirm strips name the school logo. Administrator is not refused. Parent and student do not get the school-logo job. `docs/data-model.md` still says only the superintendent sets `schools.logo_asset_id` (`set_school_logo`). The PM lock does not edit that file. The Capture list does not split. How the write is authorized is not decided in the lock.

6. **Teacher seat.** Header camera. May confirm anything photographed, including classwork, except a photo used to create a new class, a class roster, or a new person. Those three are refusals. Only the teacher sets the classwork grade. The photo does not set it. Not a second icon. Not the office list on Teach.

7. **Parent seat (not dark).** Own face and a linked child's face for avatars. That child's homework for submission. That child's homework into Ask as co-educator with the teacher (how to solve or understand, correct answers, review sheet, practice test, or gap assignments). Own bio. Not another family. Twins stay one child at a time. Extra work the parent creates is not an official gradebook grade. Parent card is not completed. Out: office create jobs, office class list, school logo, another family, a grade, a photo used to create a class/roster/new person. Hides on Messages and open Search. Not a tray tab.

8. **Student seat (not dark).** Own face for the avatar. A linked parent's face for that parent's avatar. Own homework for submission. Turning it in is not a grade. A contact or emergency card that has no field the student can already change is a refusal. Nothing is filed. The portrait stays in. The student confirm strip drops keys that seat cannot already change, including phone, email, address, emergency_name, and emergency_phone (and other keys that seat cannot already change). Out: another student, a grade, a photo used to create a class/roster/new person, office list, school logo. Hides on Messages and open Search. Not a tray tab.

9. **Cross-person avatar leave (Stamp 6 close).** After a student files a linked parent's face, and after a parent files a linked child's face, the same camera is the leave. Confirm again on that same linked person replaces the avatar. A face that is not the person they meant does not attach. Cancel before confirm is not that leave. Those seats do not open the other person's photo sheet for this leave. Do not invent that sheet. Office wrong-face leave remains Remove on a sheet that office seat can already open — not the student/parent leave.

10. **IEP and 504.** Stay note-only on card paths. Not extracted fields. Unrecognized lines become notes. Do not extract those fields. Do not invent columns.

11. **AI classify.** Ask may classify the still, then the confirm strip. Jobs on the strip are only that seat's list. A job from another seat is not offered. Superintendent and administrator are offered the same jobs.

12. **Same-name / pick scope.** Office: empty guess, low confidence, or two matches means pick existing people at this school, or confirm someone new. Each row says student, parent, or staff. Not a silent insert. Parent: this parent and one linked child at a time. Student: themselves, or a linked parent for that parent's avatar. Parent and student do not get school-wide roster pick. No new picker screen.

13. **Audit fact named, not decided.** If a photo write is logged, activity log stays append-only (`audit.mutate` is none). Which row a photo writes is part of the legal/security read. The lock does not name the row.

14. **Surface.** Phone and web, all five seats. Same icon rules, same label Open Capture, same list for that seat. Superintendent and administrator do not differ on phone or on web.

15. **Build still waits.** Legal flag stays. Security flag stays. Drive line missing from the feature map (stamp fact; this seat does not invent one). Parent card is not completed. Do not complete t_3bd86748. Engineering stays off until CoS and other gates say otherwise — this note is not that gate.

---

## What human counsel must see before build

Human counsel must review the Stamp 6 PM lock before any build that turns Capture on under this merge. This seat flags topics. It does not decide them. Earlier legal notes (C1–C8, R1–R12) still matter as history for older cuts; this note reframes what counsel must see under the shared office list, confirmed create, and non-dark parent/student jobs. Do not invent a school-official or directory-information answer here.

### S1 — Shared office list (no dark seats; no office split)

Counsel must see that Capture is on every signed-in seat when show rules pass. Administrator is not dark. Parent is not dark. Student is not dark. Superintendent and administrator share one Capture list — not a superintendent-only cut and not a shorter administrator list.

Flag: whether enabling five-seat capture, with identical office operators on superintendent and administrator, changes notice, consent, handbook, photo-release, role boundaries, and pilot-addendum expectations versus earlier staff-only or split-office cuts. Do not invent a school-official answer here.

### S2 — Confirmed create of a person, class, or roster (office)

Counsel must see that an office seat may use a photo to create a class, a roster, or a **new person**, after confirm — not a silent insert. Cancel files nothing. Teacher, parent, and student refuse those create jobs.

Flag: whether photo-assisted creation of education-system persons, classes, and enrollments (with human confirm) is acceptable for pilot schools; what identity, duplicate, fraud, and access-control checks counsel requires beyond product confirm; whether a new person from Capture needs different notice or audit than a People-first create. This seat does not rewrite the lock.

### S3 — School logo on both office seats vs data-model write path

Counsel must see both office seats may capture the school logo on the Capture list. The lock does not split the list. `docs/data-model.md` still says only the superintendent sets `schools.logo_asset_id`. How the write is authorized is not decided in the lock.

Flag: whether administrator logo capture may write, must route through superintendent-only authorization, or needs a data-model / RPC change before build; brand and school-property issues if any. Not a product decision in this note.

### S4 — Contact cards and education-record / PII surfaces (widened operators)

Counsel must see faces, contact cards, emergency-related card content (note-only for IEP/504), class-list photos, and (office) creates land through Capture on office, parent, and student paths as locked.

Flag: whether those writes are education records (or equivalent under school contract); who may view them after confirm by seat; retention; parent/eligible-student access or correction paths. Do not invent a “directory information” or “school official” answer here.

### S5 — Staff photographs and employment/privacy boundary (office)

Counsel must see a face for someone already at the school includes staff on both office seats. No new staff page. Parent and student: a staff photo is a refusal. A student may photograph a linked parent's face for that parent's avatar — that is not staff and not a new person (lock fact).

Flag: employee/contractor image consent, HR retention, and whether office-seat capture of staff differs from teacher self-service photo change. Not a product decision.

### S6 — Parent captures linked child homework into Ask and submission

Counsel must see parent-seat capture: own face; linked child's face; that child's homework for submission; that child's homework into Ask as co-educator (solve/understand, correct answers, review sheet, practice test, gap assignments); own bio. Product walls: another family refused; twins one child at a time; extra work is not an official gradebook grade; parent card not completed; confirm is not a grade.

Flag: parent-originated photos of a child's homework sent to Ask/AI and to submission; whether that needs different subprocessors, retention, or notice than teacher-originated classwork capture; family PII and dual-hat office+parent gating as product control only (not a legal shield by itself).

### S7 — Student captures linked parent face and own homework turn-in

Counsel must see student-seat capture: own face; linked parent's face for that parent's avatar; own homework for submission. Turning it in is not a grade. Contact/emergency card with no field the student can already change is a refusal. Hidden keys are not filed.

Flag: minor/eligible-student self-image; student-originated image of a linked parent; student-originated homework submission photos; age and capacity questions counsel must answer (this seat does not); school policy on student device camera use inside the product.

### S8 — Cross-person avatar leave (replace via same camera)

Counsel must see the leave after a student files a linked parent's face, or a parent files a linked child's face: same camera; confirm again on that same linked person replaces the avatar; wrong face does not attach; cancel-before-confirm is not that leave; those seats cannot open the other person's photo sheet.

Flag: whether replace-via-recapture is an adequate correction path for cross-person images; retention of superseded avatar assets; who may see historical face assets. This seat does not invent a sheet or a legal standard.

### S9 — IEP / 504 and disability-related text on cards

The lock keeps IEP and 504 as notes only — not extracted fields — on every seat that can photograph a card.

Flag: whether “note-only” storage of disability-related text remains high-sensitivity when the photographer may be office, parent, or (if any field remains) student; who may read those notes; whether OCR/AI classification may transiently process that text before the note lands. Counsel must not be asked to rubber-stamp extraction. Extraction stays out.

### S10 — AI classify on every capture path

Ask may classify the still, then the confirm strip limited to that seat's list. Office seats share the same jobs, including logo and confirmed create.

Flag: vendor subprocessors on photos of people, cards, rosters, homework, and logos from office, parent, and student seats; training/retention; no school-official claim without a signed DPA. Soft FERPA posture in existing company notes is background only — not clearance.

### S11 — Audit row for photo writes (all seats that confirm)

Lock: activity log append-only; which row a photo writes is part of this read; lock does not name the row.

Flag: whether photo attach, card-field writes, roster/class/person confirmed create (office), logo replace, parent/student avatar writes, homework submission, and Ask-bound homework photos must appear on a school-visible activity path; what metadata is logged (who, when, person id, field names, seat, job type) vs what must never be logged (full card image, full note body, IEP/504 prose, full homework image if counsel so requires); whether parent- and student-originated writes need the same or different audit shape.

### S12 — Product walls counsel should know (not legal conclusions)

Lock product law under Stamp 6 (facts, not legal conclusions):
- No seat is dark; one shutter per active seat; no tray tab added or removed.
- Shared office list including school logo and confirmed create of class, roster, or new person; confirm not silent insert.
- Office may not send classwork for grading or set/override a grade; a photo does not set a grade; only the teacher sets a classwork grade.
- Teacher/parent/student refuse photo-create of class, roster, or new person.
- Parent: not another family; twins one at a time; Ask co-educator work is not an official gradebook grade; parent card not completed.
- Student: not another student; turn-in is not a grade; hidden contact keys not filed; student-card leave stands.
- Cross-person avatar leave is same-camera replace; cancel-before-confirm is not that leave.
- IEP/504 not extracted; handbook/policy/minutes refused; no records cabinet.
- Photograph is not Approve; this icon does not use `capture.approve`.

Counsel should know these are intended hard product walls. If any wall is legally insufficient or must be stronger (e.g. mandatory human review beyond confirm, ban on card or homework OCR for parent/student, age gate on student capture, ban on office photo-create of persons, or administrator logo write blocked until data-model alignment), counsel says so before build. This seat does not rewrite the lock.

---

## What this seat does not clear

- Legal flag: still open. **Build flag: NOT CLEARED.**
- Security read: still needed (not this card; this seat does not staff it).
- FERPA “school official” status: not claimed.
- DPA / pilot addendum language: not drafted here.
- Build, implement, matrix edit, roles.ts edit, Drive invention: none granted by this file.
- CEO look pass and Stamp 6 APPROVED are not legal clearance.
- Earlier legal notes are not clearance and not the current seat list.

## Out of scope for this card

- No browse. No new research question.
- No edit of app code, PM lock, stamp, docs/ui-design.md, or feature map.
- No implement. No staff. Do not complete t_3bd86748.
- Do not clear the build flag.

## Stop

File only. Build flag NOT CLEARED. CoS does not treat this note as clearance to build.
