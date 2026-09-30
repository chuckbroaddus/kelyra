# Rapid development switch

Status: on

**CEO:** Chuck, 2026-09-30.

While this line says `Status: on`, DevOps Release merges any mergeable pull request into `main` and applies the new migration files inside it without a separate yes (`profiles/devops-release/scripts/rapid_ship.sh`). A conflicting pull request stays open and DevOps tells Chief of Staff.

What rapid means for a build card:

- Build it, run the unit tests and `npm run typecheck` for the files you touched, and hand it to DevOps. That is done.
- No Intent Quality Gate, no design stamp, no QA Engineer pass, no DITL case, no Product or QA seat unless the card names one.
- A screen card takes at most one web screenshot as proof. A harness failure (`web_not_ready`, `phone_sign_in_failed`, `route_not_settled`) is noted on the card and does **not** block the merge.
- Chuck checks the work on his phone at the end of each wave.

**UI / live browser / screen-proof cards:** read `notes/company/qa/BROWSER_TESTING.md` first (ports, personas, `ui-drive` flags, and recurring harness failures) before starting Metro, Chrome, or Drive.

Still true while this is on: DevOps is the only seat that commits, pushes, merges, or applies SQL. No `db push`. No DNS, store listing, price, or Stripe change. The ARM daily cap still applies.

Set this line to `Status: off` to stop auto-merge.
