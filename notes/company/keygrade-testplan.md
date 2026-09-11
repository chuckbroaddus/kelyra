# KEYGRADE Pack B Prove-out Testplan (QE vs PR 47)

**Date:** 2026-09-10 (America/Chicago)  
**Card:** `t_78ee4014` [KEYGRADE-QE] Prove-out vs PR 47 from QAS OBJECTIVE  
**Author:** grok-bot-consultant (QA Engineer hat)  
**Engine / pool:** grok-bot | ARM GRANT `a_fc43b6a58e`  
**Against stamp:** `keygrade-intent.md` + `keygrade-pm.md` (Pack B dual DESIGN STAMP APPROVED) + `keygrade-phone-approve-options.md`  
**QAS SoT:** `notes/company/keygrade-proveout.md` (OBJECTIVE **stamp met**; §5 must-prove)  
**PR:** https://github.com/chuckbroaddus/kelyra/pull/47 — OPEN; feat `0ef30803` / proveout `4840bc2`  
**Branch / worktree:** `feature/keygrade-pack-b-phone-approve-t_3bb0483a` @ `/Users/chuckbroaddus/projects/kelyra-keygrade-pack-b-t_3bb0483a`  
**Status:** Executed. Code/unit evidence recorded. Device/manual items **SKIP** (no iPhone / no booted Simulator / no Parent seat session). **No product implement. No merge. No live SQL. DITL cases not rewritten. Epic `t_15ae546e` not unblocked.**

---

## 1. Scope & hats

