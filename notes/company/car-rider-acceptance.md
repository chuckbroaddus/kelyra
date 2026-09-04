# RIDE-Q1: Acceptance plan — car-rider (not a Build send)

**Date:** 2026-09-04
**Author:** qa-supervisor
**Ticket:** t_09e9d30d
**Status:** **PLAN ONLY** — not a Build send, not a release cert, not kelyra-qa-loop.
**Gate:** Implementation remains forbidden until Chuck later says **send**. Developers will not self-certify.

**Depends on (read-only pack):**

| Artifact | Role in this plan |
|---|---|
| `notes/company/car-rider-plan.md` (RIDE-P1) | Hats, Family ID, check-in mechanic, visibility, AI, phases |
| `notes/company/car-rider-architecture.md` (RIDE-A1) | `households`, duty, `queue_events`, RPCs, offline, order source |
| `notes/company/car-rider-security.md` (RIDE-S1) | Must-fix RIDE-S1-01…16 + future loop tests §6 |
| `notes/company/car-rider-research.md` (RIDE-R1) | Problem framing (context only) |

**Non-goals of this ticket**

- No app code, migrations, Edge, Ask tool registration, or SQL apply.
- No `kelyra-qa-loop` / `author-qa-loop`.
- No release sign-off and no eng staffing authorization.
- No inventing ANPR/RFID/GPS order, public dismissal URL, auto-release, twin mash-up, or `is_staff` widen.

---

## 0. Scope — what "good" means later

When Chuck authorizes implementation, a **future** build loop is accepted only if:

1. Every **P0** row in this matrix has **evidence** (automated test path, RPC/JWT fixture, or scripted UI check with artifact).
2. Every **RIDE-S1-01…RIDE-S1-16** security must-fix is covered (see §3).
3. Explicit **non-acceptance** items (§4.2) are regression-guarded.
4. CoS does **not** treat green unit tests alone as product release; duty walls + twins + parent firehose + no auto-release still need named evidence.
5. Developers do **not** self-certify the epic — CEO send + this plan + loop evidence.

Until then: this file is the contract for that future loop.

### 0.1 Product laws (always fail closed)

| ID | Law | Source |
|---|---|---|
| L1 | Car-rider is **ordered live dismissal** via printed Family ID + staff device — not ANPR, not RFID, not a new parent app, not GPS-as-truth. | P1 §0, A1 §0 |
| L2 | Pickup unit = office-curated **`households`**. Not `parents.id`. Not `parent_students` connected component. | A1 §2, S1-10 |
| L3 | Order source = **server check-in time** (`occurred_at`). Never GPS, client clock rank, or predictive ETA. | A1 §0/§2.7, S1-15 |
| L4 | Staff authz = **`dismissal_duty`** (curb/stage) + office admin this school for office chrome. **Never** widen `is_staff` / `is_staff_profile` / `teaches_class`. | A1 §2.6/§3, S1-05 |
| L5 | **No auto-release.** Tag = possession. Only curb duty `dismissal_release`. Never parent, stage-only, or QR-as-release. | P1 §8, A1 §4.1, S1-11 |
| L6 | Other parents / students / anon / other schools see **nothing** of the live line. Parent: own-household **status enum** only — no position-among-others, no neighbor names. | P1 §6, A1 §3.3, S1-01 |
| L7 | No anonymous `kelyra.app` dismissal URL. Login + RLS. Token-only `/parent` **out** of every dismissal RPC. | A1 §1, S1-06 |
| L8 | Twins / multi-household: unlabeled blend → **empty**. Same Family ID only if office linked one household. Check-in A never stages B across households. | P1 §6, A1 §3.5, S1-04/10 |
| L9 | Writes = RPCs, user JWT, append-mostly `queue_events`. No client INSERT/UPDATE/DELETE. Actor from `auth.uid()`. | A1 §3.2, S1-07 |
| L10 | Reads for UI = RPCs/views with **explicit columns** (`dismissal_queue_live`, `dismissal_household_status`). No parent/duty `SELECT *` base tables. | S1-02 |
| L11 | No table realtime of `queue_events` to parent JWT. Prefer poll or parent-safe view (P3). | S1-03 |
| L12 | Model keys server-side only. No Ask dismissal tool in v1 (UI filter only). Matcher never inserts a student. Teachers do not create classes. | AGENTS + S1-16 |

