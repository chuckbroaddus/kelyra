# DITL-P-01 — Parent AM grades + car line

| Field | Value |
|-------|-------|
| Plan ID | DITL-P-01 |
| Title | Parent morning: grades per child + Ride check-in |
| Primary hat | parent |
| Other hats | none (pure parent seat) |
| Support | SUPPORTED grades thin Home + PARTIAL Ride check-in |
| Regression tags | `auth`, `grades`, `avg`, `ride`, `multiplicity`, `chrome-parent`, `ask-dual` |

## Goal / story

Before school, a parent with two children opens Kelyra, checks each child’s published progress on Parent Home, then uses Ride to check into the car rider line for drop-off with the correct vehicle and children. Day ends (for this plan) after successful check-in status is visible and parent can leave the line or complete the drop-off wait without staff release powers.

## Preconditions / fixtures

- Parent login linked to **two** students (twins or siblings) via `parent_students`.
- Each child enrolled in at least one class with **published** family-visible grades/syllabus where AVG applies; one child with focus skill.
- At least one vehicle on parent record (valid plate / today-or-indefinite window).
- Ride lines configured for school day; parent seat chrome available.
- No staff duty session on this device.

## Beat list (ordered)

| # | Beat | Surface / chrome |
|---|------|------------------|
| 1 | Sign in as parent | `/sign-in` → lands parent seat |
| 2 | Confirm tray **Home · Ride · Ask** (3 tabs; no camera; no staff tabs) | Parent tray |
| 3 | Open **Home**; see child chips / list for both children | `/parent` |
| 4 | Select child A; review thin grades / class cards / focus (P-H2 style) | `/parent` (+ `/parent/grades` if present) |
| 5 | Switch to child B; confirm A state clears (sibling isolation) | `/parent` |
| 6 | Open upcoming/assigned work cues if shown on Home | `/parent` |
| 7 | Tray **Ride** → Ride hub | `/parent/ride` |
| 8 | Select vehicle (if multi-car fixture present; else single car) | `/parent/ride` or `/parent/vehicles` |
| 9 | Select trip children for this drop-off (not auto-mix twins) | `/parent/ride` |
| 10 | Check in (photo of car ahead **or** I’m first) for chosen line | `/parent/ride` |
| 11 | See own position XX only (no “of N”, no neighbor plates) | `/parent/ride` |
| 12 | **Reverse:** Leave this line while waiting → event `left` (parent cannot mint `released`) | `/parent/ride` |
| 13 | Optional re-check-in same line or stop | `/parent/ride` |
| 14 | Sign out | Hamburger → Sign out |

## Lifecycle

Start: sign-in → parent seat. Finish: leave line (or documented end wait) + sign-out.

## Multiplicity

Two children; sibling switch must not blend grades. Vehicle pick if multi-car (else note single-car). One device.

## Reverse / cancel / already-in-flow

Leave line while waiting (L-08). Fail closed on restricted child (no reason string). Already checked-in: no double-mint chaos — observe product behavior; do not invent.

## Dual-hat

None. Do not use My children deep-link from staff seat in this plan (see DH-*).

## Functions exercised

Auth parent; parent tray chrome; family grade Home; sibling isolation; Ride check-in/leave; vehicle+child pick; FERPA thin parent view.

## Explicit non-goals

Full parent grades book (P-G* if still open defect — call PARTIAL, do not fail plan for missing book if research/AVG notes gap). Full line management / staff curb release. Attendance. SMS. GPS/placard-only check-in. Neighbor queue visibility.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Sign-in / tray confirm | `/sign-in` → Home·Ride·Ask | — |
| Review child grades / focus | `/parent` (+ `/parent/grades`) | `/ask` `my_children_progress`; `explain_my_class_average` / `get_published_class_syllabus` if offered |
| Sibling switch isolation | child chips on Home | Ask ground must follow selected child; no mash |
| Vehicle pick | `/parent/ride` or `/parent/vehicles` | **PARTIAL/GAP** — no vehicle CRUD Ask tool |
| Ride check-in (photo / I’m first) | `/parent/ride` | **PHYSICAL-ONLY** shutter; Ask may not mint check-in |
| Leave line | Leave control → `left` | **PARTIAL/GAP** no leave tool |
| Restricted fail-closed | UI message opaque | Ask must not leak restriction reason |
| Sign out | hamburger | — |

Ask must not publish/mutate grades. Physical camera beats stay UI-primary.

## Suggested QE case themes (not cases)

Sibling clear; check-in success XX; leave→left; restricted fail; tray = 3 only after parent login; Ask dual-path grades read without grade write.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — Ride check-in / leave events (fixtures pre-exist).

| Created / touched | UI cleanup | Ask cleanup | DB leftover check (data-model only) |
|--------------------|------------|-------------|--------------------------------------|
| Ride trip / queue events for this parent run | Leave line if still waiting; end session | **PARTIAL/GAP** — no leave/check-in Ask tool | Live ride session for fixture parent only; no parent-minted `released` |
| Car-ahead photo asset if stored | Product discard if any | PHYSICAL-ONLY | Orphan `assets` only if this run wrote them |
| Session | Sign out | — | No leftover auth session on device |

**Isolation:** this parent’s trip only (`ditl-` in QE log). Do not wipe school Ride lines or other vehicles.
**Order:** leave line → sign out. Idempotent if already left.
**Do not:** delete shared F-PARENT vehicles/students unless this run created them.
