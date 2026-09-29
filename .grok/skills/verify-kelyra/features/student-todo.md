# Student To Do

## Sub-features

A student opens their own To Do row on the web. The phone To Do path still opens that same row.

## How to get to it (user POV)

Sign in as the student persona. Assignments is `/todo`. The tab label is `Assignments`.

## Driving it with ui-drive

`Drive: /todo click=[aria-label=Assignments]`

```bash
node scripts/ui-drive.mjs --surface web --persona student --route /todo --click '[aria-label=Assignments]' --ids ac-todo-open-1 --out /tmp/kelyra-ui-drive-todo.json
```

The list belongs to the signed-in student. An empty list is what the screen showed. It is not a pass for an id that requires opening a row.

## Gotchas

A narrow browser is not the phone. `Surface: both` needs the simulator shot from this script. `PHONE_SAFARI` is a harness failure.
