# Author kinds and metrics (2026-08-27)

Owner: Kelyra Author. Class-app schema/UI through Chief of Staff.
No second HTML runtime. FoM 1.1 round-trip first.

## Decision

- Author emits `kind=lesson` HTML only.
- Quiz / test / midterm / final stay `assignments.category` on that pack.
- Metrics stay the live FoM `kelyra.lesson` table.
- No `kind=quiz`, no skill tags, no IEP schema in v1.
- Capture / planned / legacy `practice` stay class-app; Author does not emit those players.

## Sequence

1. Freeze 1.1 fixture and `publish_lesson_pack`.
2. Round-trip Open / identity lock / Submit / skill-gap on `fom-ch01-s11-test`.
3. More FoM sections as `lesson` packs.
4. Then one Check-heavy pack assigned `category=quiz`.

## Metrics (HTML packs)

Identity, clock (`duration_ms`), last-ok `correct`/`incorrect`, `hints`, `audio_used`, `kinetic_used`, per-item `marks` (user/ok/tries/hints/first_ok/later_corrected), extras item_ids/stems plus skipped/wrong/later_corrected/retried/hinted.

Approve remains the grade. `student_report_lesson` stays non-graded.

## CoS follow-up (not the publish hook)

Chuck 2026-08-27: do **not** default quiz/test to `include_in_average=true`.

Teacher sets the **class syllabus** at class setup: which types exist, each type's weight toward the final, term, makeup rules (example: replace lowest test, capped at 85%). Each type is averaged inside that term. Those type averages are then weighted into the final.

`include_in_average` means the column counts in **its type average**, not a slice of the final.

Live Kelyra has per-assignment `category` / `term` / `weight_band` only. No class syllabus table, no makeup policy. Parked as Kelyra Desk AVG HOLD. Author does not emit syllabus or grades. `publish_lesson_pack` unchanged.

## Staff (now)

- Lesson + Lesson QA: emit craft and STYLE-BRIEF QA
- Prompt: PPT ingest after 1.1 round-trip
- CoS: class-app interface
- Kelyra QA: live Open/Submit
- No new Author agents until we are emitting packs
