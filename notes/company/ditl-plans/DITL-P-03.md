# DITL-P-03 — Parent Ride multi-child multi-car

| Field | Value |
|-------|-------|
| Plan ID | DITL-P-03 |
| Title | Parent Ride: twins, two cars, staggered lines, leave + re-enter |
| Primary hat | parent |
| Other hats | none |
| Support | PARTIAL Ride (check-in/leave SUPPORTED; full line mgmt NOT) |
| Regression tags | `ride`, `multiplicity`, `vehicles`, `auth`, `chrome-parent`, `ask-dual` |

## Goal / story

A parent with twins and two authorized vehicles runs a realistic pickup: check into line A with child 1 + car 1, leave line A, then check into line B with child 2 + car 2 (staggered). Verifies twins never auto-mix and parent cannot mint curb `released`.

## Preconditions / fixtures

- Parent ↔ two children (twins preferred).
- Two vehicles on parent (e.g. primary + nanny/grandma car); one may be today-only window.
- Two independent Ride lines (A/B) for the school day.
- Restrictions fixture optional: one child restricted → fail closed.
- Parent seat only (not staff duty wall).

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in parent | `/sign-in` |
| 2 | Ride hub | `/parent/ride` |
| 3 | Manage vehicles: confirm both cars listed; open vehicles surface | `/parent/vehicles` |
| 4 | **Reverse vehicle:** void/remove or note today-only expiry path if UI allows | `/parent/vehicles` |
| 5 | Restore/ensure two valid cars for rest of plan | `/parent/vehicles` |
| 6 | Line A: pick car 1 + child 1 only (not both twins) | `/parent/ride` |
| 7 | Check in line A (photo ahead or I’m first) | `/parent/ride` |
| 8 | Observe own XX; no total queue | `/parent/ride` |
| 9 | Leave line A → `left` (not `released`) | `/parent/ride` |
| 10 | Line B: pick car 2 + child 2 | `/parent/ride` |
| 11 | Check in line B | `/parent/ride` |
| 12 | Optional: restricted-child attempt → “Check in failed” no reason | `/parent/ride` |
| 13 | Leave line B or end wait | `/parent/ride` |
| 14 | Confirm staff `released` not available on parent chrome | `/parent/ride` |
| 15 | Sign out | hamburger |

## Lifecycle

Enter line A → leave A → enter B → leave/end B → sign-out.

## Multiplicity

Two children, two cars, two lines; no auto-mix twins (L-08a).

## Reverse / cancel

Leave while waiting; vehicle void; abandon check-in before commit if UI has cancel.

## Dual-hat

None. Leave control only on parent-seat Ride (L-08b).

## Functions exercised

Ride check-in/leave; vehicles CRUD windows; multi line independence; child trip selection.

## Explicit non-goals

Staff duty wall / order_fix / curb release. LPR inserting people. GPS. Placard-only. Office Ride tray tab. Anon token parent.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Vehicles list/CRUD windows | `/parent/vehicles` | **PARTIAL/GAP** no vehicle tools |
| Line A/B check-in + child/car pick | `/parent/ride` | **PHYSICAL-ONLY** check-in; Ask cannot pick car/line |
| Leave A/B | Leave → `left` | **PARTIAL/GAP** |
| Restricted child attempt | fail closed UI | Ask must not explain ban reason |
| Confirm no parent `released` | chrome absence | Ask must refuse mint released |

Physical Ride stays UI-primary; Ask dual documents GAP honestly.

## Suggested QE themes

L-08/L-08a/L-08b; V multi-car; twin isolation; two-line independence; Ask GAP tags not false greens.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — multi-line Ride events.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Line A/B trips + leave | Leave any waiting line | GAP leave tool | No live waiting trip for fixture parent |
| Vehicle selection | none (fixtures stay) | GAP vehicle CRUD | Do not delete F-PARENT vehicles |

**Order:** leave any live line → sign out. Idempotent.
**Isolation:** this parent only; do not clear school lines.