### 0.2 In scope vs out of scope

**In scope (must prove after CEO send):** households + members; Family ID print/reissue; window flags + day-of override; duty roster; staff keypad/QR check-in; ordered live list; zone filter; curb release confirm; classroom/stage read; offline cache honesty; parent own-status (when P3); RIDE-S1 must-fix.

**Out of scope (do not fail v1 for missing):** ANPR/cameras/RFID/beacons; GPS order or advisory rank; required new parent App Store listing; photo-match; SMS; cross-family carpool; split-custody second household; per-child release; bus routing / aftercare billing; public placard URL; new `IconName` in this epic alone.

---

## 1. Household / duty / no firehose

**Legend**

| Sev | Meaning |
|---|---|
| **P0** | Blocks CEO-authorized ship / loop pass |
| **P1** | Must fix before family-facing release |
| **P2** | Track; may defer with CoS note |

| Type | How to evidence later |
|---|---|
| **U** | Unit (DTO allow-list, code parser, pure policy) |
| **I** | Integration / RPC / RLS with JWT fixtures |
| **UI** | Scripted or dogfood UI on curb / stage / office / parent |
| **S** | Security static + seat JWT matrix |
| **R** | Regression vs frozen surfaces (Desk grade loop, parent_open, Ask) |

### 1.1 Office — households + Family ID

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| O-01 | P0 | I/UI | Create household + `family_code` | Office (`is_school_admin` + same `school_id`) only; code unique among **active** rows this school |
| O-02 | P0 | I | Link students via `office_set_household_students` | Explicit student ids only; **never** invent / matcher insert; never auto from `parent_students` |
| O-03 | P0 | I | Student already on another active household | Reject or require unlink first — v1 **at most one** active household per student |
| O-04 | P0 | I/UI | Reissue Family ID | Void old (`status=void` + generation bump) + mint new; old code/generation fails check-in; `write_audit` |
| O-05 | P0 | I/S | Print / PDF placard (P2) | Office session only; private storage; no public bucket; no forever signed URL (RIDE-S1-12) |
| O-06 | P0 | I | Teacher / parent mint household | **Denied** |
| O-07 | P1 | UI | Day-of window override | Per student `car` \| `aftercare` \| `bus` + zone; no week wizard |
| O-08 | P1 | I/UI | Assign `dismissal_duty` | Office only; curb vs stage; mode/zone null = all; `write_audit` |
| O-09 | P1 | UI | Label (“Chen van”) | Office + duty as needed; **never** other parents |
| O-10 | P2 | — | Standing duty weekday-only | Product open; default all weekdays if unspecified |

### 1.2 Curb duty — check-in / live list

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| C-01 | P0 | UI/I | Keypad enter active Family ID | `dismissal_check_in` → household on live ordered list at **server** `occurred_at` |
| C-02 | P0 | UI/I | Scan QR with phone camera | Same as typed code; QR = `{school_id, family_code, generation}` shortcut — **not** capability token |
| C-03 | P0 | I | Unknown / voided code | Error; **do not** mint household |
| C-04 | P0 | I | Duplicate check-in while already `in_line` | Idempotent no-op; return existing card |
| C-05 | P0 | UI/I | Live list | Large type: position by server time, family code, staged student names, zone/window |
| C-06 | P0 | UI/I | Zone / window filter | Only matching effective mode/zone students appear in staged set |
| C-07 | P0 | I | One household check-in | Stages **all** office-linked members whose effective mode matches this window — never another family’s kids |
| C-08 | P0 | UI/I | Mark `left` | Curb inserts `left`; household drops from live list |
| C-09 | P0 | I/S | Teacher with `is_staff_profile` but **no** duty row | **No** queue, no curb RPCs (RIDE-S1-05) |
| C-10 | P0 | I/S | `teaches_class` office user without duty | No curb RPC; office live list only via `is_school_admin` path |
| C-11 | P1 | UI | Offline | Cached last live payload + “cached at {time}”; outbox replay; server time wins rank on reconnect |
| C-12 | P1 | UI | Device | Existing phone/iPad; landscape OK **after** sign-in; no kiosk unlock URL |

