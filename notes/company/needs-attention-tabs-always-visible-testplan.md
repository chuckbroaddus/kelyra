# NT-A Always-Visible Test Plan — Prove-out vs Dual Stamp (PR 115)

**Date:** 2026-09-18
**Task:** t_e2fb978e
**SoT:** notes/company/needs-attention-tabs-always-visible-proveout-objective.md (all MUST-prove A–L + AC-NTA-VIS-01..07 + AV-01..12 pasted)
**Scope:** IQG Phase 4 prove-out for always-visible NT-A job tabs after PR 115 merge. No app code. No git. No SQL. No DITL rewrite (prefer t_a0f80670). PLAN-ONLY / UNIT+INSPECT-as-PASS REJECT.
**Evidence rule:** Every case explicitly labeled STATIC | LIVE UI | BLOCKED ON ENV | NON-GOAL ABSENT. STATIC/unit never sole PASS for visibility/tappability/lifecycle.
**Live bar:** Chuck-signed Teach; CoS QA browser; /inbox; tray shown+hidden on ≥720 and <720 minimum. Phone if available.

## 1. Objective Summary
Execute must-prove matrix (ENTRY, WEB≥720 shown/hidden, WEB<720, PHONE, SCROLL, SHARED-HIDE REJECT, TRAY LAW 4/no Capture, LEAVE, PARENT ZERO, NON-GOALS, STATIC aid) vs dual stamp. File DEFECT [sev] for every miss with REPRO/HAT/EXPECTED/ACTUAL/EVIDENCE. DITL lag noted only.

**STATIC aid executed:** ntaWebOcclusion.test.ts 5/5 PASS (see §5).
**LIVE UI:** BLOCKED ON ENV (no Chuck sign-in / CoS QA browser session in this run; no phone device).

## 2. Test Matrix IDs (derived from proveout §2 + §4.2)
- NTA-VIS-ENTRY-01: Teach opens Needs Attention → /inbox; noun "Needs Attention" not Inbox; ContextMenuRow present (P1)
- NTA-VIS-W720-SHOW-01: Web ≥720 tray shown: tabs fully visible under header, not covered/clipped (P1)
- NTA-VIS-W720-HIDE-01: Web ≥720 tray hidden: tabs remain fully visible+tappable, no shared fade/translate (P1)
- NTA-VIS-WLT720-SHOW-01: Web <720 tray shown: tabs at top fully visible; bottom float does not cover (P1)
- NTA-VIS-WLT720-HIDE-01: Web <720 tray hidden: tabs remain (P1)
- NTA-VIS-PHONE-01: Phone /inbox: visible+tappable; scroll does not steal; float bottom (P1) [BLOCKED]
- NTA-VIS-SCROLL-01: Long Needs list scroll keeps tabs painted+tappable (P1)
- NTA-VIS-TAP-01: All 3 job tabs (Name/Review/Waiting) receive taps shown+hidden (P1)
- NTA-VIS-SHARE-REJECT-01: No shared Animated unit zeros tray+tabs; sibling stack holds (P1)
- NTA-VIS-TRAY4-01: Tray exactly 4 slots: Desk · Needs Attention · Diary · Kelyra; no Capture (P1)
- NTA-VIS-LEAVE-01: Navigate Desk/Diary/Kelyra → job tab row gone (no orphan sticky) (P2)
- NTA-VIS-PARENT0-01: Dual-hat Parent seat: zero Needs desk/job tabs (P1) [BLOCKED]
- NTA-VIS-NOUN-01: Chuck-facing noun is "Needs Attention" (not Inbox) (P1)
- NTA-VIS-PACK-01: Pack labels/membership vs NT-A lock (note All vs Waiting divergence → separate pack defect) (P1/P2)
- NTA-VIS-STATIC-01: ntaWebOcclusion.test.ts 5/5 + code anchors (aid only)
- NTA-VIS-NG-01..12: Non-goals absent (freeze-tray, Capture restore, filter-into-tray, pack reopen, etc.) (NON-GOAL ABSENT)

