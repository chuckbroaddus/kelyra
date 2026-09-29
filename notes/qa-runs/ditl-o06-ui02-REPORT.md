# DITL-O-06-UI-02 EXEC REPORT

CASE: DITL-O-06-UI-02
LANE: A Chromium user-data-dir /tmp/ditl-pw-lane-a
APP: http://127.0.0.1:8081 (HTTP 200 at start; refused after alert send mid-run)
ENGINE: hermes SuperGrok
MARK: ditl-O06-UI02-1790536848361

## RESULT: PARTIAL

## Evidence (live screen)
- Auth: ditl-admin OK via /sign-in; post-signin Home splash (Spring Baptist Academy) — parked t_3191917a, not refiled.
- `/?tab=feed` splash/video only (no composer). Direct `/feed` OK: School feed + TEXTAREA placeholder "Write a post".
- Alert kind tab click returned label Alert; placeholder stayed "Write a post" (parked t_14c82527 Alert-kind tab — not refiled).
- Notify path probe on composer chrome: NOTIFY_PROBE [] — no notify/push/bell/broadcast/recipients control on the live screen.
- NOTIFY_CLICK null — no distinct notify toggle to exercise beyond composer Send.
- Filled alert body + Send: feed row appeared immediately as
  `Post · School · Just now Devon Hale @ditl-admin ditl-O06-UI02-1790536848361 ALERT notify path`
  (published as Post · School, not Alert · School; same parked kind-tab behavior).
- ALERT_IN_BODY true right after send (school feed delivery of the body text confirmed at that moment).
- After send, subsequent navigations to `/notifications`, `/?tab=notifications`, and re-open `/feed` all got net::ERR_CONNECTION_REFUSED — app on :8081 died mid-run. Could not re-verify feed or open a notifications surface. End-of-run curl also 000.
- Teardown: no delete/archive on cards before server death (DELETE_CLICKS 0). Sign-out attempted; connection refused.
- Did not use DB/API insert. Ask create not exercised (known GAP, not filed).
- Artifacts: /tmp/ditl-o06-ui02-out/*.png + log.txt; driver /tmp/ditl-o06-ui02-lane-a.mjs

## FINDINGS
(none new — do not refile splash wall, Alert-kind tab, or Ask-create GAP)

## GAP
- Ask create feed post/alert: known GAP — not filed.
- No separate in-composer "notify" control observed; only Send. Case step "trigger notify path" had nothing distinct to click beyond Send → school feed row.

## Notes
- KIND_BADGE_FOR_MARK logged "Alert" is a false positive from older Alert · School rows still on the feed; the new mark row badge text is Post · School.
- Host feed still shows historical Jacquee/Chuck authors; case body authored as @ditl-admin.
- App crash mid-run left :8081 down; task forbids hunting another port. Not filed as product finding without a stable repro (possible Expo/dev server flake).
