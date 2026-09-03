# Kelyra Bot Team — Ongoing Operating Model

## Autonomy
The Bot team is **partially autonomous**. Cron routines and kanban routing can run without Chuck. Chuck (CEO) still decides strategy, spend, legal, irreversible production, and usage-cap exceptions.

## Source of truth
Hermes kanban board **`kelyra`**. Chat is coordination, not the backlog.

Dashboard: `~/projects/kelyra/notes/dashboard/kanban.html`  
Refresh: `~/projects/kelyra/notes/dashboard/refresh-kanban.sh`

## How Chuck adds work
1. CLI: `hermes kanban boards switch kelyra` then `hermes kanban create "Title" --body "..." --initial-status blocked` (block first if it must not auto-run).
2. Open the dashboard HTML / Hermes kanban UI.
3. Tell **Kelyra Chief of Staff** in its Bot Chat: add X to board `kelyra`, priority, assignee.

CoS decomposes and assigns. App code goes through `kelyra-qa-loop`. QA Supervisor does release evidence. DevOps ships. No self-certify.

## SuperGrok (ARM is HR)
Daily cap **12% of weekly credit** (Chicago day). Reset Monday **01:38** America/Chicago. Governor: `ai-resource-manager`.

CoS **must receive an ARM GRANT** before moving a `kelyra` card to `ready`. If ARM defers, wait until the next Chicago day. Engine: `~/.hermes/profiles/ai-resource-manager/scripts/arm_hr.py`. Agreement: `notes/company/ARM_HR_AGREEMENT.md`.

Sunday 20:00 leftover eval: if weekly remaining ≥ 1%, burn P2/P3 one at a time. Monday 01:30 those cards return to sticky blocked.

TTS only via `grok-tts`.

## Escalations to Chuck
Strategy locks, legal, spend, production, usage-cap breach, P0/P1 the loop cannot close.
