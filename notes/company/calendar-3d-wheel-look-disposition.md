# PM disposition — DEFECT [P1] CAL-3DW PR 150 look misses 3D wheel mockup

**Date:** 2026-09-20  
**Card (PM):** `t_e9be1840`  
**Defect:** `t_2363fd64`  
**Parent (sticky IQG):** `t_3af8f514` — do not unblock  
**Live tree:** PR 150 merged `1b7ea97` on `main`  
**Scope:** Docs only. No `src/`. No designer restaff. No stamp redo.

---

## Verdict

| Field | Value |
|-------|-------|
| **SEVERITY** | **P1** (confirmed) |
| **DISPOSITION** | **FIX-NOW** |
| **Stamp conflict?** | No — live misses dual-stamped CAL-3DW drum look |
| **CEO escalate?** | No (not P0 prod/legal/spend; stamp chrome miss; CEO already asked fix) |
| **Implement on this card?** | **No** — disposition paper only |

---

## Why FIX-NOW

1. **Dual stamp is binding.** PM lock `calendar-3d-wheel-pm-lock.md` (`t_9cb5585d`) + QAS intent `calendar-3d-wheel-intent.md` (`t_c28b495d`) lock a horizontal 3D drum of **Set B hanging-ledger** icon tiles (CAL-3DW-01…18). Designer SoT: `calendar-3d-wheel-spec.md` + HTML mockup `calendar-3d-wheel-mockups/index.html` (`t_f2203851`). Stamp is not optional skin.
2. **CEO + CoS Chrome reject the live look.** 2026-09-20 Chuck: PR 150 merged; live does **not come close** to the HTML SoT. CoS compared QA Chrome 9223 live Teach `/calendar` @ 390 vs mockup tab + headless shots under `notes/company/calendar-3d-wheel-live-shots/`.
3. **Primary chrome, all hats.** Period drum replaces only the period row (`<<` / label / `>>` and PR 149 pills). Stamp miss on Teach is a P1 lifecycle/chrome miss for every hat that mounts the wheel (CAL-3DW mount matrix).
4. **IQG severity guide.** P1 = stamped behavior missing for a primary hat or lifecycle. 5-slot Set B drum + leaf identity (CAL-3DW-02/05/10/16, AC-M01, geometry §2) are binding, not polish.
5. **Same law as PR 149.** Precedent `calendar-period-pager-look-disposition.md`: **merged SHA is not look-pass.** PR 150 body admitted SoT notes were absent on origin at implement ("Hermes-brief defaults") — that explains the miss; it does not excuse shipping past stamp.
6. **Not WONTFIX / DEFER / SCHEDULE.** Leaving main as-is leaves dual stamp unmet. CEO already asked CoS to staff a fix. FIX-NOW lets CoS staff Eng without a second Chuck ask.

**Not SCHEDULE:** would leave main green on claim but red vs stamp. **Not DEFER:** CEO already rejected live look. **Not WONTFIX:** would void dual stamp without written CEO override. **Not restamp:** laws did not change — live missed stamp.

---

## Severity confirm

| Guide | Fit |
|---|---|
| P0 | No — no data loss / wrong grade / blocked school workflow beyond chrome look |
| **P1** | **Yes** — stamped 3D Set B period drum missing on primary Calendar chrome for Teach (and all hats that share the row) |
| P2 | Too low — not secondary-hat-only; no honest workaround that meets stamp |
| P3 | No — CEO + CoS treat as stamp miss, not polish |

Severity **stays P1**. Do not inflate to P0; do not downgrade to P2/P3.

---

## Live vs stamp (Chrome evidence)

**Evidence paths (CoS / QA Chrome 9223, 2026-09-20):**

- Mockup SoT shot: `notes/company/calendar-3d-wheel-live-shots/mockup-page.png` (+ `.jpg`)
- Live Teach `/calendar` 390: `live-calendar-year.png`, `live-calendar-month.png`, `live-calendar-week.png`, `live-calendar-day.png` (+ `.jpg` copies)
- Mockup also open as QA Chrome `file://` tab next to live `/calendar`
- Stamp geometry: `notes/company/calendar-3d-wheel-spec.md` §2 · HTML `notes/company/calendar-3d-wheel-mockups/index.html`
- Dual stamp locks: `calendar-3d-wheel-pm-lock.md` · `calendar-3d-wheel-intent.md`

