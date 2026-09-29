# Prove-out: teacher tray school scope

Card: t_b44069f7
Lane: t_17d46c96
Stamp: notes/company/teacher-tray-school-intent.md
Finding (stays blocked): t_2853355f
Surfaces: both (web + phone)
Persona: teacher
Seat: teacher
Motion: none
Date: 2026-09-27
Profile: qa-engineer
Run kind: one-UI-repair escalation review (no live drive this seat)

## Loop packet (not product-complete)

- sessionId: 01a0e600-4b1e-7093-892f-a3094cbb9f65
- workflow: kelyra-ui-loop wf_01a0e600eb117f12b9fc090217ef7e87
- outcome: escalated
- summary: Acceptance ids still failing after one UI repair. The mock-up review is next.
- qa_repair_cycles: 0 / 1
- Blocking findings (loop): P1 ac-tray-school-1, P1 ac-tray-school-2, P1 ac-tray-school-3
- report: .../workflows/wf_01a0e600eb117f12b9fc090217ef7e87/scratch/report.md
- Stamps: PM t_626a8738 APPROVED. QA Supervisor t_2287c2b7 APPROVED.
- Stamp Mockup path: none (do not invent one)

This note does not treat the escalated loop as product-complete.

## MOCKUP: review — why

Stamp has no Mockup line. DESIGN STAMP names quality goals AC-TRAY-SCHOOL-1/2/3, surface both, persona teacher, seat teacher, motion none. No approved stills package to match.

kelyra-ui-loop escalated after one UI repair. Loop report: implementer added schoolWall helpers and scoped listThreads / directory / unread to profiles.school_id; UI repair pointed teacher persona at ditl-teacher-a and hardened list load. UI proof still failed all three acceptance ids on both drives.

mockup_compared: false on both UI-proof drives. ui-mockup-review.py was not run. Side-by-side mock-up review page was not built (no stamp Mockup path; nothing to pair).

Acceptance ids from this escalation are the mock-up review, not defect cards. Do not file AC-TRAY-SCHOOL-1, AC-TRAY-SCHOOL-2, or AC-TRAY-SCHOOL-3 as DEFECT cards. Do not unblock t_2853355f. Do not delete Jacquee.

## Loop UI-proof drives (evidence only; not this seat's live replay)

### Drive 1 — agent 01a0e606-d2bc-76f0-98a0-bfcf0f27107f (pre-repair)

- drive_ran: true
- mockup_compared: false
- reason: Web 390 and 1280 Messages stuck on Working... with no people. Phone tray listed group rows (Colton, Mateo; Mateo; Colton Broaddus; Students; Parents); neither Taylor Lee nor Jacquee Broaddus shown, so school wall not visible.
- acceptance: ac-tray-school-1 false; ac-tray-school-2 false; ac-tray-school-3 false
- phone.ran: true — iOS Simulator simctl openurl; not USB; not DeviceHub
- interaction: did true; from /messages to /search

### Drive 2 — agent 01a0e61a-6e6f-74e3-a525-79321c0252df (post one UI repair)

- drive_ran: true
- mockup_compared: false
- reason: Web still Messages Working... with no people rows; phone is Safari sign-in (“Sign in to message people at this school”); AC-TRAY-SCHOOL-1/2/3 not shown.
- acceptance claimed by driver: all three false
- phone.ran: true — iOS Simulator simctl openurl; not USB; not DeviceHub
- interaction: did true; stayed on /messages
- Repair agent claimed a separate packet at /tmp/kelyra-ui-drive-tray-school-v4 with Taylor/Jordan only; that path is not the second-drive packet graded here and was not the stills CoS attached to this card.
- Loop escalated on all three P1 ui-proof ids. That is not a pass.

## Screenshot paths the loop saved

Second drive / CoS card attachments (also under workflow scratch):

