# Intent Quality Gate (IQG)

**CEO lock:** 2026-09-10 (Chuck)  
**Standing:** Confirmed after ASK + RIDE IQG smokes the same day. This is the default delivery model going forward — not a one-off experiment.  
**SoT for this process:** this file. CoS, PM, QA Supervisor, and QA Engineer must follow it.  
**Problem it stops:** shipping a slice of a feature that is “in” but not fully realized (happy-path only). Examples Chuck named: teacher-who-is-also-parent with no Ride menu; parent can enter the car line but cannot leave; parent with multiple cars cannot pick which car at sign-in.

This gate is **higher-layer product completeness**. It does **not** replace `kelyra-qa-loop` / `author-qa-loop` (implementation QA) and must not recreate those loops.

## Applies to

Every **feature** and every **user-facing bug correction** on class app or Author studio.

**Skip (do not run IQG):** docs-only, research-only, ARM/ops, TTS, git ship, SQL apply of already-produced files, leftover loop P2/P3 that do **not** change user-visible behavior.  
**CEO hotfix override:** engineering may start without stamps only if Chuck says so; CoS must still file a follow-up IQG card the same day.

## Roles (RACI)

| Step | QA Supervisor | Product Manager | QA Engineer | CoS | Engineering |
|---|---|---|---|---|---|
| Real-world intent of the design | **Owns** | Works with QA Sup | — | Staffs | Forbidden until stamp |
| Quality goals of the design | Advises | **Owns** + stamp | — | Enforces gate | Forbidden until stamp |
| Design stamp (both required) | Stamp | Stamp | — | Blocks Eng until both APPROVED | Do not start |
| Test plans & cases | Tasks (via CoS) | Consumes | **Writes + executes** | Staffs `qa-engineer` | — |
| Post-implement testing | Reviews evidence | — | **Owns** | Staffs | Do not self-certify |
| File defects + severity | Ensures filed | — | Files (or QA Sup files) | Creates cards | — |
| Prioritize & disposition defects | — | **Automatic, binding** | — | Staffs fixes per PM | Implements FIX-NOW |

Specialists still **do not staff** other profiles. “QA Supervisor tasks QA Engineer” means: QA Supervisor writes the handoff; **CoS must create the `qa-engineer` card**. Do not wait for Chuck on that staffing.

PM **does not** set company-wide roadmap. PM **does** auto-disposition IQG defects without a CEO ask (exception to “only CoS prioritizes”).

## Chain (mandatory)

```
Research → UI/UX Designer (options, if visual)
  → Product Manager (choose + stories)  ∥  QA Supervisor (intent review)
  → DESIGN STAMP: PM APPROVED + QA Supervisor APPROVED
  → Architect (if needed)
  → Senior Developer / Fast Coder → kelyra-qa-loop / author-qa-loop
       (or grok-bot-consultant bot-build when SuperGrok cannot GRANT)
  → QA Supervisor → CoS staffs QA Engineer (test plan + cases + execute)
  → Defects on board `kelyra` with severity → PM disposition
  → QA Supervisor release evidence → Security? → devops-release
```

**No engineering / no qa-loop / no bot-build implement** until both stamps are on the parent card (or a linked stamp note). Loop `passed` is **not** product-complete until prove-out testing against the stamped design.

## Phase 1 — Design-stage intent (QA Supervisor)

Staff `qa-supervisor` as soon as a feature or user-facing bug enters design (same cluster as PM / designer). QA Supervisor reads research, option packs, and the PM draft spec and answers:

1. **Hats:** every role that should use this (student, teacher, parent, office, superintendent). Dual-hat (teacher who is also a parent, office who is also a parent, etc.).
2. **Entry:** where the action lives in chrome for each hat that needs it (no hidden dead-end).
3. **Full lifecycle:** start, change, and **finish** (sign in **and** sign out; enqueue **and** leave).
4. **Multiplicity:** more than one child, class, car, device, school — can the user select the right one at the moment of action?
5. **Reverse / cancel / already-in-flow.**
6. **Explicit non-goals** so “not built” is not mistaken for “done.”

Write `notes/company/<slug>-intent.md` (or a section on the existing plan) with **gaps** and **must-include** behaviors. If the design does not cover real-world intent, **REJECT** the stamp and send gaps to PM (and designer if UI). Do not invent chrome; escalate to CoS to restaff designer.

## Phase 2 — Design stamp (PM + QA Supervisor)

PM works **with** QA Supervisor until both agree the design is complete enough to build.

Stamp block (put on the parent kanban card **and** in the spec note):

