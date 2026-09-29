# DITL-T-03-UI-03 — Parent notification path (EXEC 16)

Run: 2026-09-27 · qa-engineer SuperGrok lane A · t_bab6dede
App: http://127.0.0.1:8081 (port 8081 expo) · School: ditl-Sandbox Academy
Browser: Chromium persistent /tmp/ditl-pw-lane-a (not :9223)
Artifacts: notes/qa-fixtures/ditl/artifacts-T-03-UI-03/

## RESULT: PASS

## Evidence (live Playwright Chromium lane A)

Markers: `ditl-T-03-UI-03-1790525348520`, `ditl-T-03-UI-03-1790525449965`
Driver: `run-ui03.mjs` + alerts capture · exe Chrome for Testing (ms-playwright chromium-1234) · user-data-dir `/tmp/ditl-pw-lane-a`

1. `/sign-in` → `ditl-teacher-a` → teacher seat `ditl-Math Period 3` class `d1715000-…301`. Tray Desk / Needs Attention / Diary / Calendar / Kelyra. Shot: `01-after-signin.png`.
2. `/messages` tray: **Taylor Lee** thread preview with UI-01 makeup reply then UI-03 probe; Alerts chip present in Messages chrome; Jacquee Broaddus still listed (known UI-01). Shot: `02-messages.png`.
3. Parent notification path (1:1 DM): open Taylor Lee thread `24afbe48-3bf7-49be-90da-88e09bcfe1c5`. Visible delivered bodies: parent “Jordan out Friday — makeup quiz?”; teacher “Yes, makeup Tuesday P3.”; UI-01 marker; UI-03 probes as You · Just now / 1 min ago. Shots: `05-taylor-thread.png`, `06-after-send.png`.
4. Alerts pane: `messages?tab=alerts` shows Alerts list with Jordan Lee Ready to review, Riley Chen Ready to review, Needs a name (Needs-linked teacher alerts). Shot: `03-alerts-tab.png`. Tapping Ready to review lands student card Jordan Lee (draft/focus) — `04-alert-detail.png`. (Note: Alerts here are teacher Needs alerts, not a separate parent push inbox; parent-facing delivery confirmed via thread rows under teacher-only lane constraint.)
5. Teardown: `/sign-in`. Shot: `07-teardown-signin.png`. No shared seed teardown. Residual ditl-marked messages OK per plan.

Delivery verdict: teacher↔parent thread messages persist and show on open (delivered in SUPPORTED messaging v1). Probe send 200-path via UI composer (Send / Just now). Parent seat re-login not done (lane A teacher-only; parent is lane B).

## FINDINGS

(none unexpected for this case)

Note (not a new finding): Jacquee Broaddus still on teacher messages tray — already FINDING P2 on DITL-T-03-UI-01; not re-filed.

## Teardown

Session end via `/sign-in`. Left seed + UI-01/UI-03 message rows (plan residual OK). No capture/need rows created beyond message probes.

## Next

CoS: record SuperGrok usage (ARM a_333ca7056c); start next free lane. Do not unblock t_7ebea568.