- /tmp/kelyra-ui-drive-e554adcdfefbd2a763c964e72596775d/web-390.png
- /tmp/kelyra-ui-drive-e554adcdfefbd2a763c964e72596775d/web-1280.png
- /tmp/kelyra-ui-drive-e554adcdfefbd2a763c964e72596775d/phone.png
- /tmp/kelyra-ui-drive-e554adcdfefbd2a763c964e72596775d/web-after.png
- /tmp/kelyra-ui-drive-e554adcdfefbd2a763c964e72596775d/phone-before.png

Workflow scratch copies:

- .../wf_01a0e600eb117f12b9fc090217ef7e87/scratch/web-390.png
- .../wf_01a0e600eb117f12b9fc090217ef7e87/scratch/web-1280.png
- .../wf_01a0e600eb117f12b9fc090217ef7e87/scratch/phone.png
- .../wf_01a0e600eb117f12b9fc090217ef7e87/scratch/web-after.png
- .../wf_01a0e600eb117f12b9fc090217ef7e87/scratch/phone-before.png

What the attached stills show (review of files, not a live drive):

- web-390 and web-1280: Classes chrome, Messages chip, “Working...” only; no Taylor Lee; no Jacquee; no people tray rows.
- phone: Safari light sign-in — gear icon and “Sign in to message people at this school.” Not a signed-in teacher Messages tray.

Stamp Mockup path: none. Side-by-side page was not built.

## Grade lines (one-UI-repair escalation rules)

Per kelyra-iqg-proveout: this run writes MOCKUP: review only. Do not write PACKET pass. Do not write REPLAYED pass. This seat did not sign in, did not click, did not open Chrome or the simulator.

AC-TRAY-SCHOOL-1: MOCKUP review — packet never shows a loaded teacher Messages tray that lists only that school’s people. Web stuck Working...; post-repair phone is sign-in. Not PACKET/REPLAYED.

AC-TRAY-SCHOOL-2: MOCKUP review — Jacquee not visible on second-drive stills, but absence while Working... or signed-out is not proof the bad link stays hidden on a loaded tray. Not PACKET/REPLAYED.

AC-TRAY-SCHOOL-3: MOCKUP review — Taylor Lee not shown on web-390, web-1280, or phone after the one UI repair. In-school people still appearing is unproven in the packet. Not PACKET/REPLAYED.

Compose picker / add-person / dual-hat teacher+office / teacher+parent on teacher seat: not shown in these stills. Ask list_threads is not the proof per stamp.

LIVE: not applicable this card (one-UI-repair escalation; no drive ordered).

## Defects

None filed. Per card and skill: do not file AC-TRAY-SCHOOL-1/2/3 as DEFECT cards. Finding t_2853355f stays blocked; not parented; not unassigned change; not unblocked. No contact delete. No kelyra-qa-loop / kelyra-ui-loop relaunch. No app edit. No SQL.

## DITL IMPACT

NONE from this note (stamp already filed UPDATE_PLANS | UPDATE_CASES). No plan/case rewrite from QE.

## Verdict

PRODUCT vs stamp: not complete. Escalated loop after one UI repair. MOCKUP: review. CEO: pass is not on this note. Review stays blocked until CEO: pass. Chief of Staff files the CEO card after this note exists; this seat does not file it.

## Handoff

WORK PERFORMED: Wrote notes/company/teacher-tray-school-proveout.md from loop report, journal UI-proof outputs, and second-drive screenshots. Listed screenshot paths. MOCKUP: review. No drive. No defects. No loops.

VERIFICATION: Note contains MOCKUP: review; omits PACKET pass and REPLAYED pass; invents no Mockup path; says side-by-side page was not built.

RESULT: Escalation review note landed.

OPEN ISSUES: AC-TRAY-SCHOOL-1/2/3 unproven in packet after one UI repair; CEO review pending.

ESCALATION NEEDED: No from QE. CoS owns CEO card.

RECOMMENDED NEXT ACTION: Chief of Staff reads this note and files CEO card when ready. Do not restaff ui-loop from this seat. Do not unblock t_2853355f.
