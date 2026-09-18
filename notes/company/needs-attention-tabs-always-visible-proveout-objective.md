# NEEDS — NT-A job tabs always visible — IQG Prove-out OBJECTIVE

**Date:** 2026-09-18 (America/Chicago)  
**Card:** `t_38911791` QAS: prove-out OBJECTIVE NT-A always-visible (PR 115 rework)  
**Author:** qa-supervisor (Kelyra)  
**Process:** `notes/company/INTENT_QUALITY_GATE.md` Phase 4  
**Against dual stamp:**
- PM restamp SoT: `notes/company/needs-attention-tabs-web-occlusion-defect.md` — **AC-NTA-VIS-01..07** (PM APPROVED `t_a9ff6c0a`)
- QAS always-visible intent: `notes/company/needs-attention-tabs-always-visible-intent.md` — **AV-01..12** (QAS APPROVED `t_b57ebbdf`; dual MET `t_c71f439a`)
- CEO lock 2026-09-17: C1–C7 (never hide web/phone; never occluded by tray; shared-hide REJECT)
- Base pack laws still bind: NT-A membership/icons/counts/default/noun (not reopened by this chrome fix)
**Implementation:** Eng `t_c7223c6f` · PR https://github.com/chuckbroaddus/kelyra/pull/115 **MERGED** · commit `49049aa0d0ce6b1d7e03612babbd5d9fb7d6c8b6` on `origin/main` — tabs sibling of tray; `/inbox` pins opacity 1; no shared hide unit; `ntaWebOcclusion.test.ts` **5/5 STATIC**. Live Teach `/inbox` **UNVERIFIED** at Eng close.  
**Supersedes:** parked OBJECTIVE `t_34c84cbe` (hide-with-tray / AC-WEB-* shared-hide). Do **not** prove that law.  
**Do not `--parent`:** `t_7ebaea27`  
**Noun:** Needs Attention (route `/inbox`; never “Inbox” Chuck-facing)  
**Status:** Prove-out **OBJECTIVE only**. **Do not execute tests here** (`qa-engineer`). No app code. No git. No SQL. No DESIGN STAMP redo. No merge from this card. **PLAN-ONLY / UNIT+INSPECT-as-PASS REJECT.**

**Related (do not conflate):**
- DITL-UPDATE sticky `t_a0f80670` (UPDATE_PLANS T-01/T-02/T-03/DH-01; Gemini quota park) — **prefer; do not restaff duplicate**
- Live EXEC lessons: `notes/company/iqg-live-exec-lessons.md` (loop green ≠ live; Chuck signs in; CoS QA browser; no passwords)
- Stamp notes were missing from disk at prove-out start; restored from dual-stamp session message store (PM restamp body + always-visible intent). Dual MET is board-authoritative (`t_a9ff6c0a` + `t_c71f439a`).

---

## PROVE-OUT STAMP READY

```
PROVE-OUT OBJECTIVE
Feature: NT-A Needs Attention job tabs ALWAYS FULLY VISIBLE + tappable (web ≥720, web <720, phone); never occluded by FloatingTabTray; never share tray hide; tray may self-hide; Parent zero; tray 4 no Capture
Stamp: dual APPROVED 2026-09-17 (PM t_a9ff6c0a + QAS t_c71f439a / t_b57ebbdf) — AC-NTA-VIS-01..07 + AV-01..12
Implementation: t_c7223c6f / PR 115 MERGED 49049aa0; ntaWebOcclusion 5/5 STATIC; live Teach /inbox UNVERIFIED
Verdict: READY FOR qa-engineer
Blockers for QE: none for plan/cases authoring; live UI EXEC needs Teach web (+ phone if available) + Chuck sign-in + CoS QA browser (no passwords); DITL lag t_a0f80670 (do not restaff)
SQL: none
```

---

## 1. What “full featured” means vs stamp

Full-featured always-visible NT-A means the dual lock holds end-to-end on the **shipped tree** — not only “unit 5/5” or “ContextMenuRow in-flow under tray.” Map every row to **labeled evidence** (§1.0). Fail = `DEFECT [sev]` on board `kelyra` per IQG §5.  
`ntaWebOcclusion.test.ts` 5/5 is **STATIC aid only** — never sole PASS for user-visible chrome. **Plan-only / inspect-as-PASS / unit-as-stamp-met is REJECT.**