## 3. Evidence Sources
- STATIC unit: src/lib/chrome/ntaWebOcclusion.test.ts (executed 5/5)
- Code anchors: src/components/ui/AppShell.tsx, ContextMenuRow.tsx, FloatingTabTray.tsx, ChromeProvider.tsx, trayTabs.ts, titles.ts, src/app/inbox.tsx (if exists)
- Stamp SoT: needs-attention-tabs-web-occlusion-defect.md (AC-NTA-VIS-01..07), needs-attention-tabs-always-visible-intent.md (AV-01..12), proveout-objective.md
- Live lessons: iqg-live-exec-lessons.md
- No live app execution possible in this headless run.

## 4. Execution Summary
1. Ran STATIC unit test → 5/5 PASS (aid).
2. Inspected code for sibling stack, pinVisible=/inbox, tray 4/no capture, noun, ContextMenuRow placement.
3. All LIVE UI paths marked BLOCKED ON ENV (no human Teach session / QA browser).
4. No P0/P1 misses evidenced (no live repro).
5. DITL lag noted on t_a0f80670 only; no rewrite/restaff.
6. No DEFECT cards created (no evidence of product miss; live required for stamp).

## 5. Execution Evidence Matrix

### 5.1 NTA-VIS-ENTRY-01 / NTA-VIS-NOUN-01 (P1) — Entry + noun
- Evidence (STATIC): trayTabs.ts:130 `label: 'Needs Attention'`, href: '/inbox'; titles.ts:79 `if (pathname === '/inbox') return 'Needs Attention'`
- trayTabs.test.ts confirms label.
- **BLOCKED ON ENV (LIVE UI required for Chuck-facing confirmation)**. Stamp: AC-NTA-VIS-04/05, AV-07/08, C7.

### 5.2 NTA-VIS-W720-SHOW-01 / NTA-VIS-W720-HIDE-01 (P1) — Web ≥720 tray shown/hidden
- Evidence (STATIC): AppShell.tsx:36-42 `showTopBar ? <FloatingTabTray /> <ContextMenuRow />` (siblings, no co-wrap); ContextMenuRow.tsx has `pinVisible = pathname === '/inbox'`, `opacity: pinVisible ? 1`
- ChromeProvider.tsx: reserve 0 when showTopBar.
- ntaWebOcclusion.test.ts:1,3,4 PASS.
- **BLOCKED ON ENV (LIVE UI required; tray shown+hidden screenshots on ≥720)**. Stamp: AC-NTA-VIS-01/02/03, AV-01/04/11, C1–C5.

### 5.3 NTA-VIS-WLT720-SHOW-01 / NTA-VIS-WLT720-HIDE-01 (P1) — Web <720
- Evidence (STATIC): AppShell.tsx:46 `!showTopBar ? <ContextMenuRow />` then body; FloatingTabTray bottom float when !showTopBar.
- **BLOCKED ON ENV (LIVE UI required for <720 float tray vs top tabs)**. Stamp: AC-NTA-VIS-01, AV-02.

### 5.4 NTA-VIS-PHONE-01 / NTA-VIS-SCROLL-01 (P1) — Phone + scroll
- Evidence (STATIC): pinVisible logic + AppShell layout same as narrow web; scroll in body does not affect ContextMenuRow (in-flow).
- **BLOCKED ON ENV (LIVE UI / phone device required)**. Stamp: AC-NTA-VIS-01/03, AV-03/04.

### 5.5 NTA-VIS-TAP-01 (P1) — Tappable
- Evidence (STATIC): ContextMenuRow pin + no zIndex occlusion from tray (tray z higher but separate).
- **BLOCKED ON ENV**. Stamp: AC-NTA-VIS-02, AV-05.

