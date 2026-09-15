# DEFECT disposition — t_bc4caccc empty /capture missing batch/capture ids

**Card:** t_bc4caccc
**Date:** 2026-09-14
**Profile:** product-manager
**Feature:** BATCH-v1 (IQG-BATCH)
**PM task:** t_3069eb63

---

## Verdict

| Field | Value |
|---|---|
| **SEVERITY** | **P2 filed → reclass NOT A BUG** (false positive) |
| **DISPOSITION** | **WONTFIX / not-a-bug** |
| **Stamp conflict?** | No |
| **CEO escalate?** | No |
| **Engineering?** | **No** |

---

## Why WONTFIX / not-a-bug

1. **Stamped prove-out bar is post-upload, not empty Capture.**
   Release §3 / testplan: **B-CE-A-01** = Teach web class-bound → Upload class stack → progress → SR-A + **batch id**. **B-SR-A-01** = Confirm ≥1 packet → Inbox + **capture ids** (`student_id` null, ≠approved, `input_source=batch`).
2. **Empty Capture cannot show ids.** No stack uploaded → no batch row → no capture rows. DOM without batch/capture UUIDs on a pre-upload CE-A surface is **correct product state**, not a miss.
3. **QE path was inspect-only.** Parent `t_4285e5c1` found "Upload class stack" and stopped. No CDP attach, no rasterize, no Split Review, no Confirm. Filing "missing ids" from that state confuses **EXEC incomplete** with **product defect**.
4. **Real EXEC is separate and already dispositioned as gate, not this card.** `t_62673215` attempted click+CDP attach; blocked on auth/UI gate; testplan rows B-CE-A-01 / B-SR-A-01 = **BLOCKED**; QE correctly did **not** file a product DEFECT for the gate. `/dashboard` +not-found is **not** this card.
5. **Not a stamp miss.** PM lock CE-A / BATCH-01 never requires persistent `B-*-A-01` markers or live UUIDs on empty Capture chrome. Ids are **evidence artifacts after** upload→Confirm, not page fixtures.

**Fail would be:** after a successful Confirm, Inbox lacks captures with `input_source=batch` / null student — that is a real B-SR-A-01 miss. Empty dropzone without ids is not.

---

## Case map

| Case | Expected | Pass when |
|---|---|---|
| Empty /capture CE-A | Upload class stack + dropzone; **0** batch/capture ids | Ids absent pre-upload |
| B-CE-A-01 | Ids **after** upload→progress→SR-A | Live batch id post-flow |
| B-SR-A-01 | Capture ids **after** Confirm | student_id null; ≠approved; input_source=batch |
| Auth/UI gate | BLOCKED ON AUTH — prove-out gap | Not Eng from this DEFECT |

---

## Binding refs

- `batch-ingest-iqg-release.md` §3 B-CE-A-01 / B-SR-A-01
- `batch-ingest-pm-lock.md` BATCH-01, CE-A chrome
- `batch-ingest-testplan.md` (t_62673215) BLOCKED rows
- Parent inspect: t_4285e5c1; EXEC: t_62673215; this PM: t_3069eb63

---

## Recommended next action (CoS)

1. Accept **WONTFIX / not-a-bug** on t_bc4caccc. **Do not staff Eng.**
2. Keep B-CE-A-01 / B-SR-A-01 open only as **prove-out / auth session** work (Teach signed-in path), not product FIX-NOW.
3. QE: do not re-file empty-page missing-ids; require upload→Confirm before id FAIL.

---

## Handoff

- **RESULT:** SEVERITY reclass not-a-bug; DISPOSITION **WONTFIX**.
- **FILES:** `notes/company/batch-ingest-defect-bc4-disposition.md`
- **ESCALATION:** No.
- **NEXT:** CoS — no Eng; prove-out auth path separate.
