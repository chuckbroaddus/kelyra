# GB ingest rough drop 97.3% → 90.9% (Oct 2)

**Run:** `notes/qa-fixtures/gradebook-ingest/runs/202610021812`  
**Before (live raw):** overall **90.9%** · syllabus 95.2% · handbook 90.9% · negatives 71.4%  
**After (offline `--normalize` + companion scorer):** overall **95.0%** · syllabus 96.3% · handbook 92.6% · negatives **100%**

## Root cause (not one thing)

1. **Corpus expansion (primary score mix shift)**  
   Rough LIGHT set landed on `cos/gb-ingest-rough-corpus` (P01–P05, C01–C02, A01, N04).  
   Case count 25 → 34. New cases (esp. N04 clean 0%, C02 clean 50%, P02 80%, P04 clean 75%) pull the mean even when legacy cases hold.  
   Prior “97.3%” score-summary was the **legacy clean/photo** mix (R4 / 202610011122), not this rough corpus.

2. **Real pipeline regressions on negatives**  
   - **N02:** model correctly `block:not_a_syllabus`, but still filled `syllabus.title`. Handwriting retry preferred denser fills. Good run had empty fields.  
   - **N04:** only `warn:non_syllabus_document` while filling title + late_rule from a fundraiser flyer.  
   Fix: `looksWrongGradingDocument` wipes fields + forces block; skip handwriting retry over blocked empty; prompt hard rule.

3. **Normalizer school-path lift on syllabus (S05)**  
   Homework-lock note in narrative (`homework <= 10%`) was lifted into `locks.map` on a **syllabus** proposal.  
   Fix: school-only lifts gated by wizard; derive `syllabus.engine` from weighted categories when omitted.

4. **Scorer companions**  
   `credit.policy` from “Credit terms are semesters” is a legitimate companion of calendar (H03), not a hallucination.  
   Companion set extended; not GT-tuning of values.

5. **Not fixed / not pipeline**  
   - **C02 clean 50%:** model omitted scale bands/passing on a clean scan (rough still 100% with uncertain GT). Model variance.  
   - **H08 clean 67%:** scale.bands still missing (same as R4 soft spot).  
   - **H03 photo:** calendar still missing on photo (hard photo).  
   - **P02 engine hallu / C01 rough wrong weights:** model variance on rough LIGHT cases — do not retune GT.

## Soft spots before → after (normalize)

| Case | Live 202610021812 | After normalize |
|------|------------------:|----------------:|
| N02/clean | 0% | **100%** |
| N04/clean | 0% | **100%** |
| N04/rough | 100% | 100% |
| C02/clean | 50% | 50% |
| C02/rough | 100% | 100% |
| H08/clean | 67% | 67% |
| H03/photo | 40% | **50%** |
| H03/clean | 80% | **100%** |
| S05/clean | 60% | **80%** |

## Deploy

Edge `ingest-grading-doc` must ship `_shared/ingestNormalize.ts` + prompts + index retry guard for live path.  
This machine had no `supabase` CLI — open PR and deploy from a machine with CLI:

```bash
supabase functions deploy ingest-grading-doc --project-ref aohibokgilxhqwmupdfv
EVAL_ONLY=N02,N04,S05,H03,C02,H08 EVAL_INGEST_PACE_MS=12000 node scripts/eval-gradebook-ingest.mjs
```

## Offline verify

```bash
node --experimental-strip-types scripts/rescore-gradebook-ingest-run.mjs 202610021812 --normalize
node --experimental-strip-types --test src/lib/ingest/normalizeFieldValues.test.ts
```
