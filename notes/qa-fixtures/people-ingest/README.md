# People ingest fixture corpus

Reusable evaluation set for parent/guardian cards, student data/emergency sheets,
and directory multi-person contact sheets → people records + metadata.

## Code path map (inventory)

### Capture intents
- `parent_card` — parent / guardian contact card
- `student_card` — student emergency / information sheet (alias: `metadata`)
- Related (out of scope for this corpus): `portrait`, `roster`

### Client
- `src/app/capture.tsx` — classify → `mapClassifierFields` → fieldChecks UI →
  `saveParentCardConfirm` / `saveStudentCardConfirm`
- `src/app/proposal.tsx` — same classify + map for proposal flow
- `src/lib/matching/captureSpeech.ts` — spoken intent for parent/student card
- `src/lib/capture/seatJobs.ts` — seat allow-lists and labels
- `src/lib/people/metadata.ts` — `mapClassifierFields`, field aliases, detail labels
- `src/lib/people/photos.ts` — people photo attach (portrait path)
- `src/lib/parents/api.ts` — create/update parent + link child
- `src/lib/students/api.ts` — update student metadata

### Edge / AI
- `supabase/functions/classify-capture/index.ts` — vision classify + `fields[]`
- `scripts/ai-dev-server.mjs` — local classify prompt (mirrors edge)

### Target model fields

**Parent (`ParentMetadataKey`):** relationship, phone, email, address,
preferred_contact, notes (+ relationship_other when other)

**Student (`StudentMetadataKey`):** preferred_name, birthday, grade_or_age, phone,
email, address, emergency_name, emergency_phone, allergies, health_conditions, notes

**Names:** `parentGuessName`, `studentGuessName` (never invent a student id)

**Multi-person:** `names[]` and/or multiple logical records in expected GT; classifier
should surface primary name + fields; multi-record sheets score record-level match.

## Layout

Each case folder (`PC01`…, `SC01`…, `MP01`…, `N01`…, `PR01`…, `PH01`…):

- `source.html` — printable source
- `clean.png` / `photo.jpg` — rendered (+ photo-like)
- `rough.jpg` / `visibility.json` / `layout.json` — rough phone capture (PR01–PR10, PH03–PH04, N04–N05)
- `rough-crop.jpg` — text-area crop of `rough.jpg` (resolution probe; PR01, PR06, PR08)
- `expected.json` — ground truth classify shape + mapped fields
- `eval-meta.json` — scorer hints (negative, multi, soft_match, …)
- `notes.md` — what the case exercises

Root: `MANIFEST.json`, `runs/<stamp>/`

## Commands

```bash
node scripts/gen-people-ingest-fixtures.mjs
node scripts/render-people-ingest-pngs.mjs
npm run eval:people
# or: node scripts/eval-people-ingest.mjs
```

