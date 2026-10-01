# Assign + lesson materials ingest fixture corpus

Reusable evaluation set for worksheet/quiz/test answer-key extract, lesson plan/materials classify, and lesson-pack draft paths.

## Area inventory (code map)

### Capture intents (client + edge)

| Intent | Client | Edge / AI route | Outcome today |
|--------|--------|-----------------|---------------|
| `answer_key` | `src/app/capture.tsx` attach key | `analyze-answer-key` (ai:dev) | Key items → assignment `key_*` |
| `lesson_plan` | capture hold confirm | `classify-capture` | Recognized; surface hold |
| `lesson_materials` | capture hold confirm | `classify-capture` | Recognized; surface hold |
| homework (student work) | capture / proposal | `analyze-homework`, `evaluate-homework` | Out of scope (sibling HW) |

### Assignment key extract

- Prompt + parse: `scripts/ai-dev-server.mjs` (`analyzeKeyPrompt`, `analyzeAnswerKey`, `parseKeyItemsFromModel`)
- Client invoke: `src/lib/ai/invoke.ts` → local ai:dev or edge name
- Capture attach: `src/app/capture.tsx` `saveAnswerKeyConfirm`
- Assignment editor: `src/app/class/[id]/assignment/[assignmentId].tsx`
- Ask tools: `scan_answer_key` / `create_assignment` in `src/lib/ai/askTools.ts`
- Types: `src/lib/assignments/keys.ts` (`AnswerKeyItem`, `normalizeKeyItems`)
- Score against key (not extract): `src/lib/assignments/scoreKey.ts`, `src/lib/keygrade/*`

### Lesson pack

- Edge: `supabase/functions/ingest-lesson-pack/index.ts` (FoM 1.2 author-test stamp; draft only)
- Client: `src/lib/lessons/ingestLessonPack.ts`
- Publish separate: `publish-lesson-pack`

### Classify

- Edge: `supabase/functions/classify-capture/index.ts`
- Local mirror: `scripts/ai-dev-server.mjs` `classifyCapture`
- Seat jobs: `src/lib/capture/seatJobs.ts`

## Target data model (eval ground truth)

### Assignment / key proposal (`kind: assignment_key`)

```json
{
  "source_id": "A01",
  "kind": "assignment_key",
  "pageState": "blank|filled|unsure",
  "header": "printed title or null",
  "category": "homework|quiz|test|project|other|null",
  "maxScore": 10,
  "due": "YYYY-MM-DD or null",
  "standards": ["TEKS.6.3A"] ,
  "items": [
    {"n":1,"stem":"...","answer":"...","points":1,"type":"mc|numeric|short|work","needsTeacher":false,"choices":["A","B"]}
  ],
  "sections": [{"id":"A","title":"Part A","itemNs":[1,2]}],
  "teacherNote": null,
  "reject": false,
  "document_kind_guess": "worksheet|quiz|test|answer_key|lesson_plan|lesson_materials|mixed|unknown"
}
```

Maps to live: `assignments.title/header`, `key_items`, `key_kind`, `max_score`, `category`, `due_at`, `key_notes`.

### Lesson classify (`kind: lesson_plan` | `lesson_materials`)

```json
{
  "source_id": "L01",
  "kind": "lesson_plan",
  "intent": "lesson_plan",
  "header": "Unit 3 Day 2 — Fractions",
  "reject": false
}
```

### Negatives (`kind: negative`)

Wrong doc type (roster, syllabus policy, vehicle, student work only). Must not produce a confident assignment key with invented items; classify must not claim `answer_key` as sole path without reject/flag.

## Layout

Each case folder (`A01`…, `L01`…, `N01`…):

- `source.html` — printable source
- `clean.png` / `photo.jpg` — rendered
- `expected.json` — ground truth
- `eval-meta.json` — scorer hints
- `notes.md` — what the case exercises

Root: `MANIFEST.json`, `runs/<stamp>/`.

## Commands

```bash
node scripts/gen-assign-ingest-fixtures.mjs
node scripts/render-assign-ingest-pngs.mjs
npm run eval:assign
# or: node scripts/eval-assign-ingest.mjs
```

Requires ai:dev (`npm run ai:dev`), personas in `~/.kelyra/ui-personas.json`, and checkout `.env` (never print secrets).

## Add a case

1. Append in `scripts/gen-assign-ingest-fixtures.mjs`
2. Re-run generator + render
3. Re-run eval; diff `runs/` score.json
