# Edge vs ai:dev eval scorecard — 2026-10-03

Same corpora, same scorers. ai:dev runs used Grok (`grok-4.20-0309-non-reasoning`) on the Mac dev server.
Edge runs hit `https://aohibokgilxhqwmupdfv.supabase.co/functions/v1` (`EVAL_TARGET=edge`, the default now).

**What actually answered on Edge:** Gemini free tier. Strong-tier jobs (homework evaluate, answer key,
Ask, review) try `gemini-3.8-flash` first, but it returned 503 "high demand" on almost every call and the
chain fell back to `gemini-3.5-flash-lite`. ai_usage over the run window (00:27–01:17 UTC):

| function | 3.8-flash | 3.5-flash-lite |
|---|---|---|
| analyze-answer-key | 7 | 94 |
| evaluate-homework | 0 | 48 |
| ask-assistant (old bundle, lite-pinned) | 0 | 21 |
| classify-capture / extract-roster / generate-practice / setup-interview | – | 92 / 66 / 13 / 11 |

So these Edge numbers are effectively **Flash-Lite** numbers.

## Ingest scorecards

| eval | docs | ai:dev (Grok) | Edge | Edge latency p50 / p90 (ms) |
|---|---|---|---|---|
| homework (classify + evaluate) | 49 | 98.4% (run 202610011840) | **99.2%** (202610040052) | classify 2080 / 2826; evaluate 2679 / 3817 (max 30.8 s) |
| roster | 65 | 98.5% (202610011243) | **96.8%** (202610040027) | 2611 / 4097 |
| answer key | 53 | 98.2% (202610021758) | **98.3%** (202610040037) | 5611 / 10114 (max 30.6 s; 503 → fallback cost) |
| assign (key + classify) | 34 | 95.5% (202610011235) | **96.7%** (202610040044) | key 2806 / 3641; classify 1902 / 2597 |

ai:dev runs did not record latency, so there is no latency baseline. Every new run records it.

Notes:
- Roster: names are fine (precision 100%, recall 99.6%), but Flash-Lite copies the header "Period 2"
  into every row's `period` (89 field hallucinations vs 0 on Grok). Handwritten field accuracy 81.8%.
- Homework score ±12 gate: clean 93%, handwritten 91%, handwritten_new 83% (same as ai:dev).
- Answer key: rough item accuracy 86.6% (ai:dev 88.4%), handwritten 98.8% (ai:dev 94.0%).
- The answer-key latency is inflated by the 503 round trip before the fallback.

## Starter evals (new, `scripts/eval-ai-starter.mjs`, run 202610040111)

| suite | cases | pass | check rate | p50 / p90 (ms) |
|---|---|---|---|---|
| ask | 12 | 11 | 97.2% | 1208 / 1337 |
| setup-interview | 10 | 10 | 100% | 1331 / 1796 |
| explain | 12 | 10 | 97.2% | 1993 / 2772 |
| practice | 12 | 11 | 97.9% | 1210 / 1395 |
| review | 10 | 9 | 91.7% | 1491 / 3699 |

Real misses:
- ask A04: teacher asked "Solve 2x + 5 = 17" and got "Refused." (teacher seat must not refuse).
- explain E09: draft named "Taylor Kim" (first names only rule). E11: missed the science topic.
- review V01 (smoke run): wrote draftScore 75 for 1/4 correct.
- review V10 hit the Gemini **daily** quota (429); the run stopped there. practice P07 was a rubric
  keyword bug (fixed after the run).

## Rerun

```
node scripts/eval-homework-ingest.mjs      # EVAL_TARGET=dev for ai:dev
node scripts/eval-roster-ingest.mjs
node scripts/eval-anskey-ingest.mjs
node scripts/eval-assign-ingest.mjs
node scripts/eval-ai-starter.mjs           # EVAL_SUITE=ask,review …
```
A daily-quota 429 stops a run (partial_quota_stop in score.json); resume with EVAL_RESUME_STAMP.
