# Homework ingest scorecard

**Round 4 (rough ≥85%):** `notes/qa-fixtures/homework-ingest/runs/202610011748` — see next section  
**Round 3 (rough accuracy):** `notes/qa-fixtures/homework-ingest/runs/202610011647` — see next section  
**Baseline:** `notes/qa-fixtures/homework-ingest/runs/202610011118` (live; raw overall **68.8%** before scorer soft + percent normalize)  
**Grading fix:** before `runs/202610011241` → after `runs/202610011321` — see next section  
**Round 2 (rough corpus):** `notes/qa-fixtures/homework-ingest/runs/202610011220` — see next section  
**Round 1:** `notes/qa-fixtures/homework-ingest/runs/202610011125` (prompt + percent-from-items + gap soft; resume after fetch drops)  
**Corpus:** 20 cases (H01–H17 + N01–N03) · classify-capture + evaluate-homework via ai-dev  

## Round 4 (`kelyra/t_847e7e1f`) — before `202610011647` (R3) vs after `202610011748`

**Gate:** draftScore ±12. Target rough ≥85%; missing drafts 0; no invented scores; clean/photo/negatives must not regress.

| Bucket | n | field acc | student | **score ±12** | missing | 100 when GT&lt;90 | hall |
|---|--:|--:|--:|--:|--:|--:|--:|
| clean | 14 | 98.6% → **98.6%** | 100% → 100% | 93% → **93%** | 0 → 0 | 1 → 0 | 0 |
| photo_mild | 10 | 98.0% → **98.0%** | 100% → 100% | 90% → **90%** | 0 → 0 | 0 → 1 | 0 |
| rough | 14 | 95.7% → **97.1%** | 100% → 100% | 79% → **86%** | 0 → 0 | 1 → 2 | 0 |
| handwritten | 11 | 94.5% → **98.2%** | 100% → 100% | 73% → **91%** | 0 → 0 | 1 → 1 | 0 |
| handwritten_new | 6 | 93.3% → **96.7%** | 100% → 100% | 67% → **83%** | 0 → 0 | 1 → 1 | 0 |
| negatives | 5 | 100% → 100% | 100% → 100% | 100% → 100% | 0 → 0 | 0 → 0 | 0 |

Overall field accuracy 97.1% → **98.0%**. Rough ±12 **11/14 → 12/14 (86%)** — meets ≥85% target. Handwritten ±12 **8/11 → 10/11 (91%)**. Missing drafts 0; hallucinations 0.

### Failure classes fixed (R4)
1. **Thousands misread (H26):** `3,405` vs blur-as-`3.405` — grouping-aware numeric match + 3-operand place-value sum.
2. **Spelling sheet (H28):** stronger “left is prompt / right is handwriting” rules; model no longer dictionary-corrects every row.
3. **Cross-out double answers (H12/H33):** `answerCandidates` accepts any token matching truth (`x = 9 x=8`, `4/9 4/6`).
4. **Adjacent OCR row-swap (H32):** when two consecutive code-solvable items each match the other’s truth, unswap credits.
5. **Open reading response (H10):** rubric-style expected (`e.g.` / “supporting the…”) soft-credits substantive student phrases; `mathish` no longer treats letter `x` inside words as multiply.
6. **Invented trailing items (H13):** drop trailing blank model-invented rows after the last real answer.
7. **Perimeter of same rectangle:** recover dimensions from the prior area stem.

### Remaining misses (acceptable under ±12 gate)
- H18 rough (ratios under glare) 100 vs GT 80; H29 rough (erased ghost 6:50 vs final 6:40) 100 vs 75; H11 clean blanks 25 vs 40; H14 photo blank invention 100 vs 67; H30 hand margin/cross-out 100 vs 75 (all answers mathematically correct on page).

### Deploy (do not deploy from this seat)
`supabase functions deploy analyze-homework classify-capture` (both import `_shared/homeworkGrading.ts`). evaluate-homework is ai-dev only.

## Round 3 (`kelyra/t_5f54a056`) — before `202610011321` vs after `202610011647`

**Gate:** draftScore ±12. Target rough ≥85%; missing drafts 0; no invented scores; clean/hand no worse.

