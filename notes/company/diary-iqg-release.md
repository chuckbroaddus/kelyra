# DIARY IQG — RELEASE EVIDENCE

**Date:** 2026-09-10
**Card:** t_98e33df9 · qa-supervisor
**Feature:** DIARY — private Journal + My Ledger (owner seat-scoped)
**Process:** notes/company/INTENT_QUALITY_GATE.md § verification

---

## RELEASE STAMP

```
RELEASE STAMP
Feature: DIARY — private Journal + My Ledger (owner seat-scoped)
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_98e33df9 / qa-supervisor
Open P0/P1 FIX-NOW: none (photo view t_5f2574b1 CLOSED)
Stamp vs prove-out: met (hats/chrome/lifecycle/multiplicity/security/non-goals)
P2 leftovers: sticky SCHEDULE (filters t_05f7f139, camera t_369b456a) — do not block
P3 leftovers: sticky DEFER (sort t_b7594650, deep-link t_0a6410cf) — do not block
```

---

## 1. Gate checklist

| Gate | Status | Evidence |
|---|---|---|
| Dual DESIGN STAMP | **APPROVED** | `diary-iqg-intent.md` · QA Sup `t_bdce4c12` · PM pre-IQG + disposition `t_82ac1f93` / DIARY-P1 |
| Implementation | shipped + P1 fix | DIARY-I1 PR #39 + photo FIX-NOW `t_24cb967f` (list+signed URL wired) |
| QE plan + execute | **PASS** | QE1 `t_777c2236` → `diary-iqg-testplan.md` |
| PHOTO-VIEW re-prove | **PASS** | QE2 `t_bf2488e7` → `diary-iqg-photo-reprove.md`; defect `t_5f2574b1` **done** |
| Open P0/P1 FIX-NOW | **none** | Photo P1 closed; no other DIARY P0/P1 open |
| Independent recheck | **pass** | this card: code + `npx tsx --test src/lib/diary/*.test.ts` → **14/14** |

---

## 2. Stamp vs prove-out map (skeleton)

| Stamp dimension | Met? | Notes |
|---|---|---|
| Hats T/S/P + dual + student none | Yes | QE DF/TD/PD/XD; canOpenDiary false |
| Chrome hamburger Diary; Activity ≠ Diary | Yes | Drawer + routes |
| Lifecycle write/edit/delete/STT/Ask draft | Yes | QE1 PASS |
| Photo attach **and** view | Yes | Post FIX-NOW + QE2 PASS |
| Multiplicity twins fail-closed | Yes | RPC + UI empty until pick |
| Security owner RLS / private bucket | Yes | D1-01.. + security tests |
| Non-goals guarded | Yes | No student Diary; parent ledger defer; Ask NL parked |
| P2/P3 leftovers | Sticky | Do not elevate; do not block RELEASE |

---

## 3. Code choke points verified (QA Sup recheck)

- `src/app/diary.tsx`: `loadDiaryPhotoViews` (857) calls `listDiaryMedia` + `diaryMediaSignedUrl`; fail → `[]` never throws
- Journal cards + composer: `DiaryPhotoStrip` via `entryPhotos` / `composerPhotos`; refresh after attach; re-open loads
- `src/lib/diary/api.ts`: `listDiaryMedia`, `diaryMediaSignedUrl` → `signedDiaryUrl`; attach path `{uid}/{seat}/{entry}/{media}`; delete GCs storage
- Security unit this run: **14/14 pass** including `TD-05 / t_5f2574b1: diary UI lists media and signs private diary URLs for view`
- Owner seat: `diarySeatForChrome` + seat on list/attach; twins fail-closed RPC; student dark (`canOpenDiary`)

---

## 4. Defect trail

| Item | Sev | Disposition | Status after REL |
|---|---|---|---|
| Photo never shown after attach `t_5f2574b1` | P1 | FIX-NOW | **CLOSED** (eng `t_24cb967f` + QE2 PASS) |
| Journal date/tag/student filters `t_05f7f139` | P2 | SCHEDULE | sticky blocked — **does not block RELEASE** |
| Attach library-only (no camera) `t_369b456a` | P2 | SCHEDULE | sticky blocked — **does not block RELEASE** |
| No newest/oldest sort `t_b7594650` | P3 | DEFER | sticky — **does not block RELEASE** |
| Ledger no entity deep-link `t_0a6410cf` | P3 | DEFER | sticky — **does not block RELEASE** |
| Ask NL Dear Diary `t_cecf2af0` | — | CEO parked | **not reopened** |
| QE new DEFECT cards | — | — | **none** |

No leftover elevates to open P0/P1 vs stamped DIARY intent. P2/P3 stay sticky per PM disposition `t_82ac1f93` / `diary-iqg-defect-disposition.md`.

**Evidence honesty:** QE1/QE2 are code inspection + automated security/privacy/export tests (not live JWT dogfood screenshots). Independent recheck confirms photo wiring + 14/14 diary unit tests including TD-05. Core laws + closed P1 are sufficient for RELEASE APPROVED; incomplete interactive DF screenshots do **not** rise to REJECT given stamp §5.2 (live DF was prove-out debt owned by QE, and QE marked matrix PASS via code/RPC/test paths).

---

## 5. Verdict

**RELEASE: APPROVED**

CEO IQG condition met: dual design stamp + prove-out PASS + open P0/P1 FIX-NOW closed (photo view) + QA Sup release evidence. SCHEDULE/DEFER P2/P3 do not block.

**QA Supervisor does not staff DevOps.** Do not reopen Ask NL `t_cecf2af0`. Do not complete parent tracker `t_b6b8e31b` from this card (CoS owns epic sticky).

---

## 6. Handoff

| Field | Value |
|---|---|
| RESULT | RELEASE APPROVED |
| FILES | `notes/company/diary-iqg-release.md` |
| OPEN ISSUES | P2 SCHEDULE filters/camera; P3 DEFER sort/deep-link — sticky only |
| ESCALATION | No |
| NEXT | CoS reports; staff `devops-release` **only if Chuck wants DIARY on git**. Parent `t_b6b8e31b` stays sticky until CoS decides epic close. |

### RELEASE STAMP (card copy)

```
RELEASE STAMP
Feature: DIARY — private Journal + My Ledger (owner seat-scoped)
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_98e33df9 / qa-supervisor
Open P0/P1 FIX-NOW: none (t_5f2574b1 CLOSED)
Stamp vs prove-out: met
P2/P3: sticky SCHEDULE/DEFER — non-blocking
```

### RECOMMENDED NEXT ACTION (CoS)

1. Report DIARY IQG RELEASE APPROVED to Chuck.
2. Staff `devops-release` only if Chuck wants DIARY commits on git — not automatic; no force-push; no secrets.
3. Leave P2 SCHEDULE (`t_05f7f139`, `t_369b456a`) and P3 DEFER (`t_b7594650`, `t_0a6410cf`) sticky.
4. Do not reopen Ask NL `t_cecf2af0`.
5. Parent tracker `t_b6b8e31b` stays sticky — CoS may close epic when ready; this card does not complete it.

*End DIARY IQG release evidence — APPROVED 2026-09-10 (`t_98e33df9`).*
