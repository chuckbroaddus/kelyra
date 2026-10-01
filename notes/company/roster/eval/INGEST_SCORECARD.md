# Roster ingest scorecard

**Baseline:** `notes/qa-fixtures/roster-ingest/runs/202610011121` (pre-prompt; names-only extract)  
**Round 1:** `notes/qa-fixtures/roster-ingest/runs/202610011124` (expanded schema; port collision diluted)  
**Round 2:** `notes/qa-fixtures/roster-ingest/runs/202610011128` (junk filters + LAST/FIRST + OCR soft-score)  
**Corpus:** 21 cases (R01–R18, N01–N03) · local `extract-roster` via `AI_DEV_URL` (Grok OAuth)

## Verdict

| Metric | Baseline 202610011121 | R1 202610011124 | R2 202610011128 |
|--------|----------------------:|----------------:|----------------:|
| **overall** | 78.5% | 82.9% | **94.0%** |
| roster | 74.5% | 79.7% | **92.9%** |
| negatives | 100% | 100% | **100%** |
| hallucinations | 32 | 29 | **6** |

Target ≥85% overall: **PASS**. Negatives empty/rejected: **PASS**. Residual hallu = OCR near-miss extras (R01/R06/R10/R11).

## Changes

1. **Prompt** — optional `student_id` / `grade` / `period` / `parent_contact`; `rejected` + `document_kind_guess`; LAST, FIRST → First Last.
2. **Post-filter** — drop Present/Absent/Period/teacher/page junk; title-case; de-dupe.
3. **Client** — `suggestRosterFromPhoto` returns [] on rejected; skips header junk.
4. **Eval** — name F1 + optional-field accuracy + hallu (GT-null invent + extra names); OCR soft match.

## UI proof @ ~375px (ui-drive web-390)

| Shot | Path | Result |
|------|------|--------|
| Capture surface 390 | `runs/202610011128/ui-proof/capture-web-390.png` | teacher Capture route @390 |
| Capture after click | `runs/202610011128/ui-proof/capture-web-after.png` | post Open Capture |
| Home/desk 390 | `runs/202610011128/ui-proof/home-web-390.png` | teacher home @390 |

Copies: `/tmp/roster-ingest-eval/`. File-feed of roster PNGs into confirm checklist still camera/picker-limited on web (same harness limit as GB ingest). **API field accuracy is SoT** for R*/N* cases.

## Remaining gaps

- Photo OCR swaps surnames (Lila Okonkwo→Qureshi; Willa→Willow) on dark/skew pages.
- R10 first-name-only still emits occasional extras (Isaac).
- Dense multi-page (R11) may invent adjacent OCR ghosts.
- No production Edge twin for `extract-roster` yet (local ai-dev only).
- Optional fields not persisted on student create (name-only MVP confirm).

## Rerun

```bash
AI_DEV_PORT=8788 npm run ai:dev   # dedicated port if 8787 busy
AI_DEV_URL=http://127.0.0.1:8788 npm run eval:roster
# resume/rescore:
AI_DEV_URL=http://127.0.0.1:8788 EVAL_RESUME_STAMP=<stamp> node scripts/eval-roster-ingest.mjs
```

## Rough phone-photo + handwritten corpus expansion — run `202610011221`

**Corpus:** 38 cases (+R19–R33, +N04–N05). 14 new `rough.jpg` rosters (10 printed + 4 handwritten)
plus 2 rough negatives, 5 handwritten rosters total (R29 flat). Seeded degrade:
`scripts/degrade-roster-fixtures.mjs`; cases: `scripts/lib/roster-rough-cases.mjs`. GT for degraded
images marks hidden names `absent` and partly legible ones `uncertain` (see corpus README).
Server: origin/main `extract-roster` via local ai-dev (`grok-4.20-0309-non-reasoning`, `detail: low`,
1280px max edge). 65 image variants scored.

| Bucket | n | acc | field acc | record F1 | recall | precision | hallu | negatives |
|--------|--:|----:|----------:|----------:|-------:|----------:|------:|----------:|
| **all** | 65 | 87.2% | 84.8% | 88.9% | 89.5% | 88.4% | 69 | — |
| clean printed | 27 | 95.7% | 93.6% | 97.2% | 97.6% | 96.9% | 13 | — |
| mild photo (legacy) | 9 | 92.4% | 87.6% | 95.5% | 96.8% | 94.5% | 3 | — |
| **rough printed** | 10 | **41.3%** | 37.4% | 43.9% | 44.1% | 43.7% | **50** | — |
| handwritten (all) | 11 | 94.7% | 93.1% | 95.8% | 97.2% | 94.7% | 3 | — |
| handwritten clean | 7 | 97.8% | 98.7% | 97.3% | 98.7% | 96.1% | 0 | — |
| handwritten rough | 4 | 89.3% | 83.3% | 93.3% | 94.4% | 92.2% | 3 | — |
| negatives | 9 | 100% | — | — | — | — | 0 | 9/9 |
| negatives rough | 2 | 100% | — | — | — | — | 0 | 2/2 |

### Worst cases

| Case | acc | Pattern |
|------|----:|---------|
| R20 rough (14° rotation + glare) | 0% | Invented a full 9-name roster (Kara Orton-burke, Oscar Fulk, …) incl. names for the 2 glare-hidden rows; IDs/grades plausible-looking |
| R22 rough (crumpled + dim) | 0% | 8/8 names invented (Cindy Abbott, Maria Gonzalez, …) — generic names, right row count |
| R25 rough (coffee ring + pen + keystone) | 0% | 7 invented names loosely echoing real ones (Cole Featherstone≈Cole Fairweather, Renny≈Remy) |
| R28 rough (occluders + 18° + defocus) | 33% | 4 invented names, only 2 of 6 visible names read |
| R21 rough (hand shadow + defocus) | 56% | 4 of 9 swapped for invented names (Ursula Soto, Addison Pratt) |

Also: R22 **clean** maps the `#` row-number column (1–8) to `student_id` (7 hallucinated fields);
R19 rough reads `A3101` as `Ag001`.

### Failure pattern

On printed rough photos the text is small relative to the frame. With `detail: low` + 1280px the
model cannot resolve it and **confabulates a complete, plausible roster with the right row count**
instead of returning fewer names / `confident:false`. Handwritten cases (big glyphs) hold up.
Negatives stay clean.

**Diagnostic (not in score):** same 10 rough printed images cropped to the text region (GT-box
union + 12% margin, i.e. an oracle doc-crop) → **92.5% acc, 3 hallucinations** (vs 41.3% / 50).
So the GT is legible; the loss is input resolution, not illegible fixtures.

### Suggested fixes (for the extract-roster owner — not changed here)

1. Send roster images at `detail: high` (or `look-again` retry on rough input), and/or crop to the
   document/text region before the vision call (largest-quad / text-bbox detection).
2. Prompt + post-check: if names can't be read, return fewer names with `confident:false` — never
   fill rows; consider a second pass that verifies each name against a zoomed crop.
3. Treat a leading `#`/row-number column as row index, never `student_id`.
4. Low-confidence gate in the client: rough-photo detection (blur/size heuristics) → default all
   suggestions unchecked.

Rerun: `AI_DEV_PORT=8799 npm run ai:dev` then `AI_DEV_URL=http://127.0.0.1:8799 node scripts/eval-roster-ingest.mjs`.
