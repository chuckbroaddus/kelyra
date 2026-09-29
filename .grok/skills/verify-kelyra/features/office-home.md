# Office home

## Sub-features

Signed-in office home, People, and Manage. A signed-out visit still shows the splash.

## How to get to it (user POV)

Sign in as the office persona. The home screen is `/`. People and Manage are tabs on that home (`aria-label` `People` and `Manage`).

## Driving it with ui-drive

`Drive: / click=[aria-label=People]`

```bash
node scripts/ui-drive.mjs --surface both --persona office --route / --click '[aria-label=People]' --ids ac-office-home-1 --out /tmp/kelyra-ui-drive-office.json
```

The screenshot shows the office home with People selected, not the Metro overlay and not the signed-out splash.

## Gotchas

An office account that also has a teacher row is a different check from an office account with no teacher row. Say which account the shot used. `PHONE_SAFARI` means the simulator opened Safari. That is a harness failure.
