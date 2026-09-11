# RIDE IQG — Real-world intent (car-rider line) — RETRO

**Date:** 2026-09-10  
**Author:** qa-supervisor (Kelyra)  
**Cards:** Q1 `t_ad51b408` · Q2 `t_5546cf61` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**Feature:** RIDE — car-rider / dismissal line (parent check-in, staff curb, vehicles, leave-line)  
**Status:** Design-stage IQG **retro** intent. **QA Supervisor DESIGN STAMP: APPROVED** (Q2 re-stamp). Dual DESIGN STAMP met. No app code on this card. Does **not** declare RIDE product-complete (live leave + Parent seat still FIX-NOW eng; prove-out QE3 after impl).

**SoT read:** `car-rider-{research,plan,architecture,security,acceptance}.md` · `ride-impl-request.md` · `ride-chrome-ia.md` · `ride-icon-decision.md` · `ride-parent-checkout-{pm,lock,options}.md` · `ride-iqg-pm-lock.md` · `docs/ui-design.md` §3.4 · §13.13b · §31.4b (Parent seat G3 fold) · §34.2 · §36 · §37 · live `src/app/parent/ride.tsx` · `vehicles.tsx` · `src/app/ride` · `admin/ride` · `src/lib/ride/*` · `src/lib/chrome/{trayTabs,seat}.ts` · drawer dual-hat.

