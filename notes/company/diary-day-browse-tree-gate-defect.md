# DEFECT disposition — DB-B Journal day-browse missing from working tree

**DEFECT board card (binding disposition):** `t_b7f02a5f`  
**PM disposition card:** `t_db7a8d34`  
**IQG parent:** `t_ea554343`  
**Impl claim (false-green vs tree):** `t_ce15c1c9` / `wf_01a0b09fca8f70e2b131fd383e3c995d`  
**QAS prove-out OBJECTIVE:** `t_aa9ca9ef` · `notes/company/diary-day-browse-proveout-objective.md` (§0.1 TREE GATE)  
**Date:** 2026-09-18  
**Author:** product-manager  
**Dual stamp (still binding):** MET 2026-09-17 — PM `t_f766ae6a` pack **DB-B** + QAS `t_d717511a`  
**Stamp SoT (may be off-disk; restore from kanban/session before Eng):**  
- `notes/company/diary-day-browse-spec.md`  
- `notes/company/diary-day-browse-intent.md`  
- `notes/company/diary-day-browse-research.md`  
- `notes/company/diary-day-browse-ux-options.md` (or designer pack notes)  
- `notes/company/diary-day-browse-mockups/db-b.html`  
**Prove-out SoT on disk:** `notes/company/diary-day-browse-proveout-objective.md`  
**Noun:** Diary Journal day-browse (DB-B)  
**Designer:** Not required for this defect (no new chrome; re-land stamped DB-B)

---

## DISPOSITION (binding)

```
Board card: t_b7f02a5f
SEVERITY: P1
DISPOSITION: FIX-NOW
Reason: Dual-stamped DB-B Journal day-browse is absent from the working tree after
loop t_ce15c1c9 claimed pass. Live Journal is still pre-DB-B From/To YYYY-MM-DD +
Apply; dayBrowse.ts / JournalMonthGrid.tsx missing; stamp notes mostly off-disk;
git never shipped. TREE GATE FAIL (proveout §0.1). Primary owner-seat lifecycle
missing for all teacher/parent/staff Journal hats — not polish. IQG Phase 6:
P1 → FIX-NOW. No exception written.
CEO escalate: No (not production-claimed ship / legal / spend P0 override).
Next owner: CoS ARM + Eng re-land stamped DB-B via kelyra-qa-loop against dual
stamp (restore spec/intent/mockup from kanban/session if needed). QE stays dark
until TREE GATE anchors present. No git restore from PM. No designer pack.
```

| Field | Value |
|---|---|
| **Board DEFECT** | **`t_b7f02a5f`** |
| **SEVERITY** | **P1** (confirmed; not upgraded to P0) |
| **DISPOSITION** | **FIX-NOW** (binding this turn) |
| **SCHEDULE / DEFER / WONTFIX** | Rejected — dual stamp MET; primary Journal lifecycle absent |
| **P0?** | No — no production-claimed ship of DB-B; no wrong-child/data-loss/privacy leak from a partial day-browse; absence of stamped primary browse, not a live privacy regression |
| **Stamp conflict?** | Yes vs dual MET DB-B (Journal = month grid + Today + ◀▶ + agenda; RG-DROP From/To primary) |
| **Engineering after disposition?** | **Yes** — CoS ARM + Eng child of `t_b7f02a5f` (or IQG parent lane); PM does not staff Eng |
| **QE** | Dark until TREE GATE anchors on tree under test |
| **Designer** | No — re-land stamped pack; do not invent chrome |
| **Git from this card** | No — CoS/Eng only; PM does not restore stash |

---

## Repro / tree fact (grounded 2026-09-18 — PM re-check)

| Check | Result |
|---|---|
| `src/app/diary.tsx` Journal | Still `journalFrom` / `journalTo` + labels **From date (YYYY-MM-DD)** / **To date** + **Apply filters** (pre-DB-B) |
| `src/lib/diary/dayBrowse.ts` | **Absent** |
| `src/lib/diary/dayBrowse.test.ts` | **Absent** |
| `src/components/diary/JournalMonthGrid.tsx` | **Absent** |
| `notes/company/diary-day-browse-spec.md` | **Absent** on disk |
| `notes/company/diary-day-browse-intent.md` | **Absent** on disk |
| `notes/company/diary-day-browse-proveout-objective.md` | **Present** (untracked) |
| `git status` | `main...origin/main` clean tracked; untracked prove-out + unrelated needs-attention notes |
| Loop claim | `t_ce15c1c9` done — named dayBrowse / JournalMonthGrid / diary.tsx; **no git ship** |
| Stash note (CoS) | `stash@{0}` pre-soft-134 dirt has diary.tsx + diary.security.test.ts only — **not** a full DB-B restore path for PM |