| Grain | EXPECTED (stamp + mockup) | ACTUAL (live Chrome) | Stamp IDs |
|---|---|---|---|
| **Form / window** | Horizontal **3D drum**; prefer **5** visible slots (center ±2); pitch **78**; hero **108×126**; perspective **920**; rotateY ≈ **−14° × d** | **2–3** elevated **icon cards** (Year shows ~2: `2026` + `'27`); no 5-slot hanging drum; flat-ish card row | CAL-3DW-02, CAL-3DW-05, AC-M01, geometry §2 |
| **Year leaf** | Full-red hanging ledger; center white **4-digit** year; sides **`'YY`**; **two metal tabs**; Set B hex fixed | Dark **theme card** + **three red bars** YearIcon + year text; **no metal tabs**; not full-red ledger page | CAL-3DW-02/16, §3.1 Year, CAL-3DW-10 |
| **Month leaf** | Red `MONTH YYYY` header · white body grid · **Sunday red** · tabs; sidecar = **real neighbor grid** | Theme-elevated card art (not Set B ledger grid leaf) | CAL-3DW-16, §3.2 Month |
| **Week leaf** | Double-height red wrap (`JUN 8–14` / year) · **7-day strip** · Sunday cue | Theme card / week dots — not hanging-ledger strip identity | CAL-3DW-16, §3.3 Week |
| **Day leaf** | Double-height red wrap · **large black day numeral** · tabs (not rings) | Theme card / day circle — not large-numeral ledger | CAL-3DW-16, §3.4 Day |
| **Theme** | Light/dark **chrome plate** only; **leaf Set B hex unchanged** across themes | Leaf uses **theme elevated/line/danger** recolor | CAL-3DW-10 |
| **Motion curves** | scale/opacity/rotateY formulas + Z lift from spec; spring ~300 ms | `periodWheel.ts` **Hermes-brief** defaults: perspective **900** vs **920**; max rotateY **48°** vs ~**14°/slot**; spacing ratio **0.72** vs pitch **78** | CAL-3DW-06/07, geometry §2, AC-M01…M05 |

**PM read of live Year shot:** PersonTabs Year·Month·Week·Day present (HOLD — not this defect). Period row is two dark rounded cards with bar glyphs + `2026` / `'27` over the January–June year grid — **not** the mockup’s five full-red hanging ledgers with metal tabs and 3D tilt hierarchy.

**Impl hotspots (INSPECT only — for Eng shape, not a fix here):**

- `src/components/calendar/PeriodPager.tsx` — recycles **prev/current/next** only (3-tile window); pageWidth/3 layout
- `src/components/calendar/PeriodLeaf.tsx` — theme-elevated cards + `YearIcon` bars / week dots / day circle; not Set B hanging-ledger SVG/View family
- `src/lib/calendar/periodWheel.ts` — Hermes-brief perspective/rotateY/spacing vs stamped curves
- PR 150 admitted SoT paths absent on origin at implement

---

## FIX-NOW Eng shape (do not implement here)

**Goal:** Make live period drum match dual stamp + Chuck-approved HTML mockup on phone (Teach `/calendar` 390 and device). Runtime View/Text (and/or one SVG template family) only — still **no** PNG atlas / `build-icons` / chip PNGs as tiles (CAL-3DW-16 HOLD).

### Must land (acceptance for Eng child)

1. **Window (CAL-3DW-05 / AC-M01):** At rest prefer **five** visible tiles (center ±2); never ship two-tile-only. Pitch **P = 78** on 390 stage; hero box **108 × 126**.
2. **Geometry (spec §2 / pm-lock §2):** Perspective **920px**, origin `50% 45%`; scale/opacity/rotateY/`z(d)` formulas from SoT (`rotateY = clamp(d,-3,3) * -14`); composite `translateX(d*P) · translateZ(z) · rotateY(ry) · scale(s)`. Drop Hermes-brief 900 / 48° max / 0.72 spacing as ship defaults.
3. **Year leaf (CAL-3DW-02/16 §3.1):** Full-red ledger page `#C62828`; center white four-digit year; sides `'YY`; **two metal tabs** (`#B0BEC5` / highlight `#ECEFF1`). No three-bar YearIcon as the ship identity.
4. **Month leaf (§3.2):** Red `MONTH YYYY` header; white body grid + gutters; **Sunday red** `#E53935`; tabs; sidecars show **real neighbor month grid** (not empty stub).
5. **Week leaf (§3.3):** Double-height red wrap human range; body **7-day strip** with Sunday cue. No generic body caption `Range`.
6. **Day leaf (§3.4):** Double-height red wrap; body **large black day numeral**; tabs not rings. No generic body caption `Day`.
7. **Theme (CAL-3DW-10):** Light/dark tokens apply to **stage/chrome plate only**. Leaf Set B hex **unchanged** across themes (do not recolor ledger art from `colors.elevated` / theme ink).
8. **Motion (CAL-3DW-06…08 / AC-M01…M08):** 1:1 drag; momentum; spring snap ~300 ms; tap side → center (≥56×56 hit); center tap = Today / jump — no advance; period commits on snap complete only.
9. **RM (CAL-3DW-09 / AC-M11–M12):** Drop rotateY + Z/perspective; **keep** scale, opacity, integer snap, tap-to-center, hierarchy (never equal pills).
10. **Mount matrix (CAL-3DW-03/14/15):** Same component Y/M/W/D (+ multiday/agenda as locked); **Day List = no drum** (CAL-R5-11); view change resets window.
11. **Fail closed (CAL-3DW-17):** If wheel cannot paint → live `<<` / label / `>>` + center Pressable, same handlers.
12. **Regression + device prove:** unit/visual coverage for 5-slot rest + Y/M/W/D leaf identity; Teach phone/Chrome 390 shots vs `mockup-page.png` before claim closed. No PersonTabs/tray/CAL-40 drift.

