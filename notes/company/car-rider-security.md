# RIDE-S1: FERPA / Security Review — Car-rider queue

**Date:** 2026-09-04
**Author:** security (Kelyra)
**Ticket:** t_47322365
**Status:** Review only — no app code, no SQL, no Edge handlers, no kelyra-qa-loop.
**Depends on:**
- `notes/company/car-rider-architecture.md` (RIDE-A1)
- `notes/company/car-rider-plan.md` (RIDE-P1)
- `notes/company/car-rider-research.md` (RIDE-R1)
**Live ground:** `docs/data-model.md` (`parents`, `parent_students`, `profiles.parent_id`, `parent_accesses` / `parent_open`); `is_school_admin` / `my_school_id` (`20260817000005_school_roles.sql`); `class_teacher_of` (AVG write wall); messages realtime (`20260818000008_message_realtime.sql`); `write_audit`. **There is no household table today.**
**Legal posture:** Engineering threat model and implementation gates. Not a legal opinion and not a claim of FERPA “school official” status. Soft FERPA (`docs/architecture.md`, `docs/mvp.md`) still applies.

**Non-goals of this ticket:** Implementation, Architect SQL, QA plan, staffing `senior-developer`.

---

## 0. Verdict

RIDE-A1 product law is sound: new `households` (not `parents.id` as Family ID); explicit `household_students` (not `parent_students` graph); `dismissal_duty` wall (not `is_staff` / `teaches_class`); no anonymous dismissal URL; other parents see nothing of the line; no GPS/ANPR/plate columns; no auto-release; no client INSERT on `queue_events`; twins fail closed.

**Do not implement** until the v1 must-fix list in §5 is in the future qa-loop. Architecture already names the big traps. Security elevates a few A1 under-specifies:

1. Postgres RLS is **row-level**. Duty/parent `SELECT` on base tables (`households`, `household_students`, `queue_events`, `student_dismissal`) will leak sibling names, labels, and neighbor payloads unless reads go through **RPCs/views** with an explicit column list.
2. Table realtime on `queue_events` is a classic payload leak even when INSERT is RPC-only. Prefer a parent-safe view or poll; never a public channel.
3. `parent_of_household` via any `parent_students` link to **any** member can disclose **step-siblings** the parent is not linked to, and can let a linked adult `mark_left` for the whole car.
4. Token-only `/parent` (`parent_open(p_token)`, no `auth.uid()`) must stay **out** of every dismissal RPC. Live invite tokens are capability URLs.
5. Offline cache of the live list is an education-record copy on a music-stand iPad. Sign-out must wipe it; there is still no kiosk unlock URL.

Gate: Chuck still says send. Security does not authorize a loop.

---

## 1. Scope and data classes

| Data | FERPA / sensitivity | Where it would live | Who may see |
|---|---|---|---|
| Live queue: student display names, Family ID, position, zone, window | **Education records** (operational PII). Not directory. | Projection of `queue_events` + `household_students` | Duty (assigned window/zone) + office this school. **Never** other parents, students, anon, other schools, teachers with no duty row |
| Own-household status enum (`absent` / `in_line` / `left` / `released`) | Education record, **minimized** | Parent RPC only | Linked parent login **this school**. No neighbor names, no “you are #12 of 40” |
| `households.family_code` + generation + printed placard / QR | Identifier for pickup unit. Not a login. Not a secret that grants access | `households`; office print | Office print/reissue; duty lookup by typed/scanned code; parent may see **own** code. Not a public PDF, not a `kelyra.app` URL |
| `households.label` (“Chen van”) | Office nickname; can identify family | `households` | Office + duty as needed for **their** list. **Never** other parents |
| Household membership (which students ride together) | High — custody / step / twins | `household_students` | Office; duty for members they may stage. Parent: **only students they are linked to**, not unlabeled household mash-up |
| Window flags / day-of override (`car` / `aftercare` / `bus`) | Operational education record | `student_dismissal`, `dismissal_overrides` | Office; duty same school; parent of **that** student only |
| Duty roster | Staff PII; implies who may release children | `dismissal_duty` | Own row; office all for school. Not parents |
| `queue_events` rows (who checked in, source, actor, notes) | High — attendance-like log | Append-only table | Duty/office filtered; parent: **own** `household_id` only. No GPS/plate/photo |
| Placard PDF bytes | FERPA-adjacent; Family ID + school | Storage object if built | Office session only. **Never** public bucket, never unauthenticated signed URL mailed as a forever link |
| Token-only parent invite (`parent_accesses.token`) | Capability URL (live plaintext token) | Existing | Unchanged. **No** dismissal read/write |

