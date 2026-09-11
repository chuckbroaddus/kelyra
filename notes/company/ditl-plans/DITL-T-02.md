# DITL-T-02 — Teacher Grade and Assign (web)

| Field | Value |
|-------|-------|
| Plan ID | DITL-T-02 |
| Title | Teacher afternoon web: Approve gaps, assign practice, grade book, syllabus |
| Primary hat | teacher |
| Other hats | none |
| Support | SUPPORTED M6–M9; AVG syllabus teacher path; web Approve alternate to Pack B phone (KEYGRADE) |
| Regression tags | `approve`, `assign`, `gradebook`, `avg`, `syllabus`, `keygrade`, `chrome-teacher`, `web`, `ask-dual` |
| KEYGRADE | Web Approve remains valid alternate; phone Pack B Approve is **allowed** (see T-01) — this plan must **not** claim phone Approve is forbidden |

## Goal / story

After class, on web/tablet width, teacher clears Needs drafts: opens student work, Approves named gaps (nothing is a grade before Approve), generates/assigns short practice, scores a submission, checks grade book and published syllabus weights. Ends with sign-out.

**KEYGRADE note (Pack B / CEO #4):** This plan covers the **web** Approve / bulk / multi-class desk path. Phone Pack B confirm+Approve on Capture review is in-scope on **DITL-T-01** and is a valid v1 path — **do not** treat phone Approve as forbidden or out-of-product. Web Approve remains a valid alternate, not exclusive.

## Preconditions / fixtures

- Teacher; class with drafts waiting Approve; ≥1 student with capture analyzed.
- ≥1 student submission ready to score optional.
- Syllabus: draft or published fixture (weights sum rules).
- Prefer width ≥720 for top tab chrome.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in teacher (web) | `/sign-in` |
| 2 | Desk shows draft/Unassigned counts | `/` or class desk |
| 3 | Needs → open draft item | `/inbox` |
| 4 | Student record: review gaps photo | `/class/{id}/student/{sid}` |
| 5 | Approve gap (or edit then Approve); confirm pre-Approve hidden from family | student + gradebook |
| 6 | Generate practice from approved gap; tweak/discard regenerate as allowed | assign flow |
| 7 | Assign set to that student | assignment form |
| 8 | Grade book: score/mark after Approve path | `/class/{id}/gradebook` |
| 9 | Class setup / syllabus card: open syllabus editor | `/class/{id}/setup`, `/class/{id}/syllabus` |
| 10 | Publish only when weights valid; or unpublish (lifecycle) | syllabus |
| 11 | **Reverse:** dismiss/delete draft gap; confirm focus retarget rules | student record |
| 12 | Second student same class — no cross-file | student B |
| 13 | Optional second class independence | class switch |
| 14 | Sign out | hamburger |

## Lifecycle

Draft → Approve (web) → assign → score; syllabus draft → publish/unpublish; sign-out. Keyed captures may already be phone-Approved via T-01 Pack B; web Approve still valid for remaining drafts / bulk.

## Multiplicity

Multiple students; optional two classes independent syllabus/gradebook.

## Reverse / cancel

Discard generated set; unpublish syllabus; delete draft gap; navigate away before Approve.

## Dual-hat

None. syllabus.manage teacher seat only.

## Functions exercised

Approve gate; practice generate/assign; gradebook; syllabus AVG; Needs; student person page.

## Explicit non-goals

SIS passback; weighted district report; office syllabus policy; auto-publish AI grades; rewards; office/superintendent KEYGRADE chrome; claiming that Approve is phone-forbidden (phone Pack B Approve is allowed on T-01).

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Needs open draft | `/inbox` | `list_inbox` |
| Approve gap / keyed draft (web) | student record Approve | `approve_capture` (capability) — web alternate; phone Pack B also valid (T-01) |
| Generate/assign practice | assign UI | `create_assignment` / revise_practice_page |
| Gradebook score | `/class/{id}/gradebook` | `list_grade_cells`; score write **PARTIAL** if no write tool |
| Syllabus publish/unpublish | `/class/{id}/syllabus` | `scan_class_syllabus` / draft get/discard / published get |
| Delete draft gap | UI | `delete_gap` |
| Second student isolation | student B | Ask must not cross-file |

Deep authoring day expansion lives in **DITL-T-04**; T-02 remains Approve/assign/syllabus core.

## Suggested QE themes

Approve-before-visible; assignment 3–8 items; syllabus sum 100; class isolation; Ask approve parity; web Approve still works when phone Pack B path also exists (neither exclusive).

## Artifacts + DB assert (refine-2)

Consumes captures from T-01 / F-DRAFTS. After Approve: `skill_gaps.status` approved; optional `students.current_focus_skill_id`; assignment/submission cells only after teacher score. Syllabus weights sum 100 when published.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — approvals, gaps, practice, scores, syllabus state.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Approved gaps / focus | delete gap or retarget focus | `delete_gap` | `skill_gaps`; `students.current_focus_skill_id` → fixture baseline |
| practice_sets + assignments `ditl-*` | delete assignment / discard practice | tools if listed else UI | `assignments`, `practice_sets`, `submissions` for ditl titles |
| Graded cells on test work | prefer delete test assignment | PARTIAL Ask score | no graded cell on ditl-only assignment |
| Syllabus draft/publish | unpublish / discard draft | `discard_class_syllabus_draft` | published weights = fixture baseline |
| Captures consumed | delete if test-only | PARTIAL | `captures` clean |

**Order:** unpublish syllabus → delete assignments/submissions → delete practice → delete gaps → restore focus → delete leftover captures.
**Isolation:** titles/prefix `ditl-`; never wipe whole class gradebook seed outside run.

## Changelog

- **2026-09-10 (t_21f95d30):** KEYGRADE Pack B — clarify web Approve remains; must **not** claim phone Approve is forbidden (phone path = T-01).
