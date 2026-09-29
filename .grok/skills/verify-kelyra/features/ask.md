# Ask

## Sub-features

Teacher Ask, parent Ask, and the parent seat of a teacher who is also a parent. Ask stays on the seat that opened it.

## How to get to it (user POV)

Open Ask. Teacher and parent trays label the tab `Ask`. The office tray labels it `KelyraAsk`. The route is `/ask`.

## Driving it with ui-drive

Teacher: `Drive: /ask click=[aria-label=Ask]`

Parent seat: add `Persona: teacher` and `Seat: parent`, or `Persona: parent`.

```bash
node scripts/ui-drive.mjs --surface web --persona teacher --seat teacher --route /ask --click '[aria-label=Ask]' --ids ac-ask-inbox-1 --out /tmp/kelyra-ui-drive-ask.json
```

## Gotchas

A reply that names HTTP 400, or a permission error from a database function, is a data failure. Do not spend the screen repair on it. A sign-in splash after a persona was requested is `PERSONA_INJECT_FAILED`.
