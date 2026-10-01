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

Each case folder (`PC01`…, `SC01`…, `MP01`…, `N01`…):

- `source.html` — printable source
- `clean.png` / `photo.jpg` — rendered (+ photo-like)
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
