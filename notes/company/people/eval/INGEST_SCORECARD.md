# People ingest scorecard

**Baseline:** `notes/qa-fixtures/people-ingest/runs/202610011118`  
**Round 1:** `notes/qa-fixtures/people-ingest/runs/202610011128`  
**Corpus:** 21 cases · Edge `classify-capture` on `aohibokgilxhqwmupdfv`

## Verdict

| Metric | Baseline | R1 |
|--------|---------:|---:|
| overall | 55.5% | **89.4%** |
| parent_card | 60.8% | **98.6%** |
| student_card | 53.6% | **86.5%** |
| multi | — | **85.1%** |
| negatives | 60.0% | **80.0%** |
| hallucinations | 0 | **0** |

## Round 1 changes

- `classify-capture` + `ai-dev-server` prompts: explicit parent/student field labels, multi-person names[], no blank invent, no schema placeholders.
- Response sanitize: drop `field`/`value` placeholders; clear non-homework gaps.
- `mapClassifierFields` aliases: tel/cell/e-mail/rel/home phone/student phone/grade / age.
- Eval: retry 503/high-demand; `npm run eval:people`.

## Remaining gaps

- SC02 grade/age + address soft mismatches (~50% on some variants).
- SC03 clean handwriting emergency phone sometimes missing.
- MP03 photo multi-name coverage.
- N03 clean empty-desk occasionally mis-labeled (photo OK).

## UI proof @ 375px

See `runs/202610011128/ui-proof/` and `/tmp/people-ingest-eval/ui-proof/`.

## Rerun

```bash
npm run eval:people
# or
node scripts/gen-people-ingest-fixtures.mjs && node scripts/render-people-ingest-pngs.mjs && node scripts/eval-people-ingest.mjs
```
