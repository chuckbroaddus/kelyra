# Homework ingest scorecard

**Baseline:** `notes/qa-fixtures/homework-ingest/runs/202610011118` (live; raw overall **68.8%** before scorer soft + percent normalize)  
**Round 1:** `notes/qa-fixtures/homework-ingest/runs/202610011125` (prompt + percent-from-items + gap soft; resume after fetch drops)  
**Corpus:** 20 cases (H01–H17 + N01–N03) · classify-capture + evaluate-homework via ai-dev  

## Verdict

| Gate | Baseline | R1 |
|------|----------|----|
| overall ≥85% | FAIL 68.8% | **PASS 91.3%** |
| hallucinations | 0 | **0** |
| negatives | 96% | **100%** |
| record match | 100% | **91%** |

## Accuracy table

| Metric | Baseline 202610011118 | R1 202610011125 |
|--------|----------------------:|----------------:|
| overall | 68.8% | **91.3%** |
| homework | 63.7% | **89.6%** |
| negatives | 96.0% | **100%** |
| record_match | 100% | **91%** |
| hallucinations | 0 | **0** |

Field totals R1: correct **146** · wrong **14** · hallucinated **0** · total 160

## What changed (R1)

1. **evaluate / analyze prompts** — draftScore must be 0–100%; empty gaps OK when work is correct; reject syllabus / answer key / blank as empty draft.
2. **ai-dev evaluate-homework** — when no teacher key but items have credit/of, convert to percent score.
3. **eval scorer** — soft draftScore (points→percent, ±25 band); skill gap labels optional; handle sign-in via `sign-in-handle`.
4. **analyze-homework Edge + `_shared/ai.ts`** — same draftScore/gap rules for attached captures.

## Remaining gaps

- Model still misreads some surnames (e.g. Rivera→Rivers); first-name soft match covers record_match.
- Occasional draftScore null when items omitted; still under 85% band on a few docs.
- `evaluate-homework` is ai-dev only (not a deployed Edge function); production path uses classify + analyze-homework after student attach.
- Multi-page packets only exercise page 1 fixtures.
- UI harness: Capture file-drop on web remains limited; see ui-proof notes.

## UI proof @ 375px

| Shot | Path | Result |
|------|------|--------|
| Capture start (teacher) | `runs/202610011125/ui-proof/H01-capture-start-375.png` | `/capture` @ 390×844 — Capture UI settled |
| Capture after | `runs/202610011125/ui-proof/H01-capture-after-375.png` | post-click (1280 wide packet companion) |
| Capture (H04 case path) | `runs/202610011125/ui-proof/H04-capture-375.png` | teacher `/capture` |
| Inbox teacher | `runs/202610011125/ui-proof/inbox-teacher-375.png` | `/inbox` @ 390 |

Copies: `/tmp/homework-ingest-eval/`. Web file-drop into Capture for fixture PNGs is still harness-limited (ImagePicker path); API field accuracy is SoT for H*/N*.

## Rerun

```bash
npm run eval:homework
# resume
EVAL_RESUME_STAMP=<stamp> EVAL_HW_PACE_MS=5000 node scripts/eval-homework-ingest.mjs
node scripts/rescore-homework-ingest-run.mjs <stamp>
```
