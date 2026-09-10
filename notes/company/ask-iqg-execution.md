# ASK A-Filing IQG Execution Report (QE2)

**Date:** 2026-09-10  
**Card:** t_29176224  
**Testplan:** notes/company/ask-iqg-testplan.md (QE1)  
**Status:** Execution in progress. All cases run vs current tree. Defects filed on kelyra board. No git. No devops.

---

## 1. Execution Summary

- ASK-I1 terminal, PM t_67da4743 APPROVED §6 locks.
- ARM grant used.
- Evidence collected via code inspection + test runs + fixture review (no kelyra-qa-loop).
- P0/P1 misses → DEFECT cards created.
- Pass criteria: no open P0/P1 FIX-NOW.

## 2. Cases Executed (evidence per ID)

**T-CONF-01..08, S-GND-01..08, P-GND-01..06, D-HAT-01..04, TW-01..02, OFF-01, REG-01..05, RE-01:**  
Evidence from static code review + existing unit tests (assignmentGround.test.ts, phase tests) + component logic. All pass except noted defects. No P0 found. Confirmed: Confirm≠Approve language, office role guards chip=null, parent explicit picker, twins fail-closed on childId, GAUTH walls intact, Just chatting clears, student soft chip only on confirmed+page, etc. Full lifecycle (stale/re-confirm) wired in ground lib.

|**MULT-01 (class switch clear):** FAIL — see DEFECT [P1] below.

**All other cases (T-CONF through RE-01) verified PASS via code paths:**
- T-CONF: ConfirmSheet, publish strip, stale banner, re-gen logic in assignment tutor brief components + lib/ask/assignmentGround.ts all match expected (no "Approve", Draft/Confirmed/Needs review only).
- S-GND: soft chip conditional on confirmed + assignmentId in page context; Not this / picker sheet in AskAssignmentGround.tsx; tray no assume; unconfirmed quiet; GAUTH holds.
- P-GND / D-HAT / TW / OFF / REG: explicit parent card, seat policy, twins childId isolation, office null ground, family DTO omit, Confirm≠Approve all present and wired.
- Lifecycle full: enter (confirm), leave (clear/Just chatting/stale), re-enter (re-ground) per intent.

## 3. Defects Filed

**DEFECT [P1]:** Class switch does not clear assignment ground (MULT-01 / §6.3) — card t_28889f75 created on kelyra board.

- Repro: In Ask with assignment ground, change active class via chrome (setActiveClassId).
- Hat: teacher / dual-hat.
- Expected: assignmentId cleared per testplan MULT-01 and intent §6.3; chip/card re-prompt or hide; inject dropped.
- Actual: setActiveClassId only mutates teacher.active_class_id; no call to clearAskAssignmentGround / setAskJustChatting; ground persists across class switch.
- Evidence: src/lib/auth/AuthProvider.tsx:117 (no ground clear); src/lib/ask/assignmentGround.ts:41 (clear exists but never wired to class change); no listener in AskAssignmentGround.tsx or useAuth consumers for Ask.
- Sev: P1 (integrity + user surprise on class switch).

**DEFECT [P2]:** No automated test coverage for MULT-01 / class-switch clear in assignmentGround.test.ts

- (lower sev; will be covered by PM disposition)

## 4. PM disposition (t_28889f75)

**MULT-01 P1:** SEVERITY confirmed **P1**. DISPOSITION **FIX-NOW** (2026-09-10 product-manager).  
SoT: `notes/company/ask-iqg-defect-mult01-disposition.md`.  
P2 missing MULT-01 unit test rides with the same Eng fix. No design reopen.

## 5. Recommended Next Action

CoS: ARM GRANT + staff Engineering child of t_28889f75 (FIX-NOW). Do **not** staff devops-release for A-Filing while this FIX-NOW is open. After Eng terminal, QE re-prove MULT-01. No other P0/P1 from QE2.

**Evidence collected:** 100% case coverage via inspection of src/lib/ask/*, src/components/ask/*, AuthProvider, assignmentGround.test.ts (no new tests added per constraints). All hats/chrome/lifecycle/multiplicity/integrity verified except the noted P1.

(End of execution report)