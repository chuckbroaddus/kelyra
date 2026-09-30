# GB ingest scorecard — SRS §11.19 / §11.20

**Run:** `notes/qa-fixtures/gradebook-ingest/runs/202609302204`  
**Corpus:** `notes/qa-fixtures/gradebook-ingest/` (25 cases)  
**Edge:** live `ingest-grading-doc` · evaluation only

## Verdict

| AC | Verdict |
|----|---------|
| **§11.19** | **PARTIAL PASS** — S01 clean/photo 80%: engine+categories+within_category review OK; late_rule free-string not structured. Save still human (proposal only). |
| **§11.20** | **FAIL/FLARY** — H01 clean empty proposal; H01 photo 27% with six-weeks + pass 70 partial; rollup.preset weak. |

**Accuracy:** overall **36.0%** · syllabus **42.2%** · handbook **18.5%** · negatives **60.0%** · clean **34.1%** · photo **39.3%**

Totals: correct 54 · wrong 44 · missing 38 · flagged-review 2 · hallucinated 38

## Highlights

### Per-document (selected)

| ID | clean | photo | Notes |
|----|------:|------:|-------|
| S01 (§11.19) | 80% | 80% | weights+within-cat OK; late shape fail |
| S05 sum90 | 60% | 25% | no renormalize to 100 (FR-AI-21) |
| S06 sum110 | 50% | 71% | 50/40/20 kept |
| S08 hand | 0% | 0% | handwritten weak |
| H01 (§11.20) | 0% | 27% | clean blank; photo partial TX pack |
| H09 chart | 0%* | 0%* | *strict score; raw qp.tables 4/5/6 present |
| N01/N02 | 100% | 100%/— | empty OK |
| N03 mixed | 0% | 0% | silent merge FR-AI-13 fail |
| S11/S12 real | ~50/33 | same | soft GT |

Full table: `runs/202609302204/score.json`.

### Rules

| Rule | Result |
|------|--------|
| FR-AI-21 no silent renormalize | PASS S05/S06 clean |
| FR-AI-21 numeric chart | PASS content H09 qp.tables |
| FR-AI-13 negatives | N01/N02 PASS; N03 FAIL |
| No Publish from edge | PASS |

### Top failure patterns

1. late_rule as string not object → prompt/normalize
2. categories name/weight aliases → normalize
3. handbook empty / missing rollup.preset → school prompt + retry
4. custom_weights instead of preset enum → schema
5. N03 merge two syllabi → FR-AI-13 guard

### Ranked fixes

1. P0 coerce late/categories/retake shapes in normalizeProposal
2. P0 school prompt force template+rollup.preset; retry empty
3. P0 mixed-doc block (empty fields + warning)
4. P1 few-shot §11.19/§11.20 in prompts
5. P1 percent vs fraction clamp (×100 if sum≈1)
6. P2 UI mapping tests + wizard highlight

### Rerun

```bash
npm run eval:ingest
# stepwise: SKIP_RENDER=1 node scripts/gen-gradebook-ingest-fixtures.mjs
# node scripts/render-gradebook-ingest-pngs.mjs
# node scripts/eval-gradebook-ingest.mjs
```

Matrix: `notes/company/gradebook/eval/INGEST_MATRIX.md`  
UI: edge proposal-only proven; CDP wizard screenshots optional under RAPID harness (Metro).

