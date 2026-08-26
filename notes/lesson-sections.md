# Assignable lesson sections (teacher trial)

Status: SENT 2026-08-24. SQL `20260824000006_lesson_section_packs.sql` — Chief of Staff applies. Do not upload the deck folder unless Chuck confirms quota.

## Feedback
Trial teacher teaches one textbook section at a time. One assignable "Chapter 1" lesson is too coarse.

## Current
Playable: `notes/teacher-decks/fom-ch01-v4/index.html` (gitignored). One SPA, 14 beats.
Title: Ch 1 · Whole numbers and decimals.
Catalog: one `lesson_packs` row `fom-ch01` / `v4` — "Fundamentals of Math · Chapter 1".
Picker: one chip per pack row (`AssignmentForm` / `listLessonPacks`). `assignments.section` is practice gradebook grouping, hidden on Lesson — do not reuse it.
Student open: JWT prefix `{deck_id}/{version}` → `lessons/{deck_id}/{version}/index.html`. Dev: `:8772/index.html`.
Progress: `localStorage` `kelyra-fom-ch01-v4` (whole chapter). `#markDone` completes that assignment.
Identity/resume: `postMessage`, not the URL. `?beat=` is QA only.

## BJU PPT titles (use these)
1.1 Ordering and Rounding
1.2 Addition and Subtraction
1.3 Multiplication
1.4 Division
1.5 Exponents
1.6 Square Roots
1.7 Order of Operations

## Slice (L4)
Keep **one** HTML + audio/img under storage prefix `fom-ch01/v4`. Do not copy scene PNGs seven times (S1 egress).

Seed seven published packs. Hook rides with 1.1. Finished rides with 1.7. Teach+Check = one assignment.

| deck_id | Catalog title | Beats |
|---|---|---|
| fom-ch01-s11 | 1.1 Ordering and Rounding | hook, s11t, s11c |
| fom-ch01-s12 | 1.2 Addition and Subtraction | s12t, s12c |
| fom-ch01-s13 | 1.3 Multiplication | s13t, s13c |
| fom-ch01-s14 | 1.4 Division | s14t, s14c |
| fom-ch01-s15 | 1.5 Exponents | s15t, s15c |
| fom-ch01-s16 | 1.6 Square Roots | s16t |
| fom-ch01-s17 | 1.7 Order of Operations | s17t, done |

Optional: keep `fom-ch01` / v4 as unpublished or "Chapter 1 (all)" for review. Default picker should be the seven sections.

Pack metadata: `storage_deck_id` always `fom-ch01`, plus `beat_start`/`beat_end` (or beat ids). Unique `(deck_id, version)` already allows `fom-ch01-s11` vs `fom-ch01`. JWT/storage prefix stays `fom-ch01/v4`.

**Do not gate students with `?section=` / `?beatStart=`.** Pass the beat window on identity `postMessage`. Page subsets BEATS, recounts HUD pips n/k, Next must not enter the next section. Per-pack localStorage (`kelyra-fom-ch01-s11-v4`). Slice Done = that assignment complete.

Dev `:8772` must apply the same identity gate (not ungated chapter for every pack).

Assign UI: no new tabs. Existing chip picker lists the new rows.

SQL in a migration. CoS applies. Do not upload decks without Chuck’s quota OK. Do not git-commit teacher-decks.

Do not: public bucket; create-class; S1 thumbs in this slice; Cloudflare.
