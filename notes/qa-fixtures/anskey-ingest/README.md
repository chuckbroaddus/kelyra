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

## Rough phone-photo + handwritten cases (K18–K35)

Defined in `scripts/lib/anskey-rough-cases.mjs` (appended to the generator's `CASES`).

| Flag (MANIFEST / eval-meta) | Meaning |
|---|---|
| `rough: true`, `effects: [...]` | case has `rough.jpg` from `scripts/degrade-anskey-fixtures.mjs` (seeded; recipe in `eval-meta.json` `rough_recipe`) |
| `handwritten: true`, `hand`, `hand_features` | teacher-handwritten key (system handwriting fonts + per-glyph jitter, circles, cross-outs, margin notes) |
| `eval_variants` | which images the eval scores: rough-only printed cases → `["rough"]`; handwritten+rough → `["clean","rough"]` |
| `expected.clean.json` | fuller truth for the clean variant when the rough photo hides items (K33) |

| ID | Kind | Effects / features |
|---|---|---|
| K18 | bubble 20Q A–E | strong perspective, motion blur, noise, JPEG |
| K19 | bubble 15Q | −16° rotation on desk, low light warm cast, heavy JPEG |
| K20 | printed 2-col MC 20Q | glare hotspot blows out Q14–15 (needsTeacher), perspective |
| K21 | printed short answer | hand+phone shadow over answers, 6° rotation, noise; Q8 rubric needsTeacher |
| K22 | printed numeric | very low light, heavy noise, JPEG q26, blur |
| K23 | printed vocab | folded in quarters + crumpled (creases through rows), −9° rotation |
| K24 | printed 15Q | framing crop: Q13 sliced (optional), Q14–15 out of frame (inventing = hallucination) |
| K25 | printed spelling | cluttered desk, sticky note hides words 6–7 (needsTeacher), perspective |
| K26 | printed chem | highlighter over answers, red-pen checks/circle/"or eight" note, scribble over Q8, blur |
| K27 | printed exit ticket | key lying on a graded student paper (student answers 7–12 visible), rotation, shadow |
| K28 | bubble 12Q | glare blows out Q7–8 bubbles, red-pen scrawl, JPEG |
| K29 | bubble 24Q 3-col | steep keystone perspective, crumple + creases, low light |
| K30 | handwritten (Bradley Hand) | circled MC letters, Q4 cross-out → D, margin note; clean |
| K31 | handwritten (Noteworthy) | red point values in margin, circled total, Q3 cross-out → 18, partial-credit notes; clean |
| K32 | handwritten (Marker Felt) | T/F + words; rough: 14° rotation, hand shadow, low light |
| K33 | handwritten (Bradley Hand, slanted) | Spanish vocab; rough: perspective + glare hides Q4 |
| K34 | red pen on printed worksheet | Q3 cross-out → Madison, Q4 "see rubric" needsTeacher; rough: crumple, low light, 8° |
| K35 | handwritten (Chalkboard SE) | 2-col quick key, Q5 cross-out → C; rough: desk clutter, −11°, motion blur |

### Ground-truth honesty rules (item-level fields)

- Obscured in the photo (glare/occlusion): `answer: ""`, `needsTeacher: true`, `legibility` set → any answer = **hallucinated**; flagging or omitting = correct.
- Borderline (glare edge, scribbled over): real answer + `accept_absent: true` → correct answer or abstain both score correct; a different answer = wrong.
- Cut at the crop edge: `optional: true` (omitting is fine). Fully out of frame: not listed + `no_hallucinate_extra_items`.
- Every rough image was opened and checked against its `expected.json`.

`_underlay_student/` is a render-only asset (student paper under K27), not an eval case.

Eval breakdown in `score.json` → `by_category` (`clean`, `rough`, `handwritten`, `negative`, plus `clean_photo`, `handwritten_clean`, `handwritten_rough`). `EVAL_ANSKEY_ONLY=K20,K28` scores a subset.

## Commands

```bash
node scripts/gen-anskey-ingest-fixtures.mjs
node scripts/render-anskey-ingest-pngs.mjs
node scripts/degrade-anskey-fixtures.mjs   # rough.jpg for rough cases (sharp only, seeded)
npm run eval:anskey
# or: node scripts/eval-anskey-ingest.mjs
```

Requires local `npm run ai:dev` (analyze-answer-key), `.env` Supabase URL/anon, teacher persona in `~/.kelyra/ui-personas.json`. Never print secrets.

Do not modify gradebook-ingest eval or fixtures.
