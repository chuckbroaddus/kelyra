# TEACH-PERF S1+S2 — QAS Phase 4 evidence review

**Date:** 2026-09-19 (America/Chicago)  
**Card:** `t_4203d22c` QAS: evidence review TEACH-PERF S1+S2 QE BLOCKED ON ENV  
**Author:** qa-supervisor (Kelyra)  
**Process:** `notes/company/INTENT_QUALITY_GATE.md` Phase 4 release evidence · live lessons `notes/company/iqg-live-exec-lessons.md`  
**Against:**
- Prove-out OBJECTIVE: `notes/company/teach-sluggishness-s1s2-proveout-objective.md` (`t_28b059c3`)
- Dual design stamp MET 2026-09-19: PM lock `teach-sluggishness-s1s2-pm-lock.md` (`t_ad80706f`) + QAS intent `teach-sluggishness-s1s2-intent.md` (`t_db3019ca`)
- QE card: `t_e2f11092` done — testplan `notes/company/teach-sluggishness-s1s2-testplan.md`
- Impl claim: loop `t_85a10114` / `wf_01a0bbace97379c3b37dd244217f01ba` passed; dirty main **no PR**; 0 P0/P1 loop leftovers sticky out of scope
- Parent cluster: `t_8c499066` sticky
- DITL IMPACT: **NONE** (OBJECTIVE + this review)

**Method:** Read-only honesty restamp vs OBJECTIVE + QE testplan + QE handoff. Independent TREE GATE aid spot-check on `/Users/chuckbroaddus/projects/kelyra` (source only). **No Chrome EXEC. No live UI clicks. No app code. No Eng. No git. No passwords. No inspect-as-PASS conversion. No QE restaff from this card. No DITL rewrite. No fake defects from missing live.**

**Noun:** Needs Attention (route `/inbox`; never “Inbox” Chuck-facing).

---

## RELEASE STAMP

```
RELEASE STAMP
Feature: TEACH-PERF S1+S2 — Needs Attention first paint (inbox waterfall) + chrome Needs TTL cache / tray-hop refetch relief (+ S3 shared filters)
QA Supervisor: REJECTED  date: 2026-09-19  profile-session: t_4203d22c / qa-supervisor
Reason: All user-visible PERF LIVE UI MUST rows UNPROVEN (BLOCKED ON ENV — no signed-in Teach harvest on QA Chrome 9223). TREE GATE + STATIC aids credited only. Stamp NOT MET. PLAN-ONLY / unit / inspect-as-PASS REJECT. Loop passed ≠ product-complete.
Open P0/P1 from this package: none (env gap is not a product miss card). P2/P3 leftovers already sticky — out of scope; do not re-open here.
Stamp vs prove-out: NOT MET — LIVE UI Teach 9223 required for cold Needs first paint, tray hops, dual-hat Needs=0, assign deferred roster, L2 badge vs list
DESIGN STAMP redo: No (dual S1+S2 design stamp remains MET)
SQL: none
Next: CEO-assisted harvest-only QE after Chuck signs in Teach on QA Chrome 9223 and says ready. Do not restaff inspect/clicking QE in parallel. Numbered on-screen labels: Needs Attention (not Inbox).
```

---

## 1. Gate checklist

| Gate | Status | Evidence |
|---|---|---|
| Dual DESIGN STAMP | MET (design) | PM `t_ad80706f` + QAS `t_db3019ca` 2026-09-19 |
| Implementation loop | terminal / aid only | `t_85a10114` passed; dirty main no PR — **not** release stamp |
| Prove-out OBJECTIVE | landed | `teach-sluggishness-s1s2-proveout-objective.md` — LIVE required; STATIC aid only; PLAN-ONLY REJECT |
| QE test plan + matrix | landed | `teach-sluggishness-s1s2-testplan.md` TP/US-PERF coverage + labels |
| TREE GATE §0.1 | **CREDIT aid** | QE re-verify + QAS independent spot-check: anchors present on workspace tree — **not** LIVE stamp PASS |
| QE LIVE cold Needs / hops / dual-hat / L2 / assign | **BLOCKED ON ENV** | Honest — isolated browser session; did not harvest 9223 Teach tab; no passwords |
| QE STATIC aids | **CREDIT as aid** | Source / unit shape only; **never** sole PASS for paint/hop feel |
| PLAN-ONLY / inspect-as-PASS | **None claimed as ship** | QE labeled all LIVE BLOCKED; did not convert STATIC → PASS |
| New DEFECT cards | none | Correct — env gap is not a product miss |
| Independent release recheck | **REJECT full stamp** | LIVE UNPROVEN → product-incomplete |
| DITL IMPACT | **NONE** | No DITL-UPDATE sticky from this review |

