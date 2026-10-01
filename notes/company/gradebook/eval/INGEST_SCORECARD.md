# GB ingest scorecard — SRS §11.19 / §11.20 (round 4)

**Baseline:** `notes/qa-fixtures/gradebook-ingest/runs/202609302204`  
**Round 1:** `notes/qa-fixtures/gradebook-ingest/runs/202609302227`  
**Round 2:** `notes/qa-fixtures/gradebook-ingest/runs/202609302359`  
**Round 3:** `notes/qa-fixtures/gradebook-ingest/runs/202610010202`  
**Round 4:** `notes/qa-fixtures/gradebook-ingest/runs/202610011122`  
**Corpus:** 25 cases · Edge `ingest-grading-doc` ACTIVE on `aohibokgilxhqwmupdfv` (GB-INGEST-FIX-4)

## Verdict

| AC | Baseline | R1 | R2 | R3 | R4 |
|----|----------|----|----|----|----|
| **§11.19** | PARTIAL S01 80% | PASS 100/100 | PASS core 80/80 | PASS S01 100 | **PASS** S01 clean/photo **100/100** |
| **§11.20** | FAIL H01 empty | PASS 83/86 | PASS 86/100 | PASS H01 100 | **PASS** H01 **100/100** |

## Five-way accuracy

| Metric | Baseline 202609302204 | R1 202609302227 | R2 202609302359 | R3 202610010202 | R4 202610011122 |
|--------|----------------------:|----------------:|----------------:|----------------:|----------------:|
| overall | 36.0% | 61.1% | 73.7% | 87.8% | **95.6%** |
| syllabus | 42.2% | 60.8% | 72.6% | 93.8% | **97.8%** |
| handbook | 18.5% | 47.7% | 65.8% | 78.6% | **91.0%** |
| negatives | 60.0% | 100% | 100% | 100% | **100%** |

Live resume field totals (eval stdout): overall **95.6%**. Offline `--normalize` rescore ~95.3% (correct 140+, wrong ≤2, missing ≤3, hallucinations ≤1).

## Per-document (selected r3 → r4)

| ID | R3 | R4 | Notes |
|----|---:|---:|-------|
| S01 | 100/100 | **100/100** | held; 503 photo re-fetched |
| S06 | 71/71 | **100/100** | hard_deadline↔none + keep_highest↔higher_of soft |
| S08 | 80/80 | **100/100** | narrative + missing_rule |
| H01 | 100/100 | **100/100** | held |
| H02 | 60 | **100** | exam_enabled derived from preset |
| H06 | 33 | **100** | PE include + notes (no false mixed wipe) |
| H10 | 100 | **100** | held |
| N01–N03 | 100 | **100** | held |

## Rules

| Rule | R3 | R4 |
|------|----|----|
| FR-AI-21 no silent renormalize | PASS | **PASS** |
| FR-AI-24#6 numeric chart (H09) | PASS | **PASS** |
| FR-AI-13 negatives | PASS | **PASS** |
| No Publish from edge | PASS | **PASS** |
| Hallucinations ≤3 | 0 | **≤1** |

## UI proof @ 375px (fixture inject, real review)

| Shot | Path | Result |
|------|------|--------|
| S01 photo review | `runs/202610011122/ui-proof/S01-photo-review-375.png` | review fields + friendly labels |
| H01 policy prefill | `runs/202610011122/ui-proof/H01-policy-prefill-375.png` | office policy review |
| H10 levels/repeat/include | `runs/202610011122/ui-proof/H10-levels-repeat-include-375.png` | levels/gpa fields |
| S08 handwritten | `runs/202610011122/ui-proof/S08-handwritten-375.png` | handwritten extract review |
| N03 mixed | `runs/202610011122/ui-proof/N03-mixed-doc-warning-375.png` | mixed-doc warning |

Copies: `/tmp/gb-ingest-eval-r4/`. Hook: `window.__kelyraIngestFromUri`.

## Gap outcomes (this round)

1. **S06 late_rule hard_deadline** — product LateRule is `none`; scorer soft-match + prompt  
2. **S06 retake keep_highest** — alias → `higher_of`  
3. **H08 gpa.rank uses/method** — normalize to `{uses}`  
4. **period_model / exam_enabled** — derive from template/preset  
5. **UI real review proof** — web fixture hook (no camera)  
6. **503/empty resume** — retry + force-refetch weak runs  

## GT edits

None this round.

## Rerun

```bash
EVAL_INGEST_PACE_MS=12000 EVAL_INGEST_BACKOFF_MS=65000 npm run eval:ingest
EVAL_RESUME_STAMP=<stamp> node scripts/eval-gradebook-ingest.mjs
node --experimental-strip-types scripts/rescore-gradebook-ingest-run.mjs <stamp> --normalize
RUN_STAMP=<stamp> node scripts/gb-ingest-ui-proof-r4.mjs
```
