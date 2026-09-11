# DITL-O-05 — Class + teacher assignment lifecycle

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-05 |
| Title | Office/Super: create class, assign teacher, roster, change teacher, delete teacher |
| Primary hat | administrator **and** superintendent |
| Support | SUPPORTED create_class / add|remove teacher / enroll; PARTIAL whole-school teacher delete |
| Regression tags | `office`, `classes`, `teachers`, `roster`, `ask-dual`, `lifecycle` |
| CEO story | 4 — Class + teacher assignment lifecycle |

## Goal / story

Office creates a class, assigns a teacher, assigns student roster, **changes** the teacher, then **deletes** a teacher from the school (CEO). Dual path UI+Ask. Teacher deletion while class has roster must not orphan silently.

## Preconditions / fixtures

- F-TEACHER-A, F-TEACHER-B/C available
- Students to enroll; F-OFFICE

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office | SUPPORTED | `/sign-in` | — |
| 2 | Create class | SUPPORTED | Classes tab / admin create | `/ask` `create_class` (officeOnly) |
| 3 | Assign teacher A | SUPPORTED | `/admin/class/{id}` add teacher | `/ask` `add_teacher_to_class` |
| 4 | List teachers on class | SUPPORTED | admin class card | `/ask` `list_class_teachers` |
| 5 | Assign roster students | SUPPORTED | roster UI | `/ask` `enroll_student` / `add_student` |
| 6 | Change teacher: add B, remove A | SUPPORTED | admin class remove/add | Ask `add_teacher_to_class` + `remove_teacher_from_class` |
| 7 | Confirm class still has roster after teacher change | SUPPORTED | roster | `list_roster` |
| 8 | Delete teacher from school (person/login) | PARTIAL/GAP | If no school-wide teacher delete RPC, document; removing from all classes ≠ delete person | Ask: no `delete_teacher` tool — GAP |
| 9 | Multiplicity: second class independent teachers | SUPPORTED | create second class | Ask create_class |
| 10 | Reverse: re-add teacher A to a class | SUPPORTED | add teacher | Ask add_teacher |
| 11 | Optional delete empty class | SUPPORTED destructive | delete class ConfirmSheet | Ask `delete_class` with confirm |
| 12 | Super-only smoke: matrix/identity not required here | — | — | — |
| 13 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / non-goals

- Lifecycle: create → staff → roster → restaff → delete-teacher attempt → sign-out
- Reverse: re-add teacher; class delete only when intentional
- Multiplicity: two classes; roster present during teacher swap
- Non-goals: teacher self-create class; office teaching desk; multi-school

## Suggested QE themes

Office-only create_class; teacher swap with live roster; honest GAP on school teacher delete.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — classes, teacher assigns, roster.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Class created `ditl-*` | delete class (cascades class work) | delete_class tool else UI | `classes` no ditl class; class enrollments/assignments gone |
| Teacher assigned/reassigned | remove_teacher_from_class | tools if listed | class_teachers baseline |
| Whole-school teacher delete attempt | PARTIAL — re-seed F-TEACHER-C if deleted | may GAP | teachers/profiles seed restored |
| Enrollments on test class | deleted with class | — | clean |

**Order:** remove roster → remove teachers from class → delete class → re-seed any deleted shared teacher → sign out.
**Do not:** delete F-TEACHER-A home class unless run created a disposable copy.