**Product law (unchanged):** Matcher never inserts a student. Teachers do not create classes. Nothing is a grade until Approve (this surface is not a grade). Tag = possession; staff eyes at curb = release.

---

## 2. Threat model

Attacker profiles: curious student JWT, parent JWT (incl. invite token `/parent?t=`), teacher with no duty, office seat, dual-hat teacher-parent, modified Expo client, realtime subscription without filter, stolen placard/PDF, spare iPad on a stand, second-campus JWT, Ask tool-loop.

### T1 — Parent / student firehose of the live line

**Severity: P0 (v1 must-fix)**

Live queue names are education records. A1 forbids anonymous `kelyra.app` dismissal URLs and “other parents see nothing.” Implementation failure modes:

- Parent JWT `SELECT` on `queue_events` without a `household_id` bind → every household the RLS helper accidentally allows.
- `supabase_realtime` on the **table** (`messages` pattern in `20260818000008_message_realtime.sql`). Replica identity sends the row. If RLS on the replica is wrong, or the client subscribes unfiltered, neighbor check-ins arrive in the websocket payload even when the UI hides them.
- Parent UI showing `position` / “you are #12 of 40” (volume of other families). A1 already bans this; keep it a test.

**Must-fix:** Parent reads **only** `dismissal_household_status()` (status enum, own household). No base-table SELECT. No parent realtime on `queue_events`. If live updates are wanted in P3, a **parent-safe view** keyed by `household_id` + RLS that cannot see other rows — or poll. Student / anon: deny all.

### T2 — Base-table SELECT is not column-level

**Severity: P0 (v1 must-fix)**

A1 §3.1 says duty may SELECT households “code + label only as needed” and parents get “code + status, not other families.” Postgres RLS cannot hide columns. A parent `SELECT * FROM households` that matches their row still returns every column on that row; a duty SELECT of `household_students` returns every member.

**Must-fix:** Same pattern as AVG family syllabus. Staff live list = `dismissal_queue_live(...)`. Parent = `dismissal_household_status()`. Office print = dedicated RPC. **REVOKE** direct SELECT on `queue_events` from `authenticated` if the RPC is SECURITY DEFINER; or RLS so parent/duty cannot SELECT columns they should not have. Do not ship “RLS allows the row, client picks columns.”

### T3 — Household mash-up / step-sibling over-read

**Severity: P0 (v1 must-fix)**

Pickup unit is office-curated (correct — do not derive from `parent_students`). Visibility is not. A1 `parent_of_household` = any `profiles.parent_id` with a `parent_students` row to **a** current member.

That means parent of child A, household {A, B} where B is a step-sib the office linked for the van:

- Parent A sees B’s name if `household_students` or live-card students[] is returned to the parent.
- Parent A can `dismissal_mark_left` for the whole household (A1 allows parent `left`).
- Dual-household parent with 2+ children: unlabeled query must return **no rows**, not a blend (Saydee ≠ Sydnee). A1 says this; tests must prove it.

**Must-fix:** Parent status DTO contains **no student list except linked children** (or no names at all — enum + own family_code is enough in v1). `mark_left` as parent is allowed only for a household where **every staged member is a linked child**, or product defers parent `left` until custody is explicit. Unlabeled multi-household → empty. Check-in still stages all office-linked members for **duty** (safety), not for the parent chrome.

### T4 — Widening `is_staff` / `teaches_class` / office bypass

**Severity: P0 (v1 must-fix)**

Live lesson: `teaches_class` is true when `is_school_admin() OR class_teachers` (AVG-A1). Using it for queue SELECT gives office every class and is still the wrong wall for a teacher with no duty.

**Must-fix:** `on_dismissal_duty(...)` only. `is_staff_profile` true + no duty row → no queue (A1 test). `is_school_admin()` may SELECT live list **this school** for office chrome — that is office, not `is_staff`. Curb RPCs (`check_in`, `release`) are duty `curb`, not office-by-default (office can assign themselves duty). Do not reuse `class_teacher_of` as a substitute for staging; bulk-homeroom stage is a **duty row**, not “teaches this class.”

### T5 — Token-only `/parent` and anon JWT

**Severity: P0 (v1 must-fix)**

Live `parent_open(p_token)` is SECURITY DEFINER over a **plaintext** invite token (`docs/data-model.md`). No `auth.uid()`. A1 says token-only cannot write queue events. Also cannot **read** them.

