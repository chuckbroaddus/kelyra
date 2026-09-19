# TEACH-PERF S1+S2 — IQG Prove-out OBJECTIVE + DITL IMPACT

**Date:** 2026-09-19 (America/Chicago)  
**Card:** `t_28b059c3` QAS: TEACH-PERF S1+S2 DITL IMPACT + prove-out OBJECTIVE  
**Author:** qa-supervisor (Kelyra)  
**Process:** `notes/company/INTENT_QUALITY_GATE.md` Phase 4 · `notes/company/DITL_OS.md`  
**Against dual stamp (MET 2026-09-19):**  
- PM lock: `notes/company/teach-sluggishness-s1s2-pm-lock.md` — PM APPROVED `t_ad80706f` · QG-01..08 · PERF-01..24 · US-PERF-01..12  
- QAS intent: `notes/company/teach-sluggishness-s1s2-intent.md` — QAS APPROVED `t_db3019ca` · TP-01..20  
**Implementation claim:** Loop **complete/passed** `wf_01a0bbace97379c3b37dd244217f01ba` (parent Eng `t_85a10114`). Dual stamp MET before Eng. **Landed on dirty main (no PR)** at OBJECTIVE write: inbox first-paint without roster/thumbs/`refreshTeacher` when class known; chrome **12s** class-keyed TTL + pathname-hop skip; S3 shared filters; mid-flight invalidate. Loop narrative: **0 P0/P1**. P2/P3 sticky leftovers already filed (do not re-open here).  
**Status:** Prove-out **OBJECTIVE + DITL IMPACT only**. **Do not execute** live tests on this card (`qa-engineer`). No `src`. No Eng. No git. No DESIGN STAMP redo. No live UI clicks from QAS.

**Noun:** Needs Attention (route `/inbox`; never “Inbox” Chuck-facing).

---

## PROVE-OUT STAMP READY

```
PROVE-OUT OBJECTIVE
Feature: TEACH-PERF S1+S2 — Needs Attention first paint (inbox waterfall) + chrome Needs TTL cache / tray-hop refetch relief (+ S3 shared filters)
Stamp: dual APPROVED 2026-09-19 (PM t_ad80706f + QAS t_db3019ca)
Implementation claim: t_85a10114 / wf_01a0bbace97379c3b37dd244217f01ba passed; dirty main no PR; 0 P0/P1 loop; P2/P3 leftovers sticky
Verdict: READY FOR qa-engineer — TREE GATE (§0) before any pass claim; LIVE UI required for user-visible PERF rows
Blockers for QE: none for plan/cases authoring; LIVE EXEC needs Teach web (+ dual-hat seats when available) + Chuck signs in himself + CoS QA browser (no passwords)
SQL: none named (no devops-release SQL gate)
DITL: NONE this change — no DITL-UPDATE sticky from this verdict
```

---

## 0. Honesty bar — LIVE UI vs STATIC (binding)

| Claim class | Counts as stamp evidence? | Notes |
|---|---|---|
| **LIVE UI** Teach web: cold `/inbox` first paint; tray hops Desk↔Needs↔Diary↔Calendar↔Ask; dual-hat Office/Parent Needs=0; assign sheet roster; badge vs list | **YES — required** for TP-01..06, 08..14, 17..18 / US-PERF-01..08, 11 | Experience-first. Screenshots or structured step log with seat + route + timing/network notes. |
| Unit / leftover tests (`teachPerfS1S2.test.ts`, `teachUxLeftovers` L1/L2) | **Aid only** | Green units ≠ stamp met. |
| Code inspect / path:line / network panel without user seat | **Aid only** | Confirms anchors; does not replace LIVE UI for paint/hop feel. |
| Loop `passed` narrative | **Not a stamp** | History only. |
| Plan-only / testplan written without execution | **Not a stamp** | Plan lands first; prove-out = execute. |
| DITL plan text | **Not a stamp** | DITL IMPACT = NONE this change. |

**Law:** Loop `passed` ≠ product-complete. Plan-only / unit+inspect-as-PASS / STATIC-as-stamp-met is **REJECT**. Incomplete prove-out = feature **not** done.

### 0.1 TREE GATE (QAS 2026-09-19 observation — QE must re-verify)

At OBJECTIVE write on workspace `/Users/chuckbroaddus/projects/kelyra` (`main`, dirty, **no PR**):

