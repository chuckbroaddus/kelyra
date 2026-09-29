# DITL-T-03-UI-01 — Teacher messages + needs (EXEC 14)

Run: 2026-09-27 ~11:00 AM CT · qa-engineer SuperGrok · t_1baa2cbf
App: http://localhost:8081 · School: ditl-Sandbox Academy
Artifacts: notes/qa-fixtures/ditl/artifacts-T-03-UI-01/

## RESULT: PASS

## Evidence (live Playwright Chrome)

Marker: `ditl-T-03-UI-01-1790524688352`

1. Parent `ditl-parent-1` / parent password → `/parent` seat (Taylor Lee, children Jordan + Jamie).
2. `/messages/new` → search Avery → open Avery Quinn thread `24afbe48-…`.
3. Parent sent via composer type + Send button: parent makeup-quiz ask. Shot: `final-03-parent-sent.png`.
4. Teacher `ditl-teacher-a` → `/class/…301` ditl-Math Period 3.
5. `/messages` tray shows Taylor Lee preview with parent marker body at 10:58 AM. Shot: `final-05-tray.png`.
6. Opened thread; parent body visible; teacher replied “Yes, makeup Tuesday P3.” Visible as You · Just now. Shot: `final-07-replied.png`. REST `send_message` 200 + `messages` GET returned the row.
7. `/inbox` Needs Attention: chips Needs a name / Review / All; Draft queued (1); Jordan Lee Review; Riley Chen Review; unassigned voice note — needs flagged. Shots: `final-08`…`final-11`.
8. Class settings opened for teardown path; no Sign out control on that page (hamburger Sign out not driven). Message rows left with ditl marker (plan: residual OK).

Driver note: multiline composer uses Send button (`submitBehavior=newline`); `fill`+Enter alone does not send — not a product miss.

## FINDINGS

FINDING: Teacher messages tray lists non-ditl contact Jacquee Broaddus alongside Taylor Lee on sandbox teacher seat; severity P2; case DITL-T-03-UI-01

## DB / API

- Thread id 24afbe48-3bf7-49be-90da-88e09bcfe1c5 (teacher ↔ parent-1).
- send_message returned message id 2da547d4-… then listMessages non-empty.

## Teardown

No shared seed deleted. ditl-marked messages residual OK per plan.

## Next

CoS: record usage; file Jacquee bleed only if unexpected SUPPORTED; GRANT next SuperGrok seq to qa-engineer.