**Must-fix:** Every dismissal RPC: `auth.uid()` not null; resolve `profiles` for this school; then duty or `parent_id` link. `REVOKE ALL FROM public, anon`; `GRANT EXECUTE` to `authenticated`. Anon JWT / student role: deny. Do not add `p_token` to check-in.

### T6 — Family ID treated as a capability token

**Severity: P1 (v1 control already in A1; must not regress)**

A1: codes are **not** secrets; staff JWT + duty is authz; QR = `{school_id, family_code, generation}` shortcut. Unknown code → error, **do not** create household. Void + generation bump on reissue.

Residual: a stolen visor tag plus a duty-signed device (or a confused deputy) checks that household in. That is the same as today’s paper tag. Release still needs eyes. Do not add “scan QR = released.”

**Must-fix:** QR parser ignores extra fields (no `lat`, no parent JWT inside the QR). Reissue voids old generation. Allocator skips recently voided numbers. Parent tap (P3) is `parent_of_household`, **not** “I typed the neighbor’s digits.”

### T7 — Public / emailed placard PDF

**Severity: P0 (v1 must-fix when P2 print ships)**

A1 already rejects public storage of placard PDFs. Failure modes: `public=true` bucket; long-lived signed URL in email; print preview route without office session; Family ID in a world-readable `/activity` dump.

**Must-fix:** Print in an office session only. If Storage: private bucket, path prefixed by `school_id`, office-only object policy, short-lived signed URL in-session. Do not attach the PDF to `audit_events` payloads. `write_audit` on reissue stores household id + new generation, not the PDF bytes.

### T8 — Client INSERT / service-role as actor

**Severity: P0 (v1 must-fix)**

A1: no client INSERT; RPCs; user JWT never service-role as actor; `client_event_id` idempotency; server `occurred_at` ranks.

**Must-fix:** `queue_events` INSERT/UPDATE/DELETE revoked from `anon`/`authenticated`. RPCs `SECURITY DEFINER`, `search_path = public`, set `actor_profile_id` from `auth.uid()` (never from body). Body `p_source` allowlisted (`keypad`/`qr`/`offline_sync`; `parent_tap` only when P3 + parent helper). Offline outbox cannot set `occurred_at`. Duplicate in-line check-in = no-op.

### T9 — Offline cache and kiosk device

**Severity: P1**

Last `dismissal_queue_live` payload in AsyncStorage is a copy of student names. Spare iPad on a music stand is a deployment choice (A1). No kiosk unlock URL (keep).

**Must-fix:** Cache is duty-device only; encrypted store if the platform allows; wipe on sign-out and on duty-row loss; chrome “cached at {time}”; TTL (same afternoon, not weekend). Do not persist parent status lists beyond the session. Do not build a PIN-less kiosk SKU.

### T10 — Dual-hat OR into one query

**Severity: P0 (v1 must-fix)**

Seat is chrome (A1). Teacher-parent on duty sees the duty list in staff chrome; My children sees **only** their household status. Failure: `on_dismissal_duty() OR parent_of_household()` in one policy → parent hat receives the school line.

**Must-fix:** Separate RPCs. Client may not pass `body.role`. Server uses signed-in profile + which RPC was called. `parent_open_mine` / My children never calls `dismissal_queue_live`.

### T11 — Twin / custody graph merge

**Severity: P0 (v1 must-fix)**

Do not auto-insert `household_students` from `parent_students`. Unlabeled sibling blend → empty. One active household per student in v1. Office `office_set_household_students` never invents students (matcher law). Unlink is detach.

### T12 — GPS / photo / ANPR / plate creep

**Severity: P1 (schema freeze)**

A1 forbids `lat`, `lng`, `accuracy`, `plate`, `photo_match`, `eta` in v1. Ask must not photo-match. Predictive ETA is later.

**Must-fix:** Migration tests assert those columns absent. RPCs reject extra jsonb keys. P4 GPS is advisory + disclaimer and **never** rank — new product decision, not a quiet column.

### T13 — Ask as roster dump

**Severity: P1**

A1: staff NL “who’s next for wing B” is a **client filter** of `dismissal_queue_live`, not a new tool. If an Ask tool is added later: new capability name (not `is_staff`, not `assignments.manage`), confirm picker, no invented students, teachers still do not create classes.

**Must-fix for v1:** no Ask tool. Filter in UI.