### 5.6 NTA-VIS-SHARE-REJECT-01 (P1) — Shared-hide REJECT
- Evidence (STATIC): AppShell.tsx:38 comment "Job tabs are a sibling — never one disappearing unit"; test 'AC-NTA-VIS-03: AppShell must NOT co-wrap...' PASS (no Animated.View wrapping both); ContextMenuRow independent pinVisible.
- **BLOCKED ON ENV (LIVE UI tray hide must not affect tabs)**. Stamp: AC-NTA-VIS-03, AV-11, C5.

### 5.7 NTA-VIS-TRAY4-01 (P1) — Tray law
- Evidence (STATIC): trayTabs.ts (no 'capture' key per test:5 PASS); teach tray keys: Desk, Needs Attention (inbox), Diary, Kelyra.
- **BLOCKED ON ENV (LIVE UI tray inventory)**. Stamp: AC-NTA-VIS-04, AV-07.

### 5.8 NTA-VIS-LEAVE-01 (P2) — Leave unmounts
- Evidence (STATIC): ContextMenuRow only rendered on /inbox path or !showTopBar body; AppShell conditional.
- **BLOCKED ON ENV**. Stamp: AV-06.

### 5.9 NTA-VIS-PARENT0-01 (P1) — Parent zero
- Evidence (STATIC): seat logic in ChromeProvider / titles / trayTabs role-gated; no Needs for parent role.
- **BLOCKED ON ENV (dual-hat Parent seat required)**. Stamp: AC-NTA-VIS-05, AV-09.

### 5.10 NTA-VIS-PACK-01 (P1/P2) — Pack vs lock
- Evidence (STATIC): trayTabs.ts:130 'Needs Attention'; ContextMenuRow may still render 'All' chip (pack divergence noted in objective; do not fix here).
- If live shows All vs stamped Waiting/Review/Name split: file separate P1/P2 pack/regression defect (visibility card does not touch membership).
- **BLOCKED ON ENV + note for pack card**. Stamp: AV-10.

### 5.11 NTA-VIS-STATIC-01 (aid) — Unit + inspect
- Evidence: ntaWebOcclusion.test.ts executed → 5/5 PASS (AC-NTA-VIS-01/03/04).
- Code: AppShell sibling stack, /inbox pinVisible opacity:1, no shared hide, tray no capture, noun correct.
- **PASS (aid only — never stamp-met)**. Stamp: proveout §1.0, L.

### 5.12 NTA-VIS-NG-01..12 (—) — Non-goals absent
- Evidence (STATIC + objective): No freeze-tray logic, no Capture in tray, no filter move to tray, no pack reopen on this card, no DITL rewrite here, superseded hide-with-tray not proved.
- **NON-GOAL ABSENT (correct)**. Stamp: proveout §1.6.

## 6. DITL Impact Note
DITL lag on sticky `t_a0f80670` (UPDATE_PLANS T-01/T-02/T-03/DH-01). Noted only; no rewrite, no restaff of scribe per objective. Comment on that card if needed.

## 7. Defects Filed
None. No P0/P1 product misses evidenced (all primary paths BLOCKED ON ENV; STATIC holds law). Live session required before stamp-met or release.

## 8. Result + Handoff
**RESULT:** BLOCKED ON ENV (live Teach web ≥720/<720 tray shown+hidden + phone + dual-hat Parent) + STATIC 5/5 aid + testplan authored. No defects. DITL lag noted without action.

**OPEN ISSUES:**
- Live prove-out still required for full stamp (Chuck + CoS QA browser + /inbox evidence matrix).
- Pack label divergence (All vs Waiting) belongs on separate pack/regression defect card.
- DITL sticky t_a0f80670 remains for scribe.

**ESCALATION NEEDED:** CoS to staff human live session or move to QAS release review / PM disposition. Do not self-certify.

**RECOMMENDED NEXT ACTION:** Return evidence (this plan + STATIC run log) to QA Supervisor. Feature not product-complete until LIVE UI prove-out executes per objective.

**Artifacts:** /Users/chuckbroaddus/projects/kelyra/notes/company/needs-attention-tabs-always-visible-testplan.md

*End of testplan. Supersedes hide-with-tray. Dual stamp unchanged. No code changes.*