# Prove-out: teacher tray school scope (live retry)

Card: t_1c4d8a86
Case: DITL-T-03-UI-01
Persona: teacher (ditl-teacher-a / Avery Quinn via ui-persona teacher)
Seat: teacher
Surfaces: web + phone
Date: 2026-09-27
Profile: qa-engineer
Run kind: live drive retry (no code edit; no kelyra-ui-loop; no SQL; no deletes)

## LIVE drive summary

- Tooling: `node scripts/ui-drive.mjs` both + phone-only; custom CDP harvest with longer settle wait.
- Persona inject: ok on web.
- Web Messages tray: LOADED after ~12s settle (earlier packet stills captured mid-Working…).
- Phone: did not show teacher Messages tray (Expo Go home / prior sign-in stills). Web still counts per card.

## Screenshot / packet paths

- Live loaded web tray: `/tmp/kelyra-ui-drive-tray-retry-t1c4d8a86/live-harvest/web-messages-live.png`
- Live harvest report: `/tmp/kelyra-ui-drive-tray-retry-t1c4d8a86/live-harvest/report.json`
- ui-drive both packet: `/tmp/kelyra-ui-drive-tray-retry-t1c4d8a86/packet.json` (stills under `packet/` — web still Working…)
- phone-only: `/tmp/kelyra-ui-drive-tray-retry-t1c4d8a86/phone-only/packet/phone.png` (Expo Go, not tray)

## Web body text (CDP, after settle)

From report.json lines (no tokens):

- Chrome: Classes, Desk, Needs Attention, Diary, Calendar, Kelyra, Messages, ditl-Sandbox Academy class list, Alerts
- Messages tray rows: Favorite / TL / Taylor Lee / PROVEOUT parent check-in… / 5:50 PM
- Favorite / JL / Jordan Lee / DITL-S-03-ASK-01 student msg probe… / 11:56 AM
- Jacquee: absent from body text and OCR of live shot
- Working…: gone after settle
- Sign-in: not shown

OCR of live web shot matches Taylor Lee and Jordan Lee; no Jacquee.

## Phone

- ui-drive --surface both phone.png OCR: sign-in-ish “message people at this school” (not loaded tray).
- ui-drive --surface phone only: Expo Go DEVELOPMENT SERVERS home (Kelyra recent), not signed-in teacher Messages.
- Phone cannot complete tray AC this run. Stopped phone per card. Web still counts.

## Grade lines

AC-TRAY-SCHOOL-1: REPLAYED pass (web) — loaded teacher Messages tray lists Taylor Lee and Jordan Lee only among people rows; school chrome shows ditl-Sandbox Academy classes. Phone: not proven (no tray).

AC-TRAY-SCHOOL-2: REPLAYED pass (web) — Jacquee Broaddus does not appear in CDP body text or OCR on loaded tray. Phone: not proven.

AC-TRAY-SCHOOL-3: REPLAYED pass (web) — Taylor Lee appears (and Jordan Lee). Phone: not proven.

LIVE: web REPLAYED after longer wait than stock ui-drive settle; phone failed to show tray (Expo Go / sign-in).

MOCKUP: not this card (live retry of tray load, not one-UI-repair mock-up review). Prior MOCKUP review remains on teacher-tray-school-proveout.md.

## Defects

None filed for AC-TRAY-SCHOOL-* on this card (live evidence web pass). Do not unblock t_2853355f from this seat. No contact delete. No app edit. No SQL. No kelyra-qa-loop / kelyra-ui-loop.

Note: stock ui-drive still screenshotted web while Working…; product tray did load under extended CDP wait (~12s). If ui-drive settle is short for Messages, that is tooling lag, not absence of tray.

## Verdict

Web teacher Messages tray loaded for ditl teacher persona. School-wall ACs visible on web: in-school people (Taylor, Jordan) present; Jacquee absent. Phone tray not shown this run.

## Handoff

WORK PERFORMED: Live drove teacher /messages web+phone; CDP harvest with extended wait; OCR; wrote this note.

VERIFICATION: report.json has hasTaylor true, hasJacquee false, hasWorking false; live PNG path above.

RESULT: Web tray evidence captured. Phone incomplete.

OPEN ISSUES: Phone Expo Go / inject path still not delivering Messages tray; stock ui-drive may shot too early on Working….

RECOMMENDED NEXT ACTION: CoS/tooling may extend Messages settle in ui-drive; phone persona deep-link path separate. Do not treat phone as school-wall fail without a signed-in tray.
