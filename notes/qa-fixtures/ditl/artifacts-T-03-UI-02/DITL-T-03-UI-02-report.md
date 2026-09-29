# DITL-T-03-UI-02 — Needs list filter (EXEC 15)

Run: 2026-09-27 · qa-engineer SuperGrok lane A · t_031765dd
App: http://localhost:8081 · School: ditl-Sandbox Academy
Browser: Chromium persistent /tmp/ditl-pw-lane-a (not :9223)
Artifacts: notes/qa-fixtures/ditl/artifacts-T-03-UI-02/

## RESULT: PASS

## Evidence (live Playwright Chromium lane A)

Marker: `ditl-T-03-UI-02-1790525099965`
Driver: `run-ui02.mjs` · exe Chrome for Testing (ms-playwright chromium-1234) · user-data-dir `/tmp/ditl-pw-lane-a`

1. `/sign-in` → `ditl-teacher-a` → landed teacher seat `ditl-Math Period 3` class `d1715000-…301`. Shot: `01-after-signin.png`. Tray: Desk / Needs Attention / Diary / Calendar / Kelyra. Desk showed Jordan, Jamie, Riley, Samira + Review chips — teacher chrome only (no parent ride chrome).
2. Navigate `/inbox` Needs Attention. Chips present: **Needs a name · Review · All**. Body: Draft queued (1); Jordan Lee Review (Heard: Jordan Lee); Riley Chen Review; unassigned voice note Needs a name / Assign name. Shot: `02-inbox-all.png`.
3. Chip **Needs a name**: only unassigned voice note + Assign/Delete; **no** Jordan/Riley named review rows. Footer hint “Unassigned work”. Shot: `03-inbox-name.png`.
4. Chip **Review**: Jordan Lee + Riley Chen Review rows only; no unassigned voice-note assign row. Footer “Drafts waiting for Approve”. Shot: `04-inbox-review.png`.
5. Chip **All**: Jordan + Riley + unassigned voice note together. Footer “Everything in Needs Attention”. Shot: `05-inbox-all-again.png`.
6. Teardown: goto `/sign-in` (Sign in form). Shot: `06-teardown-signin.png`. No shared seed teardown.

Visibility verdict: filter chips partition correctly (name = unassigned only; review = named drafts; all = union). Teacher Needs inbox SUPPORTED path OK.

## FINDINGS

(none unexpected for this case)

Note (not a finding for UI-02): UI-01 already filed P2 Jacquee bleed on **messages** tray; this run’s `/inbox` body had no Jacquee.

## Teardown

Only session end via `/sign-in`. No capture/need rows created by this case; left seed inbox rows intact.

## Next

CoS: record SuperGrok usage (ARM a_3bb573a0ed); start next free lane. Do not unblock t_7ebea568.
