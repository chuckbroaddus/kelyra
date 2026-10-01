# Ask-setup ("Answer a few questions instead") — coverage matrix

Branch `cos/gb-ask-setup-coverage` · 2026-10-01

**Where it lives:** entry points `src/app/class/[id]/syllabus.tsx` → `/class/[id]/syllabus-interview`,
`src/app/school/grading-policy/index.tsx` → `/school/grading-policy/interview`; UI
`src/components/interview/InterviewScreen.tsx`; engine `src/lib/interview/*`; LLM edge function
`supabase/functions/setup-interview` (client now sends `prompt`, so no redeploy).

The field list is the **same list the document-ingest path uses** (`src/lib/ingest/allowedPaths.ts`:
19 syllabus, 29 school). `src/lib/interview/setupFields.ts` registers each one. `setupCoverage.test.ts`
fails if a new ingest path is added without an interview question, or if a question writes a path the
saver ignores.

Legend: **Asked** = a question or chip sets it · **Parsed** = typed answers turn into the canonical draft value
· **Saved** = it reaches the form draft (`SyllabusWizardDraft` / `SetupDraft`) after "Apply to the form".

## Before → after (summary)

| | Asked | Parsed canonically | Saved to the form |
|---|---|---|---|
| Syllabus, before | 7 / 17 applicable | ~4 | **0** (handoff dropped the draft; `?from=interview` never read) |
| Syllabus, after | 17 / 17 | 17 / 17 | 17 / 17 (through `applyProposalToSyllabusDraft`, same as documents) |
| School, before | ~9 slots, 5 of them dead paths | — | **0** |
| School, after | 27 / 27 required + optional + derived | 27 / 27 | 27 / 27 (through `mergeIntoSetupDraft`, same as documents) |

Not applicable (nothing to ask): `syllabus.narrative`, `syllabus.assignment_max`, `rollup.custom_weights`, `school.notes`.

## Syllabus (teacher)

| Field | Req. | Question | Before | After |
|---|---|---|---|---|
| syllabus.engine | required | T-Q1 | asked; not saved | asked (5 engines), saved |
| syllabus.within_category | required | T-Q1/T-Q3 | asked; could contradict engine | reconciled with engine, saved |
| syllabus.categories | required | T-Q2 | asked; sum not checked | parsed "Tests 50, Quizzes 30…", must total 100 (re-asks), saved |
| (drop lowest per category) | — | T-Q4 | yes/no boolean only | per-category counts → `rules.drop_lowest_n` |
| syllabus.missing_rule | required | T-Q5 | asked; not saved | zero / omit / floor 50, saved |
| syllabus.late_rule | required | T-Q6 | non-canonical `flat_percent`; no "not sure" | canonical LateRule (per_day/per_hour/flat/none, floor_pct, hard_deadline_days, grace_hours) |
| syllabus.extra_credit_method | required | T-Q7 | boolean; `'none'` method | A/B/C + `extra_credit_allowed` |
| syllabus.ec_cap | optional | T-Q7b | not asked | asked |
| syllabus.ceiling | optional | T-Q7b | not asked | asked |
| syllabus.retake | required | T-Q8 | boolean | RetakeRule (categories, method, cap, window, attempts) |
| syllabus.floor | optional | T-Q9 | only via "missing = 50" | asked |
| syllabus.rounding | optional | T-Q10 | not asked | asked |
| syllabus.term_structure | optional | T-Q11 | not asked | asked |
| syllabus.book_mode | optional | T-Q11 | not asked | asked |
| syllabus.exam_weight | optional | T-Q12 | not asked | asked (hidden when the school locks the rollup) |
| syllabus.rollup_preset | optional | T-Q12 | not asked | asked (hidden when the school locks the rollup) |
| syllabus.empty_category | optional | T-Q13 | not asked | asked → `empty_policy` |
| syllabus.title | optional | T-Q14 | not asked | pre-filled from the class name; can be changed |
| syllabus.narrative | n/a | — | — | — |
| syllabus.assignment_max | n/a | — | — | — |

School-locked fields are pre-filled ("Set by school") and skipped.

## School grading policy (office)

