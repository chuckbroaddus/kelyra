# Messages

## Sub-features

Teacher messages tray. People in that school. A person from another school stays off the tray.

## How to get to it (user POV)

Sign in as the teacher persona. Open Messages. The tab label is `Messages`. The route is `/messages`.

## Driving it with ui-drive

`Drive: /messages click=[aria-label=Messages]`

```bash
node scripts/ui-drive.mjs --surface both --persona teacher --seat teacher --route /messages --click '[aria-label=Messages]' --ids ac-tray-school-1 --out /tmp/kelyra-ui-drive-messages.json
```

A pass shows message rows, or the empty copy. `Working…` with no rows is `ROUTE_NOT_SETTLED`, a harness failure.

## Gotchas

Header Search leaves the route. The driver refuses Search as the click. Do not edit `scripts/ui-drive.mjs` to wait longer and call that a product fix.