| Hat | In scope for this prove-out | How evidenced |
|---|---|---|
| Teacher (Teach seat) | Pack B phone confirm + Approve; web proposal Approve alternate | Static + unit; manual phone **SKIP** |
| Unassigned | Approve blocked until file; matcher never INSERT | Static + unit (`matcherWall`, Pack B `canPublish`) |
| Twins / same first name | Confirm chip required; never auto-pick | Unit (`twins.ts` + Pack B gate) |
| Parent / family (M11) | No Approve; no draft/key leak; post-Approve only | Unit (`approveGate`, `familyOmit`) + gradebook family path static; seat UI **SKIP** |
| Office / superintendent | No KEYGRADE Approve chrome (CEO #1 OUT) | Unit deny reasons + Capture tray teacher-seat wall |
| Dual-hat T+P | Teach may Approve; Parent never | Gate unit; device seat switch **SKIP** |
| GAUTH L3 | Explain / model totals ≠ `score-key` award | Unit `scoreKey` ignores `modelTotal`; GAUTH security tests (pre-existing) |

**Out of scope:** merge PR 47; unblock `t_15ae546e`; rewrite DITL plans/cases; grok-build / CloudAgent / Mac Build; live DB.

---

## 2. Environment & execution log

| Step | Result |
|---|---|
| Worktree checkout | `feature/keygrade-pack-b-phone-approve-t_3bb0483a` @ `4840bc2` (clean vs origin) |
| Unit tests | `node --experimental-strip-types --test src/lib/assignments/scoreKey.test.ts src/lib/keygrade/*.test.ts` → **15 pass / 0 fail** (2026-09-10 CT) |
| `tsc --noEmit` | **BLOCKED locally** — worktree has no `typescript` / `tsc` binary (`npm run typecheck` → `tsc: command not found`). PR body claims clean; not re-verified here. |
| iPhone / Simulator | **Unavailable** — `xcrun simctl` not installed; no `/dev/cu.iPhone*`; no booted sim. Manual phone / Parent seat UI = **SKIP**. |
| Live SQL / device Approve | **Not run** (constraint). |

---

## 3. Must-prove matrix (QAS §5)

Legend: **PASS** = proven with code static review and/or unit tests on PR tree. **SKIP** = device/manual required; no session — do not invent PASS. **FAIL** = stamp miss (would file DEFECT).

### MP-1. Teach phone: keyed → confirm → Approve → `approved_score`

| | |
|---|---|
| **Result** | **PASS (code/unit)** + **SKIP (device E2E)** |
| **Evidence** | `KeygradePackBReview.tsx`: per-item Confirm / Confirm & next; `canPublish` requires Teach + allConfirmed + filed student; CTA **Approve this capture**. `capture.tsx`: wires Pack B; `persistCapture('approve')` → `approveCapture(..., draftScore, { scoreMark: 'numeric' })` which writes `approved_score`. Source wall in `approveGate.test.ts` asserts Pack B strings + `persistCapture('approve'`. |
| **Device** | **SKIP** — no iPhone session to shutter → Review & score → confirm → Approve and observe published cell. |
| **Defect?** | No (product surface present; manual leftover only). |

### MP-2. Unassigned: Approve disabled until file; matcher never INSERT

| | |
|---|---|
| **Result** | **PASS** |
| **Evidence** | Pack B: `unassigned = !studentId` → `canPublish` false; copy “File a student before Approve. Matcher never creates a roster row.” `capture.tsx` approve path errors if `!studentId`. `matcherWall.test.ts`: `matchName` / `applyTranscriptAndMatch` no `students.insert`; `createCapture` starts `student_id: null` / `status: 'unassigned'`; Pack B copy wall. |
| **Device** | **SKIP** UI-only confirmation of disabled CTA on phone (logic covered by unit + static). |
| **Defect?** | No. |

### MP-3. Twins chip required

| | |
|---|---|
| **Result** | **PASS** |
| **Evidence** | `twins.ts` `findTwinCandidates` returns ≥2 same-first-name hits else []. Pack B: `twinsNeedConfirm = twinCandidates.length >= 2 && !studentId` → blocks `canPublish`; chip row required. Unit: two Mateos → length 2; Sofia alone → 0. |
| **Device** | **SKIP** live twin roster on phone. |
| **Defect?** | No. |

### MP-4. Parent seat: Approve denied; no draft leak

| | |
|---|---|
| **Result** | **PASS (code/unit)** + **SKIP (seat-switch UI)** |
| **Evidence** | `canApproveKeygrade('parent') === false`; deny reason matches `/Parent seat cannot Approve/`. Pack B shows deny text and disables Approve when `!allowApprove`. `capture.tsx` / `proposal.tsx` refuse `mode === 'approve'` when seat ≠ teacher. Family omit: `FAMILY_OMIT_CAPTURE_KEYS` includes `model_draft`, `draft_score`, key_* fields; `FAMILY_CAPTURE_SELECT` omits drafts/keys and keeps `approved_score` (`familyOmit.test.ts`). |
| **Device** | **SKIP** — no dual-hat Teach↔Parent session to prove UI. |
| **Note** | Web `proposal.tsx` sticky **Approve** button is not JSX-disabled by seat (runtime deny only). Capture / header Capture are Teach-seat gated (`headerCapture.ts`), so Parent seat should not reach homework proposal via Capture. Residual polish, not a stamp chrome miss for KEYGRADE Pack B phone path — **no DEFECT filed**. |
| **Defect?** | No. |

### MP-5. Office / super: no KEYGRADE Approve chrome

| | |
|---|---|
| **Result** | **PASS** |
| **Evidence** | CEO lock #1. `canApproveKeygrade` false for `administrator` / `superintendent`; deny “out of v1”. Capture tray / header Capture require `role === 'teacher'`. No office/super KEYGRADE desk added on PR 47. Unit: `Office/superintendent KEYGRADE Approve chrome OUT of v1`. |
| **Device** | N/A (chrome absence proven by seat walls + gate). |
| **Defect?** | No. |

### MP-6. Web proposal Approve still publishes

| | |
|---|---|
| **Result** | **PASS (code/static)** + **SKIP (manual UI)** |
| **Evidence** | `proposal.tsx` still exposes sticky **Approve** for homework + `studentId`; `saveHomework('approve')` → `saveCaptureEvaluation` → `attachCapture` → `approveCapture(...)` (same publish path). Keyed path uses `canApproveKeygrade(chrome.role)` before approve. Coexists with Pack B phone path (does not remove web). |
| **Device** | **SKIP** — no interactive teacher web/session run in this consultant turn. |
| **Defect?** | No. |

### MP-7. GAUTH L3: Explain ≠ `score-key`

| | |
|---|---|
| **Result** | **PASS** |
| **Evidence** | `scoreKey.ts`: pure TS; documents “Ignores model totals”; returns `ignored_model_total`. Unit `score-key ignores model totals (GAUTH L3 / S1 T4)`: `modelTotal: 99` → `draft_score` 100, not 99. Capture/proposal pass vision total as `modelTotal` into `scoreKey` / `buildKeyScoreDraft` so award stays scripted. Pre-existing `gauth.security.test.ts` asserts Explain edge does not write `approved_score`. |
| **Defect?** | No. |

### MP-8. Pre-Approve: family cannot see drafts

| | |
|---|---|
| **Result** | **PASS** |
| **Evidence** | `familyOmit.test.ts` + `FAMILY_OMIT_CAPTURE_KEYS` / `FAMILY_CAPTURE_SELECT`. Family gradebook (`loadFamilyStudentGradebook` / `mapGradebookRows`) exposes `approved_score` only on cells — not `draft_score`. Weekly digest selects captures with `approved_at` + parent sentence fields only (no draft columns). Parent `/parent/grades` uses `StudentGradeBook` → family gradebook RPC. |
| **Residual** | `FAMILY_CAPTURE_SELECT` / `omitFamilyCaptureSecrets` are defined and unit-tested but **not referenced from production loaders** on this tree (only re-export / tests). Current family score path already uses submissions/`approved_score`, so no live leak found. Treat as defense-in-depth leftover for Eng — **not filed as DEFECT** (no observed draft leak; QAS already **stamp met**). |
| **Defect?** | No. |

---

## 4. Unit evidence (re-run on PR tree)

```
node --experimental-strip-types --test \
  src/lib/assignments/scoreKey.test.ts \
  src/lib/keygrade/*.test.ts
→ 15 pass / 0 fail
```

Covered suites: score-key MC/numeric/blanks/GAUTH L3/maxScore; Approve Teach-only + Parent deny + Pack B source wall + office/super OUT; family omit + FAMILY_CAPTURE_SELECT; matcher never INSERT + twins never auto-pick + createCapture Unassigned.

---

## 5. Defects filed

| ID | Sev | Title | Disposition |
|---|---|---|---|
| — | — | — | **None.** No stamp-gapped product miss found vs Pack B + CEO locks on PR 47. Manual phone/Parent/Unassigned/twins/web UI remain QE leftovers (SKIP), not DEFECT cards. Residual notes (proposal sticky seat JSX; unused FAMILY_CAPTURE_SELECT call sites) documented above — do not mint casual loop P2/P3 stickies. |

---

## 6. DITL note (do not rewrite on this card)

QAS DITL IMPACT = **UPDATE_CASES** (T-01 / DH-01 / T-02 cases stale). This card **does not** rewrite DITL plan/case files. CoS owns sticky `DITL-UPDATE:` separately.

---

## 7. Close summary (for CoS / complete_consultant_task)

```
KEYGRADE-QE t_78ee4014 vs PR 47 (0ef30803 / 4840bc2):
MP-1 PASS(code)+SKIP(device) | MP-2 PASS | MP-3 PASS | MP-4 PASS(code)+SKIP(seat UI)
MP-5 PASS | MP-6 PASS(code)+SKIP(manual) | MP-7 PASS | MP-8 PASS
units 15/15 pass; tsc local BLOCKED (no tsc binary); no iPhone/sim
DEFECT cards: none
testplan: notes/company/keygrade-testplan.md
PR: https://github.com/chuckbroaddus/kelyra/pull/47
no merge; epic t_15ae546e untouched; DITL cases not rewritten
```

*End testplan — t_78ee4014.*
