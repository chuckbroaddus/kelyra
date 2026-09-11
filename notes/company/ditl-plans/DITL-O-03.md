# DITL-O-03 — Remove + archive (history must remain)

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-03 |
| Title | Office/Super: remove from class; deactivate people; history preserved |
| Primary hat | administrator **and** superintendent |
| Support | PARTIAL — detach/delete shipped as hard-delete; soft archive GAP; attendance NOT IN PRODUCT |
| Regression tags | `office`, `roster`, `archive`, `grades-history`, `delete`, `ask-dual`, `ferpa` |
| CEO story | 2 — Remove + archive (do not lose history) |

## Goal / story

Office removes a student from a class; removes students/parents from being active; **CEO expects** archived grade and attendance records to remain. Product today is largely hard-delete on person/class work — plan records honest Support tags so QE fails GAP without inventing tables.

## Preconditions / fixtures

- F-GRADES-HIST: student with approved grades in Class A and Class B
- Student with two enrollments (remove-from-one-class path available)
- F-OFFICE both hats

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office | SUPPORTED | `/sign-in` | — |
| 2 | Baseline: note grade cells / submissions IDs for Sx in Class A+B | SUPPORTED | gradebook / student record read | Ask `list_grade_cells` if allowed else UI-only note |
| 3 | Remove student from Class A only (still in B) | SUPPORTED (hard detach) | Student Details **Remove from {class}** (ui-design destructive) | Ask: no dedicated `unenroll` tool → **PARTIAL/GAP** (`delete_student` is full person — do not use as unenroll) |
| 4 | CEO check: grades/attendance for Class A still archived | PARTIAL/GAP | Inspect remaining DB/UI history | Same. Product copy says class work **deleted** on remove — expect fail vs CEO “remain” unless product changed |
| 5 | Attendance archive remains | NOT IN PRODUCT | Negative: no attendance UI | Ask must not invent attendance |
| 6 | Deactivate student “not active” without losing history | PARTIAL/GAP | If only hard-delete person exists, document; do not soft-invent | Ask `delete_student` = hard-delete — **not** soft archive |
| 7 | Deactivate parent similarly | PARTIAL/GAP | parent delete UI | Ask `delete_parent` hard-delete |
| 8 | If hard-delete used on disposable fixture only | SUPPORTED destructive | ConfirmSheet “cannot be undone” | Ask confirm before delete tools |
| 9 | FERPA: co-parent must not see other family’s unpublished | SUPPORTED | parent Home walls | Ask parent tools walls |
| 10 | Reverse desire: restore active / undelete | PARTIAL/GAP explicit non-goal if no undelete | — | — |
| 11 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / non-goals

- Lifecycle: baseline → detach → history assert → optional delete fixture → sign-out
- Reverse: undelete/reactivate **non-goal** unless product ships it
- Multiplicity: two-class student; two parents
- Non-goals: invent archive tables; SIS; treating hard-delete success as CEO archive pass

## OPEN (plan-local)

Map to index OPEN #1–2. QE severity after stamp: missing soft-archive vs CEO = product defect disposition by PM, not silent plan skip.

## Suggested QE themes

Remove-from-class last-class refuse; history IDs; GAP tickets not false greens.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — detach/delete (destructive by design).

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Removed enrollment | already removed — **re-seed** fixture if shared env needs student | enroll again only if restoring seed | enrollment absent for removed class; other-class grades per product |
| Hard-deleted person | cannot undelete — **re-seed** F-GRADES-HIST after run | `delete_student` | person gone; history PARTIAL/GAP vs CEO archive story |
| Attendance archive beat | NOT IN PRODUCT — no rows | — | do not invent tables |

**Order:** complete destructive beats → **re-seed fixtures** for next run → sign out.
**Note:** teardown here is often **re-seed**, not undo. Isolation: only tagged victims.