### 1.0 Evidence labels (mandatory on every TC result)

| Label | Means | Counts as stamp PASS? |
|---|---|---|
| **STATIC** | Source inspect, unit test id (`ntaWebOcclusion.test.ts`), trayTabs inventory, typecheck | **Aid only** — never sole PASS for visibility/tappability/lifecycle |
| **LIVE UI** | Signed-in Teach session on product route `/inbox` (Needs Attention); screenshot or structured observation with tray shown **and** tray hidden; web ≥720 **and** <720; phone when available | **Yes** for AC-NTA-VIS-01..03/05/07 and AV-01..05 |
| **BLOCKED ON ENV** | No Chuck session / no QA browser / no phone / no dual-hat Parent seat | Not a product miss; record what STATIC ran |
| **NON-GOAL ABSENT** | Documented out-of-scope missing (freeze tray, Capture restore, filter-into-tray) — correct | Not a defect |

**Live bar:** **Chuck signs in**; **CoS opens dedicated QA browser** (CDP profile, not personal Chrome); agents **never** handle passwords. Prefer product route **`/inbox`** (Needs Attention). App title 🐴 is not signed-out. Do not use `/dashboard`. See `iqg-live-exec-lessons.md`.

**Honesty:** Eng close said live Teach **UNVERIFIED**. PR merge ≠ prove-out PASS.

### 1.1 Hats & chrome entry

| Hat | Must | Stamp law | Prove | Evidence |
|---|---|---|---|---|
| **Teacher (Teach)** | Enter Needs Attention from tray; job tabs always fully visible+tappable on `/inbox` | AC-NTA-VIS-01/02/05 · AV-01..05 · C1–C4 | Web ≥720, web <720, phone | **LIVE UI** |
| **Teacher+parent dual-hat · Teach seat** | Same as teacher | AV dual-hat · AC-NTA-VIS-05 | Same | **LIVE UI** / BLOCKED ON ENV |
| **Teacher+parent dual-hat · Parent seat** | **Zero** Needs desk, job tabs, Teach badge from this chrome | AC-NTA-VIS-05.3 · AV-09 · NT-SEAT-02 | Switch seat → no residual tabs | **LIVE UI** / BLOCKED ON ENV |
| **Parent / Student / Office / Super** | No discovery of Teach job tabs | AC-NTA-VIS-05.4 | Spot or NON-GOAL if seats unavailable | LIVE / BLOCKED ON ENV |
| **Signed-out** | No Needs desk chrome | — | Dark | STATIC / LIVE gate |

**Entry must-prove:**
1. Teach tray key **Needs Attention** opens `/inbox` (not labeled Inbox to Chuck).  
2. Job row is `ContextMenuRow` under header on `/inbox` only (AV-08).  
3. Teach tray inventory exactly **4** L→R: **Desk · Needs Attention · Diary · Kelyra** — no Capture, no fifth (AC-NTA-VIS-04 · AV-07).

### 1.2 Full lifecycle (tray shown AND tray hidden)

```
Teach → tray Needs Attention → /inbox
  → job tabs fully visible + tappable (not under tray; not pre-hidden)
  → work / scroll Needs list
  → tray may hide/collapse itself
  → job tabs REMAIN fully visible + tappable (no fade/translate with tray)
  → tray may reappear
  → job tabs still fully visible (no re-occlusion / sliver regression)
  → leave /inbox → tab row unmounts (no orphan second tray on Desk/Diary/Kelyra)
```

| Phase | Must | Law | Evidence |
|---|---|---|---|
| Start | Tabs fully visible on cold enter `/inbox` | VIS-01 · AV-01..03 | **LIVE UI** |
| Tray visible | Tabs not covered/clipped; full hit targets | VIS-01 · AV-01..03 · C4 | **LIVE UI** |
| Tray hidden | Tabs still opacity 1 / not translated off; still tappable | VIS-02/03 · AV-04 · C3/C5 | **LIVE UI** |
| Scroll list | Tabs remain; do not share tray hide drivers | VIS-01.3 · AV-04 | **LIVE UI** |
| Tab switch | name / review / waiting (or stamped pack keys) receive taps end-to-end | VIS-02 · AV-05 | **LIVE UI** |
| Leave desk | Row gone on other Teach routes | AV-06 | **LIVE UI** |
| Parent seat | Zero residual | AV-09 | **LIVE UI** / BLOCKED ON ENV |

