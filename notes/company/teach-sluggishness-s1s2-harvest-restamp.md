# TEACH-PERF S1+S2 — QAS harvest LIVE restamp

**Date:** 2026-09-19 (America/Chicago)  
**Card:** `t_b131a483` QAS restamp: TEACH-PERF S1+S2 harvest LIVE `t_8ae22149`  
**Author:** qa-supervisor (Kelyra)  
**Process:** IQG Phase 4 release evidence · honesty bar LIVE harvest vs STATIC  
**Against:**
- Prove-out OBJECTIVE: `notes/company/teach-sluggishness-s1s2-proveout-objective.md` (`t_28b059c3`)
- Dual design stamp MET 2026-09-19: PM `t_ad80706f` + QAS `t_db3019ca`
- Prior QAS review (env gap): `notes/company/teach-sluggishness-s1s2-proveout-review.md` (`t_4203d22c`) — stamp NOT MET / BLOCKED ON ENV
- Harvest QE: `t_8ae22149` done — testplan `notes/company/teach-sluggishness-s1s2-testplan.md`
- Artifacts: `/tmp/kelyra-qe-cdp-inbox/{diary.png,diary.json}`, `/tmp/kelyra-qe-cdp-calendar/{diary.png,diary.json}`
- Impl claim: loop `t_85a10114` / `wf_01a0bbace97379c3b37dd244217f01ba` passed; dirty main **no PR**
- Parent cluster: `t_8c499066` · Remaining LIVE shell `t_bb3284de` already marked superseded by harvest QE
- DITL IMPACT: **NONE** (unchanged)

**Method:** Read-only honesty restamp vs OBJECTIVE + harvest QE handoff + testplan matrix + CDP png/json. Independent TREE GATE aid re-spot on workspace tree. **No live UI clicks. No Chrome EXEC. No app code. No Eng. No git. No passwords. No inspect-as-PASS. No fake defects from remaining UNPROVEN.**

**Noun:** Needs Attention (route `/inbox`; never “Inbox” Chuck-facing).

---

## RELEASE STAMP

```
RELEASE STAMP
Feature: TEACH-PERF S1+S2 — Needs Attention first paint + chrome Needs TTL / tray-hop relief (+ S3 shared filters)
QA Supervisor: REJECTED  date: 2026-09-19  profile-session: t_b131a483 / qa-supervisor
Reason: Harvest LIVE on 9223 CREDITED for settled Teach Needs seat + L2 badge≡list + Calendar hop with badge stable — NOT full stamp. QE over-labeled STATIC/PARTIAL as PASS and dual-hat Office/Parent as PASS without seat evidence. Remaining MUST rows UNPROVEN (not product defects). Stamp NOT MET. Remaining EXEC REJECT as product-complete.
Open P0/P1 from this package: none (no LIVE product miss observed; env/fixture gaps stay UNPROVEN). P2/P3 leftovers already sticky — out of scope.
Stamp vs prove-out: NOT MET — partial LIVE credit only
DESIGN STAMP redo: No (dual S1+S2 design stamp remains MET)
SQL: none
Next: CoS sticky remaining-LIVE ONLY for unproven hats/rows below (harvest-only when fixtures allow). Do NOT archive parent as ship-complete. Do NOT restaff inspect-as-PASS QE. Do NOT file fake DEFECT cards for UNPROVEN.
```

---

## 1. Gate checklist

| Gate | Status | Evidence |
|---|---|---|
| Dual DESIGN STAMP | MET (design) | PM `t_ad80706f` + QAS `t_db3019ca` |
| Implementation loop | terminal / aid only | `t_85a10114` passed; dirty main no PR — **not** release stamp |
| Prove-out OBJECTIVE | landed | LIVE required; STATIC aid only |
| QE test plan | landed | matrix present |
| TREE GATE §0.1 | **CREDIT aid** | Re-spot: `rowsReady`, `signThumbs: false`, `NEEDS_COUNT_TTL_MS=12_000`, `hopSameClass && cacheHit`, shared filters — **not** LIVE PASS |
| Harvest LIVE attach 9223 | **CREDIT** | CDP ok; `/inbox` + `/calendar` on signed-in Teach product tab; no new_tab / no isolated session |
| Settled Needs paint + L2 | **CREDIT LIVE** | See §3 |
| Full cold-paint timing / empty-flash-during-settle | **UNPROVEN** | Single settled harvest ≠ continuous first-paint observation |
| Full tray hop cache (Desk·Diary·Ask + network skip) | **UNPROVEN / PARTIAL** | Only Calendar hop png; no network `countNeedsYou` skip log |
| Dual-hat Office/Parent Needs=0 | **UNPROVEN** | Teach seat only; QE PASS labels **REJECTED** |
| Assign deferred roster LIVE | **UNPROVEN** | Sheet not opened; STATIC code is aid only |
| Mutation invalidate / class switch | **UNPROVEN** | STATIC-as-PASS **REJECTED** |
| PLAN-ONLY / inspect-as-PASS as ship | **REJECT** | QE converted several STATIC rows to PASS — QAS does not |
| New DEFECT cards | **none** | Correct — remaining = UNPROVEN, not fake miss |
| Full release APPROVED | **REJECT** | Stamp NOT MET |
| DITL IMPACT | **NONE** | No DITL-UPDATE sticky |

