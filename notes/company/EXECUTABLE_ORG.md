# Kelyra Executable Organization

Living runbook for running Kelyra as a multi-profile Hermes company.

**CEO:** Chuck (human authority)  
**Orchestrator profile:** `chief-of-staff` ← **only this profile runs the company**  
**Canonical repo:** `/Users/chuckbroaddus/projects/kelyra`  
**Kanban board:** `kelyra`  
**Excluded profiles:** `default`, `free` (not company staff)  
**CLI sticky default:** `chief-of-staff` (`~/.hermes/active_profile`)  
**Kanban orchestrator_profile (all staff configs):** `chief-of-staff`  
**Dispatch gateway:** `chief-of-staff` gateway (launchd)

### Critical: chat profile = role

Hermes desktop chats bind to one profile for the whole session.

| If you open… | They are… |
|---|---|
| **`chief-of-staff`** | Company orchestrator — staff, prioritize, escalate, invoke qa-loop |
| **`senior-developer`** (or any specialist) | That role only — not the org boss |

**Company-wide orders belong in a `chief-of-staff` chat.**  
If an org order is sent to a specialist chat by mistake, the specialist must not assume CoS authority.

## How the company executes

| Mechanism | Use when | Command / skill |
|---|---|---|
| **Kanban board `kelyra`** | Durable multi-role work, dependencies, overnight | `scripts/staff_task.sh` or `hermes kanban create ...` |
| **Sync profile invoke** | Minutes-long specialist answer | `scripts/invoke_profile.sh PROFILE "..."` |
| **kelyra-qa-loop** | Any application code change | skill `kelyra-qa-loop` + `scripts/run_kelyra_qa_loop.py` |
| **Gateway dispatcher** | So kanban `ready` tasks actually run | `hermes -p chief-of-staff gateway start` |

## Delivery chain (software)

```
Strategy / Research → Product Manager → Architect (as needed)
  → Senior Developer or Fast Coder
  → Grok Build kelyra-qa-loop
  → QA Engineer / QA Supervisor
  → Security (boundary changes)
  → DevOps Release → ship
```

Developers never self-certify. The embedded Grok workflow owns implementation QA. Higher-layer QA judges evidence and release risk only.

## Roster

| Profile | Mission |
|---|---|
| chief-of-staff | Orchestrate, prioritize, escalate, report |
| strategy | Strategy, positioning, pricing, roadmap |
| product-manager | Specs, stories, acceptance criteria |
| research-feedback | Research & feedback → opportunities |
| software-architect | Architecture, data, technical standards |
| senior-developer | Substantial implementation + launch qa-loop |
| fast-coder | Small/repetitive implementation + qa-loop |
| qa-engineer | Higher-layer QA of loop evidence |
| qa-supervisor | Release quality / process adequacy |
| security | Security & privacy review |
| devops-release | CI/CD, deploy, ops reliability |
| legal-compliance | Policy/compliance; flag human counsel |
| finance-analytics | Revenue, cost, forecasting |
| growth-marketing | Growth, campaigns, messaging |
| customer-success | Onboarding, retention, health |
| operations-support | Support triage & ops workflows |
| ai-resource-manager | Model/effort usage efficiency |

## CoS skills (on `chief-of-staff` profile)

- `kelyra-company-os` — org routing + kanban staffing
- `kelyra-qa-loop` — Grok Build implementation pipeline

Engineering profiles also carry `kelyra-qa-loop`.

## Helpers

```
~/.hermes/profiles/chief-of-staff/scripts/staff_task.sh
~/.hermes/profiles/chief-of-staff/scripts/invoke_profile.sh
~/.hermes/profiles/chief-of-staff/scripts/run_kelyra_qa_loop.py
```

## Operating rules (short)

1. One company, specialized roles — no duplicate ownership.
2. Artifacts over chatter — structured handoffs.
3. Never invent completion — verify board/workflow/tests.
4. No secrets in chat, commits, or handoffs.
5. CEO final authority on strategy locks, legal, spend, production irreversible actions.
6. Grok effort only: minimal | low | medium | high.

## Profile docs

Each staff profile has `SOUL.md`, and CoS also has:

- `KELYRA_OS.md`
- `KELYRA_QA_LOOP_CONTRACT.md`

## Bring-up checklist

- [x] Team profiles described for kanban routing
- [x] Board `kelyra` with default workdir = repo
- [x] `kanban.orchestrator_profile = chief-of-staff`
- [x] CoS skills + scripts installed
- [x] Engineering profiles have qa-loop skill/runner
- [x] Gateway running when durable kanban dispatch is needed
- [x] Open desktop/chat sessions on `chief-of-staff` for live CoS work

## Session note

Desktop and CLI chats on the same profile are the same role: same tools, skills,
authority, and company OS. This org is run from a **desktop** `chief-of-staff`
session. Desktop chats bind to one Hermes profile at session start; do not expect
a `senior-developer` (or other specialist) session to become CoS mid-thread.

Org skills (`kelyra-company-os`) live only on CoS. Engineering carries
`kelyra-qa-loop` only.
