# DITL-DH-02 — Dual-hat Office+Parent

| Field | Value |
|-------|-------|
| Plan ID | DITL-DH-02 |
| Title | Dual-hat: office People/Manage then Parent seat Ride |
| Primary hat | administrator (or superintendent with also_ flags) |
| Other hats | parent seat |
| Support | SUPPORTED office chrome + parent hat; duty Ride under Manage not tray |
| Regression tags | `dual-hat`, `seat-switch`, `office`, `ride`, `people`, `chrome-office`, `chrome-parent`, `ask-dual` |

## Goal / story

Office staff who is also a parent: morning on office seat (Feed/Classes/People/Manage/Ask), links or views people as allowed, opens staff Ride duty via **Manage** altitude (no office Ride tray tab). Later switches to Parent seat for own children’s Ride check-in, then returns to Office.

## Preconditions / fixtures

- `role=administrator` (or superintendent) with `parent_id`.
- Optional `also_teacher` off unless testing Teach row.
- School people directory; Ride admin routes exist (`/admin/ride` or `/ride` → Manage active).
- Parent vehicles for own children.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in office seat | `/sign-in` |
| 2 | Tray: Feed · Classes · People · Manage · Ask (no Ride tab) | office tray |
| 3 | People: directory / admin people | `/?tab=people`, `/admin/people` |
| 4 | Manage pane; open staff Ride/duty wall | `/?tab=manage`, `/admin/ride`, `/ride` |
| 5 | Confirm Manage tab active for duty routes | tray |
| 6 | **Do not** expect parent leave control on duty wall | duty UI |
| 7 | Drawer **Parent** seat switch | hamburger |
| 8 | Parent tray Home·Ride·Ask only | parent tray |
| 9 | Own child Ride check-in + leave | `/parent/ride` |
| 10 | Parent Home children isolation | `/parent` |
| 11 | Switch **Office** back; tray office 5 | seat switch |
| 12 | If `also_teacher`: optional Teach switch smoke (not full T-01) | drawer |
| 13 | Sign out | hamburger |

## Lifecycle

Office → Parent (Ride in+leave) → Office → sign-out.

## Multiplicity

School people vs own children; staff lines vs parent trip children.

## Reverse / cancel

Seat switch reverse; leave parent line; abandon duty without release if testing read-only.

## Dual-hat

Office+Parent primary; optional Teach row.

## Functions exercised

Office tray; Manage-altitude Ride; people; parent seat Ride; atomic seat switch.

## Explicit non-goals

Attendance SIS; multi-school super dashboard; parent mint released; office syllabus edit.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| People directory | `/?tab=people` | `list_people` office seat |
| Manage duty Ride | Manage / `/admin/ride` | `open_screen`; no parent leave on duty |
| Parent seat Ride | drawer Parent → `/parent/ride` | PHYSICAL check-in after seat UI switch |
| Ask office vs parent | `/ask` each seat | office people tools vs parent `my_children_progress` only |

## Suggested QE themes

No office Ride tab; duty≠parent leave; seat rebuild; Ask tool set follows seat.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Maybe light people link; parent Ride.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Any people link made in run | unlink | `unlink_parent_student` | parent_students only run links |
| Parent Ride | leave | GAP | no live trip |
| Office duty session | end duty | — | no sticky duty |

**Order:** unlink test links → leave Ride → office seat → sign out. Do not delete F-DH-OP persons.
