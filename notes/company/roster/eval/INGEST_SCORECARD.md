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

## Round 3 + rough fix (R4/R5) — `extract-roster` high detail, no-guess rules (branch `cos/ingest-ui-proof`)

**Runs:** legacy 21-case corpus `202610011154` (pre-fix rerun) → `202610011205` / `202610011208` (R3);
full 38-case / 65-variant corpus (after #337) `202610011221` (origin/main, before) → `202610011235` (R4) → **`202610011243` (R5)**.
All via local ai-dev on a private port (8798), committed fixtures (no regen).

### Legacy corpus (R01–R18, N01–N03)

| Metric | R2 202610011128 | rerun 202610011154 | **R3 202610011205** | R3 confirm 202610011208 |
|--------|---:|---:|---:|---:|
| overall | 94.0% | 94.5% | **100%** | 100% |
| hallucinations | 6 | 7 | **0** | 0 |
| negatives | 100% | 100% | 100% | 100% |

The 6–7 residual hallucinations were all **extra names** (no GT row): OCR ghosts (Lila Qureshi, Kari Melton,
Celia Peralta), first-name swaps on R10 (Ava→Ara, Jonah→Josiah, smudged `H###r`→George/Harper), and the R18
cut-off `Uma V`. Cause: same as the rough corpus — `detail: low` at 1280px.

### Full corpus by bucket (65 variants)

| Bucket | n | before acc (`…1221`) | before hallu | R4 acc (`…1235`) | R4 hallu | **R5 acc (`…1243`)** | **R5 hallu** |
|--------|--:|---:|---:|---:|---:|---:|---:|
| **all** | 65 | 87.2% | 69 | 98.4% | 3 | **98.5%** | **0** |
| clean printed | 27 | 95.7% | 13 | 100% | 0 | **100%** | **0** |
| mild photo | 9 | 92.4% | 3 | 100% | 0 | **100%** | **0** |
| **rough printed** | 10 | **41.3%** | **50** | 93.3% | 1 | **91.7%** | **0** |
| handwritten (all) | 11 | 94.7% | 3 | 96.5% | 2 | **98.7%** | **0** |
| handwritten clean | 7 | 97.8% | 0 | 98.8% | 0 | **98.8%** | **0** |
| handwritten rough | 4 | 89.3% | 3 | 92.5% | 2 | **98.5%** | **0** |
| negatives | 9 | 100% | 0 | 100% | 0 | **100% (9/9)** | **0** |
| negatives rough | 2 | 100% | 0 | 100% | 0 | **100% (2/2)** | **0** |

Rough printed: record F1 43.9% → **100%** (recall 100%, precision 100%). The rest of the rough-printed loss is
optional fields (field acc 79.2%): grade/period misreads under dim light (R22) and IDs/periods left null on
glare rows (R20/R23). Those are misses, not inventions.

### Changes (`scripts/ai-dev-server.mjs` → `extractRoster`, client)

1. **Input resolution:** roster image prepared at **2048px max edge** (was the shared 1280 cap) and sent with
   **`detail: 'high'`** (was `low`). `prepareImageForGrok`/`loadImageForGrok` take `{ maxEdge }` (cache keyed by it).
   No crop step was needed: with high detail the oracle-crop gap closed (rough printed 41.3% → 91.7–93.3%, oracle crop was 92.5%).
2. **Prompt:** read letter by letter, never swap in a similar common name; skip smudged / masked (`###`) / illegible
   rows; skip crossed-out names; partial rows (cut-off last line, initial-only surname) only with `confident:false`;
   never pad to the row count; rough-photo rule ("return fewer names"); **`#`/No. column = row index, not student_id**.
3. **Post-filter:** drop names containing masking symbols or digits; initial-only surname → `confident:false`;
   `dropRowIndexIds` clears a sequential small-integer `student_id` run starting at 1–2 (row numbers);
   strip a leading `#` from IDs (`#4471` → `4471`).
4. **Response:** adds `low_confidence` (≥40% of rows not confident).
5. **Client:** `src/lib/students/rosterSuggest.ts` (pure, tested): suggestions start **unchecked** when the read is
   low-confidence (`low_confidence` or ≥40% unsure rows); unsure rows are always unchecked. `suggestRosterFromPhoto` uses it.
   Class setup: a not-a-roster photo now shows "No student names found on that photo…" **inside the Add card**
   (was a page-bottom generic error) and no longer tries to park an empty import.
6. **Eval:** retries Grok 429 / capacity errors (4× backoff) so a busy model is not scored as a miss.

Residual (R5): no hallucinations. Known softs: R22 rough grade/period off by one; R20 rough leaves IDs on glare rows null.

### Rerun

```bash
AI_DEV_PORT=8798 npm run ai:dev
AI_DEV_URL=http://127.0.0.1:8798 node scripts/eval-roster-ingest.mjs     # committed fixtures
# full regen + eval (re-renders photo.jpg noise, so numbers drift a little): AI_DEV_URL=… npm run eval:roster
```

Deploy: `extract-roster` still has **no Edge Function** (`supabase/functions/` has none); the app reaches it only
through `EXPO_PUBLIC_AI_DEV_URL`. Nothing was deployed.

## UI proof @375 px (real, 2026-10-01): replaces the invalid Capture/home shots above

Harness: `scripts/ingest-ui-proof.mjs` (CDP on QA Chrome :9223, one tab, closed after). Worktree Expo web on **:8121**
with a **private Metro cache** (local uncommitted `metro.config.js` FileStore + private `TMPDIR`, `--clear`); the served
bundle was checked to resolve `src/app/*` from this worktree. `EXPO_PUBLIC_AI_DEV_URL` → worktree ai-dev :8798.
Sign-in: splash form with the persona from `~/.kelyra/ui-personas.json` (persona inject CORS only allows :8081), and the
harness waits out "Finishing sign-in…" before driving. Fixture files go in through the real picker
(`Page.setInterceptFileChooserDialog` + `DOM.setFileInputFiles`): no camera, no OS dialog. Viewport 375×812 @2x.
Every PNG was opened and checked by eye. The earlier Hermes shots (Capture "Finishing sign-in…", blank New Assignment form, none
for homework) are in `/tmp/<slug>-ingest-eval/invalid-old/` and are **not** proof.

Path: **office** persona → `/class/d1715000-…0301/setup` → *Choose list photo* → roster review checklist
("Confirm every name. Nothing is added until you tap Add."). Teacher seat has no Add-students card, and Capture refuses
roster intent for teacher ("This seat cannot create a class or roster from a photo"), so office is the only web seat that reaches it.

| Case | Shot (`notes/qa-fixtures/roster-ingest/ui-proof-2026-10-01/`, copy in `/tmp/roster-ingest-eval/`) | What it shows |
|------|------|------|
| R01 clean | `R01-clean-review-375.png` | 8 checked names Ava Brooks … Owen Blake, "Add 8 students" (matches GT) |
| R20 rough (14° + glare) | `R20-rough-review-375.png` | 7 names (Kenji Ortiz-baird, Liesl Vargas, Orion Falk, Paloma Reyes, Quincy Adebayo, Rosalind Teague, Silas Ferreira). Glare-hidden rows were **not** invented (before: 9 invented names) |
| R29 handwritten | `R29-handwritten-review-375.png` | 12 handwritten names (Adaeze Nwosu … Honor Pemberton), struck-out name not listed |
| R32 rough handwritten | `R32-rough-handwritten-review-375.png` | 7 names Imogen Ravel … Philippa Grey, no "Jane" ghost |
| N01 negative | `N01-negative-review-375.png` | No checklist; in-card "No student names found on that photo…" (new copy) |

**Finding (not fixed: needs a migration):** after the checklist shows, `createRosterImport` fails for office with RLS.
`roster_imports_via_class` only allows `classes.teacher_id = auth.uid()`, so the page bottom also shows "Could not read that list".
The suggestions still render and nothing gets added. Proposed fix (not applied): add an office/`teaches_class` policy on
`public.roster_imports`, matching the enrollments policies.

### Remaining gaps (updated)

- Optional fields (student_id / grade / period / parent_contact) are extracted and scored but **not persisted** on student
  create (the confirm flow is name-only).
- `extract-roster` is ai-dev only (no Edge Function to deploy).
- Rough printed optional-field accuracy 79%: off-by-one grade/period under dim light.
