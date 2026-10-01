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
