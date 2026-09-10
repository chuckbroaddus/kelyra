# RIDE IQG — PM lock (dual-hat G3 + multi-vehicle + L-08 paper)

**Date:** 2026-09-10  
**Author:** product-manager (Kelyra)  
**Card:** `t_a5ec7303` · Parent IQG: `notes/company/ride-iqg-intent.md` (Q1 REJECT `t_ad51b408`)  
**Status:** **BINDING product law** for former REJECT gaps §6.1–§6.3. Spec only — no `src/`, SQL, Edge, kelyra-qa-loop, git, or staffing other profiles on this card.

**CEO must-cases addressed:** (1) dual-hat Ride entry · (2) leave already locked — not reopened · (3) multi-vehicle at sign-in.

**Do not reopen:** leave-line A/B/C (Option A + §13.13b); Ride icon; office tray Ride; teacher sixth Ride tab.

---

## 0. Binding picks (summary)

| Gap | Pick | Designer? |
|---|---|---|
| **§6.1 Dual-hat G3** (CEO #1) | **(a)** explicit **Parent seat** chrome row | **YES** — §31.4b / drawer fold |
| **§6.2 Multi-vehicle sign-in** (CEO #3) | **(A)** Keep pack **L2** — no parent vehicle pick at check-in | **No** — CEO pick = **WONTFIX** v1 |
| **§6.3 Paper L-08** | Reconcile acceptance to leave replacement | **No** (paper only) |

**Leave (CEO #2):** Already strong — `ride-parent-checkout-pm.md` + lock Option A + ui-design §13.13b. Not reopened here.

**Eng cards:** `t_a4c0d6bd` multi-vehicle check-in pick stays **blocked / WONTFIX path** under (A). Defect `t_6d13eb49` dispositioned **WONTFIX** (`ride-iqg-defect-ceo3-disposition.md`). `t_bc63db16` parent self check-out stays blocked until dual DESIGN STAMP + GATE — law unchanged.

---

## 1. §6.1 Dual-hat parent altitude / Ride entry — LOCKED = (a)

**Pick: (a) explicit Parent seat chrome row** (Teach / Office class).  
**Rejected:** (b) My children deep-link only. **Rejected:** (c) hybrid that treats deep-link as a Ride path.

### 1.1 Why (a)

1. **CEO #1:** teacher/office who is also a parent had **no Ride menu**. Ride lives only on **parent-seat tray** `Home · Ride · Ask` (chrome-ia; §3.4 / §34.2). Staff seats never gain a Ride tray tab.
2. **Leave L-08b** requires parent-seat Ride chrome. Without a stamped path onto that seat, leave + check-in are unreachable under dual-hat curb stress.
3. **(b) alone reproduces CEO miss:** §31.4b **My children** → `/parent` **without** flipping to parent-only tray — **no Ride tab** under teacher/office chrome. Deep-link `/parent/ride` under staff tray is **not** stamped product.
4. **Forbidden invent:** do **not** “add Ride to teacher tray,” sixth teacher tab, office Ride for parity, or tray merge.
5. **Code already models parent seat** (`ChromeSeatPreference` includes `parent`; `resolveStaffChromeRole` → `parent`; `chromeSeatRootHref('parent')` = `/parent`). G3 gap is **chrome discoverability** (drawer row + atomic switch law), not inventing a new seat type.

### 1.2 Binding law

| Law ID | Lock |
|---|---|
| **IQG-RIDE-DH-01** | Dual-hat staff + `also_parent` (teacher+parent and/or office+parent) **must** reach **Parent seat** chrome under curb stress without tribal knowledge. |
| **IQG-RIDE-DH-02** | **SoT path for Ride:** explicit drawer **Parent seat** row (Teach/Office-class altitude control). Selecting it sets client preference `parent`, resolves `chrome.role = parent`, rebuilds tray from `tabsFor('parent')` only → **Home · Ride · Ask**, lands **parent root** `/parent` (then Ride is one tray tap). |
| **IQG-RIDE-DH-03** | **Teacher seat** and **office/super seat:** **never** show Ride tray tab. Duty curb stays Manage altitude / duty routes. |
| **IQG-RIDE-DH-04** | **Trays never merge.** Seat switch rebuilds `tabsFor(role)` only — full remount/key. Never concatenate staff + parent tabs. |
| **IQG-RIDE-DH-05** | **Default seat** remains job-of-record: office > teacher. **Never default into Parent.** Parent is opt-in altitude. |
| **IQG-RIDE-DH-06** | **My children** drawer row stays **orthogonal** (existing §31.4b / P-06): deep-link `/parent` family **without** flipping to parent-seat tray. It is **not** the Ride menu path and **does not** satisfy IQG-RIDE-DH-01 alone. **(b) is WONTFIX as Ride entry.** |
| **IQG-RIDE-DH-07** | Leave / check-in / vehicles parent UX only under **parent seat** Ride family (`/parent/ride` hub for leave per Option A). Duty wall RPCs unchanged when parent-seated. |
| **IQG-RIDE-DH-08** | From **parent seat**, drawer lists other available seats (**Office** and/or **Teach**) as altitude switches back — same class as P-06 other-seat rows. |
| **IQG-RIDE-DH-09** | Preference is client-only (`office` \| `teacher` \| `parent`) — not JWT, not SQL. Atomic switch posture mirrors P-06: land seat root; 0 ms chrome morph; wordmark from post-commit role+path only. |

### 1.2b Explicit Parent seat row details (binding)

| Element | Lock |
|---|---|
| Who | Staff with parent hat and ≥1 other seat (`canChooseSeat`): teacher+parent, office+parent, triple-hat. |
| Placement | **HamburgerDrawer** altitude group only. **Not** tray. **Not** header chip. With Teach/Office seat rows; after **My children** when present; before Sign out hairline. |
| Visibility | Show **Parent** only when chrome is **not** already parent and `parent` ∈ available seats. Hide on parent seat. |
| Label | **Parent** (not “Ride seat” as sole label). |
| a11y | **Required:** `Switch to Parent seat` (parity Teach/Office). |
| On press | Persist preference `parent` → `chrome.role=parent` → land `/parent` → rebuild `tabsFor('parent')` only. |
| Post-land | Tray **Home · Ride · Ask**; Ride ≤3 taps from drawer open (Parent → Ride). |
| Reverse | From parent seat: **Office** and/or **Teach** for available seats; land `/`. |
| My children | Orthogonal deep-link; does **not** set parent preference; **not** Ride SoT. |
| Forbidden | Staff Ride tab; tray merge; silent auto-flip; staff-tray `/parent/ride` as stamped Ride path. |

### 1.3 Rejected alternatives

| Alt | Disposition | Reason |
|---|---|---|
| **(b) My children only** | **Rejected** | CEO “no Ride menu” **reproduces**. Parent Ride is tray-bound on parent seat. |
| **(c) hybrid Ride via deep-link OR seat** | **Rejected** | Two Ride entry laws invite eng invent and prove-out fog. My children may remain as non-seat parent pages; Ride SoT is seat only. |
| Add Ride tab on teacher/office tray | **Forbidden** | Chrome law; never sixth staff tab; never office Ride parity. |
| Silent auto-flip to parent near dismissal time | **Declined v1** | Surprises job chrome; preference stays explicit. |

### 1.4 Designer

**YES — required chrome fold (not a re-option pack of leave or icon).**  
CoS staffs `ui-ux-designer` to fold **Parent seat** drawer row + switch sequence into `docs/ui-design.md` **§31.4b** (and drawer/§34.2 pointers if needed), parallel to P-06 Teach/Office:

- Placement: HamburgerDrawer altitude group (with other seat rows / near My children + Sign out) — **not** tray, **not** header chip.
- Label / a11y: e.g. **Parent** / `Switch to Parent seat` (exact microcopy designer; nouns must not say “Ride seat” as the only label if Parent is clearer — Ride remains a **tray tab after** seat flip).
- Landing: always parent root `/parent` (seat root law).
- Motion / tray rebuild / illegal transient states: same family as P-06 (no merged tray flash; no prior-seat wordmark).
- Clarify **My children** vs **Parent seat** in one sentence in §31.4b (deep-link vs altitude).

**PM does not draw option packs or patch ui-design on this card.**

### 1.5 Eng note (not staffing)

Implementation already has seat model hooks; missing product stamp was G3 chrome row + §31.4b law. **Do not staff eng** until dual DESIGN STAMP APPROVED. Existing leave/multi-vehicle cards stay blocked.

## 2. §6.2 Multi-vehicle at sign-in vs L2 — LOCKED = (A)

**Pick: (A) Keep pack L2** — no parent vehicle pick at check-in / shutter.  
**CEO example “pick which car at sign-in” = WONTFIX for v1** (written reason below).  
**Rejected:** (B) override L2 self-pick this-trip car. **Rejected:** (C) pick only when ≥2 valid vehicles.

### 2.1 Why (A) / WONTFIX reason

1. **Pack L2 / plan / architecture are intentional:** vehicles live on the parent with validity (own + grandma/nanny; today/range/indefinite). **Order identity** is photo of car **ahead** or I’m first, then staff walk / order_fix / graph — **not** a self-picked own bumper (`car-rider-architecture.md` pickup unit; plan “Parent does not declare own vehicle at check-in”).
2. **Self-pick does not fix queue honesty.** Declaring “I’m in the blue van” does not place you correctly relative to the car ahead; it adds a second identity channel parents can spoof or leave stale while still photographing a different predecessor.
3. **Multi-car product job is already specified:** CRUD + validity (V-05/V-06), staff attach / type / STT on unreadable (V-07), restrictions fail-closed. Grandma today-only expiry is the staggered-car tool — not shutter pick.
4. **Unlike leave L-08:** CEO dated override text existed for parent `left`. Multi-vehicle “must-case” is an IQG problem example requiring **disposition**, not an automatic override of L2. No CEO lock file overrode L2.
5. **Firehose / LPR walls hold either way;** (B)/(C) still ban neighbor plates and LPR-insert-people — but they reopen shutter chrome and server `vehicle_id` on check-in without improving leave or dual-hat.

### 2.2 Binding law

| Law ID | Lock |
|---|---|
| **IQG-RIDE-MV-01** | **Keep L2:** Vehicles on parent (incl. grandma/nanny) with today/range/indefinite. **No self-pick of own car at shutter / check-in.** |
| **IQG-RIDE-MV-02** | Check-in binds **line + this-stop children + ahead photo or I’m first** — not `vehicle_id` chosen by parent. |
| **IQG-RIDE-MV-03** | Bumper identity for match/attach remains **car behind photo, staff walk, or staff attach** — not parent-declared active car. |
| **IQG-RIDE-MV-04** | CEO “multiple cars — pick at sign-in” = **WONTFIX / non-goal v1** with reason §2.1. Prove-out **passes** when pick UI is **absent** and vehicles CRUD still works. |
| **IQG-RIDE-MV-05** | Eng card `t_a4c0d6bd` (multi-vehicle check-in pick) stays **blocked**; disposition path = **WONTFIX / no pick impl** under this lock — do not implement pick without a future CEO override epic. |
| **IQG-RIDE-MV-06** | Leave does not add vehicle pick (checkout-pm already: leave does not add/remove vehicles; no self-pick). |

### 2.3 Rejected alternatives

| Alt | Disposition | Reason |
|---|---|---|
| **(B) Override L2 — this-trip car at check-in** | **Rejected v1** | Dual identity; spoof/stale risk; not order SoT; needs server field + chrome without pack need. |
| **(C) Pick only when ≥2 valid vehicles** | **Rejected v1** | Still self-pick at shutter; same dual-SoT problem; complexity for thin gain. |
| Soft optional annotation vehicle_id without chrome | **Declined** | Hidden fields without UX still invite eng invent; not stamped. |

### 2.4 Designer

**None** for multi-vehicle sign-in. No check-in vehicle picker chrome. Do not staff designer for (B)/(C).

### 2.5 Vehicles still in scope (unchanged)

Parent vehicles list add/void; validity windows; nanny/grandma cars; staff attach; LPR server-only never inserts people; firehose ban on parent DTO.

## 3. §6.3 Paper L-08 reconcile — **DONE**

**Done on this card:** `notes/company/car-rider-acceptance.md` live law no longer lists **Parent cannot checkout themselves** as a ban. Void ban called out in history note only.

| ID | After reconcile |
|---|---|
| **L-08** | Parent **can** leave this line while waiting → event **`left`** (trip children + line only). Parent **cannot** mint **`released`**. Staff curb **`released`** remains pickup. |
| **L-08a** | After `left` on A, may check into B with other linked children (staggered). Twins never auto-mixed. |
| **L-08b** | Leave control only on **parent-seat** Ride hub family. No office Ride tray tab. |
| **L-05** | Clarify: photo ≠ `released`; parent `left` ≠ `released`. |

**SoT replacement text:** `notes/company/ride-parent-checkout-pm.md` §2 (CEO 2026-09-09 override). Chrome: lock Option A + ui-design §13.13b. **Do not change leave chrome** on this card.

**Leave-line law not reopened.** A/B/C leave options stay locked A.

---

## 4. Prove-out AC (named)

### Dual-hat (CEO #1) — after designer §31.4b fold + impl

| ID | Sev | Pass |
|---|---|---|
| **DH-01** | P0 | Teacher + `also_parent` on teacher seat: drawer shows explicit **Parent** seat row; activate → preference parent, tray **Home · Ride · Ask**, land `/parent`; **Ride** reachable in ≤3 taps from drawer open (Parent → Ride, or Parent land then Ride). |
| **DH-02** | P0 | Teacher seat (and office seat): tray **never** shows Ride tab before or after Parent switch reverse. |
| **DH-03** | P0 | Leave CTA / check-in parent chrome only when chrome.role is parent on `/parent/ride` hub rules (Option A). |
| **DH-04** | P0 | Seat switch never merges trays (no 6+ tab flash; no teacher tabs + Ride together). |
| **DH-05** | P0 | Office + `also_parent`: same Parent seat path; office tray never gains Ride; Manage curb unchanged. |
| **DH-06** | P1 | **My children** still deep-links without requiring Parent seat; using My children alone is **not** required to expose Ride tab (Ride requires Parent seat). |
| **DH-07** | P1 | Default seat remains office/teacher job-of-record — cold start does not open Parent. |

### Multi-vehicle (CEO #3) — lock (A)

| ID | Sev | Pass |
|---|---|---|
| **MV-01** | P0 | Parent with ≥2 valid vehicles at check-in: **no** vehicle picker / “which car” control on shutter / I’m first / check-in stack. |
| **MV-02** | P0 | Check-in succeeds under existing photo-ahead / I’m first law without selecting a vehicle_id. |
| **MV-03** | P0 | Vehicles CRUD still: add, void, today-only nanny expiry (V-05/V-06). |
| **MV-04** | P1 | Staff attach / type / STT still available on conflict/unreadable (V-07). |
| **MV-05** | P0 | Implementing parent self-pick vehicle at sign-in without new CEO epic = **fail** (scope invent vs this lock). |

### Leave paper / CEO #2 (already locked — regression)

| ID | Sev | Pass |
|---|---|---|
| **L08-AC-01** | P0 | Acceptance pack L-08 matches leave replacement (can leave → `left`); void ban gone. |
| **L08-AC-02** | P0 | Parent cannot mint `released`; staff `released` still works. |

---

## 5. DESIGN STAMP (PM line)

Write into `ride-iqg-intent.md`:

```
PM: APPROVED  date: 2026-09-10  profile-session: t_a5ec7303 / product-manager
QA Supervisor: REJECTED  date: 2026-09-10  profile-session: t_ad51b408 / qa-supervisor
Intent gaps remaining: designer Parent-seat §31.4b fold (named); QA Sup Q2 re-stamp; eng still blocked
```

**PM stamp meaning:** §6.1 = (a) Parent seat; §6.2 = (A) Keep L2 / CEO pick WONTFIX; §6.3 paper L-08 reconciled. Leave A/B/C not reopened. **QA Supervisor stays REJECTED** until Q2 verifies locks + designer fold as needed.

**Both stamps still required before new eng.** This PM APPROVED alone does **not** open engineering gate.

---

## 6. RECOMMENDED NEXT ACTION (CoS — PM does not staff)

1. **Staff `ui-ux-designer`** — Parent seat G3 chrome fold into `docs/ui-design.md` §31.4b (this lock §1.4). **Only** chrome named: dual-hat Parent seat. **Not** multi-vehicle picker. **Not** leave reopen.
2. **Staff `qa-supervisor` Q2** — re-stamp `ride-iqg-intent.md` after designer fold lands (or after verifying law-only bits if fold deferred with explicit note — prefer fold first since DH chrome is named).
3. **Do not staff Engineering** until **both** DESIGN STAMP lines APPROVED.
4. **Do not staff devops-release.** Do not kelyra-qa-loop from this paper card.
5. Keep `t_a4c0d6bd` blocked (WONTFIX pick path under §2). Keep `t_bc63db16` leave eng blocked until stamps + GATE.
6. QE1 prove-out may plan against this lock; execution rows for DH expect designer fold + impl later.

---

## 7. Handoff

| Field | Value |
|---|---|
| OBJECTIVE | Lock IQG RIDE REJECT gaps §6.1–§6.3 |
| RESULT | (a) Parent seat; (A) Keep L2 WONTFIX CEO pick; L-08 paper reconcile; PM stamp APPROVED |
| FILES | `notes/company/ride-iqg-pm-lock.md` (this); patches `ride-iqg-intent.md`, `car-rider-acceptance.md` |
| VERIFICATION | Binding picks §0; DH/MV AC §4; QA Sup line still REJECTED |
| ESCALATION NEEDED | No — CoS owns designer + Q2 staffing |
| RECOMMENDED NEXT ACTION | CoS → designer Parent-seat fold → QA Sup Q2; no Eng; no devops-release |

---

*End RIDE IQG PM lock — t_a5ec7303 · 2026-09-10.*
