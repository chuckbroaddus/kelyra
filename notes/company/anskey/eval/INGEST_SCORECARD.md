# Answer-key ingest scorecard

**Baseline:** `notes/qa-fixtures/anskey-ingest/runs/202610011118`  
**Round 1:** `notes/qa-fixtures/anskey-ingest/runs/202610011122`  
**Corpus:** 20 cases (K01–K17 keys + N01–N03 negatives)  
**Runtime:** local `ai:dev` `analyze-answer-key` (no dedicated Edge fn)

## Verdict

| Metric | Baseline | Round 1 |
|--------|---------:|--------:|
| overall | 82.1% | **95.7%** |
| answer_key | 86.4% | **94.9%** |
| negatives | 60.0% | **100%** |
| hallucinations | 2 | **0** |

Field totals r1: correct majority · hallucinated **0** · negatives all handled.

## What changed (round 1)

1. **Prompt** — classify non-keys first (`reject`); filled keys EXTRACT printed/bubbled answers (do not re-solve); partial keys never invent missing items; MC letter guidance.
2. **Post-filter** in `analyzeAnswerKey` — honor `reject` → empty items; promote `pageState` blank→filled when header looks like a key and answers present; light MC letter normalize.
3. **Eval** — field accuracy, item match, hallucination, negative handling; `npm run eval:anskey`.

## Remaining gaps

- Bubble sheets (K03/K11) still occasional letter swaps under photo noise (~78–87%).
- K01 photo item misreads remain intermittent.
- No production Edge Function yet — product path is local `ai:dev` / future edge parity.
- UI harness: assignment key photo review still camera/file limited on web; API field accuracy is SoT.

## Round 2 — rough phone-photo + handwritten corpus (38 cases)

**Run:** `notes/qa-fixtures/anskey-ingest/runs/202610011217` (full corpus) · stability re-run of new cases: `runs/202610011217-r2new`
**Runtime:** worktree `ai:dev` on :8803 (origin/main `b46d73a`, prompts/server unchanged)

> **⚠ Stale — rerun needed.** These 202610011217 numbers (and `-r2new`) were measured **before #340**, which switched
> `analyze-answer-key` to `detail: 'high'` and added new prompt rules. That change targets failure patterns 1–2 below
> (prompt-example leakage, low-detail misreads), so treat the rough and handwritten figures as a pre-#340 baseline only. No live rerun yet:
> dev Gemini quota was exhausted until ~2 AM CT on 2026-10-02. Rerun:
>
> ```bash
> # terminal 1 (worktree ../kelyra-wt-anskey-rough)
> AI_DEV_PORT=8803 npm run ai:dev
> # terminal 2: full corpus, fresh stamp
> ANSKEY_AI_URL=http://127.0.0.1:8803 npm run eval:anskey
> # if it stops on quota/429, resume the same stamp (finished cases are cached):
> EVAL_RESUME_STAMP=<stamp printed as "run <stamp>"> ANSKEY_AI_URL=http://127.0.0.1:8803 node scripts/eval-anskey-ingest.mjs
> ```
**New cases:** 12 rough photo (K18–K29) + 6 handwritten (K30–K35, 4 of them also rough). Recipes: `scripts/lib/anskey-rough-cases.mjs`; degradation: `scripts/degrade-anskey-fixtures.mjs` (seeded, sharp only).

Item-level = per expected item: correct answer, honest abstain where allowed, or the item missing. Field = mean per-doc accuracy over pageState/header/maxScore/items/points. Field accuracy runs high on rough cases because header/maxScore/present rows still pass, so **item accuracy is the number to watch**.

| Category | Docs | Field acc | Item acc | Halluc |
|---|---:|---:|---:|---:|
| **overall** | 53 | 92.0% | — | 6 |
| clean (K01–K17 clean + mild photo) | 26 | 95.4% | 88.2% (105/119) | 0 |
| ↳ mild photo only | 9 | 96.7% | 90.0% | 0 |
| **rough photo (K18–K29)** | 12 | **79.7%** | **49.4% (81/164)** | 5 |
| handwritten (all) | 10 | 94.0% | 90.5% (76/84) | 1 |
| ↳ handwritten clean | 6 | 93.6% | 90.0% | 0 |
| ↳ handwritten rough | 4 | 94.6% | 91.2% | 1 |
| negatives | 5 | 100% (5/5 rejected) | — | 0 |

Re-run (new cases only): rough 79.0% field / 48.2% items / 7 halluc. Handwritten 96.9% / 96.4% / 1. Rough is stable-bad. Handwritten is good: K31 swings 1/6 → 6/6 between runs.

**Worst 5 (run 1):** K18 bubble 20Q perspective+motion (0/20) · K19 bubble rotated −16° low light (0/15) · K29 bubble 24Q keystone+crumple (4/24) · K22 numeric low light (3/12) · K27 key on student paper (2/8). Next: K28 bubble glare (4/12), K31 handwritten margin points (1/6 in r1 only).

### Failure patterns