### 1.3 AC-NTA-VIS-01..07 map (must-prove)

| AC | One-line | Min evidence | Sev if miss |
|---|---|---|---|
| **VIS-01** Always fully visible web≥720 / web<720 / phone | No cover, clip, sliver, opacity-0, translate-off | **LIVE UI** each class | **P1** |
| **VIS-02** Always fully tappable | Tray does not steal presses; works tray shown **and** hidden | **LIVE UI** | **P1** |
| **VIS-03** Independent of tray hide | No shared Animated tray+tabs unit; hide tray ≠ hide tabs; show tray ≠ re-occlude | **LIVE UI** + STATIC no co-wrap | **P1** |
| **VIS-04** Placement + tray law | ContextMenuRow `/inbox` only; tray 4; no Capture; noun Needs Attention | **LIVE UI** + STATIC trayTabs | **P1** |
| **VIS-05** Hats | Teach web+phone fixed; Parent zero; no other-hat discovery | **LIVE UI** / BLOCKED ON ENV | **P1** primary Teach; Parent P1 if seat exists |
| **VIS-06** Non-goals | No pack reopen, no Capture restore, no filter-into-tray, no freeze-tray-as-fix | NON-GOAL ABSENT + spot | — / P1 if violated by “fix” |
| **VIS-07** Verify matrix | Explicit tray shown+hidden on ≥720 and <720; phone smoke; Parent; no Inbox copy; no shared hide | Evidence matrix complete | Process P1 if QE marks PASS without LIVE |

### 1.4 AV-01..12 map (must-prove)

| ID | Behavior | Sev | Evidence |
|---|---|---|---|
| AV-01 | Web ≥720 `/inbox`: tabs fully visible; not covered by top tray | P1 | **LIVE UI** |
| AV-02 | Web <720 `/inbox`: tabs at body top; bottom float does not cover | P1 | **LIVE UI** |
| AV-03 | Phone `/inbox`: visible+tappable; float bottom; no shared hide | P1 | **LIVE UI** / BLOCKED ON ENV |
| AV-04 | Scroll list: tabs remain; not trayOpacity/trayTranslate hide | P1 | **LIVE UI** |
| AV-05 | Each job tab receives taps; tray never steals | P1 | **LIVE UI** |
| AV-06 | Leave `/inbox`: no orphan sticky row | P2 | **LIVE UI** |
| AV-07 | Tray exactly 4; no Capture; no fifth | P1 | **LIVE UI** + STATIC |
| AV-08 | Filters stay ContextMenuRow `/inbox` only | P1 | **LIVE UI** + STATIC |
| AV-09 | Parent seat zero Needs chrome | P1 | **LIVE UI** / BLOCKED ON ENV |
| AV-10 | NT-A pack unchanged (3 job tabs, icons/counts/default/membership/noun) | P1 reg | **LIVE UI** + STATIC — note current code may still show **All** vs stamped **Waiting to split**; if pack labels/membership diverge from dual NT-A lock, file DEFECT (do not “fix” pack on visibility card) |
| AV-11 | Shared-hide is **not** the shipped fix | P1 | **LIVE UI** (tabs stay when tray hides) + STATIC AppShell sibling stack |
| AV-12 | Tray need not stay permanently expanded (non-goal freeze) | — | NON-GOAL ABSENT — tray self-hide OK |

### 1.5 Shared-hide REJECT regression (binding)

**PASS only if** all of the following hold on live `/inbox`:

1. Job tabs are a **sibling** of `FloatingTabTray` (web top bar: tray then ContextMenuRow stacked; not one disappearing Animated unit).  
2. When tray hides (scroll/collapse), job tabs **do not** fade, translate off, or unmount.  
3. When tray shows again, tabs are **not** re-occluded (no sliver-of-bottom regression).  
4. Phone path: absolute body-top row may remain, but **`/inbox` pinVisible** keeps opacity 1 and skips `contextTranslate` with tray.

STATIC anchors (aid, not PASS):