| Anchor | Observed |
|---|---|
| `src/app/inbox.tsx` | `rowsReady`; `listInbox(..., { signThumbs: false })`; parallel lists; `listRoster` deferred via assign/`ensureRoster`; WorkingLine/empty gated on `rowsReady` |
| `src/lib/chrome/needsCountCache.ts` | `NEEDS_COUNT_TTL_MS = 12_000`; class-keyed snap; `readNeedsCountCached` / `invalidateNeedsCountCache` |
| `src/lib/chrome/ChromeProvider.tsx` | Pathname hop cache-hit skip `listClasses` + `countNeedsYou`; invalidate on class/seat paths; poll 12s uses cache helper |
| `src/lib/captures/api.ts` | `needsCaptureFilter` / `completedSubmissionFilter` shared (S3); narrow list columns |
| `src/lib/chrome/teachPerfS1S2.test.ts` | Present (STATIC aid) |
| `teachUxLeftovers` L1/L2 | Still reference seat gate + shared filters |

**QE step 0 (before any PASS):** Confirm the above (or equivalent) on the **tree under test**. If anchors **missing** → file **DEFECT [P1]** “TEACH-PERF S1+S2 not present on working tree despite loop pass / dual stamp.” Do **not** mark prove-out pass. Hand CoS (restore tree / re-staff Eng). Do not paper over with unit-only.

**Git honesty:** Ship is **dirty main, no PR**. QE names the exact tree/commit/worktree under test in evidence. Do not claim production ship from this OBJECTIVE alone.

### 0.2 Live bar (credentials + browser)

- **Chuck signs in himself** for live web.  
- **QE must not handle passwords** (no vault fill of school login; no asking Chuck to paste secrets in chat).  
- CoS opens **dedicated QA browser** (CDP profile, not personal Chrome) per `notes/company/iqg-live-exec-lessons.md`.  
- Product routes: **`/inbox`** (Needs Attention), Teach tray hops, seat switch. App title 🐴 ≠ signed-out. Do **not** use `/dashboard`.  
- Prefer network panel / quiet observation for hop skip evidence (count of `countNeedsYou` / class list traffic) when LIVE — still **seat-driven**, not inspect-only.

### 0.3 Evidence labels (mandatory on every TC result)

| Label | Means | Counts as stamp PASS? |
|---|---|---|
| **STATIC** | Source inspect, `teachPerfS1S2.test.ts`, leftovers L1/L2, typecheck | **Aid only** |
| **LIVE UI** | Signed-in Teach (and dual-hat when available) on product routes | **Yes** for user-visible PERF rows |
| **BLOCKED ON ENV** | No Chuck session / no QA browser / no dual-hat Office seat / no multi-class | Not a product miss; record what STATIC ran |
| **NON-GOAL ABSENT** | S4 RPC, PersonTabs change, new chrome, host hygiene as product fix | Correct — not a defect |

---

## 1. What “full featured” means vs dual stamp

Full-featured TEACH-PERF S1+S2 means the dual lock holds end-to-end on the **tree under test** — not only “WorkingLine sometimes shorter” or “unit green.” Map every MUST row to labeled evidence. Fail = `DEFECT [sev]` on board `kelyra` per IQG §5.

Severity seed from intent TP-01..20 (P1 unless noted). PM US-PERF / QG bind the same.

### 1.1 Hats & chrome entry (existing only — do not invent)

| Hat | Must | Stamp | Prove | Evidence |
|---|---|---|---|---|
| **Teacher (Teach seat)** | Primary: cold Needs first paint + cheap tray hops + honest badge | US-PERF-01..06, 08..11 · TP-01..18 | Full LIVE matrix §1.2–1.5 | **LIVE UI** |
| **Teacher + parent (Teach seat)** | Same as teacher while `chrome.role === 'teacher'` | L1 · TP-09 | Same | **LIVE UI** / BLOCKED ON ENV |
| **Teacher + parent (Parent seat)** | Teach Needs = **0**; no Teach Needs desk | US-PERF-07/12 · TP-10 | Seat switch → badge 0; no residual Teach queue chrome | **LIVE UI** / BLOCKED ON ENV |
| **Office + teacher (Teach seat)** | Same as teacher | L1 | Teach seat Needs path | **LIVE UI** / BLOCKED ON ENV |
| **Office + teacher (Office seat)** | Needs = **0** (seat wall, not JWT / not `also_teacher`) | US-PERF-07 · TP-09 · QG-06 | Office seat badge 0 | **LIVE UI** / BLOCKED ON ENV |
| **Parent / Student / Office pure / Super (non-Teach)** | No Teach Needs entry; student todo path unchanged | US-PERF-12 · TP-10 | Spot or NON-GOAL | LIVE / BLOCKED ON ENV |
| **Substitute / co-teacher on Teach** | Same perf laws, RLS-scoped | intent §1 | If fixture exists | LIVE / BLOCKED ON ENV |
| **Signed-out** | Sign-in copy only; no Teach Needs | — | Dark | STATIC / LIVE gate |

