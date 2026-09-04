# Kelyra QA Fixtures How-To

**Date**: 2026-09-03  
**Reviewer**: qa-engineer  
**Status**: Reviewed and documented. Usable.

## Purpose
Small, license-clean sample assignments for testing Kelyra flows: capture (phone), matching, assign, grade/approve, review, calendar integration, landing pages. All text-based, <<20MB total.

## Quick Picker for Testers (no hunting needed)
- **Homework + key**: `math-algebra-homework.md` (8th-grade algebra), `elective-music-theory-homework.md` (music notes)
- **Quiz + rubric/answers**: `ela-reading-comprehension-quiz.md` (6th-grade ELA)
- **Test + key**: `science-cell-biology-test.md` (HS biology)
- **Project + rubric**: `social-studies-civics-project.md` (middle-school civics)
- **Practice/Study**: `elementary-math-practice.md` (3rd-grade), `bible-verse-memory-study.md` (public-domain verse, PD text)

**Index**: See `README.md` for full list, class_type, kind, grade_level, license headers in each file.

## Usage in QA
1. Copy relevant .md as mock upload for student capture flow.
2. Use embedded answer keys/rubrics for teacher grading/approve simulation.
3. Frontmatter (license, class_type, kind) aids matching/assign testing.
4. Keep diffs easy; text format supports token counts for AI grading tests.
5. For calendar/landing: pair with date fields or mock student views (these provide content payloads).

## Size Check
- Total dir: 32K (du -sh)
- 8 files, max per file ~2KB
- No bloat. Well under any upload/scan limits. All original or PD.

## Coverage by Kind/Class
- **Kinds covered**: homework (2), quiz (1), test (1), project (1), practice/study (2)
- **Classes covered**: math (algebra + elementary), ELA, science, social studies, elective (music), elective (Bible/religion)
- **Grade levels**: 3rd, 6th, 8th, HS, middle
- **Flows supported**: assign, grade, capture, review. Calendar/landing content can reuse these payloads.

## Gaps Flagged (by kind/class)
- No explicit calendar event fixtures (e.g., due-date only samples) — use dates from homework files.
- No dedicated landing-page mock (student view examples) — these are assignment bodies, not UI mocks.
- No elementary science or high-school ELA — but coverage is broad; add only if specific flow test requires.
- All license-clean (CC0/PD); nothing copyright-unsafe or scraped.
- No huge binaries or PII.

**Verdict**: Usable immediately for Kelyra QA (assign/grade/calendar/landing content testing). Testers can pick without hunting. No changes needed. Do not expand without CoS/CEO approval per constraints.

## References
- Parent research handoff: t_9e7be8d5 (README + samples created)
- All files declare license in YAML frontmatter.
- No app code touched. No P2/P3 work started.

Ready for use. Size and license verified.