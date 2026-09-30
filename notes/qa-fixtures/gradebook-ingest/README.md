# Gradebook ingest fixture corpus

Reusable evaluation set for SRS §11.19 / §11.20 and FR-AI-*.

## Layout

Each case folder (`S01`…`S12`, `H01`…`H10`, `N01`…`N03`):

- `source.html` — printable single-page source (generated cases)
- `clean.png` — rendered page
- `photo.jpg` — photo-like or real camera capture (when present)
- `expected.json` — ground truth IngestProposal shape
- `eval-meta.json` — scorer hints (weights_sum, negative, numeric_chart, …)
- `notes.md` — what the case exercises

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

## Add a case

1. Append a case object in `scripts/gen-gradebook-ingest-fixtures.mjs`.
2. Re-run the generator.
3. Re-run `npm run eval:ingest` and diff `runs/` score.json.
