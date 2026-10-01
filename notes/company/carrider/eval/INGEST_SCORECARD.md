# Car-rider ingest scorecard

**Baseline:** `notes/qa-fixtures/carrider-ingest/runs/202610011116`
**Round 1:** `runs/202610011124` · **Round 2:** `runs/202610011130` · **Final confirm (post-rebase):** `runs/202610011152`
**Corpus:** 20 cases (10 vehicle, 3 hang tag, 4 form/check-in, 3 negatives) → 34 scored docs (clean + photo variants)
**Edge:** `ride-lpr` v8 on `aohibokgilxhqwmupdfv` (scored directly; Capture UI proof below)

## Verdict

| Metric | Baseline | R1 | R2 | Final confirm |
|--------|---------:|---:|---:|---:|
| overall field accuracy | 52.6% | 84.3% | **100.0%** | **100.0%** |
| vehicle | 70.9% | 73.1% | 100.0% | 100.0% |
| hang_tag | 16.7% | 90.0% | 100.0% | 100.0% |
| form / check-in | 5.6% | 100.0% | 100.0% | 100.0% |
| negatives handled | 79.0% | 100.0% | 100.0% | 100.0% |
| clean / photo | 57.4% / 45.7% | 87.1% / 80.4% | 100% / 100% | 100% / 100% |
| hallucinated fields | 1 | **0** | **0** | **0** |
| fields correct / wrong / missing | 58 / 5 / 42 | 96 / 6 / 4 | 106 / 0 / 0 | 106 / 0 / 0 |

Scorer note: R2 added soft matches (O↔0 inside plates; `side` not penalized when truth is `unknown`) and
503/429 retries. Synthetic fixtures are rendered HTML, so 100% here overstates real-world plate photos.

## What changed

### Round 1
- `ride-lpr` schema: `document_kind`, `tag_number`, `riders`, `authorized_pickups`, `reject_reason`
- Prompt covers hang tags, check-in sheets, authorized pickup, negatives, night/glare/partial/temp/out-of-state
- Reject path nulls plate/make/model; partial plate → `unreadable`, plate null (never invent characters)
- classify-capture: vehicle intent recognizes hang tag / car tag / authorized pickup notes + prompt line
- Client `RideLprResult` passes through extended fields

### Round 2
- Dual-plate primary prefers **back** when front≠back; hang-tag plate emphasis in prompt
- Eval: O/0 soft-match; side soft when unknown; 503/429 retries

### Round 3 (review UI + web reachability)
- Capture vehicle card now shows what LPR read beyond plate/make/model: "Read as: car-rider hang tag /
  authorized-pickup form / rider check-in sheet", **Car tag #**, **Riders**, **Authorized pickup**, plus a
  warning for unreadable plates ("We did not guess") and rejected documents.
- `ride-lpr` answers CORS preflight + replies (web Capture could not call it; plate fields stayed empty on web).
  **Not yet deployed** — see gaps.

## UI proof @ 375px (web Capture, fixture fed through the Photo-or-Video file chooser, Ask AI to process)

Saved in `runs/202610011152/ui-proof/` and `/tmp/carrider-ingest-eval/`; each PNG opened and checked.

| Shot | Shows |
|------|-------|
| `V01-plate-photo-review-375.png` | Vehicle card: Back plate KLY4219, Make Honda, Model Civic |
| `V05-partial-plate-375.png` | Plate/make/model empty + red "Plate not readable — … We did not guess." |
| `T01-hang-tag-375.png` | Front plate KLY4219, "Read as: car-rider hang tag", Car tag # 1042, Riders Maya Chen, Leo Chen |
| `F02-authorized-pickup-375.png` | JRD4410 / Honda / CR-V, "Read as: authorized-pickup form", Riders Jordan Lee, Authorized pickup Priya Lee, Marcus Lee |
| `N01-negative-homework-375.png` | Homework page classified "This will be student work / a grade draft" → Save to Inbox (not routed to Ride) |

Harness notes (`scripts/carrider-ui-proof.mjs`): worktree Expo on :8097 with `EXPO_PUBLIC_AI_DEV_URL=` (edge AI);
deployed `classify-capture` / `ride-lpr` lack CORS, so the script relays those two calls from Node and adds only
CORS headers (bodies unchanged). Persona session server only allows the 8081 origin, so the script relays
`/session` the same way. Teacher notes used: "license plate" (V01/V05), "rider check-in hang tag" (T01),
"rider check-in pickup form" (F02), none (N01).

## Remaining gaps