| Area | Path |
|---|---|
| Stack sibling | `src/components/ui/AppShell.tsx` (`showTopBar` → FloatingTabTray + ContextMenuRow; body gets ContextMenuRow only when !showTopBar) |
| Pin /inbox | `src/components/ui/ContextMenuRow.tsx` (`pinVisible = pathname === '/inbox'`; opacity 1; no contextTranslate when pin/flow) |
| Reserve | `src/lib/chrome/ChromeProvider.tsx` (`showTopBar` → contextReserve 0) |
| Unit | `src/lib/chrome/ntaWebOcclusion.test.ts` 5/5 |
| Tray inventory | `src/lib/chrome/trayTabs.ts` — no `capture` key |

### 1.6 Explicit non-goals (absence = correct)

1. Freeze system tray permanently expanded.  
2. Move Name/Review/Waiting into tray keys or ClassTabs.  
3. Restore Capture fifth tray slot.  
4. Reopen NT-A membership / icons / DF-A / CT-A / matcher / Approve (visibility-only chrome).  
5. Rename Needs Attention → Inbox.  
6. Parent/Student/Office Needs desk.  
7. Class-tray / Settings-Diary merges.  
8. New IconName / `npm run icons` for this prove-out.  
9. SQL / Edge / git ship from QE.  
10. Executing superseded hide-with-tray OBJECTIVE `t_34c84cbe`.  
11. DESIGN STAMP redo.  
12. DITL EXEC / rewrite on QE card (prefer `t_a0f80670`).

### 1.7 Severity guide (this surface)

| Sev | Examples |
|---|---|
| **P0** | Cannot complete live school flow because job tabs unusable with no workaround **and** data/safety risk (rare here); wrong-child if seat chrome leaks grades — stop |
| **P1** | Teach primary: tabs occluded/sliver; tabs hide with tray; not tappable tray-shown or tray-hidden; shared-hide still shipped; Capture restored; Parent gains Needs desk/tabs; web≥720 or <720 or phone primary miss; Chuck-facing “Inbox” for this desk |
| **P2** | AV-06 orphan row with easy leave; secondary hat miss with workaround; pack label polish if visibility law holds |
| **P3** | Docs/copy lag; DITL lag only; minor spacing under always-visible |

---

## 2. DITL IMPACT vs shipped always-visible (verdict only)

Design-stage + dual stamp: **UPDATE_PLANS** (T-01, T-02, T-03, DH-01). CoS already filed sticky **`t_a0f80670`**. Comment on that card: do not describe shared tray+tabs hide as desired; tray may self-hide; tabs always visible. **Do not restaff duplicate. Do not rewrite DITL on QE card.**

```
DITL IMPACT
Change: NT-A job tabs always-visible shipped via t_c7223c6f / PR 115 MERGED 49049aa0 — ContextMenuRow sibling of FloatingTabTray; /inbox pin opacity 1; no shared tray hide; Teach web≥720/<720/phone; Parent zero; tray 4 no Capture
Verdict: UPDATE_PLANS
Plans touched: DITL-T-01, DITL-T-02, DITL-T-03, DITL-DH-01 — Needs Attention tab-row language; tray shown AND tray hidden tabs remain; never hide-with-tray; never occluded; dual-hat Parent zero
Cases touched: matching Teach Needs / dual-hat cases after plan rewrite (via t_a0f80670 — not this QE card)
New DITL needed: no
Seed/artifacts: Teach signed-in seed for LIVE /inbox; optional dual-hat Parent seat; phone if available
Notes: Prefer existing sticky t_a0f80670 (Gemini quota park historically). QE may note DITL lag; must not rewrite ditl-plans/cases here; must not restaff scribe. Do not fake PASS without LIVE UI tray-shown+hidden on web classes.
```

| Artifact | State | Action on QE card |
|---|---|---|
| Sticky `t_a0f80670` | triage / Gemini park / unassigned | **Prefer** — do not restaff |
| `ditl-plans/*` hide-with-tray language | lag until scribe | Out of scope here |
| This file | SoT for QE stamp prove-out | Use as OBJECTIVE |

---

## 3. OBJECTIVE block (paste to qa-engineer)

