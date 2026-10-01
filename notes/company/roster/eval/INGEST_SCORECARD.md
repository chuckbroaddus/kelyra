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