- Deploy `ride-lpr` with CORS (branch code) so web Capture reads plates without the harness relay.
- `classify-capture` edge still has no CORS headers (shared function; out of this track's scope).
- Hang-tag / pickup-form extras are displayed, but Save still only persists plate/make/model; riders,
  authorized pickups, and tag # are not yet written to Ride records. Multi-row check-in sheets are extract-only.
- Without a teacher note, hang tags / pickup forms depend on classify-capture's image read to land on vehicle.
- Corpus is synthetic rendered HTML; add real-world phone photos (night/glare) before trusting 100%.

## Rerun

```bash
npm run eval:carrider
node scripts/carrider-ui-proof.mjs <stamp> --port 8097   # needs worktree Expo web on 8097 + QA Chrome :9223
```

## Rough / handwritten / multi-car corpus — strict eval (2026-10-01)

Eval only: no prompt, function or client changes. Corpus is now 42 cases (22 new; see
`notes/qa-fixtures/carrider-ingest/README.md`). Strict scorer: `scripts/eval-carrider-strict.mjs`.

### Status: live run blocked by the provider's daily quota

The first strict run (08:30 CT) got `429 RESOURCE_EXHAUSTED` from Gemini on every call:
`GenerateRequestsPerDayPerProjectPerModel-FreeTier`, limit **500/day** for `gemini-3.5-flash-lite`. `ai_usage`
for today (Pacific day): ride-lpr 141, ingest-grading-doc 126, classify-capture 123, setup-interview 91
(≈480 logged, last success 08:12 CT); a single probe at 08:34 CT was still rejected. ride-lpr returns HTTP 200 with
`unreadable:true` + an `error` string in this state, so the script now **stops on a quota error** (exit 2) instead of
scoring the outage as misses, and never caches an `error` response. The quota resets at midnight PT (02:00 CT).
Note that this also means a busy school day on the free tier would show unreadable for every plate after ~500 calls
across all AI features.

| Bucket | Docs | Field acc | Doc pass | Plate exact | Halluc. | Picked wrong car | O/0-only |
|--------|------|-----------|----------|-------------|---------|------------------|----------|
| clean | 27 | pending | | | | | |
| mild (`photo.jpg`) | 12 | pending | | | | | |
| rough | 10 | pending | | | | | |
| handwritten | 4 | pending | | | | | |
| handwritten_rough | 2 | pending | | | | | |
| multi_car | 6 | pending | | | | | |
| multi_car_rough | 1 | pending | | | | | |
| negatives | 7 | pending | | | | | |
| negatives_rough | 2 | pending | | | | | |
| crop (R03, R10, H03) | 3 | pending | | | | | |

71 documents per full run (42 cases) + 3 crops.

Rerun after the reset: `npm run eval:carrider:strict` then
`EVAL_RESUME_STAMP=<same stamp> EVAL_CROP=R03,R10,H03 node scripts/eval-carrider-strict.mjs`.

### Multi-car: the prompt has no closest-car rule

Neither the repo `supabase/functions/ride-lpr/index.ts` nor the deployed ride-lpr **v9** (checked via the Supabase
MCP) says anything about which car to read when several are in frame: no "closest", "nearest", "foreground",
"largest", "background", "reflection" or "multiple" wording. The model is free to return the sharpest plate, which is
exactly M02 (the background plate is sharper than the foreground plate), and the mirrored plate in M05.

Suggested fix (prompt rule, next to the existing "If only part of a plate is visible…" line):

> - The photo may show several vehicles. Read ONLY the closest vehicle: the one whose plate is largest and lowest in
>   the frame (the car directly in front of the camera). Ignore every other car, even if its plate is sharper.
>   Ignore plates seen in reflections (windows, bumpers, mirrors) and mirrored text. If two cars are about equally
>   close and you cannot tell which is the target, set plate null, unreadable true and reject_reason "multiple
>   vehicles". make/model must come from the same vehicle as the plate.

Plus a cheap server-side guard: ask for `other_plates_seen: string[]` and drop the result to `unreadable` when the
returned plate also appears there or when `other_plates_seen` is non-empty and confidence < 0.8.

### Image detail / size (ride-lpr, classify-capture vehicle path)

- ride-lpr asks for `detail: 'high'`; classify-capture's vehicle path uses `imageDetailFor('cheap')` = `'low'`.
- But with `GEMINI_API_KEY` set (dev today: every `ai_usage` row is `gemini-3.5-flash-lite`), `_shared/ai.ts`
  `inlineImagePart` downloads the full image and sends `inlineData`; `detail` is ignored and no `mediaResolution`
  is set in `generationConfig`, so Gemini uses its default resolution for both functions. The classify-capture
  "low" setting only bites on the OpenAI path.
- Client cap: `uploadRidePhoto` → `uploadPhotoPair` → `normalizePhoto` resizes to the 1600 px long edge at JPEG 0.82
  (`src/lib/media/photo.ts`); ImagePicker quality 0.7. Rough frames here are 1200×1600, i.e. at the client cap.
- The `crop` bucket (rough.jpg cropped to the plate/text boxes and upscaled to 1200 px wide) is the test for whether
  resolution is the cause; pending with the run above.

### Rough images checked by eye

All 15 `rough.jpg` and all 6 multi-car frames were opened and compared with GT before scoring, e.g.
`notes/qa-fixtures/carrider-ingest/R06/rough.jpg` (thumb clips the first plate char → uncertain),
`notes/qa-fixtures/carrider-ingest/R09/rough.jpg` ("Arjun Patel" surname washed out → uncertain),
`notes/qa-fixtures/carrider-ingest/M06/rough.jpg` (foreground SNT 5742 readable; GVL 3816 and MKD 2479 readable behind it).

### Closest-car fix (stacked PR, not yet evaluated)

`supabase/functions/_shared/closestVehicle.ts` now holds `CLOSEST_VEHICLE_RULES`, which goes into both the ride-lpr
prompt and the classify-capture vehicle line, plus `applyClosestVehicleGuard`. The model returns
`other_plates_seen`. The server marks the read unreadable with `reject_reason: "multiple vehicles"` when the returned
plate is in that list, or when the list is non-empty and confidence < 0.8. ride-lpr post-processing moved unchanged
into `_shared/rideLprResult.ts` so tests can feed it mocked model output (`src/lib/ride/closestVehicle.test.ts`).
classify-capture asks for `detail: 'high'` when the teacher note or `intentHint` says vehicle. The result will be
scored by the strict run above once the quota resets: watch `multi_car` picked-wrong-car, and check that `clean` and
`rough` don't regress.
