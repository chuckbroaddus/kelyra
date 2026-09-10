# UX audit → UI/UX spec tasks (research + docs)

**Date:** 2026-09-09  
**Author:** ui-ux-designer (post QA audit card)  
**Inputs:** `notes/company/ux-audit-report.md`, `docs/ui-design.md` (§1–§37), related chrome skills / Ride decision notes  
**Owns:** `docs/ui-design.md` and related UI design notes  
**Does not:** implement app code, patch the spec in this card, choose product fixes (PM), run research-feedback, file kanban cards  

**Sibling:** PM mismatch/fix proposals are a separate card. This file is **spec sufficiency only**.

---

## 1. Verdict

**Spec is lacking in a few real places — not “insufficient for chrome/IA overall.”**

`docs/ui-design.md` is **strong enough** for a structural chrome audit on teacher, office, header slots, hide-on-scroll physics, badges, person tabs, and TEACH-UX tray nouns. QA’s “many SPEC-GAP on exact visuals” overstates several clauses that already carry numbers, tables, and recipes.

**True gaps** that blocked or weakened fair audit (or will block the next one):

1. **Ride is outside the design SoT** — parent tray and office dismissal surfaces are not folded into `ui-design.md`.
2. **Internal tray contradictions** — early §3.4 still says 2-tab student/parent trays; later §31 / §34 lock student 6-tab and parent Home·Ask.
3. **Dual-hat parent altitude** — office/teacher seat is specified; parent hat vs full parent **seat** (tray including Ride) is ambiguous.
4. **Pre-auth orientation vs §6.1** — product bar (portrait-only pre-auth phones) conflicts with “do not lock any screen.”
5. **Signed-out splash media contract lag** — §13.1/§13.2 lag the hold-still + crossfade law in the signed-out skill.

Everything else in the audit SPEC-GAP list is either already specified, is implementation drift for PM, or is optional P3 doc hygiene.

**CoS:** file sticky research/docs only from §3–§4 below after accepting this list. Do not re-open a broad “pixel every screen” research program.

---

## 2. Audit SPEC-GAP triage

| Audit claim | Designer call | Why |
|---|---|---|
| Exact parent Ride / student tray icon names missing | **Partial real** | Student 6-tab **is** locked in §31.1 / §34.2. Parent Ride is **not** in `ui-design.md`. Early §3.4 still wrong. |
| Hide-on-scroll easing / distance / 180 ms missing | **Not a gap** | §9.2–§9.3 already: dy 12 / −8, vy ±1.2, **180 ms**, `Easing.out(Easing.cubic)`, tray translate formula. |
| Web header height / tray / rotation under-specified | **Mostly not a gap** | §3.2 heights, §3.8 top bar 48 + labels, §6 breakpoints. Residual: browser must not hard-lock orientation (skill-only). |
| ListRow / shelf pixel anatomy incomplete | **Not audit-blocking** | §7 decision tree + §10.6–§10.9 anatomy exist. Optional P3 polish matrices only. |
| Dual-hat wordmark / seat transition visuals | **Partial real** | §31.4b / §37 seat preference exists. Missing: control placement, transition motion, wordmark swap timing, **parent** as third seat. |
| Badge sources incomplete | **Not a gap** | §11 is explicit (messages alerts vs Needs `countNeedsYou` vs student/parent rules). |
| Swipe-delete confirm copy thin | **P3 hygiene** | §20 ConfirmSheet + type-the-name is the decision; optional copy table. |
| Person-page tab web behavior | **Not a gap** | §32 is detailed (icons, selected name, landscape). |
| Camera proposal interaction | **Not a gap** | §14 is detailed. |
| Office tray not in §3.1 | **Not a gap** | §3.4 one-liner + §31 + §36 full tables. |

**Coverage limit (honest):** QA was static-only. That weakens **verification**, not necessarily **spec**. Visual QA is PM/Engineering dogfood — not a designer research track unless a recipe is missing.

---

## 3. Real gaps → research + documentation tasks

Order is suggested for CoS sticky filing. **Wait** = whether PM/Engineering should block on the doc/research before shipping related chrome.

### G1 — Ride chrome in design SoT  
**Priority:** P1  
**Label:** audit + **designer-identified** (product shipped; SoT silent)

