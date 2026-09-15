# ARM Capacity Brief — 2026-09-14 Weekly Roadmap Sync

**Date:** 2026-09-14
**Pools:** SuperGrok + Grok Bot (independent wallets)
**Live snapshot from arm_hr.py status (09:32 CT)**

## SuperGrok Pool
- remaining_weekly: 100%
- remaining_daily: 8% (cap 12%, 4% reserved by 4 open specialist-sync P2 grants)
- open_allocations: 4 x 1% (strategy, product-manager, software-architect, ai-resource-manager)
- holds: t_a069938c (I4) DEFER_UNTIL_NEXT_WEEK (stale, weekly now 100%)

## Grok Bot Pool
- remaining_weekly: ~54%
- remaining_daily: 14%
- open_allocations: []
- holds: t_020b0326 (CAL-R2-B-QE-LIVE2) DEFER_UNTIL_TOMORROW

## Recommendations (2026-09-14 daytime fill)
- SuperGrok 8% left: spend on assigned P1/R1 work (independent of Grok Bot). Prefer CEO queue over P2 specialist-sync if tight.
- Grok Bot 14% left: can fill assigned work; hold t_020b0326 may be retryable today since daily 14% available.
- Retry I4 GRANT this week: yes (weekly reset, no longer <1%).
- grok-bot hold: still valid today? Review after close of current grants; independent wallet.

## Burn plan
- Fill remaining_daily on assigned cards only.
- No leftover-window P2/P3 burn (not in window).
- Two wallets never gate each other.

---

*Skeleton — live % only; full brief grows via patch.*

## Live Status JSON Summary (no secrets)
```json
{
  "date": "2026-09-14",
  "supergrok": {
    "remaining_daily_pct": 8,
    "remaining_weekly_pct": 100,
    "reserved_open_pct": 4,
    "open_allocations_count": 4,
    "holds": ["t_a069938c:DEFER_UNTIL_NEXT_WEEK"]
  },
  "grok_bot": {
    "remaining_daily_pct": 14,
    "remaining_weekly_pct": 54,
    "reserved_open_pct": 0,
    "open_allocations_count": 0,
    "holds": ["t_020b0326:DEFER_UNTIL_TOMORROW"]
  },
  "recommendation": "Proceed with daytime fill on assigned work for both independent wallets. Retry I4 this week. Review grok-bot hold today."
}
```

## Hold Advice
- I4 GRANT (t_a069938c): Retry this week — weekly remaining 100%, stale DEFER from prior week no longer applies. Use arm_hr.py request for qa-loop class when ready.
- grok-bot hold (t_020b0326): Still valid for tomorrow but daily cap 14% available today; can be retried independently of SuperGrok. Do not gate one wallet on the other.

## Acceptance
Live % + recommended daily burn plan for 2026-09-14 delivered. Brief ready for Leadership Roadmap Sync.