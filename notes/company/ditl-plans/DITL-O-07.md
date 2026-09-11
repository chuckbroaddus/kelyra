# DITL-O-07 — Office bio attach for existing student (card fields)

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-07 |
| Title | Office/Super: attach contact/bio fields to existing student (card data); no invent roster |
| Primary hat | administrator **and** superintendent (run both) |
| Support | SUPPORTED Details + `update_student`; photo extract **PARTIAL/GAP** (no office Capture tray) |
| Regression tags | `office`, `bio`, `student-card`, `people`, `ask-dual`, `ferpa`, `teardown` |
| CEO story | Associate student data-card fields to existing DB record (office hat) |

## Goal / story

Office attaches the **same contact/bio field set** as the handwritten student data card onto an **already-existing** student (F-STUDENTS S1). Photo OCR/extract lives on teacher Capture (`DITL-T-05`). Office path: open existing person → edit canonical metadata (UI + Ask) → DB assert → revert. Do not invent Document AI for office chrome.

## Preconditions / fixtures

- F-OFFICE both hats; existing S1 with known baseline `students.metadata`
- Card field values from `F-ART-CARD-STUDENT-HW` transcribed for QE (same expected DB values as T-05)
- Prefer run **after or independent of** T-05 with fresh baseline snapshot

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office/super | SUPPORTED | `/sign-in` office tray | — |
| 2 | Open existing student (search/directory) | SUPPORTED | People / student person | `search_students` / `list_people` |
| 3 | Edit bio fields from card values | SUPPORTED | Details / profile | `update_student` |
| 4 | **DB assert** each canonical key | SUPPORTED | read-back Details | Ask get student if available |
| 5 | Photo-from-card extract on office seat | **PARTIAL/GAP** | no Capture tray on office | no office scan-card tool — do not invent |
| 6 | Reverse: revert metadata to baseline | SUPPORTED | Details | `update_student` |
| 7 | FERPA: no IEP/504 columns | SUPPORTED | Details keys only | same |
| 8 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / dual-hat / non-goals

- Lifecycle: find existing student → write fields → assert → revert → sign-out
- Multiplicity: twins — pick correct S1 only
- Dual-hat: not required (DH-02 separate)
- Non-goals: invent student; office camera student_card pipeline; IEP/504; teacher Capture (T-05)

## Artifacts + DB assert

Same targets as T-05: `preferred_name`, `birthday`, `phone`, `email`, `address`, `emergency_*`, optional `grade_or_age`, unrecognized → `notes`. Assert exact values; parent must not see teacher-only keys.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — metadata only on existing student.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| `students.metadata` / aliases | revert baseline | `update_student` | baseline match; student row remains |

**Order:** revert → sign out. Never delete S1.
**Isolation:** fixture person only.

## Suggested QE themes

Office vs super parity on update_student; GAP honest on office photo extract; teardown baseline; pairs with T-05.