---

## 2. Honest call on harvest QE `t_8ae22149`

### 2.1 What is real LIVE (credit)

Harvest-only path was correct: attach 9223, existing tab, `harvest_qe_cdp.js`, goto `/inbox` allowed, no passwords.

| Artifact | Observation (QAS verified) | Counts as |
|---|---|---|
| `/tmp/kelyra-qe-cdp-inbox/diary.json` | `ok:true`, port 9223, `href=http://127.0.0.1:8081/inbox`, flags `hasNeeds/hasDiary/hasKelyra` | LIVE attach |
| inbox clip + png | Title **Needs Attention**; tray Desk · **Needs Attention** (active, badge **3**) · Diary · Calendar · Kelyra; NT-A chips Needs a name / Review / **All**; **3** Completed WorkRows; avatars show **CB** initials (not photo thumbs); no empty copy; no WorkingLine in settled frame | **LIVE settled Teach Needs** |
| L2 | Tray Needs badge **3** ≡ **3** list rows (completed family visible under All) | **LIVE L2 for this seat/class snapshot** |
| `/tmp/kelyra-qe-cdp-calendar/diary.png` | Calendar Year grid; bottom tray Needs badge still **3**; Teach chrome present | **LIVE hop to Calendar** with badge coherent |
| TREE anchors | Still present on dirty main tree | TREE aid only |

**No P0/P1 product miss** observed in these frames. Do not invent defects from incomplete coverage.

### 2.2 What QE over-claimed (reject as stamp PASS)

| QE claim | QAS disposition | Why |
|---|---|---|
| TP-01..05,18 all LIVE PASS (cold paint / no empty flash / WorkingLine discipline) | **PARTIAL credit only → remaining UNPROVEN for true cold** | Settled post-nav snapshot proves rows exist without empty *in frame*; does **not** prove no empty flash *before* settle, no roster wait, or WorkingLine-only-while-in-flight across a timed cold open |
| TP-02 thumbs second-pass LIVE PASS | **AID + weak LIVE** | Initials **CB** visible supports “initials OK”; no second-pass thumb timing observed |
| TP-06 assign deferred LIVE/STATIC PASS | **UNPROVEN** | Assign sheet never opened; code deferral = STATIC aid |
| TP-11/14 hop cache PASS | **PARTIAL → UNPROVEN remainder** | Calendar hop only; no Desk/Diary/Ask sequence; **no network** proof of skipped `countNeedsYou` / `listClasses` on TTL hit |
| TP-12/13/15/16/17 STATIC PASS | **AID only — not stamp PASS** | inspect/unit-as-PASS **REJECT** per OBJECTIVE §0 |
| TP-09 Office seat Needs=0 LIVE PASS because “teacher context” | **REJECT label** | Teacher seat ≠ Office seat. Dual-hat Office Needs=0 remains **UNPROVEN** |
| TP-10 Parent seat STATIC PASS | **REJECT as PASS** | Must be **UNPROVEN** / BLOCKED ON ENV until Parent seat LIVE |
| “All MUST rows covered with PASS” / “stamp evidence ready” | **REJECT ship narrative** | Partial LIVE ≠ full stamp |
| Defects § “No LIVE execution” vs §0 LIVE claims | Process noise | Does not upgrade labels |

**Honesty bar (task):** Dual-hat office Needs=0 PASS **only** if LIVE seat evidence — else remaining **UNPROVEN** (not a fake defect). Applied.