### 1.3 Stage duty — classroom / wing

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| G-01 | P0 | UI/I | Stage duty opens list | Read-only large list; zone/wing filter; auto-refresh |
| G-02 | P0 | I/S | Stage calls `dismissal_release` | **Denied** (RIDE-S1-11) |
| G-03 | P0 | I/S | Stage calls check-in / left | **Denied** unless also curb (role is stage-only) |
| G-04 | P1 | UI | “Who’s next for wing B” | **Client filter** of `dismissal_queue_live` — no Ask tool in v1 |
| G-05 | P0 | I | No duty row (homeroom teacher only) | **Nothing** — bulk-homeroom stage requires duty assignment, not `class_teacher_of` |

### 1.4 Parent — no firehose

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| P-01 | P0 | I/UI | Linked parent status | `dismissal_household_status()` → own status enum only (`absent`/`in_line`/`left`/`released`) this school |
| P-02 | P0 | I/S | Parent SELECT live line / other households | **Zero** neighbor rows (RIDE-S1-01) |
| P-03 | P0 | I/S | Parent table realtime on `queue_events` | **Forbidden** — no neighbor payload leak (RIDE-S1-03) |
| P-04 | P0 | I/UI | Position “you are #12 of 40” | **Forbidden** — status enum only; no volume of other families |
| P-05 | P0 | I | 2+ children on **different** households, no `household_id` bind | **Empty** — never mash-up (Saydee ≠ Sydnee) |
| P-06 | P0 | I | Step-sib on same household, parent linked only to child A | Status DTO: **no** unlinked member names (RIDE-S1-04) |
| P-07 | P0 | I/S | Token-only `/parent` (`parent_open`) | Cannot read or write any dismissal RPC (RIDE-S1-06) |
| P-08 | P0 | I/S | Parent `dismissal_release` | **Denied** |
| P-09 | P1 | I/UI | Parent `mark_left` | Constrained (every staged member linked) **or deferred** per S1-13 / product |
| P-10 | P1 | UI | Optional “I’m in line” (P3 only) | Explicit tap → `parent_tap` after P1 staff path real; **not** geofence; not typing neighbor digits |
| P-11 | P1 | UI | No new App Store listing required | Inside existing Kelyra parent surface when P3 ships |
| P-12 | P0 | I | Unlink child | Next status load empty for that household membership |

### 1.5 Student / anon / other school

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| N-01 | P0 | I/S | Student JWT any dismissal RPC/UI | **Denied** — no car-rider UI in v1 |
| N-02 | P0 | I/S | Anon JWT table + RPCs | **401 / REVOKE** (RIDE-S1-06) |
| N-03 | P0 | I | Cross-school family_code / QR `school_id` | Does not resolve; writes require `school_id = my_school_id()` (RIDE-S1-08) |
| N-04 | P0 | S | Public `kelyra.app` live queue URL | **Forbidden** |

### 1.6 Dual-hat + seat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| X-01 | P0 | I/S | Teacher-parent on duty, staff chrome | Duty live list via duty RPCs only |
| X-02 | P0 | I/S | Same profile, My children / parent chrome | Own household status only — **never** `dismissal_queue_live` |
| X-03 | P0 | I/S | Single query `on_dismissal_duty() OR parent_of_household()` | **Forbidden** (RIDE-S1-09) |
| X-04 | P1 | UI | Seat switch | Reloads correct RPC; no residual school-line rows in parent chrome |

