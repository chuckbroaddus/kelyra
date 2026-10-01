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
- **Field status (rough corpus)** — `studentName` / `draftScore` may carry `status: "absent"` (cropped, glared out, erased: value is `null`, any value is a hallucination) or `status: "uncertain"` (degraded but partly legible: `null` OR the true value passes; `accept: [...]` lists tolerated readings, e.g. a faint ghost of the first letters). Wrong non-null values still fail.
- **Buckets** — `score.json.buckets`: `clean` (clean.png, typed), `photo_mild` (old photo.jpg), `rough` (rough.jpg), `handwritten` (all `hand` cases), `handwritten_new` (H30+ / H24), `negatives`. `multi_student_detected` is a diagnostic (classify `names` >1), not in field accuracy.

## Layout

Each case folder (`H01`…, `N01`…):

- `source.html` — printable page
- `clean.png` — rendered
- `photo.jpg` — phone-like (when flagged; mild: sips re-encode / light skew)
- `rough.jpg` — hard phone capture from `scripts/degrade-homework-fixtures.mjs` (rough cases only; eval sends ONLY this variant, expected.json describes it)
- `expected.json` — ground truth
- `eval-meta.json` — scorer hints
- `notes.md` — what the case exercises

Root: `MANIFEST.json`, `runs/<stamp>/`.

## Rough phone-photo + handwritten cases (H18–H34)

Defined in `scripts/lib/homework-rough-cases.mjs` (HTML + recipe + honest ground truth). `MANIFEST.json` cases carry `rough: true|false`, `hand`, and `effects: [...]`; each rough case's `eval-meta.json` holds the full seeded recipe under `rough`.

| ID | Rough | Hand | Effects | What it exercises |
|----|:----:|:----:|---------|-------------------|
| H18 | ✓ | | perspective, glare, clutter | strong keystone; glare washes Q2 answer → score `uncertain` |
| H19 | ✓ | | rotation 14°, motion blur, low light/noise/JPEG q38 | dim shaky capture, triangle-area gap |
| H20 | ✓ | | faint pencil, eraser smudge, defocus, hand shadow | **name erased → `absent`** |
| H21 | ✓ | | crop-top, rotation, clutter | **name line out of frame → `absent`** |
| H22 | ✓ | | crumpled creases, low light, crop-bottom (landscape) | Q5 cut off → score on visible Q1–Q4, `uncertain` |
| H23 | ✓ | | two papers overlap, perspective, hand shadow | **Taylor Kim on top + Jordan Chen sheet under** → multiStudent |
| H24 | ✓ | ✓ | curled notebook page, perspective, shadow | fully handwritten algebra, distributive slip |
| H25 | ✓ | | folded quarters, glare, double JPEG | ELA commas, glare on Q4 |
| H26 | ✓ | | heavy defocus, noise | name/answers soft → `uncertain` |
| H27 | ✓ | | flash glare on name, vignette, perspective | **name blown out → null (faint "Tay" ghost tolerated)** |
| H28 | ✓ | | rotation −18°, low light, pen doodles/blot, cross-out | spelling corrections 4/6 |
| H29 | ✓ | | eraser smudges, faint pencil, perspective, side shadow | erased ghost answer under final Q4 |
| H30 | | ✓ | handwritten, cross-out, margin answer + arrow | Q4 answer lives in the left margin |
| H31 | | ✓ | handwritten, heavy slant | Chalkboard SE right-slanted science |
| H32 | ✓ | ✓ | handwritten, rotation 11°, low light | big wobbly kid writing, abbreviated "Taylor K." |
| H33 | | ✓ | handwritten, cross-out, abbreviated name | "Jamie O.", wrong Q4 |
| H34 | ✓ | ✓ | handwritten, crumpled, glare streak, perspective | inches→feet error |

Handwriting = macOS handwriting-like system fonts (Noteworthy, Bradley Hand, Chalkboard SE, Marker Felt, Comic Sans MS) with seeded per-glyph rotate/raise/scale jitter, per-line baseline drift + slant, CSS cross-outs, SVG arrows, margin answers on ruled notebook paper. Fonts are resolved by Chromium at render time (macOS); other OSes fall back to `cursive`.

The degrader (`scripts/degrade-homework-fixtures.mjs`) uses `sharp` (already in `node_modules`, transitive — no new package.json dep) + plain JS: homography placement (rotation/keystone/crop by pushing corners off-frame), page curl, crumple displacement + slope shading, fold ridges, creases, eraser smears, pen marks, desk textures + clutter (pencil, calculator, mug, sticky, ruler, eraser, clip), drop shadows, hand/phone shadow, light gradient/vignette, low-light colour cast, glare hotspots anchored in paper coords, motion/defocus blur, sensor noise, (double) JPEG. Every recipe has a `seed`; same recipe → same pixels.

## Regenerate

```bash
node scripts/gen-homework-ingest-fixtures.mjs
node scripts/render-homework-ingest-pngs.mjs
node scripts/degrade-homework-fixtures.mjs        # rough.jpg for rough cases (or pass IDs)
```

Note: `render-homework-ingest-pngs.mjs` re-encodes the old mild `photo.jpg` files via `sips` (bytes differ run to run); `git checkout -- '*/photo.jpg'` if you didn't mean to change them.

## Live eval

```bash
npm run eval:homework
# or
node scripts/eval-homework-ingest.mjs
```

Requires `.env` Supabase URL/anon, personas in `~/.kelyra/ui-personas.json` (teacher). Prefer `EXPO_PUBLIC_AI_DEV_URL` for evaluate-homework; classify-capture hits Edge when ai-dev is down.

Synthetic names only — no real people.
