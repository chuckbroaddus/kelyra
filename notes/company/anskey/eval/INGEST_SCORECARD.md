# Answer-key ingest scorecard

**Baseline:** `notes/qa-fixtures/anskey-ingest/runs/202610011118`  
**Round 1:** `notes/qa-fixtures/anskey-ingest/runs/202610011122`  
**Corpus:** 20 cases (K01–K17 keys + N01–N03 negatives)  
**Runtime:** local `ai:dev` `analyze-answer-key` (no dedicated Edge fn)

## Verdict

| Metric | Baseline | Round 1 |
|--------|---------:|--------:|
| overall | 82.1% | **95.7%** |
| answer_key | 86.4% | **94.9%** |
| negatives | 60.0% | **100%** |
| hallucinations | 2 | **0** |

Field totals r1: correct majority · hallucinated **0** · negatives all handled.

## What changed (round 1)

1. **Prompt** — classify non-keys first (`reject`); filled keys EXTRACT printed/bubbled answers (do not re-solve); partial keys never invent missing items; MC letter guidance.
2. **Post-filter** in `analyzeAnswerKey` — honor `reject` → empty items; promote `pageState` blank→filled when header looks like a key and answers present; light MC letter normalize.
3. **Eval** — field accuracy, item match, hallucination, negative handling; `npm run eval:anskey`.

## Remaining gaps

- Bubble sheets (K03/K11) still occasional letter swaps under photo noise (~78–87%).
- K01 photo item misreads remain intermittent.
- No production Edge Function yet — product path is local `ai:dev` / future edge parity.
- UI harness: assignment key photo review still camera/file limited on web; API field accuracy is SoT.

## UI proof @ 375px

| Shot | Path | Notes |
|------|------|-------|
| assignment form | `runs/202610011122/ui-proof/assignment-new-375-web-390.png` | teacher new assignment (key attach lives here) |
| capture | `runs/202610011122/ui-proof/capture-start-375-web-390.png` | teacher capture (answer_key intent path) |
| class works | `runs/202610011122/ui-proof/class-works-375-web-390.png` | class landing |

Copies: `/tmp/anskey-ingest-eval/202610011122/`. PNG mean-luminance non-blank check OK. Full fixture→review still camera/file limited on web; **API field accuracy is SoT**.

## Rerun

```bash
# terminal 1
AI_DEV_PORT=8791 npm run ai:dev
# terminal 2
ANSKEY_AI_URL=http://127.0.0.1:8791 npm run eval:anskey
```
