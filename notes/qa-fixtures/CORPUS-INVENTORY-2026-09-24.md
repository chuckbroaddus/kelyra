# QA Fixtures Corpus Inventory — 2026-09-24

**Card:** `t_ac2790bc`  
**Scope:** What already lived under `notes/qa-fixtures/` vs gaps filled by `corpus-v2/`.  
**Policy:** Original synthetic / CC0 only. No copyrighted scrapes. No real student PII. No Hermes AI generation.

## Existing (pre–corpus-v2)

### Markdown samples (root) — typed extras (~28 KB total)
| File | Kind | Subject | Notes |
|------|------|---------|-------|
| `math-algebra-homework.md` | homework + key | math | CC0 |
| `ela-reading-comprehension-quiz.md` | quiz + rubric | English | CC0 |
| `science-cell-biology-test.md` | test + key | science | CC0 |
| `social-studies-civics-project.md` | project + rubric | social studies | CC0 |
| `elementary-math-practice.md` | practice + answers | elementary math | CC0 |
| `elective-music-theory-homework.md` | homework + key | music | CC0 |
| `bible-verse-memory-study.md` | study | Bible (WEB PD verse) | CC0 wrapper |
| `README.md` / `QA.md` / `ditl-artifacts-research.md` | docs | — | index / QA how-to / DITL research |

**Gap:** Text-only; no multi-student stacks, no flatbed PDFs, no phone photo sets, no admin forms.

### `batch-ingest/` — edge-case PDFs (~188 KB)
| File | Role | Size |
|------|------|------|
| `one-page-not-blank.pdf` | primary live stack packet | ~157 KB |
| `one-page-not-blank.png` | raster companion | ~12 KB |
| `one-page.pdf` | minimal 1-page | tiny |
| `25x1-exit.pdf` | placeholder / exit marker | tiny |
| `duplex-blanks.pdf` | blank duplex edge case | tiny |
| `two-pdf-stack.pdf` | multi-file stack edge case | tiny |
| `encrypted.pdf` | hard-fail / soft-warn path | tiny |

**Gap:** Not subject quizzes; not 32-student grading packs; several stubs are near-empty placeholders.

### `ditl/` — Day-in-the-life photo / typed stand-ins (~4 MB images; generators + JWT runners aside)
| Artifact class | Count | Examples |
|----------------|-------|----------|
| Pen / photo JPG | 9 | math quiz/HW/syllabus, science test, history HW/key, student card |
| Typed JPG | 5 | eng HW/key, hist test, bible quiz, sci syllabus |
| Digital PNG stand-ins | 3 | student card, science test, history key |
| Typed MD extras | 2 | math quiz T-02, bible practice |
| Generator | 1 | `generate_ditl_artifacts.py` |
| Cal R2 JWT runners | 4 | `cal-r2-phase-*-live-jwt.mjs` (not fixtures) |

**Gap:** Single-page samples only (not 32-page class stacks). Limited subject coverage for KEYGRADE batch prove-outs. No admin/enrollment/roster/syllabus **form** corpus. No reproducible multi-pack generator for grading stacks.

### Totals before corpus-v2
- ~**4.4 MB** usable fixture content (excluding `ditl/_pw/node_modules`).
- Strong for DITL single-artifact beats; weak for class-stack grading at scale.

## Gaps addressed by `corpus-v2/` (this card)

| Gap | corpus-v2 deliverable |
|-----|------------------------|
| 32-student quiz stacks + keys (4 subjects) | `grading/{math,science,history,english}-quiz-32/` |
| Handwriting variety + scratch-outs + intentional wrongs | Simulated in stack PDFs; labeled in `meta.json` |
| Phone photo samples | `stack-phone/` (≥4 JPGs each) |
| Homework packs | `homework/math-hw-12`, `homework/english-hw-10` |
| Worksheets with diagrams/graphs | `worksheets/math-graph-assessment`, `worksheets/science-diagram-assessment` |
| Research papers | `papers/` typed + handwritten-draft style |
| Admin / school forms | `admin/` enrollment, parent info, roster, syllabi, lesson plan, rubric, curricula |
| Reproducibility | `_gen/` Python (reportlab + Pillow) |
| Index | `MANIFEST.md` + `README.md` |

## Preserved
- All pre-existing root markdown samples, `batch-ingest/`, and `ditl/` remain in place. **Do not delete** DITL fixtures.
- Parent `notes/qa-fixtures/README.md` updated with pointer to `corpus-v2/` only.

## License
All new corpus-v2 content: **CC0 1.0** synthetic originals unless a file header says otherwise.
