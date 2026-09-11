# DITL-O-01 — Office People/Manage (partial day)

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-01 |
| Title | Administrator/office supported surfaces only |
| Primary hat | administrator (superintendent notes called out) |
| Other hats | optional also_teacher / parent_id → see DH-* not duplicated |
| Support | PARTIAL — people/activity/manage/identity; attendance NOT |
| Regression tags | `office`, `people`, `manage`, `auth`, `school-identity`, `ride-duty`, `ask-dual` |

## Goal / story

Office user runs a **supported** slice of a school day in Kelyra: sign in, scan Feed/Classes, manage people links within role rules, school manage settings they can touch, staff Ride duty wall if on duty, Ask for ops question. Explicitly does **not** attempt attendance, behavior, SIS, or district multi-school reports.

## Preconditions / fixtures

- Administrator login (separate pass: superintendent for logo/name/archive-only beats).
- Classes exist; parents/students to link per permissions.
- Super-only: school logo/name; Ride day photo archive if shipped.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in office | `/sign-in` |
| 2 | Feed tab glance | `/?tab=feed` |
| 3 | Classes tab / admin class | `/?tab=classes`, `/admin/class…` |
| 4 | People: view directory; link parent↔student if administrator allowed | `/?tab=people`, `/admin/people` |
| 5 | **Reverse:** unlink parent-student without deleting persons | people UI |
| 6 | Manage: school settings available to role | `/?tab=manage` |
| 7 | Super-only: set school name/logo if superintendent | manage / identity |
| 8 | Staff Ride duty under Manage (order/curb as shipped) | `/admin/ride`, `/ride` |
| 9 | Activity / audit skim if exposed | `/activity` |
| 10 | Matrix if present (admin) | `/admin/matrix` |
| 11 | Ask | `/ask` |
| 12 | Confirm **no** attendance UI; **no** syllabus.manage as office | negative checks |
| 13 | Sign out | hamburger |

## Lifecycle

Sign-in → office loop → sign-out. Duty enter/exit if applicable without parent leave controls.

## Multiplicity

Many people/classes; role edit walls (admin cannot edit other admins/super per data-model).

## Reverse / cancel

Unlink; abandon manage edit; leave duty view.

## Dual-hat

Defer full switch to DH-02.

## Functions exercised

Office chrome; people link; manage; duty Ride; activity; auth walls.

## Explicit non-goals

Attendance, behavior, SIS, CSV district reports, multi-school, becoming grade-of-record, office AVG policy editor.

## Superintendent

No separate DITL plan. Super may run O-01 plus identity + Ride archive beats. Multi-school oversight **NOT IN PRODUCT**.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Feed/Classes glance | office tray tabs | `list_feed` / `list_classes` |
| People link/unlink | people admin | `link_parent_student` / `unlink_parent_student` |
| Manage settings | `/?tab=manage` | limited; identity super-only via `set_school_name`/`set_school_logo` |
| Staff Ride duty | Manage altitude | open_screen; no restrict tool (see O-04) |
| Activity/audit | `/activity` | `search_audit` |
| Matrix | `/admin/matrix` | `set_capability_grant` super |
| Ask ops | `/ask` | office tools; no syllabus.manage |

Deep people/class/ban/feed days: **O-02..O-06**.

## Suggested QE themes

Role edit matrix; no attendance; Manage owns duty Ride; super-only archive; Ask dual on link.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Light — identity/settings only if changed.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| School name/logo if super changed | restore fixture logo/name | identity tools if any else UI | school identity baseline |
| People link if touched | unlink | unlink tool | parent_students |
| Ride duty | end | — | — |
| Attendance attempts | N/A NOT IN PRODUCT | — | **no** invented attendance tables |

**Order:** restore identity → unlink test → sign out.
