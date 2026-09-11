# DITL-T-03 — Teacher Messages + Needs

| Field | Value |
|-------|-------|
| Plan ID | DITL-T-03 |
| Title | Teacher: messages, alerts, search, parent person, Needs triage |
| Primary hat | teacher |
| Other hats | none |
| Support | SUPPORTED messaging v1 + Needs inbox |
| Regression tags | `messages`, `inbox`, `search`, `parents`, `chrome-teacher`, `auth`, `ask-dual` |

## Goal / story

Between blocks, teacher clears communication and filing debt: reads alerts via Messages center, replies to a parent, finds a student via Search, opens parent directory on class, triages Needs without full Approve session (pointer to T-02).

## Preconditions / fixtures

- Teacher; class with parents linked to students.
- Unread alert and/or existing message thread.
- ≥1 Needs item (Unassigned or draft).

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in teacher | `/sign-in` |
| 2 | Header messages badge → `/messages` | header mail |
| 3 | PersonTabs: Messages / Alerts (and feed tabs if present) | `/messages` |
| 4 | Open alert detail if any | `/notifications/{id}` or alerts tab |
| 5 | Open 1:1 parent thread; reply | `/messages/{id}` |
| 6 | **Reverse:** back without send; draft discard | composer |
| 7 | Search glass → find student by name | `/search` |
| 8 | Open student record from search | `/class/{id}/student/{sid}` |
| 9 | Class → Parents directory | `/class/{id}/parents` |
| 10 | Open parent person page | `/class/{id}/parent/{pid}` |
| 11 | Needs triage list only (no full Approve mandatory) | `/inbox` |
| 12 | Ask optional quick question about class (not grade write) | `/ask` |
| 13 | Sign out | hamburger |

## Lifecycle

Sign-in → comms/search/people → sign-out.

## Multiplicity

Multiple threads; class-scoped parents list.

## Reverse / cancel

Discard message; close search; leave Needs unapproved.

## Dual-hat

None.

## Functions exercised

Messages; alerts badge; search; class parents; Needs; Ask.

## Explicit non-goals

Group chat product expansion; SMS; email digest; SIS contacts import.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Messages / Alerts tabs | header → `/messages` | `list_threads` / `my_unread_messages` |
| Reply parent | composer | `send_message` |
| Search student | `/search` | `search_students` / `list_roster` |
| Class parents directory | `/class/{id}/parents` | `search_parents` / `get_parent` |
| Needs triage | `/inbox` | `list_inbox` |
| Ask class question | tray Ask | same — no grade write |

## Suggested QE themes

Badge=alerts not DM count; parent thread RLS; search does not invent students; Ask send_message parity.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — messages; optional inbox file.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Teacher↔parent messages (`ditl-` body) | delete if UI allows else residual OK | send only; delete GAP | threads with ditl marker |
| Needs refile Unassigned | leave filed or delete capture | `list_inbox` | no extra Unassigned from run |

**Order:** optional capture delete → sign out.
