# RIDE-S1: FERPA / Security Review — Car-rider (photo / plate)

**Date:** 2026-09-05  
**Author:** chief-of-staff (not a legal opinion)  
**Status:** Review only. GATE does not authorize a loop.  
**Depends on:** R1/P1/A1 2026-09-05 locks.

---

## 0. Verdict

Phone LPR is in v1. P0s: photo/plate PII, no parent firehose, duty wall, no anon/token parent, no client INSERT, twins fail closed, matcher never inserts people, restriction **reason hidden from parent**, 7-day purge, superintendent-only photo archive, STT/LPR keys server-side.

CEO closed: TTL **7 days** photos **and** events; archive day’s **photos** (superintendent) kept until delete; parent fail copy has **no reason**; success may show **own XX**, never total; subpoena **out of v1**.

---

## 1. Data classes

| Data | Who |
|---|---|
| Line photos | Curb capture; superintendent archive. Never other parents, Ask, public |
| Plates | Owner parent’s own list; curb. Stage: prefer no plate |
| Own XX | That parent only |
| Restriction reason / office note | Office only. Parent: Check in failed |
| Archived photos | Superintendent |

---

## 2. Threats (must-fix)

**T1 firehose P0** — Parent reads only `dismissal_my_trip` (status, XX, own kids). No base SELECT, no realtime, no total.  
**T2 columns P0** — No plate lookup oracle.  
**T3 twins P0** — Linked + picked children only.  
**T4 duty P0** — No `is_staff` widen.  
**T5 token/anon P0**.  
**T6 LPR oracle P0** — Window + line bound; parent DTO does not name the ahead parent.  
**T7 keys/XSS P0** — No EXPO_PUBLIC vision; no HTML of LPR.  
**T8 forge order P0** — Server seq; staff `order_fix` audited.  
**T9 restriction P0** — Fail closed; parent copy has no reason; duty flag only.  
**T10 unknown P1** — Curb/office, not stage wall.  
**T11 retention P0** — 7-day purge; archived photos skip purge; no CASCADE wipe on person delete; no public bucket; no Ask. Archive RPC superintendent + audit.  
**T12 dual-hat P0** — Separate RPCs.  
**T13 offline P1** — Wipe on sign-out.  
**T14 school_id P0**.  
**T15 nudge P1** — No plates/names of others.  
**T16 no Ask tool P1**.  
**T17 STT P1** — Plate **text** stored; do not keep raw audio unless a later CEO lock.  
**T18 two firsts P1** — Conflict visible to **curb**, not to other parents.

IDs RIDE-S1-01…19 plus **20** archive/purge, **21** parent copy (fail no reason; success XX no total).

---

## 3. OPEN

None for GATE. Subpoena out of v1.
