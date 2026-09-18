# Kelyra weekly architecture + tech-debt review

**Date:** 2026-09-18 CT  
**Author:** software-architect (cron)  
**Board SoT:** Hermes `kelyra`  
**No application code. No SQL apply. No git ship.**

---

## OBJECTIVE

Bring **one architecture decision** and **one debt item**. File/update board `kelyra`. Do not implement.

## CONTEXT

- Board: triage 4, todo/ready/running 0, blocked 255, done 674. DITL EXEC mass-blocked. software-architect: 2 blocked (ADR `t_90dfa50e`, capture-delete debt `t_e26bbbcc`).
- `docs/architecture.md` still 2026-08-12 one-teacher MVP. ADR restamp parked CEO.
- BATCH-v1 I0–I4 shipped in prior weeks; I2 rasterize uses `SUPABASE_SERVICE_ROLE_KEY`. BATCH-v2 Drive/Needs architecture notes exist (`t_0ccd9a55`, `t_42d3e01f` done).
- Live `register_ingest_file` (`20260913000000_ingest_batches.sql`) still inserts client `p_storage_path` with **no** `{uid}/ingest/{batch_id}` prefix check. Cards `t_d3433b09` / `t_06dd401c` still sticky blocked (~138h).
- No kelyra.app DNS. Git/SQL apply = devops-release only.

## ARCHITECTURE DECISION (this week)

**Keep one product backend: Expo client + Supabase (Auth/Postgres/Storage/Edge) + server-only AI adapter. Hosted ingest workers (rasterize, ingest-drive) are the same trust domain as Edge — service_role jobs, not a second product API.**

Do **not**: Next.js web shell, SIS bus, public class URL, kelyra.app DNS, whole-class-PDF to a model.

Feature A1 notes remain domain SoT. `docs/architecture.md` restamp (`t_90dfa50e`) stays **docs-only / parked** until Chuck unblocks. Restamp must not promote HOLD ATTEND/PPT or district TRACK.

## DEBT ITEM (this week)

**`register_ingest_file` path bind** — Ride-pattern prefix `{auth.uid()}/ingest/{batch_id}/**` still missing. I2 service_role download means Storage RLS is not the last line. Rank above calendar chrome leftovers and ADR restamp for any future SQL slice. Fix = IQG + devops-release **filename after existing prefixes**; do not staff from this weekly cron.

Secondary (parked, not this week's slice): capture delete Storage-API-only (`t_e26bbbcc` / `t_9df5ecf1`); calendar oldest-school fallback; LessonWebView srcdoc vs native split.

## CEO-irreversible (unchanged)

1. kelyra.app DNS  
2. DPA / school-official claim  
3. Public / pre-auth class URL  
4. Second backend / Next.js / SIS  
5. Live SQL / git ship outside devops-release  
6. Unblocking HOLD PPT/Attendance into architecture.md  
7. Sending a whole class PDF to a model  

## Structured handoff

**OBJECTIVE:** Weekly architecture decision + one debt item on board kelyra.  
**CONTEXT:** Multi-hat product live; architecture.md stale; ingest worker service_role; DITL EXEC blocked mass.  
**REQUIREMENTS:** One ADR, one debt; tickets updated; no app code.  
**CONSTRAINTS:** No git, no SQL apply, no qa-loop implement.  
**FILES/AREAS:** `notes/company/ARCH_WEEKLY_2026-09-18.md`; `docs/architecture.md` unread for edit; `register_ingest_file` in `20260913000000_ingest_batches.sql`.  
**WORK PERFORMED:** Grounded board + SQL insert path; updated ADR + debt cards; filed this weekly card.  
**VERIFICATION:** SQL insert of `p_storage_path` has no split_part/uid check (lines 418–425). ADR `t_90dfa50e` still blocked.  
**RESULT:** Decision = workers same trust domain, no second backend. Debt = ingest path bind still P0 leftover for next SQL slice.  
**OPEN ISSUES:** Worker prod host still unverified; batch-ingest-architecture.md still missing on disk from 09-14 note.  
**ESCALATION NEEDED:** @chief-of-staff — do not burn SuperGrok on ADR restamp; keep ingest P2 sticky until CoS staffs one security SQL slice.  
**RECOMMENDED NEXT ACTION:** Leadership accept; keep ADR parked; CoS may later unblock `t_d3433b09`+`t_06dd401c` as one devops-release apply.  
