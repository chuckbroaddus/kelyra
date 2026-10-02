# Gradebook ingest fixture corpus

Reusable evaluation set for SRS §11.19 / §11.20 and FR-AI-*.

## Layout

Each case folder (`S01`…`S13`, `H01`…`H10`, `N01`…`N04`, rough `P01`…`P05`, `C01`–`C02`, `A01`):

- `source.html` — printable single-page source (generated cases)
- `clean.png` — rendered page
- `photo.jpg` — photo-like or real camera capture (when present)
- `page-1.png`… — multi-page ordered images (see `eval-meta.json.pages`, e.g. S13)
- `expected.json` — ground truth IngestProposal shape
- `eval-meta.json` — scorer hints (weights_sum, negative, numeric_chart, multi_page, …)
- `notes.md` — what the case exercises

Multi-page: set `multi_page: true` and `pages: ["page-1.png", …]` in `eval-meta.json`.
The eval harness sends all pages as `image_urls` in order. Live multi-page eval waits on
Gemini free-tier reset when quota is exhausted.

PDF note: `ingest-grading-doc` vision path only consumes `image_urls` (page images). It does
not rasterize a multi-page PDF server-side — send one image per page from the client.

Root:

- `MANIFEST.json` — index
- `runs/<YYYYMMDD-HHMM>/` — live edge responses + `score.json`

## Regenerate images

```bash
node scripts/gen-gradebook-ingest-fixtures.mjs
```

## Run live evaluation

```bash
npm run eval:ingest
# or
node scripts/eval-gradebook-ingest.mjs
```

Requires `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and personas in `~/.kelyra/ui-personas.json` (teacher for syllabi, office for handbooks). Never print secrets.

## Rough set (P01–P05, C01–C02, A01, N04)

LIGHT set of realistic inputs, defined in `scripts/lib/gradebook-rough-cases.mjs`:

| id | kind | input |
|----|------|-------|
| P01 | syllabus | phone photo, steep keystone + rotation, slight defocus (late rule **uncertain**) |
| P02 | syllabus | phone photo, glare blows out the late-work line (late rule **absent**) |
| P03 | handbook | phone photo of bound page, page curl over the Range column (scale **uncertain**) |
| P04 | syllabus | two-page spread photo, page 2 cut off (late / missing / retake **absent**) |
| P05 | syllabus | low-light phone photo (underexposed, warm cast, noise, shake) |
| C01 | syllabus | skewed faint scan with photocopy speckle (late rule **uncertain**) |
| C02 | handbook | 3rd-generation photocopy scan, toner noise + streaks (scale **uncertain**) |
| A01 | syllabus | printout with teacher pen edits overriding printed weights / late rule |
| N04 | negative | crooked photo of a PTO fundraiser flyer full of percentages |

Per case: `clean.png` + `layout.json` (GT boxes, rendered at the case viewport/DPR) and
`rough.jpg` + `visibility.json` from `scripts/degrade-gradebook-fixtures.mjs` (seeded; adapted from
the roster degrader in PR #337; long edge ≤ 1600 like the app's PHOTO_MAX_EDGE).
`eval-meta.json` `rough_gt` is the honest GT for rough.jpg (checked by eye): **absent** = not legible,
any value is scored *hallucinated*; **uncertain** = partly legible, a review flag passes, a confident wrong
value fails. A01 also reports `stale_printed` if crossed-out printed values come back.
The eval sends clean.png (same-content control) and rough.jpg; `score.json.buckets` splits
clean / photo_mild / rough_src_clean / rough_all / rough_phone / rough_scan / rough_annotated / negatives,
with weights / scale / late+missing / retake sub-accuracy and a hallucination list.

```bash
SKIP_RENDER=1 node scripts/gen-gradebook-ingest-fixtures.mjs
RENDER_ONLY=P01,P02,P03,P04,P05,C01,C02,A01,N04 node scripts/render-gradebook-ingest-pngs.mjs
node scripts/degrade-gradebook-fixtures.mjs
node scripts/eval-gradebook-ingest.mjs                       # full corpus incl. rough
EVAL_ONLY=P01,P02,P03,P04,P05,C01,C02,A01,N04 node scripts/eval-gradebook-ingest.mjs   # rough only
```

The eval **stops** (exit 3) on a model quota error (429 RESOURCE_EXHAUSTED) instead of scoring misses
(set EVAL_RETRY_QUOTA=1 to back off and retry instead), and never caches error responses
(they go to `*.error.json`). Resume a stopped run with `EVAL_RESUME_STAMP=<stamp> node scripts/eval-gradebook-ingest.mjs`.

## Add a case

1. Append a case object in `scripts/gen-gradebook-ingest-fixtures.mjs` (rough: `scripts/lib/gradebook-rough-cases.mjs`).
2. Re-run the generator (+ render / degrade for rough cases).
3. Re-run `npm run eval:ingest` and diff `runs/` score.json.