| Field | Req. | Question | Before | After |
|---|---|---|---|---|
| level | required | S-Q1 | asked; not saved | saved |
| calendar.template | required | S-Q2 | asked; not saved | saved; calendar rebuilt |
| calendar.year_start / year_end | optional | S-Q2b | not asked | asked ("Aug 13 to May 28") |
| calendar.model / period_model | derived | S-Q2/S-Q2b/S-Q4 | — | derived and saved |
| credit.policy (+unit, year_link, attendance_gate) | required / derived | S-Q3 | asked; not saved | saved |
| credit exam exemption | required (part of credit.policy) | S-Q5 | dead `exam.separate` | `credit.policy.exam_exemption` |
| rollup.preset / rollup.exam_enabled | required / derived | S-Q4 | asked; not saved | saved |
| scale.default_id / scale.list / scale.bands | required / derived | S-Q6 | asked; not saved | saved |
| scale.passing_pct (+ credit.passing_threshold) | required / derived | S-Q6 | dead path | written into the default scale in `scale.list` |
| scale.rounding | optional | S-Q6b | not asked | asked |
| gpa.mode / gpa.rank | required / optional | S-Q7 | mode only | mode + "with class rank" |
| qp.tables / qp.method / levels.list | derived | S-Q8 | dead `gpa.weighted_bonus`, `levels.ap_points` | builds the levels + quality-point chart |
| gpa.include | required | S-Q9 | dead `gpa.exclude` | written into `gpa.profiles` |
| gpa.repeat | optional | S-Q9b | not asked | asked |
| gpa.profiles | derived | S-Q7/9/9b | — | saved |
| locks.map | required | S-Q11 | not asked | asked |
| rollup.custom_weights, school.notes | n/a | — | — | — |

## Conversation behavior

- Every question has a "Not sure" chip, and optional questions also have "Use defaults for the rest". Defaults are tagged "Default · check" on the summary.
- If an answer can't be parsed, the question is asked again. After 2 misses the default is used and the interview moves on, so it can't get stuck. Gibberish counts as a miss even when the model calls it a side question.
- The summary card ("Your setup — tap a line to change it") lets the user change any line. Lines are tagged Change / "Usual choice · check" / "Set by your school". "Put these answers in the form" fills the real form and opens its Review step. Nothing is published until Save draft or Publish.
- All on-screen text uses plain words (rebased on #341). Stored ids are shown through `src/lib/grade/plainLabels.ts` or the word maps in `graph.ts`, so no raw ids, enum values, or ISO dates appear.

## Finding: document upload dropped retakes (fixed in cos/gb-upload-retakes)

Was: `applyProposalToSyllabusDraft` (`src/lib/ingest/pathMapping.ts`) had no case for `syllabus.retake`, so
**the document-upload path dropped retakes** even though the model already returned them (round 4: S06
`higher_of` cap 70, S08 `replace`). The interview patched retake in after the shared mapper.

Now: the mapper maps `syllabus.retake` into `RetakeRule` (attempts, replace / higher_of / average, cap,
categories matched onto the form's category keys; empty = every category). Two different retake rules in one
document → `conflict` + a `retake_method` question, and the form is left alone. "No retakes" → retake off. The
interview's retake goes through the same mapper (no special case). Tests: `src/lib/ingest/retakeMapping.test.ts`.

Round-4 corpus replay (recorded model output → parse → mapper → form Review):

| Case | Before (origin/main) | After |
| --- | --- | --- |
| S06 clean / photo | `retake: null`, no retake line | Retakes: one retake; the higher score counts, up to 70%. |
| S08 clean / photo | `retake: null`, no retake line | Retakes: one retake; the new score replaces the old one. |

Still open: `syllabus.assignment_max` has no field in the syllabus form draft (only a school lock), so the
mapper has nowhere to put it.

The prompt change (retake mapping target + examples) is in `supabase/functions/_shared/ingestPrompts.ts` and the
normalizer mirror in `_shared/ingestNormalize.ts`: **`ingest-grading-doc` needs a deploy** for those to reach the
model. The mapper fix works without it.

## Tests

- `src/lib/interview/setupCoverage.test.ts`: registry ↔ ingest paths, every field has a question, chip paths are legal,
  "not sure" all the way through reaches review with every path filled, every chip saves valid values, parsers, LLM merge.
- `src/lib/interview/simulatedConversations.test.ts` + `simConversations.ts`: 4 scripted conversations
  (A total points · B weighted with an invalid 110%, edit at summary · C not-sure + school lock + gibberish · D office).
- `scripts/sim-setup-interview-llm.ts`: the same 4 conversations against the dev `setup-interview` model.

## Results (2026-10-01)

- Unit tests: `node --experimental-strip-types --test src/lib/interview/*.test.ts` → 25/25 pass.
- LLM simulations (`scripts/sim-setup-interview-llm.ts`, dev `setup-interview`):
  - Run 1 (25/25 model turns) found 3 merge problems: EC method left empty, engine/inside-category contradictions, and "not sure" not treated as an answer. All 3 are fixed.
  - Run 2 (25/25 model turns): C failed because the model called gibberish a "side question", so the question re-asked forever. Fixed.
  - Run 3 (25/25 model turns): B failed because the model flipped "each assignment counts the same" to points-inside. Fixed with coupled paths.
  - Run 4 (13/25 model turns): A, B, C and D all pass.
  - Later runs hit the Gemini 429 quota on dev. Every turn fell back to the parsers, and all 4 conversations still pass.
- 375 px UI proof: `scripts/gb-ask-setup-ui-proof.mjs` (teacher and `--office`).