Requires `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and personas in
`~/.kelyra/ui-personas.json` (teacher or office). Never print secrets.

## Scoring note (R2)

`scripts/eval-people-ingest.mjs` maps classifier `fields[]` through the real
`mapClassifierFields` from `src/lib/people/metadata.ts` (same as the Capture review
screen), parent vs student by returned intent. Birthdays compare via `coerceBirthdayISO`.

## UI proof

`node scripts/people-ingest-ui-proof.mjs --port <web port> --stamp <run> PC01:clean SC03:photo ...`
— own Expo web port (not 8081), one QA Chrome :9223 tab (always closed), CDP file-chooser
feeds the fixture into Capture → "Photo or Video" → "Ask AI to process", screenshots the
parent/student card review at 375px.


## Rough phone-photo + handwritten parent-filled cases (PR01–PR10, PH01–PH04, N04–N05)

Same approach as the roster rough corpus (PR #337). Defined in `scripts/lib/people-rough-cases.mjs`
(imported by the generator). All names synthetic, all phones 555.

| id | kind | multi-adult | rough effects |
|----|------|:-:|---|
| PR01 | parent_card | | strong keystone, motion blur, low light + noise, q42 |
| PR02 | student_card | | rotation 12°, glare over the allergies row, q55 |
| PR03 | parent_card | 2 | crumple warp + crease segments, rotation −5°, q50 |
| PR04 | student_card | | tri-fold creases, right edge cut off (address), q58 |
| PR05 | parent_card | | hand + phone shadow over the rows, desk clutter, defocus |
| PR06 | student_card | | downscaled to 820 px, JPEG q28 then q22, defocus |
| PR07 | parent_card | 3 | side keystone, email column cut at the edge, clutter, q52 |
| PR08 | parent_card | | heavy low light, warm cast, noise, defocus |
| PR09 | student_card | | coffee ring over DOB, pen marks, clutter, q60 |
| PR10 | parent_card | | page curl into binder, rotation −8°, glare on email |
| PH01 | parent_card (handwritten) | 2 | clean only — "Mom"/"Dad", guardian 2 email blank |
| PH02 | student_card (handwritten) | | clean only — medical conditions blank (must not invent) |
| PH03 | parent_card (handwritten) | 2 | keystone, hand shadow, q50 |
| PH04 | student_card (handwritten, pencil) | | crumple, low light; old emergency number scribbled out |
| N04 | negative | | lunch menu with a phone line; rotation, glare, clutter |
| N05 | negative | | bus schedule with office phone + driver; crumple, low light |

Files per rough case: `clean.png`, `rough.jpg` (what the eval sends), `layout.json` (GT boxes from
`data-gt-name` / `data-gt-field` + `data-gt-for`), `visibility.json` (per-name/field in-frame +
occlusion estimate, page corners). `scripts/degrade-people-fixtures.mjs` is the roster degrader
retargeted at this corpus (deterministic per seed; glare/stain/pen targets can anchor on a field:
`{ target: 'primary', field: 'allergies' }`).

**Honest GT for degraded images** (`expected._eval.rough_gt`, rough / rough_crop variants only; clean
uses the full GT). Seeded from `visibility.json`, then every `rough.jpg` was checked by eye at full
resolution (`eye` note per case):

- `absent` — not visible (PR02 allergies under glare). Reading it anyway = hallucinated.
- `uncertain` — partly legible (PR04 address cut at "…Wes", PR07 adult-1 email cut at "…@example",
  PR08 phone/email/address in the dark, PR10 email after "gfontaine@ex"). Missing = not scored;
  a wrong value = hallucinated.
- PR09: visibility flagged DOB `absent` under the coffee ring, but it reads through by eye → kept certain.
- `crossed_out` (PH04): returning the scribbled-out number is tagged `took_crossed_out_value`.

**Multi-adult** (`eval-meta.multi_adult`, PR03 / PR07 / PH01 / PH03): adult 2+ name / phone / email
must appear somewhere in the response (`names[]`, `fields[]`, `note`). This scores the known gap
(only the first adult is filled). Legacy MP01 reports the same coverage as info only, so legacy
scores stay comparable with PR #334.

**Resolution probe:** `node scripts/crop-people-rough.mjs PR01 PR06 PR08` writes `rough-crop.jpg`
(the page text area cropped from `rough.jpg`, no resampling). The eval scores it as variant
`rough_crop`, next to bucket `rough_crop_same_cases`.

**Buckets** (`score.json.buckets`, printed table): `all_scored`, `legacy_clean_photo` (the PR #334
set), `clean`, `mild_photo`, `rough`, `handwritten` (`_clean` / `_rough`), `multi_adult`
(`_clean` / `_rough`), `negative`, `negative_rough`, `rough_crop_same_cases`, `rough_crop`. Columns:
n, intent accuracy, doc accuracy (every row correct), field accuracy (mean per-doc row accuracy,
same metric as the 98.3%), hallucinations, adult2+ coverage. `worst` lists the lowest docs with misses.

**Quota:** a 429 / RESOURCE_EXHAUSTED stops the run (exit 3), writes `STOPPED_QUOTA.json`, and
prints the exact resume command. Error responses are never cached (`*.error.json`, ignored on resume).

```bash
node scripts/gen-people-ingest-fixtures.mjs
RENDER_ONLY=PR01,PR02 node scripts/render-people-ingest-pngs.mjs   # optional subset
node scripts/degrade-people-fixtures.mjs                            # rough.jpg + visibility.json
node scripts/crop-people-rough.mjs PR01 PR06 PR08                   # rough-crop.jpg
node scripts/eval-people-ingest.mjs                                 # Edge classify-capture
EVAL_ONLY=PR01,PH03 node scripts/eval-people-ingest.mjs             # subset
AI_DEV_URL=http://127.0.0.1:<port> node scripts/eval-people-ingest.mjs   # local ai:dev route instead
```
