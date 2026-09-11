# DITL-DH-01 — Dual-hat Teacher+Parent mixed day

| Field | Value |
|-------|-------|
| Plan ID | DITL-DH-01 |
| Title | Dual-hat: AM teacher capture (+ Pack B phone Approve), PM Parent seat Ride + child grades |
| Primary hat | teacher (job of record) + parent_id hat |
| Other hats | switches to parent seat |
| Support | SUPPORTED hats / seat switch (ui-design §31.4b); KEYGRADE Teach-seat phone Approve / Parent never Approve |
| Regression tags | `dual-hat`, `seat-switch`, `capture`, `approve`, `keygrade`, `ride`, `grades`, `chrome-teacher`, `chrome-parent`, `ask-dual` |
| KEYGRADE | Teach seat may Pack B phone-Approve keyed captures; Parent seat must **not** Approve or see drafts |

## Goal / story

Same login is a teacher and a parent of a student (not necessarily own class). Morning: teach on teacher seat (capture; optional **Pack B phone confirm+Approve** on keyed work for **own classes** only). Afternoon: **altitude switch to Parent seat** (not merely My children deep-link) so tray becomes Home · Ride · Ask, check child **post-Approve** grades only (M11), Ride pickup, then switch back to Teach and sign out. **Parent seat must never Approve** keyed drafts; no draft/extract leak across seat.

## Preconditions / fixtures

- Profile: `role=teacher` with `parent_id` linked to ≥1 child (prefer child in another teacher’s class to stress walls).
- Teacher class roster + capture-ready work.
- Parent vehicles + Ride lines.
- `canChooseSeat` / drawer rows **Parent** and **Teach** per ui-design.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in; land teacher seat | `/sign-in` → teacher tray |
| 2 | Drawer: both **My children** (deep-link) and **Parent** (seat switch) visible as designed | hamburger |
| 3 | Capture one file on own class | `/capture` |
| 3b | Optional keyed: Pack B confirm + **phone Approve** on Teach seat only (own class) | `/capture` review |
| 4 | **My children** deep-link: opens `/parent` **without** flipping tray to parent (no Ride tab under teacher chrome); no Approve chrome here | `/parent` under staff chrome |
| 5 | Back; confirm still teacher tray (Desk…Ask) | tray |
| 6 | Drawer **Parent** altitude switch → atomic rebuild tray Home·Ride·Ask | seat switch |
| 7 | Parent Home: own children only; post-Approve cells only; **no** Approve / draft / extract; no teacher gradebook write | `/parent` |
| 8 | Ride check-in for linked child | `/parent/ride` |
| 9 | Leave line | `/parent/ride` |
| 10 | Ask on parent seat (parent context) | `/ask` |
| 11 | Drawer **Teach** switch back; tray teacher 5; wordmark from new seat only | seat switch |
| 12 | Confirm no concatenated trays / no Ride on teacher | tray |
| 13 | Sign out | hamburger |

## Lifecycle

Teacher session (capture → optional Pack B phone Approve) → parent seat (published grades only; never Approve) → enter/leave Ride → return Teach → sign-out. Seat switch is full lifecycle both directions.

## Multiplicity

Own class students vs own children; must not blend. Teach-seat Approve on own classes only; Parent seat never Approves.

## Reverse / cancel

My children without seat flip; leave Ride; switch back Teach.

## Dual-hat

Core of this plan. Office not required.

## Functions exercised

Seat switch atomic; dual drawer paths; capture; parent Home; Ride; Ask per seat.

## Explicit non-goals

Teacher editing own child’s official grades via parent seat; Parent-seat KEYGRADE Approve or draft visibility; office Manage; inventing dual chrome mash; office/superintendent KEYGRADE chrome.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Capture on Teach seat | `/capture` | PHYSICAL-ONLY |
| Pack B phone Approve (Teach only) | `/capture` review Approve | UI/`approve_capture`; **forbidden** on Parent seat |
| My children deep-link | drawer My children → `/parent` staff chrome | Ask must not flip seat; no Approve |
| Parent seat switch | drawer **Parent** | no Ask seat-switch tool — **UI-primary** altitude |
| Parent grades / Ride | `/parent`, `/parent/ride` | Ask parent tools only **after** Parent seat; Ride PHYSICAL |
| Ask per seat | tray Ask | teacher ops vs parent co-teacher walls |
| Teach switch back | drawer Teach | UI-primary |

## Suggested QE themes

P-06 tray rebuild; Ride requires Parent seat; My children ≠ Ride menu; Ask walls follow seat; Teach seat may phone-Approve keyed; Parent seat cannot Approve / cannot see drafts.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — teacher captures + parent Ride.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Teacher-seat captures | delete captures (T-01 rules) | PARTIAL | captures/assets clean for run |
| Parent-seat Ride events | leave line | GAP | no live trip |
| Seat switch | return Teach seat then sign out | — | profile seats unchanged |

**Order:** leave Ride → switch Teach → delete captures → sign out.
**Isolation:** dual-hat fixture F-DH-TP not deleted.

## Changelog

- **2026-09-10 (t_21f95d30):** KEYGRADE Pack B — Teach seat may phone-Approve keyed captures; Parent seat must not Approve or see drafts.
