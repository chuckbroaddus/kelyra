# Prove-out: student To Do opens on web

Card: t_67c6e550
Build: t_edb34119
Lane: t_fb8cba56
Stamp: notes/company/student-todo-opens-on-web-intent.md
Finding (stays blocked): t_a7868c98
Surfaces: web (loop-driven); phone path claimed but not shown
Persona: student
Motion: none
Date: 2026-09-27
Profile: qa-engineer
Run kind: one-UI-repair escalation review (no live drive this seat)

## Loop packet (not product-complete)

- sessionId: 01a0e523-da05-7692-8e80-90e1bfb9470e
- workflow: kelyra-ui-loop wf_01a0e5243dc578c3bac3b7209a90dae4
- outcome: escalated
- summary: Acceptance ids still failing after one UI repair. The mock-up review is next.
- qa_repair_cycles: 0 / 1
- Blocking finding (loop): P1 ac-todo-open-3 — Acceptance id was not driven to a pass
- report: .../workflows/wf_01a0e5243dc578c3bac3b7209a90dae4/scratch/report.md
- Stamps: PM t_34e12976 APPROVED. QA Supervisor t_e411d9d7 APPROVED.
- Stamp Mockup path: none (do not invent one)

This note does not treat the escalated loop as product-complete.

## MOCKUP: review — why

Stamp has no Mockup line. DESIGN STAMP names quality goals AC-TODO-OPEN-1/2/3, surface web, persona student, motion none. No approved stills package to match.

kelyra-ui-loop escalated after one UI repair. Loop report: implementer wired StudentWorkList WorkRow onPress and shared studentTodoOpenPath (practice/planned → /todo/[submissionId], lesson → /lesson/[assignmentId]); UI proof still failed acceptance completeness because AC-TODO-OPEN-3 was not driven to a pass on native phone.

mockup_compared: false on both UI-proof drives. ui-mockup-review.py was not run. Side-by-side mock-up review page was not built (no stamp Mockup path; nothing to pair).

Acceptance ids from this escalation are the mock-up review, not defect cards. Do not file AC-TODO-OPEN-1, AC-TODO-OPEN-2, or AC-TODO-OPEN-3 as DEFECT cards. Do not unblock t_a7868c98.

## Loop UI-proof drives (evidence only; not this seat's live replay)

### Drive 1 — agent 01a0e529-6973-7083-a054-07f9ba96228f (pre-repair)

- drive_ran: true
- To Do panes empty on /todo and /student/class ("Nothing to do yet" / "Nothing to do in this class")
- Done-pane title/Open navigated to own ids (not stamp To Do-pane proof)
- phone: sim Expo Go sign-in only; USB iPhone not switched
- acceptance claimed: ac-todo-open-1 false; ac-todo-open-2 true (Done rows); ac-todo-open-3 false

### Drive 2 — agent 01a0e540-4902-7640-bd6a-08aee476dae3 (post one UI repair)

- drive_ran: true
- Web @ditl-student-s1: title and Open on /todo navigated to own /todo/[submissionId]; class To Do title navigated to own submission; no lesson row on list so /lesson/ not landed
- phone.ran: false — iPhone 17 sim sign-in; USB left as-is; web 390 is not the phone path
- acceptance claimed by driver: ac-todo-open-1 true (web); ac-todo-open-2 true (own row ids); ac-todo-open-3 false
- Loop still escalated on ac-todo-open-3 (P1 ui proof)

## Screenshot paths the loop saved

Post-repair (kelyra-todo-proof; still present under private temp at review time):

- /private/var/folders/qx/sky2_tt562g31xdnw5yz7shm0000gp/T/kelyra-todo-proof/todo-390.png
- /private/var/folders/qx/sky2_tt562g31xdnw5yz7shm0000gp/T/kelyra-todo-proof/todo-1280.png
- /private/var/folders/qx/sky2_tt562g31xdnw5yz7shm0000gp/T/kelyra-todo-proof/todo-opened-title-1280.png
- /private/var/folders/qx/sky2_tt562g31xdnw5yz7shm0000gp/T/kelyra-todo-proof/sim-current.png

Pre-repair (var/folders temp):

- /var/folders/qx/sky2_tt562g31xdnw5yz7shm0000gp/T/ui-proof-ac-todo-390.png
- /var/folders/qx/sky2_tt562g31xdnw5yz7shm0000gp/T/ui-proof-ac-todo-1280.png
- /var/folders/qx/sky2_tt562g31xdnw5yz7shm0000gp/T/ui-proof-phone-sim.png

No durable notes/qa-fixtures copy was required by this card. Stamp Mockup path: none.

## Grade lines (one-UI-repair escalation rules)

Per kelyra-iqg-proveout: this run writes MOCKUP: review only. Do not write PACKET pass. Do not write REPLAYED pass. This seat did not sign in, did not click, did not open Chrome or the simulator.

AC-TODO-OPEN-1: MOCKUP review — loop post-repair web drive claimed title+Open navigation on Assignments To Do and class title open; first drive had empty To Do panes. Not re-driven here. Not PACKET/REPLAYED.

AC-TODO-OPEN-2: MOCKUP review — loop drives claimed clicked row ids matched that student's own student_list_todo rows (not sibling). Not re-driven here. Not PACKET/REPLAYED.

AC-TODO-OPEN-3: MOCKUP review — fail evidence in packet: native phone To Do open not shown; sim-current / ui-proof-phone-sim are sign-in; web-at-390 is not phone path. Blocking P1 on escalated loop.

LIVE: not applicable this card (one-UI-repair escalation; no drive ordered).

## Defects

None filed. Per card and skill: do not file AC-TODO-OPEN-1/2/3 as DEFECT cards. Finding t_a7868c98 stays blocked; not parented; not unblocked. No kelyra-qa-loop / kelyra-ui-loop relaunch. No app edit.

## DITL IMPACT

NONE (stamp and OBJECTIVE). No plan/case rewrite from this note.

## Verdict

PRODUCT vs stamp: not complete. Escalated loop after one UI repair. MOCKUP: review. CEO: pass is not on this note. Review stays blocked until CEO: pass. Chief of Staff files the CEO card after this note exists; this seat does not file it.

## Handoff

WORK PERFORMED: Wrote notes/company/student-todo-opens-on-web-proveout.md from loop report, state, and both UI-proof agent outputs. Listed screenshot paths. MOCKUP: review. No drive. No defects. No loops.

VERIFICATION: Note contains MOCKUP: review; omits PACKET pass and REPLAYED pass; invents no Mockup path; says side-by-side page was not built.

RESULT: Escalation review note landed.

OPEN ISSUES: AC-TODO-OPEN-3 phone path unproven in packet; CEO review pending.

ESCALATION NEEDED: No from QE. CoS owns CEO card.

RECOMMENDED NEXT ACTION: Chief of Staff reads this note and files CEO card when ready. Do not restaff ui-loop from this seat.
