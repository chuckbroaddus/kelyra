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

## Daytime fill (use the cap — do not idle)

CEO 2026-09-03: if there is **remaining_daily** under the active ceiling, CoS and ARM **spend it** on assigned work. Sitting on Ready/Won’t-Run or stale reserved grants is a miss.

Ceiling SoT for the Chicago day:

- Default: **12% of weekly** from day-start (`remaining_daily = cap - day_used - reserved_open`)
- CEO exception: `temporary_override.date` + `max_total_pct` in ARM `supergrok_usage.json` (example: 2026-09-03 **56%** weekly total)

**Loop (CoS executes engine; no extra Grok 4.6 chat per tick):**

1. `arm_hr.py status` (live snapshot). Do not invent percents.
2. **Close** every GRANT whose kanban card is `done` / `cancelled` (`close --task-id --outcome done|parked`). Stale reserved_pct is why remaining_daily can show **0** while the meter still has room to the ceiling.
3. If `remaining_daily >= predict(next).reserve_pct`:
   - Next card is **assigned** (never unassigned epics — those Won’t Run).
   - Prefer CEO queue: research R1 → matching P1/A1. Not leftover P2/P3 outside Sunday window. Not `qa-loop` unless Chuck said send.
   - `request` → GRANT → sticky-unblock to ready (one at a time if remaining_daily is tight; at most enough GRANTs to fill remaining_daily).
4. If GRANT would breach the ceiling → **DEFER**. Stop filling.
5. Dispatcher: assigned + ready only. CoS parks unassigned Ready as sticky `needs_input`.

ARM monitors (existing 2h snapshot cron). **Daytime fill is event-driven, not a 30m poll.** When a kanban worker session truly ends (`HERMES_KANBAN_TASK` set), the shared `notify-grokbot-sessions.sh` hook runs `cron_daytime_fill.sh` (flocked, no LLM): close GRANTs when the card is `done` **or** no longer running (`blocked` after protocol_violation still held the reserve — that was the stall). Then GRANT **one** assigned `*-R1/P1/A1/Q1` child if remaining_daily ≥ reserve. Skip unassigned epics and leftover P2/P3. `staff_task.sh` also `notify-subscribe --delivery-mode notify+wake` so CoS is woken on completed/blocked/gave_up. Workers **must** `hermes kanban complete` or the dispatcher records protocol_violation and parks the card.

TTS still grok-tts. Leftover P2/P3 still Sunday 20:00–Monday 01:30 only.

## Split of labor

| ARM (HR) | CoS (orchestrator) |
|---|---|
| Live fetch, budgets, grants/defers | Ask before ready; never auto-staff expensive work |
| Ledger + prediction model | Close allocations when work finishes, then fill remaining_daily |
| Sunday leftover **decision** | Sunday leftover **staffing** + Monday park |
| Daily 08:00 cap commentary | Daily standup still reads ARM state |
| Honor CEO `temporary_override` | Park unassigned Ready (Won’t Run); staff assigned children only |

## Crons installed

- ARM `0 */2 * * *` usage snapshot (no LLM)
- ARM `0 20 * * 0` leftover-eval (no LLM)
- ARM existing `0 8 * * *` daily usage check (LLM, low)
- ARM existing `0 2 * * 1` weekly reset tracking (LLM, low)
- CoS `every 30m` leftover tick (no LLM; no-op outside window — time window, not a work-complete event)
- CoS `30 1 * * 1` leftover park (no LLM)
- CoS daytime fill: **paused** 30m cron `8583e3c788a9`; replaced by worker `on_session_end` hook + kanban `notify+wake`

## Verification (this standup)

Engine path, live `status` snapshot, `predict` priors, leftover-eval (out of window → no burn), and cron list. No kanban ready cards were mass-unblocked as part of setup.