---

## 2. Honest call on QE `t_e2f11092`

**RELEASE REJECTED — remaining EXEC. Stamp NOT MET. LIVE UNPROVEN (BLOCKED ON ENV).**

QE claim (accepted as honesty, not as ship):
- Full matrix vs OBJECTIVE §1 with mandatory labels STATIC | LIVE UI | BLOCKED ON ENV | NON-GOAL ABSENT.
- **All LIVE UI PERF rows BLOCKED ON ENV** — browser tool created isolated session (`about:blank`); constraint forbade `new_tab` that risks dropping Teach session; could not harvest existing 9223 Teach tab; Chuck sign-in required; no passwords handled; no roster names / student_id printed.
- TREE GATE re-verified PASS (anchors present) — **tree gate only**.
- STATIC notes on `rowsReady`, `signThumbs: false`, deferred roster, ChromeProvider hop skip, TTL 12s — **aid only**.
- Non-goals (S4 RPC, new chrome, PersonTabs, host hygiene, etc.) correctly NON-GOAL ABSENT.
- Survive laws marked unchanged (spot / process credit only — not LIVE regression pack).
- No DEFECT cards filed (correct for no LIVE observation).
- DITL IMPACT NONE respected (no rewrite).

**QAS restamp:** QE was **honest**. This is **not** inspect-as-PASS and **not** PLAN-ONLY disguised as ship. Credit STATIC/TREE only as **aid**. Whole stamp remains **NOT MET** until LIVE UI on **QA Chrome 9223** Teach proves user-visible PERF rows.

CoS context at review time (process note only, not LIVE PASS): QA Chrome 9223 had page `http://localhost:8081/` (title localhost:8081) — product URL present; **signed-in Teach unknown**. Expo `:8081` HTTP 200, cwd `~/projects/kelyra`. That does **not** upgrade BLOCKED ON ENV to LIVE UI.

### Credit vs reject

| Bucket | Disposition |
|---|---|
| Testplan coverage vs OBJECTIVE §1 MUST matrix | **CREDIT** plan quality |
| Evidence labels used correctly | **CREDIT** honesty |
| TREE GATE anchors on dirty main tree | **CREDIT aid** (tree gate) |
| LIVE TP-01..06, 18 cold Needs first paint / empty≠loading / assign deferred | **UNPROVEN** (BLOCKED ON ENV) |
| LIVE TP-11..17 tray hops / TTL / invalidate / class switch | **UNPROVEN** (BLOCKED ON ENV) |
| LIVE TP-08 L2 badge ≡ list | **UNPROVEN** (BLOCKED ON ENV) |
| LIVE TP-09/10 dual-hat Office/Parent Needs=0 | **UNPROVEN** (BLOCKED ON ENV) |
| NON-GOAL ABSENT pack | **OK** |
| Survive laws (no LIVE re-prove pack) | **OK spot / process** — not stamp substitute |
| STATIC unit/source as stamp-met | **REJECT** |
| Full release APPROVED | **REJECT** |
| Restaff inspect / agent-only clicking QE now | **REJECT** — next is CEO-assisted then **harvest-only** |

---

## 3. Matrix restamp vs OBJECTIVE MUST IDs