**EXPECTED (stamped DB-B):** Journal primary = month grid + Today + ◀▶ + selected-day agenda; RG-DROP From/To+Apply as primary; FW-FORK diary primitives; Ledger list+range unchanged; Calendar product untouched; student zero Diary.

**ACTUAL:** Pre-DB-B Journal filter+list. Feature absent for every owner seat.

---

## Severity rationale

**P1 (confirm suggested):**

1. Prove-out OBJECTIVE severity table: tree missing DB-B = **P1**; primary hat / lifecycle missing (no month grid / Today) = **P1**.
2. All owner seats (teacher tray ST-A · parent/office hamburger) — stamped primary Journal browse not on tree.
3. Dual stamp already MET — this is realization / tree integrity, not a design reopen.
4. Loop pass without durable tree + no git ship = false-green; units-alone must not pass TREE GATE.

**Not P0:** Production did not claim DB-B ship; no active wrong-child mix, data loss, or privacy leak from a half-landed day-browse. Absence is severe for IQG progress, not a live FERPA incident.

**Not P2/P3:** Not secondary/multiplicity polish — primary browse chrome is the feature.

---

## Disposition rationale (FIX-NOW)

1. IQG Phase 6 / operating rule: **P0/P1 → FIX-NOW unless written reason.** No reason to SCHEDULE/DEFER/WONTFIX.
2. Leaving SCHEDULE would strand dual-stamped CEO-directed day-browse behind a green loop that did not leave anchors on main.
3. WONTFIX would void dual stamp without CEO park — out of PM authority.
4. Eng must **re-land** full stamped DB-B (not a thinner slice); restore missing stamp notes from kanban parent comments / prior session artifacts when staffing.

---

## Eng contract (for CoS → Engineering — PM does not implement)

1. **SoT:** Dual stamp DB-B on `t_ea554343` (PM pack lock + QAS intent). Prefer restored `diary-day-browse-spec.md` + `diary-day-browse-intent.md` + `db-b.html` before loop; if unrestorable, rebuild from parent kanban stamp comments + research/designer handoffs — **do not invent a new pack**.
2. **Vehicle:** `kelyra-qa-loop` only. No inline implement. No git from disposition cards.
3. **Must land on tree under test:**
   - Journal primary: month grid + Today + month ◀▶ + agenda (sticky day headers)
   - RG-DROP Journal From/To text + Apply as primary
   - PR-BOTH owner-only presence; twin chips fail-closed; student closed
   - FW-FORK diary-local primitives (e.g. `JournalMonthGrid`, `dayBrowse` helpers + tests)
   - Ledger unchanged; Calendar product untouched; no CalendarItem pipeline on Journal
4. **SQL:** expect none (UI-only prior claim).
5. **After tree anchors:** QAS/QE prove-out per `diary-day-browse-proveout-objective.md` TREE GATE first — no PASS on units alone.
6. **Non-goals:** designer restamp; Ask NL (`t_cecf2af0`); merge Calendar↔Diary; PM/CoS stash archaeology as substitute for loop re-land; DITL rewrite on Eng card (prefer sticky ditl-scribe).

---

## IQG Phase 6 checklist

| Rule | Applied |
|---|---|
| Confirm/correct severity | **P1 confirmed** |
| Disposition same turn | **FIX-NOW** on `t_b7f02a5f` |
| P0/P1 → FIX-NOW unless written reason | No exception |
| Docs only this turn | Yes — no app code, qa-loop, git |
| Staff Eng? | **CoS only** after FIX-NOW |
| CEO escalate? | **No** |

---

## Handoff

| Item | Value |
|---|---|
| **RESULT** | SEVERITY **P1** · DISPOSITION **FIX-NOW** binding on `t_b7f02a5f` |
| **SoT path** | `notes/company/diary-day-browse-tree-gate-defect.md` |
| **OPEN ISSUES** | Stamp notes + DB-B source absent on disk; prior loop uncommitted work may be gone — Eng re-land from stamp, not PM git restore |
| **ESCALATION NEEDED** | No CEO; CoS for ARM + Eng staff |
| **RECOMMENDED NEXT ACTION** | CoS ARM + staff Eng re-land DB-B; hold QE until TREE GATE green |
