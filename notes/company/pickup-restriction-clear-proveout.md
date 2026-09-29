# IQG prove-out: DITL-O-04-UI-01 pickup restriction clear (office ride)

Task: t_70bb2971 Retry pickup restriction drive
Case: DITL-O-04-UI-01 · persona office · seat office · surface both · motion none
Stamp: notes/company/clear-pickup-restriction-pm.md (AC-BAN-CLEAR-1/2/3)
Date: 2026-09-27
Driver: qa-engineer (live screen; no kelyra-ui-loop; no app edit; no SQL)

## Verdict

PASS on web REPLAYED for AC-BAN-CLEAR-1/2/3. Phone surface opened Expo Go ride route and captured stills; interactive Save/Clear fill was graded on web CDP (phone packet click-only without field fill). No SQL. No app edit. Did not unblock t_ba828734. Ban left cleared after UI clear (not left active).

## LIVE evidence

Web (office persona inject port, Chrome CDP :9223):

- /tmp/kelyra-ban-clear-drive/01-ride-loaded.png — Ride office card with Save restriction + Clear restriction
- /tmp/kelyra-ban-clear-drive/02-filled.png — S1 + P1 + reason filled
- /tmp/kelyra-ban-clear-drive/03-after-save.png — status Restriction saved
- /tmp/kelyra-ban-clear-drive/04-after-clear.png — status Restriction cleared
- /tmp/kelyra-ban-clear-drive/05-second-clear.png — second Clear still Restriction cleared (no trap)
- /tmp/kelyra-ban-clear-drive/drive-log.txt
- /tmp/kelyra-ban-clear-drive/packet.json (ui-drive web widths 390/1280)
- Script: /tmp/kelyra-ban-clear-drive/drive-clear.mjs

Phone:

- /tmp/kelyra-ban-clear-drive/packet-phone.json
- /tmp/kelyra-ban-clear-drive/packet-phone/phone-before.png
- /tmp/kelyra-ban-clear-drive/packet-phone/phone.png
- Evidence string: iOS Simulator via simctl openurl. Not USB.

IDs used (DITL O-04 fixture, UI only):

- student S1 2bcee429-11ce-4f84-b2de-9aab349f03cc
- parent P1 08a3d52d-132d-451e-971c-e1ac3b3cfc29

## Acceptance

AC-BAN-CLEAR-1: REPLAYED pass — After load of /admin/ride as office, Pickup restriction card shows GhostButton label Clear restriction next to Save restriction (body text and screenshots 01/packet web-390).

AC-BAN-CLEAR-2: REPLAYED pass — Filled S1×P1, Save then Clear via on-screen control; status Restriction cleared. Second Clear remains Restriction cleared (no failed/trap). Clear path uses clearPickupRestriction (lookup active row id then p_active false) — not null-id insert. Scope of this drive is one pair; did not seed a second family row in this run (no multi-family live probe). Product implementation targets parent_id match only.

AC-BAN-CLEAR-3: REPLAYED pass — Save restriction still works; status Restriction saved before clear (03-after-save).

LIVE: web full fill→save→clear; phone packet open+click path only.

MOCKUP: not applicable (not one-UI-repair escalation card; no stamp mock-up path required for this drive).

## Constraints held

- No application code edit
- No SQL / no DB clear substitute
- No kelyra-ui-loop / kelyra-qa-loop
- t_ba828734 not unblocked
