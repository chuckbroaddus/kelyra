# CAL-R2 Phase E — Test Plan (live JWT)

**Date:** 2026-09-12 (America/Chicago)
**Author:** qa-engineer / Grok Bot CoS executor
**Card:** t_46962349
**Against:** calendar-r2-pm-lock CAL-09; architecture Phase E Ask tools; PR 112 @ a13ebeb
**SQL gate:** `20260918000000_calendar_r2_phase_e_ai_source.sql` applied (devops t_6f5150ab HTTP 201).
**Overall:** **PASS** — 8/8 cases. `calendar_search` ⊆ visible; draft-then-Save with `ai_nl`; refuse/hat/caps hold.

## 1. Scope
Phase E live JWT prove-out only: `calendar_search` ⊆ `list_calendar_items` for seat (hidden/absence walls; ids/titles only — not bodies); `calendar_draft_event` parks CR-A draft (`source ai_nl`, Review draft banner) and does **not** call `create_calendar_event`; Save path stamps `p_source='ai_nl'`; refuse class-create / student-insert / grade Approve / twin merge / diary / non-office school blast; hat matrix (teacher class binds classId; student personal/study; office school; parent absence needs focused child); caps `calendar.read` / `calendar.write` — never `assignments.manage`.

Out of scope: UI chrome device re-prove, SQL apply, git merge, grok-build / CloudAgent, product implement.

## 2. Evidence
- `notes/company/calendar-r2-phase-e-live-jwt-evidence.json` (shapes/counts/id prefixes only; no JWTs/secrets)
- Runner: `notes/qa-fixtures/ditl/cal-r2-phase-e-live-jwt.mjs` (mirrors Phase D DITL JWT env pattern from `.env`)
- Unit: `askDraft.test.ts` + `phase_e.ask.security.test.ts` (pass=10 fail=0)

## 3. Live JWT cases

| ID | Result | Notes |
|---|---|---|
| E-UNIT-01 | PASS | askDraft + phase_e.ask.security: 10/10 (refuse matrix, hats, caps, draft park, migration stamp) |
| E-SQL-GATE | PASS | `create_calendar_event` accepts `manual`\|`ai_nl`; unknown (`webhook`) refused P0001; `ai_nl` stamps source on row; list live |
| E-SEARCH-WALL-01 | PASS | Parent/student never see hidden Math Quiz; search mapper omits bodies |
| E-SAVE-AI-01 | PASS | Teacher class / student study / office school / parent absence all persist `source=ai_nl` |
| E-SEARCH-01 | PASS | Teacher finds PhaseE class; parent finds PhaseE absence; search ⊆ list; no body field |
| E-REFUSE-HAT-01 | PASS | Teacher school / student class / parent absence without child all refused |
| E-CAPS-01 | PASS | Policy: calendar.read + calendar.write; draft run parks only (no create RPC); not assignments.manage |
| E-DRAFT-PARK-01 | PASS | `REVIEW_DRAFT_BANNER` + `source:'ai_nl'` in askDraft; unit refuse matrix green |

## 4. Defects
None. No DEFECT filed. (First harness pass mis-parsed Node `ℹ pass N` as 0; runner parse fixed; product always green.)

## 5. Acceptance call
Phase E Ask `calendar_search` + `calendar_draft_event` (draft-then-Save / refuse / ai_nl / caps): **hold**.
SQL apply t_6f5150ab + PR 112 @ a13ebeb: **in gate**.
**Overall PASS** → CoS may close Phase E card t_46962349.
