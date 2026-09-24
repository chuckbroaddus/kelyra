# Kelyra QA Fixture Corpus v2

Comprehensive **synthetic / CC0** test artifacts for batch scan → split → gradebook,
capture, KEYGRADE, and admin/forms ingest. Built for card `t_ac2790bc`.

## Quick map

| Path | Use |
|------|-----|
| `grading/*-quiz-32/` | 32-page flatbed stacks + answer keys + phone JPG samples + roster/meta |
| `homework/` | Smaller graded HW packs (math, english) |
| `worksheets/` | Graph / diagram assessment sheets + keys |
| `papers/` | Typed research sample + simulated handwritten draft |
| `admin/` | Enrollment, parent info, roster, syllabi, lesson plan, rubric, curricula |
| `_gen/` | Python generators (reportlab + Pillow) — regenerate anytime |

## How to use with Kelyra flows

1. **Batch ingest / class stack:** upload `grading/<subject>-quiz-32/stack-flatbed.pdf` (32 pages).
2. **Answer key:** upload companion `answer-key.pdf` for KEYGRADE / Needs review.
3. **Phone capture:** use files under `stack-phone/` (perspective + compression simulated).
4. **Roster match:** `roster.json` lists 32 synthetic students (Alex Rivera style).
5. **Admin OCR / forms:** try PDFs under `admin/`.
6. **Do not** treat names or handwriting as real — `meta.json` marks `handwriting: simulated`.

## License / privacy

- Original synthetic content, dedicated to **CC0 1.0**.
- No copyrighted textbook/worksheet scrapes.
- No real student PII or photos of minors.

## Related

- Inventory: `../CORPUS-INVENTORY-2026-09-24.md`
- Older DITL single-page fixtures: `../ditl/` (kept; not replaced)
- Batch edge-case PDFs: `../batch-ingest/`
