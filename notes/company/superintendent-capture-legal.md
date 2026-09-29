# Superintendent Capture icon — legal read

**Date:** 2026-09-28
**Author:** legal-compliance (Kelyra)
**Card:** t_5f4f8015
**Parent tracker:** t_3bd86748 (do not complete that card)
**Sources read (filed only; no browse):**
- notes/company/superintendent-capture-pm.md
- notes/company/superintendent-capture-stamp.md (Stamp 2 APPROVED; legal flag not cleared)

**Status:** Counsel flag only. Not clearance to build. Not a legal opinion. Not a DPA. Not a FERPA “school official” claim.

**Superseded the same day.** CEO 2026-09-28: all accounts support capture (superintendent, administrator, teacher, parent, and student). This note read the earlier lock that kept administrator, parent, and student dark. Do not use that seat list.

**Build flag:** NOT CLEARED.

---

## Posture

This seat reads the filed PM lock and Stamp 2. It does not browse. It does not invent statute text. It does not staff counsel, security, engineering, or CoS. Stamp 2 APPROVED is product/QA lock only. It does not clear legal or security.

Do not treat this file as permission to implement, start a build loop, edit the matrix, or ship the icon.

---

## What the lock would touch (facts from the lock)

From the PM lock (Choice A). Not a restatement of product preference.

1. **Seat and door.** Superintendent office seat only. Header Capture icon, accessibility label Open Capture, route `/capture`. Administrator stays dark. Parent and student stay dark. No tray tab added or removed. Photograph is not Approve and is not a grade. A photo never creates a person, a login, or a class.

2. **Closed list in.** Existing student portrait; existing parent portrait; parent contact card; student emergency or contact card; staff photo of an existing staff person (write path: existing `teacher` photo); photographed class list for one existing class; school logo.

3. **Closed list out.** Handbook, policy, minutes, any school paper that is not the logo; data sheet that is not a student or parent card; IEP or 504 extraction into fields (stay note-only); creating a person or class; homework / Approve / grade path; batch, library, files, mic on this seat.

4. **Confirm gate.** Nothing files until the superintendent confirms. Unmatched name: stop. Same-name: pick existing person with kind labeled student, parent, or staff. Card fields: each checked before write. Unrecognized lines become notes. IEP and 504 stay a note, not an extracted field.

5. **Audit fact named, not decided.** If a photo write is logged, activity log stays append-only (`audit.mutate` is none). Which row a superintendent photo writes is named in the lock as part of the legal/security read. The lock does not name the row.

6. **Stamp 2.** QA Supervisor APPROVED after parent-tray fix. Legal and security stay flagged, not cleared, not browsed. Chuck mock-up still required before build. Drive line still missing from the feature map.

---

## What human counsel must see before build

Human counsel must review the filed lock before any build that turns this icon on. This seat flags topics. It does not decide them.

### C1 — Student and parent images as education-record / PII surfaces
Counsel must see that the superintendent office seat would capture and attach:
- faces of existing students and parents;
- student emergency/contact cards and parent contact cards (names, phones, addresses, and similar contact lines the existing checklist already knows);
- class-list photos that name students for one existing class.

Flag: whether those writes are education records (or equivalent under school contract), who may view them after confirm, retention, and parent/eligible-student access or correction paths. Do not invent a “directory information” or “school official” answer here.

### C2 — Staff photographs and employment/privacy boundary
Counsel must see staff face capture on an existing staff person, written through the existing `teacher` photo path, with no new staff page and no new login.

Flag: employee/contractor image consent, HR retention, and whether office-seat capture of staff differs from teacher self-service photo change. Not a product decision.

### C3 — IEP / 504 and disability-related text on cards
The lock keeps IEP and 504 as notes only — not extracted fields. Teacher student-card already refuses that extraction (lock fact, not opinion).

Flag: whether “note-only” storage of disability-related text on a photographed card is still a high-sensitivity record; who may read those notes; whether OCR/AI classification of the card may transiently process that text before the note lands. Counsel must not be asked to rubber-stamp extraction. Extraction stays out.

### C4 — School logo vs other school papers
Logo is in. Handbook, policy, minutes, and any non-logo school record are out of this cut. The lock says how a school record would be stored is a legal read, not a designer guess — and this cut refuses storage of unbound school-record text.

Flag: confirm that refusing non-logo records is the right first-cut boundary for this product path, and that logo-only does not silently authorize a records cabinet later without a new lock + counsel pass.

### C5 — AI classify on the capture path
Ask AI may classify the still (as for the teacher), then the confirm strip. Jobs on the strip are only the closed list.

Flag: vendor subprocessors on office-seat photos of people and contact cards; training/retention; no school-official claim without a signed DPA. Soft FERPA posture in existing company notes is background only — not clearance.

### C6 — Audit row for superintendent photo writes
Lock: activity log append-only; which row a superintendent photo writes is part of this read; lock does not name the row.

Flag: whether photo attach, card-field writes, roster enroll confirm, and logo replace must appear on a school-visible activity path; what metadata is logged (who, when, person id, field names) vs what must never be logged (full card image, full note body, IEP/504 prose).

### C7 — Consent, notice, and school policy alignment
Counsel must see the operator model: school staff (superintendent seat) photographing existing community members and contact papers inside the app.

Flag: school handbook / photo-release / acceptable-use alignment; whether pilot schools need a signed addendum before this seat is enabled; dual-hat users (office+teacher, office+parent) and seat gating as a privacy control, not a legal shield by itself.

### C8 — Create-never and Approve-never as product law that counsel should know
Lock product law (not legal conclusions): photo never creates a person/login/class; confirm is not Approve; unmatched stops; IEP/504 not extracted; non-logo school papers refused.

Counsel should know these are intended hard product walls. If any wall is legally insufficient or must be stronger (e.g. mandatory human review beyond confirm, or ban on card OCR entirely), counsel says so before build. This seat does not rewrite the lock.

---

## What this seat does not clear

- Legal flag on the PM lock: still open.
- Security read: still needed (not this card; this seat does not staff it).
- FERPA “school official” status: not claimed.
- DPA / pilot addendum language: not drafted here.
- Build, implement, matrix edit, roles.ts edit, Drive invention, Chuck mock-up: none of these are granted by this file.
- Stamp 2 APPROVED remains product/QA only.

## Out of scope for this card

- No browse. No new research question.
- No app code. No PM lock edit. No stamp edit. No docs/ui-design.md edit.
- No staffing of counsel, security, engineering, designer, or QA.
- No clearance sentence. If someone needs a yes/no ship call, that is human counsel + Chuck, not this profile.

## Recommended next action (for CoS, not this seat)

Hold build. Keep the legal flag. When Chuck wants counsel, hand counsel the PM lock, Stamp 2, and this note. Do not treat filing this note as done-for-build.

---

## Stop

Do not complete t_3bd86748. Do not implement. Do not staff anyone. Do not clear the build flag. CoS does not treat this note as clearance to build.
