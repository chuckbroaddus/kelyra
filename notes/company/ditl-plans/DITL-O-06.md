# DITL-O-06 — Alerts + school feed

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-06 |
| Title | Office/Super: send alert notification + school feed message |
| Primary hat | administrator **and** superintendent |
| Support | SUPPORTED UI create_feed_post kind alert|post; Ask create PARTIAL/GAP |
| Regression tags | `office`, `alerts`, `feeds`, `messages`, `ask-dual`, `ferpa` |
| CEO story | 5 — Alerts + school feed |

## Goal / story

Office sends an **alert** notification and a **school feed** post. Recipients see alert vs ordinary post per messaging-v1. Dual path: UI composer required; Ask create tagged GAP if no tool.

## Preconditions / fixtures

- F-FEED, F-OFFICE, families/teachers who can see school audience
- Prefer one class feed contrast optional

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office | SUPPORTED | `/sign-in` | — |
| 2 | Open Feed tab | SUPPORTED | `/?tab=feed` or `/feed` | Ask `open_screen` / `list_feed` |
| 3 | Compose **alert** (kind=alert) | SUPPORTED | FeedPane kind Alert + publish `create_feed_post` | **PARTIAL/GAP** no create_feed tool; may draft text only |
| 4 | Verify alert surfaces in Messages/Alerts / notifications | SUPPORTED | header mail Alerts tab / `/notifications` | Ask `my_unread_messages` / list threads — may not equal alert fan-out |
| 5 | Compose school **feed post** (kind=post) | SUPPORTED | Feed composer post | Ask create GAP; `list_feed` readback after UI post |
| 6 | Optional reply under post (not alert) | SUPPORTED | feed reply composer | Ask GAP |
| 7 | Reverse: discard unsent composer | SUPPORTED | back without send | Ask abandon turn |
| 8 | Multiplicity: second alert does not mash threads | SUPPORTED | feed | list_feed |
| 9 | FERPA: no student grade PII in blast | SUPPORTED | body review | Ask must refuse grade blast |
| 10 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / non-goals

- Lifecycle: alert → post → verify → sign-out
- Reverse: discard draft; no requirement to unsend if product has none
- Non-goals: SMS/email digest; class-sized chat; inventing Ask post tool

## Suggested QE themes

Alert≠post; office author; Ask GAP filed; no grade leak in body.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — feed posts / alerts.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| School feed / alert posts `ditl-` | delete/archive if UI | create **GAP**; delete **GAP** | feed/alert rows with ditl body gone |

**Order:** delete test posts → sign out. Idempotent.
