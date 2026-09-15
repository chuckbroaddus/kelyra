# Kelyra architecture-risk brief — weekly leadership sync

**Date:** 2026-09-14 CT
**Author:** software-architect (t_fb321dec)
**Board SoT:** Hermes `kelyra` (blocked≈137, ready/running: I4 + weekly syncs)
**No application code. No SQL apply. No git merge. No second backend.**

---

## OBJECTIVE

Rank architecture risks (P0–P3) that could block school-pilot or BATCH remainder this week. Risks only.

## CONTEXT (grounded)

- `docs/architecture.md` still dated 2026-08-12 (one teacher, 50–100 students). ADR `t_90dfa50e` parked CEO/CoS.
- BATCH-v1: I0–I3 done; I2 rasterize worker **live** (`workers/ingest-rasterize`, `SUPABASE_SERVICE_ROLE_KEY`). I4 `t_a069938c` running today. Hot folder = v2+. Never whole-PDF to a model.
- P2 `register_ingest_file` path prefix (`t_d3433b09`) and uid/ingest/batch_id bind (`t_06dd401c`) still sticky blocked. Live SQL writes client `p_storage_path` with no prefix check.
- Calendar leftovers sticky: oldest-school fallback; duplicate drawer; RLS GRANT nit; parent self personal omit. CAL-R2 A–E implement/QE done.
- School-pilot LessonWebView: srcdoc web / html+baseUrl native. **No kelyra.app DNS.**
- Git merge/push and live SQL apply = devops-release only. 134 migration files; latest prefix `20260918000000` (Phase E) on disk 2026-09-14.
- SuperGrok week reset (0% used at briefing). Daily cap ≈12%. Do not propose a second backend.

## ADR RESTAMP — burn today's 12% SuperGrok?

**No.** Docs-only. Not user-facing this week. Keep `t_90dfa50e` parked.

## THIS WEEK vs LATER (summary)

| Burn SuperGrok today? | Item |
|---|---|
| YES | BATCH I4 qa-loop (`t_a069938c`) — only user-facing BATCH remainder |
| MAYBE (security SQL, not docs) | `register_ingest_file` prefix+uid bind — I2 worker is already service_role |
| NO | ADR restamp `t_90dfa50e` |
| NO | Calendar leftovers / chrome / hot folder / I5 |

---

## RESULT — ranked risks

**R1 — Ingest path integrity vs live I2 worker (P0 this week, security)**
`register_ingest_file` (`20260913000000_ingest_batches.sql`) is `security definer`, checks teacher owns the batch + `class_teacher_of`, then **inserts client `p_storage_path` with no prefix check**. Cards `t_d3433b09` / `t_06dd401c` were parked “before I2.” **I2 is merged and uses service_role** (`createServiceClient` in `workers/ingest-rasterize/src/db.ts`). Storage RLS no longer protects the download path. A bound path `{auth.uid()}/ingest/{batch_id}/**` is the Ride pattern and the BATCH architecture contract. This is the only leftover that can become a **cross-object fetch** once a teacher can point the worker at another prefix. Rank **above** calendar leftovers and chrome. Fix is a follow-up migration via IQG + **devops-release apply** — not an ADR restamp, not I4 scope-creep.

**R2 — BATCH I4 model contract (P0 product-law this week)**
I4 (`t_a069938c`, running) is the remainder that makes Confirm useful: Inbox lists batch captures; attach → existing understand; **unnamed = no gaps**; **≤4 JPEGs/call**; **never class PDF to a model**. Confirm must not set `approved_score`. Matcher still never inserts a student. If I4 regresses “send the stack PDF,” that is a FERPA/cost incident, not a polish bug. **This is the correct SuperGrok burn today.** I5 partial retry and hot folder stay **later**.

**R3 — Orphan ingest batches (P1 this week if teachers dogfood stacks; else P2 later)**
`t_431eb2c4` / `t_331910aa`: Close on waiting/Split Review calls `reset()` without `abandonIngestBatch`; no resume UI. Cancel does abandon. Orphans hold PDFs in private storage, occupy “one rasterize per teacher,” and confuse Split Review. Does **not** mint captures. Do not steal I4’s 12%. Unblock after I4 if dogfood shows stuck batches.

**R4 — Docs SoT lag (P1 drift, not this-week user-facing)**
`docs/architecture.md` still one-teacher MVP. Feature A1 notes are domain SoT. **`notes/company/batch-ingest-architecture.md` is missing on disk** even though `t_fb2e7d9a` reported it landed — BATCH contract lives in worker README + PM locks + I0 SQL comments. ADR restamp (`t_90dfa50e`) does **not** block school-pilot, I4, or DNS HOLD. Recreating the BATCH note is a later docs card, not today’s 12%.

**R5 — Calendar oldest-school fallback (P2 later unless multi-school this week)**
`calendar_school_id_for_class` coalesces to oldest `schools.created_at` when class has no teacher (`t_45710b0c` / `t_cf182494`). Wrong-tenant class calendars if **two schools** exist. School-pilot is one school → latent. Fail-closed is the architecture fix. Duplicate drawer (`t_3eb4ff46`), GRANT nit (`t_f3e2103a` / `t_2b65cda8`), parent `visibility_scope=self` omit (`t_557c31da` / `t_880b33b7`) are **chrome / Phase-B nits — P3 / later**. CAL-R2 A–E already shipped; leftovers must not reopen the epic.

