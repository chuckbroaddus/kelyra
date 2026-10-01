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
- `expected.json` — ground truth
- `eval-meta.json` — scorer hints (`negative`, `handwritten`, …)
- `notes.md` — what the case exercises

Root: `MANIFEST.json`, `runs/<stamp>/`.

## Commands

```bash
node scripts/gen-roster-ingest-fixtures.mjs
node scripts/render-roster-ingest-pngs.mjs
npm run eval:roster
# or: node scripts/eval-roster-ingest.mjs
```

Eval hits local `extract-roster` via `AI_DEV_URL` (default `http://127.0.0.1:8787`)
using Grok OAuth through `npm run ai:dev`. Never print secrets.