1. **Prompt-example leakage on unreadable photos (most severe).** K18/K19/K22 return invented arithmetic rows: `"12 + 9 =" → "21"`, `"7 + 8 =" → "15"`. Those strings come straight from `analyzeKeyPrompt`'s JSON example and STEM HYGIENE line. The header and maxScore come back right, so the output *looks* valid. The scorer counts these as `wrong` rather than `hallucinated`, so the hallucination total **undercounts** this.
2. **Low-detail image.** `analyzeAnswerKey` sends `imageDetailFor('cheap')` = `detail: 'low'` with no look-again pass. On full-page phone photos, bubbles and small digits fall below what the model can resolve. This is the likely root cause of (1) and of the bubble letter scrambles (K28/K29: neighbor-letter swaps on most rows).
3. **Re-solving misread stems.** K22/K27 read the stems wrong (`3/8 of 24`, `0.8 × 5`) and then *computed* answers instead of copying the bold printed ones, even though pageState=filled.
4. **Guessing through glare.** K20 Q14–15 and K28 Q7–8 are blown out, but the model emits a letter instead of needsTeacher (4 of 5 rough hallucinations in run 1).
5. **Row shift after occlusion or rotation.** K25 run 2: sticky-note text was taken as word 6's answer, then every later answer moved up one row. Rotated pages (K22/K27, answers ~1 row off the stem line) do the same.
6. **Rubric notes copied as answers.** K21 "see rubric", K34 "see rubric – 2 pts each cause" come back as answer text with needsTeacher=false. Auto-grading would then compare students to "see rubric".
7. **Handwriting:** mostly solid. Misses: Marker Felt "magma"/"humus" → "megapascals"/"9 yrs" under low light, and K31 r1 swapped stems with answers, using the item numbers as answers.

### Suggested fixes (not applied — out of scope for this corpus PR)

- analyze-answer-key: use `detail: 'high'` (or a look-again pass) when the image is a photo, is large, or the first pass has low confidence / bubble layout. This is the cheapest big win.
- Replace the concrete prompt example values with placeholders (`"<stem>"`, `"<answer>"`). Add a post-filter that drops items whose stem/answer exactly match prompt example strings.
- Rule: if an answer region is washed out or covered, emit needsTeacher with an empty answer and never guess. Treat sticky notes and other overlays as non-answers. Keep rows aligned to the printed item numbers.
- Rule: "see rubric" / "teacher judgment" → needsTeacher=true, answer "", text moved to note.
- Bubble sheets: deskew/crop before the model call, or a dedicated bubble pass that reads row by row.
- Eval: flag `prompt_leak` and fabricated stems as hallucinations. Tighten `answersMatch`: substring matching accepts "8" for "18".

## UI proof @ 375px

| Shot | Path | Notes |
|------|------|-------|
| assignment form | `runs/202610011122/ui-proof/assignment-new-375-web-390.png` | teacher new assignment (key attach lives here) |
| capture | `runs/202610011122/ui-proof/capture-start-375-web-390.png` | teacher capture (answer_key intent path) |
| class works | `runs/202610011122/ui-proof/class-works-375-web-390.png` | class landing |

Copies: `/tmp/anskey-ingest-eval/202610011122/`. PNG mean-luminance non-blank check OK. Full fixture→review still camera/file limited on web; **API field accuracy is SoT**.

## Rerun

```bash
# terminal 1
AI_DEV_PORT=8791 npm run ai:dev
# terminal 2
ANSKEY_AI_URL=http://127.0.0.1:8791 npm run eval:anskey
```

## UI proof @375 px (real, 2026-10-01): replaces the blank-form / capture shots above

Harness: `scripts/ingest-ui-proof.mjs` (CDP on QA Chrome :9223, one tab, closed after). Worktree Expo web on **:8121**
with a **private Metro cache** (local uncommitted `metro.config.js` FileStore + private `TMPDIR`, `--clear`); the served
bundle was checked to resolve `src/app/*` from this worktree. `EXPO_PUBLIC_AI_DEV_URL` → worktree ai-dev :8798.
Sign-in: splash form with the persona from `~/.kelyra/ui-personas.json` (persona inject CORS only allows :8081), and the
harness waits out "Finishing sign-in…" before driving. Fixture files go in through the real picker
(`Page.setInterceptFileChooserDialog` + `DOM.setFileInputFiles`): no camera, no OS dialog. Viewport 375×812 @2x.
Every PNG was opened and checked by eye. The earlier Hermes shots (Capture "Finishing sign-in…", blank New Assignment form, none
for homework) are in `/tmp/<slug>-ingest-eval/invalid-old/` and are **not** proof.

Path: **teacher** → `/class/d1715000-…0301/assignment/new` → Answer key **Photo** → *Take photo* → *Choose from library*
(fixture) → `analyze-answer-key` → key review (stem / Answer / Points per item). Nothing was saved (no *Assign* tap).

| Case | Shot (`notes/qa-fixtures/anskey-ingest/ui-proof-2026-10-01/`, copy in `/tmp/anskey-ingest-eval/`) | What it shows |
|------|------|------|
| K01 clean MC | `K01-clean-review-375.png` | "Read from your key — edit if needed." 1. "Which is a linear function?" → **B**; 2. "Slope of y=2x+1 is" → **2** (matches GT) |
| K03 bubble photo | `K03-photo-review-375.png` | Filled key read: 1 → **B** (GT B); 2 → **B** (GT **A**, a bubble swap). Stems shown as "12 + 9 =" are **invented** (the bubble sheet prints only numbers). This is the known K03 weakness |
| K05 handwritten | `K05-handwritten-review-375.png` | 1 → **16**, 2 → **5** (answers match GT 9+7, 20÷4). Stems misread as "9-7 =", "20-4 =" (operator OCR) |
| N01 negative | `N01-negative-review-375.png` | No items; red "Not an answer key. Graded student packet." under the form |

### Remaining gaps (updated)

- Bubble-sheet stems: the model writes a stem when the sheet has only item numbers (K03 UI). It should leave the stem as the item number. Answers still swap under photo noise.
- Handwritten operators (+ → -, ÷ → -) are misread in stems. Answers are unaffected.
- `analyze-answer-key` is ai-dev only (no Edge Function).