```
OBJECTIVE:
IQG Phase 4 prove-out for NT-A Needs Attention job tabs ALWAYS VISIBLE (PR 115 rework). Write notes/company/needs-attention-tabs-always-visible-testplan.md + cases; execute vs dual stamp AC-NTA-VIS-01..07 + AV-01..12; file DEFECT [P0–P3] on board kelyra with severity. No app code. No git. No SQL. No DESIGN STAMP redo. No DITL rewrite (prefer sticky t_a0f80670 — do not restaff). PLAN-ONLY / UNIT+INSPECT-as-PASS REJECT. Live: Teach web ≥720 and <720 required; phone when available; Chuck signs in; CoS opens QA browser; no passwords. Supersedes t_34c84cbe hide-with-tray OBJECTIVE — do not prove hide-with-tray.

CONTEXT:
- Stamp SoT: notes/company/needs-attention-tabs-web-occlusion-defect.md (PM t_a9ff6c0a AC-NTA-VIS-01..07) + notes/company/needs-attention-tabs-always-visible-intent.md (QAS t_b57ebbdf / dual t_c71f439a AV-01..12). Dual MET 2026-09-17. CEO C1–C7.
- Prove-out OBJECTIVE: notes/company/needs-attention-tabs-always-visible-proveout-objective.md — evidence labels STATIC vs LIVE UI mandatory. Unit 5/5 ≠ stamp-met.
- Implementation: t_c7223c6f / PR 115 MERGED https://github.com/chuckbroaddus/kelyra/pull/115 commit 49049aa0 on origin/main. ntaWebOcclusion.test.ts 5/5 STATIC. Live Teach /inbox was UNVERIFIED at Eng close.
- Code anchors (start here, not a pass): src/components/ui/AppShell.tsx; ContextMenuRow.tsx; FloatingTabTray.tsx; src/lib/chrome/ChromeProvider.tsx; trayTabs.ts; ntaWebOcclusion.test.ts; route /inbox (Needs Attention).
- Live lessons: notes/company/iqg-live-exec-lessons.md. Do not --parent t_7ebaea27. Defect parent: t_38911791 / t_c7223c6f / t_1f98012a.
- DITL sticky t_a0f80670 do not restaff.
- Noun: Needs Attention. Tray 4: Desk · Needs Attention · Diary · Kelyra. No Capture. Parent zero.
- Pack note: stamp language uses Needs a name · Review · Waiting to split; live ContextMenuRow may still expose All — if pack diverges from NT-A lock, file DEFECT [P1/P2] pack/regression; do not “fix” membership on this visibility prove-out beyond filing.

REQUIREMENTS:
1. Test plan at notes/company/needs-attention-tabs-always-visible-testplan.md covering hats, dual-hat Parent zero, chrome entry, full lifecycle tray shown+hidden, web≥720, web<720, phone, scroll, reverse leave desk, tray 4 / no Capture, shared-hide REJECT, non-goals, P0/P1. Every case labels evidence STATIC | LIVE UI | BLOCKED ON ENV | NON-GOAL ABSENT.
2. Must-prove (execute; record evidence; mark BLOCKED ON ENV when Chuck/QA browser/phone/dual-hat unavailable — not product miss):
   A. ENTRY: Teach opens Needs Attention → /inbox; Chuck-facing noun not Inbox; ContextMenuRow job tabs present.
   B. WEB ≥720: tabs fully visible under header with top tray shown; not covered/clipped/sliver; all job tabs tappable.
   C. WEB ≥720 tray hidden: force/scroll hide tray if product supports; tabs remain fully visible+tappable (no shared fade/translate).
   D. WEB <720: tabs at top fully visible; bottom float tray does not cover; tappable tray shown+hidden.
   E. PHONE: same always-visible law; scroll does not steal job row (LIVE if device else BLOCKED ON ENV + STATIC pinVisible).
   F. SCROLL: long Needs list scroll keeps tabs painted+tappable.
   G. SHARED-HIDE REJECT: no one Animated unit zeros both tray and tabs; sibling stack holds (LIVE + STATIC).
   H. TRAY LAW: exactly 4 slots Desk · Needs Attention · Diary · Kelyra; no Capture; no fifth.
   I. LEAVE: navigate Desk/Diary/Kelyra → job tab row gone (not orphan sticky).
   J. PARENT ZERO: dual-hat Parent seat has no Needs desk/job tabs (if seat available).
   K. NON-GOALS: tray may self-hide (OK); filters not moved to tray; freeze-tray not required.
   L. STATIC aid: node --experimental-strip-types --test src/lib/chrome/ntaWebOcclusion.test.ts → 5/5 (aid only).
3. Live evidence bar: Chuck-signed Teach session; CoS QA browser; product /inbox; screenshots or structured LIVE UI notes for tray-shown and tray-hidden on ≥720 and <720 at minimum. STATIC unit ids never sole PASS for VIS/AV chrome laws.
4. File each miss as DEFECT [sev] card (not only comment): REPRO, HAT/ROLE, EXPECTED (stamp AC-NTA-VIS / AV id), ACTUAL, EVIDENCE (STATIC|LIVE UI). Parent t_38911791 or t_c7223c6f. assign none + needs_input; CoS staffs PM disposition.
5. Severity: P0 rare safety/unusable school flow; P1 primary Teach occlusion/shared-hide/untappable/Capture restore/Parent leak/Inbox noun; P2 AV-06 orphan / secondary; P3 docs/DITL lag.
6. DITL: note lag only; prefer t_a0f80670 — do not rewrite ditl-plans/cases; do not restaff scribe.
7. Do not complete INSPECT-ONLY or PLAN-ONLY as PASS. Do not self-certify release; return evidence to QA Supervisor.

CONSTRAINTS:
- No Eng implementation. No git commit/push. No inventing chrome.
- Do not treat missing non-goals (freeze tray, Capture, filter-into-tray) as defects when absent.
- Do not prove superseded hide-with-tray law (t_34c84cbe).
- Loop/unit green are STATIC aids, not substitute for LIVE UI stamp prove-out.
- Live session: Chuck signs in; CoS opens QA browser; agents never handle passwords.
- Do not --parent t_7ebaea27.

ACCEPTANCE:
- needs-attention-tabs-always-visible-testplan.md + executed evidence matrix vs §1 of proveout with STATIC vs LIVE UI labels
- LIVE UI primary paths (Teach web ≥720 and <720 /inbox tabs visible+tappable tray shown AND hidden) recorded OR explicit BLOCKED ON ENV with what STATIC ran
- P0/P1 filed or none found (explicit)
- DITL lag noted without rewrite/restaff (t_a0f80670)
- Handoff: RESULT pass|fail + OPEN ISSUES + next (PM disposition / FIX-NOW / QAS release review)

RECOMMENDED NEXT ACTION:
Return evidence to QA Supervisor for release gate; CoS staffs PM on any new DEFECT cards. Feature not product-complete until LIVE prove-out executes.
```

