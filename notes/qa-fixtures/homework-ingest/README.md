# Homework ingest fixture corpus

Reusable evaluation set for capture classify + evaluate-homework (student work photos → matched student + draft gaps/score ready to grade).

## Area inventory (code map)

| Layer | Path | Role |
|-------|------|------|
| Capture UI | `src/app/capture.tsx` | Photo/file intake, classify, student pick, keyed extract, save capture |
| Proposal UI | `src/app/proposal.tsx` | Batch/proposal review of homework vision |
| Student review | `src/app/class/[id]/student/[studentId].tsx` | Attached capture draft / Approve |
| Client evaluate | `src/lib/captures/evaluate.ts` | Upload pages → `evaluate-homework` |
| Client pages | `src/lib/captures/pages.ts` | Multi-page asset ids (≤4 to model) |
| Gaps / draft API | `src/lib/gaps/api.ts` | `analyze-homework`, store draft, skill_gaps |
| Matching | `src/lib/matching/*` | Paper/spoken name → roster (never insert student) |
| Key grade | `src/lib/keygrade/draft.ts`, `src/lib/assignments/scoreKey.ts` | Keyed items → draft_score |
| Invoke | `src/lib/ai/invoke.ts` | Local ai-dev or Edge |
| Classify Edge | `supabase/functions/classify-capture` | intent + studentGuessName + gaps |
| Analyze Edge | `supabase/functions/analyze-homework` | gaps/draftScore after student_id set |
| Shared prompts | `supabase/functions/_shared/ai.ts`, `scripts/ai-dev-server.mjs` | homework / evaluate / classify prompts |
| Pages shared | `supabase/functions/_shared/homeworkPages.ts` | page cap lockstep |
| Jobs | `supabase/functions/process-ai-jobs` | Drain `homework_draft` queue |
| Match stub | `supabase/functions/match-and-analyze` | 501 placeholder |
| Dev gateway | `scripts/ai-dev-server.mjs` | `evaluate-homework`, classify, analyze |

**Not in scope:** gradebook `ingest-grading-doc` (do not modify that eval).

## Target data model fields (ground truth)

`expected.json` shape for scorer:

```json
{
  "source_id": "H01",
  "kind": "homework",
  "document_kind_guess": "student_work",
  "intent": "homework",
  "negative": false,
  "overall_confidence": 0.85,
  "fields": [
    { "path": "intent", "value": "homework", "status": "proposed" },
    { "path": "studentName", "value": "Alex Rivera", "status": "proposed" },
    { "path": "assignmentTitle", "value": "Linear Equations HW", "status": "proposed" },
    { "path": "draftScore", "value": 80, "status": "proposed" },
    { "path": "maxScore", "value": 100, "status": "unknown" },
    { "path": "gaps", "value": ["two-step equations"], "status": "proposed" },
    { "path": "itemCount", "value": 5, "status": "proposed" },
    { "path": "pageCount", "value": 1, "status": "proposed" },
    { "path": "multiStudent", "value": false, "status": "proposed" },
    { "path": "nameMissing", "value": false, "status": "proposed" },
    { "path": "reject", "value": false, "status": "proposed" }
  ],
  "roster_hint": ["Alex Rivera", "Jordan Chen", "Sam Patel"],
  "warnings": [],
  "ambiguities": []
}
```

Scoring rules (see `scripts/eval-homework-ingest.mjs`):

- **Field accuracy** — intent, studentName (soft), draftScore (±8 or null-null), gaps (label overlap), reject/negative.
- **Record-level match** — studentName matches roster spelling / soft contains.
- **Hallucinations** — value present when ground truth empty/absent/null (esp. studentName, draftScore on blanks/negatives).
- **Negatives** — wrong doc type must intent≠homework or reject=true / empty draft.

## Layout

Each case folder (`H01`…, `N01`…):

- `source.html` — printable page
- `clean.png` — rendered
- `photo.jpg` — phone-like (when flagged)
- `expected.json` — ground truth
- `eval-meta.json` — scorer hints
- `notes.md` — what the case exercises

Root: `MANIFEST.json`, `runs/<stamp>/`.

## Regenerate

```bash
node scripts/gen-homework-ingest-fixtures.mjs
node scripts/render-homework-ingest-pngs.mjs
```

## Live eval

```bash
npm run eval:homework
# or
node scripts/eval-homework-ingest.mjs
```

Requires `.env` Supabase URL/anon, personas in `~/.kelyra/ui-personas.json` (teacher). Prefer `EXPO_PUBLIC_AI_DEV_URL` for evaluate-homework; classify-capture hits Edge when ai-dev is down.

Synthetic names only — no real people.