**R6 — LessonWebView split + DNS HOLD (P1 standing, not this-week implement)**
Web: iframe **srcdoc** + `sandbox` including `allow-same-origin` + `postMessage(..., '*')`. Native: `html` + `baseUrl`. Two threat models, accepted for school-pilot. **`t_7d367b42` Q18 stays blocked as implement.** Do not configure kelyra.app DNS. Do not extract Next.js.

**R7 — SQL filename-order + apply lane (P1 ops, standing)**
134 files. Prefixes already run through **20260918** while today is **20260914**. New BATCH security SQL must use an **unused later** prefix (or CoS apply log). Live apply / git merge = **devops-release only**. Bots must not apply.

**R8 — Soft FERPA / no second backend (standing, CEO)**
Paid model, keys in Edge/worker (rasterize has **no** model keys), private buckets, Approve gate, no public class URL. Not school-official without DPA. One Expo client + one Supabase. Architecture.md §5.6 still correct even while the rest of the doc is stale.

## CEO-irreversible (do not do this week without Chuck)

1. kelyra.app DNS / custom domain.
2. DPA / school-official claim.
3. Public / pre-auth class URL.
4. Second backend, Next.js web shell, or SIS bus.
5. Live SQL apply out of filename order; git merge/push outside devops-release.
6. Unblocking PPT `t_7fb77277` or Attendance `t_7b12ad6f`.
7. Sending a whole class PDF to a model.

## WORK PERFORMED

Read `docs/architecture.md`, diary-ledger A1 (out of this week's burn), prior `ARCH_WEEKLY_2026-09-08.md`, I2 worker README + `db.ts`, `register_ingest_file` body, BATCH I3/I4 handoffs, board cards (ADR, BATCH leftovers, CAL leftovers, I4). No code, no SQL, no git.

## VERIFICATION

- Board 2026-09-14 ~09:34 CT: blocked 137, done 462, archived 12; I4 running; weekly syncs running.
- `register_ingest_file` confirmed: no `split_part` on `p_storage_path`.
- `notes/company/batch-ingest-architecture.md` absent.
- ADR `t_90dfa50e` still `blocked` / needs_input (Chuck accept).

## OPEN ISSUES

1. Live worker host (Cloud Run/Fly) vs local-only: **unverified** this pass.
2. RIDE 7-day purge+object delete still missing from 2026-09-08 brief — standing ops, not this week's 12%.
3. Duplicate leftover cards exist (CAL oldest-school twice; BATCH orphans twice). CoS may collapse; architect does not.

## ESCALATION NEEDED

- **@chief-of-staff:** Do not staff ADR restamp on today's SuperGrok. After I4, consider unblocking **only** `t_d3433b09`+`t_06dd401c` as one security SQL slice (devops-release apply). Keep calendar leftovers sticky.
- **CEO Chuck:** DNS stays off. ADR restamp when you want docs to match multi-hat — not a pilot gate.

## RECOMMENDED NEXT ACTION

1. Burn today's ~12% SuperGrok on **I4** (`t_a069938c`), not ADR.
2. Park ADR `t_90dfa50e` until Chuck says restamp `docs/architecture.md` (docs-only; include current domains + IQG gate; do **not** promote HOLD ATTEND/PPT or district TRACK).
3. Next architecture slice after I4: bind `register_ingest_file` path to `{uid}/ingest/{batch_id}/**` (Ride pattern). Filename after 20260918.
4. Do not configure kelyra.app DNS. Do not implement from this card.

---

## Structured handoff

**OBJECTIVE:** Architecture-risks brief for Leadership Roadmap Sync 2026-09-14.
**CONTEXT:** BATCH I0–I3 live; I4 running; ADR parked; calendar leftovers sticky; school-pilot LessonWebView; no DNS.
**REQUIREMENTS:** Rank P0–P3; ADR this-week vs docs-only; ingest vs calendar vs chrome.
**CONSTRAINTS:** No code, no SQL, no git.
**FILES/AREAS:** `notes/company/ARCH_WEEKLY_2026-09-14.md`; `docs/architecture.md` unread for edit; ingest SQL + worker.
**WORK PERFORMED:** Risks brief written and commented on `t_fb321dec`.
**VERIFICATION:** Path-prefix gap confirmed in live I0 SQL; I2 service_role confirmed; ADR still blocked.
**RESULT:** ADR restamp = docs-only, **do not burn SuperGrok**. This week: I4 + (optional later) ingest path bind. Calendar/chrome = later.
**OPEN ISSUES:** Worker prod host unverified; RIDE purge standing; missing batch-ingest-architecture.md.
**ESCALATION NEEDED:** CoS — I4 first; ingest P2s after; ADR parked.
**RECOMMENDED NEXT ACTION:** Leadership: accept ranking; keep ADR parked.