---

## 4. Must-prove matrix + leftovers

### 4.1 Code-side anchors (QE start here; not a pass)

| Area | Paths |
|---|---|
| Shell stack | `src/components/ui/AppShell.tsx` |
| Job row pin | `src/components/ui/ContextMenuRow.tsx` |
| Tray | `src/components/ui/FloatingTabTray.tsx`, `src/lib/chrome/trayTabs.ts` |
| Reserve | `src/lib/chrome/ChromeProvider.tsx` |
| STATIC unit | `src/lib/chrome/ntaWebOcclusion.test.ts` |
| Desk route | `src/app/inbox.tsx` (or equivalent `/inbox`) |
| Stamp SoT | `notes/company/needs-attention-tabs-web-occlusion-defect.md`, `needs-attention-tabs-always-visible-intent.md` |

### 4.2 Must-prove ID seeds (for testplan)

| ID | Focus | Sev if miss | Min evidence |
|---|---|---|---|
| NTA-VIS-W720-SHOW | Web ≥720 tray shown: full tabs | P1 | LIVE UI |
| NTA-VIS-W720-HIDE | Web ≥720 tray hidden: tabs remain | P1 | LIVE UI |
| NTA-VIS-WLT720-SHOW | Web <720 tray shown: no cover | P1 | LIVE UI |
| NTA-VIS-WLT720-HIDE | Web <720 tray hidden: tabs remain | P1 | LIVE UI |
| NTA-VIS-PHONE | Phone always-visible + scroll | P1 | LIVE UI / BLOCKED ON ENV |
| NTA-VIS-SCROLL | List scroll keeps tabs | P1 | LIVE UI |
| NTA-VIS-TAP | All job tabs tappable shown+hidden | P1 | LIVE UI |
| NTA-VIS-SHARE-REJECT | No shared hide unit | P1 | LIVE UI + STATIC |
| NTA-VIS-TRAY4 | 4 slots; no Capture | P1 | LIVE UI + STATIC |
| NTA-VIS-LEAVE | Leave desk unmounts row | P2 | LIVE UI |
| NTA-VIS-PARENT0 | Parent seat zero | P1 | LIVE UI / BLOCKED ON ENV |
| NTA-VIS-NOUN | No Chuck-facing Inbox for desk | P1/P3 | LIVE UI |
| NTA-VIS-PACK | Pack labels/membership vs NT-A lock | P1/P2 | LIVE UI + STATIC |
| NTA-VIS-STATIC | Unit 5/5 | aid | STATIC |
| NTA-VIS-NG | Non-goals absent | — | NON-GOAL ABSENT |