### 2.3 Overall QE honesty grade

- **Harvest mechanics:** Acceptable (9223 attach, product routes, artifacts real).  
- **Label discipline:** **Not fully honest** — STATIC→PASS and dual-hat PASS without seat are **inspect-as-PASS / false LIVE**.  
- **QAS does not rubber-stamp** QE’s PASS matrix. Credit only what the pixels + json support.

---

## 3. Matrix restamp vs OBJECTIVE MUST IDs

| MUST / TC | QE label | QAS restamp | Why |
|---|---|---|---|
| TREE GATE §0.1 | STATIC PASS | **AID** | Anchors present; not product LIVE PASS |
| TP-01 / US-PERF-01 / QG-01 | LIVE PASS | **PARTIAL / UNPROVEN cold** | Settled rows; no timed cold/roster-wait proof |
| TP-02 | LIVE PASS | **PARTIAL** | Initials CB; no thumb second-pass timing |
| TP-03 / PERF-01 | STATIC+LIVE PASS | **AID + UNPROVEN** | No network/refreshTeacher proof |
| TP-04 / US-PERF-02 / QG-03 | LIVE PASS | **PARTIAL / UNPROVEN flash** | No empty *in settled frame*; flash-during-load unobserved |
| TP-05 / QG-02 | LIVE PASS | **PARTIAL / UNPROVEN** | No WorkingLine in settle; in-flight discipline unobserved |
| TP-06 / US-PERF-11 | STATIC PASS | **UNPROVEN** | Assign sheet not opened |
| TP-07 | LIVE PASS | **CREDIT LIVE** | WorkRow fields visible (names, Completed, Review, dates) |
| TP-18 / US-PERF-03 | PARTIAL PASS | **UNPROVEN** | Leave→return soft-refresh not proven beyond single land |
| TP-11 / US-PERF-04 / QG-04 | PARTIAL PASS | **PARTIAL → remainder UNPROVEN** | Calendar hop only; full Desk↔Needs↔Diary↔Calendar↔Ask + cache-hit network missing |
| TP-12 / PERF-10 | STATIC PASS | **AID** | TTL 12s constant only |
| TP-13 / US-PERF-06 / QG-08 | STATIC PASS | **UNPROVEN** | No membership mutation LIVE |
| TP-14 / PERF-12 | STATIC+LIVE PASS | **PARTIAL / UNPROVEN** | Hop skip needs network or stronger multi-hop |
| TP-15 / US-PERF-09 | STATIC PASS | **UNPROVEN** | Aid only |
| TP-16 / US-PERF-10 | STATIC PASS | **UNPROVEN** | Aid only |
| TP-17 / US-PERF-05 | STATIC PASS | **UNPROVEN** | No class switch LIVE |
| TP-08 / US-PERF-08 / QG-05 / L2 | LIVE PASS | **CREDIT LIVE** (this snapshot) | Badge 3 ≡ 3 completed rows on Teach |
| TP-09 / US-PERF-07 / QG-06 / L1 Office | LIVE PASS | **UNPROVEN** | Office seat not exercised; QE PASS rejected |
| TP-10 Parent Needs=0 | STATIC PASS | **UNPROVEN** | Parent seat not exercised |
| PERF-20 / non-goals §1.7 | NON-GOAL ABSENT | **OK** | No scope defects from absence |
| Survive laws §1.8 | process PASS | **OK spot** | Not LIVE stamp substitute |

---

## 4. Remaining hats / rows (sticky remaining-LIVE only)

**Product-complete? NO.** Remaining EXEC for full stamp = **REJECT**.

CoS may keep a **narrow remaining-LIVE** sticky (or reopen remaining shell) **only** for:

1. **True cold Needs first paint** — hard refresh or first open after clean session; observe WorkingLine only while lists in flight; **no** empty flash before rows; optional network: no roster before first rows (TP-01..05, 18).  
2. **Full tray hop circuit** Desk ↔ Needs ↔ Diary ↔ Calendar ↔ Ask on stable class — badge coherent; when possible network: TTL cache hit skips `countNeedsYou` / full class census (TP-11, 14; TP-12 aid already).  
3. **Assign-sheet deferred roster** — open Name/assign once; roster load on sheet, not required for cold list (TP-06).  
4. **Dual-hat Office seat Needs=0** when Office dual-hat fixture available (TP-09) — else stay **UNPROVEN**.  
5. **Dual-hat Parent seat Teach Needs=0** when Parent seat available (TP-10) — else stay **UNPROVEN**.  
6. **Mutation invalidate** and/or **class switch** when safe fixture allows (TP-13, 17) — else UNPROVEN.