### Eng constraints

- **No new SQL/RPC/Edge** (CAL-3DW-13).
- **No** designer restaff; **no** new option pack — HTML mockup + pm-lock remain SoT.
- **No** PersonTabs restyle; **no** tray G1; **no** CAL-40 period-as-back; **no** Day List drum.
- **No** PNG atlas / `build-icons` white-ink pipeline for dated leaves.
- Prefer fix in `PeriodLeaf` (Set B art), `PeriodPager` (5-slot window/geometry host), `periodWheel.ts` (curves from SoT). Keep live anchors/shifters/`jumpToday`.
- Do not thin stamp to “theme cards + Hermes-brief 3-tile is fine.”
- Do **not** edit `docs/ui-design.md` on this fix (CAL-3DW-18).

### Suggested Eng request shape (for CoS staff)

```
FIX DEFECT t_2363fd64 P1 FIX-NOW: CAL-3DW PR 150 look misses dual-stamped 3D wheel mockup on main 1b7ea97.
Match notes/company/calendar-3d-wheel-pm-lock.md CAL-3DW-01..18 + geometry §2 + AC-M01..M18
and notes/company/calendar-3d-wheel-mockups/index.html (+ spec.md).
Evidence: notes/company/calendar-3d-wheel-live-shots/{mockup-page,live-calendar-year,month,week,day}.png
Hotspots: PeriodLeaf.tsx (Set B hanging-ledger), PeriodPager.tsx (5-slot window), periodWheel.ts (SoT curves; drop Hermes-brief).
No PersonTabs/tray/CAL-40. No Day List drum. No SQL. No PNG atlas. No designer restaff.
```

---

## Explicit non-goals

- Reopen or restaff ui-ux-designer; new option packs Set A/C/D/E
- New PM lock / DESIGN STAMP redo (dual stamp already MET — this is prove/fix vs stamp)
- Unblock IQG parent `t_3af8f514`
- PersonTabs, tray G1, CR-CalTabs, CAL-40 period-as-hierarchical-back
- Day List continuous drum restore (CAL-R5-11 HOLD)
- Motion-only pass that keeps theme-elevated cards + 3-tile Hermes-brief window
- PNG atlas / `build-icons` / chip PNGs as period tiles
- New SQL/RPC/Edge
- Edit `docs/ui-design.md` on this fix
- Implementing on this PM card
- DITL rewrite by Eng (ditl-scribe / CoS sticky only if needed later)

---

## CoS next

1. Comment defect `t_2363fd64`: **DISPOSITION=FIX-NOW · SEVERITY=P1** + path to this file (PM does this on the defect thread).
2. **ARM GRANT** + staff **Engineering** (kelyra-qa-loop / bot-build; grok-bot-consultant bot-build if SuperGrok cannot GRANT) as child of `t_2363fd64`, linked to parent feature `t_3af8f514` (parent stays sticky blocked).
3. After Eng terminal: staff QE re-prove drum look LIVE/DEVICE vs `mockup-page.png` + pm-lock (not unit-only).
4. Do **not** ask PM to implement. Do **not** auto-complete the defect until LIVE matches mockup. Do **not** restaff designer.

---

## Handoff fields

| Field | Value |
|---|---|
| OBJECTIVE | Disposition DEFECT [P1] CAL-3DW PR 150 look vs dual-stamped mockup |
| CONTEXT | PR 150 `1b7ea97` main; dual stamp MET; CEO + CoS Chrome reject |
| REQUIREMENTS | SEVERITY + DISPOSITION + Eng shape if FIX-NOW; comment defect |
| CONSTRAINTS | Docs only; no src; no designer restaff; no unblock `t_3af8f514` |
| FILES/AREAS | `notes/company/calendar-3d-wheel-look-disposition.md` |
| WORK PERFORMED | Confirmed P1 FIX-NOW; mapped live misses to CAL-3DW laws; Eng shape |
| VERIFICATION | mockup-page.png + live-calendar-*.png + PeriodPager/Leaf/periodWheel INSPECT + IQG P1 guide + PR 149 precedent |
| RESULT | **FIX-NOW · P1** — CoS staffs Eng next |
| OPEN ISSUES | None for PM |
| ESCALATION NEEDED | No |
| RECOMMENDED NEXT ACTION | CoS → Eng child on `t_2363fd64` |

---

**Binding one-liner for defect card:**  
`DISPOSITION=FIX-NOW · SEVERITY=P1 · SoT notes/company/calendar-3d-wheel-look-disposition.md · Eng must match HTML mockup 5-slot Set B hanging-ledger drum; no PersonTabs/tray; no designer restaff; no SQL/PNG atlas.`