**Entry must-prove (existing chrome only):**  
1. Teach tray **Needs Attention** → `/inbox`.  
2. Needs **badge** is count-only snapshot — **not** driven by hydrated thumbs / full inbox rows (PERF-19 · TP-08).  
3. No new tray keys, glyphs, empty-copy marketing rewrite, PersonTabs change, Capture-in-tray restore (QG-07 · TP-19/20 · NON-GOAL).  
4. NT-A job tabs always-visible law **untouched** (prior stamp; regression spot only — not re-prove full NT-A pack).

### 1.2 S1 — Cold `/inbox` first paint (CEO primary pain)

| ID | Must prove (LIVE) | Fail severity |
|---|---|---|
| **TP-01 / US-PERF-01 / QG-01** | Cold open `/inbox` with known active class: first WorkRow (or true empty) does **not** wait on full `listRoster` / roster photo hydrate | P1 |
| **TP-02** | First WorkRow does **not** wait on full `signedThumbUrls` pass — initials / placeholder OK; thumbs may second-pass | P1 |
| **TP-03 / PERF-01** | When `classId` already known, cold path does **not** require full `refreshTeacher` chain before list fetches | P1 |
| **TP-04 / US-PERF-02 / QG-03** | **Never** flash empty copy (“Nothing waiting…” or equivalent) before both `listInbox` + `listTurnedIn` settle | P1 |
| **TP-05 / QG-02** | WorkingLine only while classId truly unknown **or** lists in flight — not after lists returned; not “world not ready” | P1 |
| **TP-06 / US-PERF-11** | Opening assign/name sheet is when roster loads (sheet may brief-work); cold paint does not preload roster | P1 |
| **TP-07** | Narrow list columns OK; WorkRow-needed fields still present; drafts JSON off critical path | P2 (STATIC aid OK if LIVE rows complete) |
| **TP-18 / US-PERF-03** | Leave Needs → return (refocus): no empty flash; preferred keep prior rows during soft refresh; no full cold waterfall when class known | P1 |

**Experience-first cold script (QE):**  
1. Teach seat, known class, cold or hard-refresh into `/inbox` (or first Needs open after clean session).  
2. Watch first paint: WorkingLine **only** if lists pending; WorkRows appear without multi-second “waiting on roster/thumbs” feel.  
3. Confirm empty does not flash if work exists.  
4. Optional network: no roster query before first rows; thumbs may lag.

### 1.3 S2 — Chrome Needs cache + tray hops

| ID | Must prove (LIVE) | Fail severity |
|---|---|---|
| **TP-11 / US-PERF-04 / QG-04** | Teach seat, stable `classId`, hops **Home/Desk ↔ Needs ↔ Diary ↔ Calendar ↔ Ask**: on TTL **cache hit**, do **not** re-list all classes + avatar-sign and do **not** re-run full `countNeedsYou` every hop | P1 |
| **TP-12 / PERF-10** | Needs TTL ~10–15s keyed by `classId` (shipped constant **12s** OK) | P1 (STATIC TTL + LIVE hop) |
| **TP-13 / US-PERF-06 / QG-08** | Membership mutations (assign / delete / draft process / attach / return-to-inbox / paths that change Needs membership) **invalidate** cache — badge updates in-session without waiting full TTL alone | P1 |
| **TP-14 / PERF-12** | Pathname effect: cache hit skips Needs re-count | P1 |
| **TP-15 / US-PERF-09** | Same-tick chrome effect vs `refreshBell` not double full `countNeedsYou`; poll/AppState cost discipline | P2 |
| **TP-16 / US-PERF-10** | Unchanged teacher `id` + `active_class_id` does not thrash chrome via `setTeacher` identity churn defeating cache | P1 (STATIC + LIVE hop stability) |
| **TP-17 / US-PERF-05** | Class switch: invalidate prior; count + lists bind to new class; no stale prior-class badge/rows after settle | P1 |

