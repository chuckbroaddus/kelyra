# DITL-DH-01 — Dual-hat Teacher+Parent mixed day (BATCH-v1 UPDATE)

| Field | Value |
|-------|-------|
| Plan ID | DITL-DH-01 |
| Title | Dual-hat: AM teacher capture (+ Pack B phone Approve) + BATCH-v1 stack on Teach seat only; PM Parent seat Ride + child grades |
| Primary hat | teacher (job of record) + parent_id hat |
| Other hats | switches to parent seat |
| Support | SUPPORTED hats / seat switch (ui-design §31.4b); KEYGRADE Teach-seat phone Approve / Parent never Approve; BATCH-v1 stack chrome Teach seat only (CE-A) |
| Regression tags | `dual-hat`, `seat-switch`, `capture`, `approve`, `keygrade`, `ride`, `grades`, `chrome-teacher`, `chrome-parent`, `ask-dual`, `batch-ingest` |
| KEYGRADE | Teach seat may Pack B phone-Approve keyed captures; Parent seat must **not** Approve or see drafts |
| BATCH | Upload stack / Split Review **only** on Teach seat. Parent seat: **zero** stack entry (not a disabled mystery button). Phone gate honesty remains Teach-session status / “open on computer.” |

## Goal / story

Same login is a teacher and a parent of a student (not necessarily own class). Morning: teach on teacher seat (capture; optional **Pack B phone confirm+Approve** on keyed work for **own classes** only; optional **BATCH-v1 web Upload class stack** on **Teach seat only** — bind class, Split Review, Confirm → captures). Afternoon: **altitude switch to Parent seat** (not merely My children deep-link) so tray becomes Home · Ride · Ask, check child **post-Approve** grades only (M11), Ride pickup, then switch back to Teach and sign out. **Parent seat must never Approve** keyed drafts; no draft/extract leak across seat; **no Upload stack / Split Review / Needs batch chrome on Parent seat**.

## Preconditions / fixtures

- Profile: `role=teacher` with `parent_id` linked to ≥1 child (prefer child in another teacher’s class to stress walls).
- Teacher class roster + capture-ready work.
- Parent vehicles + Ride lines.
- `canChooseSeat` / drawer rows **Parent** and **Teach** per ui-design.
- **BATCH (optional beat):** web on Teach seat; synthetic stack under `notes/qa-fixtures/batch-ingest/`.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in; land teacher seat | `/sign-in` → teacher tray |
| 2 | Drawer: both **My children** (deep-link) and **Parent** (seat switch) visible as designed | hamburger |
| 3 | Capture one file on own class | `/capture` |
| 3b | Optional keyed: Pack B confirm + **phone Approve** on Teach seat only (own class) | `/capture` review |
| 3c | **BATCH-v1 (Teach only):** Upload class stack on web; bind one class; Split Review; Confirm → captures/Inbox | web CE-A / SR-A (Teach seat) |
| 3d | **Assert no Parent stack:** after optional peek at Parent seat chrome (or drawer), Upload stack / Split Review entry is **absent** (zero discovery) | Parent chrome |
| 4 | **My children** deep-link: opens `/parent` **without** flipping tray to parent (no Ride tab under teacher chrome); no Approve chrome here; **no** stack upload | `/parent` under staff chrome |
| 5 | Back; confirm still teacher tray (Desk…Ask) | tray |
| 6 | Drawer **Parent** altitude switch → atomic rebuild tray Home·Ride·Ask | seat switch |
| 7 | Parent Home: own children only; post-Approve cells only; **no** Approve / draft / extract; no teacher gradebook write; **no** Upload stack | `/parent` |
| 8 | Ride check-in for linked child | `/parent/ride` |
| 9 | Leave line | `/parent/ride` |
| 10 | Ask on parent seat (parent context) — Ask must not expose class-stack tools | `/ask` |
| 11 | Drawer **Teach** switch back; tray teacher 5; wordmark from new seat only; stack entry available again only on Teach | seat switch |
| 12 | Confirm no concatenated trays / no Ride on teacher | tray |
| 13 | Sign out | hamburger |

