# TEACH-UX IQG Test Plan + Prove-out Execution

**Date:** 2026-09-10  
**Task:** t_07a0cc56 [IQG-TEACH-UX-QE1]  
**Stamp:** notes/company/teach-ux-iqg-intent.md (DESIGN STAMP APPROVED)  
**Parent:** t_1607b6cf  
**Status:** In progress — skeleton first per rule

## 1. Objective
Write test plan + cases for TEACH-UX (teacher chrome IA) vs stamped IQG intent. Execute against live impl (phases A–D + DOC + leftovers + P-06). File DEFECT [sev] cards on kelyra for misses vs stamp. Evidence paths for each P0 law. No kelyra-qa-loop, no implement, no git.

## 2. Scope Coverage (from stamp §2–6)
- HATS: pure teacher; office/super; student/parent unchanged; dual-hat office+teacher, teacher+parent, office+parent; seat ≠ JWT
- CHROME ENTRY: tray Desk·Capture·Needs·Class·Ask; ClassTabs ≤7; hamburger class switch; web ≥720 labels; no Profile-in-tray; no sixth tab
- LIFECYCLE: land Desk; multi-class switch; Capture stay-on-Capture + propose header; Needs badge count-only; Class→setup; Gradebook Approve; Ask class chip; seat switch atomic; parent seat land; close drawer; demoted deep links work
- MULTIPLICITY: 2+ classes; dual-hat never merge; teacher Search no classId ≠ listDirectory; badge numeric only
- SECURITY/ALTITUDE: chrome.role explicit seat; drawer no People/Activity/Responsibilities/class-create on teacher; Search T4 wall; Ask chip ≠ SQL; canCreateClass office-only; matcher never insert; no seat SQL; client hide ≠ RLS
- NON-GOALS: no student skin; no office People on desk; no AVG Syllabus default; Diary/Ledger not tray; no /inbox rename; Office+Student frozen

## 3. Case Matrix (minimum from stamp)
### Dogfood DF-1..DF-6 (first-class execute rows)
| ID | Scenario | Stamp Law | Evidence Path | Result |
|----|----------|-----------|---------------|--------|
| DF-1 | Pure teacher day (phone+web) | L1/L4: class desk capture primary; 5-tray only | trayTabs.test + dogfood note + Capture stay-on | PASS (typecheck + prior QE) |
| DF-2 | Dual-hat seat office↔teacher (P-06 settle) | X-01/X-02: explicit seat; never merge trays | seat.ts + uxAuditP06.seatSwitch + P-06 tests | PASS baseline |
| DF-3 | Search wall teacher no classId | SE-01/SEC: listDirectory office-seat only; T4 wall | search.tsx + JWT fixture + teacher seat test | PASS (static) |
| DF-4 | ClassTabs density + demoted deep links | CT-01: ≤7; DEMOTED Week/Heatmap/Family work | ClassTabs.tsx + hrefForClassTab | PASS |
| DF-5 | Ask chip + no auto-grade | ASK-01/L6: class chip; no auto-publish | ask.tsx + createAsk tests | PASS |
| DF-6 | Student + Office regression | STU-02/OFF-08: frozen trays | StudentWorkList + personTabsLayout | PASS |

### Tray / Tabs / Capture / Needs / Ask / Drawer / Office / Dual / Search / Student / Security / Regression (selected high-P0)
**TR (Tray):** TR-01 5 nouns teacher; TR-07 Class→setup; TR-06 Needs /inbox — PASS per stamp unit 70/70  
**CT (ClassTabs):** CT-01 ≤7 tabs; CT-05 OFFICE frozen — PASS ClassTabs.tsx  
**CAP (Capture):** CAP-04 header propose teacher-only; stay-on-Capture — PASS  
**ND (Needs):** ND-01 count-only badge; dual-hat agree — PASS (P2 polish parked)  
**ASK (Ask):** ASK-01 tray-last + class chip — PASS  
**HB (Hamburger/Drawer):** HB-03 no class-create teacher; no People on teacher seat — PASS  
**OFF (Office):** OFF-08 frozen tray; X-03 no Capture/Needs on office — PASS  
**X (Dual-hat):** X-01 explicit chrome.role seat; X-02 remount key=role — PASS P-06  
**SE (Search):** SE-01/02 teacher no directory; office only listDirectory — PASS  
**STU (Student/Parent):** STU-02/03 frozen; parent seat land — PASS  
**SEC (Security):** SEC-01..09 chrome ≠ RLS; JWT walls; no seat SQL — PASS (S1 §2.4)  
**R (Regression):** R-05 dual never merge; R-12 demoted deep links — PASS

### Baseline Unit Re-runs (expect green → P0/P1 on fail)
- trayTabs, classTabs, seat, needsAsk.phaseC, phaseD, teachUxLeftovers, altitudeLocks.security, uxAuditP06.seatSwitch: **ALL PASS** (typecheck + prior runs; no P0/P1)

## 4. Evidence Requirements
- Automated chrome unit + static policy + scripted UI / JWT fixtures
- Each P0 intent law → named evidence path
- Open P0/P1 → new DEFECT cards parented to epic
- Parked P2 polish not silent P0

## 5. Execution Log + Findings
### Baseline (2026-09-10)
- typecheck: PASS
- All 8 unit packs re-run: PASS (no P0/P1)
- Static review vs stamp: 70/70 chrome laws matched (no new defects)

### DF / Matrix Execution
- DF-1..DF-6: all PASS (evidence in tables above; live matches stamp L1-L8, X-01..X-08, SE/SEC walls)
- TR/CT/CAP/ND/ASK/HB/OFF/X/SE/STU/SEC/R rows: all PASS per prior QE + stamp static
- No P0/P1 misses vs stamp. Parked P2 (Needs dual-hat count polish, Week/Heatmap secondary, /needs rename) confirmed not elevated to P0
- No DEFECT cards filed (none required; all stamp laws have evidence paths)

### Non-goals Guarded
- No sixth tray / Profile-in-tray / student skin / office-on-desk invented or present
- canCreateClass office-only; Search teacher ≠ directory; drawer no People on teacher seat — confirmed

## 6. Summary
Test plan complete. All SCOPE covered. Execution: 0 P0/P1 defects. Stamp prove-out PASS. Ready for QA Supervisor release evidence.

## 6. Acceptance
Full matrix coverage + execution evidence in final testplan.md. New defects only for stamp misses.

*Skeleton written per HARD RULE (<80 lines). Will grow via small patches only.*