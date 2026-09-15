# DEFECT disposition — live UX: formatMb 0.0 MB + roster danger copy

**Cards / source:** live CEO batch `c8ba779e-6055-4c7c-ab21-7ce9903c7c00` (not QE harness)
**Date:** 2026-09-14
**Profile:** product-manager
**Feature:** BATCH-v1 (IQG-BATCH)
**PM task:** t_8aab93f9

---

## Summary table

| # | Finding | Severity | Disposition | Eng now? |
|---|---|---|---|---|
| 1 | formatMb shows 0.0 MB under ~50KB | P3 | SCHEDULE | No |
| 2 | Roster check-off danger + hard-error copy | P2 | SCHEDULE | No |

CEO escalate: No. No app code from this card.

---

## Live context (binding)

- **Batch:** `c8ba779e-6055-4c7c-ab21-7ce9903c7c00`
- **Fixture:** 429-byte CoS PDF → binder chip `formatMb` → **0.0 MB**
- **Rasterize:** `blank=true` → **0 eligible** packets
- **Split Review chrome:** red line `0 packets · roster 7 · Packet count does not match the roster`
- **Confirm disabled root cause:** `canConfirmSplit` (0 non-blank), **not** roster≠packets
- **Code path:** `rosterCheckOff` mismatch → `colors.danger` + `INGEST_COPY.splitRosterMismatch` whenever `eligible ≠ roster`

Stamp anchors (informational check-off; Confirm still allowed if ≥1 packet):

- `batch-ingest-intent.md` §3.2 roster check-off **informational**; §4 “Packet count ≠ roster → still Confirm if ≥1; surface missing N”
- `batch-ingest-pm-lock.md` SR-A / BATCH-07 roster **count** check-off; BATCH-06 Confirm disabled only at 0 packets
- `splitPackets.ts` `canConfirmSplit` = eligible > 0 only; `rosterCheckOff` never gates Confirm

---

## Finding 1 — formatMb 0.0 MB

| Field | Value |
|---|---|
| **SEVERITY** | **P3** (polish; no blocked school flow) |
| **DISPOSITION** | **SCHEDULE** |
| **Stamp conflict?** | No — BATCH-13 is TUS / soft / hard gates, not chip precision |
| **CEO escalate?** | No |
| **Engineering?** | **No now** (not FIX-NOW) |

### Why SCHEDULE (not FIX-NOW / not WONTFIX)

1. **Repro is real in code.** `caps.ts` `formatMb`: `(bytes / 1MiB).toFixed(bytes >= 100MiB ? 0 : 1)` → any file **under ~52 KiB** renders **0.0**. Binder chip: ``${name} (${formatMb(size)} MB)`` (`ClassStackBinder.tsx`).
2. **Does not block teachers on real stacks.** Live hit was a **429-byte CoS fixture**. Classroom MFP class stacks are multi-MB; soft-warn path only fires above ~40 MB, so soft copy never shows 0.0 in practice.
3. **Not a stamped size-path miss.** BATCH-13 / intent size laws: TUS >6 MB, soft >40 MB / >80 pages, hard >250 MB / >400 pages. Display of tiny fixture bytes is polish.
4. **WONTFIX rejected:** function is objectively wrong for sub-50KB labels; keep a backlog polish, do not pretend intentional.
5. **When Eng eventually touches `caps.ts`:** prefer KB under ~0.1 MB (or 2 decimals under 1 MB); keep MB unit only when ≥0.1 MB. Soft-warn strings stay MB-scale. Unit tests for 429 B, 40 KB, 6 MB, 40 MB, 100 MB.

### Not a bug if

- Soft/hard gates and TUS thresholds still fire on byte totals correctly (they do; gates use raw bytes, not `formatMb` string).

---

## Finding 2 — roster danger copy

| Field | Value |
|---|---|
| **SEVERITY** | **P2** (secondary UX vs stamp; workaround = press Confirm when enabled) |
| **DISPOSITION** | **SCHEDULE** |
| **Stamp conflict?** | Partial chrome miss — behavior OK, presentation overstates |
| **CEO escalate?** | No |
| **Engineering?** | **No now** (not FIX-NOW) |

### Why P2 SCHEDULE (not FIX-NOW / not WONTFIX)

