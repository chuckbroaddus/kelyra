# Open Capture

## Sub-features

Header camera on a signed-in seat. Spoken name Open Capture. The tap opens `/capture` and does not file. Not a tray tab.

## How to get to it (user POV)

Sign in. The camera sits immediately left of Search, except on Messages and while Search is open. Office seats also hide it on My children.

The control name is the locked accessibility label. It is not a new word painted on the button.

## Driving it with ui-drive

Office, superintendent or administrator, same control:

`Drive: / click=[aria-label=Open Capture]`

Teacher:

`Drive: / click=[aria-label=Open Capture]`

Parent:

`Drive: /parent click=[aria-label=Open Capture]`

Student:

`Drive: /todo click=[aria-label=Open Capture]`

Those routes are the seat roots already used by the app and the screen map. The click is the locked label. Do not rename it.

```bash
node scripts/ui-drive.mjs --surface both --persona office --route / --click '[aria-label=Open Capture]' --ids ac-sc-1 --out /tmp/kelyra-ui-drive-open-capture.json
```

Persona `teacher`, `parent`, or `student` uses the matching route above. Office proof must say superintendent or administrator. Those two seats share one Capture list.

## Gotchas

A missing camera on Messages, while Search is open, or on My children for an office seat is a hide, not a fail. A parent or student camera is required when those hides are clear. Do not treat Stamp 2 or Stamp 4 as the build lock.