## Lifecycle

Teacher session (capture → optional Pack B phone Approve → optional BATCH stack on Teach) → parent seat (published grades only; never Approve; never stack) → enter/leave Ride → return Teach → sign-out. Seat switch is full lifecycle both directions.

**BATCH seat law:** Active seat owns chrome. Teach → stack allowed. Parent → zero stack. Dirty mid-batch: seat switch must discard/confirm per product — do not silently continue Split Review under Parent chrome.

## Multiplicity

Own class students vs own children; must not blend. Teach-seat Approve on own classes only; Parent seat never Approves. BATCH packets stay on Teach-bound class; Parent never sees classmates’ stack PII tools.

## Reverse / cancel

My children without seat flip; leave Ride; switch back Teach; Cancel open batch on Teach before Confirm.

## Dual-hat

Core of this plan. Office not required. Parent/Student/Office DITL plans **unchanged** by BATCH-v1.

## Functions exercised

Seat switch atomic; dual drawer paths; capture; parent Home; Ride; Ask per seat; Teach-only BATCH stack entry + absence on Parent.

## Explicit non-goals

Teacher editing own child’s official grades via parent seat; Parent-seat KEYGRADE Approve or draft visibility; office Manage; inventing dual chrome mash; office/superintendent KEYGRADE chrome; **Parent-seat Upload stack / Split Review / Needs batch tools**; hot-folder; NEW_DITL.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Capture on Teach seat | `/capture` | PHYSICAL-ONLY |
| Pack B phone Approve (Teach only) | `/capture` review Approve | UI/`approve_capture`; **forbidden** on Parent seat |
| BATCH Upload stack (Teach only) | web CE-A / SR-A | —; Ask must not Confirm split; **forbidden** on Parent seat |
| My children deep-link | drawer My children → `/parent` staff chrome | Ask must not flip seat; no Approve; no stack |
| Parent seat switch | drawer **Parent** | no Ask seat-switch tool — **UI-primary** altitude |
| Parent grades / Ride | `/parent`, `/parent/ride` | Ask parent tools only **after** Parent seat; Ride PHYSICAL |
| Ask per seat | tray Ask | teacher ops vs parent co-teacher walls; no class-stack on Parent |
| Teach switch back | drawer Teach | UI-primary |

## Suggested QE themes

P-06 tray rebuild; Ride requires Parent seat; My children ≠ Ride menu; Ask walls follow seat; Teach seat may phone-Approve keyed; Parent seat cannot Approve / cannot see drafts; **BATCH only on Teach; Parent has zero stack discovery; phone gate honesty does not appear as Parent primary Split Review**.

## Artifacts + DB assert (refine-2)

| Beat | Fixture artifact | Format / subject | DB fields to assert |
|------|------------------|------------------|---------------------|
| 3 / 3b | T-01 capture fixtures | own-class capture | Teach-only Approve |
| 3c BATCH | `F-ART-BATCH-MATH-25P.pdf` (`notes/qa-fixtures/batch-ingest/`) | Teach stack | captures.class_id Teach-bound; no Parent-visible draft/extract |

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — teacher captures + parent Ride + optional batch.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Teacher-seat captures / BATCH | delete captures (T-01 rules); cancel open batch | PARTIAL | captures/assets clean for run |
| Parent-seat Ride events | leave line | GAP | no live trip |
| Seat switch | return Teach seat then sign out | — | profile seats unchanged |

**Order:** leave Ride → switch Teach → cancel open batch → delete captures → sign out.
**Isolation:** dual-hat fixture F-DH-TP not deleted.

## Changelog

- **2026-09-10 (t_21f95d30):** KEYGRADE Pack B — Teach seat may phone-Approve keyed captures; Parent seat must not Approve or see drafts.
- **2026-09-12 (t_407a9f4a / IQG-BATCH UPDATE_PLANS):** BATCH-v1 — stack only on Teach seat; zero stack on Parent; phone gate honesty; fixtures `notes/qa-fixtures/batch-ingest/`; no NEW_DITL; Parent/Student/Office DITL unchanged.
