# GB ingest scorecard — SRS §11.19 / §11.20

**BEFORE run:** `notes/qa-fixtures/gradebook-ingest/runs/202609302204`  
**AFTER run:** `notes/qa-fixtures/gradebook-ingest/runs/202609302227`  
**Corpus:** `notes/qa-fixtures/gradebook-ingest/` (25 cases)  
**Edge:** live `ingest-grading-doc` on `aohibokgilxhqwmupdfv` (parent GB-INGEST-FIX / PR #312 / merge `90f0572`)

## Verdict

| AC | BEFORE | AFTER |
|----|--------|-------|
| **§11.19** | PARTIAL — S01 80% (late_rule free-string) | **PASS** — S01 clean/photo **100%** field accuracy; within_category flagged for review; UI shows proposal review + manual Apply/Save |
| **§11.20** | FAIL/FLARY — H01 clean empty; photo 27% | **PASS (field)** — H01 clean **83%** (levels.list missing only); photo **86%**; UI prefills policy draft; Publish remains manual; no transcript tables written pre-Publish |

## BEFORE vs AFTER accuracy

| Metric | BEFORE | AFTER | Δ |
|--------|-------:|------:|--:|
| overall | 36.0% | **61.1%** | +25.1 |
| syllabus | 42.2% | **60.8%** | +18.6 |
| handbook | 18.5% | **47.7%** | +29.2 |
| negatives | 60.0% | **100%** | +40.0 |
| clean | 34.1% | **60.3%** | +26.2 |
| photo | 39.3% | **62.6%** | +23.3 |

Field totals BEFORE → AFTER: correct 54→97 · wrong 44→10 · missing 38→32 · flagged-review 2→2 · **hallucinated 38→28**

## Per-document (selected)

| ID | BEFORE c/p | AFTER c/p | Notes |
|----|----------:|----------:|-------|
| S01 (§11.19) | 80/80 | **100/100** | late_rule structured; within_cat review |
| S05 sum90 | 60/25 | 60/60 | no renormalize kept |
| S06 sum110 | 50/71 | 62/62 | 50/40/20 kept; UI blocks Save |
| S08 hand | 0/0 | 14/14 | still weak handwriting |
| H01 (§11.20) | 0/27 | **83/86** | clean recovered; levels gap on clean |
| H09 chart | 0/0 | 0/0 | FR-AI-24#6 qp.tables still missing |
| H10 | — | 0 | levels/gpa.repeat/include missing |
| N01/N02 | 100 | **100** | empty OK |
| N03 mixed | 0/0 | **100/100** | empty fields + block warnings |
| S11/S12 real | ~50/33 | 50/33 | soft GT / still hallucinated cats |

Full matrix: `runs/202609302227/score.json` + `score-summary.json`.

## Rules

| Rule | BEFORE | AFTER |
|------|--------|-------|
| FR-AI-21 no silent renormalize | PASS S05/S06 clean | PASS S05/S06 |
| FR-AI-21 numeric chart (H09 qp.tables) | content present / strict fail | still missing → FR-AI-24#6 |
| FR-AI-13 negatives | N01/N02 PASS; N03 FAIL | **N01/N02/N03 PASS** |
| No Publish from edge | PASS | PASS |

Remaining rule violations in AFTER run: **H09 clean/photo → FR-AI-24#6** (qp.tables missing).

## UI proof (required) @ 375px

Harness: QA Chrome CDP `:9223` · worktree Expo web `:8091` (edge path; `EXPO_PUBLIC_AI_DEV_URL` cleared so client hits live `ingest-grading-doc`) · personas teacher/office.

| Shot | Path | Result |
|------|------|--------|
| §11.19 S01 photo review | `runs/202609302227/ui-proof/s11-19-S01-photo-375.png` | Review UI + ambiguity/flag; **AI never publishes**; Apply/Discard manual |
| N03 mixed warning | `runs/202609302227/ui-proof/N03-mixed-doc-warning-375.png` | Mixed-doc / separate-documents warning path |
| S06 110% Save block | `runs/202609302227/ui-proof/S06-110-blocking-Save-375.png` | Weights 50/40/20; Save/publish blocked until 100% |
| §11.20 H01 prefill | `runs/202609302227/ui-proof/s11-20-H01-prefill-375.png` | Policy wizard prefilled from document |
| §11.20 after apply, no Publish | `runs/202609302227/ui-proof/s11-20-H01-after-apply-no-publish-375.png` | Status: proposal applied; Publish still manual |

Transcript pre-Publish: REST probes for `transcript_rows` / `gpa_transcript_rows` / `period_transcript_rows` returned **404** (relations not present on this dev schema) — no rows can have been written by apply-only. UI never auto-Published.

Log: `runs/202609302227/ui-proof/ui-proof-log.json` + `h01-office-log.json`.

## Remaining gaps (ranked)

1. H09/H10 handbook QP tables + levels/repeat still empty (FR-AI-24#6)
2. Hallucinations remain on S07–S12 engine/floor/categories (~28)
3. S08 handwriting still ~14%
4. H03 locks map shape (`homework_max_weight` vs `homework_max_percent`)
5. H06 gpa.include list vs object shape
6. Scorer still marks some string/object late/missing mismatches as wrong when value is right (S02/S04/S08 missing_rule)

## Rerun

```bash
npm run eval:ingest
# UI: Expo worktree :8091 without EXPO_PUBLIC_AI_DEV_URL; CDP :9223; teacher/office personas
```

Matrix: `notes/company/gradebook/eval/INGEST_MATRIX.md`
