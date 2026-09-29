# Pickup restriction

## Sub-features

Office saves a pickup restriction on the ride screen and clears that same restriction. A different family's restriction stays.

## How to get to it (user POV)

Sign in as the office persona. Open the office ride screen at `/admin/ride`. The clear control is labeled `Clear restriction`.

## Driving it with ui-drive

`Drive: /admin/ride click=[aria-label="Clear restriction"]`

```bash
node scripts/ui-drive.mjs --surface web --persona office --route /admin/ride --click '[aria-label="Clear restriction"]' --ids ac-ban-clear-1 --out /tmp/kelyra-ui-drive-ride.json
```

The control is absent until a restriction exists for the student on that screen. Say that when the screenshot has no Clear restriction button. `INTERACTION_MISSING` means the control has no accessible name, which is a harness failure until the name is on the control.

## Gotchas

An office seat with no curb duty cannot load the live queue. That refusal is the ride rule, not a missing button.
