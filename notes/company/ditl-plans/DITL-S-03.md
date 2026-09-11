# DITL-S-03 — Student messages + focus

| Field | Value |
|-------|-------|
| Plan ID | DITL-S-03 |
| Title | Student: send/reply messages; complete focus exercise |
| Primary hat | student |
| Support | SUPPORTED messages.use student; focus via assigned practice / to-do |
| Regression tags | `student`, `messages`, `focus`, `todo`, `ask-dual`, `chrome-student`, `auth` |
| CEO story | 7 — Student messages + focus |

## Goal / story

Student sends and replies to messages, and completes a focus exercise (shipped as focus-linked practice / assigned set — not a separate invented module). Dual path UI + Ask.

## Preconditions / fixtures

- F-STUDENT-LOGIN S1; messaging thread with teacher or allowed peer per v1 rules
- F-FOCUS: assigned practice tied to current_focus_skill or labeled focus work
- Second class optional

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in student | SUPPORTED | `/sign-in` tray 6 | — |
| 2 | Open Messages | SUPPORTED | header mail / `/messages` | `/ask` `list_threads` / `my_unread_messages` |
| 3 | Send new message (allowed counterparty) | SUPPORTED | thread composer | `/ask` `send_message` |
| 4 | Reply on existing thread | SUPPORTED | `/messages/{id}` | Ask `list_thread_messages` + `send_message` |
| 5 | Reverse: discard unsent draft | SUPPORTED | back without send | abandon Ask turn |
| 6 | Open focus work / practice | SUPPORTED | `/todo` or assignment; focus cue on grades/Home if shown | `/ask` `list_my_practice`; `open_screen` to assigned practice only |
| 7 | Complete + submit focus exercise | SUPPORTED | practice items → submit | Ask cannot fill answers as solver — **UI-primary submit**; Ask may hint only if practice-help path, never graded final answers |
| 8 | Confirm Done / completion state | SUPPORTED | To Do Done | Ask `list_my_practice` status |
| 9 | FERPA: no classmate scores via messages/Ask | SUPPORTED | — | student Ask refuse walls |
| 10 | Multiplicity: second thread; second assignment isolation | SUPPORTED | UI | Ask |
| 11 | Sign out (does not unenroll) | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / non-goals

- Lifecycle: message send/reply → focus complete → sign-out
- Reverse: discard drafts; abandon practice mid-way
- Dual-hat: N/A
- Non-goals: student Ride; student create class; Ask solving graded quiz; diary required (see S-02)

## Suggested QE themes

send_message RLS; focus submit Done; Ask not a homework solver; dual-path message parity.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — messages; focus practice submit.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Student messages `ditl-` | residual if no delete | send | threads marked |
| Focus practice submission | reset like S-01 | UI-primary | submissions baseline |

**Order:** reset submission → sign out.