### T14 — Cross-school leak

**Severity: P0 (v1 must-fix)**

Stamp `school_id` on every new row; writes must equal `my_school_id()`. QR carries `school_id` so a code from campus B does not resolve at campus A. Duty rows are per school. Office admin of A cannot SELECT B.

### T15 — Audit firehose / retention

**Severity: P2**

Do not reuse `audit_events` as the queue (A1). High-frequency curb events stay on `queue_events`. `write_audit` on office verbs only. Function logs: ids + kind, not student-name dumps, not QR payloads.

**Later:** district retention schedule; who may export the day’s line; eligible student (18+).

---

## 3. Controls (RPC / helper hygiene)

Helpers: `SECURITY DEFINER`, `search_path = public`, same style as `is_school_admin`. `on_dismissal_duty` matches school + date-or-standing + role + null-means-all mode/zone. `parent_of_household` requires focused `household_id` when the parent has 2+ children on different households.

RPCs (user JWT):

| RPC | Who | Must also |
|---|---|---|
| `dismissal_check_in` | Curb duty | Unknown code → error, no mint. Idempotent. Server time. |
| `dismissal_mark_left` | Curb **or** parent-of-household with T3 constraint | Never release. |
| `dismissal_release` | Curb **only** | Never parent, never stage-only, never auto, never QR-only. |
| `dismissal_queue_live` | Curb, stage, office this school | Projection; zone/mode filter; no parent. |
| `dismissal_household_status` | Parent login of household | Enum + own code. No position. No neighbor. No step-sib names. |
| `office_reissue_family_id` | `is_school_admin` | Void old, mint new, `write_audit`. |
| `office_set_household_students` | `is_school_admin` | Explicit ids only. Never invent. `write_audit`. |
| `office_set_dismissal_duty` | `is_school_admin` | `write_audit`. |

Do not enable `source=parent_tap` until P1 staff path is real (A1).

---

## 4. FERPA mapping (engineering)

| FERPA concern | Car-rider control |
|---|---|
| Education records disclosed only to parent / eligible student / school official | Live names: duty + office this school only. Parent: own status enum. Student v1: nothing. Not claimed as “school official” without DPA |
| No peer / neighbor records | Other parents see nothing. No school-wide ticker. No “#12 of 40” |
| Directory vs record | Family ID on a visor is an operational identifier, not public directory. Live line is a record |
| Sibling / twin isolation | Explicit household links. Unlabeled blend → empty. Parent DTO does not list unlinked members |
| Vendor / model | v1 has no vision parse. Do not add photo-match. Filter-only NL, no roster tool |
| Redisclosure / logs | `queue_events` not `/activity`. Logs without name dumps. Placard not public |
| COPPA | Unchanged: school context; no public child posting; no student UI |
| Custody | Office curates pickup unit. Parent JWT follows `parent_students`. Do not invent a second household in v1 |

Soft FERPA posture unchanged until a DPA exists.

---

## 5. Findings — severity and v1 cut

### v1 must-fix (block implementation / qa-loop if missing)

| ID | Sev | Finding | Gate |
|---|---|---|---|
| RIDE-S1-01 | P0 | Parent/student/anon cannot SELECT the live line. Parent RPC = status enum only. No public URL | Parent JWT fixture: zero neighbor rows, incl. realtime |
| RIDE-S1-02 | P0 | Reads via RPCs/views with explicit columns. Do not `SELECT *` base tables for parent/duty UI | Serializer tests |
| RIDE-S1-03 | P0 | No table realtime of `queue_events` to parent JWT. Prefer poll or parent-safe view | Websocket fixture |
| RIDE-S1-04 | P0 | Parent DTO has no unlinked household members; unlabeled 2+ households → empty | Step-sib + twins tests |
| RIDE-S1-05 | P0 | Do **not** widen `is_staff` / `is_staff_profile` / `teaches_class`. Duty row or office admin this school | `is_staff` + no duty → deny |
| RIDE-S1-06 | P0 | Token-only `parent_open` cannot read or write dismissal. `auth.uid()` required. REVOKE anon | Anon + token tests |
| RIDE-S1-07 | P0 | No client INSERT/UPDATE/DELETE on `queue_events`. Actor from `auth.uid()`. Server `occurred_at` | Grant/revoke + RPC tests |
| RIDE-S1-08 | P0 | `school_id` = `my_school_id()` on every write. Cross-school JWT empty | Two-school fixture |
| RIDE-S1-09 | P0 | Dual-hat: do not OR duty and parent in one query. My children never calls live list | Dual-hat tests |
| RIDE-S1-10 | P0 | Do not derive `household_students` from `parent_students`. Office links only. Never invent students | Graph-merge test |
| RIDE-S1-11 | P0 | Release = curb duty only. Never parent, never stage, never auto, never QR-as-release | RPC role tests |
| RIDE-S1-12 | P0 | P2 print: private storage, office session, no public PDF, no forever signed URL | Storage policy (when P2) |
| RIDE-S1-13 | P1 | Parent `mark_left` constrained (T3) or deferred | Product + RPC |
| RIDE-S1-14 | P1 | Offline cache wipe on sign-out; same-day TTL; no kiosk unlock URL | Client tests when P1 |
| RIDE-S1-15 | P1 | GPS/plate/photo/eta columns absent; QR extra fields ignored | Schema + parser |
| RIDE-S1-16 | P1 | No Ask dismissal tool in v1 | Policy static |

