# DITL-S-01 — Student assignments submit

| Field | Value |
|-------|-------|
| Plan ID | DITL-S-01 |
| Title | Student: see to-do, open practice/lesson, submit, multi-class |
| Primary hat | student |
| Other hats | none (students cannot wear staff/parent hats) |
| Support | SUPPORTED M8 student to-do / submit |
| Regression tags | `auth`, `todo`, `submit`, `assignments`, `chrome-student`, `lessons`, `ask-dual` |

## Goal / story

A student signs in, uses the 6-tab student tray, opens Assignments, completes an assigned practice (and optional lesson pack), submits, checks Done, and if enrolled in two classes confirms work does not mash.

## Preconditions / fixtures

- Student login enrolled in ≥1 class (prefer 2).
- ≥1 assigned practice set awaiting submit; optional lesson assignment.
- No teacher chrome on this login.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in student | `/sign-in` |
| 2 | Confirm tray 6: Assignments · Feeds · Classes · Grades · People · Ask | student tray |
| 3 | Assignments Home To Do | `/todo` |
| 4 | Open assigned set; answer items | `/todo` or assignment route |
| 5 | Submit; confirm leaves To Do → Done path | `/todo` Done tab |
| 6 | **Reverse:** abandon in-progress without submit if allowed | assignment |
| 7 | Classes tab: open class landing / assignments | `/student/class` |
| 8 | Optional lesson Open → metrics as evidence not grade until teacher Approve | lesson routes |
| 9 | Feeds glance (class + school feed) | `/student/feed` |
| 10 | People directory read-only | `/student/people` |
| 11 | Second class: switch context; no cross-class submission | `/student/class` |
| 12 | Sign out (ends session; does not unenroll) | hamburger |

## Lifecycle

Sign-in → work → submit → sign-out.

## Multiplicity

Multiple assignments; two classes isolation.

## Reverse / cancel

Leave assignment mid-way; do not submit blank if product blocks.

## Dual-hat

N/A for student role.

## Functions exercised

Student auth; tray; to-do/submit; class landing; feeds; people read.

## Explicit non-goals

Capture camera; grade Approve; Ride tab; parent seat; editing roster.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| To Do list | `/todo` | `list_my_practice` |
| Open/submit practice | assignment UI submit | Ask `open_screen` to practice; **UI-primary submit**; Ask refuses graded solve |
| Classes landing | `/student/class` | `open_screen` / list classes if allowed |
| Feeds glance | `/student/feed` | `list_feed` |
| People read-only | `/student/people` | `list_people` read walls |
| Multi-class isolation | class switch | Ask ground per class |

## Suggested QE themes

Own work only; Done state; multi-class; sign-out ≠ leave class; Ask not solver.

## Artifacts + DB assert (refine-2)

Consumer of teacher-authored work: open assignments created under T-04 / F-ASSIGN (diverse subjects). After submit: `submissions.status` progressed/completed for **own** student_id only; no cross-class mash. Does not re-ingest photos.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — submission status on assigned work.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| `submissions` progress/completed | Teacher/seed reset or delete test submission if RPC exists | Student Ask must not wipe gradebook | `submissions.status` for S1 on ditl assignments → `assigned` or row removed |
| In-progress abandon | leave without submit | — | no half-grade |

**Isolation:** only this student submission; do not delete teacher assignment column unless run created it.
**Order:** reset submission → sign out.
