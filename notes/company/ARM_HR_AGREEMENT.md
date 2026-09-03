# ARM ↔ Chief of Staff agreement — SuperGrok HR

**Date:** 2026-09-02  
**Parties:** Chief of Staff (`chief-of-staff`) and AI Resource Manager (`ai-resource-manager`)  
**CEO:** Chuck  
**Project:** kelyra (class app + Author studio)

ARM behaves as **Human Resources for SuperGrok Premium credits**. CoS may set company priorities, but **credit is a scarce headcount-like resource**. Work does not enter kanban `ready` until ARM allocates.

## Policy Chuck asked for (locked)

| Rule | Value |
|---|---|
| Daily cap | **12% of weekly SuperGrok credit** per America/Chicago day |
| Weekly reset | **Monday 01:38** America/Chicago (billing `currentPeriod.end` is SoT when present) |
| Ready gate | CoS **asks ARM** before moving a kelyra card to `ready`. If no grant, **wait until the next Chicago day** |
| Collection | Snapshot + activity profile on team work, including **zero-delta** rows (API is whole-number percents) |
| Forecast | ARM prediction model per activity class; used when CoS asks “how much will this kanban task cost?” |
| Leftover | **Sunday 20:00** Chicago: if weekly remaining ≥ 1%, burn **P2/P3 one at a time** |
| Hard stop | **Monday 01:30** Chicago: leftover P2/P3 go back to **sticky blocked** (before 01:38 reset) |
| TTS | Unchanged — `grok-tts` only |
| CEO | Strategy, legal, spend, irreversible production, and cap exceptions stay with Chuck |

Today (2026-09-02) still has the existing one-day override in `supergrok_usage.json` (max total 42%). Starting 2026-09-03 the 12% daily cap is enforced as written.

## How we communicate (cheap on purpose)

We do **not** spend a Grok 4.6 chat for every allocation. ARM owns a deterministic engine CoS executes:

```
~/.hermes/profiles/ai-resource-manager/scripts/arm_hr.py
```

| Verb | Who | When |
|---|---|---|
| `status` / `snapshot` | ARM cron + CoS | Live billing % + daily/weekly remaining |
| `request` | CoS (or leftover tick) | Before `ready` / leftover unblock |
| `close` | CoS after done/park | Writes activity ledger + updates model |
| `predict` | ARM or CoS | Forecast a task class |
| `leftover-eval` | ARM Sunday 20:00 | Sets `memory/leftover_decision.json` |
| `leftover-next` | CoS 30m tick | Picks one sticky-blocked P2/P3 |

LLM ARM jobs stay for the 08:00 policy check and disputes/exceptions. File artifacts are the contract.

## Collection method

xAI only moves **integer percents**. A single specialist-sync often shows **0**. That is recorded, not discarded.

Each closeout stores: profile, activity class, kanban id/title, window (daily vs leftover), before/after Build/Chat/Voice/Other, delta, `quantized_zero`, reserved %, prediction used.

Classes: `qa-loop`, `author-qa-loop`, `grok-build`, `p2p3-burn`, `kanban-worker`, `specialist-sync`, `grok-4.6-high`, `tts`, `cron-low`.

Hooks:

- `staff_task.sh` — sticky-block → `request` → GRANT unblocks, else stays blocked
- `invoke_profile.sh` — snapshot before/after (does **not** hard-block CoS sync asks; those are logged)
- ARM snapshot cron every 2 hours — catches unattributed aggregate ticks

## Prediction model

Stored at `memory/prediction_model.json`.

- n < 5: **prior** reserve (`qa-loop`/`author-qa-loop` 3%, `grok-4.6-high` 2%, `kanban-worker` 1%, `cron-low` 0%)
- n ≥ 5: **empirical mean including zeros**
- Reserve is a whole percent (matches the meter). Forecast replies include `expected_pct`, `p_zero`, `n`, and the quantization caveat.

This gets better as zero-delta rows accumulate (“about 1% per N similar tasks”).

## Leftover Sunday → Monday

1. Sunday 20:00 ARM `leftover-eval`: if remaining weekly ≥ 1%, `burn=true`.
2. Every 30 minutes CoS `cron_leftover_tick.sh` (no LLM): at most **one** leftover grant; unblocks one sticky P2/P3.
3. Monday 01:30 CoS `cron_leftover_park.sh`: those cards `block --kind needs_input` again; open leftover allocations `close --outcome parked`.
4. ~01:38 weekly meter resets. ARM Monday 02:00 job still resets daily baseline tracking.

P2/P3 **outside** this window stay sticky blocked (existing grok-build-ping rule). Leftover is the only auto-unblock.

## Split of labor

| ARM (HR) | CoS (orchestrator) |
|---|---|
| Live fetch, budgets, grants/defers | Ask before ready; never auto-staff expensive work |
| Ledger + prediction model | Close allocations when work finishes |
| Sunday leftover **decision** | Sunday leftover **staffing** + Monday park |
| Daily 08:00 cap commentary | Daily standup still reads ARM state |

## Crons installed

- ARM `0 */2 * * *` usage snapshot (no LLM)
- ARM `0 20 * * 0` leftover-eval (no LLM)
- ARM existing `0 8 * * *` daily usage check (LLM, low)
- ARM existing `0 2 * * 1` weekly reset tracking (LLM, low)
- CoS `every 30m` leftover tick (no LLM; no-op outside window)
- CoS `30 1 * * 1` leftover park (no LLM)

## Verification (this standup)

Engine path, live `status` snapshot, `predict` priors, leftover-eval (out of window → no burn), and cron list. No kanban ready cards were mass-unblocked as part of setup.
