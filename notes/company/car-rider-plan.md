# RIDE-P1: Car-rider feature set, UI/UX, AI, implementation tasks

**Date:** 2026-09-05  
**Author:** chief-of-staff (CEO vision lock)  
**Status:** Spec only — no app code, no SQL, no kelyra-qa-loop.  
**Depends on:** `notes/company/car-rider-research.md`  
**Do not staff Engineering until Chuck sends GATE.**

---

## 0. Product law

| Surface | Job | What it is not |
|---|---|---|
| **Vehicles** | Plate/make/model on parent; grandma/nanny cars; today / range / indefinite; add/remove | Hang-tag; student metadata; parent picking “which car I’m in” at shutter |
| **Lines** | Two (or more) physical lines, typically grade bands | One global school queue |
| **Check-in** | Children this stop + photo of car ahead **or** I’m first | GPS; placard |
| **Plate entry** | LPR, else type or STT (parent + staff) | Client vision keys |
| **Staff** | Walk 1…n; conflict flag; tap-fix order; **checkout** after pickup | Keypad product |
| **Parent copy** | Success: you are **XX** in line (no total). Fail: **Check in failed** (no reason) | Neighbor plates; “of 40” |
| **Retention** | Photos + events **7 days**; superintendent may archive **that day’s photos** forever-until-delete | Subpoena desk; public URL |

---

## 1. Hats

**Parent:** vehicle list (own + authorized cars) with validity; at a **line**: child chips; shutter or I’m first; type/speak plate if needed; own status + own XX. Then after checkout, may join the other line with other children.

**Curb:** per-line camera walk; list with duplicate-first conflict; tap reorder; attach (type/STT); nudge; **checkout** when child is in the car.

**Stage:** pre-call children for **this line** only.

**Superintendent:** archive day’s photos; restrictions; lines config; duty. Administrators: restrictions/duty/attach — **archive is superintendent**.

**Student:** no UI.

---

## 2. Non-goals

Placard/keypad as check-in; poles/RFID; GPS order; auto-checkout on plate read; LPR inserts people; parent sees school line or total count; anon URL; token `/parent`; `is_staff` widen; twin mash-up; class create; face match; Ask dump; subpoena workflow.

---

## 3. Mechanic

- Graph per **line**. Behind-photo places photographer behind that plate **in this line**.
- I’m first / empty-lane. Two firsts → staff banner + tap correction (append events, don’t rewrite).
- Parent does not declare own vehicle at check-in.
- Staff checkout = `released` for **this line** + those children. Parent is off that line and may check into another.
- Staggered: line A child 1, checkout, line B child 2 — two trips, not one household blob.

---

## 4. Visibility

| Viewer | Sees |
|---|---|
| Parent | Own vehicles; own trip; own **XX**; own children. No neighbor plates, no total |
| Curb | That line’s live order, plates, flags, conflicts |
| Stage | This line’s children to pre-call |
| Superintendent | Archive; campus tools |
| Restricted parent | Check in failed only |
| Others | Nothing |

---

## 5. AI

LPR server-side. STT fills plate field (OS or existing server STT — not grok-tts). No Ask tool.

---

## 6. Phases (no code)

P0 data: vehicles+validity, lines, photos, events, restrictions, duty, 7-day job, archive flag.  
P1 Edge LPR + STT field.  
P2 parent vehicles + check-in + I’m first + copy.  
P3 staff walk, conflict, checkout, two lines.  
P4 office restrictions + superintendent archive.

**kelyra-qa-loop only after GATE send.**
