# Assign + lesson materials ingest scorecard

**Baseline:** `notes/qa-fixtures/assign-ingest/runs/202610011117`  
**Round 1 (prompt + scorer + resume):** `notes/qa-fixtures/assign-ingest/runs/202610011125`  
**Round 2 (fresh full runs, high-detail key read + review UI):** `runs/202610011210`, `runs/202610011235` (main-fresh check: `runs/202610011156`)  
**Corpus:** 21 cases (A01–A15 assignment keys, L01–L03 lesson classify, N01–N03 negatives)  
**AI path:** local `ai:dev` `analyze-answer-key` + `classify-capture` (not gradebook edge)

## Round 2 (2026-10-01, after PR #333)

R1's 89.6% was put together by re-fetching weak cases one at a time. It was also scored against an ai:dev process started before the anskey reject-hardening merge. A **fresh, uncached full run of merged main** (`runs/202610011156`, private ai:dev on :8797) scored **78.8%**, so R1 did not reproduce. R2 fixes, each confirmed with **two independent full runs** (no cache, no per-case re-fetch):

| Metric | Baseline 1117 | R1 1125 (cherry-picked) | Main fresh 1156 | **R2 run A 1210** | **R2 run B 1235** |
|--------|------:|------:|------:|------:|------:|
| overall | 82.7% | 89.6% | 78.8% | **97.6%** | **95.5%** |
| assignment_key | 78.3% | 85.3% | 70.0% | **96.6%** | **93.6%** |
| lesson classify | 100% | 100% | 100% | **100%** | **100%** |
| negatives | 86.7% | 100% | 100% | **100%** | **100%** |
| clean | 87.5% | 92.6% | 76.7% | 96.8% | 93.4% |
| photo | 75.0% | 84.7% | 82.3% | 98.9% | 98.9% |
| record_match_rate | 85.3% | 88.2% | 82.4% | 100% | 97.1% |
| hallucinations | 2 | 0 | 0 | **0** | **0** |

Gate: ≥85% with 0 hallucinations. **PASS on both R2 runs.**

### R2 fixes

1. **analyze-answer-key reads at `detail: 'high'`** (`scripts/ai-dev-server.mjs`). At low detail the model misread × as +, superscripts (2³ came back as 2^5) and "3 pts". A13 went from 33% to 100%, A01 from 75% to 100%, and A07 point values now read correctly. Cost: one higher-detail image per key, not per submission.
2. **pageState prompt rule.** pageState describes the paper *before* solving. Blank worksheets were coming back `filled` because the model had just filled them in.
3. **Operator/exponent/points read rule** and a **STEM vs ANSWER** rule. A parse step also removes an answer the model copied onto the end of a filled-key stem ("Round 4.678 to the tenths: 4.7").
4. **Review UI** (`AssignmentForm` + assignment editor). A rejected or unreadable key now shows a red inline `alert` **beside the key photo**. Before, it was a status line under the Assign button, off-screen at 375px. A rejected key reads "Not an answer key — <model reason>", without repeating the lead. Static test: `src/components/ui/assignmentKeyError.test.ts`.

### UI proof @375 (real review screen, fixture fed via CDP file-chooser, no camera)

Harness: `scripts/assign-ingest-ui-proof.mjs`. It opens the assignment editor, then Photo → Take photo → Choose from library, and passes the fixture to `DOM.setFileInputFiles`. It waits for the analyze-answer-key result to render, then screenshots. Expo web ran on :8095 with a **private Metro cache** (`TMPDIR=…`). The served bundle was checked to contain only this worktree's paths and the new strings. Proofs taken earlier with the shared Metro cache were discarded: that cache had served a different worktree's code.

| Shot (`runs/202610011210/ui-proof/`, mirrored in `/tmp/assign-ingest-eval/`) | Shows |
|------|------|
| `A04-photo-review-375.png` / `A04-photo-items-375.png` | Filled teacher key (phone photo): "Read the written answers", items 0.5+0.25= → 0.75, 1.2×3= → 3.6, stem "Round 4.678 to tenths:" (answer no longer copied into the stem) |
| `A07-clean-review-375.png` / `A07-clean-items-375.png` | Blank integer check: "Looks blank — proposed answers", −3+5= → 2, \|−8\|= → 8, −2×−6= (× read correctly) |
| `A13-photo-review-375.png` / `A13-photo-items-375.png` | Low-light exponents photo: 2³= → 8, √49= → 7, 5²−4²= (superscripts read correctly) |
| `A03-clean-review-375.png` / `A03-clean-items-375.png` | Multi-section MC test: proposed letters with 2 pts each. Item 2 shows **A**; the correct answer is **B**. This is the remaining MC-solving gap, visible to the teacher |
| `N01-photo-review-375.png` | Roster negative: red "Not an answer key" inline under the Photo chip, no items |
| `N02-clean-review-375.png` | Syllabus negative: same inline rejection, no items |

## Remaining gaps

1. **Blank MC solving (A03, A15):** non-reasoning model sometimes picks the wrong letter for fraction MC. The teacher reviews proposed answers ("check each one"), but this is still the largest error source. Next lever: a reasoning pass only for `pageState=blank` MC items.
2. **A14 open-response prompt** is intermittent: one of two runs returned `items: []` / `unsure` instead of one needsTeacher row.
3. **pageState on A15** still sometimes `filled` for a blank Spanish MC sheet.
4. **Lesson pack (`ingest-lesson-pack`)** is not in the live corpus. Lesson plan/materials are covered as classify-only.
5. **A11 item 1** ("Friction always slows motion", key = true) is arguable ground truth. The model answers False. Left as is.
6. Edge `classify-capture` / `ride-lpr` lack CORS on web (another track's finding). That is why the web proof goes through the ai:dev key path.
7. The shared :8787 ai:dev (started by the earlier Hermes run from this worktree) runs pre-merge code. Restart it so phones and Metro on :8081 pick up R2.

## Rerun

```bash
npm run ai:dev   # separate terminal
npm run eval:assign
# rescore only:
EVAL_ASSIGN_RESCORE_ONLY=1 EVAL_RESUME_STAMP=<stamp> node scripts/eval-assign-ingest.mjs
# force cases:
EVAL_RESUME_STAMP=<stamp> EVAL_FORCE_IDS=A01,A13 node scripts/eval-assign-ingest.mjs
```

## Inventory pointer

`notes/qa-fixtures/assign-ingest/README.md` — code map + target fields.
