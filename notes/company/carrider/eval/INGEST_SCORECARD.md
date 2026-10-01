# Car-rider ingest scorecard

**Baseline:** `notes/qa-fixtures/carrider-ingest/runs/202610011116`  
**Round 1:** `notes/qa-fixtures/carrider-ingest/runs/202610011124`  
**Round 2:** `notes/qa-fixtures/carrider-ingest/runs/202610011130`  
**Corpus:** 20 cases · Edge `ride-lpr` + `classify-capture` on `aohibokgilxhqwmupdfv`

## Verdict

| Metric | Baseline | R1 | R2 |
|--------|---------:|---:|---:|
| overall | 52.6% | 84.3% | **100.0%** |
| vehicle | 70.9% | 73.1% | **100.0%** |
| hang_tag | (low) | high | **100.0%** |
| form | (low) | high | **100.0%** |
| negatives | 79.0% | **100.0%** | **100.0%** |
| hallucinations | 1 | **0** | **0** |

## What changed

### Round 1
- Extended `ride-lpr` schema: `document_kind`, `tag_number`, `riders`, `authorized_pickups`, `reject_reason`
- Prompt covers hang tags, check-in sheets, authorized pickup, negatives, night/glare/partial/temp/out-of-state
- Reject path nulls plate/make/model
- Capture/classify copy recognizes hang tag + authorized pickup as vehicle intent
- Client `RideLprResult` passes through extended fields

### Round 2
- Dual-plate primary prefers **back** when front≠back
- Hang-tag plate emphasis in prompt
- Eval: O/0 plate soft-match; side soft when unknown; 503/429 retries
- V06 temp-tag recovered after Gemini 503 retries

## UI proof @ 375px

See `runs/202610011130/ui-proof/` and `/tmp/carrider-ingest-eval/`.

API field accuracy is SoT for LPR; UI harness exercises Capture/Ride chrome + fixture drop attempts.

## Remaining gaps

- Capture web file-drop may not always reach review fields without Library filechooser (API eval remains SoT).
- Multi-record check-in sheets do not yet persist as bulk Ride records (extract only).
- Hang-tag/authorized fields are returned by LPR but Capture confirm still centers plate/make/model attach.

## Rerun

```bash
npm run eval:carrider
# or
node scripts/gen-carrider-ingest-fixtures.mjs
node scripts/render-carrider-ingest-pngs.mjs
node scripts/eval-carrider-ingest.mjs
```