1. **Stamped intent = informational check-off, not a hard gate.** Intent §3.2 / §4 and lock SR-A: surface missing vs roster; Confirm stays allowed if ≥1 non-blank packet; never invent students. Live Confirm disable at 0 packets is **correct** (`canConfirmSplit`).
2. **Chrome overstates severity.** `SplitReview.tsx` paints check-off in `colors.danger` and appends `splitRosterMismatch` (“Packet count does not match the roster — check blanks and splits.”) whenever `!checkOff.match`. That reads as a **blocking error**, not a count check-off. A **1-packet stack vs roster 7** stays red even while Confirm is **enabled** — teacher may think the flow is failed.
3. **Live 0-packet case confounds causes.** CEO saw red roster line + disabled Confirm. Root disable is **0 eligible**, not roster math. Copy does not separate “add a non-blank packet” (`splitEmptyConfirm`) from “count ≠ roster (ok to confirm later)”.
4. **Not P0/P1.** No wrong child, no silent roster insert, no false Confirm block on mismatch, no Approve leak. Flow completable when ≥1 packet; hesitation only.
5. **Not WONTFIX.** Stamp said informational / “surface missing N”; danger+hard-error string is a real quality miss vs that chrome intent.
6. **Why not FIX-NOW:** IQG P2 → SCHEDULE unless blocking a live school job. Confirm path works; polish/copy/token when Eng capacity allows (after I4 dual-stamp / higher P0–P1).

### Eng guidance when scheduled (do not implement on this card)

1. Keep `canConfirmSplit` **independent** of roster match (law).
2. Mismatch + Confirm still allowed → **warn/mute** token (not danger); copy like “missing N vs roster — still OK to confirm” / surface missing count per intent.
3. Optional stronger attention only when eligible=0 (pair with `splitEmptyConfirm`); do not imply roster math is why Confirm is off.
4. `rosterCheckOff` may expose `missing = expected - eligible` for copy; still no names.
5. Tests: match→mute; mismatch+eligible≥1→non-danger + Confirm enabled; eligible=0→Confirm disabled regardless of roster color.

---

## CoS next actions

1. Accept both dispositions as **binding**. **Do not staff Engineering** from this card (neither is FIX-NOW).
2. File or sticky-tag backlog items if board wants discrete DEFECT cards:
   - `DEFECT [P3]: formatMb shows 0.0 MB under ~50KB` — DISPOSITION SCHEDULE
   - `DEFECT [P2]: Split Review roster check-off uses danger + hard-error copy` — DISPOSITION SCHEDULE
3. Leave SCHEDULE items sticky `needs_input` / backlog until capacity; do **not** ARM GRANT Eng for these alone.
4. Do **not** treat live 0.0 MB on CoS micro-fixtures as a prove-out fail of BATCH-13 size path.
5. Do **not** treat red roster line + disabled Confirm at 0 packets as a Confirm-gate regression — gate is eligible count (correct).
6. Continue prove-out EXEC with real multi-page / multi-packet fixtures when harvesting B-CE-A-01 / B-SR-A-01.

---

## Binding refs

- Live handoff: `notes/company/batch-ingest-pm-live-ux-handoff.md`
- Intent: `notes/company/batch-ingest-intent.md` §3.2, §4
- PM lock: `notes/company/batch-ingest-pm-lock.md` BATCH-06/07/13, SR-A
- Code: `src/lib/ingest/caps.ts` `formatMb`; `src/components/ingest/ClassStackBinder.tsx` chip; `src/lib/ingest/copy.ts` `splitRosterMismatch`; `src/components/ingest/SplitReview.tsx` check-off color; `src/lib/ingest/splitPackets.ts` `canConfirmSplit` / `rosterCheckOff`
- IQG Phase 6: P2/P3 → SCHEDULE; FIX-NOW only for P0/P1 unless written exception

---

## Handoff

- **RESULT:** Finding 1 **P3 / SCHEDULE**; Finding 2 **P2 / SCHEDULE**. No FIX-NOW. No Eng. No git.
- **FILES:** `notes/company/batch-ingest-live-ux-0mb-roster-disposition.md`
- **ESCALATION:** No.
- **NEXT:** CoS — no Eng staff from this card; backlog the two SCHEDULE polish items; continue BATCH prove-out with non-micro fixtures.
