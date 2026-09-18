# DB-B Diary Day-Browse Test Plan — Prove-out vs Dual Stamp

**Date:** 2026-09-18
**Task:** t_35630cb5
**SoT:** notes/company/diary-day-browse-proveout-objective.md (all MUST-prove A–I + DB-TREE-01.. + severity guide) + spec.md + intent.md
**Scope:** IQG Phase 4 prove-out for DB-B (month grid + selected-day agenda + Today + owner-only presence PR-BOTH). No app code. No git. No SQL. No DITL rewrite (prefer t_d94e0385). PLAN-ONLY / UNIT+INSPECT-as-PASS REJECT.
**Evidence rule:** Every case explicitly labeled STATIC | LIVE UI | BLOCKED ON ENV | NON-GOAL ABSENT. STATIC/unit never sole PASS for hats/lifecycle/presence/twins.
**Live bar:** Chuck-signed Teach; CoS QA browser focus; phone + web; teacher tray / parent hamburger / student zero / dual-hat seat only.

## 1. Objective Summary
Execute must-prove matrix (TREE GATE, ST-A chrome entry, full DB-B lifecycle, multiplicity twins fail-closed, presence PR-BOTH, reverse, composer DATE-P1, Ledger/Calendar separation, non-goals) vs dual stamp (PM t_f766ae6a + QAS t_d717511a on t_ea554343). File DEFECT [sev] for every miss with REPRO/HAT/ROLE/EXPECTED (stamp)/ACTUAL/EVIDENCE/PARENT. DITL lag noted only on t_d94e0385.

**TREE GATE executed:** PASS (anchors on disk; RG-DROP From/To primary gone from Journal; selectedDay + JournalMonthGrid primary).
**LIVE UI:** BLOCKED ON ENV (no Chuck sign-in / CoS QA browser session in this headless run; no Teach session available).
**STATIC aid executed:** code inspection of diary.tsx:115 (selectedDay), 642 (JournalMonthGrid), 283 (RG-DROP comment), dayBrowse imports, seat.ts, diary.security.test.ts references; no From/To TextFields in Journal segment.

## 2. Test Matrix IDs (derived from proveout §1 + §5.2)
- DB-TREE-01: Anchors present; RG-DROP primary From/To gone from Journal (P1)
- DB-CE-ST-A-01: Teacher tray Diary; no 6th tray (P1)
- DB-CE-ST-A-02: Parent/office hamburger Diary; student zero Diary (P1)
- DB-DH-01: Dual-hat seat-correct journal scope (P1)
- DB-NAV-01: Month grid + select day + ◀▶ + Today (P1)
- DB-NAV-02: Auto-apply focus (no primary Apply) (P1)
- DB-AG-01: Agenda sticky day headers + multi-day scroll (P1)
- DB-EMPTY-01: EM-PRIMARY empty + New entry DATE-P1 prefill (P1)
- DB-COMP-01: Composer is Diary FormSheet; not Calendar + (P1)
- DB-PRES-01: PR-BOTH owner-only dot/count (9+ cap); no roleTint (P1/P0 if leak)
- DB-TWIN-01: Chips above month; fail-closed; never mix (P0/P1)
- DB-LED-01: Ledger list+range only (no day-grid) (P1)
- DB-CAL-01: No Calendar functions on Diary; no Diary body on Calendar (P1)
- DB-SR-01: Newest/Oldest kept (P2)
- DB-NG-01..13: Non-goals absent (student Diary, Ask NL, Reminders, FullCalendar, roleTint, 6th tray, Calendar merge, etc.) (NON-GOAL ABSENT)
- DB-P2-FILT: Filter-miss empty uses true-empty EM-PRIMARY (leftover t_df7cf4c6) (P2)
- DB-P3-CHIP: Parent chips Journal-only vs Ledger (leftover t_626792a2) (P3)
- DB-P3-STICKY: Web month pane sticky (leftover t_f368074b) (P3)

## 3. Evidence Sources
- STATIC: src/app/diary.tsx (JournalMonthGrid primary, selectedDay, RG-DROP comment, ledger-only From/To), src/components/diary/JournalMonthGrid.tsx, src/lib/diary/dayBrowse.ts + .test.ts, src/lib/diary/seat.ts, diary.security.test.ts, src/app/calendar.tsx (separate)
- Stamp SoT: diary-day-browse-spec.md (DB-B + PR-BOTH + RG-DROP + ...), diary-day-browse-intent.md, proveout-objective.md
- Mockup: notes/company/diary-day-browse-mockups/db-b.html
- No live app execution possible in this headless run. No test runner in package.json for direct jest.

## 4. Execution Summary
1. TREE GATE: Confirmed DB-B files present, Journal primary = JournalMonthGrid + Today + ◀▶ + agenda; From/To+Apply only on Ledger segment. PASS (STATIC).
2. Code inspection: All DB-B wiring present (dayBrowse helpers, presenceCountByDay, parentTwinsFailClosed, EM-PRIMARY copy, DATE-P1 intent via composer). No CalendarItem / roleTint / EventComposer on Journal. Ledger unchanged.
3. All LIVE UI paths (hats entry, pick day, Today, empty New entry → composer, presence dots, twin chips, multi-day scroll, reverse) marked BLOCKED ON ENV (no human Teach session / QA browser).
4. No P0/P1 misses evidenced in STATIC (code holds stamp laws). No DEFECT cards created (no repro evidence of product miss; LIVE required for stamp).
5. DITL lag noted on t_d94e0385 only; no rewrite/restaff.
6. Parked leftovers (P2/P3) not re-verified due to no LIVE; remain as-is.
7. RESULT: UNPROVEN (LIVE UI required per §0 honesty bar; cannot STATIC-PASS the stamp). TREE GATE explicit PASS. No P0/P1 filed.