### 1.7 Twins / household integrity

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| H-01 | P0 | I | Twins, **two** households | Two codes; check-in A does **not** stage B |
| H-02 | P0 | I | Twins, **one** household | One check-in stages both for **duty** |
| H-03 | P0 | I | Parent of only one twin (shared household) | Status DTO omits unlinked twin name |
| H-04 | P0 | I | Derive members from `parent_students` graph | **Forbidden** — office links only (RIDE-S1-10) |
| H-05 | P0 | I | Re-check-in after `left` | New `check_in` at **tail** (new server `occurred_at`) |

## 2. Staff confirm / no auto-release

CEO bar (RIDE-R1 / P1): tag possession ≠ identity. Staff eyes at curb are the only `released` transition. No auto-drop timeout (abandoned-kid / wrong-child risk). No QR-scan-as-release. No GPS auto check-in.

### 2.1 Release and state machine

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| R-01 | P0 | I/UI | Curb duty confirms release at curb | `dismissal_release` inserts `released`; household leaves live list |
| R-02 | P0 | I/S | Parent invokes release | **Denied** (RIDE-S1-11) |
| R-03 | P0 | I/S | Stage-only invokes release | **Denied** |
| R-04 | P0 | I/S | Auto-release on check-in / QR / timer / GPS | **Absent** — no code path |
| R-05 | P0 | I/U | State machine | `absent --check_in--> in_line --released--> released`; `in_line --left--> left`; left `--check_in-->` in_line (tail) |
| R-06 | P0 | I | Late parent | Row stays `in_line` until `left` or `released`; no SMS in v1; no N-minute auto-drop |
| R-07 | P0 | I | Release grain v1 | Household-level for staged members this window; aftercare sibling with other mode **not** in staged set |
| R-08 | P1 | — | Per-child release | Later (not v1 blocker) |

### 2.2 Queue writes / order / offline honesty

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| Q-01 | P0 | I/S | Client INSERT/UPDATE/DELETE on `queue_events` | **Revoked** from anon/authenticated (RIDE-S1-07) |
| Q-02 | P0 | I | RPC sets `actor_profile_id` | From `auth.uid()` only — body spoof ignored |
| Q-03 | P0 | I | `occurred_at` | Server `now()` ranks; `client_occurred_at` diagnostic only |
| Q-04 | P0 | I | `client_event_id` idempotency | Unique `(school_id, client_event_id)`; offline replay safe |
| Q-05 | P0 | U/I | `p_source` allow-list | `keypad` \| `qr` \| `offline_sync`; `parent_tap` only when P3 explicitly enabled |
| Q-06 | P0 | I | `source=parent_tap` before P3 | **Denied** |
| Q-07 | P0 | U/I | Schema freeze | No `lat`, `lng`, `accuracy`, `plate`, `photo_match`, `eta` columns (RIDE-S1-15) |
| Q-08 | P0 | U | QR parser | Ignores extra fields; no lat / parent JWT inside QR |
| Q-09 | P1 | UI | Offline two devices same code | Idempotent; offline landing after online peer → **tail**, copy “Order updated when we reconnected” |
| Q-10 | P1 | UI/S | Offline cache | Duty-device only; wipe on sign-out and duty-row loss; same-day TTL; no PIN-less kiosk (RIDE-S1-14) |
| Q-11 | P0 | I | Live projection | Latest event per `(household_id, school_date, window_mode)`; not mutable `queue_position` int |
| Q-12 | P1 | I | High-frequency curb events | Stay on `queue_events` — do **not** dump into `audit_events` / `/activity` firehose |

### 2.3 AI / Ask (v1 cut)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| AI-01 | P0 | S | Ask dismissal tool in v1 | **None** — staff NL is UI filter only (RIDE-S1-16) |
| AI-02 | P0 | S | Photo-match / LPR / predictive ETA | **Never** in v1 |
| AI-03 | P1 | S | If later Ask tool | New capability name (not `is_staff`, not `assignments.manage`); confirm picker; no invented students; teachers still do not create classes |
| AI-04 | P0 | S | Model keys | Server-side / `ai:dev` only — no `EXPO_PUBLIC_*` vendor tokens |