**CEO IQG problem examples (must-cases):** (1) teacher who is also a parent had no Ride menu; (2) parent can enter the line but cannot leave; (3) multiple cars — no vehicle pick at sign-in.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: RIDE — car-rider line (retro design-stage IQG)
Quality goals: hats+chrome entry; enter AND leave; left≠released; multi-child/line/vehicle real-world; dual-hat parent seat Ride; twins fail closed; firehose ban; staff curb pickup
PM: APPROVED  date: 2026-09-10  profile-session: t_a5ec7303 + t_6bccc492 / product-manager
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_5546cf61 / qa-supervisor
Intent gaps remaining: none
```

**PM stamp meaning (2026-09-10 · t_a5ec7303 + t_6bccc492):** Gap locks closed in `ride-iqg-pm-lock.md` (+ §1.2b Parent seat row details). **§6.1 = (a)** explicit Parent seat chrome row — defect `t_6bccc492` disposition **FIX-NOW / P0**. **§6.2 = (A)** Keep L2 / CEO pick-at-sign-in **WONTFIX** v1. **§6.3** paper L-08 reconciled → leave replacement L-08/L-08a/L-08b. Leave A/B/C not reopened. Designer fold was required before dual stamp — landed Q2.

**QA Supervisor stamp meaning (2026-09-10 · Q2 `t_5546cf61`):** Q1 `t_ad51b408` REJECTED on dual-hat G3, multi-vehicle L2 conflict, void paper L-08. **Q2 APPROVED:** PM locks close those law gaps without happy-path-only; designer `docs/ui-design.md` §31.4b Parent-seat fold matches pm-lock §1.4 (drawer altitude, land `/parent`, no tray merge, My children ≠ Parent seat, Ride requires Parent seat). Real-world intent fully specified: hats, dual-hat, enter **and** leave (Option A), multiplicity incl. MV pick WONTFIX, chrome. Live missing leave / Parent-row = **FIX-NOW eng after stamp** (CEO-2 `t_6f5ec4a9`, CEO-1 `t_6bccc492`) — not a reason to keep REJECT. Multi-vehicle pick stays WONTFIX (`t_6d13eb49`). Dual stamp met → CoS may staff Eng FIX-NOW (leave + Parent seat). Not product-complete until QE3 prove-out vs stamp.
---

## 1. One-line law (v1 pack + L-08 override)

| Surface | Job | Not |
|---|---|---|
| **Vehicles** | Plate/year/make/model on parent; grandma/nanny; today/range/indefinite; add/void | Hang-tag; student metadata |
| **Lines** | Two+ physical lines (grade bands); independent orders | One global school queue |
| **Check-in** | Children **this stop** + photo of car ahead **or** I'm first | GPS; placard; keypad product |
| **Leave-line** | Parent ends waiting on **this line** — event **`left`** (CEO 2026-09-09 overrides old L-08 ban) | Staff pickup; grade; GPS auto-exit |
| **Staff checkout** | Curb confirms pickup — event **`released`** | Parent self-service “picked up” |
| **Parent copy** | Success own **XX** (no total). Fail **Check in failed** (no reason) | Neighbor plates; “of 40” |
| **Retention** | Photos+events 7 days; super archive day's photos until delete | Subpoena desk; public URL |

*(Vehicle pick-at-sign-in: **LOCKED (A)** Keep L2 / no self-pick — CEO pick **WONTFIX** v1; see §6.2 + `ride-iqg-pm-lock.md` §2.)*

---

## 2. Hats — who uses this

### 2.1 Parent (primary car-rider actor)

| Intent | Specified? | Where |
|---|---|---|
| Vehicle list (own + grandma/nanny) with today/range/indefinite | Yes | plan §0–1; impl §3; V-05/V-06 |
| Add / void vehicle | Yes | plan; architecture parent_upsert |
| At a **line**: child chips this stop | Yes | L8; plan mechanic |
| Photo of car ahead **or** I’m first | Yes | L1; C-09/C-10 |
| Own success **XX** (no total); fail **Check in failed** (no reason) | Yes | L6; C-11/C-12 |
| **Leave this line** while waiting (`left`) | Yes — CEO 2026-09-09 + PM lock | ride-parent-checkout-pm + lock Option A; L-08 replacement |
| After leave / released → check into other line (staggered) | Yes | L-08a; US-CO-04; L-07 |
| Own trip / own children / own XX only | Yes | Visibility table; US-CO-08 |
| **Pick which of my cars I’m in at sign-in** | **No — WONTFIX v1** | Lock **(A)** Keep L2; `ride-iqg-pm-lock.md` §2; disposition `t_6d13eb49` |
| Entry: parent tray **Home · Ride · Ask** | Yes | chrome-ia; ui-design §3.4 / §34.2 |

### 2.2 Curb duty (staff walk / checkout)

| Intent | Specified? | Where |
|---|---|---|
| Per-line camera walk 1…n | Yes | plan staff; P3 |
| Duplicate-first conflict + tap order_fix | Yes | C-10; architecture |
| Attach plate type/STT; nudge (no neighbor PII to parent) | Yes | L9; V-07 |
| **Checkout = `released`** when child in car | Yes | L5; US-CO-05 |
| Duty wall (not `is_staff` widen) | Yes | security pack; L4 |
| Entry: **Manage altitude** / duty routes — **no** office Ride tray tab | Yes | chrome-ia; §31.4b / §36 |

### 2.3 Stage duty

| Intent | Specified? | Where |
|---|---|---|
| Pre-call children for **this line** only | Yes | plan Stage |
| No parent leave chrome | Yes | US-CO dual-hat table |
| Entry: duty assignment / Manage altitude | Yes | dismissal_duty |

### 2.4 Teacher (no parent hat)

| Intent | Specified? | Where |
|---|---|---|
| Ride parent tray | **No — locked** | Teacher tray 5; no Ride tab §34.2 |
| Parent leave / check-in | **No** | Parent seat only |
| Curb tools only if on duty | Yes | dismissal_duty wall |

### 2.5 Dual-hat teacher+parent / office+parent (CEO must-case #1)

| Intent | Specified? | Where |
|---|---|---|
| Parent-only login → tray Home · Ride · Ask | Yes | §3.4 |
| Staff job + `also_parent`: **parent seat** → full parent tray **including Ride** | **Yes — law** | seat.ts resolve parent → `parent`; SEC-01; chrome-ia; pm-lock §1 |
| Staff job + also_parent on **office/teacher seat**: no Ride tray tab | Yes | §31.4b; never merge trays; DH-03 |
| Drawer **My children** → `/parent` without flipping to parent tray | Yes (path) | §31.4b; P-06; **orthogonal** to Parent seat (DH-06) |
| **How dual-hat reaches parent seat / Ride** | **LOCKED = (a)** explicit **Parent** drawer seat row | pm-lock §1; disposition t_6bccc492; designer §31.4b Parent seat fold **landed** (t_a6400dea) |
| Leave only under parent tray Home · Ride · Ask | Yes | L-08b; lock §3; US-CO-06 |
| Duty wall RPCs unchanged when parent-seated | Yes | US-CO-06 |

### 2.6 Office / superintendent

| Intent | Specified? | Where |
|---|---|---|
| Office tray: Feed · Classes · People · Manage · Ask (**no Ride**) | Yes | chrome-ia; §36 |
| Dismissal curb / Ride office under **Manage** pane + duty routes | Yes | §36.1; trayTabs manage active |
| Restrictions / duty assign | Yes | plan Superintendent; P4 |
| **Archive day’s photos** — superintendent only | Yes | L10; H-09/H-10 |
| Administrators: restrictions/duty/attach — **not** archive | Yes | H-10 |
| Parent leave on office seat | **No** | L-08b |

### 2.7 Student

| Intent | Specified? | Where |
|---|---|---|
| Ride UI | **None — locked** | plan Student: no UI; student tray no Ride |

### 2.8 Twins / binding

| Intent | Specified? | Where |
|---|---|---|
| Linked+picked children this stop only | Yes | L8 |
| Twins unlabeled / fail closed — no auto mash-up | Yes | impl twins empty; non-goals twin blend |
| Leave = exactly trip student_ids (not household) | Yes | US-CO-03; leave PM §4 |
| Never blend line A twin trip with line B twin trip | Yes | US-CO-04; leave PM twins |

---
## 3. Entry chrome (per hat)

| Hat | Ride / dismissal entry | Leave-line entry |
|---|---|---|
| **Parent-only** | Floating tray **Ride** → `/parent/ride` (vehicles subroutes Ride-active highlight). IconName `ride` (RearPlate). Wordmark **Ride**. | Trip card on `/parent/ride` hub only while waiting (Option A). **No** Leave on `/parent/vehicles…`. |
| **Teacher (no parent)** | None. Teacher tray has no Ride. | None. |
| **Teacher + also_parent** | **LOCKED (a) + folded:** drawer **Parent** seat row → parent tray Home · Ride · Ask · land `/parent` (§31.4b). Teacher seat: **no** Ride tab. My children ≠ Ride SoT. | Leave only after parent-seat tray is live (L-08b). |
| **Office / super (no parent)** | **Manage** pane “Dismissal curb” / duty routes (`/admin/ride…`, `/ride…`) activate Manage — **not** a sixth tray tab. | None (parent leave). Staff `released` on curb duty UI. |
| **Office/super + also_parent** | Same as teacher+parent: **Parent** seat row → Ride; office seat never gains Ride tab. | Parent seat only. |
| **Curb / stage duty** | Duty assignment + Manage altitude routes. | Staff `released` only — never parent Leave chrome. |
| **Student** | None. | None. |
| **Dual-hat any** | Never merge trays. Never office Ride for parity. Seat switch rebuilds `tabsFor(role)` only. | Parent tray only. |

**Chrome non-goals (locked):** office tray Ride; student Ride; teacher sixth Ride tab; invent View-stroke outside `npm run icons`; reopen icon options; sticky Leave footer; Danger red Leave.

---

## 4. Full lifecycle (start → change → finish)

### 4.1 Vehicles lifecycle

```
parent adds vehicle (plate/year/make/model/label) + validity today|range|indefinite
  → active match window
  → void/remove
  → staff attach on conflict / unreadable
  → expired validity ⇒ not used for match
