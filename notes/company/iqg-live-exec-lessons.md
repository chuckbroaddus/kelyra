# IQG live prove-out — lessons (BATCH-v1, 2026-09-14)

CEO-facing. Not a DESIGN STAMP. Encode into QE/CoS staffing, not into happy-path Eng.

## What actually happened

I0–I5 **shipped**. Dual stamp **held**. Live Confirm **worked** (batch `6f05a42e`, unnamed capture `1228977f`, `input_source=batch`). IQG stamp still **not** full APPROVED (remaining matrix + QE process misses).

Most of the afternoon was **not** product failure. It was prove-out process failure.

## Lessons

1. **Loop green ≠ live EXEC.** Unit 28/28 and code inspect are aids. QAS was right to REJECT plan-only, inspect-as-PASS, and splash-as-EXEC.

2. **QE must not invent “no stack.”** Expo `8081` was already up. “Do not start a server” ≠ “do not curl localhost.” CoS starts daemons; QE curls first.

3. **`browser_exec` ≠ Grok Bot Electron.** Harness needs real Chrome/CDP. CoS launches a **dedicated** profile (`/tmp/kelyra-qe-chrome`, port 9222), not Chuck’s personal Chrome.

4. **App title 🐴 is not signed-out.** `/dashboard` is Expo **+not-found**. Teach CE-A is **`/capture`**. QE must use product routes, not guessed URLs.

5. **OS file pickers are human.** `Upload class stack` opens `ClassStackBinder`. **Choose files** creates an ephemeral `<input type=file>` — CDP `setFiles` on a stable node will fail. That is **not** a product DEFECT (PM WONTFIX twice). Human picks the file; QE harvests ids.

6. **Empty Capture has no batch/capture ids.** Filing `DEFECT` because ids are absent **before** upload is not-a-bug (PM WONTFIX).

7. **Fixtures can fake product bugs.** A 429-byte PDF displays **0.0 MB** (`formatMb` toFixed(1)) and rasterized **blank** → 0 packets → red roster copy. Use a **non-blank ≥100KB** PDF. Don’t ship CoS stubs as “the worksheet.”

8. **SQL is SoT for ids.** DOM/localStorage UUID scrape mixed **batch** ids into “captures.” QE harvest must `select captures` (or Inbox row), not “any UUID on the page.”

9. **QE must not QAS-review their own DEFECT.** CoS never stays assignee on `DEFECT [` (assign none, sticky block, staff PM). Default assignee will steal.

10. **Don’t restaff the same miss.** After two identical QE failures, stop and change the method (human upload, SQL harvest, different tool) instead of burning SuperGrok.

11. **Roster check-off looks like an error.** Danger copy when packets ≠ roster is SCHEDULE (P2), not FIX-NOW. Confirm only needs ≥1 non-blank packet.

## Mitigations (do next time)

**Staffing (CoS)**

- Live UI EXEC handoff always includes: URL (`/capture`), `curl` 8081 first, **no `new_tab`**, Chrome CDP endpoint, “🐴 is the app title,” “do not complete INSPECT-ONLY.”
- After **one** failed CDP file attach: **stop QE clicks**. Ask CEO to Choose files → Confirm. Then QE **read-only harvest**.
- Harvest card: “SQL `captures` for this `ingest_batch_id` only; batch UUID is not a capture.”
- `DEFECT [` → `assign none` + `block --kind needs_input` (no extra words) + staff PM the same turn.

**QE bar**

- PASS on UI rows requires live evidence of the **entity class** (batch vs capture).
- No PASS from finding a button. No PASS from `/dashboard`.
- File DEFECT only after the **intended control** was used (binder + Choose files + Confirm), or screenshot of a real product miss.

**Fixtures**

- Default stack fixture: `notes/qa-fixtures/batch-ingest/one-page-not-blank.pdf` (≥100KB, dark marks, `pdftoppm` not blank).
- Never use ASCII-stub “PDFs” or sub-1KB files for live rasterize.

**Product (SCHEDULE, not this card)**

- `formatMb`: show KB under 0.1 MB (`t_d572c9b6` P3).
- Roster mismatch: mute/check-off, not danger-as-hard-error (`t_1dac5ac2` P2).
- Optional later: stable `data-testid` + hidden file input for CDP (PM did **not** FIX-NOW).

**IQG honesty**

- Credit CE-A/SR-A when SQL matches a CEO Confirm.
- Do not APPROVE the whole feature while NA/I4/I5/phone/dual/cam are empty.