| | |
|---|---|
| **Missing decision** | Canonical parent tray composition with Ride; office entry points (Manage “Dismissal curb”, duty surfaces); header title / wordmark on `/ride` and curb; icon name `ride` (already PM-locked in `ride-icon-decision.md`); non-goals (no student Ride, no sixth teacher tab). |
| **Seats / surfaces** | Parent tray + `/ride` (and related parent check-in); office Manage / curb / stage as applicable; dual-hat parent altitude (see G3). |
| **Research (research-feedback)** | **Optional / light.** Prefer fold existing artifacts: `car-rider-{research,plan,architecture,acceptance}.md`, `ride-icon-{research,options,decision}.md`. Only staff new research if CoS finds those packs incomplete on **chrome IA** (not LPR/backend). Sample questions if needed: (1) In parent dismissal apps, is curb check-in a peer tray tab or a Home card? (2) Should staff curb live under Manage only or also a duty-mode chrome override? |
| **Documentation update** | Patch `docs/ui-design.md`: reconcile **§3.1 / §3.4 / §3.5 / §31.1 parent tray** to include Ride; add screen recipe (new §13.x or §25 delta) for parent Ride + pointer to office Manage row; record **IconName `ride`** and recipe ownership via `npm run icons` (no invented View-stroke). Optionally short `notes/company/ride-chrome-ia.md` if the delta is large — still point SoT to `ui-design.md`. |
| **Future designer options?** | **No** new visual pack unless PM reopens icon (already LOCKED RearPlate / `ride`). IA-only doc. |
| **Suggested order** | **1st** among real gaps (audit already tripped on it). |
| **PM/Eng wait?** | **Icon swap:** no (decision locked). **Any new Ride tray/IA change:** wait until this doc delta is accepted so audit/PM stop thrashing §3.4 vs code. |

---

### G2 — Reconcile tray tables (student + parent) inside `ui-design.md`  
**Priority:** P1  
**Label:** **designer-identified** (internal contradiction; audit treated as “missing”)

| | |
|---|---|
| **Missing decision** | Not a new product pick — **which section is law**. Later ship locks win unless PM reopens: Student = Assignments · Feeds · Classes · Grades · People · Ask (§31.1 / §34.2). Parent = Home · Ask historically; Ride must be decided via G1. §3.1 “shorter tray” language vs student 6-tab density needs one sentence of intent (shorter than office junk / no camera — not “always ≤2 icons”). |
| **Seats / surfaces** | Student tray; parent tray; §3.1 visibility table; §3.5 wordmark rows that already name student Feeds/Classes/Grades/People. |
| **Research** | **None.** Do not run competitor density studies to justify the already-shipped student tray. |
| **Documentation update** | Single pass: rewrite §3.4 Student/Parent tables to match §31/§34 (+ G1 Ride); fix §3.1 “shorter tray” gloss; ensure §3.5 / §34.2 / §37 do not disagree. Mark superseded lines explicitly (date). |
| **Future designer options?** | Only if PM reopens student density as product (would be a separate options pack — **not** this card). |
| **Suggested order** | **2nd** (can ship same docs sticky as G1). |
| **PM/Eng wait?** | **No** for mismatch fixes that already follow §31/§34. **Yes** only if Engineering is about to “correct” student tray back to 2 tabs from stale §3.4. |

---

### G3 — Dual-hat seats: parent altitude + switch chrome  
**Priority:** P1  
**Label:** audit (partial) + **designer-identified**

| | |
|---|---|
| **Missing decision** | (A) Does `also_parent` only add hamburger **My children**, or is there an explicit **parent seat** that swaps to full parent tray (Home · Ride · Ask)? (B) Where does the seat control live (drawer rows, order, copy)? (C) Wordmark / logo / header extras during and after switch. (D) Motion: instant replace vs short transition (spec currently silent — default should stay “no theatrical morph”). (E) Never-merge-trays remains law. |
| **Seats / surfaces** | Office ↔ teacher (mostly specified); office/teacher ↔ parent; pure parent login; hamburger identity + seat rows; tray rebuild on seat change. |
| **Research (research-feedback)** | **Yes — narrow.** Questions for staffing: (1) How do multi-role school apps present “I am also a parent” — mode switch vs deep link into child view while staying in staff chrome? (2) Failure modes when staff parent-hat lands on Ride during duty hours (context loss, wrong tray density). (3) Do teachers expect parent tools without leaving teacher seat? Deliverable: cited patterns + recommendation **for PM**, not a locked pick by research. |
| **Documentation update** | After PM picks: extend §31.4b + §37 dual-hat table; document seat enum `office \| teacher \| parent` (or confirm parent remains non-seat); drawer row order; wordmark rules on switch; non-goals (no merged mega-tray). |
| **Future designer options?** | **Yes — future designer options task** only if PM wants alternative seat-switch **placements** (drawer-only vs header chip vs profile). Not drawings in this card. |
| **Suggested order** | **3rd** (research → PM pick → designer docs). |
| **PM/Eng wait?** | **Yes** for any dual-hat parent-seat or Ride-for-staff-parent chrome work. Office↔teacher already has enough law to implement/fix drift. |

---

### G4 — Pre-auth orientation lock vs §6 Rotation  
**Priority:** P1 (product bar)  
**Label:** **designer-identified**

