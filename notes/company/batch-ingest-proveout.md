# BATCH-v1 IQG Prove-out — OBJECTIVE (I0–I5)

**Date:** 2026-09-14 (America/Chicago)
**Card:** `t_3e0c95e9` [IQG-BATCH] Prove-out OBJECTIVE after I0–I5
**Author:** qa-supervisor (Kelyra)
**Process:** `notes/company/INTENT_QUALITY_GATE.md` Phase 4
**Against dual stamp:**
- PM lock: `notes/company/batch-ingest-pm-lock.md` (blob `503f990` — **restore to tree**; card `t_4773e0ef`)
- QAS intent: `notes/company/batch-ingest-intent.md` (blob `1cd330b` — **restore to tree**; card `t_e746caff`)
- Chrome: CE-A · SR-A (+ phone gate) · PR-A (+ chip) · NA-A (`t_0d68de74`)
**Shipped slices:** I0 SQL/RLS · I1 TUS bind (PR #104) · I2 rasterize (PR #107) · I3 Split Review · I4 Inbox/attach→understand · I5 partial retry
**Live SQL known:** ingest tables + `pages_done`. **Unapplied (P2):** `20260913000004_ingest_abandon_partial.sql`
**Status:** Prove-out OBJECTIVE only. **Do not execute tests here** (qa-engineer). No app code. No git. No DESIGN STAMP redo.

---

## PROVE-OUT STAMP READY

```
PROVE-OUT OBJECTIVE
Feature: BATCH-v1 class-stack ingest (I0–I5)
Stamp: dual APPROVED 2026-09-12 (PM t_4773e0ef + QAS t_e746caff); chrome CE-A/SR-A/PR-A/NA-A
Implementation: I0–I5 loops passed (I1 PR104, I2 PR107, I3–I5 qa-loop passed)
Live SQL: I0 + pages_done applied; abandon_partial migration on disk only (P2)
Verdict: READY FOR qa-engineer
Blockers for QE: none for plan/cases authoring; live Abandon-on-partial needs SQL apply before prod path; stamp files missing on main tree (restore blobs)
```

---

## 1. What “full featured” means vs stamp

Full-featured BATCH-v1 (for QE prove-out) means the stamped dual lock holds end-to-end — not only “upload works.” Map every row to evidence (UI path:line / RPC / worker / security test). Fail = DEFECT with severity per IQG §5.

### 1.1 Hats & chrome entry

| Hat | Must | Stamp law | Prove |
|---|---|---|---|
| Teacher web | CE-A **Upload class stack** from Capture (class bound) + quiet Needs empty-state **Upload a class stack** | BATCH-02/18 · CE-A | Entry ≤2 taps; no 6th tray tab |
| Teacher phone | Honest gate: **Open Kelyra on a computer to split this scan** (+ optional status / waiting); not primary Split Review | BATCH-16 · SR-A phone gate | No “watching Downloads”; no filmstrip-primary on 4″ |
| Dual-hat T+P | Stack only on **Teach seat**; Parent seat **zero** stack discovery | BATCH-02 · intent §1.2 | Seat switch mid-dirty → discard/confirm; no Parent residual |
| Parent / Student / Office / Super | **No** Upload stack chrome or API create | BATCH-02/21 · US-T8 | Zero entry; RLS deny SELECT on ingest_* |
| Multi-class teacher | Bind **exactly one** class before upload | BATCH-03/22 · US-T9 | No “all periods” mash |
| Co-teacher / sub | Only if class teach grant | intent §1.6 | Else denied |

### 1.2 Lifecycle (start → change → finish → cancel → retry)

1. **Start:** Teach seat + class (+ optional assignment) + N (default 1) → drop PDF/images → soft/hard size gates → TUS if >6 MB → `receiving` → rasterize → `split_review`.
2. **Change:** Reorder files pre-finalize; change N re-guesses only; Split Review S/M/B + move pages; roster **count** check-off (not per-packet name).
3. **Finish (Confirm):** ≥1 non-blank packet; `teacher_confirmed_split=true`; each packet → capture `student_id` null, `status` unassigned/draft path, **≠ approved**, `input_source=batch`, multi-page assets.
4. **NA-A:** Names **only** in Inbox after Confirm — no Split Review Assign UI.
5. **I4:** Unnamed = **no** gap AI / no analyze-homework. Attach student → understand → ≤4 **page JPEGs** only → draft skill_gaps → Needs you.
6. **Approve:** Existing teacher gate only. Confirm split **≠** Approve. Worker never Approves.
7. **Cancel pre-Confirm:** abandon staged; **0** captures.
8. **I5 partial:** mid-fail after ≥1 page → `partial` + named gap banner; **Retry remainder** keeps pages; sha256 / packet capture_id → **0** duplicate captures. 0 pages → `failed`.

### 1.3 Multiplicity & P0 identity

| Scenario | Must |
|---|---|
| 25×1 exit tickets one PDF | Time ≪ 25 photos; Confirm → 25 unnamed Inbox captures |
| Twins / same last name | Manual Inbox file; never surname-merge packets |
| Two+ PDFs | One batch after reorder; one class |
| Packet count ≠ roster | Confirm still allowed if ≥1 packet; surface missing; no invent students |
| 0 non-blank packets | Confirm **disabled** |
| Parallel batches | Allowed; do not silently merge |
| Wrong packet Maya↔Jamal | Fixable in Split Review **before** Confirm (P0 if silent misfile) |

### 1.4 Size / AI / safety (P0)

- **Never** send class PDF / whole stack / original PDF bytes to a model (BATCH-12).
- TUS >6 MB; soft warn >40 MB or >80 pages; hard fail >250 MB or >400 pages with human copy; encrypted PDF named error, 0 captures.
- Rasterize = dedicated worker (`workers/ingest-rasterize`), not Edge whole-file.
- Model: paid/metered only; page JPEGs; `MAX_HOMEWORK_PAGE_IMAGES=4`.
- Matcher never INSERT student. Never auto-Approve.
- RLS: teacher owns batch; non-teachers cannot SELECT class-stack batches.

## 2. Explicit non-goals still out

Documented so “not built” ≠ incomplete. QE must **not** fail BATCH-v1 for absence of:

1. Hot folder / local directory watch (any OS) or ingest agent  
2. Google Drive / OneDrive watch or OAuth ingest  
3. iOS/Android background Downloads / Files daemon  
4. Email ingest / MFP scan-to-email  
5. QR / printed coversheet auto-split  
6. Header name OCR / face match (L8) — even as guess  
7. Auto-name / silent high-confidence skip of Inbox  
8. Auto-Approve / worker grade publish  
9. Student or parent stack upload  
10. Office / superintendent stack tools  
11. SIS roster sync from scan  
12. Variable-length AI clustering as sole split  
13. MFP vendor APIs  
14. Phone-primary Split Review (full filmstrip happy path on 4″)  
15. New product noun replacing Needs/Inbox; sixth tray tab  
16. Free-tier models / training on student work  
17. Edge-function rasterize of entire large PDF  
18. Replacing phone camera single-student capture (M2 remains)

**In v1 and must prove:** large-file safety (TUS + caps), Split Review, page-JPEG-only model path, partial retry.

## 3. DITL IMPACT re-eval vs shipped

Design-stage intent §9 was **UPDATE_PLANS**. PR #105 merged plan rewrites for T-01 / T-02 / DH-01 (batch beats, phone gate, Teach-only stack). Cases and fixtures still lag.

```
DITL IMPACT
Change: BATCH-v1 I0–I5 shipped on tree (I1 PR104, I2 PR107, I3 Split Review, I4 Inbox/attach, I5 partial retry); plans already BATCH-aware (PR 105)
Verdict: UPDATE_CASES
Plans touched: DITL-T-01 (primary stack + phone gate — already rewritten; no further plan edit required vs I0–I5); DITL-T-02 (batch-origin Needs/Approve — already rewritten); DITL-DH-01 (Teach-only stack / zero Parent — already rewritten)
Cases touched: DITL-T-01 / T-02 / DH-01 cases still camera/Pack-B oriented — missing BATCH CE-A/SR-A/NA-A/I4/I5 cases; Parent/Student/Office cases unchanged (non-entry)
New DITL needed: no
Seed/artifacts: notes/qa-fixtures/batch-ingest/ MISSING on tree — QE must land synthetic PDFs (25×1, duplex blanks, two-PDF, encrypted, oversized) with no real student names before EXEC
Notes: Plans match stamp → not UPDATE_PLANS. Cases + fixtures incomplete → UPDATE_CASES + fixture seed. Do not fake PASS without web Split Review + unnamed no-gap-AI + Confirm≠Approve + phone gate honesty. Parent/Student/Office DITL plans stay NONE change.
```

### Plan vs case delta

| Artifact | BATCH state | Action |
|---|---|---|
| `ditl-plans/DITL-T-01.md` | Beats 16–18 stack + phone gate + cancel | None vs I0–I5 |
| `ditl-plans/DITL-T-02.md` | Consume batch-origin; Confirm ≠ Approve | None |
| `ditl-plans/DITL-DH-01.md` | 3c Teach stack; 3d zero Parent | None |
| `ditl-cases/DITL-T-01.md` | No batch UI cases | **Rewrite/thicken** — CE-A upload, SR-A S/M/B Confirm, NA-A Inbox, phone gate, cancel pre-Confirm |
| `ditl-cases/DITL-T-02.md` | No batch-origin Approve cases | **Thicken** — attach unnamed batch → understand → Approve; no auto-Approve |
| `ditl-cases/DITL-DH-01.md` | No Teach-only stack / Parent zero | **Thicken** |
| `notes/qa-fixtures/batch-ingest/` | **Absent** | **Create** fixtures before EXEC |

## 4. OBJECTIVE block (paste to qa-engineer)

```
OBJECTIVE:
IQG Phase 4 prove-out for BATCH-v1 (I0–I5). Write notes/company/batch-ingest-testplan.md + cases; execute vs dual stamp; file DEFECT [P0–P3] on board kelyra with severity. No app code. No git. No DESIGN STAMP redo. No live SQL apply unless CoS/devops already applied named migrations.

CONTEXT:
- Stamp SoT: batch-ingest-pm-lock.md (BATCH-01–22 + CE-A/SR-A/PR-A/NA-A) + batch-ingest-intent.md. If missing on tree, restore from git blobs 503f990 / 1cd330b — do not invent locks.
- Prove-out OBJECTIVE: notes/company/batch-ingest-proveout.md (this file).
- Shipped: I0 migrations; I1 PR #104 TUS bind; I2 PR #107 workers/ingest-rasterize; I3 SplitReview + confirm_ingest_batch; I4 Inbox multi-page + analyze ≤4 JPEGs + unnamed no gap AI; I5 partial + retryIngestRemainder + sha256 no-dup.
- Live: ingest tables + pages_done. Unapplied P2: supabase/migrations/20260913000004_ingest_abandon_partial.sql (Abandon on partial without minted captures).
- DITL plans PR #105 merged (UPDATE_PLANS done). Cases + notes/qa-fixtures/batch-ingest/ still needed (UPDATE_CASES).
- Chrome copy: src/lib/ingest/copy.ts (phoneGate, split*, partialBanner, retryRemainder).
- UI: src/components/ingest/ClassStackBinder.tsx, SplitReview.tsx; src/lib/ingest/*; src/lib/captures/pages.ts MAX_HOMEWORK_PAGE_IMAGES=4.

REQUIREMENTS:
1. Test plan at notes/company/batch-ingest-testplan.md covering hats, lifecycle, multiplicity, chrome entry, non-goals, P0 safety.
2. Must-prove (execute; record evidence):
   A. Teach web CE-A: class bound → Upload class stack → TUS/caps as applicable → rasterize progress → SR-A Split Review (filmstrip+packets; S/M/B) → Confirm → unnamed captures in Inbox (student_id null, status ≠ approved).
   B. Confirm disabled at 0 non-blank packets; Cancel pre-Confirm → 0 captures.
   C. NA-A: no name UI in Split Review; Inbox attach only; matcher never INSERT.
   D. I4: unnamed never analyze/skill_gaps; after attach → page JPEGs only ≤4; never class PDF/original PDF to model; drafts on Needs; Approve only via existing teacher path (Confirm ≠ Approve).
   E. Phone gate: open on computer / waiting copy; not primary Split Review; no fake folder watch.
   F. Dual-hat: Teach stack yes; Parent seat zero stack entry; seat switch does not leave Parent with batch tools.
   G. Parent/Student/Office/Super: zero chrome + API/RLS deny.
   H. I5: partial fail keeps pages; Retry remainder; 0 duplicate captures on same sha256/packet; banner names gap.
   I. Size: hard-fail oversized named copy; encrypted PDF named error 0 captures (fixture or unit+spot).
   J. Camera single-capture path still works (regression; batch additive).
3. Land/use fixtures under notes/qa-fixtures/batch-ingest/ (no real student names).
4. Thicken DITL cases T-01/T-02/DH-01 for batch beats OR mirror equivalent cases in testplan — do not leave plans without executable cases.
5. File each miss as DEFECT [sev] card (not only comment): REPRO, HAT, EXPECTED (stamp), ACTUAL, EVIDENCE.
6. Severity: P0 identity/grade/data-loss/safety; P1 primary hat/lifecycle missing; P2 secondary/multiplicity with workaround; P3 polish.

CONSTRAINTS:
- No Eng implementation. No git commit/push. No inventing chrome icons. No hot folder scope creep.
- Do not treat missing non-goals (Drive, OCR, phone primary split) as defects.
- Abandon-on-partial live path: if 000004 unapplied, mark that TC BLOCKED ON SQL (not product miss) and still prove retry remainder + pre-confirm cancel where live allows.
- Loop unit tests already green are evidence aids, not a substitute for stamp prove-out.

ACCEPTANCE:
- batch-ingest-testplan.md + executed evidence matrix vs §1 of proveout
- P0/P1 filed or none found (explicit)
- DITL cases updated or sticky DITL-UPDATE note with file list
- Handoff: RESULT pass|fail + OPEN ISSUES + next (PM disposition / FIX-NOW)

RECOMMENDED NEXT ACTION:
Return evidence to QA Supervisor for release gate; CoS staffs PM on any new DEFECT cards.
```

## 5. Must-prove matrix + leftovers

### 5.1 Code-side anchors (QE start here; not a pass)

| Area | Paths |
|---|---|
| Entry / binder / phone gate | `ClassStackBinder.tsx`, `INGEST_COPY.entry|phoneGate|splitPhoneWaiting` |
| Split Review SR-A | `SplitReview.tsx`, `splitPackets.ts`, S/M/B copy |
| API / retry / abandon | `src/lib/ingest/api.ts` (`retryIngestRemainder`, fetch split) |
| Caps / TUS | `caps.ts`, `uploadClient.ts`, I1 security tests |
| I0 RLS | `ingestBatches.security.test.ts`, migrations `20260913000000*` |
| I2 worker | `workers/ingest-rasterize/`, `pages_done` |
| I4 understand | `pages.ts` cap 4, `analyzeHomework.security.test.ts`, inbox WorkRow pages |
| I5 partial | `partialRetry.security.test.ts`, worker `failStatus.test.ts`, migration `000004` on disk |

### 5.2 Leftovers / known non-blockers for OBJECTIVE

| Kind | Item | Disposition |
|---|---|---|
| Stamp files off main tree | pm-lock + intent referenced but absent | CoS/DevOps restore blobs; QE uses proveout + blobs if needed |
| SQL P2 | `20260913000004_ingest_abandon_partial.sql` unapplied | BLOCKED ON SQL for abandon-partial live; not stamp miss |
| P2 BATCH leftovers (board) | storage_path prefix; orphan dismiss; parkBase | Separate DEFECT cards; not re-proven as v1 scope unless they break US-T* |
| DITL cases + fixtures | lag plans | QE UPDATE_CASES + seed |
| QE leftover | Manual web Chromebook/Mac path; dual-hat seat; oversized/encrypted fixtures | Execute from OBJECTIVE; do not fake PASS |
| Out of scope | Hot folder v2+; git ship; DESIGN STAMP redo; Eng from this card | No |

**No stamp contradiction found from I0–I5 handoffs** that forces DESIGN STAMP REJECT. Shipped slice map matches dual lock (web stack + SR-A + TUS + page JPEGs + NA-A + partial retry). Prove-out still required before feature “done.”

## 6. Close disposition

| Field | Value |
|---|---|
| OBJECTIVE verdict | **READY FOR qa-engineer** |
| DITL IMPACT verdict | **UPDATE_CASES** (plans already updated PR 105) |
| File | `notes/company/batch-ingest-proveout.md` |
| DESIGN STAMP redo | **No** |
| Eng / SQL apply / git | **No** from this card |
| Next | CoS ARM GRANT + staff `qa-engineer` child with §4 OBJECTIVE paste; restore stamp files to tree; optional devops apply `000004` when Chuck says |

### Handoff fields

| Field | Value |
|---|---|
| OBJECTIVE | Phase 4 prove-out OBJECTIVE for BATCH-v1 I0–I5 |
| WORK PERFORMED | Recovered dual stamps from git blobs; re-read I0–I5 handoffs, PM weekly, DITL plans/cases, shipped ingest surface; wrote proveout |
| VERIFICATION | File on disk; maps hats/lifecycle/non-goals/DITL/OBJECTIVE paste; no code/git |
| RESULT | Prove-out OBJECTIVE landed; DITL UPDATE_CASES |
| OPEN ISSUES | Stamp md missing on main tree; batch fixtures missing; abandon_partial unapplied; DITL cases lack batch beats |
| ESCALATION NEEDED | CoS restore pm-lock/intent; ARM GRANT qa-engineer |
| RECOMMENDED NEXT ACTION | CoS staffs qa-engineer from §4 |

*End prove-out OBJECTIVE — t_3e0c95e9. Dual stamp unchanged. No tests executed.*