```

**Finish covered:** add, void, expiry. **Check-in does not bind parent-chosen `vehicle_id`** — lock **(A)** §6.2 / pm-lock §2.

### 4.2 Check-in lifecycle (enter)

```
parent seat → Ride → pick line → child chips this stop
  → photo of car ahead OR I’m first
  → server order (walk > order_fix > graph)
  → success: own XX only (no “of N”)
  → fail: Check in failed (no reason) — restriction fail-closed
  → two I’m-first → curb conflict; parent still own status only
```

**Finish covered:** enter path. Photo ≠ released ≠ left.

### 4.3 Leave-line lifecycle (parent `left`) — CEO must-case #2

```
live waiting trip on line A
  → trip card: line + You are XX + trip child names (read-only)
  → Leave line (Ghost in card) → ConfirmSheet Leave line / Keep waiting
  → server queue_events.kind = left (this line_id + trip student_ids only)
  → success: You’re out of {line}; restore check-in stack
  → may check into line B other children (staggered)
  → no undo (re-check-in rebuilds graph)
  → parent never mints released
```

**Gates (all required):** parent seat; live waiting trip; not already left/released; same parent owns trip; server SoT.

**Finish covered in law:** leave while waiting; cannot leave when not; trip-scope children; staggered A→B; staff released still works. **Impl status:** PM+designer lock filed; eng cards may still be open — prove-out must verify live.

### 4.4 Staff checkout lifecycle (`released`)

```
curb duty on line → walk/list → checkout when child in car
  → queue_events.kind = released (pickup confirmation)
  → parent Leave disappears / no-op if already left
  → photo check-in still ≠ released
