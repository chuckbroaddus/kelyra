# People ingest scorecard

Track: people / student data sheets via Capture `classify-capture` (parent_card, student_card,
multi-person directory sheets, negatives). Corpus: **21 fixtures** (7 parent cards, 8 student
sheets, 3 multi-person/sibling sheets, 3 negatives) → **36 scored images** (clean + phone-photo
variants). Edge `classify-capture` on dev `aohibokgilxhqwmupdfv`.

| Run | Folder | What changed |
|-----|--------|--------------|
| Baseline | `runs/202610011118` | main prompts |
| R1 | `runs/202610011128` | people prompts + placeholder sanitize + mapper aliases (deployed v18) |
| R1 rescored | `runs/202610011128-r1-rescored` | same R1 responses, R2 scorer (real `mapClassifierFields` + R2 aliases/emergency split) |
| R2 | `runs/202610011153` | R2 prompts deployed (v19) + R2 mapper |

## Verdict

| Metric | Baseline | R1 | R1 rescored | **R2** |
|--------|---------:|---:|-----------:|-------:|
| overall field accuracy | 55.5% (76.9% excl. 503s) | 89.4% | 94.2% | **98.3%** |
| parent_card | 60.8% | 98.6% | 100% | **100%** |
| student_card | 53.6% | 86.5% | 97.6% | **100%** |
| multi-person | 44.0% | 85.1% | 85.1% | **88.0%** |
| negatives rejected | 60.0% | 80.0% | 80.0% | **100%** |
| clean / photo | 57.7 / 52.5% | 88.5 / 90.8% | 93.8 / 94.9% | **99.2 / 96.0%** |
| field rows correct / wrong / missing | 98 / 12 / 75 | — | 178 / 1 / 6 | **182 / 0 / 3** |
| hallucinated fields | 0 | 0 | 0 | **0** |

Baseline caveat: 10 of 36 baseline calls hit Gemini `503 high demand` and scored 0; on the 26
calls that returned, baseline was 76.9%. R1/R2 had 0 provider errors (eval retries 503s).

## Round 1 (Hermes)

- `classify-capture` + `ai-dev-server` prompts: explicit parent/student field labels, multi-person
  `names[]`, never invent blank cells, no schema placeholders.
- Response sanitize: drop `field`/`value` placeholders; non-homework `gaps` cleared.
- `mapClassifierFields` aliases: tel/cell/e-mail/rel/home phone/student phone/grade / age.

## Round 2

- Eval scores through the app's real `mapClassifierFields` (was an eval-only alias copy that
  disagreed with the app, e.g. SC02 "Grade / age", "Student phone" scored missing though the
  review screen shows them). Birthday compare via `coerceBirthdayISO` ("March 14, 2012" = 2012-03-14).
- `mapClassifierFields`: combined `Emergency: Min Park — 555-222-0199` splits into emergency
  contact + emergency phone (`splitNamePhone`); more aliases (emergency contact phone/number,
  goes by, birthdate, mobile/cell phone/phone number, medical, relation, contact preference).
  Tests in `src/lib/people/metadata.test.ts`.
- Prompts (edge + ai-dev mirror): family directories with phone/email columns are parent_card,
  not roster; emergency name/phone as separate fields; nickname in quotes/parens → preferred
  name; empty desk / no paper → unsure.

## UI proof @ 375px (`runs/202610011153/ui-proof/`, mirrored to `/tmp/people-ingest-eval/ui-proof/`)

Web Expo on :8093 + worktree `ai-dev-server` on :8793 (see gap 1), teacher persona, fixture fed
through Capture → Photo or Video (CDP file chooser) → Ask AI to process. Each PNG opened and checked.

- `PC01-clean-review-375.png` / `PC01-clean-fields-375.png` — "This will be a parent card":
  Parent name Jordan Blake, Relationship Mother, Phone (555) 201-4401, Email, Address, Preferred
  contact Text message; Save parent.
- `SC01-photo-review-375.png` / `SC01-photo-fields-375.png` — phone photo → "This will be a
  student card": Preferred name Ellie, Birthday March 14, 2012, Grade or age…; note field Elena Vargas.
- `SC03-photo-review-375.png` / `SC03-photo-fields-375.png` — handwritten photo → student card:
  Allergies shellfish, Emergency contact Min Park, Emergency phone; name Benjamin Park (Ben).
- `MP01-clean-review-375.png` / `MP01-clean-fields-375.png` — multi-person directory → parent card:
  Dana Thompson, Mother, 555-301-1001, dana.t@example.com; second parent spills into Notes.
- `N01-clean-review-375.png` — negative (algebra homework) → "This will be student work / a grade
  draft", no people card.

## Remaining gaps

1. **Web → edge `classify-capture` has no CORS headers** (OPTIONS returns bare 204), so web Expo
   pointed at the edge shows "AI classify-capture is not deployed". UI proof therefore ran
   through the worktree `ai-dev-server` (same prompt, mirrored). Eval hits the deployed edge.
   Not fixed here (shared file, CARRIDER track also editing).
2. **Multi-person sheets are one record in the UI**: only the primary adult gets fields; other
   adults land in Notes (MP01). No multi-record review / sibling split yet.
3. MP03 phone photo sometimes returns no primary parent/child (names only).
4. SC03 on ai-dev path folds nickname into the name ("Benjamin Park (Ben)") instead of a
   Preferred name row.
5. Student card "Save details" stays disabled until a roster student is picked (expected, but
   the card's own name is not matched to roster automatically when absent from the class).

## Rerun

```bash
npm run eval:people          # gen + render + live eval → runs/<stamp>
EVAL_RESUME_STAMP=<stamp> node scripts/eval-people-ingest.mjs   # rescore cached responses (re-calls 503s!)
node scripts/people-ingest-ui-proof.mjs --port 8093 --stamp <stamp> PC01:clean SC01:photo SC03:photo MP01:clean N01:clean
```
