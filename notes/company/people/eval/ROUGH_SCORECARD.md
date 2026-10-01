# People ingest — rough phone-photo scorecard (PENDING)

Corpus: the 21 PR #334 fixtures plus 16 new cases (PR01–PR10 rough printed, PH01–PH04
handwritten parent-filled, N04–N05 rough negatives). See `notes/qa-fixtures/people-ingest/README.md`.
That is 69 scored images: 36 legacy, 20 PR clean+rough, 6 PH, 4 N, 3 rough_crop.

## Status: scores pending (provider quota)

On 2026-10-01 at about 8:15 AM CT, the dev Edge `classify-capture` returned
`Gemini failed: 429 RESOURCE_EXHAUSTED … generate_content_free_tier_requests, limit: 500,
model: gemini-3.5-flash-lite` on every call. The daily free-tier quota resets at about 2 AM CT.
No scores were recorded. No Edge function, prompt, or client code was changed or deployed.

| bucket | n | intent | doc acc | field acc | hallucinations | adult2+ |
|---|--:|--:|--:|--:|--:|--:|
| legacy_clean_photo (PR #334 set) | 36 | pending | pending | pending (was 98.3%) | pending | — |
| clean | 28 | pending | pending | pending | pending | pending |
| mild_photo | 12 | pending | pending | pending | pending | — |
| rough | 10 | pending | pending | pending | pending | pending |
| handwritten (clean + rough) | 6 | pending | pending | pending | pending | pending |
| multi_adult (clean + rough) | 7 | pending | pending | pending | pending | pending |
| negative (incl. rough) | 9 | pending | pending | — | pending | — |
| rough_crop vs rough (PR01/PR06/PR08) | 3+3 | pending | pending | pending | pending | — |

### Resume (after ~2 AM CT, Mac, worktree `~/projects/kelyra-wt-people-rough`)

The worktree needs `.env` (gitignored). Symlink it from the main checkout, as on the build machine:
`ln -s ~/projects/kelyra/.env .env`.

```bash
cd ~/projects/kelyra-wt-people-rough
# full run, 69 calls. Prints the bucket table, worst list, and runs/<stamp>/score.json
node scripts/eval-people-ingest.mjs
# new cases only + MP01, 35 calls, if quota is tight
EVAL_ONLY=PR01,PR02,PR03,PR04,PR05,PR06,PR07,PR08,PR09,PR10,PH01,PH02,PH03,PH04,N04,N05,MP01 node scripts/eval-people-ingest.mjs
# if it stops on quota again, it prints e.g.
#   resume: EVAL_RESUME_STAMP=<stamp> node scripts/eval-people-ingest.mjs
```

Do not use `npm run eval:people` for this. It re-renders every legacy PNG and photo.jpg, which
churns binaries. The images are already committed.

## Image path / resolution (checked in code, no AI needed)

- `supabase/functions/classify-capture/index.ts` sends the photo as
  `{ type: 'input_image', image_url, detail: imageDetailFor('cheap') }`, which is **`detail: 'low'`**
  (`_shared/aiPolicy.ts`: low unless pass = look-again).
- Live dev Edge runs **Gemini** (GEMINI_API_KEY set, XAI_API_KEY unset; the 429 body names
  `gemini-3.5-flash-lite`). `_shared/ai.ts` `inlineImagePart()` drops `detail`, and `geminiGenerate()`
  sets no `mediaResolution`. So production gets the Gemini 3 default (UNSPECIFIED = 1120
  tokens/image, same as HIGH). The `low` flag is a no-op on Gemini.
- On the xAI path (local `npm run ai:dev`, and Edge if it falls back to XAI), `detail: 'low'` applies.
  Per the AI SDK's live measurement it cuts image tokens about 6.4× (2541 → 396 on a 2126×1417 image).
  Sub-line text on a 1500×2000 phone photo is likely lost there.
- Size cap: the client has none (ImagePicker `quality: 0.7`, no resize). The Edge and ai-dev servers
  don't resize either. The eval sends the fixture bytes as a data URL. Rough frames are 1500×2000;
  PR06 is 820×1093 on purpose.
- Probe: `rough-crop.jpg` for PR01 (keystone + blur), PR06 (heavy JPEG + downscale), and PR08
  (dark). Each is the page text area cropped out of the same `rough.jpg`, with no resampling.
  If `rough_crop` beats `rough_crop_same_cases`, the per-image token budget (resolution) is the
  cause, not the pixels.

## Suggested fixes (to evaluate once scored; not applied)

1. Multi-adult: add `records[]` (or `adults[{name,relationship,phone,email}]`) to the classify
   JSON and the Capture review. Today the schema only has `parentGuessName` + flat `fields`, so
   adult 2+ contact can only leak in as ad-hoc labels. Score: `adult2+` column.
2. Resolution: on Gemini, set the part-level `mediaResolution` HIGH or ULTRA_HIGH for the
   classify people intents. On xAI, use `detail: 'high'`, or run a look-again high-detail pass when
   intent is parent_card/student_card and fields are sparse. Alternatively, crop/deskew to the
   page client-side before upload.
3. Crossed-out values (PH04): add a prompt rule to ignore struck/scribbled values and take the
   replacement.
4. Glare / cut-edge (PR02, PR04, PR07, PR10): never complete a cut value from a guess. An absent
   field should stay empty (the scorer counts it as hallucinated).