**Experience-first hop script (QE):**  
1. Teach seat, note Needs badge.  
2. Hop Desk → Needs → Diary → Calendar → Ask → Needs (stable class).  
3. Badge stays coherent; hops feel snappy (no full class census every hop).  
4. With network panel when available: hop circuit on cache hit shows **no** fresh `countNeedsYou` / full class list storm.  
5. Force miss (wait >TTL, or mutate membership, or switch class) → refresh path runs once and settles honestly.

### 1.4 Dual-hat + L2 badge ≡ list

| ID | Must prove | Fail severity |
|---|---|---|
| **TP-08 / US-PERF-08 / QG-05 / L2** | Badge count membership ≡ list families: captures `unassigned|attached|draft` + submissions `completed` for active class; shared filters OK | P1 |
| **TP-09 / US-PERF-07 / QG-06 / L1** | Needs only when `chrome.role === 'teacher'`; Office dual-hat Office seat = 0 | P1 |
| **TP-10** | Parent seat Teach Needs = 0 | P1 |
| **PERF-20** | Do not cap turned-in list without same cap on count (if any cap appears — defect) | P1 |

**LIVE L2 check:** On Teach, compare tray Needs number to visible Needs Attention membership (Name + Review + turned-in completed families per product). Drift = P1.

### 1.5 Assign sheet + reverse / cancel / leave

| Must | Law |
|---|---|
| Open assign → roster loads if absent; filter-by-name works once loaded | US-PERF-11 · TP-06 |
| Roster failure = error on sheet, not silent empty-file / invent student | Matcher law |
| Cancel assign → lists/badge unchanged | intent §3.7 |
| Leave `/inbox` / seat off Teach → non-Teach Needs 0; no crash mid-load; next entry clean | §3.7 |
| Hard list error ≠ success empty | US-PERF-02 |

### 1.6 Multiplicity

| Case | Law |
|---|---|
| Many Needs rows | First paint yields without whole-class roster |
| Multiple taught classes | Active class only; switch required for other queue |
| Large roster | Cost on assign sheet, not cold paint |
| Dual-hat | One seat at a time |

### 1.7 Explicit non-goals (PASS if absent)

1. Host Expo-tab hygiene as the product fix.  
2. New chrome / tray redesign / badge redesign / empty marketing rewrite.  
3. PersonTabs cm-linear change.  
4. **S4** `count_needs_you` RPC / SQL / live EXPLAIN.  
5. Cap turned-in list without count lockstep.  
6. Drive badge from fully hydrated inbox rows.  
7. Calendar Year / Journal / Review-sum chrome packs.  
8. Change NT-A always-visible law.  
9. Change L1 seat-gate semantics.  
10. Author studio.

Miss of a non-goal as “missing feature” is **not** a defect. Presence of forbidden scope (S4, new tray key, PersonTabs change) without restamp = **P1 scope defect**.

### 1.8 Survive laws (regression spot)

1. Nothing is a grade until teacher **Approves**.  
2. Matcher never inserts a student.  
3. Capture may have `student_id` null.  
4. Seat ≠ JWT; dual-hat trays never merge.  
5. NT-A three job tabs always visible on `/inbox` (prior stamp — spot only).  
6. Session expiry: no second auth protocol from dropping per-focus `refreshTeacher`.

---

## 2. DITL IMPACT vs shipped S1+S2 (verdict)

```
DITL IMPACT
Change: TEACH-PERF S1+S2 — Needs Attention first paint (no roster/thumbs/refreshTeacher waterfall when class known; rowsReady empty≠loading) + chrome Needs class-keyed 12s TTL cache with pathname-hop skip + optional S3 shared needsCaptureFilter/completedSubmissionFilter; mid-flight invalidate. No new chrome, routes, hats, or seed fixtures.
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: Performance-correctness of existing Teach Needs desk + tray badge. DITL-T-01/T-02/T-03/DH-01 already exercise Needs Attention / dual-hat zero Teach badge on Parent as functional day beats; they do not encode the old inbox waterfall or per-hop class census as required product law. Cases contain no WorkingLine/TTL/first-paint assertions. Product contract (open Needs, see work, dual-hat seat walls, L2 membership families) unchanged. Pre-existing tray inventory wording lag in some DITL-T plans (older Capture/Class five-tab language vs live Desk·Needs·Diary·Calendar·Ask) is NOT introduced by S1+S2 — do not file a new DITL-UPDATE sticky attributed to this perf land; prefer any already-open Teach chrome DITL sticky if Chuck later wants inventory wording cleaned. No CoS DITL-UPDATE card from this verdict.
```

