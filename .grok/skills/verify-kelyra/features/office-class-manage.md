# Office class Manage

## Sub-features

Office class card tab row. Manage is last. Class avatar and Feed icon live on that pane, not on Teacher.

## How to get to it (user POV)

Sign in as the office persona. Open a class from Classes. The card route is `/admin/class/{id}`. Manage is the last tab (`aria-label` `Manage`). Home Manage on `/` is a different control. Do not click that one.

## Driving it with ui-drive

`Drive: /admin/class/{id} click=[aria-label=Manage]`

`{id}` is the class the office persona opened from Classes. Substitute that id before the drive. Do not leave the braces in the URL.

```bash
node scripts/ui-drive.mjs --surface both --persona office --route /admin/class/CLASS_ID --click '[aria-label=Manage]' --ids ac-ocm-1 --out /tmp/kelyra-ui-drive-office-class-manage.json
```

The screenshot shows that class card with Manage selected, Class avatar and Feed icon on the pane, not the home Manage pane and not the signed-out splash.

## Gotchas

Home `Drive: / click=[aria-label=Manage]` is school Manage. It does not prove this tab. Opening the class still lands on Teacher; the drive click is what selects Manage. `PHONE_SAFARI` is a harness failure.
