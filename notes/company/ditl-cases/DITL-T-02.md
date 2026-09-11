# DITL-T-02 Cases (Teacher Grade and Assign web)

**Plan:** [DITL-T-02](../ditl-plans/DITL-T-02.md)
**KEYGRADE note (Pack B / CEO #4):** This file covers the **web** Approve / bulk / multi-class desk path. Phone Pack B confirm+Approve on Capture review is in-scope on **DITL-T-01** and is a valid v1 path — **do not** treat phone Approve as forbidden or out-of-product. Web Approve coexists with the T-01 phone path; neither is exclusive.
**Preconditions (all cases):** F-TEACHER-A=`ditl-teacher-a`, C-MATH with S1–S5, F-DRAFTS (or captures waiting Approve), published assignments / web ≥720 where noted, passwords `DITL-teacher-test`. Teach seat.

**DITL-T-02-UI-01** | tags: grades, assign, web, teacher, approve, keygrade
- Pre: F-TEACHER-A (`ditl-teacher-a`), S1=`Jordan Lee`, drafts waiting Approve on web (F-DRAFTS) and/or keyed draft not yet phone-Approved; passwords `DITL-teacher-test`. Web width.
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test` → teacher seat.
  2. Open gradebook at `/class/{id}/gradebook` and/or student page for S1.
  3. Assign / Approve grade path on web for S1 Math submission (gap Approve or keyed draft Approve).
  4. Publish / confirm post-Approve visibility.
  5. Note: if a sibling capture was already phone-Approved via T-01 Pack B, web path still works for remaining drafts — do **not** fail the case because phone Approve also exists.
- Expected: Grade visible to parent post-Approve; no mutation from parent; nothing is a grade before Approve. Phone Pack B Approve (T-01) remains allowed in product.
- Artifact: none (consumes F-DRAFTS / T-01 captures)
- DB assert: grades / skill_gaps / approved path updated; published flag as product defines
- Teardown: reset grade/gap if needed, sign out.
- PARTIAL/GAP: none

**DITL-T-02-UI-02** | tags: grades, assign, web
- Pre: same; class drafts for S1–S5.
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Bulk assign / Approve for class via gradebook or student pages as product allows.
  3. Verify all S1–S5 updated where drafts existed.
- Expected: All targeted students updated; class isolation held.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-02-UI-03** | tags: grades, assign, web, avg
- Pre: same + F-AVG / syllabus weights on C-MATH when required.
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Weighted overall calc check in gradebook.
  3. Confirm avg per syllabus/spec (sum 100 when published).
- Expected: Avg correct per spec.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-02-UI-04** | tags: grades, assign, web, parent-visible
- Pre: same; at least one Approved grade for S1.
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Complete Approve path (web) for a draft if needed.
  3. Check parent-visible surface (invite-link / Home progress M11) for S1 — post-Approve only.
- Expected: Visible in parent home post-Approve; drafts never shown to family.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-02-UI-05** | tags: grades, approve, web, keygrade, coexistence
- Pre: One keyed capture already phone-Approved via Pack B (T-01-UI-05) for S4 or S5; another draft still waiting on web for S1.
- Steps (UI):
  1. Sign in as F-TEACHER-A on web.
  2. Confirm phone-Approved keyed cell remains published (do not require re-Approve on web).
  3. Approve remaining S1 draft on web.
- Expected: Web Approve coexists with T-01 phone Pack B path; neither forbids the other; no claim that Approve is phone-only or web-only.
- Teardown: sign out; reset test cells if needed.
- PARTIAL/GAP: none (skip only if no dual-path fixtures — then mark PARTIAL with reason)

**DITL-T-02-ASK-01** | tags: ask, grades, approve
- Pre: same teacher session context.
- Steps (Ask):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Use `/ask` teacher grade view / Approve if tools appear.
  3. Confirm Ask cannot silently publish `approved_score` without teacher UI Approve (web or Pack B phone).
- Expected: GAP noted if full grade tools missing; Ask Approve must fail closed.
- Teardown: sign out.
- PARTIAL/GAP: full grade tools = PARTIAL/GAP on Ask; Ask Approve = non-goal
