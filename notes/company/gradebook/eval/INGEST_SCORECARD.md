# GB ingest scorecard — SRS §11.19 / §11.20 (round 2)

**Baseline:** `notes/qa-fixtures/gradebook-ingest/runs/202609302204`  
**Round 1 (AFTER fix1):** `notes/qa-fixtures/gradebook-ingest/runs/202609302227`  
**Round 2 (AFTER fix2):** `notes/qa-fixtures/gradebook-ingest/runs/202609302359`  
**Corpus:** 25 cases · Edge `ingest-grading-doc` **v3 ACTIVE** on `aohibokgilxhqwmupdfv` (PR #314 / merge `5c1f88d`)

First live pass hit Gemini free-tier **429** (23/39 empty). Re-ran with paced + retry evaluator; final stamp **202609302359** has **0** quota empties.

## Verdict

| AC | Baseline | Round 1 | Round 2 |
|----|----------|---------|---------|
| **§11.19** | PARTIAL S01 80% | **PASS** S01 100/100 | **PASS (core)** S01 clean/photo **80/80** (title soft miss only; engine/cats/late/within_cat OK; UI friendly labels + one warning) |
| **§11.20** | FAIL H01 empty | **PASS** H01 83/86 | **PASS** H01 clean **86%** / photo **100%**; levels present |

## Three-way accuracy

| Metric | Baseline 202609302204 | Round 1 202609302227 | Round 2 202609302359 |
|--------|----------------------:|---------------------:|---------------------:|
| overall | 36.0% | 61.1% | **73.7%** |
| syllabus | 42.2% | 60.8% | **72.6%** |
| handbook | 18.5% | 47.7% | **65.8%** |
| negatives | 60.0% | 100% | **100%** |
| clean | 34.1% | 60.3% | **70.9%** |
| photo | 39.3% | 62.6% | **78.7%** |

Field totals baseline → r1 → r2: correct 54→97→**107** · wrong 44→10→**11** · missing 38→32→**21** · flagged-review 2→2→**2** · hallucinated 38→28→**9**

## Per-document (selected)

| ID | Base c/p | R1 c/p | R2 c/p | Notes |
|----|---------:|-------:|-------:|-------|
| S01 (§11.19) | 80/80 | 100/100 | **80/80** | title soft miss; late structured |
| S05 sum90 | 60/25 | 60/60 | 75/100 | no silent renormalize |
| S06 sum110 | 50/71 | 62/62 | 71/71 | 50/40/20 kept |
| S08 hand | 0/0 | 14/14 | **17/17** | still weak handwriting |
| H01 (§11.20) | 0/27 | 83/86 | **86/100** | levels OK; clean qp.method hallucinated once |
| H09 chart | 0/0 | 0/0 | **100/100** | **FR-AI-24#6 fixed** |
| H10 | — | 0 | **0** | levels/repeat/include still missing |
| N01/N02/N03 | mixed | 100 | **100** | empty + block OK |
| S11/S12 real | ~50/33 | 50/33 | 50/33 | soft GT / residual cats |

Full matrix: `runs/202609302359/score.json` + `score-summary.json`.

## Rules

| Rule | Baseline | Round 1 | Round 2 |
|------|----------|---------|---------|
| FR-AI-21 no silent renormalize | PASS S05/S06 | PASS | **PASS** |
| FR-AI-24#6 numeric chart (H09) | fail | fail | **PASS 100/100** |
| FR-AI-13 negatives | N03 fail | PASS | **PASS** |
| No Publish from edge | PASS | PASS | **PASS** |

## UI proof @ 375px

Harness: QA Chrome CDP `:9223` · worktree Expo `:8091` · `EXPO_PUBLIC_AI_DEV_URL` cleared · live edge.

| Shot | Path | Result |
|------|------|--------|
| S01 photo review | `runs/202609302359/ui-proof/S01-photo-review-375.png` | **PASS** friendly labels once each; warning once; Apply/Discard manual |
| H01 policy prefill | `runs/202609302359/ui-proof/H01-policy-prefill-375.png` | PARTIAL UI (`Could not read`); **API H01 86/100** |
| H09 QP + levels | `runs/202609302359/ui-proof/H09-qp-table-levels-375.png` | PARTIAL UI; **API H09 100/100** |
| S08 handwritten | API-only this run | API 17/17; camera harness flaky |
| N03 mixed | `runs/202609302359/ui-proof/N03-mixed-doc-warning-375.png` | PARTIAL UI; **API N03 100/100** |

Copies: `/tmp/gb-ingest-eval-r2/`. Log: `ui-proof/ui-proof-log.json`.

## Remaining gaps (ranked)

1. H10 levels/repeat/include still empty
2. S08 handwriting ~17%
3. Hallucinations residual S11/S12 (+ H01 qp.method) — **9** (down from 28)
4. S01 title soft mismatch
5. Scorer late_rule floor shape noise (S05)
6. UI harness: office persona not admin; web syllabus Start-from-doc is camera-only

## Rerun

```bash
EVAL_INGEST_PACE_MS=12000 EVAL_INGEST_BACKOFF_MS=65000 npm run eval:ingest
```

Matrix: `notes/company/gradebook/eval/INGEST_MATRIX.md`
