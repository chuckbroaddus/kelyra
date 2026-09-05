# LATEX-P1: Spec — GAUTH LaTeX display

**Date:** 2026-09-04  
**Card:** `t_d1f63e6b`  
**Depends on:** `notes/company/gauth-latex-research.md` (R1)  
**Status:** Spec only — no app code.

---

## 0. Job

Show **rendered math** wherever GAUTH shows model or teacher-edited steps. Not a grade. Not a CAS. Student cheat walls unchanged.

## 1. Surfaces (v1)

| Surface | Hat | Render |
|---|---|---|
| Teacher Explain draft (`ExplainDraftCard`, steps + reteach) | Teacher | Yes |
| Attach-as-note (copied draft) | Teacher | Yes |
| Ask message bubbles (teacher + parent co-teacher) | Teacher / parent | Yes |
| Practice Help hints / next step / check-work | Student (help_mode on) / parent helping | Yes |
| Parent Explain (ephemeral) | Parent of linked child | Yes |

Out of v1: lesson HTML player, gradebook cells, splash, composer input (editing raw TeX is OK).

## 2. Delimiters

Detect and render: `$...$`, `$$...$$`, `\(...\)`, `\[...\]`. Unmatched delimiter → show source. Nested `$` inside `$$` not required.

## 3. Behavior

- Success: glyphs, not source.
- Failure / unsupported command: **original source** as plain text, never a blank hole.
- Phone: inline wrap; display-mode may scroll horizontally.
- Theme: inherit `useTheme()` foreground. No new icons.
- Does not Approve, does not write scores, does not create classes.

## 4. Non-goals

MathLive editor, handwriting, CAS, MathJax, training on pages, changing G0/G4/parent_of walls.

## 5. Acceptance (product)

Teacher/parent/student (allowed Help) sees `$\frac{1}{2}$` as a fraction on web and phone. XSS: model cannot inject a script via TeX. GATE `t_f94b0722` before implement `t_921408e0`.
