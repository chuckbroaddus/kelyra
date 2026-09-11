# DITL-T-05 — Handwritten student data card → existing student

| Field | Value |
|-------|-------|
| Plan ID | DITL-T-05 |
| Title | Teacher: photograph handwritten student data card; associate fields to existing student |
| Primary hat | teacher |
| Support | SUPPORTED intent `student_card` (ui-design §14.2 D); human confirm; no invent student |
| Regression tags | `capture`, `student-card`, `bio`, `metadata`, `matcher`, `ask-dual`, `ferpa`, `teardown` |
| CEO story | Handwritten student data card scan → existing record |

## Goal / story

Teacher photographs a **handwritten** student data card (name, date, address, phone, email, birthday, emergency contacts). Product classifies `student_card`, proposes canonical metadata fields + student guess. Teacher confirms **existing** `studentId` (spoken name and/or roster picker — **never invent** a roster row). Confirmed fields persist on that student; QE asserts DB accuracy; teardown reverts bio + deletes card capture.

## Preconditions / fixtures

- F-TEACHER-A; roster includes **existing** target S1 (do not create new student this plan)
- `F-ART-CARD-STUDENT-HW` handwritten card photo fixture (see index F-ARTIFACTS)
- Baseline snapshot of S1 `students.metadata` + `name_aliases` before run
- Camera permissions; active class with S1 enrolled

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in teacher | SUPPORTED | `/sign-in` tray | — |
| 2 | Capture card photo | SUPPORTED | `/capture` shutter | **PHYSICAL-ONLY** camera |
| 3 | Spoken name / picker for **existing** student | SUPPORTED | proposal sheet AvatarTray / Unknown | PHYSICAL + UI confirm; Ask does not OCR-insert |
| 4 | Intent `student_card`; review proposed `fields[]` | SUPPORTED | proposal sheet checkboxes | no Ask invent Document AI; may `open_screen` capture/inbox |
| 5 | Human confirm write metadata on existing student | SUPPORTED | primary Save on sheet | Ask `update_student` **after** fields known — dual path: UI extract+confirm **or** Ask update with same values on second pass |
| 6 | **DB assert** each canonical field | SUPPORTED | Details UI read-back | Ask read student if tool lists fields |
| 7 | Card image filed as note_only capture (no grade) | SUPPORTED | product behavior | — |
| 8 | IEP/504 lookalike control (optional) | SUPPORTED | force note-only; no IEP columns | — |
| 9 | Reverse: revert metadata to baseline; delete capture | SUPPORTED | Details clear keys; delete capture | `update_student` revert; capture delete PARTIAL/UI |
| 10 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / dual-hat / non-goals

- Lifecycle: photo → confirm existing student → confirm fields → DB assert → revert → sign-out
- Multiplicity: wrong-guess twin names — picker corrects; second student not written
- Dual-hat: none (office field path → O-07)
- Non-goals: invent student; IEP/504 extraction; SIS columns; auto-grade; parent_card path (separate); OCR-name-as-sole-matcher for homework (this plan is card fields + existing id)

## Artifacts + DB assert

| Field | Source on card | DB target after confirm |
|-------|----------------|-------------------------|
| preferred / given name | handwritten | `students.metadata.preferred_name`; upsert `name_aliases` |
| birthday | handwritten | `metadata.birthday` `YYYY-MM-DD` |
| phone / email / address | handwritten | `metadata.phone` / `email` / `address` |
| emergency name/phone | handwritten | `metadata.emergency_name` / `emergency_phone` |
| grade/age optional | handwritten | `metadata.grade_or_age` |
| unrecognized lines | — | `metadata.notes` only |
| capture | photo asset | `captures` note_only on student; **no** grade cell |

Unchecked proposed fields must **not** write. Clear = delete key (not `""`).

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — metadata + capture/asset.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| `students.metadata` keys written this run | Details revert to baseline snapshot | `update_student` baseline | metadata keys match pre-run baseline; no extra keys |
| `name_aliases` preferred upsert | remove test alias if added | same | aliases baseline |
| note_only capture + asset | delete capture | PARTIAL | no leftover capture/asset for card |

**Order:** revert metadata → delete capture/asset → sign out. Idempotent.
**Isolation:** existing S1 row stays; never delete student.

## Suggested QE themes

Existing student only; field-level DB parity; FERPA no IEP columns; teardown restores baseline; dual-path UI extract + Ask update.