| MUST / TC | QE label | QAS restamp | Why |
|---|---|---|---|
| TREE GATE §0.1 | STATIC PASS | **AID** | Anchors present; not product LIVE PASS |
| TP-01 / US-PERF-01 / QG-01 | BLOCKED ON ENV | **UNPROVEN** | Cold Needs first paint without roster wait needs LIVE |
| TP-02 | BLOCKED ON ENV | **UNPROVEN** | Thumbs second-pass needs LIVE |
| TP-03 / PERF-01 | BLOCKED ON ENV | **UNPROVEN** | No full refreshTeacher before lists needs LIVE |
| TP-04 / US-PERF-02 / QG-03 | BLOCKED ON ENV | **UNPROVEN** | No empty flash needs LIVE |
| TP-05 / QG-02 | BLOCKED ON ENV | **UNPROVEN** | WorkingLine discipline needs LIVE |
| TP-06 / US-PERF-11 | BLOCKED ON ENV | **UNPROVEN** | Assign-sheet roster deferred needs LIVE |
| TP-07 | BLOCKED ON ENV + STATIC aid | **AID + UNPROVEN** | Narrow columns; LIVE preferred |
| TP-18 / US-PERF-03 | BLOCKED ON ENV | **UNPROVEN** | Leave/return no empty flash needs LIVE |
| TP-11 / US-PERF-04 / QG-04 | BLOCKED ON ENV | **UNPROVEN** | Desk↔Needs↔Diary↔Calendar↔Ask hop cache needs LIVE |
| TP-12 / PERF-10 | BLOCKED ON ENV + STATIC TTL | **AID + UNPROVEN** | 12s TTL constant aid; hop feel LIVE |
| TP-13 / US-PERF-06 / QG-08 | BLOCKED ON ENV | **UNPROVEN** | Mutation invalidate needs LIVE |
| TP-14 / PERF-12 | BLOCKED ON ENV | **UNPROVEN** | Pathname hop skip needs LIVE (+ network when possible) |
| TP-15 / US-PERF-09 | BLOCKED ON ENV | **UNPROVEN** | Double-count discipline LIVE preferred |
| TP-16 / US-PERF-10 | BLOCKED ON ENV | **UNPROVEN** | setTeacher thrash LIVE preferred |
| TP-17 / US-PERF-05 | BLOCKED ON ENV | **UNPROVEN** | Class switch invalidate needs LIVE |
| TP-08 / US-PERF-08 / QG-05 / L2 | BLOCKED ON ENV | **UNPROVEN** | Badge ≡ list families needs LIVE Teach |
| TP-09 / US-PERF-07 / QG-06 / L1 | BLOCKED ON ENV | **UNPROVEN** | Office seat Needs=0 needs LIVE dual-hat |
| TP-10 | BLOCKED ON ENV | **UNPROVEN** | Parent seat Teach Needs=0 needs LIVE |
| PERF-20 | NON-GOAL ABSENT | **OK** | Cap lockstep non-goal absent |
| Non-goals §1.7 | NON-GOAL ABSENT | **OK** | No scope defects from absence |
| Survive laws §1.8 | process PASS | **OK spot** | Not LIVE stamp substitute |

**Rule:** STATIC `rowsReady` / `signThumbs:false` / hop skip / TTL 12s ≠ ship. CEO primary pain (cold Needs paint + cheap tray hops) needs signed-in **LIVE UI** on 9223 → cannot APPROVE stamp.

---

## 4. Independent TREE GATE note (aid only — not PASS)

Read-only source spot-check on workspace `/Users/chuckbroaddus/projects/kelyra` (dirty main, no PR). **No Chrome EXEC. No unit run as stamp.**

| Anchor | Observation | Counts as |
|---|---|---|
| `src/app/inbox.tsx` | `rowsReady`; `listInbox(..., { signThumbs: false })`; `showWorking`/`showEmpty` gated on `rowsReady`; `listRoster` via `ensureRoster` on assign pick | TREE aid |
| `src/lib/chrome/needsCountCache.ts` | `NEEDS_COUNT_TTL_MS = 12_000`; class-keyed hit; `invalidateNeedsCountCache` | TREE aid |
| `src/lib/chrome/ChromeProvider.tsx` | `hopSameClass && cacheHit` early return — no `listClasses` / no `countNeedsYou` on pathname hop | TREE aid |
| `src/lib/captures/api.ts` | `needsCaptureFilter` / `completedSubmissionFilter` shared | TREE aid |
| `teachPerfS1S2.test.ts` / leftovers L1/L2 | Present | STATIC aid only |
| QE LIVE UI achieved | Explicit **None** | BLOCKED ON ENV credit |
| New defects | None | Correct for env gap |

QAS does **not** convert TREE/STATIC into LIVE PASS.

---

## 5. Defects

| Sev | Filed? | Notes |
|---|---|---|
| P0 product miss | **None** | No LIVE observation |
| P1 product miss from this QE | **None** | Do not invent cards for BLOCKED ON ENV |
| P2/P3 leftovers | Already sticky | Out of this OBJECTIVE; do not re-open |
| Env / process | N/A card | Chuck Teach signed-in on **QA Chrome 9223**; product Needs Attention `/inbox`; Metro cwd tree under test named |

Do **not** invent DEFECT cards for BLOCKED ON ENV. Do **not** treat missing live as product failure on board.

---

## 6. DITL IMPACT

```
DITL IMPACT
Change: TEACH-PERF S1+S2 QAS release review of QE evidence — LIVE UNPROVEN (BLOCKED ON ENV); STATIC/TREE aid only; no new chrome/routes/hats
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Notes: Prior OBJECTIVE already NONE. No DITL-UPDATE sticky from this review. Do not restaff ditl-scribe. Do not rewrite ditl-plans/cases here.
```

---

## 7. Disposition / next

### 7.1 PARK (do not restaff now)

| Item | Action |
|---|---|
| Inspect / agent-only clicking QE on same env | **PARK** — will re-block without Chuck signed-in Teach on 9223 |
| DESIGN STAMP redo | **No** |
| Eng / git / SQL / re-loop / Chrome EXEC from QAS | **Forbidden** on this card |
| Fake DEFECT from missing live | **Forbidden** |
| DITL | **NONE** — no sticky |
| STATIC / TREE / loop passed | **KEEP** as aid credit only |

