# DEFECT disposition — CEO-1 dual-hat Ride entry (G3)

**Card:** `t_6bccc492`  
**Date:** 2026-09-10  
**Profile:** product-manager  
**Feature:** RIDE — car-rider line (dual-hat parent altitude)  
**Aligns:** `notes/company/ride-iqg-pm-lock.md` §1 (t_a5ec7303) · pick **(a)** Parent seat

---

## Verdict

| Field | Value |
|---|---|
| **SEVERITY** | **P0** (confirmed) |
| **DISPOSITION** | **FIX-NOW** |
| **Stamp conflict?** | No — closes IQG §6.1 G3 OPEN against locked pick (a) |
| **CEO escalate?** | No (not live prod outage / legal / spend; design+chrome gate) |
| **Implement on this card?** | **No** — disposition + paper only |

---

## Why FIX-NOW (not WONTFIX / DEFER / SCHEDULE)

1. **CEO must-case #1.** Teacher/office who is also a parent must reach Ride under curb stress. IQG REJECT driver §6.1. P0 guide = cannot complete a primary live school flow for a primary hat.
2. **Law already picked (a).** `ride-iqg-pm-lock.md` locks explicit **Parent seat** chrome row. (b) My children only and (c) hybrid **Rejected**. Staff trays **never** gain Ride.
3. **Intent still said OPEN.** QE2 correctly filed when intent §6.1 + skeleton lock left G3 ambiguous. Paper must flip §6.1 → **LOCKED = (a)** this turn.
4. **Designer fold still required.** `docs/ui-design.md` §31.4b still says parent path “G3 later.” CoS staffs designer — PM does not sketch packs or patch ui-design.
5. **Eng not inventable.** Do not add Ride to teacher/office tray. After dual DESIGN STAMP, eng **verify/polish** drawer Parent seat vs DH AC (live already has seat model + Parent row hooks).

**Not WONTFIX:** Would ship CEO miss. **Not DEFER:** P0. **Not bare SCHEDULE:** release gate until DH-01 prove-out passes.

---

## Severity confirm

| Guide | Fit |
|---|---|
| **P0** | **Yes** — dual-hat cannot reliably reach parent Ride menu / check-in without locked G3 path |
| P1 | Too low for CEO must-case #1 primary flow |
| P2/P3 | No |

Severity **stays P0**.

---

## Accepted product law (binding — no reopen)

From `ride-iqg-pm-lock.md` §1 — pick **(a)**:

| Law ID | Lock |
|---|---|
| **IQG-RIDE-DH-01** | Dual-hat staff + `also_parent` **must** reach **Parent seat** chrome without tribal knowledge. |
| **IQG-RIDE-DH-02** | **SoT path for Ride:** drawer **Parent** seat row → preference `parent` → `chrome.role = parent` → tray **Home · Ride · Ask** → land `/parent` → Ride one tray tap. |
| **IQG-RIDE-DH-03** | Teacher / office seats: **never** Ride tray tab. |
| **IQG-RIDE-DH-04** | Trays **never** merge. Seat switch rebuilds `tabsFor(role)` only. |
| **IQG-RIDE-DH-05** | Default seat = job-of-record (office > teacher). **Never** default into Parent. |
| **IQG-RIDE-DH-06** | **My children** stays deep-link `/parent` **without** flipping parent tray — **orthogonal**, **not** Ride SoT. **(b) WONTFIX as Ride entry.** |
| **IQG-RIDE-DH-07** | Leave / check-in / vehicles parent UX only under **parent seat** Ride family. |
| **IQG-RIDE-DH-08** | From parent seat, drawer lists **Office** and/or **Teach** back. |
| **IQG-RIDE-DH-09** | Preference client-only; atomic switch; land seat root; 0 ms chrome morph. |

### Explicit Parent seat row (binding detail for designer + eng match)

| Element | Lock |
|---|---|
| Who | Staff with `also_parent` / parent_id hat and ≥1 other seat (`canChooseSeat`). Teacher+parent, office+parent, triple-hat. |
| Placement | **HamburgerDrawer** altitude group only. **Not** tray. **Not** header chip. Near Teach/Office seat rows; after **My children** when that row exists; before Sign out hairline. |
| Visibility | Show **Parent** only when current chrome is **not** already parent seat and `parent` ∈ available seats. Hide when seat=parent. |
| Label | **Parent** (not “Ride seat” as sole label). |
| a11y | **Required:** `Switch to Parent seat` (parity with Teach/Office). |
| On press | Persist preference `parent` → resolve `chrome.role=parent` → `replace` land `chromeSeatRootHref('parent')` = `/parent` → rebuild tray from `tabsFor('parent')` only. |
| Post-land | Tray **Home · Ride · Ask**; wordmark from post-commit role+path; Ride reachable ≤3 taps from drawer open (Parent → Ride). |
| Reverse | On parent seat: show **Office** and/or **Teach** rows for available seats; same atomic law; land seat roots `/`. |
| My children | Unchanged deep-link; does **not** set preference parent; does **not** satisfy DH-01 alone. |
| Forbidden | Ride tab on teacher/office tray; sixth staff tab; tray merge flash; silent auto-flip to parent; deep-link `/parent/ride` under staff tray as stamped Ride path. |