### 2.4 Safety copy (product, not legal)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| SF-01 | P0 | UI | Curb chrome | Release requires explicit confirm control — not swipe-from-scan alone |
| SF-02 | P1 | UI | Stolen/shared tag | Office reissue path obvious; old generation fails |
| SF-03 | P2 | UI | Walkie fallback | Operational note only — not a schema |

## 3. Evidence (tests, RLS, dogfood)

### 3.1 RIDE-S1 must-fix → acceptance map

Future loop fails if any **P0** row lacks evidence. Map 1:1 to RIDE-S1 §5.

| ID | Sev | Type | Case | Evidence later |
|---|---|---|---|---|
| SEC-01 | P0 | I/S | RIDE-S1-01 parent/student/anon no live line | Parent JWT: zero neighbor rows; student/anon deny; status enum only |
| SEC-02 | P0 | I/U | RIDE-S1-02 RPC/view explicit columns | Serializer tests: no `SELECT *` base tables for parent/duty UI |
| SEC-03 | P0 | I/S | RIDE-S1-03 no parent table realtime | Websocket fixture: parent subscription cannot receive neighbor `queue_events` |
| SEC-04 | P0 | I | RIDE-S1-04 parent DTO / unlabeled empty | Step-sib names absent; 2+ households unbound → empty |
| SEC-05 | P0 | I/S | RIDE-S1-05 no `is_staff` / `teaches_class` widen | `is_staff_profile` + no duty → deny queue + curb RPCs |
| SEC-06 | P0 | I/S | RIDE-S1-06 token-only + anon out | `parent_open(p_token)` + anon: no execute on any dismissal RPC; `auth.uid()` required |
| SEC-07 | P0 | I/S | RIDE-S1-07 no client queue writes | GRANT/REVOKE + RPC: actor from `auth.uid()`; server `occurred_at` |
| SEC-08 | P0 | I | RIDE-S1-08 cross-school | Two-school fixture: foreign `school_id` empty; QR campus B fails at A |
| SEC-09 | P0 | I/S | RIDE-S1-09 dual-hat isolation | My children ≠ duty live list in one result; no OR helper |
| SEC-10 | P0 | I | RIDE-S1-10 no graph-derived members | Office links only; graph-merge test fails closed |
| SEC-11 | P0 | I/S | RIDE-S1-11 release curb-only | Parent/stage/auto/QR-as-release denied or absent |
| SEC-12 | P0 | I/S | RIDE-S1-12 P2 print private | Storage policy when P2: private bucket, office session, short-lived URL |
| SEC-13 | P1 | I | RIDE-S1-13 parent `mark_left` constraint | Product decision enforced in RPC or deferred |
| SEC-14 | P1 | UI/S | RIDE-S1-14 offline cache hygiene | Wipe on sign-out; same-day TTL; no kiosk unlock URL |
| SEC-15 | P1 | U/I | RIDE-S1-15 no GPS/plate/photo/eta | Schema assert + QR extra-field ignore + RPC reject extra jsonb |
| SEC-16 | P1 | S | RIDE-S1-16 no Ask dismissal tool | Policy static: no new dismissal capability in v1 |

### 3.2 Normative future qa-loop checklist (do not run now)

Copied from RIDE-A1 §3.5 + RIDE-S1 §6 — required evidence set when CEO says send:

1. Parent JWT cannot SELECT another household’s events (including realtime / replica payload).
2. `is_staff_profile` true + no duty row → `dismissal_queue_live` and curb RPCs denied.
3. Twin students, two households → two codes; check-in A does not stage B.
4. Twin students, one household → one check-in stages both for **duty**; parent of only one twin does not receive the other name in status DTO.
5. Voided Family ID / old generation does not check in.
6. `teaches_class` office user without duty: no curb RPC (office live list may still be `is_school_admin`).
7. Release RPC as parent → denied. Release as stage-only → denied. Auto-release absent.
8. GPS/plate/photo/eta columns absent from schema.
9. Anon JWT and `parent_open(p_token)` cannot execute any dismissal RPC.
10. Student JWT: no car-rider UI RPCs.
11. Dual-hat teacher-parent: My children status ≠ duty live list in one result set.
12. Parent with two children on different households and no `household_id` bind → empty.
13. Cross-school family_code does not resolve.
14. Client INSERT on `queue_events` denied; `actor_profile_id` cannot be spoofed from body.
15. Unknown family_code does not mint a household.
16. Stage duty cannot call `dismissal_release`.
17. `source=parent_tap` denied until P3 is explicitly enabled.
18. Ask tool policy: no new dismissal tool in v1.

