# Capture on all accounts — legal read (revision)

**Date:** 2026-09-28
**Author:** legal-compliance (Kelyra)
**Card:** t_98a14208
**Parent tracker:** t_3bd86748 (do not complete that card)
**Sources read (filed only; no browse):**
- notes/company/superintendent-capture-pm.md (revision t_f5021e92)
- notes/company/superintendent-capture-legal.md (old seat list; superseded; not deleted; not copied forward)

**Status:** Counsel flag only. Not clearance to build. Not a legal opinion. Not a DPA. Not a FERPA “school official” claim.

**Build flag:** NOT CLEARED.

---

## Posture

This seat reads the revised PM lock (t_f5021e92) only. It does not browse. It does not invent statute text. It does not staff counsel, security, engineering, or CoS.

The earlier note notes/company/superintendent-capture-legal.md read the old lock (administrator, parent, and student dark). That seat list is superseded the same day. Do not treat that note as the current read. Do not delete it. Do not copy its dark-seat facts forward.

Stamp 2 APPROVED is product/QA lock on the earlier superintendent-only cut. The revision stamp says Stamp 2 is not the build lock for this revision. Neither stamp clears legal or security.

Do not treat this file as permission to implement, start a build loop, edit the matrix, or ship Capture on any seat.

---

## What the revision lock would touch (facts from the lock)

From the PM revision lock. Not a restatement of product preference. Not a legal conclusion.

1. **Every account has a header shutter.** Superintendent, administrator, teacher, parent, and student. Accessibility label Open Capture. Route `/capture`. The tap does not file. No tray tab added or removed on parent or student. One seat, one shutter. Switching seats unmounts the prior shutter before the next paints.

2. **Photograph is not Approve.** Confirm on this sheet is not Approve and not a grade. A photo never creates a person, a login, or a class. Unmatched name: stop. The matcher never inserts a student. Nothing is a grade until a teacher Approves.

3. **Superintendent office seat (Choice A stands).** Papers shutter including school logo. Closed list in: existing student portrait; existing parent portrait; parent contact card; student emergency or contact card; staff photo of an existing staff person (write path: existing `teacher` photo); photographed class list for one existing class; school logo. Hides on Messages, open Search, and My children.

4. **Administrator office seat (no longer dark).** Same papers shutter as superintendent except the school logo. Logo is a refusal. CEO did not give administrator `set_school_logo`. Same people and cards: existing student, parent, staff, student/parent cards, one class list. Hides on Messages, open Search, and My children.

5. **Teacher seat.** Keeps today's homework Capture only. Not the papers shutter. Not the school logo. Not both icons.

6. **Parent seat (no longer dark).** Own portrait; portrait of a child already linked; own contact card; that child's contact or emergency card. Out: another family; same-name person not linked; staff photo; class list / school roster; school logo; homework; Approve; grade; create person/login/class. Hides on Messages and open Search. Not a tray tab.

7. **Student seat (no longer dark).** Own portrait; own contact or emergency card. Out: another student; classmate; staff photo; parent record; class list / school roster; school logo; homework; Turn in; Approve; grade; create person/login/class. Hides on Messages and open Search. Not a tray tab. This icon is not Turn in.

8. **IEP and 504.** Stay note-only on card paths. Not extracted fields. Teacher student-card already refuses that extraction (lock fact). Unrecognized lines become notes. Unbound school-record text is not stored in this cut.

9. **AI classify.** Ask AI may classify the still (as for the teacher), then the confirm strip. Jobs on the strip are only that seat's closed list. A job from another seat is not offered.

10. **Same-name / pick scope.** Office: existing people at this school, rows labeled student, parent, or staff. Parent: this parent and linked children only. Student: themselves only. No new picker screen. Parent and student do not get school-wide roster pick.

11. **Audit fact named, not decided.** If a photo write is logged, activity log stays append-only (`audit.mutate` is none). Which row a photo writes is part of the legal/security read. The lock does not name the row.

12. **Surface.** Phone and web, all five seats. Papers seats: one still from the device camera. Library, files, mic, web drag-and-drop, class-stack upload stay off papers seats.

13. **Build still waits.** Chuck mock-up still required. QA Supervisor must stamp this revision. Legal note is not clearance. Do not complete t_3bd86748.
---

## What human counsel must see before build

Human counsel must review the revised PM lock before any build that turns Capture on for these seats. This seat flags topics. It does not decide them. The earlier legal note's C1–C8 still matter for the superintendent path; this revision adds and reframes what counsel must see now that administrator, parent, and student also capture.

### R1 — Expanded operator set (no dark seats)

Counsel must see that Capture is no longer superintendent-only. Five seats can open `/capture` from the header. Administrator photographs people and cards. Parent photographs their own record and a linked child. Student photographs their own record.

Flag: whether enabling parent and student self-capture, and administrator office capture of the school community, changes notice, consent, handbook, photo-release, and pilot-addendum expectations versus a staff-only office shutter. Do not invent a school-official or directory-information answer here.

### R2 — Administrator captures people and cards (new vs old legal note)

Counsel must see the administrator office seat closed list: existing student, parent, and staff portraits; student and parent cards; one class list for an existing class. School logo refused. Same create-never and Approve-never walls as superintendent.

Flag: whether administrator photo attach and card-field writes are the same education-record / employment-privacy surface as superintendent, or need a tighter school-role boundary; who may view administrator-confirmed writes; whether pilot schools need role-specific policy language before this seat is enabled.

### R3 — Parent captures own record and linked child (new)

Counsel must see parent-seat capture: own face; linked child's face; own contact card; linked child's contact or emergency card. Product walls: another family is a refusal; same-name person outside the linked set stops; no staff photo; no roster; no logo; no tray tab; confirm is not Approve.