### Later (not v1 blockers)

| ID | Sev | Item |
|---|---|---|
| RIDE-S1-L1 | P2 | Signed DPA / school-official claim |
| RIDE-S1-L2 | P2 | Split-custody second household; per-child release |
| RIDE-S1-L3 | P2 | Retention schedule for `queue_events`; export of the day’s line |
| RIDE-S1-L4 | P2 | Eligible student (18+) / FERPA rights transfer |
| RIDE-S1-L5 | P2 | SMS / push (“your child is next”) — new disclosure surface |
| RIDE-S1-L6 | P3 | GPS advisory + disclaimer (never rank); photo verify; ANPR |
| RIDE-S1-L7 | P3 | Cross-family carpool (two Family IDs ≠ one check-in) |

---

## 6. Tests a future qa-loop must include (do not run now)

A1 §3.5 plus:

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
14. Client INSERT on `queue_events` denied; actor_profile_id cannot be spoofed from body.
15. Unknown family_code does not mint a household.
16. Stage duty cannot call `dismissal_release`.
17. `source=parent_tap` denied until P3 is explicitly enabled.
18. Ask tool policy: no new dismissal tool in v1.

---

## 7. Decisions (this ticket)

1. Live queue names are education records. Login + RLS. No public URL.
2. Parent surface is own-household status enum only — never the school line, never position-among-others.
3. Pickup unit = office-curated `households`. Not `parents.id`. Not `parent_students` connected component.
4. Authz for staff = `dismissal_duty` (and office admin this school for office chrome). Not `is_staff`. Not `teaches_class`.
5. Writes = RPCs, user JWT, server time, append-mostly `queue_events`.
6. Family ID is not a capability token. QR is a typed-code shortcut. Reissue voids.
7. Tag = possession. Staff confirm at curb is the only `released` transition.
8. Token-only `/parent` is out of this product.
9. Soft FERPA posture unchanged until a DPA exists.
10. No implementation from this ticket.

---

## 8. Open questions (not blocking this review)

| # | Question | Owner |
|---|---|---|
| 1 | Parent `mark_left` when household includes unlinked step-sibs — constrain or defer parent cancel to P3? Security prefers **defer** if product will not ship the T3 constraint in P1 | CEO / PM |
| 2 | Exact digit length of Family ID (A1 default 4–5) — shorter is easier to shoulder-surf; still not authz | Architect already defaulted |
| 3 | Whether office standing duty is weekday-only | Product (A1 open) |
| 4 | Parent-safe realtime view vs poll in P3 | Architect at P3 |

---

## 9. Acceptance / downstream

- This file exists for CEO / CoS.
- No application code, no SQL under `supabase/migrations/`, no kelyra-qa-loop, no git push.

| Ticket | Needs |
|---|---|
| RIDE-A1 | Incorporate RIDE-S1-01–16 (RPC-only reads, parent DTO, no parent table-realtime, token deny, dual-hat, step-sib) |
| Future qa-loop | §6 tests — **only after Chuck says send** |
| senior-developer | **Do not staff** until CEO yes |

**Risks if implementers ignore A1 + this file:** widening `is_staff` (school-wide parent-visible firehose); deriving siblings from `parent_students` (twin merge); ranking by client GPS time; client INSERT on `queue_events`; public dismissal URL; table realtime leaking neighbor check-ins; parent SELECT of household members they are not linked to.

**RECOMMENDED NEXT ACTION:** CEO/CoS review. Do not launch kelyra-qa-loop from this ticket.