| | |
|---|---|
| **Missing decision** | Canonical rule: phones **pre-auth** (splash / login / pre-session join) **portrait-only**; **after sign-in** unlock; **web** never hard-locks browser orientation. §6.1 currently says unlock everything / do not lock any screen — that fights CEO product bar and signed-out skill. |
| **Seats / surfaces** | Signed-out splash, `/sign-in`, pre-session `/join`; post-auth all seats; web. |
| **Research** | **None.** Already operating law; fold into SoT. |
| **Documentation update** | Patch §6.1 with explicit pre-auth lock + post-auth unlock + web exception; cross-link §13.1/§13.2; one line in §3.1 signed-out row if useful. |
| **Future designer options?** | No. |
| **Suggested order** | **4th** (docs-only, fast). |
| **PM/Eng wait?** | **No** if code already matches product bar; **yes** if someone “fixes” orientation from stale §6.1. |

---

### G5 — Signed-out splash / login media + layout contract  
**Priority:** P1 (regressions are costly)  
**Label:** **designer-identified** (skill ahead of SoT)

| | |
|---|---|
| **Missing decision** | Hold-still JPG always mounted; video only while animating; crossfade opacity before clip end; keep player mounted at opacity 0 until audio ends; CEO still assets; neon CTA; one-screen splash+credentials; form y-stability; web unmute vs skip. §13.1 still reads like “hold final frame of MP4” / older player assumptions. |
| **Seats / surfaces** | Signed-out home, `/sign-in`, web + native splash. |
| **Research** | **None** for architecture (postmortem already in skill references). Optional research only if PM reopens splash creative — out of scope here. |
| **Documentation update** | Rewrite §13.1 signed-out + §13.2 to match `kelyra-signed-out-landing` contract (still layer, crossfade ratios as named constants, expo-video native / HTML5 web, no expo-av). Point to skill for implementer pitfalls; SoT must not contradict. |
| **Future designer options?** | No unless CEO requests new splash creative. |
| **Suggested order** | **5th** (docs sync; prevents false MISMATCH on next audit). |
| **PM/Eng wait?** | **No** for ongoing splash hotfixes that follow the skill. **Yes** before any “simplify splash” that reverts to opaque last-frame-only. |

---

### G6 — Dual-hat / seat wordmark matrix (thin)  
**Priority:** P2  
**Label:** audit

| | |
|---|---|
| **Missing decision** | One table: seat × active tray key → wordmark string + logo/mark exception (Ask = KelyraMark). Mostly derivable from §3.5 + §31.4b once G3 lands. |
| **Seats / surfaces** | Header wordmark all staff seats. |
| **Research** | **None.** |
| **Documentation update** | Add a compact matrix under §3.5 or §37 after G3. |
| **Future designer options?** | No. |
| **Suggested order** | After G3. |
| **PM/Eng wait?** | No. |

---

## 4. Explicit non-tasks (do not file as research)

- Hide-on-scroll re-research or new motion studies (§9 is enough).  
- Exhaustive pixel specs for every ListRow instance.  
- Competitor deep-dive to re-litigate teacher five-tab TEACH-UX.  
- Badge formula redesign (§11).  
- Person-tabs web redesign research (§32).  
- Camera/proposal flow research (§14).  
- Visual option packs for Ride icon (LOCKED).  
- Duplicating PM Engineering mismatch list from audit section (A).

---

## 5. Residual doc hygiene (optional P3)

Only if a docs sticky has spare capacity — **not** a research program:

1. Supersession banners on §3.7 “new surfaces” vs shipped reality.  
2. §20 confirm copy table (class delete type-the-name strings).  
3. §3.8 one-liner: web does not use `expo-screen-orientation` locks.  
4. Cross-links from §36 Manage pane to Ride office rows once G1 exists.  
5. Fix stale “bell” wording remnants where §34 already says messages/mail.  
6. §13.3 header title still says **Kelyra** in one place while §37 desk wordmark is class name — reconcile desk title only (TEACH-UX already chose class name).

---

## 6. Suggested sticky order (CoS)

| # | Sticky | Type | Blocks |
|---|---|---|---|
| 1 | G1 + G2 docs pass (Ride fold-in + tray table reconcile) | documentation (designer) | Confused audits; stale 2-tab “fixes” |
| 2 | G3 dual-hat parent altitude | research-feedback → PM pick → designer docs | Staff-parent Ride / seat work |
| 3 | G4 + G5 orientation + splash SoT sync | documentation (designer) | Orientation/splash thrash |
| 4 | G6 wordmark matrix | documentation | None |
| 5 | P3 hygiene list | documentation optional | None |

**Designer recommendation only (not a lock):** accept gaps G1–G5 as the real program; treat most of QA’s SPEC-GAP bullet list as triage noise once §2 is applied.

---

## 7. Acceptance for this card

- [x] `notes/company/ux-audit-spec-tasks.md` exists  
- [x] Verdict is **lacking (targeted)**, not a fake empty research slate and not “sufficient with only P3”  
- [x] Each real gap names decision, seats, research questions (or none), docs section, order, wait flag  
- [x] No app code, no `docs/ui-design.md` edit in this card, no research run, no kanban cards created  
- [x] PM implementation mismatches left to sibling card  

**Recommended next action:** `kanban_complete`. CoS files research/docs stickies only after accepting this list.