Flag: parent access to and correction of a linked child's image and contact lines already in the app; whether parent-originated OCR/AI classify of a child's emergency card needs different subprocessors, retention, or notice than staff-originated capture; whether dual-hat office+parent seat gating is only a product control (lock fact) and what counsel still needs for family PII.

### R4 — Student captures own record only (new)

Counsel must see student-seat capture: own face; own contact or emergency card. Product walls: another student, classmate, staff, parent record, roster, logo, homework, Turn in, Approve, and grade are refusals. This icon is not Turn in.

Flag: minor/eligible-student self-image and self-contact writes; age and capacity questions counsel must answer (this seat does not); whether student-originated card photos that may contain guardian phones or addresses need extra guardrails beyond the closed list; school policy on student device camera use inside the product.

### R5 — Student and parent images and cards as education-record / PII surfaces (widened)

Counsel must see that faces, contact cards, emergency cards, and (office only) class-list photos land through Capture on more seats than the old legal note assumed.

Flag: whether those writes are education records (or equivalent under school contract); who may view them after confirm by seat; retention; parent/eligible-student access or correction paths. Do not invent a “directory information” or “school official” answer here.

### R6 — Staff photographs and employment/privacy boundary (office seats)

Counsel must see staff face capture on superintendent and administrator office seats, written through the existing `teacher` photo path, with no new staff page and no new login. Parent and student: staff photo is a refusal.

Flag: employee/contractor image consent, HR retention, and whether office-seat capture of staff differs from teacher self-service photo change. Not a product decision.

### R7 — IEP / 504 and disability-related text on cards (all card paths)

The lock keeps IEP and 504 as notes only — not extracted fields — on every seat that can photograph a card. Teacher student-card already refuses that extraction (lock fact, not opinion).

Flag: whether “note-only” storage of disability-related text on a photographed card is still a high-sensitivity record when the photographer may be parent or student as well as office staff; who may read those notes; whether OCR/AI classification may transiently process that text before the note lands. Counsel must not be asked to rubber-stamp extraction. Extraction stays out.

### R8 — School logo vs other school papers

Logo remains superintendent office seat only. Administrator, teacher, parent, and student: logo photo is a refusal. Handbook, policy, minutes, and any non-logo school record stay out of this cut. Unbound school-record text is not stored.

Flag: confirm that refusing non-logo records and keeping logo superintendent-only is the right first-cut boundary, and that this cut does not silently authorize a records cabinet or administrator logo write without a new lock + counsel pass.

### R9 — AI classify on every capture path

Ask AI may classify the still (as for the teacher), then the confirm strip limited to that seat's closed list.

Flag: vendor subprocessors on photos of people and contact cards from office, parent, and student seats; training/retention; no school-official claim without a signed DPA. Soft FERPA posture in existing company notes is background only — not clearance.

### R10 — Audit row for photo writes (all seats that confirm)

Lock: activity log append-only; which row a photo writes is part of this read; lock does not name the row.

Flag: whether photo attach, card-field writes, roster enroll confirm (office), and logo replace (superintendent) must appear on a school-visible activity path; what metadata is logged (who, when, person id, field names, seat) vs what must never be logged (full card image, full note body, IEP/504 prose); whether parent- and student-originated writes need the same or different audit shape.

### R11 — Consent, notice, dual-hat gating, and school policy alignment

Counsel must see the operator model: school staff, parents, and students photographing people and contact papers inside the app, gated by active seat.

Flag: handbook / photo-release / acceptable-use alignment for all five seats; whether pilot schools need a signed addendum before any non-teacher seat is enabled; dual-hat users (office+teacher, office+parent, office+student) and seat gating as a privacy control, not a legal shield by itself.

### R12 — Create-never and Approve-never as product law counsel should know

Lock product law (not legal conclusions): photo never creates a person/login/class; confirm is not Approve; unmatched stops; IEP/504 not extracted; non-logo school papers refused; parent cannot land on another family; student cannot land on another student or staff; administrator cannot set school logo.

Counsel should know these are intended hard product walls across all seats. If any wall is legally insufficient or must be stronger (e.g. mandatory human review beyond confirm, ban on card OCR for parent/student, or age gate on student capture), counsel says so before build. This seat does not rewrite the lock.

---

## What this seat does not clear

- Legal flag on the PM revision lock: still open. **Build flag: NOT CLEARED.**
- Security read: still needed (not this card; this seat does not staff it).
- FERPA “school official” status: not claimed.
- DPA / pilot addendum language: not drafted here.
- Build, implement, matrix edit, roles.ts edit, Drive invention, Chuck mock-up, QA Supervisor stamp of this revision: none of these are granted by this file.
- Stamp 2 APPROVED remains product/QA on the earlier cut only. It is not the build lock for this revision.
- The earlier legal note is not clearance and not the current seat list.

## Out of scope for this card

- No browse. No new research question.
- No app code. No PM lock edit. No stamp edit. No docs/ui-design.md edit.
- No delete or rewrite of notes/company/superintendent-capture-legal.md.
- No staffing of counsel, security, engineering, designer, or QA.
- No clearance sentence. If someone needs a yes/no ship call, that is human counsel + Chuck, not this profile.

## Recommended next action (for CoS, not this seat)

Hold build. Keep the legal flag. When Chuck wants counsel, hand counsel the revised PM lock (t_f5021e92), this revision note, and the earlier legal note only as history of the dark-seat read. Do not treat filing this note as done-for-build. CoS does not treat this note as clearance to build.

---

## Stop

Do not complete t_3bd86748. Do not implement. Do not staff anyone. Do not clear the build flag. Do not treat parent, student, or administrator as dark. CoS does not treat this note as clearance to build.