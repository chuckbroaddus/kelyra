# Create Kelyra group chats (Desktop)

Hermes Bot Mode rooms are **2–6 Bots**. That is a product cap (`GROUP_CHAT_MAX_MEMBERS = 6`), not a create-time-only picker. You cannot add a 7th member later.

There is **no CLI** for rooms. Use **Hermes Desktop → Bots**.

## Rooms (v1)

### 1. Kelyra Leadership (already created)
- **Owner:** Kelyra Chief of Staff (`chief-of-staff`)
- **Members (4):** Chief of Staff, Strategy, Product Manager, Software Architect

### 2. Kelyra Engineering
- **Owner:** Kelyra Software Architect (`software-architect`)
- **Members (6):** Software Architect, Senior Developer, Fast Coder, **QA Engineer**, Security, DevOps Release
- **Not in this room:** QA Supervisor (lives in QA), Chief of Staff (sees work via kanban + standup + @mentions; no 7th seat)

### 3. Kelyra QA
- **Owner:** Kelyra QA Supervisor (`qa-supervisor`)
- **Members (4 now, room to grow to 6):** QA Supervisor, QA Engineer, Security, Chief of Staff
- Purpose: higher-layer QA, release evidence, loop-process adequacy, future extra QA specialists. Does **not** replace `kelyra-qa-loop`.

### 4. Kelyra Product & GTM
- **Owner:** Kelyra Product Manager (`product-manager`)
- **Members (6):** Product Manager, Strategy, Customer Success, Growth Marketing, Research Feedback, Chief of Staff

### 5. Kelyra Ops & Risk
- **Owner:** Kelyra Chief of Staff (`chief-of-staff`)
- **Members (6):** Chief of Staff, AI Resource Manager, Operations Support, Finance Analytics, Legal Compliance, Security

Do **not** create a 17-bot “Kelyra Company” room — Hermes will not allow it. Company-wide routing stays with **Chief of Staff + kanban board `kelyra`**.

## How CoS sees Engineering without sitting in the room

CoS does **not** need a seat in Engineering (the room is already full at 6). Visibility:

1. **Kanban `kelyra` is SoT** — Engineering should file/update tickets; CoS Daily Standup pulls the board, not chat logs.
2. **@chief-of-staff / `message_agent`** — Architect or others DM CoS for escalations.
3. **Leadership room** — Architect is already there with CoS.
4. **QA room** — CoS is a member, so release/quality issues surface there.

If you later want CoS *inside* Engineering, drop one of: Fast Coder, Security, or DevOps from that room (still max 6).

## Click path
1. Open Hermes Desktop → **Bots**.
2. New Group Chat. Name it exactly as above.
3. Add up to 6 members from the `Kelyra …` roster.
4. After create: right-click a Bot → **Manage groups** to add/remove (still max 6).

## Seat math
| Room | Count |
|------|------:|
| Leadership | 4 |
| Engineering | 6 |
| QA | 4 |
| Product & GTM | 6 |
| Ops & Risk | 6 |