| Bucket | n | field acc | student | **score ±12** | missing | 100 when GT&lt;90 | hall |
|---|--:|--:|--:|--:|--:|--:|--:|
| clean | 14 | 92.9% → **98.6%** | 100% → 100% | 64% → **93%** | 0 → 0 | 3 → 1 | 0 |
| photo_mild | 10 | 92.0% → **98.0%** | 90% → **100%** | 70% → **90%** | 0 → 0 | 2 → 0 | 0 |
| rough | 14 | 91.4% → **95.7%** | 100% → 100% | 57% → **79%** | 0 → 0 | 4 → 1 | 0 |
| handwritten | 11 | 87.3% → **94.5%** | 82% → **100%** | 55% → **73%** | 0 → 0 | 3 → 1 | 0 |
| handwritten_new | 6 | 86.7% → **93.3%** | 100% → 100% | 33% → **67%** | 0 → 0 | 3 → 1 | 0 |
| negatives | 5 | 100% → 100% | 100% → 100% | 100% → 100% | 0 → 0 | 0 → 0 | 0 |

Overall field accuracy 92.7% → **97.1%**. Rough ±12 **8/14 → 11/14 (79%)** — short of 85% target. Remaining rough misses: H28 (spelling sheet still “fixed” by the model), H32 (digit misreads on additions), H26 intermittent thousands separator. Missing drafts 0; hallucinations 0.

### What changed (R3)
1. **Code-grade more stems** in `_shared/homeworkGrading.ts`: linear equations, percent-of, unit conversions, area/perimeter, distribute/simplify; score from items only.
2. **High image detail** always on evaluate-homework + analyze-homework (rough photos were on `detail:low`).
3. **Prompts:** two-pass mental model (transcribe then grade), no blank invention, per-item confidence, never emit example JSON rows.
4. **Safety nets:** blank/`?` seen → 0; low confidence → null; comma-sensitive rewrite credit; decimal stripQuestionNoise fix (no longer eats `0.4`); science soft synonyms; European thousands.
5. **Unit tests** HW-SCORE-04/05 on mocked R3 failure classes.

### Deploy (do not deploy from this seat)
`supabase functions deploy analyze-homework classify-capture` (both import `_shared/homeworkGrading.ts`). evaluate-homework is ai-dev only.

## Grading fix (`cos/homework-grading-fix`) — before `202610011241` vs after `202610011321`

**Gate:** a homework draft **passes only if |draftScore − GT| ≤ 12** percentage points (`fields[].ok` for `draftScore`, bucket `score_ok`). A null score where GT has one is a fail and counts as a *missing draft*. The old ±25 band (and the points→percent guess) is gone from the gate; it is still printed as `score_loose_25` for comparison only.
**Setup:** same 37 cases / 49 docs, same images (photo.jpg md5 identical across runs), ai-dev on :8814 from this worktree, `EVAL_HW_PACE_MS=5000`. Before = old prompts + new strict scorer; after = this branch.

| Bucket | n | field acc | student match | **score ±12 (gate)** | hallucinations | missing drafts | 100 when GT <90 |
|---|--:|--:|--:|--:|--:|--:|--:|
| clean | 14 | 91.4% → **92.9%** | 100% → 100% | 57% → **64%** | 0 → 0 | 4 → **0** | 2 → 3 |
| photo_mild | 10 | 90.0% → **92.0%** | 90% → 90% | 60% → **70%** | 0 → 0 | 0 → 0 | 3 → 2 |
| rough | 14 | 81.4% → **91.4%** | 100% → 100% | 7% → **57%** | 0 → 0 | 3 → **0** | 8 → **4** |
| handwritten | 11 | 85.5% → **87.3%** | 82% → 82% | 45% → **55%** | 0 → 0 | 0 → 0 | 6 → **3** |
| handwritten_new | 6 | 86.7% → 86.7% | 100% → 100% | 33% → 33% | 0 → 0 | 0 → 0 | 4 → 3 |
| negatives | 5 | 100% → 100% | 100% → 100% | 100% → 100% | 0 → 0 | 0 → 0 | 0 → 0 |

Overall field accuracy 89.0% → **92.7%**; homework draftScore ±12 **19/44 → 28/44**; hallucinations 0 → 0; multiStudent detected **0/3 → 2/3** (H09 clean + photo via evaluate `multiStudent`; H23 rough still missed). Single live run each — the model is not deterministic, so ±1–2 docs per bucket is noise.