## 5. Execution Evidence Matrix

### 5.1 DB-TREE-01 (P1) — TREE GATE + RG-DROP
- Evidence (STATIC): diary.tsx:114-115 `selectedDay` init todayISO; 283 comment "DB-B: month window auto-applies ... (RG-DROP — no From/To primary)"; 642 `<JournalMonthGrid ...>`; 110-111 ledgerFrom/To only in Ledger segment; 827-834 From/To TextFields inside Ledger conditional.
- JournalMonthGrid + dayBrowse.ts present.
- **PASS (STATIC aid only)**. Stamp: proveout §0.1, DB-TREE-01.

### 5.2 DB-CE-ST-A-01 / DB-CE-ST-A-02 (P1) — Chrome entry ST-A
- Evidence (STATIC): trayTabs.ts (from prior ST-A stamp) has Diary in teacher tray 4; seat.ts / canOpenDiary closes student; hamburger for parent/office per intent.
- **BLOCKED ON ENV (LIVE UI teacher tray / parent hamburger / student zero required)**. Stamp: ST-A, DB-CE-ST-A-01/02.

### 5.3 DB-DH-01 (P1) — Dual-hat
- Evidence (STATIC): diarySeatForChrome + seat logic in diary.tsx:96-99; dual-hat comment in intent.
- **BLOCKED ON ENV (LIVE UI seat switch required)**. Stamp: DB-DH-01.

### 5.4 DB-NAV-01 / DB-NAV-02 (P1) — Month nav + auto-apply
- Evidence (STATIC): JournalMonthGrid props (month, selectedDay, onSelect, onNextMonth, onToday); shiftJournalSelectedDay / jumpJournalToday in diary.tsx:407; no primary Apply button in Journal.
- **BLOCKED ON ENV (LIVE UI pick/change/Today/month nav required)**. Stamp: DB-NAV-01/02.

### 5.5 DB-AG-01 / DB-EMPTY-01 (P1) — Agenda + empty
- Evidence (STATIC): buildJournalAgendaGroups, formatJournalDayHeader, DIARY_EMPTY_DAY_COPY, SectionHeader sticky intent in dayBrowse; EM-PRIMARY New entry CTA.
- **BLOCKED ON ENV (LIVE UI multi-day scroll + empty day + New entry required)**. Stamp: DB-AG-01, DB-EMPTY-01.

### 5.6 DB-COMP-01 (P1) — Composer DATE-P1
- Evidence (STATIC): createDiaryEntry / FormSheet Diary-only; entry_date prefill intent via selectedDay (DATE-P1 law).
- **BLOCKED ON ENV**. Stamp: DB-COMP-01.

### 5.7 DB-PRES-01 (P1/P0) — Presence PR-BOTH
- Evidence (STATIC): presenceCountByDay, PR-BOTH law in spec (neutral dot/count 9+ cap); no roleTint in JournalMonthGrid or dayBrowse.
- **BLOCKED ON ENV (LIVE UI owner-only dots required; P0 if leak)**. Stamp: DB-PRES-01.

### 5.8 DB-TWIN-01 (P0/P1) — Twins fail-closed
- Evidence (STATIC): parentTwinsFailClosed, multiChild, failClosedEmpty in diary.tsx:146-147; chips above month per intent.
- **BLOCKED ON ENV (LIVE UI parent 2+ chips + fail-closed empty required)**. Stamp: DB-TWIN-01.

### 5.9 DB-LED-01 / DB-CAL-01 (P1) — Product separation
- Evidence (STATIC): Ledger segment uses list+range only (ledgerFrom/To); Calendar route separate (no Diary body); no CalendarItem/EventComposer on Journal; FW-FORK diary-local.
- **PASS (STATIC)**. Stamp: DB-LED-01, DB-CAL-01, spec DB-PROD-01/02.

### 5.10 DB-SR-01 (P2) — Sort kept
- Evidence (STATIC): sortDiaryEntries, Newest/Oldest chips on agenda per SR-KEEP.
- **BLOCKED ON ENV**. Stamp: DB-SR-01.

### 5.11 DB-NG-01..13 (—) — Non-goals absent
- Evidence (STATIC): No student Diary (seat closed); no Ask NL merge; no Reminders; no FullCalendar; no roleTint; no 6th tray; Calendar.tsx unchanged; no invented glyphs.
- **PASS (NON-GOAL ABSENT — correct per stamp)**.

### 5.12 DB-P2-FILT / DB-P3-* (P2/P3) — Leftovers
- Evidence (STATIC): No filter-miss code visible; parent chips scoped to Journal in current tree; web split ~640px exists but stickiness unverified.
- **BLOCKED ON ENV (LIVE UI required to confirm parked items)**. No new defects filed.

## 6. DITL Note
DITL impact UPDATE_PLANS | UPDATE_CASES per proveout-objective §3. Sticky t_d94e0385 owns; DITL-S-02 student Diary remains NON-GOAL (do not revive). No rewrite on this card.

## 7. Disposition
- **RESULT:** UNPROVEN (LIVE UI execution blocked by env; cannot meet §0 honesty bar for stamp). TREE GATE explicit PASS. No P0/P1 filed (no repro evidence).
- **OPEN ISSUES:** LIVE UI prove-out pending CoS-staffed QA browser / Teach session. Parked P2/P3 unverified.
- **RECOMMENDED NEXT:** CoS staffs QAS review of this evidence + testplan. Staff PM if new DEFECT needed post-LIVE. Return to qa-supervisor for release review.
- **No DEFECT cards created on kelyra (no misses evidenced).**

*End DB-B testplan — t_35630cb5. Dual stamp unchanged. No self-certify.*