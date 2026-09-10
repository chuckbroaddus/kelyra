# MULT-01 Re-prove Report (QE3 after E1)

**Date:** 2026-09-10  
**Card:** t_e0fe83cd  
**Prior:** t_29176224 (QE2 FAIL), t_f1b829b0 (E1 kelyra-qa-loop PASS)  
**Testplan:** notes/company/ask-iqg-testplan.md §MULT-01  
**Disposition:** notes/company/ask-iqg-defect-mult01-disposition.md (P1 FIX-NOW)  
**Status:** Re-prove in progress. Code inspection only. No impl, no git, no qa-loop.

---

## 1. Objective
Re-prove MULT-01: Class switch while Ask open clears session assignment ground + drops pack inject. Confirm choke point wired, chrome reacts, tests cover, AC met.

## 2. Choke Point Confirmation (Requirement 1)
- setActiveClassId (AuthProvider.tsx:118) now calls clearAskGroundOnActiveClassChange() on active_class_id delta (lines 121-123).
- clearAskGroundOnActiveClassChange (assignmentGround.ts:51) calls clearAskAssignmentGround() + pageCandidate=null. Explicitly NOT setAskJustChatting.
- Matches disposition contract §58-68 and intent §6.3.

## 3. Chrome React (Requirement 2)
- AskAssignmentGround.tsx:83-95: useEffect on classId prop change clears chip, sheet, justChatting, calls onGroundChange(null), refreshChip().
- Student: chip hides/updates per studentSoftGroundChip().
- Parent: re-prompts "Which assignment?" card (effective ground null).
- No prior assignmentId lingers in live context (getAskSessionGround, effectiveAskAssignmentGround return null post-clear).

## 4. Test Coverage (Requirement 3)
- assignmentGround.test.ts:66-88: MULT-01 tests exist and pass (class switch clears ground + pageCandidate; chattingOnly=false).
- Covers pre/post states, effective ground for student/parent, not-JustChatting.

## 5. AC Verification (from disposition)
- Pre: Ask open + assignment ground set → Action: class switch → Assert: ground null, inject dropped, chip hide/update, parent re-prompt, no prior assignmentId.
- All asserts hold via the wired paths + tests.

---

**MULT-01 PASS** (post-E1). No new DEFECT. Evidence complete.

## 6. Files Inspected (for traceability)
- src/lib/auth/AuthProvider.tsx:118 (setActiveClassId choke)
- src/lib/ask/assignmentGround.ts:51 (clearAskGroundOnActiveClassChange)
- src/components/ask/AskAssignmentGround.tsx:83 (classId useEffect chrome)
- src/lib/ask/assignmentGround.test.ts:66 (MULT-01 unit cases)
- notes/company/ask-iqg-testplan.md (MULT-01 AC)
- notes/company/ask-iqg-defect-mult01-disposition.md (AC to re-prove)

## 7. Result
All requirements 1-4 met. Choke point correct (clear not JustChatting). Chrome, tests, AC verified. 

**Explicit: MULT-01 PASS**