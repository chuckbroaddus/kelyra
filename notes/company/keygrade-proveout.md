# KEYGRADE IQG Prove-out — OBJECTIVE + DITL IMPACT vs PR 47

**Date:** 2026-09-10 (America/Chicago)  
**Card:** `t_ab9787e7` [KEYGRADE-IQG] QAS prove-out OBJECTIVE + DITL IMPACT vs PR 47  
**Author:** grok-bot-consultant (QA Supervisor hat)  
**Engine:** grok-bot (docs only — no implement / no merge / no CloudAgent)  
**Against stamp:** `keygrade-intent.md` + `keygrade-pm.md` (Pack B dual DESIGN STAMP APPROVED) + designer `keygrade-phone-approve-options.md`  
**Shipped ref:** [PR #47](https://github.com/chuckbroaddus/kelyra/pull/47) head `0ef30803` — `feature/keygrade-pack-b-phone-approve-t_3bb0483a`  
**Status:** Complete for this card (code inspection of PR 47 vs stamp). Manual phone QE not executed here.

---

## OBJECTIVE verdict

```
OBJECTIVE VERDICT
Feature: KEYGRADE v1 Pack B phone confirm + Approve (CEO locks)
Stamp: APPROVED (intent + pm, Pack B chosen)
Shipped: PR 47 @ 0ef30803
Verdict: stamp met
```

**Meaning:** Code on PR 47 implements the stamped Pack B + CEO locks for in-scope chrome. Gaps below are **QE leftovers / DITL case rewrites**, not missing stamp-required product surface on the PR.

---

## 1. QAS Prove-out OBJECTIVE (full featured vs stamp)

Full-featured KEYGRADE v1 (for QE) means the following hold vs the APPROVED stamp:

### Hats & chrome entry
| Hat | Must | Stamp law |
|---|---|---|
| Teacher | Phone Capture → Pack B per-item confirm + **Approve this capture**; web Approve alternate | CEO #4 + Pack B |
| Student | Post-Approve keyed cell only (existing Grades) | Reuse live Grades |
| Parent | Post-Approve cell only (M11); never Approve; never see drafts/extract | CEO #3 |
| Office / Superintendent | No KEYGRADE confirm/Approve chrome | CEO #1 OUT |
| Dual-hat T+P | Teach seat may phone-Approve own classes; Parent seat published only | DH-01 |

### Pack B lifecycle
1. Plan key on web (AssignmentForm) — out of PR 47 scope, pre-existing.  
2. Capture on phone `/capture`.  
3. Extract → `score-key` pure TS → `model_draft` / `draft_score` only (`method = key_score`).  
4. Capture review: per-item contextual confirm/override (MC/numeric); **Confirm & next**.  
5. Twins confirm (never auto-pick); Unassigned file-then-confirm (matcher never INSERT).  
6. **Approve this capture** publishes `approved_score`. Nothing is a grade until Approve.  
7. Teach seat only; Parent/office/super denied.

### Multiplicity & non-goals
- Twins, two classes, multi-page, two keys, two devices covered by stamp.  
- Explicit non-goals: office/super KEYGRADE; parent Approve/draft leak; matcher INSERT; auto-publish; Ask `grade_photo`; ZipGrade; new parent KEYGRADE book; Pack A/C.

### GAUTH L3 + v1 item types
- Awards = `score-key` scripts; Explain/Help must not substitute totals.  
- v1: MC + numeric; short/show-work → `needsTeacher`.

---

## 2. Evidence matrix vs PR 47 (`0ef30803`)

| Stamp requirement | PR 47 evidence | Met? |
|---|---|---|
| Pack B on Capture review | `KeygradePackBReview.tsx` + wiring in `capture.tsx` (keyed extract → reviewOpen; Confirm & next; Approve this capture) | Yes |
| Phone Approve publishes | `onApprove` → `approveCapture` / `approved_score` path; gate `canPublish` requires allConfirmed + filed student | Yes |
| Teach seat only | `approveGate.ts` — `canApproveKeygrade` only `teacher`; Parent/office/super deny reasons; used in Pack B UI + `proposal.tsx` | Yes |
| Twins never auto-pick | `twins.ts` `findTwinCandidates`; Pack B blocks Approve until twin chip selected | Yes |
| Unassigned first-class; matcher never INSERT | Pack B Unassigned file chips; `matcherWall.test.ts` (no students.insert; createCapture starts unassigned) | Yes |
| Family omit drafts/keys (M11) | `FAMILY_OMIT_CAPTURE_KEYS` / `omitFamilyCaptureSecrets`; `familyOmit.test.ts` | Yes |
| Web Approve alternate | `proposal.tsx` still Approves; keyed path uses `canApproveKeygrade` | Yes |
| Pure `score-key` TS awards | `scoreKey.ts` + `scoreKey.test.ts`; draft builder in `keygrade/draft.ts` | Yes |
| No SQL / no secrets | PR body: no migrations applied | Yes |
| Office/super OUT | Deny strings in `approveGate`; no office KEYGRADE chrome added | Yes |

**Unit tests on PR:** `scoreKey` + `keygrade/*.test.ts` (15 pass per PR body); `tsc --noEmit` clean.  
**Manual (PR checklist unchecked — QE leftover, not stamp miss):** Teach phone Approve; Parent deny; Unassigned block; twins chip; web proposal Approve.

---

## 3. DITL IMPACT vs shipped PR 47

```
DITL IMPACT
Change: KEYGRADE Pack B phone confirm+Approve shipped on PR 47 (0ef30803); plans already Pack-B-aware (t_21f95d30)
Verdict: UPDATE_CASES
Plans touched: DITL-T-01 (primary — already rewritten; no further plan edit required vs PR 47); DITL-T-02 (secondary — already notes web alternate / must not forbid phone); DITL-DH-01 (already Teach phone-Approve / Parent never Approve)
Cases touched: DITL-T-01 cases (stale — still assert “no grade approve on mobile”); DITL-DH-01 cases (missing Pack B Teach Approve + Parent never Approve keyed drafts); DITL-T-02 cases (add note that web Approve coexists with T-01 phone path; do not forbid phone)
New DITL needed: no
Seed/artifacts: reuse keyed HW + key fixtures already named on T-01 plan (e.g. F-ART-HW-MATH-ALG-TYPED / F-ART-KEY-*); no new seed required for this prove-out
Notes: Plans match shipped PR 47 → not UPDATE_PLANS. Cases (WIP / not on PR 47 tree) still contradict CEO #4. CoS should file sticky DITL-UPDATE: for case rewrite only. Do not fake PASS on unchecked manual phone Approve / twins / Unassigned. Do not merge from this card.
```

### Plan vs case delta (why UPDATE_CASES)
| Artifact | Pack B / CEO #4 state | Action |
|---|---|---|
| `ditl-plans/DITL-T-01.md` | Beats 12–13 Pack B confirm + phone Approve | None vs PR 47 |
| `ditl-plans/DITL-T-02.md` | Web alternate; must not forbid phone | None vs PR 47 |
| `ditl-plans/DITL-DH-01.md` | Beat 3b Teach phone Approve; Parent never Approve | None vs PR 47 |
| `ditl-cases/DITL-T-01.md` | **UI-05 still: “Confirm no grade approve on mobile”** — contradicts stamp + PR 47 | **Rewrite** — add Pack B confirm+Approve cases; remove anti-phone-Approve assert |
| `ditl-cases/DITL-DH-01.md` | Seat isolation only; no keyed Pack B Approve / Parent deny | **Thicken** — Teach Pack B Approve; Parent seat cannot Approve / no draft leak |
| `ditl-cases/DITL-T-02.md` | Web Approve only | **Note** coexistence with T-01 phone path |

---

## 4. Gaps / leftovers vs Pack B stamp

| Kind | Item | Disposition |
|---|---|---|
| Stamp product surface | Pack B phone confirm+Approve + CEO locks on PR 47 | **Met** |
| QE leftover | Manual phone / Parent / Unassigned / twins / web proposal (PR test plan unchecked) | Staff qa-engineer from this OBJECTIVE; do not fake PASS |
| DITL leftover | Cases stale (esp. T-01-UI-05 anti-phone-Approve) | CoS sticky `DITL-UPDATE:` → UPDATE_CASES |
| Out of scope here | Merge PR 47; unblock epic `t_15ae546e`; Eng follow-ups; SQL | Do not do from this card |

**No stamp-gapped product chrome found on PR 47 head** relative to Pack B + CEO locks. Leftovers are prove/QE + case docs.

---

## 5. Must-prove QE cases (for qa-engineer; do not execute here)

1. Teach seat phone: keyed assignment → Review → per-item confirm → **Approve this capture** → `approved_score` set.  
2. Unassigned: Approve disabled until file; matcher never INSERT.  
3. Twins / same first name: confirm chip required; no auto-pick.  
4. Parent seat: Approve CTA denied/disabled; no draft/extract leak (M11 post-Approve only).  
5. Office/super: no KEYGRADE Approve chrome / deny path.  
6. Web proposal Approve still publishes when phone path also exists.  
7. GAUTH L3: Explain does not substitute `score-key` totals.  
8. Pre-Approve: family cannot see drafts.

---

## 6. Close disposition (this card)

| Field | Value |
|---|---|
| OBJECTIVE verdict | **stamp met** |
| DITL IMPACT verdict | **UPDATE_CASES** |
| File | `notes/company/keygrade-proveout.md` |
| PR | https://github.com/chuckbroaddus/kelyra/pull/47 (docs commit on Pack B branch) |
| Eng / merge | **No** from this card |

*End prove-out — t_ab9787e7.*