```
DESIGN STAMP
Feature/bug:
Quality goals:
Surface:
Drive: /route click=[aria-label=Name]
PM: APPROVED|REJECTED  date:  profile-session:
QA Supervisor: APPROVED|REJECTED  date:  profile-session:
Intent gaps remaining: none | (list)
```

Both must be **APPROVED**. One REJECTED = engineering stays unstaffed.

`phone`, `web`, and `both` also need one `AC-` id per thing a person can see, and a `Drive` line copied from `~/projects/kelyra/.grok/skills/verify-kelyra/features/`. Chief of Staff does not invent the route or the control. `data`, `edge`, and `worker` do not use `Drive`.

A screen loop summary names `failure_class`. `harness`, `untargeted`, and `unnamed` are a capability block. `data` is a data card. `product` is a mock-up review only when this stamp has a mock-up. The same acceptance ids and the same `Drive` line are not started again after a non-pass. A new `Drive` line or a `Retry-after` line is a new check.

PM stamp means: stories + acceptance criteria cover the intent file, chosen UI option (if any), and quality goals.  
QA Supervisor stamp means: real-world intent is fully specified, not only the happy path.

## Phase 3 — Implementation

CoS staffs Engineering only after stamps. Developers implement the **stamped** spec, not a thinner slice. `kelyra-qa-loop` remains the implementation QA path.

## Phase 4 — Prove-out (after implementation)

When the implement card / loop is terminal (`passed` / `escalated` / `complete`):

1. QA Supervisor writes the prove-out OBJECTIVE (what “full featured” means vs the stamp).
2. CoS **must** ARM GRANT + staff `qa-engineer` (child of the feature card).
3. QA Engineer:
   - Creates a **test plan** and **test cases** that prove the stamped design (hats, lifecycle, multiplicity, chrome entry, non-goals).
   - Lands the plan at `notes/company/<slug>-testplan.md` (or `notes/qa/`).
   - **Executes** after implementation. Record evidence (what ran, result, artifacts). Do not re-run every qa-loop stage.
4. QA Supervisor reviews evidence vs stamp. Incomplete prove-out = feature is **not** done.

Test plans may be drafted as soon as the design is stamped; **execution** is after implementation.

## Phase 5 — Defects

Any miss vs stamped intent is a **functional defect**, even if the happy path works.

File on board `kelyra` (sticky blocked first, then ARM when PM says FIX-NOW):

```
Title: DEFECT [P0|P1|P2|P3]: <one-line miss>
SEVERITY: P0|P1|P2|P3
PARENT: <feature task id>
REPRO:
HAT / ROLE:
EXPECTED (stamped design):
ACTUAL:
EVIDENCE:
DISPOSITION: (PM fills) FIX-NOW | SCHEDULE | DEFER | WONTFIX
```

Severity guide:

| Sev | Meaning |
|---|---|
| P0 | Data loss, wrong child/grade, safety, cannot complete a live school flow |
| P1 | Stamped behavior missing for a primary hat or lifecycle (e.g. no sign-out, no dual-hat entry) |
| P2 | Secondary hat or multiplicity miss; workaround exists |
| P3 | Polish vs stamp; no blocked school flow |

QA Engineer files as they find them. QA Supervisor files any the engineer missed. **Do not** bury defects only in a comment on the feature card.

## Phase 6 — PM auto-disposition

For every new `DEFECT [` card, CoS staffs `product-manager` **automatically** (no CEO prompt). PM:

1. Confirms or corrects severity.
2. Sets **DISPOSITION** on the card the same turn.
3. Priority: P0/P1 FIX-NOW unless a written reason; P2/P3 SCHEDULE or DEFER with a reason.

Then CoS:

- **FIX-NOW** → ARM GRANT + staff Engineering (child of defect; link parent feature).
- **SCHEDULE / DEFER** → leave sticky `needs_input` with PM’s reason.
- **WONTFIX** → complete with PM reason; do not implement.
- **P0 production / legal / spend** → still escalate to Chuck.

PM disposition is binding for this defect queue unless Chuck overrides.

## CoS checklist

- [ ] Feature/user-facing bug entered design → staff PM (+ designer if UI) **and** QA Supervisor
- [ ] Both DESIGN STAMP lines APPROVED before any Eng / qa-loop / bot-build implement
- [ ] After loop terminal → staff QA Engineer prove-out from QA Supervisor’s OBJECTIVE
- [ ] Defects exist as their own cards with severity
- [ ] Each defect has PM disposition; FIX-NOW is staffed

## Verification of this process

