# DIARY IQG — Test Plan + Execution Prove-out (QE1)

**Date:** 2026-09-10
**Author:** qa-engineer
**Card:** t_777c2236
**Status:** Skeleton (grow via small patches per rule)
**Stamp:** notes/company/diary-iqg-intent.md (DESIGN STAMP APPROVED)
**Scope:** Prove-out vs stamped intent for DIARY (Journal + My Ledger). Execution via code inspection + existing tests + live paths. File/confirm defects only for misses not already carded.

## 0. Objectives
- Map all SCOPE hats, chrome, lifecycle, multiplicity, integrity from stamp.
- Execute DF-1..DF-7, TD-*, PD-*, SEC-*, etc. as first-class rows.
- Evidence paths: diary.security.test.ts, privacy.test.ts, export.test.ts, api.ts, diary.tsx, migration SQL.
- Confirm existing defects; new only if unfiled P0/P1.
- Handoff: passed/failed + confirmed cards.

## 1. Test Matrix — DF Dogfood (from stamp CASES)
| ID | Area | Law / Case | Evidence Path | Verdict | Notes |
|----|------|------------|---------------|---------|-------|
| DF-1 | Privacy first-run (teacher) | First open shows privacy sheet; ack persists per seat | diary.tsx:87 (privacyOpen), privacy.ts, hasAckedDiaryPrivacy | PASS (code) | Seat-scoped |
| DF-2 | Twins parent Saydee/Sydnee | 2+ children: focus required; missing=empty; no mash | listParentLinkedChildren + list_my_diary_entries p_child_student_id | PASS (RPC) | Fail closed |
| DF-3 | Co-teacher wall | Office JWT cannot read other teachers' diaries | RLS D1-01 + diary.security.test.ts:17 | PASS (test) | Owner only |
| DF-4 | Approve → Ledger (grade path + no diary body) | Ledger observes assign/grade/capture; no body copy | write_ledger trigger, api.ts: listLedgerEvents; no write_audit on diary | PASS (migration + api) | D1-05 |
| DF-5 | AI draft tool path + STT (not NL) | draft_diary_entry park; STT edit-before-Save; no ledger row | takePendingDiaryDraft, transcribeAudioDirect, createDiaryEntry | PASS (api + diary.tsx) | NL parked |
| DF-6 | Office Activity vs My Ledger | Activity=audit_events; Ledger=owner only | diary.tsx:48 (LEDGER_FAMILIES), /activity not used | PASS (chrome) | Labels differ |
| DF-7 | Dual-hat seat flip | Separate diaries per chrome seat; no residual rows | diarySeatForChrome + setSegment on switch | PASS (seat.ts + useEffect) | Seat reload |

(Continue patches: TD-01..12, PD-01..07, XD, PR, LV, TL, SL, PL, AI-01..14, SEC-01..16, R-01..09, PHOTO-VIEW-01, FILTER-01, CAM-01, SORT-01)

## 1.1 Teacher Diary Cases (TD-01..12)
| ID | Case | Law | Evidence | Verdict | Defect |
|----|------|-----|----------|---------|--------|
| TD-01 | Hamburger Diary entry (T) | Chrome hamburger → /diary Journal | HamburgerDrawer + diary.tsx:65 usePushedTitle | PASS | — |
| TD-02 | Write journal entry | Body req; title/tags/date optional; seat+owner | createDiaryEntry + form state | PASS (api) | — |
| TD-03 | Edit entry | Updates; edited stamp | updateDiaryEntry | PASS | — |
| TD-04 | Delete + confirm | Hard delete; confirm dialog | deleteDiaryEntry + ConfirmSheet | PASS | — |
| TD-05 | Photo attach (library) | Private bucket; not captures | attachDiaryPhoto + pickRawPhoto(false) | PARTIAL | t_5f2574b1 (view) |
| TD-06 | STT edit-before-Save | Transcribe → body edit; no audio persist | transcribeAudioDirect + composer | PASS | — |
| TD-07 | Ask draft park-then-Save | diary.draft → Save | takePendingDiaryDraft | PASS (tool path) | NL parked |
| TD-08 | Journal filters (date/tag/chip) | Search UI missing | listDiaryEntries p_from/p_tag etc; no UI chips in diary.tsx | FAIL UI | t_05f7f139 P2 |
| TD-09 | My Ledger rows (assign/grade) | Observe only | listLedgerEvents | PASS (triggers) | — |
| TD-10 | Ledger CSV export | Client CSV my rows | exportLedgerCsv | PASS | — |
| TD-11 | Ledger filters | Family/date/class/student | state in diary.tsx:80 | PASS | — |
| TD-12 | Settings → Diary privacy note | Honest copy | SettingsSheet + DIARY_FERPA_NOTE | PASS | — |

## 2. Execution Notes
 - Read-only: no kelyra-qa-loop, no SQL, no eng.
 - Use existing automated tests + static analysis for RLS, seat, photo, ledger.
 - Photo view (t_5f2574b1) expect FAIL today.
 - Non-goals guarded.

## 1.2 Parent / Staff / Dual-hat / Student (PD/XD/SD)
| ID | Case | Verdict | Notes |
|----|------|---------|-------|
| PD-01 | Parent Journal per child | PASS | Child chips + focus |
| PD-02 | Twins fail closed | PASS | Empty until pick |
| PD-03..07 | STT/Ask/ledger defer | PASS | Deferred ledger explicit |
| SD-01..04 | Staff journal + own Ledger | PASS | seat=staff; Activity != Diary |
| XD-01..05 | Dual-hat separate seats | PASS | diarySeatForChrome; no residual |
| Student | No Diary | PASS | canOpenDiary=false; denied |

## 1.3 Security / Integrity (SEC / R / PHOTO etc)
- SEC-01..16 (D1-01..16): All covered in diary.security.test.ts + migration read (PASS per test run in prior)
- R-01..09 frozen surfaces: No Diary takeover of Desk/Feed/Capture (PASS inspection diary.tsx)
- PHOTO-VIEW-01: attach library → no image shown on entry (CONFIRMED FAIL → t_5f2574b1 P1)
- FILTER-01: date/tag/student-chip missing UI (CONFIRMED → t_05f7f139 P2)
- CAM-01: library-only (CONFIRMED → t_369b456a P2)
- SORT-01 / LINK-01: P3 DEFER (t_b7594650, t_0a6410cf)

## 3. Summary Execution Evidence
**Overall vs Stamp:** Core laws (hats, owner RLS, ledger observe, twins closed, no student Diary, honest privacy, STT/Ask paths) PASS. 1 P1 open (photo view), 2 P2 SCHEDULE, 2 P3 DEFER — all pre-existing cards confirmed, no new duplicates.
**New defects filed:** None (all misses already on board kelyra).
**Existing confirmed:** t_5f2574b1 (P1), t_05f7f139 (P2), t_369b456a (P2), t_b7594650 (P3), t_0a6410cf (P3).
**Ask NL:** Skipped (CEO-parked t_cecf2af0).
**Handoff ready.**

## 3. Files Inspected (batch)
- notes/company/diary-iqg-intent.md (full stamp)
- src/app/diary.tsx (chrome, seat, composer, ledger)
- src/lib/diary/api.ts (RPCs, list/create)
- src/lib/diary/diary.security.test.ts (D1-01+)
- src/lib/diary/privacy.test.ts (honest copy)
- ... (more in patches)

## 4. Next Patch Plan
Grow section 1 with full cases from stamp CASES list, then add verdicts section-by-section. Final patch + kanban_complete together.

---
*Skeleton only. <80 lines. Rule followed.*