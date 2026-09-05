# RIDE-IMPL send contract (GATE send 2026-09-05)

CEO Chuck authorized full RIDE. Pack is SoT:

- `notes/company/car-rider-research.md`
- `notes/company/car-rider-plan.md`
- `notes/company/car-rider-architecture.md`
- `notes/company/car-rider-security.md`
- `notes/company/car-rider-acceptance.md`

Do not revive Family ID placard / keypad check-in.

## Ship

1. Data: `dismissal_lines`, `parent_vehicles` (validity today/range/indefinite; grandma/nanny cars), `pickup_restrictions`, `dismissal_duty` (curb/stage + line), `line_photos` (private assets), `queue_events`. RPCs as A1. RLS: duty wall, not `is_staff`. No client INSERT.
2. Edge LPR (JWT, server key, private image). Unreadable → type or STT **text** (do not store audio unless trivial). No `EXPO_PUBLIC_` vision keys. LPR never inserts people.
3. Parent: vehicle CRUD add/remove; child picker **this stop**; photo of car ahead **or** I’m first; own success “Check in successful, you are XX vehicle in line” (no total); fail “Check in failed” (no reason). Does **not** pick which of their cars they sit in.
4. Two lines (grade bands). Staggered: curb **checkout/release** off line A, then check into line B.
5. Staff walk 1…n; duplicate-first conflict + tap order_fix; attach plate (type/STT); nudge (no neighbor PII); unknown flag curb-only.
6. 7-day purge of photos **and** events; superintendent **archive that day’s photos** (kept until delete). Administrators cannot archive.
7. Tests for Q1 P0s / RIDE-S1-01…21. Token `/parent` deny. Twins unlabeled empty. Restriction fail-closed.

## Out

GPS rank, pole ANPR, RFID, face match, SMS vendor, Ask dismissal tool, public photos, subpoena desk, nanny’s own login, auto-release on plate read.

## Ops

SQL in `supabase/migrations/` — Hermes CoS applies. Edge `verify_jwt=true`. GitHub PR. Preserve dirty tree. No grok-build. No `ask_user_question`.
