# Answer-key ingest fixture corpus

Reusable eval set for `analyze-answer-key` (capture / assignment form / Ask `scan_answer_key`).

## Inventory (code paths)

| Layer | Path | Role |
|-------|------|------|
| Capture confirm | `src/app/capture.tsx` | intent `answer_key` → `invokeAi('analyze-answer-key')` → `updateAssignment` key fields |
| Assignment form | `src/app/class/[id]/assignment/[assignmentId].tsx` | key photo pick → same analyze → draft key items |
| Ask tool | `src/lib/ai/askTools.ts` `scan_answer_key` | read-only scan; teacher confirms before create |
| Client types | `src/lib/assignments/keys.ts` | `AnswerKeyItem`, `normalizeKeyItems`, `parseKeyItems` |
| Invoke | `src/lib/ai/invoke.ts` | local `ai:dev` or edge name `analyze-answer-key` |
| Local AI | `scripts/ai-dev-server.mjs` `analyzeAnswerKey` + `analyzeKeyPrompt` | **primary implementation** (no dedicated Edge fn yet) |
| Classify | `supabase/functions/classify-capture` + ai-dev | intent `answer_key` |
| Seat jobs | `src/lib/capture/seatJobs.ts` | label "Answer key" |
| Score | `src/lib/assignments/scoreKey.ts` | grades against key_items after Approve |

## Target model (analyze response → assignment)

```
pageState: blank | filled | unsure
header: string | null
maxScore: number | null
teacherNote: string | null
phash, layout: page signature (match-key)
items[]: { n, stem?, answer, points?, note?, needsTeacher?, type?, choices? }
```

Persisted on `assignments`: `key_kind`, `key_items`, `key_asset_id`, `key_phash`, `key_layout`, `key_header`, `key_notes`, `max_score`.

## Layout

Each case (`K01`…, `N01`…):

- `source.html`, `clean.png`, optional `photo.jpg`
- `expected.json` — ground truth analyze shape
- `eval-meta.json` — scorer hints (`negative`, `photo`, soft match)
- `notes.md`

Root: `MANIFEST.json`, `runs/<stamp>/`.

## Commands

```bash
node scripts/gen-anskey-ingest-fixtures.mjs
node scripts/render-anskey-ingest-pngs.mjs
npm run eval:anskey
# or: node scripts/eval-anskey-ingest.mjs
```

Requires local `npm run ai:dev` (analyze-answer-key), `.env` Supabase URL/anon, teacher persona in `~/.kelyra/ui-personas.json`. Never print secrets.

Do not modify gradebook-ingest eval or fixtures.