```

### 4.5 Reverse / cancel (must-include)

| Action | Result |
|---|---|
| Keep waiting (confirm cancel) | Stay on line; XX unchanged |
| Leave line confirm | `left`; out of this line only |
| Staff released while waiting | Pickup confirmed; parent not waiting |
| Staff released after parent left | Audit pickup; parent already not waiting |
| Void vehicle | No longer match; does not auto-leave trip |
| Restriction | Check-in fail-closed; leave does not clear blacklist |
| Accidental leave | Re-check-in (new XX) — no timed undo |
| Partial leave one twin | **Out of v1** — leave whole trip, re-check-in |

---

## 5. Multiplicity

| Case | Design |
|---|---|
| **Multiple lines** (grade bands) | Independent orders; staggered A then B | 
| **Multiple children** | Chips this stop; leave = trip set only; not household blob |
| **Twins** | Fail closed; unlabeled empty; never auto-mix lines/trips |
| **Multiple cars / vehicles on parent** | CRUD + validity yes. **Sign-in vehicle pick: WONTFIX v1** — lock **(A)** Keep L2 (§6.2 / pm-lock §2) |
| **Grandma/nanny car** | On parent vehicles list; today-only expires next day (V-05) |
| **Two I’m-first** | Curb conflict; parent own status only |
| **Dual-hat multi-seat** | One chrome seat at a time; trays never merge |
| **Multiple schools** | school_id stamp; my_school wall (pack security) |
| **Nanny own login** | **Out of v1** |

---
## 6. Intent gaps — Q1 REJECT drivers (closed at Q2)

Happy-path-only (enter without leave; parent-only tray without dual-hat Ride seat law; vehicles list without sign-in pick rule) = incomplete. **Q1 REJECT closed:** PM locks + designer §31.4b fold verified at Q2. **Law complete.** Live eng misses are FIX-NOW defects, not stamp blockers.

### 6.1 P0 — Dual-hat parent altitude / Ride entry (CEO must-case #1) — **LOCKED = (a) + FOLDED**

**PM lock:** `notes/company/ride-iqg-pm-lock.md` §1 · disposition `notes/company/ride-iqg-defect-ceo1-g3-disposition.md` (`t_6bccc492`) · 2026-09-10.  
**Pick: (a) explicit Parent seat chrome row.** **Rejected:** (b) My children only · (c) hybrid.  
**Designer fold:** `docs/ui-design.md` §31.4b “Parent seat switch (IQG-RIDE G3)” — **landed** (designer `t_a6400dea`). Q2 verified vs pm-lock §1.4.

| Law ID | Lock |
|---|---|
| **IQG-RIDE-DH-01** | Dual-hat staff + parent hat **must** reach **Parent seat** without tribal knowledge. |
| **IQG-RIDE-DH-02** | **SoT for Ride:** drawer **Parent** row → preference `parent` → tray **Home · Ride · Ask** → land `/parent` → Ride one tray tap. |
| **IQG-RIDE-DH-03** | Teacher / office seats: **never** Ride tray tab. |
| **IQG-RIDE-DH-04** | Trays never merge; rebuild `tabsFor(role)` only. |
| **IQG-RIDE-DH-05** | Default = job-of-record (office > teacher). Never default Parent. |
| **IQG-RIDE-DH-06** | **My children** deep-link without seat flip — **not** Ride SoT; does not satisfy DH-01 alone. |
| **IQG-RIDE-DH-07..09** | Leave/check-in only parent-seat Ride family; reverse Office/Teach from parent seat; client preference + atomic switch (full text in pm-lock). |

**Q2 fold check (pm-lock §1.4):** drawer altitude only (not tray Ride on teacher); land `/parent`; no tray merge; one-sentence My children = deep-link vs Parent seat = altitude; **Ride requires Parent seat**; label **Parent** / a11y `Switch to Parent seat`; after My children / before Sign out; reverse Office/Teach from parent seat. **Match.**

**Post-stamp residual (eng, not law):** DEFECT CEO-1 FIX-NOW `t_6bccc492` — implement Parent seat row MATCH §31.4b. **No** staff Ride tab invent.  
**AC (prove-out QE3):** DH-01..07 / CEO-1-01 / D-HAT-01..06 / C-06 (Ride ≤3 taps after Parent; no staff Ride tab; no tray merge; My children ≠ Ride).

### 6.2 P0/P1 — Multi-vehicle pick at sign-in (CEO must-case #3) vs pack L2 — **LOCKED = (A) / WONTFIX**

| Law ID | Lock |
|---|---|
| **IQG-RIDE-MV-01** | **Keep L2:** Vehicles on parent (incl. grandma/nanny) with today/range/indefinite. **No self-pick of own car at shutter / check-in.** |
| **IQG-RIDE-MV-02** | Check-in binds **line + this-stop children + ahead photo or I’m first** — not parent-chosen `vehicle_id`. Bumper identity = car-behind photo, staff walk, or staff attach. |
| **IQG-RIDE-MV-03** | CEO “multiple cars — pick at sign-in” = **WONTFIX / non-goal v1** (`ride-iqg-pm-lock.md` §2.1 reason; disposition `t_6d13eb49`). |
| **IQG-RIDE-MV-04** | **Rejected v1:** (B) override L2 this-trip car at check-in; (C) pick only when ≥2 valid vehicles. |
| **IQG-RIDE-MV-05** | Eng card `t_a4c0d6bd` (multi-vehicle check-in pick) stays **blocked / WONTFIX path** — do not implement pick without a future CEO override epic. |
| **IQG-RIDE-MV-06** | Live already matches (A): `parentCheckIn` has no vehicle field; security test bans `p_vehicle_id` on check-in RPC; vehicles CRUD separate. |

**Owner:** **PM** — closed 2026-09-10 (`t_a5ec7303` lock + `t_6d13eb49` disposition). **Designer: none.**  
**AC:** MV-01..05 / CEO-3-01..02 — **pass when pick UI absent** and vehicles CRUD still works; implementing pick without new epic = **fail**.

**Prior gap text (superseded):** CEO example vs pack L2 had no PM override lock analogous to leave; that conflict is **disposed WONTFIX**, not overridden.

### 6.3 P1 — Paper pack L-08 parent leave — **RECONCILED**

| Law ID | Lock |
|---|---|
| **IQG-RIDE-L08-01** | `car-rider-acceptance.md` **no longer** lists void ban “Parent cannot checkout themselves” as live law. |
| **IQG-RIDE-L08-02** | Live L-08 / L-08a / L-08b match `ride-parent-checkout-pm.md` §2 replacement (CEO 2026-09-09). Parent **can** leave → `left`; cannot mint `released`; staff `released` remains pickup. |
| **IQG-RIDE-L08-03** | L5 clarified: photo ≠ `released`; parent `left` ≠ `released`. Leave chrome **not** changed on this card (Option A + §13.13b stand). |

**Owner:** **PM** closed 2026-09-10 on `t_a5ec7303` (acceptance paper + this intent). Leave A/B/C not reopened.  
**AC:** L08-AC-01..02 — acceptance pack matches leave replacement; void ban gone.

### 6.4 P1 — Leave-line + Parent-seat **engineering** not proven shipped (post-stamp FIX-NOW)

| Law ID | Status |
|---|---|
| **IQG-RIDE-ENG-01** | Parent self check-out eng = FIX-NOW CEO-2 (`t_6f5ec4a9` / leave family). Multi-vehicle **pick** eng (`t_a4c0d6bd`) = **WONTFIX path** under §6.2 (A) — not a missing ship. Parent seat chrome row = FIX-NOW CEO-1 (`t_6bccc492`). Photo/LPR + tray Ride + vehicles CRUD + icon shipped. |
| **IQG-RIDE-ENG-02** | Dual stamps **APPROVED** at Q2. **Prove-out QE3** must verify live leave Option A + Parent seat DH-01..07 + MV-01 pass=no picker — loop `passed` ≠ product-complete. |
| **IQG-RIDE-ENG-03** | CoS **may** staff Eng FIX-NOW (leave + Parent seat) now that both DESIGN STAMP lines APPROVED. Do **not** staff pick UI. Do not staff devops-release until QE3 + open P0/P1 clear. |

### 6.5 Advisories (non-blocking stamp checklist; still in prove-out)

| ID | Note |
|---|---|
| **IQG-RIDE-ADV-01** | Super archive vs admin cannot archive — already L10/H-10; keep in prove-out. |
| **IQG-RIDE-ADV-02** | 7-day purge photos+events; archive exemption photos only — H-08/H-09. |
| **IQG-RIDE-ADV-03** | Token `/parent` deny; no anon; no Ask tool; not a grade. |
| **IQG-RIDE-ADV-04** | Wordmark titles.ts still may say “Car rider” in code paths — chrome law says **Ride**; polish P3 if live mismatch. |

---
## 7. Must-include behaviors (stamp checklist)

1. Parent tray **Home · Ride · Ask**; IconName `ride` (RearPlate); no invent View-stroke.
2. Check-in = photo ahead **or** I’m first **per line** — not placard, not GPS.
3. Success own **XX** only; fail **Check in failed** with **no reason**.
4. **Enter and leave:** parent `left` while waiting; staff `released` = pickup; photo ≠ left ≠ released.
5. Leave Option A: trip card owns Ghost **Leave line**; ConfirmSheet **Leave line** / **Keep waiting**; hub-only; no vehicles Leave.
6. Leave trip-scoped children only; no partial leave; no household leave-all; no undo restoring XX.
7. Staggered: leave/release line A → check-in line B other children; two lines independent.
8. Vehicles CRUD + validity (today/range/indefinite); grandma/nanny cars; void.
9. **Multi-vehicle at sign-in:** **LOCKED (A)** Keep L2 — no parent self-pick; CEO pick **WONTFIX** v1 (`ride-iqg-pm-lock.md` §2). CRUD + validity still required.
10. Dual-hat: never merge trays; office/teacher **no** Ride tab; Ride on **parent seat** tray; **G3 path locked (a) + §31.4b folded** §6.1.
11. Office dismissal under **Manage** altitude; superintendent archive only.
12. Twins fail closed; restriction fail-closed; LPR never inserts people; duty wall not `is_staff`.
13. Firehose ban: no neighbor plates, no line total, no “of N.”
14. 7-day purge; private storage; no Ask dismissal tool; not a grade / no Approve.
15. Student: no Ride UI.

---

## 8. Explicit non-goals (not “done”)

| Non-goal | Why |
|---|---|
| Placard / keypad / poles / RFID check-in | Pack out |
| GPS order or geofence auto-leave | Pack ban; false leave |
| Auto-release / auto-leave on LPR own plate | Photo ≠ released; LPR ≠ presence |
| Parent mints `released` / “mark picked up” | Curb only |
| Office / teacher / student Ride tray tab | Chrome law |
| Neighbor plates, school line map, “of 40” | Firehose |
| Reason codes on check-in/leave fail | Restriction copy law |
| One-tap leave; type-to-confirm; hold-3s; Danger Leave | Leave lock |
| Timed undo restoring prior XX | Graph honesty |
| Partial leave / leave-all-lines | Twins + staggered |
| Nanny own-login leave | Out of v1 |
| SMS leave; face-match driver | Out of v1 |
| Ask tool leave or line photo ingest | No Ask tool |
| Subpoena desk; public photo URLs | Pack |
| Gradebook row / Approve path | MVP law |
| Parent self-pick own car at check-in / shutter | Lock **(A)** Keep L2; CEO-3 **WONTFIX** v1 |
| Reopen Ride icon A/B/C or leave A/B/C | Locked |
| Git ship / devops-release from this IQG card | Prove-out first |

---

## 9. Regression walls (must still hold)

| Wall | With Ride present |
|---|---|
| Matcher never inserts student | Hold |
| Nothing is a grade until teacher Approves | Ride is not a grade path |
| Model / vision keys server-side only (no `EXPO_PUBLIC_` LPR) | Hold |
| LPR never inserts people | Hold |
| Duty wall — not blanket `is_staff` queue read | Hold |
| Token `/parent` / anon parent deny | Hold |
| Twins fail closed / no unlabeled mash-up | Hold |
| Parent DTO: own trip/XX/children only | Hold |
| Private line photo storage | Hold |
| 7-day purge (+ super archive exemption on photos) | Hold |
| No Ask dismissal tool | Hold |
| Trays never merge on dual-hat seat switch | Hold |
| Staff `released` remains after parent `left` ships | Hold |

---

## 10. Prove-out OBJECTIVE

**QE1** (plan): `ride-iqg-testplan.md` — staffed/done.  
**QE2** (pre-lock execute): `ride-iqg-execution.md` — pre-lock FAILs expected; **not** a claim of product-complete.  
**QE3** (post-impl prove-out): CoS staffs `qa-engineer` **after** Eng FIX-NOW leave + Parent seat terminal. Execute against dual-APPROVED stamp. Do not declare RIDE product-complete without QE3. Do not run kelyra-qa-loop here. Do not staff devops-release from this card.

**OBJECTIVE (paste onto QE3 — post-impl):**

```
OBJECTIVE:
Execute RIDE prove-out against dual-APPROVED stamped intent (notes/company/ride-iqg-intent.md Q2 t_5546cf61). Reuse/extend ride-iqg-testplan.md. Land evidence notes/company/ride-iqg-execution-qe3.md (or append QE3 section). File DEFECT [sev] cards on board kelyra for any miss vs stamp — do not bury only in comments.

