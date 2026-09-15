# CAL-R2 Phase D — Test Plan (live JWT)

**Date:** 2026-09-12 (America/Chicago)
**Author:** qa-engineer / Grok Bot CoS executor
**Card:** t_90517013
**Against:** calendar-r2-intent + architecture Phase D (LF-A chips + Calendars sheet + local prefs + thin sport Unsubscribe); PR 111 @ 411e50c
**SQL gate:** `20260917000000_calendar_r2_phase_d_sport.sql` + `20260917000001_list_calendar_items_phase_d_team.sql` applied (devops t_decdbd1e both files HTTP 201).
**Overall:** **PASS** — list_calendars stable layers; sport off until opted; Unsubscribe membership-only; filters ≠ security; class_work Disable ≠ hide class events; Phase B/C MUST regressions hold.

## 1. Scope
Phase D live JWT prove-out only: `list_calendars` LF-A shape; presets/sport default-off; `unsubscribe_team` (never Delete); prefs key per CH-A child; filter params cannot elevate past hidden/absence walls; opted vs non-opted team event read; class vs class_work calendar_id independence; Phase B publish/CH-A/B-NEEDS-01 + Phase C absence walls sample.

Out of scope: Phase E, SQL apply, git merge, grok-build / CloudAgent, UI chrome re-prove on device, sport game CRUD write path (v1 read + Unsubscribe only).

## 2. Evidence
- `notes/company/calendar-r2-phase-d-live-jwt-evidence.json` (shapes/counts/id prefixes only; no JWTs/secrets)
- Runner: `notes/qa-fixtures/ditl/cal-r2-phase-d-live-jwt.mjs` (extends Phase B/C DITL JWT patterns)

## 3. Live JWT cases

| ID | Result | Notes |
|---|---|---|
| D-SQL-GATE | PASS | `list_calendars` + `unsubscribe_team` + Phase D `list_calendar_items` present |
| D-LIST-01 | PASS | Student/teacher/parent stable school·class·class_work·personal; office school-only; live shape includes `default_enabled` + `can_unsubscribe` |
| D-SPORT-OFF-01 | PASS | Opted team `default_enabled=false`; Track (non-opted) absent from list; Reset/All academic/School only leave sport off; My sports enables opted team only |
| D-UNSUB-01 | PASS | `can_unsubscribe` on team; class calendar reject; parent missing childId → child required; student unsub removes layer, event row remains; prefs key isolates S1 vs S2 |
| D-FILTER-SEC-01 | PASS | Category filter never reveals hidden quiz; forged calendar_ids never elevate Track; twin/office absence walls hold |
| D-TEAM-READ-01 | PASS | S1 + parent(S1) see Soccer game; S2 / parent(S2) / non-opted Track never |
| D-CLASSWORK-01 | PASS | Class field trip on `class` calendar_id; HW on `class_work`; Disable work keeps class event |
| B-HAT-S | PASS | Regression: student published-only; no Math Quiz |
| B-HAT-P | PASS | Regression: parent+childId published-only |
| B-CH-A-01 | PASS | Regression: missing childId → n=0 for 2+ children |
| B-NEEDS-01 | PASS | Regression: `list_hidden_calendar_dues` green |
| C-ABS-WALLS | PASS | Regression: teacher_a sees absence; teacher_c / student / office / twin never |
| B-PUBLISH-RPC | PASS | Regression: `publish_assignment_to_calendar` still present |

## 4. Defects
None. No DEFECT filed.

## 5. Acceptance call
Phase D LF-A layers + sport opt-in read + Unsubscribe + client filter≠security: **hold**.
Phase B family publish + CH-A + Needs Publish queue + Phase C absence walls: **still hold**.
**Overall PASS** → CoS may gate Phase E per PM lock (not in this card).
