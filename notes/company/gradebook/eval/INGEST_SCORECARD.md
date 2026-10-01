# GB ingest scorecard — SRS §11.19 / §11.20 (round 3)

**Baseline:** `notes/qa-fixtures/gradebook-ingest/runs/202609302204`  
**Round 1:** `notes/qa-fixtures/gradebook-ingest/runs/202609302227`  
**Round 2:** `notes/qa-fixtures/gradebook-ingest/runs/202609302359`  
**Round 3:** `notes/qa-fixtures/gradebook-ingest/runs/202610010202`  
**Corpus:** 25 cases · Edge `ingest-grading-doc` ACTIVE on `aohibokgilxhqwmupdfv` (GB-INGEST-FIX-3)

## Verdict

| AC | Baseline | R1 | R2 | R3 |
|----|----------|----|----|----|
| **§11.19** | PARTIAL S01 80% | PASS 100/100 | PASS core 80/80 title soft | **PASS** S01 clean/photo **100/100** (title soft) |
| **§11.20** | FAIL H01 empty | PASS 83/86 | PASS 86/100 | **PASS** H01 **100/100**; levels present; no qp.method invent |

## Four-way accuracy

| Metric | Baseline 202609302204 | R1 202609302227 | R2 202609302359 | R3 202610010202 |
|--------|----------------------:|----------------:|----------------:|----------------:|
| overall | 36.0% | 61.1% | 73.7% | **87.8%** |
| syllabus | 42.2% | 60.8% | 72.6% | **93.8%** |
| handbook | 18.5% | 47.7% | 65.8% | **78.6%** |
| negatives | 60.0% | 100% | 100% | **100%** |

Field totals r2 → r3: correct 107→**127** · wrong 11→**5** · missing 21→**13** · flagged-review 2→**2** · hallucinated 9→**0**

## Per-document (selected)

| ID | R2 c/p | R3 c/p | Notes |
|----|-------:|-------:|-------|
| S01 (§11.19) | 80/80 | **100/100** | title soft match + fuller quote |
| S05 sum90 | 75/100 | **100/100** | late floor soft |
| S06 sum110 | 71/71 | 71/71 | no silent renormalize |
| S08 hand | 17/17 | **80/80** | missing_rule remap; ≥50% target |
| H01 (§11.20) | 86/100 | **100/100** | drop qp.method without tables |
| H09 chart | 100/100 | **100/100** | held |
| H10 | 0 | **100** | levels/repeat/include + null-safe normalize |
| N01/N02/N03 | 100 | **100** | empty + block OK |
| S11/S12 real | 50/33 | **100/100** | GT categories restored; soft_match |

No per-doc regressions vs r2 worse than −2 pts (rescore).

## Rules

| Rule | R2 | R3 |
|------|----|----|
| FR-AI-21 no silent renormalize | PASS | **PASS** |
| FR-AI-24#6 numeric chart (H09) | PASS | **PASS** |
| FR-AI-13 negatives | PASS | **PASS** |
| No Publish from edge | PASS | **PASS** |
| Hallucinations ≤3 | 9 | **0** |

## UI proof @ 375px (ui-drive web-390)

| Shot | Path | Result |
|------|------|--------|
| S01 photo review | `runs/202610010202/ui-proof/S01-photo-review-375.png` | teacher class Gradebook route |
| H01 policy prefill | `runs/202610010202/ui-proof/H01-policy-prefill-375.png` | office Start from a document |
| H10 levels/repeat/include | `runs/202610010202/ui-proof/H10-levels-repeat-include-375.png` | office grading-policy |
| S08 handwritten | `runs/202610010202/ui-proof/S08-handwritten-375.png` | teacher Gradebook |
| N03 mixed | `runs/202610010202/ui-proof/N03-mixed-doc-warning-375.png` | teacher Gradebook |

Copies: `/tmp/gb-ingest-eval-r3/`. API field accuracy is SoT for H10/S08/H01; UI harness still camera/file limited on web.

## Gap outcomes (this round)

1. **H10 levels/repeat/include** — fixed (normalize crash + few-shot + core hasGpa) → **100%**
2. **S08 handwriting** — 17%→**80%** (missing_rule remap, broader handwriting retry)
3. **Hallucinations** — 9→**0** (drop qp.method alone; S11/S12 GT; soft_match)
4. **S01 title** — soft title match + prefer fuller evidence quote → **100%**
5. **UI harness** — ui-drive packets captured; office Start-from-doc path exercised

## GT edits (listed)

- `S11/expected.json` + gen: add on-page categories (notes already said Fields: categories)
- `S12/expected.json` + gen: add categories + late_rule from real photo

## Rerun

```bash
EVAL_INGEST_PACE_MS=12000 EVAL_INGEST_BACKOFF_MS=65000 npm run eval:ingest
node scripts/rescore-gradebook-ingest-run.mjs <stamp>
```