A feature is **done** only when: stamps exist, implementation loop is terminal, prove-out test plan executed, open P0/P1 defects are FIX-NOW in flight or closed, and QA Supervisor’s release evidence says the stamp was met.

## AUTO-FILE ENG on dual stamp (CEO, 2026-09-25)
When PM DESIGN STAMP and QA Supervisor DESIGN STAMP are both APPROVED, Chief of Staff files the engineering card to senior-developer immediately, with no CEO "go" needed. The QA Supervisor card is filed as soon as the PM stamps. Stop only on REJECT, a spec change after a stamp (restamp triggers), or an explicit CEO hold. The Eng result must carry the PR URL, test counts against the baseline, and the tsc count.

## CHUCK TAP: approvals are announced out loud (CEO hard rule, 2026-09-25)
Anything that needs the CEO's tap (an approval, a cancel, a hotfix override, a spend or account decision, a merge he has locked) must be surfaced so Chief of Staff can announce it out loud on a live call before the prompt appears. Hermes roles do this by blocking the card with `--kind needs_input` and making the first line of the block reason `CHUCK TAP: <one-line decision>`. Never bury a CEO decision in a comment, a result, or a generic block. Chief of Staff announces each CHUCK TAP on the call (what it's for, "tap approve," and "no new messages for a minute," because new messages cut off pending cards), bundles board changes so the CEO taps once, and reports the outcome on the call.

## GATE BLOCK ALERT: surface every release-gate block in real time (CEO hard rule, 2026-09-25)
When any automated gate blocks a release action (screen ship gate or UI proof packet, tests, typecheck, CI, merge or branch protection, Supabase apply, Edge deploy, placeholder gate, or a missing tool or shell), the role that hit it blocks the card right away with `--kind needs_input`, and the first line of the reason is: `CHUCK TAP: <gate> blocked <PR #/card id>. Needs <one decision or action>.` Example: `CHUCK TAP: screen ship gate blocked PR 273. Needs UI proof packet or CEO override.` Never mark such a card done, and never leave the block only in logs or comments. Chief of Staff alerts the CEO the moment it fires, out loud on a live call and in chat, per the CHUCK TAP rule above, without waiting for the CEO to notice something is missing. Origin: the PR 273 screen-gate block at 3:40 PM that the CEO only found by checking the app himself.

## TRIAGE = CHUCK'S INBOX: every CHUCK TAP card lives in triage (CEO hard rule, 2026-09-25)
The Hermes board's `triage` column is the CEO's personal "waiting on me" inbox. Every item that needs his decision or tap (gate blocks, approval prompts, overrides, spend or account calls, locked merges, anything that starts with `CHUCK TAP`) must appear there as a card.
- **How to file it.** The role or agent that hits the gate creates a separate card in triage titled `CHUCK TAP: <gate or decision> <PR #/card id>. Needs <one decision>.` CLI: `hermes kanban create "CHUCK TAP: ..." --triage --assignee <owning role> --created-by <you> --body "<blocked card id, what is blocked, the one decision, options>"`. Worker tool: `kanban_create` with `triage: true`. Then block the work card itself with `--kind needs_input`, first line `CHUCK TAP: see <triage card id>`, as in the rules above. Never put a CHUCK TAP only in a comment, result, log, or generic block.
- **Nothing moves it out except the CEO.** `kanban.auto_decompose: false` is set in `~/.hermes/config.yaml`. That was the only automatic path out of triage (the gateway dispatcher used to send up to 3 triage cards per tick to an AI decomposer), and the dispatcher re-reads the setting every tick. Do not turn it back on. The dispatcher, watchers, routines, and `recompute_ready` never touch triage. The only ways out are manual: a drag in the dashboard, `hermes kanban specify` or `decompose` (CLI or dashboard buttons), complete, or archive. No agent (Hermes role, Hermes CoS, Grok Bot Chief of Staff, loops) may run specify, decompose, promote, assign or reassign, complete, archive, or a status change on a CHUCK TAP triage card unless the CEO says to in that moment. When he answers, the owning agent records his decision as a comment on the triage card and unblocks the work card. The CEO moves or clears the triage card himself, or tells an agent to.
- **Known exception.** Hermes's unblock-loop breaker also routes a card to triage when it gets re-blocked for the same reason past the limit. Those cards don't start with `CHUCK TAP`. Chief of Staff flags them to the CEO as loop cards (a comment, never a rename, because `specify` would pull them out of triage) and never auto-advances them.
- Chief of Staff still announces each new CHUCK TAP out loud on a live call and in chat, per the rules above.

