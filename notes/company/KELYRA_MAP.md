# Kelyra map (living)

## Products
- Class app: `~/projects/kelyra`
- Author studio: `~/projects/kelyra-author`

## Work tracking
- Hermes kanban board slug: `kelyra` (display: Kelyra Company)
- Dashboard: `~/projects/kelyra/notes/dashboard/kanban.html`
- Refresh: `~/projects/kelyra/notes/dashboard/refresh-kanban.sh`
- Legacy HTML: `~/projects/kelyra/notes/dashboard/archive/index.html.20260902`
- Legacy items: `~/projects/kelyra/notes/dashboard/worklist.json` (merged 2026-09-02; OPEN/HOLD/SENT/etc. → blocked cards; APPLIED not recreated)

## Loops / boards (do not auto-push)
- Kelyra Loop: `~/projects/kelyra-loop-board` (port 8764)
- Author Loop: `~/projects/kelyra-author-loop-board` (port 8765)
- Coding QA: `kelyra-qa-loop` / `author-qa-loop` (SuperGrok Build) **or** `kelyra-bot-build-loop` / `author-bot-build-loop` via `grok-bot-consultant` when SuperGrok cannot GRANT
- Desk SoT (legacy): `notes/dashboard/worklist.json` — prefer kanban now
- Do not configure kelyra.app DNS until Chuck says

## Bots (profile IDs)
See `BOT_TEAM_INVENTORY.md`. Display names are `Kelyra [Role]`. IDs unchanged for scripts/kanban assignees.

## SuperGrok / ARM
Governor: `ai-resource-manager` (HR for two wallets). Agreement: `notes/company/ARM_HR_AGREEMENT.md`.
- SuperGrok: 12% of weekly per Chicago day (`arm_hr.py status --pool supergrok`)
- Grok Bot / Cursor sand: 14% of weekly; Saturday 15:51 CT reset (`status --pool grok-bot`; publisher `memory/grok_bot_usage.json`)
CoS asks ARM GRANT before kelyra `ready` on every pool the work burns. DENY → sticky `needs_arm_grant:<pool>`.

## TTS
All company TTS through profile `grok-tts` only.

## Grok Bot consultant lane
- Hermes assignee: **`grok-bot-consultant`** (spawnable profile). Never `grok-bot`.
- Async: shim POSTs contract → sticky `awaiting-grok-bot:<task_id>` → exits. No polling.
- Contract: `task_id`, `board`, `title`, `body`, `goal`, `success_criteria`, `engine`/`workflow`/`pool` (bot-build implement), `context`, `constraints`/`donts`, `urgency`, `close_protocol`, optional `workspace`. No Grok Bot teammate routing.
- Implement when SuperGrok is tight: ARM GRANT `--pool grok-bot`, card fields `ENGINE: grok-bot`, `WORKFLOW: kelyra-bot-build-loop` or `author-bot-build-loop`, `POOL: grok-bot`, constraints `do not use grok-build` / `no ask_user_question`. Expect a GitHub PR. Hermes merges, applies SQL, files leftover P2/P3. Never start a Mac grok Build sticky shell on this path.
- Close (push): `~/.hermes/profiles/chief-of-staff/scripts/complete_consultant_task.sh` (comment + unblock + complete|block).
- Loop leftover P2/P3 harvest **unchanged**: Hermes CoS only, via Build dual-ping. Consultant close-out is not a second harvest channel.
- Webhook files (never print): `~/.grok/hooks/consultant-webhook-url.txt` + `consultant-webhook-key.txt`. Until they exist, shim parks cards `BLOCKED: awaiting Grok Bot consultant webhook URL`.