### 4.3 Leftovers / known non-blockers for OBJECTIVE (recheck)

| Kind | Item | Disposition |
|---|---|---|
| STATIC green | `ntaWebOcclusion.test.ts` 5/5 on tree | Aid only — not LIVE PASS |
| PR state | PR 115 **MERGED**; commit on origin/main | Ship done; prove-out still required |
| Live | Teach `/inbox` unverified since Eng | **Required** LIVE or BLOCKED ON ENV |
| Pack | Live chips may still include **All** vs stamped **Waiting to split** | Recheck; file pack DEFECT if miss — visibility OBJECTIVE still executes |
| DITL | `t_a0f80670` parked Gemini | UPDATE_PLANS; **do not restaff** |
| Superseded | `t_34c84cbe` hide-with-tray OBJECTIVE | Do not execute |
| IQG tracker | `t_7ebaea27` | Do not parent |
| SQL | None | No devops SQL gate |
| Notes restore | Stamp notes restored from session store 2026-09-18 | SoT for QE; dual MET board-authoritative |

**No stamp contradiction** that forces DESIGN STAMP REJECT: dual MET always-visible; Eng rework matches sibling-stack + pin-visible shape vs shared-hide REJECT. Prove-out still required before feature “done.” Loop/unit `passed` ≠ product-complete until LIVE UI prove-out executes.

---

## 5. Close disposition

| Field | Value |
|---|---|
| OBJECTIVE verdict | **READY FOR qa-engineer** |
| DITL IMPACT verdict | **UPDATE_PLANS** (prefer `t_a0f80670` — do not restaff) |
| File | `notes/company/needs-attention-tabs-always-visible-proveout-objective.md` |
| Impl ref | `t_c7223c6f` / PR 115 MERGED `49049aa0` |
| SQL | **none** |
| DESIGN STAMP redo | **No** (dual stamp MET) |
| Eng / git / execute / DITL rewrite / re-loop | **No** from this card |
| Next | CoS ARM GRANT + staff `qa-engineer` with §3 OBJECTIVE paste; live Teach web + Chuck sign-in + CoS QA browser (no passwords) |

### Handoff fields

| Field | Value |
|---|---|
| OBJECTIVE | Phase 4 prove-out OBJECTIVE for NT-A always-visible vs dual stamp after PR 115 rework |
| WORK PERFORMED | Re-read dual stamp cards, PR 115 MERGED state, AppShell/ContextMenuRow/unit anchors; restored missing stamp notes from PM/QAS session store; wrote always-visible proveout OBJECTIVE with STATIC vs LIVE UI honesty bar; DITL prefer t_a0f80670; named qa-engineer next; supersedes t_34c84cbe |
| VERIFICATION | File on disk; maps AC-NTA-VIS-01..07 + AV-01..12 + hats/lifecycle tray shown+hidden + shared-hide REJECT + Parent zero + tray 4; unit 5/5 STATIC confirmed this run; no code/git/SQL/execute |
| RESULT | Prove-out OBJECTIVE landed; READY FOR qa-engineer; honesty: unit ≠ live stamp-met |
| OPEN ISSUES | Live Chuck + CoS browser + Teach web (≥720 and <720) + phone needed for EXEC; DITL lag t_a0f80670; pack All vs Waiting recheck |
| ESCALATION NEEDED | CoS staffs `qa-engineer` from §3; do not restaff t_a0f80670 from QE; do not parent t_7ebaea27 |
| RECOMMENDED NEXT ACTION | CoS staffs qa-engineer from §3 OBJECTIVE paste |

---

*End prove-out OBJECTIVE — t_38911791. Dual stamp unchanged. No tests executed as stamp prove-out. No app code. No git. PLAN-ONLY REJECT for downstream QE. Supersedes t_34c84cbe.*