**CoS:** IMPACT = **NONE** → **do not** file sticky `DITL-UPDATE:` from this card.

---

## 3. QE deliverables (what CoS staffs)

**Next QA Engineer card title (for CoS):**  
`QE prove-out: Teach perf S1+S2 (TP-01..20 / US-PERF-01..12)`

**Assignee:** `qa-engineer`  
**Parent:** feature Eng / this OBJECTIVE cluster as CoS links (`t_85a10114` / `t_28b059c3` as appropriate)  
**Do not staff from this QAS session.**

### 3.1 Plan + cases

1. Write test plan at `notes/company/teach-sluggishness-s1s2-testplan.md` (or `notes/qa/`) covering §1 matrix.  
2. Cases must include: cold first paint; empty≠loading; tray hop cache hit; dual-hat Office/Parent Needs=0; assign roster deferred; L2 badge vs list; class switch; mutation invalidate; NON-GOAL ABSENT (S4/new chrome).  
3. Every case result uses evidence labels (§0.3).

### 3.2 Execute (after plan)

1. TREE GATE §0.1.  
2. LIVE UI on Teach web (Chuck sign-in; CoS QA browser; no passwords).  
3. STATIC aids allowed after LIVE anchors pass (run `teachPerfS1S2` / leftovers if easy).  
4. File `DEFECT [P0|P1|P2|P3]: …` on board `kelyra` with severity — do not bury only in comments.  
5. Do **not** rewrite DITL plans/cases on the QE card (IMPACT NONE).  
6. Do **not** implement fixes on the QE card.

### 3.3 Acceptance for QE complete

| Gate | Bar |
|---|---|
| Plan landed | Path named |
| TREE GATE | Anchors present or P1 filed |
| LIVE cold `/inbox` | TP-01..05 evidence |
| LIVE tray hops | TP-11/14 evidence (network notes when possible) |
| LIVE dual-hat | TP-09/10 or BLOCKED ON ENV with STATIC L1 |
| LIVE L2 | TP-08 badge vs list |
| LIVE assign deferred roster | TP-06 |
| Defects | Own cards + severity |
| Honesty | No unit-only PASS; no password handling |

---

## 4. QAS handoff fields

| Field | Content |
|---|---|
| **OBJECTIVE** | DITL IMPACT + Phase 4 prove-out OBJECTIVE for TEACH-PERF S1+S2 |
| **CONTEXT** | Loop `wf_01a0bbace97379c3b37dd244217f01ba` passed (`t_85a10114`); dual stamp MET; dirty main no PR; 0 P0/P1 |
| **WORK PERFORMED** | Read DITL_OS, IQG Phase 4, PM lock, QAS intent, DITL-T/DH plans+cases for perf wording, tree anchors (inbox/ChromeProvider/needsCountCache/teachPerfS1S2); wrote this note |
| **VERIFICATION** | DITL: no plan/case encodes old waterfall as law → **NONE**. Prove-out OBJECTIVE names LIVE MUST matrix TP/US-PERF, TREE GATE, Chuck sign-in, no passwords, next QE card name |
| **RESULT** | Note `notes/company/teach-sluggishness-s1s2-proveout-objective.md` · DITL IMPACT **NONE** · Prove-out **READY FOR qa-engineer** |
| **OPEN ISSUES** | Dirty main / no PR — QE must name tree under test. Dual-hat LIVE may BLOCKED ON ENV. P2/P3 leftovers already sticky — out of this OBJECTIVE |
| **ESCALATION NEEDED** | No |
| **RECOMMENDED NEXT ACTION** | **CoS:** no DITL-UPDATE sticky. ARM GRANT + staff `qa-engineer` from this OBJECTIVE. Chuck signs in for LIVE; CoS QA browser; QE never handles passwords |
| **DITL IMPACT** | **NONE** |
| **Next QA Engineer card** | `QE prove-out: Teach perf S1+S2 (TP-01..20 / US-PERF-01..12)` |

---

*End TEACH-PERF S1+S2 prove-out OBJECTIVE — qa-supervisor `t_28b059c3` 2026-09-19. DITL IMPACT NONE. CoS staffs qa-engineer.*
