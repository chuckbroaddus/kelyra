# DITL-O-04 — Banned pickup / messy divorce

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-04 |
| Title | Office bans one parent pickup; banned tries Ride; office notified |
| Primary hat | administrator **and** superintendent |
| Other hats | banned parent + allowed co-parent (separate sessions) |
| Support | SUPPORTED restrict + fail-closed check-in; PARTIAL office notify + Ask restrict tool |
| Regression tags | `office`, `ride`, `pickup-ban`, `ferpa`, `messages`, `ask-dual`, `multiplicity` |
| CEO story | 3 — Banned pickup / messy divorce |

## Goal / story

Messy divorce: two parents on one child. Office blocks Parent-1 from pickup. Parent-1 tries car rider check-in → fail closed (“Check in failed”, no reason). Parent-2 still can pick up. Office/super gets **notification** of banned attempt (CEO). UI and Ask paths for ban set/clear and notify.

## Preconditions / fixtures

- F-PARENT-1 + F-PARENT-2 both linked to S1; vehicles each
- F-RIDE lines; empty restrictions initially
- F-OFFICE

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office | SUPPORTED | `/sign-in` | — |
| 2 | Set pickup restriction Parent-1 ↔ S1 | SUPPORTED | `/admin/ride` Pickup restriction + Save (`office_set_pickup_restriction`) | **PARTIAL/GAP** — no Ask restrict tool; `open_screen` to admin ride only |
| 3 | Confirm restriction saved (duty/office view) | SUPPORTED | admin ride UI | Ask cannot list restrictions → GAP or UI verify |
| 4 | Sign out office; sign in Parent-1 | SUPPORTED | auth | — |
| 5 | Parent-1 Ride check-in attempt | SUPPORTED | `/parent/ride` check-in | Ask: no check-in tool → PHYSICAL/UI primary; Ask may only explain |
| 6 | Observe fail closed opaque message | SUPPORTED | “Check in failed” no reason/blacklist copy | — |
| 7 | Parent-1 leave if stuck waiting state | SUPPORTED | Leave line | — |
| 8 | Parent-2 check-in succeeds (allowed) | SUPPORTED | Parent-2 `/parent/ride` | — |
| 9 | Parent-2 leave | SUPPORTED | leave | — |
| 10 | Office notification of banned attempt | PARTIAL/GAP | Messages/Alerts / notifications / activity / duty wall | Ask: “notify office banned parent tried Ride” via `send_message` or alert — if no auto-notify, manual + tag GAP for missing auto fan-out |
| 11 | FERPA: Parent-2 never sees Parent-1 ban reason or unpublished grades | SUPPORTED | parent Home/messages | Ask parent seat |
| 12 | Reverse: clear/unban restriction | SUPPORTED | admin ride clear/update restriction | Ask GAP same as set |
| 13 | Parent-1 re-check-in after unban works | SUPPORTED | `/parent/ride` | — |
| 14 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / non-goals

- Lifecycle: ban → denied attempt → allowed parent success → notify → unban → re-allow
- Multiplicity: two parents opposite rights; one child
- Reverse: unban
- Non-goals: reason strings to parent; LPR inserts; inventing notify chrome; student Ride tab

## Suggested QE themes

L-restriction fail-closed; co-parent isolation; notify GAP filing; unban restore.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — pickup restrictions; Ride attempts.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Pickup restriction ban on F-PARENT-1 | clear/unban UI | **PARTIAL/GAP** no Ask restrict tool | restriction row gone for parent/student pair |
| Banned check-in attempts | none required | — | no sticky fail blocking allowed parent |
| Notify messages if sent | residual OK | GAP | optional |
| Allowed parent trip | leave line | GAP | no live trip |

**Order:** leave any live Ride → **unban before** any parent delete → sign out. Idempotent clear.