### 3.3 Evidence types by surface

| Surface | Preferred evidence |
|---|---|
| RLS / RPC | JWT fixture matrix (curb, stage, office, teacher-no-duty, student, parent twin A/B, step-sib, anon, token parent, dual-hat, cross-school) |
| Serializer / DTO | Field-allowlist: parent status enum + own code only; duty live card explicit columns |
| Realtime | Parent websocket: zero neighbor payloads; prefer poll / parent-safe view |
| Queue order | Integration: server `occurred_at` rank; offline tail; idempotent duplicate check-in |
| Release wall | Role matrix: curb yes; parent/stage/auto no |
| Offline cache | Client test: wipe on sign-out; cached chrome timestamp |
| Print (P2) | Storage policy + office session route |
| Desk / grade regression | R: capture → match → Approve unchanged; dismissal never Approves grades |
| Ask / matcher | R: no dismissal Ask tool; matcher still never inserts students |
| parent_open | R: token path unchanged and still out of dismissal |

### 3.4 Dogfood script (after CEO send — not this ticket)

1. Office creates household, links two siblings, prints Family ID; assigns curb + stage duty.
2. Curb types code → live list shows household at tail; stage wing filter shows same card.
3. Second car checks in → order is arrival (server time), not keypad speed myth.
4. Curb confirms release → card leaves list; stage refresh matches.
5. Stage tries release control → denied / absent.
6. Parent phone: own status only; never sees neighbor names or “#n of m”.
7. Parent with twins on two households: must pick household / focused bind; no blend.
8. Void + reissue code → old placard fails; new works.
9. Sign out duty iPad → offline cache wiped; no public URL when signed out.
10. Teacher with no duty opens staff app → no dismissal queue.
11. Attempt `parent_open` token against dismissal RPCs → fail.
12. Paste GPS fields / Ask “dump the line” → no schema path / no tool.

### 3.5 Regression guards (non-acceptance if broken)

| ID | Sev | Guard |
|---|---|---|
| RG-01 | P0 | Desk grade loop (capture → match → Approve) unchanged by dismissal chrome |
| RG-02 | P0 | Nothing becomes a grade from dismissal path |
| RG-03 | P0 | Matcher still never inserts a student |
| RG-04 | P0 | Teachers still do not create classes from this surface |
| RG-05 | P0 | `is_staff` / `teaches_class` not widened for queue SELECT |
| RG-06 | P0 | `parent_open` token path gains no dismissal read/write |
| RG-07 | P0 | No `EXPO_PUBLIC_*` model keys introduced |
| RG-08 | P1 | `/activity` / `audit_events` not flooded with curb check-ins |
| RG-09 | P1 | No public storage bucket for placard PDFs |

## 4. Acceptance

### 4.1 This ticket (RIDE-Q1)

| Criterion | Status |
|---|---|
| `notes/company/car-rider-acceptance.md` exists for CEO/CoS | **Met by this file** |
| Grounded in RIDE-P1 / A1 / S1 (no invented product law) | **Met** |
| P0 matrix covers household, duty, no firehose, staff confirm, no auto-release, RIDE-S1-01…16 | **Met** |
| Explicit non-acceptance / regression guards | **Met** (§3.5, §4.2) |
| No app code, SQL, migrations, Edge, Ask registration | **Met** — plan only |
| No `kelyra-qa-loop` / release cert / eng staffing | **Met** |
| Not a Build send | **Met** |

