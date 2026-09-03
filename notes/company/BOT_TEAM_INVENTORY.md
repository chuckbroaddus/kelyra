# Kelyra Bot Team Inventory

Captured: 2026-09-02 13:28 CDT (Phase 0)

## Backup
- Profiles+config: `notes/company/backups/hermes-profiles-20260902.tar.gz` (136MB; socket files skipped)
- Kanban DB: `notes/company/backups/kelyra-kanban-20260902.db`

## Gateway / cron
- Default `hermes gateway status`: not running
- `chief-of-staff` gateway: launchd supervised (PID 95506); plist marked stale vs current install
- CoS cron: `grok-tts concurrency monitor` every 30m (active)
- ARM cron: none

## Kanban board `kelyra` (Kelyra Company)
| id | status | title | assignee |
|---|---|---|---|
| t_ca5b3364 | done | ORG smoke: strategy ack | strategy |
| t_bf043882 | blocked | P3: move sign-in KelyraMark assertion out of provision security tests | (none) |

Open work on board is essentially **one blocked P3**. Old dashboard + worklist.json are the real backlog (Phase 3.4).

## Profiles (17) — convert in place, do not clone

| ID | Model | Reasoning | SOUL bytes | OS.md | QA contract | Existing description |
|---|---|---|---|---|---|---|
| chief-of-staff | grok-4.6 | high | 5495 | Y | Y | Executive orchestrator… |
| product-manager | grok-4.5 | medium | 1414 | N | N | Turns opportunities into specs… |
| strategy | grok-4.6 | medium | 3584 | Y | N | Business strategy… |
| software-architect | grok-4.6 | high | 3888 | Y | N | System architecture… |
| senior-developer | grok-4.5 | medium | 2532 | N | N | Implements substantial features… |
| fast-coder | grok-build-0.1 | low | 3807 | Y | Y | High-volume coding… |
| qa-supervisor | grok-4.5 | high | 5712 | Y | Y | Release-level QA… |
| qa-engineer | grok-4.3 | medium | 5423 | Y | Y | Higher-layer QA oversight… |
| security | grok-4.6 | high | 3824 | Y | Y | Security review… |
| devops-release | grok-4.3 | medium | 3751 | Y | N | CI/CD, deployment… |
| ai-resource-manager | grok-4.3 | medium | 3898 | Y | N | Model/effort usage… |
| operations-support | grok-4.3 | minimal | 3761 | Y | N | Customer support triage… |
| research-feedback | grok-4.3 | low | 3602 | Y | N | Research and feedback… |
| customer-success | grok-4.3 | low | 3581 | Y | N | Onboarding, adoption… |
| growth-marketing | grok-4.3 | low | 3598 | Y | N | Marketing, acquisition… |
| finance-analytics | grok-4.5 | medium | 3599 | Y | N | Revenue, analytics… |
| legal-compliance | grok-4.5 | medium | 3760 | Y | N | Policy, privacy, compliance… |

All use provider `xai-oauth`. No `display_name` set yet. `config.yaml` must stay frozen.

Stay as non-company profiles: `basic-qna`, `grok-tts`, `free`.

## SuperGrok baseline (Chuck)
Total 24% used: Build 21%, Chat 3%, Voice 0%, Other 0%. Daily cap 12% of weekly credit.

## Non-goals confirmed
No clone, no model/reasoning edits, no git push, no profile deletes.