### 7.2 CEO-assisted LIVE → harvest-only QE (only path to stamp-met)

When **Chuck says ready**:

1. Chuck signs in **Teach** on **QA Chrome 9223** (agents never handle passwords; not daily 9222).  
2. CoS confirms Metro serves the named tree under test (`~/projects/kelyra`, dirty main no PR — name commit/worktree in evidence).  
3. Product routes on existing signed-in tab — **harvest**, do not `new_tab` password flows. On-screen noun: **Needs Attention** (not Inbox). Routes: `/inbox`, Teach tray hops Desk↔Needs↔Diary↔Calendar↔Ask.  
4. CoS staffs **harvest-only** `qa-engineer` against existing `teach-sluggishness-s1s2-testplan.md` (do **not** rewrite plan from scratch; do **not** restaff inspect/clicking QE in parallel from this review).  
5. Primary LIVE must land:  
   - Cold Needs Attention first paint: **TP-01..05, 18** (empty≠loading; no roster/thumbs waterfall feel)  
   - Tray hops cache hit: **TP-11, 14** (+ network notes when possible)  
   - Assign deferred roster: **TP-06**  
   - L2 badge vs list: **TP-08**  
   - Dual-hat Office/Parent Needs=0 when seats available: **TP-09/10** else remain honest BLOCKED ON ENV  
   - Mutation invalidate / class switch when fixture allows: **TP-13, 17**  
6. File real product misses as `DEFECT [sev]` cards only if LIVE shows them.  
7. Return evidence to QA Supervisor for restamp.

**Do not:** invent LIVE PASS; treat STATIC/unit as stamp-met; restaff identical blocked inspect QE before Chuck ready; file fake defects for env gap; claim product-complete; restaff parallel click-QE.

---

## 8. Close disposition

| Field | Value |
|---|---|
| Release verdict | **REJECTED — LIVE UNPROVEN (BLOCKED ON ENV)** |
| Stamp vs prove-out | **NOT MET** |
| Product-complete? | **No** (STATIC/TREE/loop ≠ done) |
| QE honesty | **Accepted** — BLOCKED ON ENV correct; no inspect-as-PASS |
| STATIC / TREE | **Credit aid only** |
| DEFECTS | **None new** (correct) |
| DITL IMPACT | **NONE** |
| DESIGN STAMP | Unchanged MET (design) |
| File | `notes/company/teach-sluggishness-s1s2-proveout-review.md` |
| Next | CEO-assisted sign-in on 9223 Teach → **harvest-only** QE when Chuck ready → QAS restamp |

### Handoff fields

| Field | Value |
|---|---|
| OBJECTIVE | IQG Phase 4 evidence review of TEACH-PERF S1+S2 QE prove-out (`t_e2f11092`) |
| CONTEXT | Dual stamp MET; loop passed dirty main no PR; OBJECTIVE + testplan landed; DITL NONE; parent `t_8c499066` |
| WORK PERFORMED | Read OBJECTIVE + QE testplan + QE `t_e2f11092` handoff; independent TREE GATE source spot-check; wrote `teach-sluggishness-s1s2-proveout-review.md`; credited BLOCKED ON ENV; stamp NOT MET; no STATIC→PASS; no fake defects; next = harvest-only after Chuck ready; no Chrome EXEC; no app code; no git; did not restaff QE |
| VERIFICATION | QE labels honest BLOCKED ON ENV for all LIVE PERF MUST rows; TREE aid confirmed present; no inspect-as-PASS; stamp NOT MET until LIVE UI Teach 9223 Needs Attention |
| RESULT | RELEASE REJECTED remaining EXEC — stamp NOT MET / BLOCKED ON ENV credited / next = CEO-assisted harvest-only QE |
| OPEN ISSUES | Chuck Teach signed-in QA Chrome 9223; LIVE harvest cold Needs + hops + L2 + dual-hat when available; dirty main / no PR named in evidence |
| ESCALATION NEEDED | CoS waits on Chuck ready for 9223 Teach; then harvest-only qa-engineer — do not restaff inspect/click QE in parallel |
| RECOMMENDED NEXT ACTION | Park inspect QE; complete this review card; CEO-assisted LIVE when Chuck ready; harvest-only QE vs existing testplan; QAS restamp |

---

*End QAS evidence review — t_4203d22c. Dual design stamp unchanged. LIVE UNPROVEN (BLOCKED ON ENV). STATIC/TREE aid only. Stamp NOT MET. No fake defects. DITL NONE. No app code. No git. No Chrome EXEC. No QE restaff. Next = harvest-only after Chuck says ready on 9223 Teach (Needs Attention).*