SoT: ride-iqg-intent.md (both stamps APPROVED), ride-iqg-pm-lock.md, ride-parent-checkout-pm.md + lock Option A, docs/ui-design.md §3.4 · §13.13b · §31.4b Parent seat · §34.2 · §36 · §37, car-rider-*.md, live src parent/ride + vehicles + chrome trayTabs/seat + drawer.

MANDATORY PASS ROWS (post Eng FIX-NOW):
1. DH-01..07 (pm-lock §4): Parent drawer row; Ride ≤3 taps; teacher/office never Ride tab; leave/check-in parent-seat only; no tray merge; office+parent same path; My children orthogonal (not Ride SoT); cold start not Parent.
2. Leave Option A (CEO-2): trip card Ghost Leave line; ConfirmSheet Leave line / Keep waiting; event kind=left not released; trip children only; staggered A→B; no leave when not waiting; hub-only; no vehicles Leave; staff released still works; no parent released; no undo XX.
3. MV-01 (CEO-3 lock A): PASS when vehicle pick UI is ABSENT at check-in/shutter; CRUD still works; invent pick without CEO epic = FAIL.
4. CEO must-cases evidence: CEO-1 dual-hat Ride via Parent seat; CEO-2 leave without staff; CEO-3 no pick + CRUD.
5. Regression walls: firehose; LPR no people; duty wall; trays never merge; token deny; not a grade; student no Ride; paper L-08 leave replacement.

