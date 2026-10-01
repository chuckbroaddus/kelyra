# Roster ingest fixture corpus

Reusable evaluation set for class-list photo → suggested student names
(confirm-before-insert). Pattern mirrors gradebook-ingest; do not modify that corpus.

## Code-path inventory

| Layer | Path | Role |
|-------|------|------|
| Capture classify | `scripts/ai-dev-server.mjs` `classify-capture` + `supabase/functions/classify-capture` | Intent `roster` when image is a printed class list / seating chart |
| Speech intent | `src/lib/matching/captureSpeech.ts` | Spoken "roster / class list / attendance / seating chart" → `roster` |
| Extract | `scripts/ai-dev-server.mjs` `extract-roster` (local only; no edge twin yet) | Vision → `{ names: [{ name, confident, student_id?, grade?, period?, parent_contact? }] }` |
| Client API | `src/lib/students/api.ts` `suggestRosterFromPhoto` | Invokes `extract-roster`; marks already-here; selected iff confident |
| Capture flow | `src/app/capture.tsx` | On intent roster → suggest + park `roster_imports`; confirm checklist; `saveRosterConfirm` |
| Proposal flow | `src/app/proposal.tsx` | Same suggest path after classify |
| Setup flow | `src/app/class/[id]/setup.tsx` | **Photo of list** / choose list photo → checklist → office adds |
| Persist draft | `roster_imports` table + `createRosterImport` / `markRosterImportConfirmed` / `teacher_delete_roster_import` | Parked suggestions until confirm |
| Enroll | `addConfirmedStudents` / `enrollExistingStudent` | Office may create students; teacher enrolls existing only |
| Matcher | `src/lib/matching/matchName.ts` etc. | Does **not** invent students from list OCR; only matches spoken/paper names to existing roster |
| Class stack | `src/components/ingest/ClassStackBinder.tsx` | Multi-page homework stack; roster_count check-off only (not list OCR) |

## Target model (eval ground truth)

MVP product creates **name-only** student rows on confirm. Eval still scores optional
fields when present on the page so the extractor can improve without silent invent.

```json
{
  "source_id": "R01",
  "kind": "roster" | "negative",
  "document_kind_guess": "class_roster" | "seating_chart" | "attendance" | "not_roster",
  "rejected": false,
  "names": [
    {
      "name": "First Last",
      "student_id": "A1001" | null,
      "grade": "9" | null,
      "period": "2" | null,
      "parent_contact": "name <email|phone>" | null,
      "confident": true
    }
  ],
  "warnings": []
}
```

Rules aligned with product:

- Only personal student names (skip Period / Present / teacher / room headers).
- Do not invent a name not on the page.
- Low-confidence lines → `confident: false` (UI starts unchecked).
- Negatives: empty `names`, `rejected: true`, `document_kind_guess: not_roster`.
- Optional fields null when absent — a non-null value when GT is null is a **hallucination**.

## Layout

Each case folder (`R01`…, `N01`…):

- `source.html` — printable source
- `clean.png` — rendered page
- `photo.jpg` — photo-like (skew/glare) when flagged
- `rough.jpg` — genuinely rough phone capture (R19–R28, R30–R33, N04–N05), from `degrade-roster-fixtures.mjs`
- `layout.json` — GT boxes (from `data-gt-*` in source.html) used for the visibility check
- `visibility.json` — per-name in-frame / occluded estimate for `rough.jpg` (glare, shadow, stain, pen, cover, curl)
- `expected.json` — ground truth
- `eval-meta.json` — scorer hints (`negative`, `handwritten`, …)
- `notes.md` — what the case exercises

Root: `MANIFEST.json`, `runs/<stamp>/`.

## Rough phone-photo + handwritten cases (R19–R33, N04–N05)