**Audience:** CEO / Chief of Staff. **Not** an implementation ticket. Do **not** staff `senior-developer` or launch `kelyra-qa-loop` until Chuck writes **send**.

### 4.2 Non-acceptance (ship blockers even after a green unit suite)

A future build is **not** accepted if any of the following is true:

1. Parent/student/anon can see the live school line, neighbor names, or “#n of m” position volume.
2. Parent table realtime (or unfiltered replica) delivers other households’ `queue_events`.
3. UI reads use base-table `SELECT *` instead of explicit RPC/view columns.
4. Staff queue SELECT widens `is_staff` / `is_staff_profile` / `teaches_class` instead of `dismissal_duty` (+ office admin this school for office chrome only).
5. Household members are auto-derived from `parent_students` (twin/custody graph merge).
6. Twin / multi-household unlabeled queries mash-up instead of empty.
7. Parent status DTO lists unlinked step-sib / twin names.
8. Auto-release exists (timer, QR-as-release, GPS, check-in implies released).
9. Parent or stage-only can call `dismissal_release`.
10. Client INSERT/UPDATE/DELETE on `queue_events`, or actor spoofed from body, or rank by client/GPS time.
11. Public / pre-auth dismissal URL, or token-only `/parent` reads/writes dismissal.
12. Cross-school family_code resolves, or writes ignore `my_school_id()`.
13. Dual-hat ORs duty + parent into one query so My children receives the school line.
14. GPS/plate/photo/eta columns ship in v1, or Ask dismissal tool dumps the roster.
15. P2 placard PDF is public / forever-signed / emailed as a world link.
16. Dismissal creates students/classes or becomes a grade Approve path.
17. Developers self-certify without CEO send + this plan + loop evidence.

### 4.3 Open issues (not blockers for this acceptance plan)

| # | Question | Owner |
|---|---|---|
| 1 | Parent `mark_left` when household includes unlinked step-sibs — constrain (T3) or **defer** parent cancel (Security preference: defer if T3 not shipping in P1) | CEO / PM |
| 2 | Exact digit length of Family ID (A1 default 4–5) | Architect default OK |
| 3 | Standing duty weekday-only vs all calendar days | Product (A1 open) |
| 4 | Parent-safe realtime view vs poll in P3 | Architect at P3 |
| 5 | Stage duty bulk-homeroom vs per-zone list assignment UX | Product (A1 default: office assigns stage by zone) |

### 4.4 Downstream

| Ticket / actor | Needs |
|---|---|
| CEO / CoS | Review this plan + P1/A1/S1 pack; **Chuck still must write send** |
| Architect | Fold RIDE-S1-01–16 (RPC-only reads, parent DTO, no parent table-realtime, token deny, dual-hat, step-sib) into any pre-SQL polish |
| Future `kelyra-qa-loop` | Execute §1–§3 matrices — **do not run now** |
| `senior-developer` | **Do not staff** until send |

### 4.5 Phased evidence expectation (when sent)

| Phase | Must prove before calling phase done |
|---|---|
| **P0 data** | Households, members, flags, duty, `queue_events`, RPCs, RLS — SEC-01…11, SEC-15 core |
| **P1 staff** | Keypad/QR, live list, zone filter, release confirm, stage read, offline cache — §1.2–1.3, §2, SEC-14 |
| **P2 office** | Print/reissue UI + private storage — O-04/O-05, SEC-12 |
| **P3 parent** | Status + optional cancel/tap — §1.4 P-01…P-12 with S1-13 decision locked |
| **P4 later** | GPS advisory never ranks; photo/ANPR/SMS — new product decision, not quiet columns |

### 4.6 Verdict

**Acceptance plan complete.** Ready for CEO/CoS review as the contract for a future authorized build loop.

**Not a send. Not a release. Not QA certification.**

**RECOMMENDED NEXT ACTION:** CoS surfaces this file with the RIDE pack to Chuck. Hold eng. Do not launch kelyra-qa-loop from this ticket.
