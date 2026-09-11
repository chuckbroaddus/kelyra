# DITL-P-02 — Parent PM homework Ask + message

| Field | Value |
|-------|-------|
| Plan ID | DITL-P-02 |
| Title | Parent evening: review work, Ask help strategy, message teacher |
| Primary hat | parent |
| Other hats | none |
| Support | SUPPORTED Ask + messaging; SUPPORTED/PARTIAL assignment visibility on parent |
| Regression tags | `auth`, `ask`, `messages`, `grades`, `assignments`, `chrome-parent`, `ask-dual` |

## Goal / story

After school, a parent helps with homework: opens Parent Home for the child who has work due, reviews what is assigned/focus, uses Ask (parent context) to get a help strategy (not a grade), messages the teacher about one concern, then signs out. No Ride required in this plan.

## Preconditions / fixtures

- Parent with ≥1 linked child; child has at least one assigned practice or visible upcoming work and a teacher-approved focus skill when available.
- Messaging v1 enabled; parent can open a 1:1 thread with the child’s teacher (directory RLS as shipped).
- Ask available on parent tray.
- Prefer evening fixture: assignment not yet submitted or recently graded.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in parent | `/sign-in` |
| 2 | Home → select child with homework | `/parent` |
| 3 | Review progress / assignments cues / focus one-liner | `/parent` |
| 4 | If grades drill-down exists, open it; else stay Home (PARTIAL note) | `/parent` or `/parent/grades` |
| 5 | Tray **Ask** — ask how to help child on named skill/assignment ground | `/ask` |
| 6 | Confirm Ask does not publish grades; new chat / history behaves | `/ask` |
| 7 | Header **Messages** → open or start teacher thread | `/messages`, `/messages/{id}` |
| 8 | Send one message; optional attach if UI offers (photo of worksheet) | thread composer |
| 9 | **Reverse:** discard unsent composer draft / back without send | `/messages/{id}` |
| 10 | Return Home; switch child if multi; confirm no cross-child message bleed | `/parent` |
| 11 | Sign out | hamburger |

## Lifecycle

Login → help loop → sign-out. No Ride enter/leave.

## Multiplicity

If two children, switch chips between Ask/message contexts; threads stay person-scoped.

## Reverse / cancel

Abandon Ask turn; discard message draft; back from thread list.

## Dual-hat

None.

## Functions exercised

Parent Home; Ask parent; Messages 1:1; assignment/focus read; auth.

## Explicit non-goals

Ride. Teacher Approve. Student submit. Tutor chat product. Weekly email digest. Parent editing teacher academic fields.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Home child + homework cues | `/parent` | `my_children_progress` |
| Grades drill-down | `/parent` or `/parent/grades` | `explain_my_class_average` / published syllabus read |
| Help strategy on skill/assignment | tray **Ask** (already primary) | same `/ask` — dual means still verify header Messages path separately |
| Message teacher | `/messages` composer | `list_threads` + `send_message` |
| Discard draft | UI back | abandon Ask turn / new chat |
| Sibling isolation | chips | Ask child ground walls |

This plan already centers Ask; refine requires **explicit UI message path** and **Ask message tools** both pass.

## Suggested QE themes

Ask ground with assignment; message send UI+tool; sibling isolation; no grade mutation via Ask.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — messages; Ask thread history.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Parent→teacher message(s) | Tag body `ditl-`; delete if UI exists | `send_message` only; delete **GAP** | message/thread rows with `ditl-` for this parent |
| Ask chat turns | **New chat** archives open thread | same | `ask_threads` / `ask_messages` — archive OK |

**Isolation:** `ditl-` message prefix. Do not delete real family threads outside run.
**Order:** finish sends → New chat → sign out. Idempotent.