Defined in `scripts/lib/roster-rough-cases.mjs` (imported by the generator). All names synthetic.
`MANIFEST.json` / `eval-meta.json` carry `rough`, `handwritten`, `effects[]`; `eval-meta.degrade`
is the seeded spec. `scripts/degrade-roster-fixtures.mjs` (pure JS + sharp, deterministic per seed)
combines 2–4 effects per case: strong keystone, rotation, crop off frame edge, crumple warp +
crease segments, folds, page curl into binding (cylinder model), coffee stain, pen scribble /
checks / circles, desk background + clutter under and over the page, hand/phone shadow, glare
hotspot, uneven light, defocus + motion blur, low light + sensor noise, JPEG artifacts.

| Case | Kind | Effects |
|------|------|---------|
| R19 | printed, ID | strong keystone · motion blur · low light/noise · q45 |
| R20 | printed, ID+grade | 14° rotation · glare washing out 2 names · q55 |
| R21 | attendance | hand+phone shadow over rows · defocus · desk clutter |
| R22 | grade+period | crumpled warp + creases · low light/noise · q40 |
| R23 | ID+period | page off top/right edge (2 rows + ID digits cut) · keystone · clutter |
| R24 | seating chart | curl into binding · shadow band · 7° rotation |
| R25 | LAST, FIRST + SID | coffee ring · pen scribble over a name, checks, circle · keystone |
| R26 | dense 18 names | folded in thirds · glare over 3 names · 10° rotation |
| R27 | name+period | very low light · strong keystone · motion blur |
| R28 | parent contact | paper + sticky note over page (1 row hidden) · 18° rotation · defocus |
| R29 | handwritten (flat) | Bradley print · strike-out + caret insert · late add other ink |
| R30 | handwritten | alternating print/cursive + #IDs · keystone · hand shadow |
| R31 | handwritten | pencil on graph paper · 2 scribbled-out · arrow insert · crumpled · dim |
| R32 | handwritten | cursive (Snell/Chancery/Savoye) under Period headings · curl · glare |
| R33 | handwritten | sign-up sheet, 10 different hands/inks · defocus · clutter · rotation |
| N04 | negative | lunch menu · rotation · glare · clutter |
| N05 | negative, handwritten | teacher to-do list · crumpled · shadow |

**Honest GT for degraded images** (`expected._eval`, rough variant only; clean variant uses full GT):

- `rough_gt.absent` — fully hidden (glare / cover / off-frame). Reading it anyway = invented (hallucination).
- `rough_gt.uncertain` — partly legible. Not penalised if missing; fine if read.
- `rough_gt.uncertain_fields` — e.g. ID digits cut at the edge: null is OK, a wrong value counts as a hallucination.
- `excluded_names` — crossed-out names (handwritten). Extracting one counts as an extra (precision) but not a hallucination.

Absent/uncertain were set from `visibility.json` and then checked by eye on `rough.jpg`.

Eval runs every case's `clean.png`, plus `photo.jpg` and `rough.jpg` when present, and reports
buckets: `clean_print`, `photo_mild`, `rough_print`, `handwritten_clean`, `handwritten_rough`,
`negatives`, `negatives_rough`. `EVAL_ONLY=R19,R20` limits cases; `EVAL_SKIP_ROUGH=1` skips rough.jpg.

Note: on machines without Python PIL, `render-roster-ingest-pngs.mjs` falls back to `sips` for
`photo.jpg` (plain JPEG re-encode, no skew), so the legacy "photo" variants are nearly clean.

## Commands

```bash
node scripts/gen-roster-ingest-fixtures.mjs
node scripts/render-roster-ingest-pngs.mjs          # RENDER_ONLY=R19,R20 to limit
node scripts/degrade-roster-fixtures.mjs            # rough.jpg + visibility.json (optional ids)
npm run eval:roster
# or: node scripts/eval-roster-ingest.mjs
```

Eval hits local `extract-roster` via `AI_DEV_URL` (default `http://127.0.0.1:8787`)
using Grok OAuth through `npm run ai:dev`. Never print secrets.