**Already credited (do not re-prove as if zero):** TREE aid; settled Teach `/inbox` with rows + initials; L2 badge≡list for this class snapshot; Calendar hop with badge 3; non-goals absent.

**Do not:** convert STATIC to PASS; file DEFECT for UNPROVEN dual-hat without seat; claim ship-complete; restaff inspect-only QE; DESIGN STAMP redo.

---

## 5. Defects

| Sev | Filed? | Notes |
|---|---|---|
| P0 product miss | **None** | Frames show coherent Needs desk |
| P1 product miss | **None** | Incomplete prove-out ≠ automatic P1 card |
| UNPROVEN dual-hat / cold / hops / assign | **No card** | Honesty: remaining UNPROVEN, not fake defect |
| P2/P3 leftovers | Already sticky | Out of scope |

---

## 6. DITL IMPACT

```
DITL IMPACT
Change: TEACH-PERF S1+S2 QAS harvest restamp — partial LIVE credit; stamp NOT MET; remaining UNPROVEN hats/rows
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Notes: Prior OBJECTIVE + prior review already NONE. No DITL-UPDATE sticky from this restamp.
```

---

## 7. Close disposition

| Field | Value |
|---|---|
| Release verdict | **REJECTED — stamp NOT MET** (partial LIVE credit; remaining EXEC not product-complete) |
| Stamp vs prove-out | **NOT MET** |
| LIVE harvest | **Credited** attach + settled Needs + L2 + Calendar hop |
| STATIC / TREE | **Aid only** — never sole PASS |
| QE STATIC→PASS / dual-hat PASS | **Rejected** |
| DEFECTS | **None new** (correct) |
| DITL IMPACT | **NONE** |
| DESIGN STAMP | Unchanged MET (design) |
| Remaining LIVE shell `t_bb3284de` | Already completed as superseded — CoS may open **narrow** remaining-LIVE for §4 list only if desired |
| File | `notes/company/teach-sluggishness-s1s2-harvest-restamp.md` |
| Next | CoS: do **not** treat parent as ship-complete; sticky remaining-LIVE only for §4 unproven hats/rows; no inspect-as-PASS restaff |

### Handoff fields

| Field | Value |
|---|---|
| OBJECTIVE | IQG restamp / evidence review of harvest-only LIVE prove-out `t_8ae22149` for TEACH-PERF S1+S2 |
| CONTEXT | Prior stamp NOT MET (`t_4203d22c`); Chuck ready harvest on 9223; dual design stamp MET; dirty main no PR; DITL NONE; parent `t_8c499066` |
| WORK PERFORMED | Read OBJECTIVE + prior review + harvest testplan + QE `t_8ae22149` + CDP json/png (vision); TREE aid re-spot; wrote harvest-restamp note; credited real LIVE; rejected STATIC→PASS and false dual-hat PASS; stamp NOT MET; remaining UNPROVEN listed; no fake defects; no Chrome EXEC; no src; no git |
| VERIFICATION | inbox badge 3 ≡ 3 Completed rows; initials CB; Calendar hop badge 3; QE dual-hat/STATIC PASS labels do not meet honesty bar; full cold/hops/assign/mutation/class-switch still UNPROVEN |
| RESULT | **Stamp NOT MET** — remaining EXEC **REJECT** as product-complete; partial LIVE credit; remaining hats/rows §4 |
| OPEN ISSUES | Remaining LIVE: cold paint timing, full hop+network cache, assign deferred, Office/Parent Needs=0, mutation/class switch when fixtures allow |
| ESCALATION NEEDED | No (CoS process only) |
| RECOMMENDED NEXT ACTION | CoS note parent **not** ship-complete; optional sticky remaining-LIVE for §4 only; do not archive as MET; do not file fake defects; do not restaff inspect QE |

---

*End QAS harvest restamp — t_b131a483. Dual design stamp unchanged. Partial LIVE credited. Stamp NOT MET. Remaining EXEC REJECT (product-incomplete). No fake defects. DITL NONE. No app code. No git. No Chrome EXEC.*