**Rejected:** (b) My children only · (c) hybrid Ride via deep-link OR seat · add Ride on staff tray · silent time-based auto-flip.

---

## Live code note (verify — do not invent)

Inspected 2026-09-10 (no src edits this card):

- `src/lib/chrome/seat.ts` — `ChromeSeatPreference` includes `parent`; resolve → parent; root `/parent`; default never parent.
- `src/lib/chrome/trayTabs.ts` — Ride only on parent role.
- `HamburgerDrawer.tsx` — staff drawer has **Parent** row (`setChromeSeat('parent')` + root href); parent drawer has Office/Teach back; **My children** separate.
- Gap vs lock: Parent row may lack `accessibilityLabel="Switch to Parent seat"` (Teach/Office have it). §31.4b still “G3 later.”
- SEC-01 tests cover parent seat tray isolation.

**Eng after dual stamps:** MATCH lock + §31.4b fold; add missing a11y if still absent; prove DH-01..07. **No** teacher/office Ride tab.

---

## Paper actions on this disposition card

1. **Update** `ride-iqg-intent.md` §6.1 → **LOCKED = (a)**; refresh §2.5 / §3 dual-hat rows; PM DESIGN STAMP line APPROVED; QA Supervisor stays REJECTED until designer fold + Q2.
2. **Confirm** `ride-iqg-pm-lock.md` remains SoT (t_a5ec7303); row detail table above = same law (no reopen).
3. **Do not** patch `docs/ui-design.md` (designer owns §31.4b fold).
4. **Do not** implement src / kelyra-qa-loop / git.

---

## Prove-out AC (re-run after designer fold + any eng polish)

| ID | Sev | Pass |
|---|---|---|
| **DH-01** / **CEO-1-01** | P0 | Teacher+parent: drawer **Parent** → parent tray Home·Ride·Ask → `/parent`; Ride ≤3 taps |
| **DH-02** | P0 | Teacher/office seat: never Ride tab |
| **DH-03** | P0 | Leave/check-in parent chrome only when role=parent on Ride hub rules |
| **DH-04** | P0 | No merged tray flash |
| **DH-05** | P0 | Office+parent same Parent path; Manage curb unchanged |
| **DH-06** | P1 | My children deep-link without Parent seat does **not** expose Ride tab |
| **DH-07** | P1 | Cold start does not open Parent |
| **D-HAT-01..06** / **C-06** / **C-72** | as testplan | Align with lock (a) |

---

## Recommended next action (CoS)

1. Accept PM disposition **FIX-NOW / P0** for CEO-1 G3.
2. **Staff `ui-ux-designer`** — fold Parent seat row + My children vs Parent sentence into `docs/ui-design.md` **§31.4b** (pm-lock §1.4). **Only** this chrome. Not multi-vehicle picker. Not leave reopen.
3. **Staff `qa-supervisor` Q2** — re-stamp `ride-iqg-intent.md` after designer fold (QA may APPROVE §6.1 when fold+law complete; other gaps §6.2/§6.3 may still reject full feature stamp).
4. **Do not staff Engineering** for new Ride scope until **both** DESIGN STAMP lines APPROVED on RIDE IQG. Then eng child only to MATCH Parent seat law + a11y + DH prove-out — **not** “add Ride to teacher tray.”
5. Keep multi-vehicle pick card blocked under lock (A). Keep leave eng blocked until stamps + GATE as already filed.
6. **Do not** staff devops-release while this P0 FIX-NOW open for CEO-1 prove-out.
7. No git from this card.

---

## Handoff fields

- **OBJECTIVE:** Disposition DEFECT CEO-1 G3 dual-hat Ride entry; lock path (a) into intent.
- **RESULT:** SEVERITY **P0** confirmed; DISPOSITION **FIX-NOW**; law = Parent seat (a); intent §6.1 updated; designer fold required before full dual stamp.
- **FILES:** `notes/company/ride-iqg-defect-ceo1-g3-disposition.md`; `notes/company/ride-iqg-intent.md` (§6.1 + stamp); aligns `ride-iqg-pm-lock.md`
- **VERIFICATION:** Verdict table; DH laws; row detail table; CoS next actions
- **ESCALATION NEEDED:** CoS staffs designer + Q2 only (no CEO)
- **RECOMMENDED NEXT ACTION:** CoS → ui-ux-designer §31.4b Parent seat fold → QA Supervisor Q2; eng only after dual stamps; re-prove CEO-1-01 / DH-01

---

*End disposition t_6bccc492 · 2026-09-10 · product-manager*