CASES: D-HAT-01..06, C-06, P-LEFT-01..12, MV-01/CEO-3-01..02, plus smoke P-IN / P-VEH / S-CURB / S-OFF from testplan.

CONSTRAINTS: No eng implement on QE3; no git ship; no devops-release; no kelyra-qa-loop. If FIX-NOW eng not live yet, BLOCKED rows + dependency — do not pass by omission.

RECOMMENDED NEXT ACTION after QE3: open P0/P1 → PM disposition → FIX-NOW; QA Supervisor release evidence only when stamp met + P0/P1 clear/in-flight; only then CoS may staff devops-release.
```

**QE1 OBJECTIVE (historical — plan already landed):** plan+cases in `ride-iqg-testplan.md` covering hats/chrome/enter/leave/multiplicity/integrity; CEO-1 under lock (a); CEO-3 under lock (A). Keep for regression reference.
---

## 11. Process / handoff

| Field | Value |
|---|---|
| **QA Supervisor stamp** | **APPROVED** 2026-09-10 · Q2 `t_5546cf61` / qa-supervisor (re-stamp after PM+D3) |
| **PM stamp** | **APPROVED** 2026-09-10 · `t_a5ec7303` + disposition **FIX-NOW** `t_6bccc492` / product-manager — §6.1 **(a)** Parent seat · §6.2 **(A)** Keep L2 / CEO pick WONTFIX · §6.3 paper L-08 **reconciled** |
| **Designer** | Parent-seat §31.4b fold **landed** (`t_a6400dea`). **Not** multi-vehicle pick chrome (WONTFIX). |
| **DESIGN STAMP (both)** | **Dual-APPROVED** — eng gate open for FIX-NOW only (leave + Parent seat). Not product-complete. |
| **Engineering** | CoS **may** staff Eng FIX-NOW: CEO-1 Parent seat (`t_6bccc492`) + CEO-2 leave (`t_6f5ec4a9`). **Do not** staff pick UI (`t_a4c0d6bd` WONTFIX). **No** staff Ride tab. Shipped photo/LPR/tray/vehicles CRUD remain. |
| **QE3** | After Eng FIX-NOW terminal → CoS staffs `qa-engineer` from §10 OBJECTIVE (DH-01..07, leave Option A, MV-01 pass=no picker). |
| **devops-release** | **Do not staff** until QE3 pass + open P0/P1 clear/in-flight + QA Sup release evidence. |
| **RESULT** | Q2 re-stamp **APPROVED**. Intent gaps remaining: **none**. Law complete (hats, dual-hat, enter+leave, multiplicity WONTFIX pick, chrome). Live leave/Parent-row = eng FIX-NOW after stamp. |

### RECOMMENDED NEXT ACTION (CoS)

1. **Staff Engineering FIX-NOW** — Parent seat chrome MATCH §31.4b (`t_6bccc492`) + leave-line Option A (`t_6f5ec4a9` / leave family). Run kelyra-qa-loop on those Build sends only.
2. **Do not staff** multi-vehicle pick eng (`t_a4c0d6bd` WONTFIX path). **Do not** add Ride to teacher/office tray.
3. **After Eng terminal** → staff `qa-engineer` **QE3** with §10 OBJECTIVE (DH-01..07, leave Option A, MV-01 pass=no picker).
4. **Do not staff devops-release** until QE3 + QA Sup release evidence.
5. Do not treat shipped photo/LPR/tray as IQG complete while CEO-1 Parent seat and CEO-2 leave live prove-out remain open. **CEO-1 law closed (a)+folded; eng FIX-NOW.** **CEO-2 law closed Option A; eng FIX-NOW.** **CEO-3 closed as WONTFIX (A).** **Paper L-08 closed.**

---

*End RIDE IQG intent — car-rider line · DESIGN STAMP QA Supervisor APPROVED 2026-09-10 (Q2 `t_5546cf61`). Dual stamp met.*