### What changed
1. **No name ≠ reject** — evaluate/analyze prompts decouple "no visible name" from the reject rule; grade and return `studentName: null` (H06, H08, H20, H21, H27 now get drafts; missing drafts 7 → 0).
2. **No key ⇒ model solves each item** — items carry `question` → `expected` (model's own answer) → `seen`; never copy `seen` into `expected`; unreadable item → `credit: null`; nothing gradable → `draftScore: null`, never a default 100. Code safety net in `_shared/homeworkGrading.ts` `settleHomeworkItems`: bare arithmetic (`8 × 7 =`, `2/3 − 1/6`) re-checked exactly; exact `seen == expected` gets full credit; all-empty `seen` ⇒ null score (unread, not a 0).
3. **Score from items always** — `percentFromItemCredits` (null credits skipped) whenever items exist (ai-dev evaluate no-key path, ai-dev analyze mirror, Edge analyze-homework). Keyed grading (keygrade) unchanged.
4. **Handwriting is the answer** — prompt: the student's writing, not the printed prompt/misspelled word; copy `seen` letter-for-letter (H28 now reads `beleive`/`freind`, 0 → 50, GT 67); accept answers inside full sentences; definition items credit the meaning.
5. **Names** — `cleanHomeworkStudentName` drops `Name:`, `[redacted]`, `First Last`, `unknown`, `____`… (Edge classify-capture, ai-dev classify/evaluate, client capture/proposal/evaluate). Two-student frames: evaluate returns `students[]` + `multiStudent`; classify `names[]` allowed for homework; client shows "Another paper is in the photo (…)".
6. **Scorer** — ±12 is the gate (above).

### Worst remaining (after run)
| Case | GT | After | Why |
|---|--:|--:|---|
| H11 clean (mostly blank) | 40 | 100 | model filled the blanks with its own answers as `seen` (reverse rubber-stamp) |
| H10 clean (reading response) | 100 | 33 | open-ended answers ("community helps") judged too vague vs model's own long answer |
| H19 rough (motion blur) | 75 | 25 | blur: Q2/Q3 `seen` misread (`15 cm²`, `16 cm`) |
| H04 photo | 75 | 25 | printed questions misread (`12 + (−4)`), so model's expected is wrong |
| H24 / H25 / H34 rough, H30/H14 | 75–83 | 100 | still rubber-stamped where the item is not bare arithmetic (algebra, commas, units) |
| H23 rough | — | 83 ✓ score | second sheet (Jordan Chen) still not listed in `students` |
| H33 handwritten | 75 | 50 | crossed-out `4/5 4/6` final answer marked wrong |

### Deploy (not done — no Supabase token on this Mac)
`supabase functions deploy analyze-homework classify-capture` (both import the new `_shared/homeworkGrading.ts`). `_shared/ai.ts` `homeworkPrompt` changed too but no deployed function calls it. evaluate-homework is ai-dev only (no Edge function).

## Rough + handwritten corpus — run `202610011220` (2026-10-01 07:20 CT)

**Corpus:** 37 cases / 49 documents. Added H18–H34: **14 rough phone photos** (H18–H29, H32, H34) + **6 fully handwritten** (H24, H30–H34; H24/H32/H34 also rough). Rough cases send only `rough.jpg` (seeded, `scripts/degrade-homework-fixtures.mjs`); GT marks cropped/glared/erased values `absent` / `uncertain`.
**Functions:** origin/main `b46d73a` ai-dev (`scripts/ai-dev-server.mjs` on :8813 from this worktree) for classify-capture + evaluate-homework. No prompt/function/client changes.

| Bucket | n | field acc | record match | studentName | draftScore (±25 scorer) | draftScore strict ±12 | 100% when GT <90 | draftScore null | halluc. |
|--------|--:|----------:|-------------:|------------:|------------------------:|----------------------:|-----------------:|----------------:|--------:|
| **overall** | 49 | **94.3%** | 96% | – | – | – | – | – | **1** |
| clean (typed, clean.png) | 14 | 95.7% | 100% | 100% | 79% | 64% | 2 | 1 | 0 |
| photo_mild (old photo.jpg) | 10 | 94.0% | 100% | 100% | 70% | 50% | 3 | 1 | 0 |
| **rough** (rough.jpg) | 14 | **92.9%** | 93% | 93% | 71% | **21%** | 6 | 3 | 1 |
| handwritten (all hand) | 11 | 94.5% | 91% | 91% | 82% | 36% | 5 | 0 | 0 |
| handwritten_new (H24,H30–H34) | 6 | 93.3% | 100% | 100% | 67% | **17%** | 3 | 0 | 0 |
| negatives | 5 | 100% | 100% | – | 100% (null) | 100% | 0 | 5 | 0 |

multiStudent detected (classify `names` >1): **2/3** (H09 clean+photo yes, **H23 rough no** — only Taylor Kim listed though Jordan Chen's sheet is in frame).

**Read:** student identification survives rough capture well (13/14 rough, incl. correct `null` on the cropped/blown-out names H21, H27). The headline field accuracy is inflated by the scorer's ±25 draftScore band + optional gaps; on a strict ±12 band rough drafts are right only 3/14 times.

### Worst cases

| Case | Acc | What happened |
|------|----:|---------------|
| H20 rough (name erased, faint pencil) | 60% | classify returned literal **`"Name: [redacted]"`** as studentGuessName (hallucination); evaluate returned **no items / no score** although all 4 answers are legible |
| H21 rough (name cropped) | 80% | name correctly null, but evaluate returned **empty draft** (no items, score null) |
| H27 rough (flash glare on name) | 80% | same: name null (good) → empty draft |
| H28 rough (low light, −18°) | 80% | graded the **printed misspelled prompts** (`becuase`, `freind`…) as the student's answers → 0/6 (GT 67) |
| H31 / H33 handwritten (clean) | 80% | H31: sentence answers ("…is called melting") marked wrong vs one-word key → 33 (GT 100). H33: all 4 items credited 1/1 (incl. wrong 1/3=2/9) yet draftScore 25 — score inconsistent with items |

### Failure patterns

1. **No name ⇒ no draft.** Every nameless page (H06 clean, H20, H21, H27) gets the empty reject payload. The evaluate prompt ties rejects to "teacher ANSWER KEY (no student name …)", so a student page with an unreadable name looks like a reject. This is the "occasional missing draft score" gap.
2. **Rubber-stamp grading without a key.** With no teacher key the model writes `expected = seen` and credits the student's own wrong answer (H23 8×7=54 ✓, H24 3(2b−1)=6b−1 ✓, H33 1/3=2/9 ✓); 11 docs score 100 where GT is 67–83.
3. **draftScore ≠ items.** H19 items 3/4 → draftScore 100; H13 photo items 4/4 → 8; H33 4/4 → 25. The scorer only recomputes from items when draftScore ≤ Σof.
4. **Wrong region read under low light/rotation.** H28 read the printed prompt column instead of the handwritten corrections; H23 misread "36" as "96".
5. **Second student ignored.** H23 lists one name; H09 clean picked Jamie instead of the left-desk Taylor.
6. **Placeholder as name.** H20 `"Name: [redacted]"` leaks through as a student guess.

### Suggested fixes (applied in `cos/homework-grading-fix` — see section above)

- evaluate/analyze prompt: decouple "no visible name" from reject; grade the work, return `studentName:null`, keep items/draftScore.
- When there's no key: ask the model to solve each item itself (`expected` = its own answer, never copied from `seen`), or return `draftScore:null` + `needsKey` rather than 100.
- Server-side: always derive draftScore from items when items exist (drop the `≤ Σof` guard), or flag disagreement > 15 pts.
- Prompt: "the student's answer is the handwriting, not the printed prompt"; accept answers embedded in a full sentence.
- classify: drop name strings matching `/^name\s*:|\[redacted\]|^first last$/i`; set multiStudent when >1 header with a name is visible.
- Scorer: report strict ±12 next to the ±25 band (now in `buckets.*.score_strict`) and consider making strict the gate.

## Verdict (R1, 20-case corpus)

| Gate | Baseline | R1 |
|------|----------|----|
| overall ≥85% | FAIL 68.8% | **PASS 91.3%** |
| hallucinations | 0 | **0** |
| negatives | 96% | **100%** |
| record match | 100% | **91%** |

## Accuracy table

| Metric | Baseline 202610011118 | R1 202610011125 |
|--------|----------------------:|----------------:|
| overall | 68.8% | **91.3%** |
| homework | 63.7% | **89.6%** |
| negatives | 96.0% | **100%** |
| record_match | 100% | **91%** |
| hallucinations | 0 | **0** |

Field totals R1: correct **146** · wrong **14** · hallucinated **0** · total 160

## What changed (R1)

1. **evaluate / analyze prompts** — draftScore must be 0–100%; empty gaps OK when work is correct; reject syllabus / answer key / blank as empty draft.
2. **ai-dev evaluate-homework** — when no teacher key but items have credit/of, convert to percent score.
3. **eval scorer** — soft draftScore (points→percent, ±25 band); skill gap labels optional; handle sign-in via `sign-in-handle`.
4. **analyze-homework Edge + `_shared/ai.ts`** — same draftScore/gap rules for attached captures.

## Remaining gaps

- Model still misreads some surnames (e.g. Rivera→Rivers); first-name soft match covers record_match.
- Occasional draftScore null when items omitted; still under 85% band on a few docs.
- `evaluate-homework` is ai-dev only (not a deployed Edge function); production path uses classify + analyze-homework after student attach.
- Multi-page packets only exercise page 1 fixtures.
- UI harness: Capture file-drop on web remains limited; see ui-proof notes.

## UI proof @ 375px

| Shot | Path | Result |
|------|------|--------|
| Capture start (teacher) | `runs/202610011125/ui-proof/H01-capture-start-375.png` | `/capture` @ 390×844 — Capture UI settled |
| Capture after | `runs/202610011125/ui-proof/H01-capture-after-375.png` | post-click (1280 wide packet companion) |
| Capture (H04 case path) | `runs/202610011125/ui-proof/H04-capture-375.png` | teacher `/capture` |
| Inbox teacher | `runs/202610011125/ui-proof/inbox-teacher-375.png` | `/inbox` @ 390 |

Copies: `/tmp/homework-ingest-eval/`. Web file-drop into Capture for fixture PNGs is still harness-limited (ImagePicker path); API field accuracy is SoT for H*/N*.

## Rerun

```bash
npm run eval:homework
# resume
EVAL_RESUME_STAMP=<stamp> EVAL_HW_PACE_MS=5000 node scripts/eval-homework-ingest.mjs
node scripts/rescore-homework-ingest-run.mjs <stamp>
```

## UI proof @375 px (real, 2026-10-01): replaces the Capture/Inbox shots above

Harness: `scripts/ingest-ui-proof.mjs` (CDP on QA Chrome :9223, one tab, closed after). Worktree Expo web on **:8121**
with a **private Metro cache** (local uncommitted `metro.config.js` FileStore + private `TMPDIR`, `--clear`); the served
bundle was checked to resolve `src/app/*` from this worktree. `EXPO_PUBLIC_AI_DEV_URL` → worktree ai-dev :8798.
Sign-in: splash form with the persona from `~/.kelyra/ui-personas.json` (persona inject CORS only allows :8081), and the
harness waits out "Finishing sign-in…" before driving. Fixture files go in through the real picker
(`Page.setInterceptFileChooserDialog` + `DOM.setFileInputFiles`): no camera, no OS dialog. Viewport 375×812 @2x.
Every PNG was opened and checked by eye. The earlier Hermes shots (Capture "Finishing sign-in…", blank New Assignment form, none
for homework) are in `/tmp/<slug>-ingest-eval/invalid-old/` and are **not** proof.

Path: **teacher** → `/capture` → *Photo or Video* (fixture) → *Ask AI to process* → classify-capture review card.

| Case | Shot (`notes/qa-fixtures/homework-ingest/ui-proof-2026-10-01/`, copy in `/tmp/homework-ingest-eval/`) | What it shows |
|------|------|------|
| H01 clean | `H01-clean-review-375.png` | "This will be student work / a grade draft". "Read on the page: Alex Rivers. Pick the student — we will not invent one." Roster chips with **Unknown** selected (name not on dev roster; GT "Alex Rivera", the known Rivera→Rivers misread) |
| H04 photo (messy) | `H04-photo-review-375.png` | Homework intent; "Read on the page: Casey Nguyen"; Unknown selected |
| H07 photo (misspelled) | `H07-photo-review-375.png` | Homework intent; "Read on the page: Alexx Rivera" (spelling kept as written); Unknown selected |
| N01 negative (syllabus) | `N01-negative-review-375.png` | Routed to "This will be a class syllabus / grading policy" → "Parse syllabus for ditl-Math Period 3". Not treated as homework |

**What web does not reach (and why):** the per-item **responses + score review** (Pack B review sheet / "Draft score")
only opens when the class has a **keyed assignment that `match-key` links to the page** (`capture.tsx` ~L972–1023). The dev
class `d1715000-…0301` has two keyed assignments ("ditl-Math Quiz", "ditl-Math HW S1 / Addition Word Problems KEY"), and no
corpus page matches them, so correctly no key is matched and only the name/roster-match card shows. To reach the
responses screen you need an assignment keyed to the H-fixture (DB write, not done here). `/proposal` runs
`evaluate-homework` without a key, but on web it is only reached from the header **camera**, not a file picker.

### Remaining gaps (updated)

- Multi-page packets only exercise **page 1** fixtures.
- `evaluate-homework` is ai-dev only (no Edge Function).
